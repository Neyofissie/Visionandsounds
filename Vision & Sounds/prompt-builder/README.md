# Vision & Sounds — Prompt Builder

A zero-dependency, model-aware prompt builder for every discipline the studio works in, plus an
Agent mode that finishes whole projects from chat. Open `index.html` (Builder) or `agent.html`
(Agent) in a browser — works from disk or any static host, no build step.

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

## Agent mode (`agent.html`)

Describe a project in chat and a Claude-powered production agent takes it from brief to finished
deliverables:

1. It asks up to 3 questions only if something essential is missing, then states its assumptions.
2. It builds a **plan** (3–10 tasks across the disciplines above) shown on the project board.
3. It works task by task. Writing work (strategy, scripts, copy, ads, SEO, code, MCP specs) is
   written in full. AI-generation work (image, video, music, 3D, renders) runs through this
   Prompt Builder's engine as a tool, and comes back as model-ready prompts with an
   **Open in Builder** link.
4. Ask for changes in chat; revised deliverables are saved as new versions.

Projects, chat history and deliverables are saved in the browser (localStorage). Export a
project as one Markdown file, or copy/download single deliverables.

**Setup:** open Settings and paste an Anthropic API key (from the Claude Console). Usage is
billed to that key's account. The key is kept in the browser session (or on the device if you
tick "Remember") and is sent only to Anthropic. For a public deployment, don't ship a key:
run a small proxy that adds the key server-side and enter its URL as the Proxy URL.

**Under the hood:** the official Anthropic TypeScript SDK (`@anthropic-ai/sdk@1.8.0`, loaded
from jsDelivr), Claude Opus 5.5 by default (Sonnet 5.5 selectable), adaptive thinking, streaming
with a client-side tool loop (`create_plan`, `update_task`, `build_prompt`, `save_deliverable`),
prompt caching, server-side refusal fallbacks, and optional web search.

## Adding a discipline

Add an object to `domains.js` with `id`, `name`, `group`, `glyph`, `tagline`, `targets`,
`fields` and a `compose(values, { target, opts })` function returning
`{ prompt, negative?, extra?: [{ label, text }], notes?: [] }`. Use the shared helpers
`brief()`, `visual()` and `video()` for the common formats.
