// Background playlists, synthesized feedback, and audio UI state.
import { musicStatus, musicToggle } from "./dom.js";
import { state } from "./state.js";

export const backgroundMusic = new Audio();

export function syncMusic() {
  if (!state.musicEnabled || !state.running || state.pausedAt !== null || document.hidden || !state.musicTracks.length) {
    backgroundMusic.pause();
    return;
  }
  if (!backgroundMusic.getAttribute("src")) {
    backgroundMusic.src = state.musicTracks[state.musicTrackIndex];
  }
  // Playback begins from Start or the music toggle, satisfying browser gesture rules.
  // A rejected play request must never interrupt gameplay.
  backgroundMusic.play().then(() => {
    musicStatus.textContent = "";
  }).catch((error) => {
    if (error.name === "AbortError") return;
    musicStatus.textContent = error.name === "NotAllowedError"
      ? "Turn music off and on to resume playback."
      : "Music couldn't play. You can keep playing.";
  });
}

export function syncMusicToggleUi() {
  musicToggle.checked = state.musicEnabled;
  document.querySelector(".music-toggle-row .music-switch-state").textContent = state.musicEnabled ? "On" : "Off";
  document.querySelector(".music-toggle-row .music-label i").className = state.musicEnabled
    ? "fa-solid fa-volume-high" : "fa-solid fa-volume-xmark";
}

export function playMatchSound(isMatch) {
  if (!state.soundEffectsEnabled) return;
  try {
    const Context = window.AudioContext || window.webkitAudioContext;
    if (!Context) return;
    state.effectsContext ||= new Context();
    if (state.effectsContext.state === "suspended") {
      state.effectsContext.resume().catch(() => {});
    }
    if (state.activeEffect) state.activeEffect.stop();
    const now = state.effectsContext.currentTime;
    if (isMatch) {
      // A short laser pulse with a smooth downward pitch sweep.
      const duration = 0.16;
      const source = state.effectsContext.createOscillator();
      source.type = "triangle";
      source.frequency.setValueAtTime(1100, now);
      source.frequency.exponentialRampToValueAtTime(140, now + duration);
      const gain = state.effectsContext.createGain();
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.1133, now + 0.003);
      gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
      source.connect(gain);
      gain.connect(state.effectsContext.destination);
      state.activeEffect = source;
      source.onended = () => {
        source.disconnect();
        gain.disconnect();
        if (state.activeEffect === source) state.activeEffect = null;
      };
      source.start(now);
      source.stop(now + duration);
      return;
    }

    const oscillator = state.effectsContext.createOscillator();
    const gain = state.effectsContext.createGain();
    const duration = 0.19;
    oscillator.type = "sawtooth";
    oscillator.frequency.setValueAtTime(180, now);
    oscillator.frequency.exponentialRampToValueAtTime(55, now + duration);
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.101, now + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
    oscillator.connect(gain);
    gain.connect(state.effectsContext.destination);
    state.activeEffect = oscillator;
    oscillator.onended = () => {
      oscillator.disconnect();
      gain.disconnect();
      if (state.activeEffect === oscillator) state.activeEffect = null;
    };
    oscillator.start(now);
    oscillator.stop(now + duration);
  } catch {
    // Optional audio feedback must never affect scoring or gameplay.
  }
}

export function initializeAudio() {
  backgroundMusic.preload = "none";
  backgroundMusic.volume = 0.10;
  backgroundMusic.addEventListener("ended", () => {
    if (!state.running || !state.musicEnabled || document.hidden || !state.musicTracks.length) return;
    state.musicTrackIndex = (state.musicTrackIndex + 1) % state.musicTracks.length;
    backgroundMusic.src = state.musicTracks[state.musicTrackIndex];
    syncMusic();
  });
  backgroundMusic.addEventListener("error", () => {
    musicStatus.textContent = "Music couldn't load. You can keep playing.";
  });
}
