# SpacePick

Swipe-based interior redesigns — Tinder for rooms.

**Real product = Live AI** (OpenAI Images **edits** of *your* photo). Without a key, SpacePick only runs a labeled **DEMO MOCKUP — not real AI**. That mockup is not the product.

## Turn on Live AI

```bash
npm install
cp .env.example .env
# paste OPENAI_API_KEY=sk-... into .env (no quotes)
npm run dev
```

Open the URL Vite prints (default [http://localhost:5173](http://localhost:5173)).

**Confirm it worked:** the header pill must say **Live AI**, not DEMO. If it still says DEMO, the server did not load the key — save `.env` in the project root and restart `npm run dev`.

Then: **Try a sample room** → “Paint the walls orange…” → **Generate live looks**. You should get a photoreal edit of that photo (orange paint on the walls), not a tint.

Optional check from the terminal:

```bash
OPENAI_API_KEY=sk-... npm run verify:live
```

GPT Image models may require [organization verification](https://platform.openai.com/settings/organization/general) and billing.

## Open on iPhone

Use a deployed HTTPS preview (not localhost). The pull request description has the current public URL.

1. Open that URL in Safari.
2. Tap **Try a sample room**.
3. Pick a brief such as “Paint the walls orange, swap the flooring, and change the furniture.”
4. If the header says **Live AI**, tap **Generate live looks**. If it says **DEMO · get Live AI**, you are in the labeled mockup — add `OPENAI_API_KEY` on the host and redeploy.

## Live AI vs labeled demo

| Mode | When | What you get |
| --- | --- | --- |
| **Live AI** | `OPENAI_API_KEY` is set on the Vite server or host | Photoreal image-to-image edits via OpenAI Images **edits**. Default model `gpt-image-1.5`, then `gpt-image-1` / `gpt-image-2`. High input fidelity, JPEG output. Same camera/layout; brief applied as a renovation. Card badge: **Live AI**. Failed live calls show the error — they do not silently swap in a filter. |
| **Demo** | No key | Canvas mockup with a top bar **DEMO MOCKUP — not real AI**, plus DEMO banners. Never unlabeled. |

## Environment

Copy `.env.example` to `.env` in the project root.

| Variable | Required | Description |
| --- | --- | --- |
| `OPENAI_API_KEY` | For Live AI | Server-side only — not exposed to the browser. |
| `OPENAI_IMAGE_MODEL` | No | Default `gpt-image-1.5`. |
| `OPENAI_IMAGE_QUALITY` | No | Default `high` (`low` / `medium` / `high`). Use `medium` to spend less. |

Restart `npm run dev` after changing `.env`.

### Vercel

1. Import the GitHub repo at [vercel.com/new/import](https://vercel.com/new/import).
2. Project → **Settings → Environment Variables** → add `OPENAI_API_KEY` for Production and Preview.
3. Redeploy. `/api/mode` and `/api/redesign` are serverless routes (`maxDuration` 60s). Hobby timeouts can fail slow image edits — then the app shows the error and a **Use labeled DEMO instead** button.

### Netlify

Add `OPENAI_API_KEY` under Site configuration → Environment variables and redeploy. Live edits need a server route; prefer Vercel or `npm run preview` for the API proxy.

## Swipe loop

1. Upload a room photo (or camera, or the sample).
2. Brief — e.g. “change the flooring, paint the walls orange, and change my furniture.”
3. Generate a redesigned version of *that* photo.
4. **Right / heart** — keep as baseline and refine.
5. **Left / X** — discard; alternate take from the same baseline.
6. **Save** downloads JPEG and stores it in the gallery.
7. **Before** toggles the original photo.

Keyboard: `←` pass, `→` like, `S` save.

## Stack

Vite + React 19 + TypeScript. OpenAI proxy: Vite middleware in dev/preview, Vercel `/api` in production.
