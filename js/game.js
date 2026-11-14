// Run lifecycle, pause state, scoring, timing, and mode selection.
import { backgroundMusic, playMatchSound, syncMusic } from "./audio.js";
import { buildDistractors, renderGrid, setGridDisabled } from "./board.js";
import {
  defaultGameMode,
  flipDuration,
  flipSwapDelay,
  gameLength,
  gameModes,
  leaderboardAvailable,
  musicPlaylists,
  wrongPenalty,
} from "./constants.js";
import {
  finalScore,
  finalWrongCount,
  finalZapRate,
  gameArea,
  gameModeHelp,
  gameOver,
  grid,
  instructionsMenu,
  leaderboardMenu,
  messageEl,
  modeInputs,
  playAgainButton,
  playerNameInput,
  resultModeLabel,
  saveScoreButton,
  saveScoreStatus,
  scoreEl,
  scoreForm,
  settingsMenu,
  startButton,
  streakEl,
  targetHelp,
  targetName,
  targetPanel,
  targetShape,
  timeLeftEl,
  timerEl,
  timerUnitEl,
  zapRateEl,
} from "./dom.js";
import { flashPenalty, playZapEffect } from "./effects.js";
import { resetLeaderboardContext, updateLeaderboardTitles } from "./leaderboard-view.js";
import { loadLeaderboard } from "./leaderboard.js";
import { makeShape } from "./shapes.js";
import { state } from "./state.js";
import { calculateZapRate, formatRate, pick, randomInt } from "./utils.js";

export function syncPauseState() {
  const shouldPause = state.running && (document.hidden || !settingsMenu.hidden
    || !instructionsMenu.hidden || !leaderboardMenu.hidden);
  if (shouldPause && state.pausedAt === null) {
    state.pausedAt = performance.now();
    clearInterval(state.timerId);
    state.timerId = null;
  } else if (!shouldPause && state.pausedAt !== null) {
    state.matchStartedAt += performance.now() - state.pausedAt;
    state.pausedAt = null;
    if (state.running) state.timerId = setInterval(tick, 1000);
  }
  syncMusic();
}

export function handleGameModeChange(event) {
  const nextMode = event.target.value;

  if (state.running || !gameModes[nextMode]) {
    syncGameModeUi();
    return;
  }

  state.activeGameMode = nextMode;
  state.currentRunMode = nextMode;
  state.savedScoreId = null;
  state.scoreSaved = false;
  syncGameModeUi();
  resetLeaderboardContext();

  if (!leaderboardMenu.hidden) {
    loadLeaderboard({ standaloneOnly: true });
  }
}

export function syncGameModeUi() {
  const mode = getGameModeConfig(state.activeGameMode);

  document.body.dataset.gameMode = state.activeGameMode;
  gameModeHelp.textContent = mode.help;
  timerEl.hidden = false;
  timerUnitEl.textContent = "sec";
  targetHelp.textContent = "Press start to begin";
  messageEl.textContent = state.activeGameMode === "survival"
    ? "Tap Start, then keep matching until your first miss."
    : "Tap Start, then find and zap the matching shape.";
  updateLeaderboardTitles(state.activeGameMode);

  modeInputs.forEach((input) => {
    input.checked = input.value === state.activeGameMode;
    input.disabled = state.running;
  });
}

export function getGameModeConfig(modeName = state.activeGameMode) {
  return gameModes[modeName] || gameModes[defaultGameMode];
}

export function isSurvivalMode(modeName = state.currentRunMode) {
  return modeName === "survival";
}

export function setModeInputsDisabled(disabled) {
  modeInputs.forEach((input) => {
    input.disabled = disabled;
  });
}

export function refreshCurrentRound() {
  if (!state.running) return;

  clearRoundTimeouts();
  grid.classList.remove("is-flipping");
  state.boardLocked = false;
  nextRound();
  setGridDisabled(false);
}

export function startGame() {
  clearRoundTimeouts();
  state.score = 0;
  state.streak = 0;
  state.wrongCount = 0;
  state.timeLeft = gameLength;
  state.currentRunMode = state.activeGameMode;
  state.running = true;
  state.pausedAt = null;
  backgroundMusic.pause();
  state.musicTracks = musicPlaylists[state.currentRunMode];
  state.musicTrackIndex = 0;
  if (state.musicTracks.length) {
    backgroundMusic.src = state.musicTracks[0];
    backgroundMusic.currentTime = 0;
  } else {
    backgroundMusic.removeAttribute("src");
  }
  syncMusic();
  state.boardLocked = false;
  state.scoreSaved = false;
  state.savedScoreId = null;
  state.matchStartedAt = performance.now();
  state.matchEndedAt = null;
  state.finalElapsedSeconds = 0;
  state.finalRate = 0;
  gameArea.scrollIntoView({ block: "start", behavior: "smooth" });
  document.body.classList.add("is-playing");
  grid.classList.remove("is-flipping");
  gameOver.hidden = true;
  resetLeaderboardContext();
  scoreForm.reset();
  saveScoreStatus.textContent = "";
  saveScoreButton.disabled = false;
  setModeInputsDisabled(true);
  startButton.textContent = "Restart";
  targetPanel.classList.remove("is-waiting");
  targetHelp.hidden = true;
  timerEl.hidden = isSurvivalMode();
  messageEl.textContent = getGameModeConfig(state.currentRunMode).startMessage;
  updateStats();
  nextRound();
  clearInterval(state.timerId);
  state.timerId = setInterval(tick, 1000);
}

