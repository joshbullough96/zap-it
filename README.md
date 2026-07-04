# Zap It

Zap It is a fast browser matching game. Players race against a 60-second timer to find the one grid item that matches the target shape and color. Correct zaps increase the score and streak; misses reset the streak and remove 10 seconds. At the end of a run, players can review their score, speed, misses, estimated placement, and the global Top 5.

The app is intentionally lightweight: plain HTML, CSS, and JavaScript for the game, plus a Supabase Edge Function and database migrations for the optional online leaderboard. It has no build step or frontend framework.

## Features

- Mobile-first 3 by 3 matching game with animated round transitions and lightning feedback.
- Five shapes: star, circle, square, triangle, and diamond.
- Live score, streak, timer, and zaps-per-second statistics.
- Normal, One color, Christmas, Fourth of July, Fall, and Summer themes.
- Custom color selection in One color mode.
- Light and dark modes for every theme.
- Theme, dark-mode, and custom-color preferences saved in `localStorage`.
- Touch, mouse, numpad, Space, and Escape controls.
- In-app instructions, settings, standalone leaderboard, and game-over dialogs.
- Public Top 5 leaderboard plus an "Around you" placement preview.
- Local mock leaderboard for development without a Supabase deployment.
- Client- and server-side player-name validation, profanity filtering, and reCAPTCHA Enterprise verification.
- Responsive layout and screen-reader-friendly labels, live regions, focus handling, and semantic controls.

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

When the app runs on `localhost`, `127.0.0.1`, or directly from a file, the included `app-config.js` enables a mock leaderboard with seed scores. This lets the Top 5, placement preview, score saving, and saved-rank state be tested without writing to Supabase. Mock saves exist only in memory and reset when the page reloads.

## How to Play

1. Press **Start** to begin a 60-second round.
2. Match the target item shown above the board.
3. Tap, click, or use the numpad to zap the one matching grid item.
4. Keep matching items until the timer reaches zero.
5. Review the final score, speed, misses, placement, and leaderboard.

### Controls

| Action | Control |
| --- | --- |
| Zap a grid cell | Tap or click the cell |
| Zap with the keyboard | Numpad `7-8-9` for the top row, `4-5-6` for the middle, and `1-2-3` for the bottom |
| Start or restart from the main game view | `Space`, Start, or Restart |
| Start from the results dialog | Play again |
| Close a dialog | `Escape` or its close button; utility dialogs also close from the backdrop |

Keyboard shortcuts do not activate while focus is in a text field or while a conflicting dialog is open.

## Gameplay Rules

- Each round shows one target and a 3 by 3 grid.
- Exactly one grid cell matches the target.
- In the multicolor themes, a match requires both the shape and color to match.
- In One color mode, only the shape distinguishes the target.
- A correct zap adds 1 point, increases the streak, plays the lightning effect, and flips to the next board.
- A miss resets the streak, adds to the miss count, and subtracts 10 seconds.
- A round ends when the timer reaches zero, including when a miss reduces the remaining time to zero.
- Zaps per second is the score divided by elapsed play time and is displayed to two decimal places.
- Pressing Restart or Space during a round starts a fresh run with score, streak, misses, and time reset.

## Themes and Preferences

The Settings dialog includes:

- **Normal:** blue, green, red, yellow, and orange shapes.
- **One color:** a user-selected color applied with light and dark gradients.
- **Christmas:** silver, red, and green.
- **Fourth of July:** the temporary default, with liberty red, star white, union blue, and sparkler gold.
- **Fall:** maple, marigold, cranberry, moss, and plum.
- **Summer:** sun, coral, aqua, lime, and sky.
- **Dark mode:** a dark surface palette available with every theme.

Theme changes apply immediately, including during an active round. The selected theme, dark-mode setting, and One color value are stored as non-sensitive preferences in `localStorage`.

## Leaderboard Setup

The game works without Supabase. Outside local mock mode, saving scores and loading the global leaderboard require a deployed Supabase Edge Function.

Follow [supabase/README.md](supabase/README.md) to:

1. Link the project to Supabase.
2. Apply the leaderboard migration.
3. Set Supabase function secrets.
4. Deploy the `leaderboard` function.
5. Set `leaderboardEndpoint` and the public reCAPTCHA site key in `app-config.js`.

