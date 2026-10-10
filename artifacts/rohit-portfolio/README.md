# Rohit Paudel — Field Archive

A moonlit portfolio in a city reclaimed by fog and vegetation. Phase 1 brings the hero and about scenes to life in a single, fixed React Three Fiber / WebGL canvas. Projects, skills, experience, and contact remain reachable preview scenes; this is not Phase 2.

## Run

```sh
npm run dev
```

For the configured workspace build, provide the Vite environment values:

```sh
PORT=5000 BASE_PATH=/ npm run build
```

`npm run typecheck` checks the project. The portfolio uses one Lenis scroll runway; HERO ↔ ABOUT camera travel is scrubbed by GSAP ScrollTrigger, so backward scrolling reverses the camera, field-of-view, depth, and image blend in place. Menu and compass jumps use `transitionTo(sceneId)`. Unfinished destinations crossfade.

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
    assetTextures.ts         Three texture loading, console warnings, generated canvas fallbacks
    DebugControls.tsx        Per-scene Leva tuning, available with ?debug
```

## Scene media

Place source art in `public/assets` at the paths already declared by `src/scenes/registry.ts`:

```text
assets/
  scenes/01-hero.webp
  scenes/02-about.webp
  scenes/03-projects.webp
  scenes/04-skills.webp
  scenes/05-experience.webp
  scenes/06-contact.webp
  depth/hero-depth.png
  depth/about-depth.png
  depth/projects-depth.png
  depth/skills-depth.png
  depth/experience-depth.png
  depth/contact-depth.png
  layers/01-hero-far.webp
  layers/01-hero-mid.webp
  layers/01-hero-near.webp
  layers/03-projects-far.webp
  layers/03-projects-mid.webp
  layers/03-projects-near.webp
```

HERO and PROJECTS render a background plus three layered image planes. ABOUT, SKILLS, EXPERIENCE, and CONTACT use a depth-map displacement shader. Until these files are added, the texture loader logs each missing path and keeps the experience running with original generated canvas-texture art and a procedural depth fallback; no asset files are fabricated.

To add a scene, add its typed entry in `sceneRegistry`, select `layered` or `depth`, add the matching content in `SceneCopy`, and supply media at the registry paths. `preloadNextScene()` begins loading the following scene's textures when a scene mounts. The renderer caps DPR at 1.5; coarse-pointer devices use camera auto-sway and skip post-processing. Reduced-motion preference replaces camera travel with a scene blend.

## Tune

Append `?debug` to the URL to show Leva. The panel exposes parallax strength, depth scale, fog density, transition duration, and focal-point x/y for every scene. The values update the Zustand scene store in real time. The mute toggle is intentionally UI-only until ambient audio assets are supplied.
