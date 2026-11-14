---
name: create_home_page
description: Standard process for creating a new home page variant in this playground, from brief to gallery card. Use when the user asks to create, add, build or start a new home page / variant / page design (e.g. "make a new variant", "try a home page for X", "/create_home_page minimal fintech").
---

# Create a home page variant

Follow these steps in order. Skip a step only when the step itself says it's optional, or the user says so. `CLAUDE.md` holds the conventions; this skill is the procedure.

## 1. Brief

Collect the brief before writing any code. Use what the user already said (including any args passed to this skill) and ask only for what's missing, in one `AskUserQuestion` call:

- **Brand & audience:** fictional brand name (reuse Ronin Grid for like-for-like comparisons, or a new fictional one), who the page is for.
- **Industry:** the sector the brand is in. It decides the variant's group in the gallery. Reuse an existing group (see the `.gallery-group` sections in the root `index.html`) when one fits; a reused brand keeps its group.
- **Mood / direction:** a few words or a reference (style only; never imitate a real company's branding).
- **What's being tested:** the 1–3 layout or style ideas this variant exists to try.
- **Default theme:** light, dark or system.
- **Imagery:** does this variant need art? Options: *hero art* (a code-drawn SVG by default, which a generated image replaces when the user supplies one), *no imagery* (type-led / CSS graphics). Section art beyond the hero shows the placeholder until a generated file exists, unless the user asks for code-drawn art. Art is per brief.

## 2. Set up the folder

1. Next number: list `variants/` and take the highest `NN` + 1 (two digits).
2. Slug: short kebab-case from the direction, e.g. `06-quiet-ledger`.
3. Write `variants/NN-slug/notes.md` from the template at the end of this skill, filling in **Brief**. Leave the other sections as headings for now.

## 3. Design (agents, as needed)

Each agent starts with no context, so give it the path to `notes.md`, the variant folder, and the output of any agent it depends on. They return specs; the main session writes the page.

Order: `ux-architect` and `ui-designer` can run in parallel from the brief. `image-prompt-engineer` runs after both, because it needs the art slots from one and the palette from the other.

- **`ux-architect`**: section order, layout grid, interaction patterns, art slots. Skip if the structure deliberately mirrors an existing variant (say which in `notes.md`).
- **`ui-designer`**: palette, type, component styling and states, as values for the shared tokens plus variant CSS, with a contrast table. Skip for a pure layout tweak.
- **`image-prompt-engineer`**: only if the brief has art (including an SVG hero, so the generated upgrade path exists). It writes `assets/images/NN-slug/prompts.md` (the variant's own image folder, also listed in `assets/images/README.md`), keyed by filename, and returns the Gemini prompt block for `notes.md`.
- **No agents:** fine for a small or code-led variant. Then the main session does the design itself, and still checks contrast with a script.

**Generating the art (optional, after the prompts exist):** ask the user whether to generate it now with the `comfyui-image` skill (local ComfyUI) or keep the SVG hero / placeholder for them to replace with the Gemini prompt. If generating: use the Flux/SDXL prompt and negative prompt from `prompts.md`, the entry's width and height, and save to `assets/images/NN-slug/` under the exact filename. Show the user the result and let them judge the framing.

## 4. Build

Files: `variants/NN-slug/index.html` and `styles.css`.

- Copy the page shell from an existing variant (e.g. `variants/02-ronin-nightgrid/index.html`) rather than writing it from memory: skip link, `site-header` with nav toggle and theme toggle, `<main id="main">`, `site-footer`, and the back-to-gallery link as the last element before `</body>`:
  `<a class="back-pill" href="../../index.html"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 18l-6-6 6-6"/></svg>Gallery</a>`
  Styled by `.back-pill` in `components.css` and hidden in gallery previews by `theme-manager.js`. If the variant has its own fixed bottom bar, check the pill doesn't cover it.
- `<head>` loads, in order: Google Fonts (if any), `../../shared/css/design-system.css`, `base.css`, `components.css`, then `styles.css`, then `../../shared/js/theme-manager.js` **without** `defer`.
- Set `data-default-theme` on `<html>` if the default isn't system.
- ES modules (`<script type="module">`, importmaps) must be inline in `index.html`: Chrome blocks external module files on `file://`. CDN scripts are pinned to an exact version.
- `styles.css` only overrides shared token **values** and adds variant-specific rules. No new token naming schemes.
- Dark mode: `[data-theme="dark"]` plus `@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) … }`.
- **Hero art (default: SVG):** draw the hero as an SVG, save it as `assets/images/NN-slug/<file>.svg` beside the expected generated file, and wire it as a stand-in: `<img src="../../assets/images/NN-slug/<file>.png" data-fallback data-fallback-src="../../assets/images/NN-slug/<file>.svg" data-fallback-alt="…" alt="…" width height>` (see 02 or 11). The generated image takes over when it arrives.
- **Other generated imagery:** use `<figure class="art-frame"><img src="../../assets/images/NN-slug/<file>" data-fallback alt="…" width height></figure>` so the shared "Art pending" placeholder shows until the file exists.
- Fictional brand and placeholder copy only. Forms don't submit anywhere.

## 5. Gallery

Add a card to the root `index.html`, as the last card in the `.gallery-grid` of the variant's industry group (`<section class="gallery-group" id="…">`):

Copy the last card in `index.html` (the one for the previous variant) and change the number, path, title, text and swatches. Its shape:

```html
<article class="card variant-card">
  <div class="variant-card__preview" aria-hidden="true"><iframe src="variants/NN-slug/index.html" loading="lazy" tabindex="-1" title="" scrolling="no"></iframe></div>
  <div class="variant-card__info">
    <div class="variant-card__meta"><span class="eyebrow">NN · <Theme> · <Layout></span><div class="swatches" aria-hidden="true"><span style="background:#…"></span><span style="background:#…"></span><span style="background:#…"></span><span style="background:#…"></span></div></div>
    <h3 class="card__title"><a class="variant-card__link" href="variants/NN-slug/index.html"><Variant name></a></h3>
    <p class="card__body"><One line: what this variant does differently.></p>
  </div>
</article>
```

If no group fits the industry, add one after the last group (the first group is reserved for the current top pick; only move groups when the user asks). The filter chips and counts are built from the sections, so nothing else needs editing:

```html
<section class="gallery-group" id="<industry-slug>" aria-labelledby="<industry-slug>-title">
  <div class="gallery-group__head">
    <h2 id="<industry-slug>-title"><Industry></h2>
    <p><Brand>, <one line on what it is>.</p>
  </div>
  <div class="gallery-grid">
    <!-- cards -->
  </div>
</section>
```

Also add a row to the **Variants** table in `README.md`, with the same industry.

## 6. Check

Screenshot with headless Edge into the scratchpad and look at every image. Run from the repo root in the Bash tool (`pwd -W` gives the `C:/…` form the URL needs):

```sh
"/c/Program Files (x86)/Microsoft/Edge/Application/msedge.exe" --headless=new --disable-gpu --hide-scrollbars \
  --virtual-time-budget=5000 --window-size=<W>,900 --screenshot="<scratchpad>/NN-<W>-<theme>.png" \
  "file:///$(pwd -W)/variants/NN-slug/index.html?theme=<light|dark>"
```

- Widths: 1440, 768, 375, 320.
- Both themes: `?theme=light` and `?theme=dark` force the theme for that load without saving it, so don't edit `data-default-theme` to test. (A variant that inlines its own theme script, like 04, doesn't have this; switch its default by hand and restore it.)
- Headless Edge enforces a minimum window width (about 500px), so a 375 or 320 `--window-size` screenshot is a clipped wider layout and shows false overflow. For the narrow widths, screenshot a small wrapper page: `<iframe src="…/index.html?theme=light" style="width:375px;height:2900px;border:0">` with `--window-size=800,2900`. Scripted scroll or clicks across `file://` iframes don't work; use CDP for those.
- The screenshot only shows the first 900px. For the rest of the page, raise the window height (e.g. `--window-size=<W>,4000`); for a page with `100vh` sections or scroll-driven motion, that distorts the layout, so drive scroll positions over CDP instead.
- Confirm: no horizontal scroll at 320px, readable contrast in both themes, visible focus states, 44px touch targets, motion disabled under `prefers-reduced-motion`, SVG hero and placeholders (if any) at the right aspect ratio.
- Fix what's wrong and re-check before moving on.

## 7. Notes and promotion

- Fill in **Agents used**, **Structure** and **Build notes** in `notes.md`, including what was checked.
- If the variant has generated imagery, add the **Suggested Gemini prompt** section (template below) per image.
- **Verdict** stays `_Pending._` until the user has compared it.
- Any pattern now used in two or more variants: promote it into `shared/css/components.css` and point both variants at it.

## 8. Report

Tell the user: the variant path, what it tests, how to view it (open the gallery `index.html`), what was checked and anything not checked, and, if there's art, the filename(s) to generate and where the Gemini prompt is.

Then ask for the verdict: what works, what doesn't, and whether anything is worth keeping as a shared pattern. When the user gives one (now or in a later session), write it into **Verdict** in `notes.md`. The playground exists to compare variants, and a variant with no verdict hasn't been compared.

---

## `notes.md` template

````markdown
# NN · Variant Name (short direction)

## Brief
- **Brand (fictional):** …
- **Industry:** … (the gallery group)
- **Audience:** …
- **Mood:** …
- **Palette:** …
- **Type:** …
- **What is tested:**
  1. …
- **Art:** none | `assets/images/NN-slug/<file>` (<ratio>). Until it exists the hero shows its SVG stand-in (`<file>.svg`); other frames show the "Art pending" placeholder.

## Suggested Gemini prompt
<!-- Only when the variant expects generated art. One block per image. -->
- **Save as:** `assets/images/NN-slug/<file>`. The page picks it up automatically.
- **Aspect ratio:** <ratio> (<W>×<H>).
- **Slot:** <where it sits and what the page draws around it>.

```
<Natural-language prompt for Gemini: subject, framing and safe areas, palette, lighting, background, and the exclusions written out in the text (Gemini has no negative prompt). End with "No text, logos or symbols.">
```

**If Gemini drifts:**
- <common problem>: reply "<fix>".

## Agents used
…

## Structure
1. …

## Build notes
- …

## Verdict
_Pending._
````