Do not put the Supabase service role key, anon key, or other secrets in frontend files. The browser should only know the public Edge Function URL in `app-config.js`.
Do not put the Google Cloud reCAPTCHA API key in frontend files. The browser should only know the public reCAPTCHA site key.

## Leaderboard Behavior

- The trophy button opens the global Top 5 at any time.
- The game-over screen shows the Top 5 and an "Around you" preview for the current unsaved run.
- After a successful save, the placement refreshes using the exact stored score ID.
- Leaderboard entries include rank, nickname, score, and zaps per second.
- Rankings sort by score descending, then zaps per second descending. Stored-score ties are resolved by creation time and database ID.
- The database stores nickname, score, zaps per second, elapsed seconds, misses, and creation time.
- Nicknames must be 2 to 16 characters and may contain letters, numbers, spaces, hyphens, and underscores.
- The browser performs immediate nickname checks. The Edge Function repeats validation, checks profanity, verifies reCAPTCHA Enterprise, and validates score ranges before writing.
- The public score form warns players not to enter identifying information.

### Frontend Configuration

`app-config.js` contains public browser configuration:

```js
window.ZAP_IT_CONFIG = {
  leaderboardEndpoint: "https://YOUR_PROJECT_REF.supabase.co/functions/v1/leaderboard",
  recaptchaSiteKey: "YOUR_RECAPTCHA_SITE_KEY",
};
```

The repository's current configuration also enables seeded mock data on `localhost`, `127.0.0.1`, and `file://` pages. Do not place service credentials or the reCAPTCHA API key in this file.

## Leaderboard API

The frontend expects the Edge Function to support:

- `GET /leaderboard` returning `{ scores: [...] }`.
- `GET /leaderboard` with run query parameters returning `{ scores: [...], context: {...} }`.
- `POST /leaderboard` accepting the run data and reCAPTCHA token, then returning `{ ok: true, scoreId }`.

Placement and ranking use this order:

1. Higher score.
2. Higher zaps per second.
3. Earlier creation time for stored scores.
4. Lower database ID when all other stored values tie.

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
- Store only non-sensitive preferences in `localStorage` using namespaced keys.
- If changing themes or shape rendering, verify all five themes in light and dark mode.
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
- Do not change the leaderboard API contract casually. The frontend expects `{ scores: [...] }` from `GET`, optional `context` data when placement query params are present, and `{ ok: true, scoreId }` from successful `POST`.
- Keep validation duplicated intentionally where it protects the user experience: the browser gives quick feedback, and the Edge Function/database enforce server-side safety.
- After frontend changes, run the game in phone and desktop-sized viewports and check start, correct zap, miss, restart, game over, instructions, settings, and leaderboard states.
- After leaderboard changes, test mock mode, missing-config behavior, and the configured Edge Function when possible.

## Manual Test Checklist

Use this quick pass before considering a change done:

- The page loads without console errors.
- The Start button begins a new 60-second game.
- The target item changes after a correct tap.
- A wrong tap subtracts 10 seconds and shows feedback.
- The score, streak, timer, and zaps per second update correctly.
- Numpad controls map to the matching grid positions.
- Space starts or restarts from the main game view without triggering while typing or while a dialog is open.
- Instructions, settings, leaderboard, and results dialogs close with Escape and return focus appropriately.
- Settings open and close, including with Escape.
- All themes apply during a game without breaking the board.
- Theme, dark-mode, and One color preferences survive a reload.
- Every theme remains readable in light and dark mode.
- Game over shows final score, speed, misses, placement preview, and Top 5.
- Nickname validation rejects too-short, too-long, unsupported, and blocked values.
- Local mock score saving updates placement without sending a network write.
- With no `leaderboardEndpoint`, the game still plays and explains that leaderboard setup is missing.
- With `leaderboardEndpoint` and reCAPTCHA configured, the leaderboard loads and valid scores can be saved.
- At widths below 24rem, leaderboard rate details hide and the score form stacks.

## Deployment Notes

Because this is a static app, deploy `index.html`, `styles.css`, `app.js`, `app-config.js`, and the `assets/` folder to any static host. Configure the public Edge Function URL and reCAPTCHA site key in `app-config.js` if the online leaderboard should be active.

Supabase deployment is handled separately through the files in `supabase/`.
