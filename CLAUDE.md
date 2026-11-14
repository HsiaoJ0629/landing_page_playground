# Website Landing Page Playground

## Goal
This project is a **playground for designing and building website home pages**. Each experiment is a self-contained home page variant (a hero, sections, CTAs, imagery and a theme toggle). The aim is to try layouts, visual styles and content structures quickly, compare them side by side, and keep the best patterns as reusable building blocks.

It is not a production site. Optimise for **fast iteration, clear comparison and reusable foundations**, not for backend features, CMS or deployment.

## Stack
- Plain **HTML + CSS + vanilla JS**. No framework, no build step, no package manager unless a variant explicitly needs one (say so in its `notes.md`).
- Every page must work when opened directly in a browser (`file://`) or via a simple static server, e.g. `npx serve .`.
- External resources are limited to Google Fonts and pinned-version CDN scripts. Everything else is local.
- ES modules and importmaps must be inline in the page: Chrome blocks external module files on `file://` (see variant 09).

## Structure
```
CLAUDE.md
README.md                   # Human-facing overview, with a Variants table (one row per variant)
.claude/
  agents/                   # ux-architect, ui-designer, image-prompt-engineer
  skills/create_home_page/  # The step-by-step procedure for a new variant
index.html                  # Gallery: links to every variant with a one-line description, grouped by industry
shared/
  css/design-system.css     # Tokens: colour, type, spacing, radius, shadow, motion. The single source of truth
  css/base.css              # Reset, body theming, typography defaults, .container
  css/components.css        # Reusable pieces promoted from variants (buttons, cards, nav, theme toggle)
  js/theme-manager.js       # Light / dark / system theme switching
variants/
  NN-short-slug/            # e.g. 01-minimal-saas, 02-editorial-photo
    index.html
    styles.css              # Variant-specific styles only; reuse shared tokens
    notes.md                # Brief, what is being tested, agents used, verdict
assets/
  images/
    README.md               # Index: which image folder belongs to which variant
    NN-short-slug/          # One folder per variant that has generated art, named like the variant
      prompts.md            # That variant's image prompts (image-prompt-engineer), keyed by filename
      <file>.jpg|png        # The generated images
    ronin-grid/             # Art shared by several variants of one brand (here 01–03), with its own prompts.md
docs/
  comfyui-mcp.md            # Optional setup: local ComfyUI image generation via MCP
```
Create folders and files as they are first needed. When you add a variant, also add it to the root `index.html` gallery, inside its industry group, and to the Variants table in `README.md`.

