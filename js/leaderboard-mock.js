// In-memory leaderboard storage, ranking, and placement.
import { getLeaderboardMode } from "./leaderboard-api.js";
import { state } from "./state.js";

export function saveMockScore({ gameMode, playerName, score, zapsPerSecond, elapsedSeconds, wrongCount }) {
  const scores = getMockLeaderboardScores(gameMode);
  const nextId = scores.reduce((highestId, entry) => Math.max(highestId, Number(entry.id) || 0), 0) + 1;
  const savedScore = {
    id: nextId,
    playerName,
    score,
    zapsPerSecond: Math.round(zapsPerSecond * 100) / 100,
    elapsedSeconds: Math.round(elapsedSeconds * 100) / 100,
    wrongCount,
    createdAt: new Date().toISOString(),
  };

  scores.push(savedScore);

  return { ok: true, scoreId: nextId };
}

export function getMockLeaderboardResult({ includeContext = false } = {}) {
  const gameMode = getLeaderboardMode({ includeContext });
  const sortedScores = getSortedLeaderboardScores(getMockLeaderboardScores(gameMode));
  const result = { scores: sortedScores.slice(0, 5).map(toLeaderboardEntry) };

  if (includeContext) {
    result.context = state.savedScoreId
      ? getSavedMockContext(sortedScores, state.savedScoreId)
      : getPreviewMockContext(sortedScores);
  }

  return result;
}

export function getMockLeaderboardScores(gameMode = state.activeGameMode) {
  return gameMode === "survival" ? state.mockSurvivalLeaderboardScores : state.mockLeaderboardScores;
}

export function getSavedMockContext(sortedScores, scoreId) {
  const targetIndex = sortedScores.findIndex((entry) => Number(entry.id) === Number(scoreId));

  if (targetIndex < 0) {
    return null;
  }

  const rank = targetIndex + 1;
  const above = sortedScores.slice(Math.max(0, targetIndex - 2), targetIndex);
  const below = sortedScores.slice(targetIndex + 1, targetIndex + 3);

  return makeMockContext("saved", sortedScores[targetIndex], rank, sortedScores.length, above, below);
}

export function getPreviewMockContext(sortedScores) {
  const target = {
    playerName: "Your run",
    score: state.score,
    zapsPerSecond: Math.round(state.finalRate * 100) / 100,
    elapsedSeconds: Math.round(state.finalElapsedSeconds * 100) / 100,
    wrongCount: state.wrongCount,
    createdAt: new Date().toISOString(),
  };
  const above = sortedScores.filter((entry) => comparePreviewPlacement(entry, target) < 0);
  const below = sortedScores.filter((entry) => comparePreviewPlacement(entry, target) > 0);
  const rank = above.length + 1;

  return makeMockContext("preview", target, rank, sortedScores.length + 1, above.slice(-2), below.slice(0, 2));
}

export function makeMockContext(mode, target, rank, totalScores, above, below) {
  return {
    mode,
    rank,
    totalScores,
    scores: [
      ...above.map((entry, index) => ({
        ...toLeaderboardEntry(entry),
        rank: rank - above.length + index,
      })),
      {
        ...toLeaderboardEntry(target),
        rank,
        isCurrent: true,
      },
      ...below.map((entry, index) => ({
        ...toLeaderboardEntry(entry),
        rank: rank + index + 1,
      })),
    ],
    nextToBeat: above.length ? toLeaderboardEntry(above[above.length - 1]) : null,
  };
}

export function comparePreviewPlacement(entry, target) {
  if (entry.score !== target.score) return target.score - entry.score;
  if (entry.zapsPerSecond !== target.zapsPerSecond) return target.zapsPerSecond - entry.zapsPerSecond;
  return -1;
}

export function getSortedLeaderboardScores(entries) {
  return [...entries].sort(compareLeaderboardEntries);
}

export function compareLeaderboardEntries(first, second) {
  if (first.score !== second.score) return second.score - first.score;
  if (first.zapsPerSecond !== second.zapsPerSecond) return second.zapsPerSecond - first.zapsPerSecond;

  const firstCreatedAt = Date.parse(first.createdAt) || 0;
  const secondCreatedAt = Date.parse(second.createdAt) || 0;
  if (firstCreatedAt !== secondCreatedAt) return firstCreatedAt - secondCreatedAt;

  return (Number(first.id) || 0) - (Number(second.id) || 0);
}

export function normalizeMockLeaderboardScore(entry) {
  if (!entry || typeof entry !== "object") {
    return null;
  }

  return {
    id: Number(entry.id) || 0,
    playerName: String(entry.playerName || "Player"),
    score: Number(entry.score) || 0,
    zapsPerSecond: Number(entry.zapsPerSecond) || 0,
    elapsedSeconds: Number(entry.elapsedSeconds) || 0,
    wrongCount: Number(entry.wrongCount) || 0,
    createdAt: String(entry.createdAt || new Date().toISOString()),
  };
}

export function toLeaderboardEntry(entry) {
  return {
    playerName: entry.playerName,
    score: entry.score,
    zapsPerSecond: entry.zapsPerSecond,
    elapsedSeconds: entry.elapsedSeconds,
    wrongCount: entry.wrongCount,
    createdAt: entry.createdAt,
  };
}
