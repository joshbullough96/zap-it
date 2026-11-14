// Create valid matching boards and render their cells.
import { shapes, themes } from "./constants.js";
import { grid } from "./dom.js";
import { handleCellClick } from "./game.js";
import { makeOneColorTileGradient, makeShape } from "./shapes.js";
import { state } from "./state.js";
import { shuffle, titleCase } from "./utils.js";

export function buildCombos(themeName) {
  const theme = themes[themeName] || themes.normal;

  if (theme.shapeOnly) {
    const color = { ...theme.colors[0], value: state.oneColorValue };
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

export function buildDistractors(currentTarget) {
  const options = state.combos.filter((combo) => combo.id !== currentTarget.id);
  const distractors = [];

  while (distractors.length < 8) {
    distractors.push(...shuffle(options));
  }

  return distractors.slice(0, 8);
}

export function renderGrid(cells) {
  grid.innerHTML = "";

  cells.forEach((combo, index) => {
    const button = document.createElement("button");
    button.className = "cell";
    button.type = "button";
    button.setAttribute("role", "gridcell");
    button.setAttribute("aria-label", combo.label);
    button.dataset.comboId = combo.id;
    button.dataset.index = String(index);
    button.style.background = state.activeTheme === "oneColor" ? makeOneColorTileGradient(index) : "";
    button.innerHTML = makeShape(combo);
    button.addEventListener("click", handleCellClick);
    grid.append(button);
  });
}

export function renderEmptyGrid() {
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

export function setGridDisabled(disabled) {
  grid.querySelectorAll("button").forEach((button) => {
    button.disabled = disabled;
  });
}
