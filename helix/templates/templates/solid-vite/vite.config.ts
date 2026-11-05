import { defineConfig } from 'vite'
import solid from 'vite-plugin-solid'

/* **The browsers that have `light-dark()`**, which every Helix color token is
   written with. Vite's default targets reach back to Safari 16.4, so a
   production build rewrites each `light-dark()` into a fallback that resolves
   on the root element. A Toast then draws in the page's mode, white on a white
   page, and so does a `data-color-mode` panel. The development server does not
   minify CSS, so only a build shows it. */
const cssTarget = ['chrome123', 'edge123', 'firefox120', 'safari17.5', 'ios17.5']

/* Solid needs no setting for custom elements: it sets a property on one by
   default, `attr:` forces an attribute, and `on:` binds an event by its own
   name. */
export default defineConfig({ build: { cssTarget }, plugins: [solid()] })
