// Leaderboard lists, placement messages, and result labels.
import {
  leaderboardContextList,
  leaderboardContextStatus,
  leaderboardContextTitle,
  leaderboardList,
  leaderboardStatus,
  leaderboardTitle,
  refreshLeaderboardButton,
  standaloneLeaderboardList,
  standaloneLeaderboardStatus,
  standaloneLeaderboardTitle,
  standaloneRefreshLeaderboardButton,
} from "./dom.js";
import { getGameModeConfig } from "./game.js";
import { state } from "./state.js";
import { formatRate } from "./utils.js";

export function updateLeaderboardTitles(modeName) {
  const mode = getGameModeConfig(modeName);
  standaloneLeaderboardTitle.textContent = `${mode.label} Top 5`;
  leaderboardTitle.textContent = `${mode.label} Top 5`;
}

export function getLeaderboardTargets({ standaloneOnly = false } = {}) {
  const standaloneTarget = {
    list: standaloneLeaderboardList,
    status: standaloneLeaderboardStatus,
    refreshButton: standaloneRefreshLeaderboardButton,
  };

  if (standaloneOnly) {
    return [standaloneTarget];
  }

  return [
    {
      list: leaderboardList,
      status: leaderboardStatus,
      refreshButton: refreshLeaderboardButton,
    },
    standaloneTarget,
  ];
}

export function setLeaderboardStatus(targets, message) {
  targets.forEach(({ status }) => {
    status.textContent = message;
  });
}

export function setLeaderboardRefreshDisabled(targets, disabled) {
  targets.forEach(({ refreshButton }) => {
    refreshButton.disabled = disabled;
  });
}

export function renderLeaderboard(entries, list = leaderboardList) {
  list.innerHTML = "";

  entries.slice(0, 5).forEach((entry, index) => {
    const item = document.createElement("li");
    const rank = document.createElement("span");
    const name = document.createElement("strong");
    const scoreValue = document.createElement("span");
    const rateValue = document.createElement("span");

    rank.className = "leaderboard-rank";
    name.className = "leaderboard-name";
    scoreValue.className = "leaderboard-score";
    rateValue.className = "leaderboard-rate";

    rank.textContent = `#${index + 1}`;
    name.textContent = entry.playerName || "Player";
    scoreValue.textContent = `${Number(entry.score) || 0} zaps`;
    rateValue.textContent = `${formatRate(Number(entry.zapsPerSecond) || 0)}/sec`;

    item.append(rank, name, scoreValue, rateValue);
    list.append(item);
  });
}

export function resetLeaderboardContext(message = "") {
  leaderboardContextList.innerHTML = "";
  leaderboardContextStatus.textContent = message;
  leaderboardContextTitle.textContent = "Next to beat";
}

export function renderLeaderboardContext(context) {
  resetLeaderboardContext();

  if (!context || typeof context !== "object") {
    leaderboardContextStatus.textContent = "Run placement is unavailable.";
    return;
  }

  const rank = Number(context.rank) || 0;
  const totalScores = Number(context.totalScores) || 0;
  const entries = Array.isArray(context.scores) ? context.scores : [];

  if (!rank || !totalScores || !entries.length) {
    leaderboardContextStatus.textContent = "Run placement is unavailable.";
    return;
  }

  leaderboardContextStatus.textContent = context.mode === "saved"
    ? `Saved rank: #${rank} of ${totalScores}.`
    : `Estimated rank: #${rank} of ${totalScores} if saved.`;

  entries.forEach((entry) => {
    const item = document.createElement("li");
    const rankValue = document.createElement("span");
    const name = document.createElement("strong");
    const scoreValue = document.createElement("span");
    const rateValue = document.createElement("span");

    rankValue.className = "leaderboard-rank";
    name.className = "leaderboard-name";
    scoreValue.className = "leaderboard-score";
    rateValue.className = "leaderboard-rate";

    if (entry.isCurrent) {
      item.classList.add("is-current");
    }

    rankValue.textContent = `#${Number(entry.rank) || "?"}`;
    name.textContent = entry.isCurrent ? getCurrentRunLabel(context.mode, entry.playerName) : entry.playerName || "Player";
    scoreValue.textContent = `${Number(entry.score) || 0} zaps`;
    rateValue.textContent = `${formatRate(Number(entry.zapsPerSecond) || 0)}/sec`;

    item.append(rankValue, name, scoreValue, rateValue);
    leaderboardContextList.append(item);
  });

  leaderboardContextTitle.textContent = getNextToBeatMessage(context.nextToBeat);
}

export function getCurrentRunLabel(mode, playerName) {
  if (mode === "saved" && playerName) {
    return playerName;
  }

  return "Your run";
}

export function getNextToBeatMessage(nextToBeat) {
  if (!nextToBeat || typeof nextToBeat !== "object") {
    return "No one above this run.";
  }

  const playerName = nextToBeat.playerName || "Player";
  const nextScore = Number(nextToBeat.score) || 0;
  const scoreGap = Math.max(1, nextScore + 1 - state.score);

  return `Next to beat: ${playerName}, ${scoreGap} more zap${scoreGap === 1 ? "" : "s"}.`;
}
