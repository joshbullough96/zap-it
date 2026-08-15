const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Content-Type": "application/json",
};

const defaultMode = "classic";
const tableNames = {
  classic: "leaderboard_scores",
  survival: "survival_scores",
} as const;
const maxPlayerNameLength = 16;
const playerNamePattern = /^[A-Za-z0-9 _-]+$/;
const fallbackBlockedWords = ["damn", "hell"];
const recaptchaAction = "save_score";
const defaultRecaptchaMinimumScore = 0.5;

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    if (request.method === "GET") {
      return jsonResponse(await getLeaderboard(request));
    }

    if (request.method === "POST") {
      const payload = await request.json().catch(() => null);
      const scoreId = await saveScore(payload, request);
      return jsonResponse({ ok: true, scoreId }, 201);
    }

    return jsonResponse({ error: "Method not allowed." }, 405);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Leaderboard request failed.";
    const status = message.includes("Invalid") || message.includes("Use ") || message.includes("Please ") || message.includes("reCAPTCHA")
      ? 400
      : 500;

    return jsonResponse({ error: message }, status);
  }
});

async function getLeaderboard(request: Request) {
  const requestUrl = new URL(request.url);
  const mode = normalizeGameMode(requestUrl.searchParams.get("mode"));
  const rows = await fetchLeaderboardRows(mode, undefined, 5, 0);
  const result: Record<string, unknown> = { scores: rows.map(mapScoreRow) };
  const context = await getLeaderboardContext(requestUrl, mode);

  if (context) {
    result.context = context;
  }

  return result;
}

