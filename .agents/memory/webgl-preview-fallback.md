---
name: WebGL preview fallback
description: Keep the portfolio usable in preview browsers that cannot create a WebGL context.
---

For full-screen WebGL scenes, keep semantic content and controls independent from the renderer and provide a CSS atmosphere fallback when WebGL is unavailable.

**Why:** The Replit preview browser could not create a usable WebGL context; mounting R3F directly caused the app error boundary to replace the portfolio.

**How to apply:** Check WebGL capability before mounting the scene and keep portfolio copy, navigation, and controls in the DOM. Verify the app preview as well as TypeScript.
