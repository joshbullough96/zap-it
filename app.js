const shapes = ["star", "circle", "square", "triangle", "diamond"];
const preferenceKeys = {
  theme: "zapItTheme",
  darkMode: "zapItDarkMode",
  oneColor: "zapItOneColor",
};
const defaultOneColor = "#0f7b8f";
const themes = {
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

const gameLength = 60;
const wrongPenalty = 10;
const lightningZapDuration = 140;
const flipSwapDelay = 240;
const flipDuration = 520;
const maxPlayerNameLength = 16;
const playerNamePattern = /^[A-Za-z0-9 _-]+$/;
const fallbackBlockedWords = ["damn", "hell"];
const config = window.ZAP_IT_CONFIG || {};
const leaderboardEndpoint = String(config.leaderboardEndpoint || "").trim().replace(/\/$/, "");

const grid = document.querySelector("#grid");
const targetPanel = document.querySelector("#target-panel");
const targetShape = document.querySelector("#target-shape");
const targetName = document.querySelector("#target-name");
const targetHelp = document.querySelector("#target-help");
const scoreEl = document.querySelector("#score");
const streakEl = document.querySelector("#streak");
const zapRateEl = document.querySelector("#zap-rate");
const timeLeftEl = document.querySelector("#time-left");
const timerEl = timeLeftEl.closest(".timer");
const messageEl = document.querySelector("#message");
const startButton = document.querySelector("#start-button");
const gameOver = document.querySelector("#game-over");
const finalScore = document.querySelector("#final-score");
const finalZapRate = document.querySelector("#final-zap-rate");
const playAgainButton = document.querySelector("#play-again-button");
const leaderboardList = document.querySelector("#leaderboard-list");
const leaderboardStatus = document.querySelector("#leaderboard-status");
const refreshLeaderboardButton = document.querySelector("#refresh-leaderboard");
const scoreForm = document.querySelector("#score-form");
const playerNameInput = document.querySelector("#player-name");
const saveScoreButton = document.querySelector("#save-score-button");
const saveScoreStatus = document.querySelector("#save-score-status");
const settingsButton = document.querySelector("#settings-button");
const settingsMenu = document.querySelector("#settings-menu");
const closeSettingsButton = document.querySelector("#close-settings-button");
const themeInputs = document.querySelectorAll("input[name='theme']");
const darkModeToggle = document.querySelector("#dark-mode-toggle");
const oneColorPicker = document.querySelector("#one-color-picker");
const oneColorSwatches = document.querySelectorAll("#one-color-swatches span");

let score = 0;
let streak = 0;
let timeLeft = gameLength;
let target = null;
let running = false;
let boardLocked = false;
let scoreSaved = false;
let timerId = null;
let matchStartedAt = null;
let matchEndedAt = null;
let finalElapsedSeconds = 0;
let finalRate = 0;
let roundTimeouts = [];
let activeTheme = getSavedTheme();
let darkMode = getSavedDarkMode();
let oneColorValue = getSavedOneColor();
let shapeRenderCount = 0;
let combos = buildCombos(activeTheme);

applyPreferences();
renderEmptyGrid();
updateStats();

startButton.addEventListener("click", startGame);
playAgainButton.addEventListener("click", startGame);
refreshLeaderboardButton.addEventListener("click", loadLeaderboard);
scoreForm.addEventListener("submit", handleScoreSubmit);
settingsButton.addEventListener("click", openSettings);
closeSettingsButton.addEventListener("click", closeSettings);
settingsMenu.addEventListener("click", handleSettingsBackdropClick);
themeInputs.forEach((input) => input.addEventListener("change", handleThemeChange));
darkModeToggle.addEventListener("change", handleDarkModeChange);
oneColorPicker.addEventListener("input", handleOneColorChange);
document.addEventListener("keydown", handleDocumentKeydown);
playerNameInput.addEventListener("input", () => {
  if (!scoreSaved) {
    saveScoreStatus.textContent = "";
  }
});

function getSavedTheme() {
  const savedTheme = readPreference(preferenceKeys.theme);
  if (savedTheme === "halloween") return "fall";
  return themes[savedTheme] ? savedTheme : "normal";
}

function getSavedDarkMode() {
  return readPreference(preferenceKeys.darkMode) === "true";
}

function getSavedOneColor() {
  const savedColor = readPreference(preferenceKeys.oneColor);
  return isHexColor(savedColor) ? savedColor : defaultOneColor;
}

function readPreference(key) {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return "";
  }
}

function savePreference(key, value) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Preferences are optional; the game should still work without storage.
  }
}

