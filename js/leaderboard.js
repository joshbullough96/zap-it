// Coordinate score submission, validation, and leaderboard loading.
import {
  fallbackBlockedWords,
  leaderboardAvailable,
  maxPlayerNameLength,
  playerNamePattern,
  recaptchaSiteKey,
  useMockLeaderboard,
} from "./constants.js";
import { playerNameInput, saveScoreButton, saveScoreStatus } from "./dom.js";
import { fetchRemoteLeaderboard, getLeaderboardMode, saveRemoteScore } from "./leaderboard-api.js";
import { getMockLeaderboardResult, saveMockScore } from "./leaderboard-mock.js";
import {
  getLeaderboardTargets,
  renderLeaderboard,
  renderLeaderboardContext,
  resetLeaderboardContext,
  setLeaderboardRefreshDisabled,
  setLeaderboardStatus,
  updateLeaderboardTitles,
} from "./leaderboard-view.js";
import { state } from "./state.js";

export async function handleScoreSubmit(event) {
  event.preventDefault();

  if (state.scoreSaved) return;

  if (!leaderboardAvailable) {
    saveScoreStatus.textContent = "Leaderboard setup is not connected yet.";
    return;
  }

  if (!useMockLeaderboard && !recaptchaSiteKey) {
    saveScoreStatus.textContent = "Score saving needs reCAPTCHA setup.";
    return;
  }

  const playerName = playerNameInput.value.trim().replace(/\s+/g, " ");
  const validationMessage = validatePlayerName(playerName);

  if (validationMessage) {
    saveScoreStatus.textContent = validationMessage;
    return;
  }

  saveScoreButton.disabled = true;
  saveScoreStatus.textContent = "Saving score...";

  try {
    const gameMode = state.currentRunMode;
    const result = useMockLeaderboard
      ? saveMockScore({ gameMode, playerName, score: state.score, zapsPerSecond: state.finalRate, elapsedSeconds: state.finalElapsedSeconds, wrongCount: state.wrongCount })
      : await saveRemoteScore({ gameMode, playerName, score: state.score, zapsPerSecond: state.finalRate, elapsedSeconds: state.finalElapsedSeconds, wrongCount: state.wrongCount });

    state.scoreSaved = true;
    state.savedScoreId = result.scoreId || null;
    playerNameInput.value = playerName;
    saveScoreStatus.textContent = "Score saved.";
    await loadLeaderboard({ includeContext: true });
  } catch (error) {
    saveScoreButton.disabled = false;
    saveScoreStatus.textContent = error.message || "Score could not be saved.";
  }
}

export async function loadLeaderboard(options = {}) {
  const targets = getLeaderboardTargets(options);
  updateLeaderboardTitles(getLeaderboardMode(options));

  targets.forEach(({ list }) => {
    list.innerHTML = "";
  });

  if (options.includeContext) {
    resetLeaderboardContext("Loading placement...");
  }

  if (!leaderboardAvailable) {
    setLeaderboardStatus(targets, "Connect your Supabase Edge Function URL to show global scores.");
    if (options.includeContext) {
      resetLeaderboardContext("Connect your leaderboard to show run placement.");
    }
    return;
  }

  setLeaderboardStatus(targets, "Loading leaderboard...");
  setLeaderboardRefreshDisabled(targets, true);

  try {
    const result = useMockLeaderboard ? getMockLeaderboardResult(options) : await fetchRemoteLeaderboard(options);

    const entries = Array.isArray(result.scores) ? result.scores : [];
    targets.forEach(({ list }) => renderLeaderboard(entries, list));
    setLeaderboardStatus(targets, entries.length ? "" : "No scores yet.");

    if (options.includeContext) {
      renderLeaderboardContext(result.context);
    }
  } catch (error) {
    setLeaderboardStatus(targets, error.message || "Leaderboard could not be loaded.");
    if (options.includeContext) {
      resetLeaderboardContext(error.message || "Run placement could not be loaded.");
    }
  } finally {
    setLeaderboardRefreshDisabled(targets, false);
  }
}

export function validatePlayerName(playerName) {
  if (playerName.length < 2) {
    return "Use at least 2 characters.";
  }

  if (playerName.length > maxPlayerNameLength) {
    return `Use ${maxPlayerNameLength} characters or fewer.`;
  }

  if (!playerNamePattern.test(playerName)) {
    return "Use letters, numbers, spaces, hyphens, or underscores.";
  }

  const lowered = playerName.toLowerCase();
  const blocked = fallbackBlockedWords.some((word) => lowered.includes(word));

  if (blocked) {
    return "Please choose a different name.";
  }

  return "";
}
