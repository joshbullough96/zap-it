# Supabase leaderboard setup

This project keeps Supabase secrets out of the browser. The frontend calls a public Edge Function URL, and the Edge Function reads Supabase credentials from Supabase function secrets.

## 1. Link this folder to your Supabase project

Install the Supabase CLI if needed, then run:

```sh
supabase login
supabase link --project-ref YOUR_PROJECT_REF
```

You can find `YOUR_PROJECT_REF` in the Supabase dashboard URL or under Project Settings.

## 2. Create the table

Run `supabase/migrations/20260517000000_create_leaderboard_scores.sql` in the Supabase SQL editor, or apply it with the Supabase CLI.

## 3. Add function secrets

Set these Zap-specific secrets for the Edge Function:

```sh
supabase secrets set ZAP_SUPABASE_URL="https://YOUR_PROJECT_REF.supabase.co"
supabase secrets set ZAP_SUPABASE_SERVICE_ROLE_KEY="YOUR_SERVICE_ROLE_KEY"
supabase secrets set ZAP_RECAPTCHA_PROJECT_ID="YOUR_GOOGLE_CLOUD_PROJECT_ID"
supabase secrets set ZAP_RECAPTCHA_SITE_KEY="YOUR_RECAPTCHA_SITE_KEY"
supabase secrets set ZAP_RECAPTCHA_API_KEY="YOUR_RECAPTCHA_API_KEY"
```

Do not put the service role key in frontend files.

The reCAPTCHA site key is public and must also be set in `app-config.js`. Keep the Google Cloud API key in Supabase function secrets only. Score-based reCAPTCHA rejects saves below `0.5` by default; to change that threshold, set `ZAP_RECAPTCHA_MIN_SCORE` to a value between `0` and `1`.

## 4. Deploy the function

```sh
supabase functions deploy leaderboard
```

The included `supabase/config.toml` sets `verify_jwt = false` for this function so the static browser game can call it without exposing a Supabase anon key.

If score saving fails with an authorization message such as `Missing authorization header`, redeploy with JWT verification explicitly disabled:

```sh
supabase functions deploy leaderboard --no-verify-jwt
```

If score saving fails with `Leaderboard service is not configured`, re-check the `ZAP_SUPABASE_URL` and `ZAP_SUPABASE_SERVICE_ROLE_KEY` function secrets.

## 5. Configure the game

Set the deployed function URL in `app-config.js`. If that file is missing, create it in the project root:

```js
window.ZAP_IT_CONFIG = {
  leaderboardEndpoint: "https://YOUR_PROJECT_REF.supabase.co/functions/v1/leaderboard",
  recaptchaSiteKey: "YOUR_RECAPTCHA_SITE_KEY",
};
```

`app-config.js` contains only public values, so it can be committed for static hosting.
