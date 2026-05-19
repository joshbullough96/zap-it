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
```

Do not put the service role key in frontend files.

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
};
```

`app-config.js` is ignored by Git so local endpoint values stay out of source control.
