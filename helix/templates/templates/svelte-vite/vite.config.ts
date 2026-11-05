import { svelte } from '@sveltejs/vite-plugin-svelte'
import { defineConfig } from 'vite'

/* **The browsers that have `light-dark()`**, which every Helix color token is
   written with. Vite's default targets reach back to Safari 16.4, so a
   production build rewrites each `light-dark()` into a fallback that resolves
   on the root element. A Toast then draws in the page's mode, white on a white
   page, and so does a `data-color-mode` panel. The development server does not
   minify CSS, so only a build shows it. Safari 18 and Firefox 128 are the
   first with relative colors, `oklch(from ...)`, which the brand ramp is
   built from. */
const cssTarget = ['chrome123', 'edge123', 'firefox128', 'safari18', 'ios18']

/* Svelte needs no setting for custom elements: it sets a property where the
   element has one, an attribute otherwise, and binds `on*` with
   `addEventListener`. */
export default defineConfig({ build: { cssTarget }, plugins: [svelte()] })
