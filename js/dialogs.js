// Open and close utility dialogs and restore focus.
import {
  closeInstructionsButton,
  closeLeaderboardButton,
  closeSettingsButton,
  gameOver,
  instructionsButton,
  instructionsMenu,
  leaderboardButton,
  leaderboardMenu,
  settingsButton,
  settingsMenu,
  startButton,
} from "./dom.js";
import { syncPauseState } from "./game.js";
import { loadLeaderboard } from "./leaderboard.js";

export function openSettings() {
  settingsMenu.hidden = false;
  syncPauseState();
  closeSettingsButton.focus();
}

export function closeSettings() {
  settingsMenu.hidden = true;
  syncPauseState();
  settingsButton.focus();
}

export function handleSettingsBackdropClick(event) {
  if (event.target === settingsMenu) {
    closeSettings();
  }
}

export function openLeaderboard() {
  leaderboardMenu.hidden = false;
  syncPauseState();
  closeLeaderboardButton.focus();
  loadLeaderboard({ standaloneOnly: true });
}

export function closeLeaderboard() {
  leaderboardMenu.hidden = true;
  syncPauseState();
  leaderboardButton.focus();
}

export function handleLeaderboardBackdropClick(event) {
  if (event.target === leaderboardMenu) {
    closeLeaderboard();
  }
}

export function closeGameOver() {
  gameOver.hidden = true;
  startButton.focus();
}

export function openInstructions() {
  instructionsMenu.hidden = false;
  syncPauseState();
  closeInstructionsButton.focus();
}

export function closeInstructions() {
  instructionsMenu.hidden = true;
  syncPauseState();
  instructionsButton.focus();
}

export function handleInstructionsBackdropClick(event) {
  if (event.target === instructionsMenu) {
    closeInstructions();
  }
}
