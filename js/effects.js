// Visual lightning, penalties, and transient animations.
import { lightningZapDuration } from "./constants.js";
import { timerEl } from "./dom.js";
import { clamp } from "./utils.js";

export function playZapEffect(button) {
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

export function makeLightningPoints(startX, startY, endX, endY) {
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

export function flashPenalty() {
  timerEl.classList.remove("penalty");
  requestAnimationFrame(() => timerEl.classList.add("penalty"));
}
