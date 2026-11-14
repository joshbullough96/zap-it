// Shared mutable model and its initial values.
import { buildCombos } from "./board.js";
import {
  config,
  defaultGameMode,
  gameLength,
  musicPlaylists,
  preferenceKeys,
  useMockLeaderboard,
} from "./constants.js";
import { normalizeMockLeaderboardScore } from "./leaderboard-mock.js";
import { getSavedDarkMode, getSavedOneColor, getSavedTheme, readPreference } from "./preferences.js";

// Mutable application model. Initialize only after all modules have loaded.
export const state = {};

export function initializeState() {
  state.mockLeaderboardScores = useMockLeaderboard ? config.mockLeaderboardScores.map(normalizeMockLeaderboardScore).filter(Boolean) : [];
  state.mockSurvivalLeaderboardScores = useMockLeaderboard && Array.isArray(config.mockSurvivalLeaderboardScores)
  ? config.mockSurvivalLeaderboardScores.map(normalizeMockLeaderboardScore).filter(Boolean)
  : [];
  state.score = 0;
  state.streak = 0;
  state.wrongCount = 0;
  state.timeLeft = gameLength;
  state.target = null;
  state.running = false;
  state.pausedAt = null;
  state.boardLocked = false;
  state.scoreSaved = false;
  state.savedScoreId = null;
  state.activeGameMode = defaultGameMode;
  state.currentRunMode = defaultGameMode;
  state.timerId = null;
  state.matchStartedAt = null;
  state.matchEndedAt = null;
  state.finalElapsedSeconds = 0;
  state.finalRate = 0;
  state.roundTimeouts = [];
  state.activeTheme = getSavedTheme();
  state.darkMode = getSavedDarkMode();
  state.oneColorValue = getSavedOneColor();
  state.shapeRenderCount = 0;
  state.combos = buildCombos(state.activeTheme);
  state.recaptchaScriptPromise = null;
  state.musicEnabled = readPreference(preferenceKeys.music) !== "false";
  state.soundEffectsEnabled = readPreference(preferenceKeys.soundEffects) !== "false";
  state.effectsContext = null;
  state.activeEffect = null;
  state.musicTrackIndex = 0;
  state.musicTracks = musicPlaylists[defaultGameMode];
}
