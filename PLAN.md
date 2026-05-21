# Deploy the admin dashboard to Cloudflare Pages

## Status

- [x] Admin allowlist gate added to login (`web/src/pages/Login.tsx`)
  - Allowlist: `dr.sb1@me.com`
- [x] Production build produced (`web/dist/`)
- [ ] User drag-drops `web/dist` to Cloudflare Pages → live URL
- [ ] (Future) Replace service-key login with Supabase Auth magic links + edge function for writes

## How sign-in works today (easiest deploy)

1. Visit the URL → enter your allowlisted email (`dr.sb1@me.com`) → Continue.
2. Paste your Supabase `service_role` key (stays in your browser only).
3. You're in — edit brands, rewards, raffles, cities, config.
4. Changes are live in iOS + Expo apps within seconds.

## Drag-and-drop deploy steps

1. Open <https://pages.cloudflare.com> and sign in.
2. Click **Create application → Pages → Upload assets**.
3. Project name: `stride-admin` (gives you `https://stride-admin.pages.dev`).
4. Drag the `web/dist` folder onto the upload box → **Deploy site**.
5. Done — share the `.pages.dev` URL with co-founders. Add a custom domain later via Cloudflare Pages → Custom domains.

## Adding more admins later

Edit `ADMIN_EMAILS` in `web/src/pages/Login.tsx`, rebuild (`bun run build` in `web/`), and re-upload `dist` to Cloudflare.

## Next upgrade (when you want it)

Swap the service-key flow for Supabase Auth magic links + an admin-only edge function so the powerful key never touches the browser. The allowlist already lives in code — that file becomes the source of truth for the server check too.