export function tick() {
  if (!state.running || state.pausedAt !== null) return;
  if (isSurvivalMode()) {
    updateStats();
    return;
  }

  state.timeLeft = Math.max(0, state.timeLeft - 1);
  updateStats();

  if (state.timeLeft <= 0) {
    endGame();
  }
}

export function endGame() {
  state.running = false;
  syncMusic();
  if (backgroundMusic.getAttribute("src")) backgroundMusic.currentTime = 0;
  state.boardLocked = true;
  state.matchEndedAt = performance.now();
  state.finalElapsedSeconds = getElapsedSeconds();
  state.finalRate = calculateZapRate(state.score, state.finalElapsedSeconds);
  clearRoundTimeouts();
  clearInterval(state.timerId);
  state.timerId = null;
  document.body.classList.remove("is-playing");
  grid.classList.remove("is-flipping");
  setGridDisabled(true);
  finalScore.textContent = state.score;
  finalZapRate.textContent = formatRate(state.finalRate);
  finalWrongCount.textContent = state.wrongCount;
  resultModeLabel.textContent = getGameModeConfig(state.currentRunMode).label;
  resetLeaderboardContext("Loading placement...");
  setModeInputsDisabled(false);
  saveScoreButton.disabled = !leaderboardAvailable;
  saveScoreStatus.textContent = leaderboardAvailable
    ? ""
    : "Add app-config.js with your Supabase Edge Function URL to save scores.";
  gameOver.hidden = false;
  targetPanel.classList.add("is-waiting");
  targetHelp.hidden = false;
  timerEl.hidden = false;
  messageEl.textContent = isSurvivalMode()
    ? `Wrong shape. Survival score: ${state.score}.`
    : `Time is up. Final score: ${state.score}.`;
  updateStats();
  loadLeaderboard({ includeContext: true });

  if (leaderboardAvailable) {
    playerNameInput.focus();
  } else {
    playAgainButton.focus();
  }
}

export function nextRound() {
  state.target = pick(state.combos);
  const matchIndex = randomInt(9);
  const distractors = buildDistractors(state.target);
  const cells = [];

  for (let index = 0; index < 9; index += 1) {
    cells.push(index === matchIndex ? state.target : distractors.pop());
  }

  targetName.textContent = state.target.label;
  targetShape.innerHTML = makeShape(state.target);
  renderGrid(cells);
}

export function handleCellClick(event) {
  if (!state.running || state.pausedAt !== null || state.boardLocked) return;

  const button = event.currentTarget;
  const isMatch = button.dataset.comboId === state.target.id;
  playMatchSound(isMatch);

  if (!isMatch) {
    state.streak = 0;
    state.wrongCount += 1;
    updateStats();
    button.classList.remove("wrong");
    requestAnimationFrame(() => button.classList.add("wrong"));

    if (isSurvivalMode()) {
      messageEl.textContent = "Wrong item. Survival run over.";
      endGame();
      return;
    }

    state.timeLeft = Math.max(0, state.timeLeft - wrongPenalty);
    updateStats();
    flashPenalty();
    messageEl.textContent = `Wrong item. ${wrongPenalty} seconds lost.`;

    if (state.timeLeft <= 0) {
      endGame();
    }

    return;
  }

  state.score += 1;
  state.streak += 1;
  playZapEffect(button);
  messageEl.textContent = "Zapped. Next target.";
  updateStats();
  state.boardLocked = true;
  setGridDisabled(true);
  grid.classList.add("is-flipping");

  scheduleRoundTimeout(() => {
    if (state.running) {
      nextRound();
      setGridDisabled(true);
    }
  }, flipSwapDelay);

  scheduleRoundTimeout(() => {
    if (state.running) {
      grid.classList.remove("is-flipping");
      state.boardLocked = false;
      setGridDisabled(false);
    }
  }, flipDuration);
}

export function updateStats() {
  scoreEl.textContent = state.score;
  streakEl.textContent = state.streak;
  timeLeftEl.textContent = isSurvivalMode(getDisplayedStatsMode()) ? Math.floor(getElapsedSeconds()) : state.timeLeft;
  zapRateEl.textContent = formatRate(calculateZapRate(state.score, getElapsedSeconds()));
}

export function getDisplayedStatsMode() {
  return state.running ? state.currentRunMode : state.activeGameMode;
}

export function getElapsedSeconds() {
  if (!state.matchStartedAt) return 0;

  const endTime = state.matchEndedAt || state.pausedAt || performance.now();
  return Math.max(0, (endTime - state.matchStartedAt) / 1000);
}

export function scheduleRoundTimeout(callback, delay) {
  const timeoutId = window.setTimeout(() => {
    state.roundTimeouts = state.roundTimeouts.filter((id) => id !== timeoutId);
    callback();
  }, delay);

  state.roundTimeouts.push(timeoutId);
}

export function clearRoundTimeouts() {
  state.roundTimeouts.forEach((timeoutId) => window.clearTimeout(timeoutId));
  state.roundTimeouts = [];
}