function buildCombos(themeName) {
  const theme = themes[themeName] || themes.normal;

  if (theme.shapeOnly) {
    const color = { ...theme.colors[0], value: oneColorValue };
    return shapes.map((shape) => ({
      id: `shape-${shape}`,
      color: color.name,
      fill: color.value,
      shape,
      label: titleCase(shape),
    }));
  }

  return theme.colors.flatMap((color) =>
    shapes.map((shape) => ({
      id: `${color.name}-${shape}`,
      color: color.name,
      fill: color.value,
      shape,
      label: `${titleCase(color.name)} ${titleCase(shape)}`,
    }))
  );
}

function applyPreferences() {
  document.body.dataset.theme = activeTheme;
  document.body.dataset.mode = darkMode ? "dark" : "light";
  document.body.style.setProperty("--one-color", oneColorValue);
  document.body.style.setProperty("--one-color-light", mixHexColors(oneColorValue, "#ffffff", 0.42));
  document.body.style.setProperty("--one-color-dark", mixHexColors(oneColorValue, "#000000", 0.2));
  document.body.style.setProperty("--one-color-button-text", getReadableTextColor(oneColorValue));

  themeInputs.forEach((input) => {
    input.checked = input.value === activeTheme;
  });

  darkModeToggle.checked = darkMode;
  oneColorPicker.value = oneColorValue;
  oneColorSwatches.forEach((swatch, index) => {
    const colors = [
      mixHexColors(oneColorValue, "#ffffff", 0.42),
      oneColorValue,
      mixHexColors(oneColorValue, "#000000", 0.2),
    ];
    swatch.style.setProperty("--swatch", colors[index]);
  });
}

function openSettings() {
  settingsMenu.hidden = false;
  closeSettingsButton.focus();
}

function closeSettings() {
  settingsMenu.hidden = true;
  settingsButton.focus();
}

function handleSettingsBackdropClick(event) {
  if (event.target === settingsMenu) {
    closeSettings();
  }
}

function handleDocumentKeydown(event) {
  if (event.key === "Escape" && !settingsMenu.hidden) {
    closeSettings();
  }
}

function handleThemeChange(event) {
  const nextTheme = event.target.value;

  if (!themes[nextTheme]) return;

  activeTheme = nextTheme;
  combos = buildCombos(activeTheme);
  applyPreferences();
  savePreference(preferenceKeys.theme, activeTheme);

  if (running) {
    refreshCurrentRound();
  }
}

function handleDarkModeChange(event) {
  darkMode = event.target.checked;
  applyPreferences();
  savePreference(preferenceKeys.darkMode, String(darkMode));
}

function handleOneColorChange(event) {
  const nextColor = event.target.value;

  if (!isHexColor(nextColor)) return;

  oneColorValue = nextColor;
  combos = buildCombos(activeTheme);
  applyPreferences();
  savePreference(preferenceKeys.oneColor, oneColorValue);

  if (activeTheme === "oneColor") {
    refreshCurrentRound();
  }
}

function refreshCurrentRound() {
  if (!running) return;

  clearRoundTimeouts();
  grid.classList.remove("is-flipping");
  boardLocked = false;
  nextRound();
  setGridDisabled(false);
}

function startGame() {
  clearRoundTimeouts();
  score = 0;
  streak = 0;
  timeLeft = gameLength;
  running = true;
  boardLocked = false;
  scoreSaved = false;
  matchStartedAt = performance.now();
  matchEndedAt = null;
  finalElapsedSeconds = 0;
  finalRate = 0;
  grid.classList.remove("is-flipping");
  gameOver.hidden = true;
  scoreForm.reset();
  saveScoreStatus.textContent = "";
  saveScoreButton.disabled = false;
  startButton.textContent = "Restart";
  targetPanel.classList.remove("is-waiting");
  targetHelp.hidden = true;
  messageEl.textContent = "Zap the one item that matches the target.";
  updateStats();
  nextRound();
  clearInterval(timerId);
  timerId = setInterval(tick, 1000);
}

function tick() {
  timeLeft = Math.max(0, timeLeft - 1);
  updateStats();

  if (timeLeft <= 0) {
    endGame();
  }
}