async function saveScore(payload: unknown, request: Request) {
  if (!payload || typeof payload !== "object") {
    throw new Error("Invalid score submission.");
  }

  const body = payload as Record<string, unknown>;
  await verifyRecaptcha(body.recaptchaToken, request);

  const mode = normalizeGameMode(body.mode);
  const playerName = normalizePlayerName(body.playerName);
  const score = normalizeInteger(body.score, "score", 0, getMaxScore(mode));
  const zapsPerSecond = normalizeNumber(body.zapsPerSecond, "zaps per second", 0, 100);
  const elapsedSeconds = normalizeNumber(body.elapsedSeconds, "elapsed seconds", 0.01, getMaxElapsedSeconds(mode));
  const wrongCount = body.wrongCount === undefined ? 0 : normalizeInteger(body.wrongCount, "miss count", 0, 1000);
  const validationMessage = validatePlayerName(playerName);

  if (validationMessage) {
    throw new Error(validationMessage);
  }

  const containsProfanity = await hasProfanity(playerName);

  if (containsProfanity) {
    throw new Error("Please choose a different name.");
  }

  const response = await fetch(`${getRestUrl(mode)}?select=id`, {
    method: "POST",
    headers: {
      ...getSupabaseHeaders(),
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: JSON.stringify({
      player_name: playerName,
      score,
      zaps_per_second: zapsPerSecond,
      elapsed_seconds: elapsedSeconds,
      wrong_count: wrongCount,
    }),
  });

  if (!response.ok) {
    throw new Error(await getSupabaseErrorMessage(response, "Score could not be saved."));
  }

  const rows = await response.json().catch(() => []);
  const scoreId = normalizeScoreId(rows?.[0]?.id);

  if (!scoreId) {
    throw new Error("Score could not be saved.");
  }

  return scoreId;
}

async function getLeaderboardContext(requestUrl: URL, mode: GameMode) {
  const scoreId = requestUrl.searchParams.get("scoreId");

  if (scoreId) {
    return getSavedScoreContext(mode, normalizeScoreId(scoreId));
  }

  if (!requestUrl.searchParams.has("score")) {
    return null;
  }

  return getPreviewScoreContext({
    playerName: "Your run",
    score: normalizeIntegerParam(requestUrl.searchParams.get("score"), "score", 0, getMaxScore(mode)),
    zapsPerSecond: normalizeNumberParam(requestUrl.searchParams.get("zapsPerSecond"), "zaps per second", 0, 100),
    elapsedSeconds: normalizeNumberParam(requestUrl.searchParams.get("elapsedSeconds"), "elapsed seconds", 0.01, getMaxElapsedSeconds(mode)),
    wrongCount: normalizeIntegerParam(requestUrl.searchParams.get("wrongCount") || "0", "miss count", 0, 1000),
  }, mode);
}

async function getSavedScoreContext(mode: GameMode, scoreId: number) {
  if (!scoreId) {
    throw new Error("Invalid score placement request.");
  }

  const rows = await fetchLeaderboardRows(mode, { id: `eq.${scoreId}` }, 1, 0);
  const target = rows[0];

  if (!target) {
    throw new Error("Saved score could not be found.");
  }

  return buildContext(mode, "saved", mapTargetRow(target));
}

async function getPreviewScoreContext(target: LeaderboardTarget, mode: GameMode) {
  return buildContext(mode, "preview", target);
}

async function buildContext(gameMode: GameMode, mode: "preview" | "saved", target: LeaderboardTarget) {
  const totalExistingScores = await fetchLeaderboardCount(gameMode);
  const higherRankFilter = buildHigherRankFilter(target, mode);
  const lowerRankFilter = buildLowerRankFilter(target, mode);
  const higherCount = await fetchLeaderboardCount(gameMode, higherRankFilter);
  const aboveOffset = Math.max(0, higherCount - 2);
  const aboveRows = await fetchLeaderboardRows(gameMode, higherRankFilter, 2, aboveOffset);
  const belowRows = await fetchLeaderboardRows(gameMode, lowerRankFilter, 2, 0);
  const rank = higherCount + 1;
  const totalScores = mode === "preview" ? totalExistingScores + 1 : totalExistingScores;
  const nearbyScores = [
    ...aboveRows.map((row, index) => ({
      ...mapScoreRow(row),
      rank: aboveOffset + index + 1,
    })),
    {
      ...target,
      rank,
      isCurrent: true,
    },
    ...belowRows.map((row, index) => ({
      ...mapScoreRow(row),
      rank: rank + index + 1,
    })),
  ];

  return {
    mode,
    rank,
    totalScores,
    scores: nearbyScores,
    nextToBeat: aboveRows.length ? mapScoreRow(aboveRows[aboveRows.length - 1]) : null,
  };
}

async function fetchLeaderboardRows(mode: GameMode, filters: Record<string, string> = {}, limit = 5, offset = 0) {
  const endpoint = makeRestUrl({
    select: "id,player_name,score,zaps_per_second,elapsed_seconds,wrong_count,created_at",
    order: "score.desc,zaps_per_second.desc,created_at.asc,id.asc",
    limit: String(limit),
    offset: String(offset),
    ...filters,
  }, mode);
  const response = await fetch(endpoint, {
    method: "GET",
    headers: getSupabaseHeaders(),
  });

  if (!response.ok) {
    throw new Error(await getSupabaseErrorMessage(response, "Leaderboard could not be loaded."));
  }

  return await response.json() as LeaderboardRow[];
}

async function fetchLeaderboardCount(mode: GameMode, filters: Record<string, string> = {}) {
  const endpoint = makeRestUrl({
    select: "id",
    ...filters,
  }, mode);
  const response = await fetch(endpoint, {
    method: "HEAD",
    headers: {
      ...getSupabaseHeaders(),
      Prefer: "count=exact",
      Range: "0-0",
    },
  });

  if (!response.ok) {
    throw new Error(await getSupabaseErrorMessage(response, "Leaderboard could not be loaded."));
  }

  const contentRange = response.headers.get("content-range") || "";
  const total = Number(contentRange.split("/").pop());

  return Number.isFinite(total) ? total : 0;
}

function buildHigherRankFilter(target: LeaderboardTarget, mode: "preview" | "saved") {
  const score = target.score;
  const rate = target.zapsPerSecond;
  const conditions = [
    `score.gt.${score}`,
    `and(score.eq.${score},zaps_per_second.gt.${rate})`,
  ];

  if (mode === "preview") {
    conditions.push(`and(score.eq.${score},zaps_per_second.eq.${rate})`);
  } else if (target.createdAt && target.id) {
    conditions.push(`and(score.eq.${score},zaps_per_second.eq.${rate},created_at.lt.${target.createdAt})`);
    conditions.push(`and(score.eq.${score},zaps_per_second.eq.${rate},created_at.eq.${target.createdAt},id.lt.${target.id})`);
  }

  return { or: `(${conditions.join(",")})` };
}

function buildLowerRankFilter(target: LeaderboardTarget, mode: "preview" | "saved") {
  const score = target.score;
  const rate = target.zapsPerSecond;
  const conditions = [
    `score.lt.${score}`,
    `and(score.eq.${score},zaps_per_second.lt.${rate})`,
  ];

  if (mode === "saved" && target.createdAt && target.id) {
    conditions.push(`and(score.eq.${score},zaps_per_second.eq.${rate},created_at.gt.${target.createdAt})`);
    conditions.push(`and(score.eq.${score},zaps_per_second.eq.${rate},created_at.eq.${target.createdAt},id.gt.${target.id})`);
  }

  return { or: `(${conditions.join(",")})` };
}

function makeRestUrl(params: Record<string, string>, mode: GameMode) {
  const endpoint = new URL(getRestUrl(mode));

  Object.entries(params).forEach(([key, value]) => {
    endpoint.searchParams.set(key, value);
  });

  return endpoint.toString();
}

function mapScoreRow(row: LeaderboardRow) {
  return {
    playerName: row.player_name,
    score: row.score,
    zapsPerSecond: row.zaps_per_second,
    elapsedSeconds: row.elapsed_seconds,
    wrongCount: row.wrong_count,
    createdAt: row.created_at,
  };
}

function mapTargetRow(row: LeaderboardRow): LeaderboardTarget {
  return {
    id: normalizeScoreId(row.id),
    playerName: String(row.player_name || "Player"),
    score: Number(row.score) || 0,
    zapsPerSecond: Number(row.zaps_per_second) || 0,
    elapsedSeconds: Number(row.elapsed_seconds) || 0,
    wrongCount: Number(row.wrong_count) || 0,
    createdAt: String(row.created_at || ""),
  };
}

async function verifyRecaptcha(token: unknown, request: Request) {
  if (typeof token !== "string" || !token.trim()) {
    throw new Error("reCAPTCHA verification failed.");
  }

  const projectId = getRequiredEnv("ZAP_RECAPTCHA_PROJECT_ID");
  const siteKey = getRequiredEnv("ZAP_RECAPTCHA_SITE_KEY");
  const apiKey = getRequiredEnv("ZAP_RECAPTCHA_API_KEY");
  const endpoint = `https://recaptchaenterprise.googleapis.com/v1/projects/${encodeURIComponent(projectId)}/assessments?key=${encodeURIComponent(apiKey)}`;
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      event: {
        token,
        siteKey,
        expectedAction: recaptchaAction,
        userAgent: request.headers.get("user-agent") || undefined,
        userIpAddress: getClientIpAddress(request),
      },
    }),
  });

  if (!response.ok) {
    throw new Error("reCAPTCHA verification failed.");
  }

  const result = await response.json().catch(() => null) as RecaptchaAssessment | null;
  const tokenProperties = result?.tokenProperties;
  const score = result?.riskAnalysis?.score;

  if (!tokenProperties?.valid || tokenProperties.action !== recaptchaAction) {
    throw new Error("reCAPTCHA verification failed.");
  }

  if (typeof score === "number" && score < getRecaptchaMinimumScore()) {
    throw new Error("reCAPTCHA verification failed.");
  }
}