## Conventions
- **Tokens**: use the semantic names in `shared/css/design-system.css` (`--bg-primary`, `--bg-secondary`, `--text-primary`, `--text-secondary`, `--border-color`, `--primary-color`, `--secondary-color`, `--accent-color`, `--text-xs…--text-3xl`, `--space-1…--space-16`, `--container-sm…xl`). A variant may override token values for its own look but must not invent parallel naming schemes.
- **Theme**: every variant has a light / dark / system toggle. Use `[data-theme="dark"]` plus `@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) … }` with the same values in both blocks, and wrap all `localStorage` access in try/catch. `?theme=light|dark` in the URL forces a theme for one load without saving it; use it for screenshots.
- **Back to gallery**: every variant ends `<body>` with the shared `<a class="back-pill" href="../../index.html">…Gallery</a>` (styles in `components.css`, hidden inside the gallery previews by `theme-manager.js`). A variant that skips the shared CSS/JS must inline both, as 04 does.
- **Gallery**: the root `index.html` uses the shared tokens, `theme-manager.js` and the shared light / dark / system toggle like any variant. Each card shows a live, scaled-down `iframe` preview of its variant.
- **Gallery groups**: the gallery lists variants by **industry** (the fictional brand's sector, e.g. Cybersecurity, Beauty & wellness, Consumer tech), one `<section class="gallery-group" id="…">` per industry holding a `.gallery-grid` of cards. A new variant's card goes in the matching group; if none fits, copy a whole group section and give it a new `id`, `h2` and one-line brand description. The filter chips, counts and `#id` deep links are built by script from the sections, so there is nothing else to update. Group order is editorial, not numeric: the group holding the current top pick comes first. Variant folders stay flat and numbered (`variants/NN-slug/`); don't nest them by industry. Record the industry in the variant's `notes.md` brief.
- **Responsive**: mobile-first. Breakpoints are 640 / 768 / 1024 / 1280. A 16px side gutter on mobile and no horizontal scroll at 320px.
- **Accessibility**: WCAG AA contrast, semantic landmarks (`header`, `nav`, `main`, `footer`), one `h1`, visible focus states, 44px touch targets, and `prefers-reduced-motion` respected.
- **Content**: use placeholder brands and copy (fictional company names). Never imitate a real company's branding.
- **Promote, don't copy**: when a pattern is used in two or more variants, move it into `shared/css/components.css`.

## Agents and workflow
For a new variant, run the `create_home_page` skill (`.claude/skills/create_home_page/SKILL.md`). It is the procedure, with the page shell, gallery card, check command and `notes.md` template; this section is the summary and the rules. If the two disagree, fix the skill.

The project agents live in `.claude/agents/`. Each one reads this file and the variant's `notes.md`, and returns a spec; the main session builds the page. A typical new variant goes like this:

1. **Brief**: agree the idea with the user (audience, mood, what's being tested) and write it to `variants/NN-slug/notes.md`.
2. **`ux-architect`**: page structure, section order, information architecture, layout grid, interaction patterns. It also owns and maintains the `shared/` foundation.
3. **`ui-designer`**: visual direction for the variant (palette, typography, component styling, states), expressed as values for the shared tokens plus variant styles.
4. **`image-prompt-engineer`**: prompts for the hero and section imagery, saved to `assets/images/NN-slug/prompts.md` (the variant's own image folder; create it and add a line to `assets/images/README.md`). Art reused across variants of one brand goes in a brand folder instead (e.g. `assets/images/ronin-grid/`). It runs after `ux-architect` and `ui-designer`, since it needs the art slots and the palette. Until a generated image exists, the hero shows its code-drawn SVG (see below); other art slots show the shared "Art pending" placeholder at the right aspect ratio.
   - **Local generation via ComfyUI (optional).** If the `comfyui-image` skill or ComfyUI MCP tools are available in the session (see `docs/comfyui-mcp.md`), offer to generate the art locally instead of handing the user a prompt, and use the skill for the generation step when it exists. Ask before queuing a job. Use the Flux/SDXL prompt and negative prompt from `prompts.md`, set the width and height from the entry, and save the output to the variant's image folder (`assets/images/NN-slug/`) under the exact filename the variant expects. Show the user the result and let them judge the framing before you call the art done. If the tools aren't connected, don't try to install or configure them; follow the manual workflow below.
   - **Check ComfyUI is installed before using it.** When the user asks for ComfyUI generation, first confirm a ComfyUI MCP server is connected: look for its tools in the session (e.g. `mcp__comfy-mcp__*` or `mcp__comfyui__*`; deferred tools count, load them with ToolSearch), or run `claude mcp list`. Then call its server-info/status tool to confirm ComfyUI itself is running. If no server is connected, tell the user, point them to `docs/comfyui-mcp.md`, and fall back to the manual workflow.
   - **Art is per brief, not a default.** Only plan art slots, placeholders and prompts when the user's brief for the variant calls for imagery. A variant with hero art gets an SVG hero by default (see below); a type-led or CSS-graphic variant has no art. Ask when the brief doesn't say.
   - **SVG hero art is the default.** When a variant's hero has art, the main session draws it as an SVG by default instead of leaving the "Art pending" placeholder. Save it as an `.svg` beside the expected generated file and wire it as a stand-in, not a replacement: keep the real file (`.png`/`.jpg`) as `src` and add `data-fallback-src="….svg"` plus `data-fallback-alt="…"`, so a generated image still takes over when it arrives (01–03, 06–08 and 11 work this way). Section art beyond the hero keeps the placeholder unless the user asks for code-drawn art.
   - **Each variant that expects generated art gets a `## Suggested Gemini prompt` section in its `notes.md`.** It lists the target path (in `assets/images/NN-slug/`), aspect ratio and pixel size, and the layout slot. It also includes one ready-to-paste natural-language prompt written for Gemini (state the aspect ratio and the exclusions in the text, since there is no negative prompt), plus short follow-up replies for common drift (unwanted floor, wrong ratio, cropping). Base it on the variant's entry in `prompts.md`.
5. **Build**: the main session implements the HTML/CSS/JS from those outputs, adds the variant to the gallery, then checks it at mobile and desktop widths in both themes.
6. **Review**: ask the user for a verdict and record it in `notes.md` (what worked, what didn't), and promote reusable pieces into `shared/`.

Skip steps that aren't needed. A quick layout tweak doesn't need all three agents.

## Out of scope
Backends, auth, forms that submit anywhere, analytics, CMS and deployment pipelines, unless the user asks.
