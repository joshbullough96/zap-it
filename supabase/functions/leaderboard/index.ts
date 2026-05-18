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
      await saveScore(payload);
      return jsonResponse({ ok: true }, 201);
    }

    return jsonResponse({ error: "Method not allowed." }, 405);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Leaderboard request failed.";
    const status = message.includes("Invalid") || message.includes("Use ") || message.includes("Please ")
      ? 400
      : 500;

    return jsonResponse({ error: message }, status);
  }
});

async function getLeaderboard() {
  const endpoint = `${getRestUrl()}?select=player_name,score,zaps_per_second,elapsed_seconds,created_at&order=score.desc,zaps_per_second.desc,created_at.asc&limit=5`;
  const response = await fetch(endpoint, {
    method: "GET",
    headers: getSupabaseHeaders(),
  });

  if (!response.ok) {
    throw new Error("Leaderboard could not be loaded.");
  }

  const rows = await response.json();
  const scores = rows.map((row: Record<string, unknown>) => ({
    playerName: row.player_name,
    score: row.score,
    zapsPerSecond: row.zaps_per_second,
    elapsedSeconds: row.elapsed_seconds,
    createdAt: row.created_at,
  }));

  return { scores };
}

async function saveScore(payload: unknown) {
  if (!payload || typeof payload !== "object") {
    throw new Error("Invalid score submission.");
  }

  const body = payload as Record<string, unknown>;
  const playerName = normalizePlayerName(body.playerName);
  const score = normalizeInteger(body.score, "score", 0, 1000);
  const zapsPerSecond = normalizeNumber(body.zapsPerSecond, "zaps per second", 0, 100);
  const elapsedSeconds = normalizeNumber(body.elapsedSeconds, "elapsed seconds", 0.01, 600);
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
    }),
  });

  if (!response.ok) {
    throw new Error("Score could not be saved.");
  }
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
  const supabaseUrl = Deno.env.get("ZAP_SUPABASE_URL");

  if (!supabaseUrl) {
    throw new Error("Leaderboard service is not configured.");
  }

  return `${supabaseUrl.replace(/\/$/, "")}/rest/v1/${tableName}`;
}

function getSupabaseHeaders() {
  const serviceRoleKey = Deno.env.get("ZAP_SUPABASE_SERVICE_ROLE_KEY");

  if (!serviceRoleKey) {
    throw new Error("Leaderboard service is not configured.");
  }

  return {
    apikey: serviceRoleKey,
    Authorization: `Bearer ${serviceRoleKey}`,
  };
}

function jsonResponse(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: corsHeaders,
  });
}