function getClientIpAddress(request: Request) {
  const forwardedFor = request.headers.get("x-forwarded-for");

  if (forwardedFor) {
    return forwardedFor.split(",")[0].trim();
  }

  return request.headers.get("cf-connecting-ip") || undefined;
}

async function hasProfanity(playerName: string) {
  try {
    const response = await fetch(
      `https://www.purgomalum.com/service/containsprofanity?text=${encodeURIComponent(playerName)}`,
    );

    if (!response.ok) {
      return hasFallbackBlockedWord(playerName);
    }

    const result = (await response.text()).trim().toLowerCase();
    return result === "true" || hasFallbackBlockedWord(playerName);
  } catch {
    return hasFallbackBlockedWord(playerName);
  }
}

function normalizePlayerName(value: unknown) {
  if (typeof value !== "string") {
    throw new Error("Invalid player name.");
  }

  return value.trim().replace(/\s+/g, " ");
}

function validatePlayerName(playerName: string) {
  if (playerName.length < 2) {
    return "Use at least 2 characters.";
  }

  if (playerName.length > maxPlayerNameLength) {
    return `Use ${maxPlayerNameLength} characters or fewer.`;
  }

  if (!playerNamePattern.test(playerName)) {
    return "Use letters, numbers, spaces, hyphens, or underscores.";
  }

  if (hasFallbackBlockedWord(playerName)) {
    return "Please choose a different name.";
  }

  return "";
}

