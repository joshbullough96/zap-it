const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Content-Type": "application/json",
};

const tableName = "leaderboard_scores";
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
      return jsonResponse(await getLeaderboard());
    }

    if (request.method === "POST") {
      const payload = await request.json().catch(() => null);
      await saveScore(payload, request);
      return jsonResponse({ ok: true }, 201);
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

async function getLeaderboard() {
  const endpoint = `${getRestUrl()}?select=player_name,score,zaps_per_second,elapsed_seconds,wrong_count,created_at&order=score.desc,zaps_per_second.desc,created_at.asc&limit=5`;
  const response = await fetch(endpoint, {
    method: "GET",
    headers: getSupabaseHeaders(),
  });

  if (!response.ok) {
    throw new Error(await getSupabaseErrorMessage(response, "Leaderboard could not be loaded."));
  }

  const rows = await response.json();
  const scores = rows.map((row: Record<string, unknown>) => ({
    playerName: row.player_name,
    score: row.score,
    zapsPerSecond: row.zaps_per_second,
    elapsedSeconds: row.elapsed_seconds,
    wrongCount: row.wrong_count,
    createdAt: row.created_at,
  }));

  return { scores };
}

async function saveScore(payload: unknown, request: Request) {
  if (!payload || typeof payload !== "object") {
    throw new Error("Invalid score submission.");
  }

  const body = payload as Record<string, unknown>;
  await verifyRecaptcha(body.recaptchaToken, request);

  const playerName = normalizePlayerName(body.playerName);
  const score = normalizeInteger(body.score, "score", 0, 1000);
  const zapsPerSecond = normalizeNumber(body.zapsPerSecond, "zaps per second", 0, 100);
  const elapsedSeconds = normalizeNumber(body.elapsedSeconds, "elapsed seconds", 0.01, 600);
  const wrongCount = body.wrongCount === undefined ? 0 : normalizeInteger(body.wrongCount, "miss count", 0, 1000);
  const validationMessage = validatePlayerName(playerName);

  if (validationMessage) {
    throw new Error(validationMessage);
  }

  const containsProfanity = await hasProfanity(playerName);

  if (containsProfanity) {
    throw new Error("Please choose a different name.");
  }

  const response = await fetch(getRestUrl(), {
    method: "POST",
    headers: {
      ...getSupabaseHeaders(),
      "Content-Type": "application/json",
      Prefer: "return=minimal",
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

function getRestUrl() {
  const supabaseUrl = getRequiredEnv("ZAP_SUPABASE_URL");

  return `${supabaseUrl.replace(/\/$/, "")}/rest/v1/${tableName}`;
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
