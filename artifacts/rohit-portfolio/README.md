# Rohit Paudel — Field Archive

A moonlit portfolio in a city reclaimed by fog and vegetation. All six scenes are reachable through a fixed React Three Fiber / WebGL canvas with reversible Hero/About scroll travel and timed transitions across the rest of the archive.

## Run

```sh
npm run dev
```

For the configured workspace build, provide the Vite environment values:

```sh
PORT=5000 BASE_PATH=/ npm run build
```

`npm run typecheck` checks the project. Wheel, trackpad, touch swipe, Arrow keys, PageUp/PageDown, Space, the compass pips, and the section menu travel in scene order. Hero ↔ About camera travel is scrubbed by GSAP ScrollTrigger, so scrolling backward reverses the camera, field of view, depth, and image blend. Other scene changes use the shared `transitionTo(sceneId)` route with a 1.6-second timed transition, input lock, and a short post-transition inertia guard. Reduced-motion preference switches these changes to crossfades.

## Structure

```text
src/
  App.tsx                    Semantic portfolio UI, Lenis, ScrollTrigger, transitionTo
  index.css                  Moonlit grade, typography, HUD, letterbox, responsive UI
  data/content.ts            Copy and structured project / skills / experience data
  scenes/
    registry.ts              Six scene definitions and expected media paths
    store.ts                 Zustand scene, transition, mute, and tuning state
    WorldCanvas.tsx          Lazy single R3F canvas, camera, fog, particles and render paths
    assetTextures.ts         Three texture loading, console warnings, generated canvas fallbacks, adjacent-scene preloading
    ProjectsStorefront.tsx   Project layers, sign anchor, door hotspot, red glow, street fog and dust
    DebugControls.tsx        Per-scene Leva tuning, available with ?debug
```

## Scene media

Scene art is loaded from `public/assets` at the paths declared by `src/scenes/registry.ts`:

```text
assets/
  scenes/01-hero.webp
  scenes/02-about.webp
  scenes/03-projects.webp
  scenes/04-skills.webp
  scenes/05-experience.webp
  scenes/06-contact.webp
  depth/01-hero-depth.png
  depth/02-about-depth.png
  depth/03-projects-depth.png
  depth/04-skills-depth.png
  depth/05-experience-depth.png
  depth/06-contact-depth.png
  layers/01-hero-far.webp
  layers/01-hero-mid.webp
  layers/01-hero-near.webp
  layers/03-projects-far.webp
  layers/03-projects-mid.webp
  layers/03-projects-near.webp
```

HERO and PROJECTS render a background plus three layered image planes with different parallax multipliers. ABOUT, SKILLS, EXPERIENCE, and CONTACT use a depth-map displacement shader. Generated textures remain only as a fallback if an asset cannot be loaded. A separate CSS atmosphere and semantic UI remain available if WebGL is unavailable.

To add a scene, add its typed entry in `sceneRegistry`, select `layered` or `depth`, add the matching content in `SceneCopy`, and supply media at the registry paths. Once a scene settles, its previous and next scene images, depth maps, and layers begin preloading. The renderer caps DPR at 1.5; coarse-pointer devices use camera auto-sway and skip post-processing.

## Tune

Append `?debug` to the URL to show Leva. The panel exposes parallax strength, depth scale, fog density, transition duration, and focal-point x/y for every scene; the Projects focal point starts at x=.58, y=.58. The faint `projects-sign-anchor` outline appears in this mode; its invisible mesh and size are defined in `src/scenes/ProjectsStorefront.tsx` and are attached to the storefront mid-layer. The door hotspot logs `door clicked` and shows a Phase 3 journal placeholder; the sign and journal are not implemented. The mute toggle is still UI-only, and uploaded material textures and audio remain unused.

## Test Phase 2

1. Open the preview in a browser with WebGL enabled (hardware acceleration on).
2. Scroll down from Hero into About, then scroll back up; the Hero/About camera movement should reverse smoothly.
3. Continue down from About to pass through Projects, Skills, Experience, and Contact. Use wheel/trackpad or touch swipe; ArrowUp/ArrowDown, PageUp/PageDown, and Space / Shift+Space should also move one scene at a time.
4. Click any compass pip or menu entry to jump. After a transition, wait about half a second before another wheel gesture to avoid trackpad inertia.
5. On Projects, move the pointer to see the far/mid/near layer drift at different strengths. Tab to the red door; focus or hover should reveal ENTER, and activation should announce the journal placeholder.
6. Add `?debug` to tune focal points in Leva and inspect the sign-anchor outline. Set `prefers-reduced-motion` to reduce to confirm timed changes become crossfades.