function endGame() {
  running = false;
  boardLocked = true;
  matchEndedAt = performance.now();
  finalElapsedSeconds = getElapsedSeconds();
  finalRate = calculateZapRate(score, finalElapsedSeconds);
  clearRoundTimeouts();
  clearInterval(timerId);
  timerId = null;
  grid.classList.remove("is-flipping");
  setGridDisabled(true);
  finalScore.textContent = score;
  finalZapRate.textContent = formatRate(finalRate);
  saveScoreButton.disabled = !leaderboardEndpoint;
  saveScoreStatus.textContent = leaderboardEndpoint
    ? ""
    : "Add app-config.js with your Supabase Edge Function URL to save scores.";
  gameOver.hidden = false;
  targetPanel.classList.add("is-waiting");
  targetHelp.hidden = false;
  messageEl.textContent = `Time is up. Final score: ${score}.`;
  updateStats();
  loadLeaderboard();

  if (leaderboardEndpoint) {
    playerNameInput.focus();
  } else {
    playAgainButton.focus();
  }
}

function nextRound() {
  target = pick(combos);
  const matchIndex = randomInt(9);
  const distractors = buildDistractors(target);
  const cells = [];

  for (let index = 0; index < 9; index += 1) {
    cells.push(index === matchIndex ? target : distractors.pop());
  }

  targetName.textContent = target.label;
  targetShape.innerHTML = makeShape(target);
  renderGrid(cells);
}

function buildDistractors(currentTarget) {
  const options = combos.filter((combo) => combo.id !== currentTarget.id);
  const distractors = [];

  while (distractors.length < 8) {
    distractors.push(...shuffle(options));
  }

  return distractors.slice(0, 8);
}

function renderGrid(cells) {
  grid.innerHTML = "";

  cells.forEach((combo, index) => {
    const button = document.createElement("button");
    button.className = "cell";
    button.type = "button";
    button.setAttribute("role", "gridcell");
    button.setAttribute("aria-label", combo.label);
    button.dataset.comboId = combo.id;
    button.dataset.index = String(index);
    button.style.background = activeTheme === "oneColor" ? makeOneColorTileGradient(index) : "";
    button.innerHTML = makeShape(combo);
    button.addEventListener("click", handleCellClick);
    grid.append(button);
  });
}

function renderEmptyGrid() {
  grid.innerHTML = "";

  for (let index = 0; index < 9; index += 1) {
    const button = document.createElement("button");
    button.className = "cell";
    button.type = "button";
    button.disabled = true;
    button.setAttribute("role", "gridcell");
    button.setAttribute("aria-label", "Empty cell");
    grid.append(button);
  }
}

function handleCellClick(event) {
  if (!running || boardLocked) return;

  const button = event.currentTarget;
  const isMatch = button.dataset.comboId === target.id;

  if (!isMatch) {
    streak = 0;
    timeLeft = Math.max(0, timeLeft - wrongPenalty);
    updateStats();
    flashPenalty();
    button.classList.remove("wrong");
    requestAnimationFrame(() => button.classList.add("wrong"));
    messageEl.textContent = `Wrong item. ${wrongPenalty} seconds lost.`;

    if (timeLeft <= 0) {
      endGame();
    }

    return;
  }

  score += 1;
  streak += 1;
  playZapEffect(button);
  messageEl.textContent = "Zapped. Next target.";
  updateStats();
  boardLocked = true;
  setGridDisabled(true);
  grid.classList.add("is-flipping");

  scheduleRoundTimeout(() => {
    if (running) {
      nextRound();
      setGridDisabled(true);
    }
  }, flipSwapDelay);

  scheduleRoundTimeout(() => {
    if (running) {
      grid.classList.remove("is-flipping");
      boardLocked = false;
      setGridDisabled(false);
    }
  }, flipDuration);
}

function playZapEffect(button) {
  document.querySelectorAll(".screen-zap").forEach((effect) => effect.remove());
  button.classList.remove("is-struck");
  button.classList.add("correct");

  const rect = button.getBoundingClientRect();
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const targetX = rect.left + rect.width / 2;
  const targetY = rect.top + rect.height / 2;
  const entryOffset = targetX < viewportWidth / 2 ? 120 : -120;
  const startX = clamp(targetX + entryOffset, 24, viewportWidth - 24);
  const points = makeLightningPoints(startX, 0, targetX, targetY);

  const effect = document.createElement("div");
  effect.className = "screen-zap";
  effect.setAttribute("aria-hidden", "true");
  effect.innerHTML = [
    `<svg viewBox="0 0 ${viewportWidth} ${viewportHeight}" focusable="false">`,
    `<polyline class="screen-zap-glow" points="${points}" />`,
    `<polyline class="screen-zap-core" points="${points}" />`,
    `<circle class="screen-zap-impact" cx="${targetX}" cy="${targetY}" r="5" />`,
    "</svg>",
  ].join("");

  document.body.append(effect);

  requestAnimationFrame(() => {
    button.classList.add("is-struck");
  });

  window.setTimeout(() => {
    effect.remove();
    button.classList.remove("is-struck");
  }, lightningZapDuration);
}

