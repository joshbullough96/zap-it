// SVG shapes and one-color tile gradients.
import { state } from "./state.js";
import { mixHexColors } from "./utils.js";

export function makeShape(combo) {
  const gradient = state.activeTheme === "oneColor" ? makeOneColorGradient(combo.fill) : null;
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

export function svg(content) {
  return `<svg class="shape-svg" viewBox="0 0 100 100" aria-hidden="true" focusable="false">${content}</svg>`;
}

export function makeOneColorGradient(baseColor) {
  state.shapeRenderCount += 1;
  const gradientId = `one-color-gradient-${state.shapeRenderCount}`;
  const lightColor = mixHexColors(baseColor, "#ffffff", 0.42);
  const darkColor = mixHexColors(baseColor, "#000000", 0.24);
  const angle = state.shapeRenderCount % 4;
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

export function makeOneColorTileGradient(index) {
  const lightColor = mixHexColors(state.oneColorValue, "#ffffff", 0.72);
  const middleColor = mixHexColors(state.oneColorValue, "#ffffff", 0.88);
  const darkColor = mixHexColors(state.oneColorValue, "#000000", 0.08);
  const angle = [135, 45, 180, 90][index % 4];

  return `linear-gradient(${angle}deg, ${middleColor} 0%, ${lightColor} 48%, ${darkColor} 100%)`;
}
