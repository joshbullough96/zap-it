// Load reCAPTCHA Enterprise and obtain score verification tokens.
import { recaptchaAction, recaptchaSiteKey } from "./constants.js";
import { state } from "./state.js";

export async function getRecaptchaToken() {
  await loadRecaptchaScript();

  return new Promise((resolve, reject) => {
    window.grecaptcha.enterprise.ready(async () => {
      try {
        const token = await window.grecaptcha.enterprise.execute(recaptchaSiteKey, { action: recaptchaAction });

        if (!token) {
          reject(new Error("reCAPTCHA could not verify this save."));
          return;
        }

        resolve(token);
      } catch {
        reject(new Error("reCAPTCHA could not verify this save."));
      }
    });
  });
}

export function loadRecaptchaScript() {
  if (window.grecaptcha?.enterprise) {
    return Promise.resolve();
  }

  if (state.recaptchaScriptPromise) {
    return state.recaptchaScriptPromise;
  }

  state.recaptchaScriptPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");

    script.src = `https://www.google.com/recaptcha/enterprise.js?render=${encodeURIComponent(recaptchaSiteKey)}`;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("reCAPTCHA could not be loaded."));
    document.head.append(script);
  });

  return state.recaptchaScriptPromise;
}
