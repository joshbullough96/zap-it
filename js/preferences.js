// Persist and apply player appearance preferences.
import { syncMusicToggleUi } from "./audio.js";
import { buildCombos } from "./board.js";
import { defaultOneColor, defaultTheme, preferenceKeys, themes } from "./constants.js";
import {
  darkModeToggle,
  musicStatus,
  musicToggle,
  oneColorPicker,
  oneColorSwatches,
  soundEffectsToggle,
  themeInputs,
} from "./dom.js";
import { refreshCurrentRound } from "./game.js";
import { state } from "./state.js";
import { getReadableTextColor, isHexColor, mixHexColors } from "./utils.js";

export function getSavedTheme() {
  const savedTheme = readPreference(preferenceKeys.theme);
  if (savedTheme === "halloween") return "fall";
  return themes[savedTheme] ? savedTheme : defaultTheme;
}

export function getSavedDarkMode() {
  return readPreference(preferenceKeys.darkMode) === "true";
}

export function getSavedOneColor() {
  const savedColor = readPreference(preferenceKeys.oneColor);
  return isHexColor(savedColor) ? savedColor : defaultOneColor;
}

export function readPreference(key) {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return "";
  }
}

export function savePreference(key, value) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Preferences are optional; the game should still work without storage.
  }
}

export function applyPreferences() {
  document.body.dataset.theme = state.activeTheme;
  document.body.dataset.mode = state.darkMode ? "dark" : "light";
  document.body.style.setProperty("--one-color", state.oneColorValue);
  document.body.style.setProperty("--one-color-light", mixHexColors(state.oneColorValue, "#ffffff", 0.42));
  document.body.style.setProperty("--one-color-dark", mixHexColors(state.oneColorValue, "#000000", 0.2));
  document.body.style.setProperty("--one-color-button-text", getReadableTextColor(state.oneColorValue));

  themeInputs.forEach((input) => {
    input.checked = input.value === state.activeTheme;
  });

  darkModeToggle.checked = state.darkMode;
  soundEffectsToggle.checked = state.soundEffectsEnabled;
  document.querySelector("#sound-effects-state").textContent = state.soundEffectsEnabled ? "On" : "Off";
  document.querySelector("#dark-mode-state").textContent = state.darkMode ? "On" : "Off";
  syncMusicToggleUi();
  musicToggle.disabled = state.musicTracks.length === 0;
  musicStatus.textContent = state.musicTracks.length ? "" : "Music is coming soon.";
  oneColorPicker.value = state.oneColorValue;
  oneColorSwatches.forEach((swatch, index) => {
    const colors = [
      mixHexColors(state.oneColorValue, "#ffffff", 0.42),
      state.oneColorValue,
      mixHexColors(state.oneColorValue, "#000000", 0.2),
    ];
    swatch.style.setProperty("--swatch", colors[index]);
  });
}

export function handleThemeChange(event) {
  const nextTheme = event.target.value;

  if (!themes[nextTheme]) return;

  state.activeTheme = nextTheme;
  state.combos = buildCombos(state.activeTheme);
  applyPreferences();
  savePreference(preferenceKeys.theme, state.activeTheme);

  if (state.running) {
    refreshCurrentRound();
  }
}

export function handleDarkModeChange(event) {
  state.darkMode = event.target.checked;
  applyPreferences();
  savePreference(preferenceKeys.darkMode, String(state.darkMode));
}

export function handleOneColorChange(event) {
  const nextColor = event.target.value;

  if (!isHexColor(nextColor)) return;

  state.oneColorValue = nextColor;
  state.combos = buildCombos(state.activeTheme);
  applyPreferences();
  savePreference(preferenceKeys.oneColor, state.oneColorValue);

  if (state.activeTheme === "oneColor") {
    refreshCurrentRound();
  }
}
