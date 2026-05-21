# Zap It

Zap It is a small browser game where players race against a 60-second timer to tap the grid item that matches the target shape. Correct taps increase the score and streak. Wrong taps reset the streak and subtract 10 seconds. At the end of a run, players can save a public leaderboard score through a Supabase Edge Function.

The app is intentionally lightweight: plain HTML, CSS, and JavaScript for the game, plus Supabase files for the optional online leaderboard.

## Project Structure

```text
.
|-- index.html                         # Game markup and dialogs
|-- styles.css                         # Responsive layout, themes, animation, and visual states
|-- app.js                             # Game state, settings, scoring, rendering, and leaderboard calls
|-- app-config.js                      # Public leaderboard endpoint config
|-- assets/
|   |-- brand/logo.svg                 # App logo
|   `-- icons/favicon.svg              # Browser favicon
`-- supabase/
    |-- README.md                      # Supabase setup instructions
    |-- config.toml                    # Function config
    |-- migrations/                    # Database schema
    `-- functions/leaderboard/index.ts # Leaderboard Edge Function
```

## Running Locally

This app does not require a build step.

1. Start any simple static file server from the project root.

   ```sh
   python -m http.server 8000
   ```

2. Open `http://localhost:8000`.

Opening `index.html` directly may work for the basic game, but a local server is closer to deployment behavior and avoids browser restrictions around local files.

## Leaderboard Setup

The game works without Supabase, but saving scores and loading the global leaderboard require a deployed Supabase Edge Function.

Follow [supabase/README.md](supabase/README.md) to:

1. Link the project to Supabase.
2. Apply the leaderboard migration.
3. Set Supabase function secrets.
4. Deploy the `leaderboard` function.
5. Create `app-config.js` and set `leaderboardEndpoint` plus the public reCAPTCHA site key.

Do not put the Supabase service role key, anon key, or other secrets in frontend files. The browser should only know the public Edge Function URL in `app-config.js`.
Do not put the Google Cloud reCAPTCHA API key in frontend files. The browser should only know the public reCAPTCHA site key.

## Gameplay Rules

- A round shows one target and a 3 by 3 grid.
- Exactly one grid cell matches the target.
- A correct tap adds 1 point, increases the streak, plays the zap effect, and advances to the next round.
- A wrong tap resets the streak and subtracts 10 seconds.
- The game lasts up to 60 seconds.
- Zaps per second is calculated from score divided by elapsed play time.
- The leaderboard stores player name, score, zaps per second, elapsed seconds, and creation time.

## Development Guidelines

Keep changes small and aligned with the current static-app structure.

- Prefer editing the existing `index.html`, `styles.css`, and `app.js` files before introducing a framework or build system.
- Keep the game usable without Supabase. Missing leaderboard config should disable score saving gracefully, not block play.
- Preserve the privacy note and player-name validation when changing score submission.
- Keep leaderboard writes behind the Supabase Edge Function. The frontend must not call Supabase with privileged credentials.
- Keep reCAPTCHA verification in the Supabase Edge Function. The frontend should only request and send a reCAPTCHA token.
- Keep layout mobile-first. The main game surface is designed around a narrow, phone-friendly play area.
- Avoid UI text that explains implementation details. On-screen text should help players play the game.
- Maintain keyboard and screen-reader affordances already present in the markup, including buttons, labels, `aria-live` regions, dialogs, and focus behavior.
- If adding settings, store non-sensitive preferences in `localStorage` using namespaced keys.
- If changing themes or shape rendering, verify both normal color themes and one-color mode.
- If changing timing or scoring, update both frontend validation and Supabase validation ranges when needed.

## AI Contributor Guidelines

When an AI assistant works on this project, it should first read the files that define the behavior it is about to change:

- `index.html` for structure, dialogs, labels, and available DOM IDs.
- `app.js` for game state, scoring, preferences, rendering, and network calls.
- `styles.css` for layout, responsive behavior, themes, and animations.
- `supabase/README.md`, the migration, and the Edge Function before changing leaderboard behavior.

AI assistants should follow these rules:

- Do not invent a package manager, bundler, test framework, or app framework unless the requested feature truly needs one.
- Do not remove existing accessibility attributes while restructuring markup.
- Do not commit or expose Supabase service role keys, anon keys, or other local secrets. `app-config.js` may be committed only because it contains the public Edge Function URL.
- Do not change the leaderboard API contract casually. The frontend expects `{ scores: [...] }` from `GET` and `{ ok: true }` from successful `POST`.
- Keep validation duplicated intentionally where it protects the user experience: the browser gives quick feedback, and the Edge Function/database enforce server-side safety.
- After frontend changes, run the game in a browser-sized viewport and check start, correct tap, wrong tap, game over, settings, and leaderboard-empty states.
- After leaderboard changes, test both missing-config behavior and configured Edge Function behavior when possible.

## Manual Test Checklist

Use this quick pass before considering a change done:

- The page loads without console errors.
- The Start button begins a new 60-second game.
- The target item changes after a correct tap.
- A wrong tap subtracts 10 seconds and shows feedback.
- The score, streak, timer, and zaps per second update correctly.
- Settings open and close, including with Escape.
- Theme changes apply during a game without breaking the board.
- Dark mode and one-color mode still render readable shapes.
- Game over shows final score and speed.
- With no `leaderboardEndpoint`, the game still plays and explains that leaderboard setup is missing.
- With `leaderboardEndpoint`, the leaderboard loads and score submission validates player names.

## Deployment Notes

Because this is a static app, deploy the root files and `assets/` folder to any static host. Include `app-config.js` with the public Supabase Edge Function URL if the leaderboard should be active.

Supabase deployment is handled separately through the files in `supabase/`.
