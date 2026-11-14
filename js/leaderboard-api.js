// HTTP leaderboard requests and response errors.
import { leaderboardEndpoint } from "./constants.js";
import { getRecaptchaToken } from "./recaptcha.js";
import { state } from "./state.js";

export async function saveRemoteScore({ gameMode, playerName, score, zapsPerSecond, elapsedSeconds, wrongCount }) {
  const recaptchaToken = await getRecaptchaToken();
  const response = await fetch(leaderboardEndpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      mode: gameMode,
      playerName,
      score,
      zapsPerSecond,
      elapsedSeconds,
      wrongCount,
      recaptchaToken,
    }),
  });
  const result = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(getResponseErrorMessage(result, "Score could not be saved."));
  }

  return result;
}

export async function fetchRemoteLeaderboard(options) {
  const response = await fetch(getLeaderboardRequestUrl(options), {
    method: "GET",
    headers: { Accept: "application/json" },
  });
  const result = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(getResponseErrorMessage(result, "Leaderboard could not be loaded."));
  }

  return result;
}

export function getLeaderboardRequestUrl({ includeContext = false } = {}) {
  const requestUrl = new URL(leaderboardEndpoint, window.location.href);
  const gameMode = getLeaderboardMode({ includeContext });

  requestUrl.searchParams.set("mode", gameMode);

  if (!includeContext) {
    return requestUrl.toString();
  }

  if (state.savedScoreId) {
    requestUrl.searchParams.set("scoreId", String(state.savedScoreId));
    return requestUrl.toString();
  }

  requestUrl.searchParams.set("score", String(state.score));
  requestUrl.searchParams.set("zapsPerSecond", String(state.finalRate));
  requestUrl.searchParams.set("elapsedSeconds", String(state.finalElapsedSeconds));
  requestUrl.searchParams.set("wrongCount", String(state.wrongCount));

  return requestUrl.toString();
}

export function getLeaderboardMode({ includeContext = false } = {}) {
  return includeContext ? state.currentRunMode : state.activeGameMode;
}

export function getResponseErrorMessage(result, fallbackMessage) {
  if (!result || typeof result !== "object") {
    return fallbackMessage;
  }

  return result.error || result.message || result.msg || fallbackMessage;
}
