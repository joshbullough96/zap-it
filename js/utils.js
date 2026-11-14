// Pure color, number, randomization, and formatting helpers.


export function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

export function calculateZapRate(zapCount, elapsedSeconds) {
  if (!elapsedSeconds) return 0;

  return Math.round((zapCount / elapsedSeconds) * 100) / 100;
}

export function formatRate(value) {
  return value.toFixed(2);
}

export function isHexColor(value) {
  return typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value);
}

export function mixHexColors(firstColor, secondColor, amount) {
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

export function hexToRgb(value) {
  if (!isHexColor(value)) return null;

  const normalized = value.slice(1);
  return {
    r: parseInt(normalized.slice(0, 2), 16),
    g: parseInt(normalized.slice(2, 4), 16),
    b: parseInt(normalized.slice(4, 6), 16),
  };
}

export function rgbToHex({ r, g, b }) {
  return `#${toHexChannel(r)}${toHexChannel(g)}${toHexChannel(b)}`;
}

export function toHexChannel(value) {
  return value.toString(16).padStart(2, "0");
}

export function getReadableTextColor(backgroundColor) {
  const color = hexToRgb(backgroundColor);

  if (!color) return "#ffffff";

  const luminance = (0.2126 * color.r + 0.7152 * color.g + 0.0722 * color.b) / 255;
  return luminance > 0.62 ? "#17212b" : "#ffffff";
}

export function pick(items) {
  return items[randomInt(items.length)];
}

export function randomInt(max) {
  return Math.floor(Math.random() * max);
}

export function shuffle(items) {
  const shuffled = [...items];

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = randomInt(index + 1);
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }

  return shuffled;
}

export function titleCase(value) {
  const smallWords = new Set(["a", "an", "and", "as", "at", "but", "by", "for", "in", "nor", "of", "on", "or", "per", "the", "to", "via", "vs"]);

  return value
    .trim()
    .split(/\s+/)
    .map((word, index) => {
      const normalizedWord = word.toLowerCase();

      if (index > 0 && smallWords.has(normalizedWord)) {
        return normalizedWord;
      }

      return normalizedWord
        .split("-")
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join("-");
    })
    .join(" ");
}
