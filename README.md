# SpacePick

Swipe-based interior redesigns — Tinder for rooms.

Upload a photo of your space, describe the glow-up in plain language, then swipe **right** to keep a look as the new baseline (and refine it) or **left** to discard it and generate a different take from the same room + brief. Save the ones you’d actually live in.

## Run

```bash
npm install
npm run dev
```

Open the URL Vite prints (default [http://localhost:5173](http://localhost:5173)).

Build / preview:

```bash
npm run build
npm run preview
```

## Demo mode vs live generation

| Mode | When | What you get |
| --- | --- | --- |
| **Demo** | No `OPENAI_API_KEY` (default) | Fully offline. SpacePick composites plausible redesigns from your photo with canvas color washes, flooring overlays, lighting, grain, and furniture hints parsed from the brief. The swipe loop is complete. Labeled **Demo** in the header and on each card. |
| **Live** | `OPENAI_API_KEY` is set | Photoreal image-to-image edits via the OpenAI Images **edits** endpoint (`gpt-image-1` by default). Labeled **Live**. If the API call fails, the app falls back to a demo preview and toasts the reason. |

Demo mode is the supported zero-config path: clone, install, run, upload (or tap **Try a sample room**), type a brief, swipe, save.

## Environment

Copy `.env.example` to `.env` in the project root:

```bash
cp .env.example .env
```

| Variable | Required | Description |
| --- | --- | --- |
| `OPENAI_API_KEY` | No | Enables live image edits. Leave empty for demo mode. The key stays on the Vite dev/preview server and is **not** exposed to the browser. |
| `OPENAI_IMAGE_MODEL` | No | Defaults to `gpt-image-1`. |
| `OPENAI_IMAGE_QUALITY` | No | Defaults to `medium` (`low` / `medium` / `high`). |

Restart `npm run dev` after changing env vars.

GPT Image models may require [OpenAI organization verification](https://platform.openai.com/). Without a key, you do not need an OpenAI account.

## How the swipe loop works

1. **Upload** a room photo (or camera, or the built-in sample).
2. **Brief** — e.g. “change the flooring, paint the walls orange, and change my furniture.”
3. SpacePick generates a redesigned version of *that* photo.
4. **Swipe right / heart** — that look becomes the new baseline; the next generation refines further in the same direction. You can still edit the brief.
5. **Swipe left / X** — discard the look; next generation is an alternate take from the *same* baseline (same room photo + same brief).
6. **Save** downloads the current liked design as a JPEG and stores it in the in-app gallery (also persisted in `localStorage` when quota allows).
7. **Before** thumbnail — tap to toggle the original photo on the card.

Keyboard: `←` pass, `→` like, `S` save.

## Project structure

```
src/
  components/     Upload, prompt, swipe deck, gallery, paywall stub
  hooks/          Session state + pointer swipe gestures
  lib/            Demo compositor, prompt parser, OpenAI client, persistence
vite-plugin-redesign.ts   /api/mode and /api/redesign (live edits)
```

Session state lives in memory (current baseline, prompt, swipe history, current card). Prompt, credit stub, and saved gallery are also written to `localStorage` under `spacepick:v1`.

## Monetization hooks (not billed in v1)

These are structure only — no payments or ads:

- Remaining-credits pill in the header (decrements per look, **never blocks** generation).
- Paywall sheet copy for Free / Pro / credit packs.
- Optional demo watermark on canvas exports (`SpacePick · demo`).
- Disabled **Shop this look** CTA on saved designs (affiliate extension point).
- Pro-flavored rewind is described in the paywall sheet, not implemented.

## Stack

Vite + React 19 + TypeScript. Client-first; the only server code is the optional OpenAI proxy used in `vite dev` / `vite preview`.