function makeLightningPoints(startX, startY, endX, endY) {
  const segments = 7;
  const dx = endX - startX;
  const dy = endY - startY;
  const length = Math.hypot(dx, dy) || 1;
  const perpendicularX = -dy / length;
  const perpendicularY = dx / length;
  const points = [];

  for (let index = 0; index <= segments; index += 1) {
    const progress = index / segments;
    const taper = 1 - Math.abs(progress - 0.5) * 1.4;
    const jitter = index === 0 || index === segments ? 0 : (index % 2 === 0 ? -1 : 1) * (13 + index * 2) * taper;
    const x = startX + dx * progress + perpendicularX * jitter;
    const y = startY + dy * progress + perpendicularY * jitter;
    points.push(`${Math.round(x)},${Math.round(y)}`);
  }

  return points.join(" ");
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

async function handleScoreSubmit(event) {
  event.preventDefault();

  if (scoreSaved) return;

  if (!leaderboardEndpoint) {
    saveScoreStatus.textContent = "Leaderboard setup is not connected yet.";
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
    const response = await fetch(leaderboardEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        playerName,
        score,
        zapsPerSecond: finalRate,
        elapsedSeconds: finalElapsedSeconds,
      }),
    });
    const result = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(result.error || "Score could not be saved.");
    }

    scoreSaved = true;
    playerNameInput.value = playerName;
    saveScoreStatus.textContent = "Score saved.";
    await loadLeaderboard();
  } catch (error) {
    saveScoreButton.disabled = false;
    saveScoreStatus.textContent = error.message || "Score could not be saved.";
  }
}

async function loadLeaderboard() {
  leaderboardList.innerHTML = "";

  if (!leaderboardEndpoint) {
    leaderboardStatus.textContent = "Connect your Supabase Edge Function URL to show global scores.";
    return;
  }

  leaderboardStatus.textContent = "Loading leaderboard...";
  refreshLeaderboardButton.disabled = true;

  try {
    const response = await fetch(leaderboardEndpoint, {
      method: "GET",
      headers: { Accept: "application/json" },
    });
    const result = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(result.error || "Leaderboard could not be loaded.");
    }

    const entries = Array.isArray(result.scores) ? result.scores : [];
    renderLeaderboard(entries);
    leaderboardStatus.textContent = entries.length ? "" : "No scores yet.";
  } catch (error) {
    leaderboardStatus.textContent = error.message || "Leaderboard could not be loaded.";
  } finally {
    refreshLeaderboardButton.disabled = false;
  }
}

function renderLeaderboard(entries) {
  leaderboardList.innerHTML = "";

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
    leaderboardList.append(item);
  });
}

