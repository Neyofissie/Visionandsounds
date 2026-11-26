# Vision & Sounds — Prompt Builder

A zero-dependency, model-aware prompt builder for every discipline the studio works in.
Open `index.html` in a browser (works from disk or any static host — no build step).

## Disciplines & targets

| Group | Discipline | Targets |
|---|---|---|
| Visual | Design | Design brief (LLM), UI generator (v0 / Figma Make), Midjourney, GPT Image, Ideogram, Gemini Image, Flux |
| Visual | Photography | All image models + Shoot brief (LLM) |
| Visual | Image Generation | Midjourney, GPT Image, Gemini Image, Flux, Stable Diffusion, Ideogram, any model |
| Motion | Video Generation | Veo 3, Sora 2, Kling, Seedance 2.0, Runway, Luma, Higgsfield, any model |
| Motion | 3D Animation | Video models, Animator brief (LLM), Blender Python (LLM) |
| Motion | Renders | Image models + Render setup (LLM) |
| Story & Screen | Film | Claude, ChatGPT, Gemini, any LLM |
| Story & Screen | Scripts | LLMs |
| Sound | Music | Suno, Udio, ElevenLabs Music, Songwriter (LLM) |
| Words & Growth | Copywriting · Ads · SEO | LLMs |
| Build | Code | Claude Code, Cursor, Codex, Claude, ChatGPT, Gemini |
| Build | MCPs | Build a server spec · Agent workflow · `.mcp.json` config |
| Build | Anything else | Universal role / task / context / format |

## How the output adapts

- **Midjourney**: comma prompt + `--ar`, `--stylize`, `--chaos`, `--no`, `--seed`, `--v 7`
- **Stable Diffusion**: tag prompt + a separate negative prompt + SDXL resolution
- **Natural-language image models**: labelled sentences, exact quoted text, inline "Avoid"
- **Video models**: camera / lighting / pacing lines, a timed multi-shot timeline, audio and format
- **LLMs / agents**: Role → Task → Context → Requirements → Output → Process, rendered as
  Markdown, XML tags (default for Claude) or plain text, plus optional enhancers

## Features

Surprise me (random fill) · ↻ Idea buttons · custom chips · prompt-strength meter ·
copy / download `.txt` · shareable links (state encoded in the URL) · saved library
(browser localStorage) · `/` to search · `Ctrl/⌘ + Enter` to copy.

## Adding a discipline

Add an object to `domains.js` with `id`, `name`, `group`, `glyph`, `tagline`, `targets`,
`fields` and a `compose(values, { target, opts })` function returning
`{ prompt, negative?, extra?: [{ label, text }], notes?: [] }`. Use the shared helpers
`brief()`, `visual()` and `video()` for the common formats.
