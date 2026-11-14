// Keyboard shortcuts and text-entry guards.
import { gridKeyIndexes } from "./constants.js";
import { closeGameOver, closeInstructions, closeLeaderboard, closeSettings } from "./dialogs.js";
import { gameOver, grid, instructionsMenu, leaderboardMenu, settingsMenu } from "./dom.js";
import { startGame } from "./game.js";
import { state } from "./state.js";

export function handleDocumentKeydown(event) {
  if (event.key === "Escape" && !settingsMenu.hidden) {
    closeSettings();
    return;
  }

  if (event.key === "Escape" && !instructionsMenu.hidden) {
    closeInstructions();
    return;
  }

  if (event.key === "Escape" && !leaderboardMenu.hidden) {
    closeLeaderboard();
    return;
  }

  if (event.key === "Escape" && !gameOver.hidden) {
    closeGameOver();
    return;
  }

  if (event.code === "Space" && shouldSpaceStartGame(event)) {
    event.preventDefault();
    startGame();
    return;
  }

  handleGridKeydown(event);
}

export function shouldSpaceStartGame(event) {
  if (isTextEntryElement(event.target)) return false;
  if (!gameOver.hidden) return false;
  if (!settingsMenu.hidden || !instructionsMenu.hidden || !leaderboardMenu.hidden) return false;

  return true;
}

export function handleGridKeydown(event) {
  if (!state.running || state.boardLocked || isTextEntryElement(event.target)) return;

  const gridIndex = gridKeyIndexes[event.key];
  if (gridIndex === undefined) return;

  const button = grid.querySelector(`[data-index="${gridIndex}"]`);
  if (!button || button.disabled) return;

  event.preventDefault();
  button.click();
}

export function isTextEntryElement(element) {
  if (!element || element === document.body) return false;

  const tagName = element.tagName;
  return (
    element.isContentEditable ||
    tagName === "INPUT" ||
    tagName === "TEXTAREA" ||
    tagName === "SELECT"
  );
}
