import type { NextConfig } from 'next'

/* **The browsers are in `package.json`, under `browserslist`**: the ones that
   have `light-dark()`, which every Helix color token is written with. Next's
   default reaches back to Safari 16.4, and its CSS pipeline then rewrites each
   `light-dark()` into a fallback that resolves on the root element. A Toast then
   draws in the page's mode, white on a white page, and so does a
   `data-color-mode` panel. */
const config: NextConfig = {}

export default config