function validatePlayerName(playerName) {
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

function updateStats() {
  scoreEl.textContent = score;
  streakEl.textContent = streak;
  timeLeftEl.textContent = timeLeft;
  zapRateEl.textContent = formatRate(calculateZapRate(score, getElapsedSeconds()));
}

function getElapsedSeconds() {
  if (!matchStartedAt) return 0;

  const endTime = matchEndedAt || performance.now();
  return Math.max(0, (endTime - matchStartedAt) / 1000);
}

function calculateZapRate(zapCount, elapsedSeconds) {
  if (!elapsedSeconds) return 0;

  return Math.round((zapCount / elapsedSeconds) * 100) / 100;
}

function formatRate(value) {
  return value.toFixed(2);
}

function setGridDisabled(disabled) {
  grid.querySelectorAll("button").forEach((button) => {
    button.disabled = disabled;
  });
}

function flashPenalty() {
  timerEl.classList.remove("penalty");
  requestAnimationFrame(() => timerEl.classList.add("penalty"));
}

function scheduleRoundTimeout(callback, delay) {
  const timeoutId = window.setTimeout(() => {
    roundTimeouts = roundTimeouts.filter((id) => id !== timeoutId);
    callback();
  }, delay);

  roundTimeouts.push(timeoutId);
}

function clearRoundTimeouts() {
  roundTimeouts.forEach((timeoutId) => window.clearTimeout(timeoutId));
  roundTimeouts = [];
}

function makeShape(combo) {
  const gradient = activeTheme === "oneColor" ? makeOneColorGradient(combo.fill) : null;
  const fill = gradient ? `url(#${gradient.id})` : combo.fill;
  const stroke = "rgba(23, 33, 43, 0.22)";

  if (combo.shape === "circle") {
    return svg(`${gradient?.definition || ""}<circle cx="50" cy="50" r="34" fill="${fill}" stroke="${stroke}" stroke-width="4" />`);
  }

  if (combo.shape === "square") {
    return svg(`${gradient?.definition || ""}<rect x="18" y="18" width="64" height="64" rx="7" fill="${fill}" stroke="${stroke}" stroke-width="4" />`);
  }

  if (combo.shape === "triangle") {
    return svg(`${gradient?.definition || ""}<polygon points="50,14 88,84 12,84" fill="${fill}" stroke="${stroke}" stroke-width="4" stroke-linejoin="round" />`);
  }

  if (combo.shape === "diamond") {
    return svg(`${gradient?.definition || ""}<polygon points="50,10 90,50 50,90 10,50" fill="${fill}" stroke="${stroke}" stroke-width="4" stroke-linejoin="round" />`);
  }

  return svg(`${gradient?.definition || ""}<polygon points="50,9 61,36 90,38 68,57 76,86 50,70 24,86 32,57 10,38 39,36" fill="${fill}" stroke="${stroke}" stroke-width="4" stroke-linejoin="round" />`);
}

function svg(content) {
  return `<svg class="shape-svg" viewBox="0 0 100 100" aria-hidden="true" focusable="false">${content}</svg>`;
}

function makeOneColorGradient(baseColor) {
  shapeRenderCount += 1;
  const gradientId = `one-color-gradient-${shapeRenderCount}`;
  const lightColor = mixHexColors(baseColor, "#ffffff", 0.42);
  const darkColor = mixHexColors(baseColor, "#000000", 0.24);
  const angle = shapeRenderCount % 4;
  const coordinates = [
    { x1: "0%", y1: "0%", x2: "100%", y2: "100%" },
    { x1: "100%", y1: "0%", x2: "0%", y2: "100%" },
    { x1: "50%", y1: "0%", x2: "50%", y2: "100%" },
    { x1: "0%", y1: "50%", x2: "100%", y2: "50%" },
  ][angle];
  const definition = [
    `<defs><linearGradient id="${gradientId}" x1="${coordinates.x1}" y1="${coordinates.y1}" x2="${coordinates.x2}" y2="${coordinates.y2}">`,
    `<stop offset="0%" stop-color="${lightColor}" />`,
    `<stop offset="52%" stop-color="${baseColor}" />`,
    `<stop offset="100%" stop-color="${darkColor}" />`,
    "</linearGradient></defs>",
  ].join("");

  return { definition, id: gradientId };
}

function makeOneColorTileGradient(index) {
  const lightColor = mixHexColors(oneColorValue, "#ffffff", 0.72);
  const middleColor = mixHexColors(oneColorValue, "#ffffff", 0.88);
  const darkColor = mixHexColors(oneColorValue, "#000000", 0.08);
  const angle = [135, 45, 180, 90][index % 4];

  return `linear-gradient(${angle}deg, ${middleColor} 0%, ${lightColor} 48%, ${darkColor} 100%)`;
}

function isHexColor(value) {
  return typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value);
}

function mixHexColors(firstColor, secondColor, amount) {
  const first = hexToRgb(firstColor);
  const second = hexToRgb(secondColor);

  if (!first || !second) return firstColor;

  const mixed = {
    r: Math.round(first.r + (second.r - first.r) * amount),
    g: Math.round(first.g + (second.g - first.g) * amount),
    b: Math.round(first.b + (second.b - first.b) * amount),
  };

  return rgbToHex(mixed);
}

function hexToRgb(value) {
  if (!isHexColor(value)) return null;

  const normalized = value.slice(1);
  return {
    r: parseInt(normalized.slice(0, 2), 16),
    g: parseInt(normalized.slice(2, 4), 16),
    b: parseInt(normalized.slice(4, 6), 16),
  };
}

function rgbToHex({ r, g, b }) {
  return `#${toHexChannel(r)}${toHexChannel(g)}${toHexChannel(b)}`;
}

function toHexChannel(value) {
  return value.toString(16).padStart(2, "0");
}

function getReadableTextColor(backgroundColor) {
  const color = hexToRgb(backgroundColor);

  if (!color) return "#ffffff";

  const luminance = (0.2126 * color.r + 0.7152 * color.g + 0.0722 * color.b) / 255;
  return luminance > 0.62 ? "#17212b" : "#ffffff";
}

function pick(items) {
  return items[randomInt(items.length)];
}

function randomInt(max) {
  return Math.floor(Math.random() * max);
}

function shuffle(items) {
  const shuffled = [...items];

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = randomInt(index + 1);
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }

  return shuffled;
}

function titleCase(value) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
