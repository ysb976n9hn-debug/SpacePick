# SpacePick

Swipe-based interior redesigns — Tinder for rooms.

Upload a photo of your space, describe the glow-up in plain language, then swipe **right** to keep a look as the new baseline (and refine it) or **left** to discard it and generate a different take from the same room + brief. Save the ones you’d actually live in.

**Real redesigns use OpenAI Images edits** (photoreal paint, flooring, and furniture on *that* photo). Without an API key, the app still lets you swipe a **labeled DEMO — not real AI** preview so the loop works; it will never pretend a canvas filter is a live generation.

## Open on iPhone

Use the deployed HTTPS preview (not localhost):

1. Open the public URL from the pull request description on Safari.
2. Tap **Try a sample room** (or upload a photo).
3. Pick a brief such as “Paint the walls orange, swap the flooring, and change the furniture.”
4. Swipe left/right, toggle **Before**, tap **Save**.

If the header says **Demo**, you are seeing a labeled fallback — not photoreal AI. Add `OPENAI_API_KEY` on the host (or locally) and redeploy / restart for **Live AI**.

## Run locally

```bash
npm install
cp .env.example .env
# paste OPENAI_API_KEY=sk-... into .env for Live AI
npm run dev
```

Open the URL Vite prints (default [http://localhost:5173](http://localhost:5173)). Restart `npm run dev` after changing `.env`.

```bash
npm run build
npm run preview
```

## Live AI vs labeled demo

| Mode | When | What you get |
| --- | --- | --- |
| **Live AI** | `OPENAI_API_KEY` is set on the Vite server or host | Photoreal image-to-image edits via OpenAI Images **edits** (`gpt-image-2` by default, then `gpt-image-1.5` / `gpt-image-1`). Same camera/layout; brief applied as a renovation. Card badge: **Live AI**. |
| **Demo** | No key, or live call failed | Stronger canvas color/material preview with a large **DEMO — not real AI** stamp on the image and a **DEMO** pill on the card. If live failed, a toast explains why. Never unlabeled. |

GPT Image models may require [OpenAI organization verification](https://platform.openai.com/settings/organization/general) and billing.

## Environment

Copy `.env.example` to `.env` in the project root.

| Variable | Required | Description |
| --- | --- | --- |
| `OPENAI_API_KEY` | For Live AI | Server-side only — not exposed to the browser. |
| `OPENAI_IMAGE_MODEL` | No | Default `gpt-image-2`. |
| `OPENAI_IMAGE_QUALITY` | No | Default `high` (`low` / `medium` / `high`). Use `medium` to spend less. |

### Vercel

1. Import the GitHub repo at [vercel.com/new/import](https://vercel.com/new/import).
2. Project → **Settings → Environment Variables** → add `OPENAI_API_KEY` for Production and Preview.
3. Redeploy. `/api/mode` and `/api/redesign` are serverless routes (`maxDuration` 60s). Hobby timeouts can fail slow image edits — then the app shows a **labeled DEMO** plus the error toast.

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
