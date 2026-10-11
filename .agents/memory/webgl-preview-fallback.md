---
name: WebGL preview fallback
description: Keep the portfolio usable in preview browsers that cannot create a WebGL context.
---

For full-screen WebGL scenes, keep semantic content and controls independent from the renderer and provide a CSS atmosphere fallback when WebGL is unavailable.

**Why:** The Replit preview browser could not create a usable WebGL context; mounting R3F directly caused the app error boundary to replace the portfolio.

**How to apply:** Check WebGL capability before mounting the scene and keep portfolio copy, navigation, and controls in the DOM. Verify the app preview as well as TypeScript.

For JSX modules rendered inside R3F, import from `@react-three/fiber` in that module. Replit Cartographer’s R3F transform guard checks import sources, so a post-processing-only module can otherwise receive DOM metadata props that Three objects reject.

**Why:** An R3F post-processing component failed when development instrumentation added `data-component-name` to a Three element.

**How to apply:** Use a real Fiber hook such as `useThree` in those modules, then confirm the served development module has no injected `data-component-name` attributes.
