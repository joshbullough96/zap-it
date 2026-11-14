import { backgroundMusic, initializeAudio, syncMusic, syncMusicToggleUi } from "./js/audio.js";
import { renderEmptyGrid } from "./js/board.js";
import { preferenceKeys } from "./js/constants.js";
import {
  closeGameOver,
  closeInstructions,
  closeLeaderboard,
  closeSettings,
  handleInstructionsBackdropClick,
  handleLeaderboardBackdropClick,
  handleSettingsBackdropClick,
  openInstructions,
  openLeaderboard,
  openSettings,
} from "./js/dialogs.js";
import {
  closeGameOverButton,
  closeInstructionsButton,
  closeLeaderboardButton,
  closeSettingsButton,
  darkModeToggle,
  gameOver,
  instructionsButton,
  instructionsMenu,
  leaderboardButton,
  leaderboardMenu,
  modeInputs,
  musicToggle,
  oneColorPicker,
  playAgainButton,
  playerNameInput,
  refreshLeaderboardButton,
  saveScoreStatus,
  scoreForm,
  settingsButton,
  settingsMenu,
  soundEffectsToggle,
  standaloneRefreshLeaderboardButton,
  startButton,
  themeInputs,
} from "./js/dom.js";
import { handleGameModeChange, startGame, syncGameModeUi, syncPauseState, updateStats } from "./js/game.js";
import { handleDocumentKeydown } from "./js/input.js";
import { handleScoreSubmit, loadLeaderboard } from "./js/leaderboard.js";
import {
  applyPreferences,
  handleDarkModeChange,
  handleOneColorChange,
  handleThemeChange,
  savePreference,
} from "./js/preferences.js";
import { initializeState, state } from "./js/state.js";

// Composition root: initialize the model, connect browser events, and render the initial UI.
initializeState();
initializeAudio();

applyPreferences();
renderEmptyGrid();
syncGameModeUi();
updateStats();
startButton.addEventListener("click", startGame);
playAgainButton.addEventListener("click", startGame);
closeGameOverButton.addEventListener("click", closeGameOver);
refreshLeaderboardButton.addEventListener("click", () => loadLeaderboard({ includeContext: !gameOver.hidden }));
instructionsButton.addEventListener("click", openInstructions);
closeInstructionsButton.addEventListener("click", closeInstructions);
instructionsMenu.addEventListener("click", handleInstructionsBackdropClick);
leaderboardButton.addEventListener("click", openLeaderboard);
closeLeaderboardButton.addEventListener("click", closeLeaderboard);
leaderboardMenu.addEventListener("click", handleLeaderboardBackdropClick);
standaloneRefreshLeaderboardButton.addEventListener("click", () => loadLeaderboard({ standaloneOnly: true }));
scoreForm.addEventListener("submit", handleScoreSubmit);
modeInputs.forEach((input) => input.addEventListener("change", handleGameModeChange));
settingsButton.addEventListener("click", openSettings);
closeSettingsButton.addEventListener("click", closeSettings);
settingsMenu.addEventListener("click", handleSettingsBackdropClick);
themeInputs.forEach((input) => input.addEventListener("change", handleThemeChange));
darkModeToggle.addEventListener("change", handleDarkModeChange);
musicToggle.addEventListener("change", () => {
  state.musicEnabled = musicToggle.checked;
  syncMusicToggleUi();
  savePreference(preferenceKeys.music, String(state.musicEnabled));
  syncMusic();
});
document.addEventListener("visibilitychange", syncPauseState);
soundEffectsToggle.addEventListener("change", () => {
  state.soundEffectsEnabled = soundEffectsToggle.checked;
  document.querySelector("#sound-effects-state").textContent = state.soundEffectsEnabled ? "On" : "Off";
  savePreference(preferenceKeys.soundEffects, String(state.soundEffectsEnabled));
  if (!state.soundEffectsEnabled && state.activeEffect) state.activeEffect.stop();
});
window.addEventListener("pagehide", () => backgroundMusic.pause());
oneColorPicker.addEventListener("input", handleOneColorChange);
document.addEventListener("keydown", handleDocumentKeydown);
playerNameInput.addEventListener("input", () => {
  if (!state.scoreSaved) {
    saveScoreStatus.textContent = "";
  }
});