function hasFallbackBlockedWord(value: string) {
  const lowered = value.toLowerCase();
  return fallbackBlockedWords.some((word) => lowered.includes(word));
}

function normalizeInteger(value: unknown, label: string, minimum: number, maximum: number) {
  if (typeof value !== "number" || !Number.isInteger(value) || value < minimum || value > maximum) {
    throw new Error(`Invalid ${label}.`);
  }

  return value;
}

function normalizeNumber(value: unknown, label: string, minimum: number, maximum: number) {
  if (typeof value !== "number" || !Number.isFinite(value) || value < minimum || value > maximum) {
    throw new Error(`Invalid ${label}.`);
  }

  return Math.round(value * 100) / 100;
}

function normalizeIntegerParam(value: string | null, label: string, minimum: number, maximum: number) {
  if (value === null || !/^\d+$/.test(value)) {
    throw new Error(`Invalid ${label}.`);
  }

  return normalizeInteger(Number(value), label, minimum, maximum);
}

function normalizeNumberParam(value: string | null, label: string, minimum: number, maximum: number) {
  if (value === null || !Number.isFinite(Number(value))) {
    throw new Error(`Invalid ${label}.`);
  }

  return normalizeNumber(Number(value), label, minimum, maximum);
}

function normalizeGameMode(value: unknown): GameMode {
  if (value === undefined || value === null || value === "") {
    return defaultMode;
  }

  if (value === "classic" || value === "survival") {
    return value;
  }

  throw new Error("Invalid game mode.");
}

function normalizeScoreId(value: unknown) {
  const scoreId = typeof value === "number" ? value : Number(value);

  if (!Number.isInteger(scoreId) || scoreId <= 0) {
    return 0;
  }

  return scoreId;
}

function getMaxScore(mode: GameMode) {
  return mode === "survival" ? 10000 : 1000;
}

function getMaxElapsedSeconds(mode: GameMode) {
  return mode === "survival" ? 36000 : 600;
}

function getRestUrl(mode: GameMode) {
  const supabaseUrl = getRequiredEnv("ZAP_SUPABASE_URL");

  return `${supabaseUrl.replace(/\/$/, "")}/rest/v1/${tableNames[mode]}`;
}

function getSupabaseHeaders() {
  const serviceRoleKey = getRequiredEnv("ZAP_SUPABASE_SERVICE_ROLE_KEY");

  return {
    apikey: serviceRoleKey,
    Authorization: `Bearer ${serviceRoleKey}`,
  };
}

function getRequiredEnv(name: string) {
  const value = Deno.env.get(name);

  if (!value) {
    throw new Error("Leaderboard service is not configured.");
  }

  return value;
}

function getRecaptchaMinimumScore() {
  const value = Number(Deno.env.get("ZAP_RECAPTCHA_MIN_SCORE"));

  if (!Number.isFinite(value) || value < 0 || value > 1) {
    return defaultRecaptchaMinimumScore;
  }

  return value;
}

async function getSupabaseErrorMessage(response: Response, fallbackMessage: string) {
  const details = await response.text().catch(() => "");

  if (!details) {
    return fallbackMessage;
  }

  return `${fallbackMessage} Supabase returned ${response.status}: ${details}`;
}

function jsonResponse(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: corsHeaders,
  });
}

type RecaptchaAssessment = {
  tokenProperties?: {
    valid?: boolean;
    action?: string;
  };
  riskAnalysis?: {
    score?: number;
  };
};

type LeaderboardRow = {
  id: number | string;
  player_name: unknown;
  score: unknown;
  zaps_per_second: unknown;
  elapsed_seconds: unknown;
  wrong_count: unknown;
  created_at: unknown;
};

type LeaderboardTarget = {
  id?: number;
  playerName: string;
  score: number;
  zapsPerSecond: number;
  elapsedSeconds: number;
  wrongCount: number;
  createdAt?: string;
};

type GameMode = keyof typeof tableNames;
