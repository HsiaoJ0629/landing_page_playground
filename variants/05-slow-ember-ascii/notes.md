# 05 · Slow Ember (ASCII campsite, scroll from golden hour to night)

## Brief
- **Brand (fictional):** Slow Ember, a cosy camping game by Tarn & Tinder Games (also fictional).
- **Industry:** Games (gallery group).
- **Audience:** people who play to wind down: cosy-game fans, campers, anyone who wants ten quiet minutes.
- **Mood:** chill and relaxed, but with a dramatic stage. An autumn evening at camp: falling leaves, a fire, stars coming out one at a time.
- **Palette:** night plum-black `#0F0D16`, warm cream text `#F3EADB`, ember `#FF9E4A`, gold `#E0B15A`, moss `#7FB685`. Light theme is an autumn-afternoon parchment `#F5ECDC` with burnt orange `#A23E0C`. The scene has its own colours, graded by scroll.
- **Type:** JetBrains Mono for everything (display and body), so the page reads as one ASCII surface.
- **Default theme:** dark (toggle to light / system).
- **What is tested:**
  1. ASCII as the whole visual language: a campsite drawn as a character grid (mountains, pines, autumn maples, tent, fire, falling leaves), plus ASCII icons, wordmark, equaliser and box-style cards.
  2. A pinned, scroll-driven scene: scrolling moves the evening from golden hour through sunset and dusk to night (the sun sets, the fire catches, stars appear one by one, the moon rises), with captions per beat.
  3. Ambient animation that stays calm: flickering fire with sparks, drifting leaves, clouds, birds, fireflies, a shooting star; scroll-reveal "decode" headings and a typed camp log below.
- **Art:** none generated. Everything is drawn in code as ASCII characters, by the user's request.

## Agents used
None. The scene, layout and palette are tightly coupled to the ASCII engine, so the variant was designed and built in the main session.

## Structure
1. Header (shared shell).
2. **Stage** (`#camp`, 440vh track with a pinned canvas under the header): four captions.
   - Hero: ASCII wordmark as the `h1`, tagline, two CTAs.
   - Golden hour: "No quests. No clock."
   - Dusk: "Light the fire yourself."
   - Night: "Then just sit with it."
3. **Things to do** (`#do`): four box cards with animated ASCII icons (pitch, kindle, brew, stargaze).
4. **Camp log** (`#log`): copy beside a terminal panel that types the day's log when it scrolls into view.
5. Leaf strip: two rows of ASCII leaves drifting sideways.
6. **Sounds** (`#sound`): ASCII equaliser and a track list.
7. **Words** (`#words`): three short quotes.
8. **Wishlist** (`#wishlist`): closing CTA with a small animated fire, then the footer.

## Build notes
- Files: `index.html`, `styles.css`, `script.js` (a classic script, so it also runs from `file://`). No libraries.
- **Scene engine.** The stage is a grid of characters drawn on a `<canvas>` in JetBrains Mono, about 24 frames a second. The grid is sized from the pinned area, so the scene is composed for whatever columns and rows fit: phones get a taller sky, a smaller tent and the camp higher up, so the copy has the ground to itself.
  - Static layer (rebuilt on resize): two ridgelines, ground, pines, maples, tent, logs, a log seat with a mug. Cells can carry a background colour, so shapes occlude what is behind them.
  - Scroll drives: sky gradient, sun setting behind the range, moon rising, the day-to-night colour grade, stars appearing one at a time, the fire catching (with a burst of sparks), the tent lantern, fireflies, and the HUD clock (16:40 to 22:15).
  - Always moving: the fire (a small heat grid that cools as it rises, mapped to characters and colours), sparks, falling leaves that land and rest, clouds, a flock of birds, mug steam, stirring canopies, an occasional shooting star.
  - Firelight: each cell has a precomputed falloff from the fire, dithered, which tints nearby ground, trees and tent.
- The stage keeps its own night palette in both themes (token values overridden on `.stage`), like the paper bookends in 04. Light theme only changes the page around it.
- The `h1` is the ASCII wordmark; the readable name is in an `sr-only` span and the art is `aria-hidden`.
- Below the stage: scroll reveal, headings that "decode" out of random ASCII (real text kept in an `sr-only` span), a camp log that types itself once, ASCII icon frames, an equaliser. Interval animations only run while their element is on screen.
- `prefers-reduced-motion` and the gallery preview: one still night frame, no loops; under reduced motion the captions stack below the scene and all reveals are shown.
- Checked in headless Chrome at 320 / 375 / 768 / 1024 / 1180 / 1440, light and dark: no horizontal overflow, no contrast failures, one `h1`, 44px targets, no script errors. Stage looked at on desktop and phone at several scroll positions; sections looked at in both themes.
- Not checked: frame rate on a low-end phone, real touch devices, keyboard focus walk, Safari and Firefox.

## Review
- Worth promoting if a second variant pins a scroll stage: the "sticky under the header, progress measured from the pin" pattern is used here (four lines of CSS, so it stays in the variant until a second one needs it).

## Verdict
_Pending._
