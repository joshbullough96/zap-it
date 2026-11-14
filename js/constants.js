// Game rules, theme definitions, and public configuration.


export const shapes = ["star", "circle", "square", "triangle", "diamond"];

export const preferenceKeys = {
  theme: "zapItTheme",
  darkMode: "zapItDarkMode",
  oneColor: "zapItOneColor",
  music: "zapItMusic",
  soundEffects: "zapItSoundEffects",
};

export const defaultOneColor = "#0f7b8f";

export const defaultTheme = "normal";

export const themes = {
  normal: {
    colors: [
      { name: "blue", value: "#2877d8" },
      { name: "green", value: "#22a06b" },
      { name: "red", value: "#d83b4a" },
      { name: "yellow", value: "#f0c83b" },
      { name: "orange", value: "#ef8737" },
    ],
  },
  oneColor: {
    shapeOnly: true,
    colors: [{ name: "custom", value: defaultOneColor }],
  },
  christmas: {
    colors: [
      { name: "silver", value: "#c8d0d6" },
      { name: "red", value: "#c52b2f" },
      { name: "green", value: "#167a4a" },
    ],
  },
  patriotic: {
    colors: [
      { name: "liberty red", value: "#c82032" },
      { name: "star white", value: "#e1e1e1" },
      { name: "union blue", value: "#2246a7" },
    ],
  },
  fall: {
    colors: [
      { name: "maple", value: "#c65f24" },
      { name: "marigold", value: "#d99a22" },
      { name: "cranberry", value: "#a83f3f" },
      { name: "moss", value: "#6f7f3a" },
      { name: "plum", value: "#7b4b5b" },
    ],
  },
  summer: {
    colors: [
      { name: "sun", value: "#f8c630" },
      { name: "coral", value: "#ff6f61" },
      { name: "aqua", value: "#24b8c8" },
      { name: "lime", value: "#8cc63f" },
      { name: "sky", value: "#4f9fea" },
    ],
  },
};

export const gameLength = 60;

export const wrongPenalty = 10;

export const defaultGameMode = "classic";

export const gameModes = {
  classic: {
    label: "Classic",
    help: "Race the clock! Misses cost 10 seconds.",
    startMessage: "Zap the one item that matches the target.",
  },
  survival: {
    label: "Survival",
    help: "Seconds count up. Keep going until the first miss.",
    startMessage: "Keep zapping matches. One wrong shape ends the run.",
  },
};

export const lightningZapDuration = 140;

export const flipSwapDelay = 240;

export const flipDuration = 520;

export const maxPlayerNameLength = 16;

export const playerNamePattern = /^[A-Za-z0-9 _-]+$/;

export const fallbackBlockedWords = ["damn", "hell"];

export const config = window.ZAP_IT_CONFIG || {};

export const musicPlaylists = Object.fromEntries(Object.keys(gameModes).map((mode) => {
  const tracks = config.musicTracks?.[mode];
  return [mode, Array.isArray(tracks)
    ? tracks.filter((track) => typeof track === "string" && track.trim()).map((track) => track.trim())
    : []];
}));

export const leaderboardEndpoint = String(config.leaderboardEndpoint || "").trim().replace(/\/$/, "");

export const recaptchaSiteKey = String(config.recaptchaSiteKey || "").trim();

export const recaptchaAction = "save_score";

export const useMockLeaderboard = Boolean(config.useMockLeaderboard && Array.isArray(config.mockLeaderboardScores));

export const leaderboardAvailable = Boolean(leaderboardEndpoint || useMockLeaderboard);

export const gridKeyIndexes = {
  7: 0,
  8: 1,
  9: 2,
  4: 3,
  5: 4,
  6: 5,
  1: 6,
  2: 7,
  3: 8,
};
