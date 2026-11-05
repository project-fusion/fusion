import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'

/* **The browsers that have `light-dark()`**, which every Helix color token is
   written with. Vite's default targets reach back to Safari 16.4, so a
   production build rewrites each `light-dark()` into a fallback that resolves
   on the root element. A Toast then draws in the page's mode, white on a white
   page, and so does a `data-color-mode` panel. The development server does not
   minify CSS, so only a build shows it. */
const cssTarget = ['chrome123', 'edge123', 'firefox120', 'safari17.5', 'ios17.5']

export default defineConfig({
  build: { cssTarget },
  plugins: [
    vue({
      /* **The one setting Vue needs.** Without it, Vue looks up every Helix tag
         as a component it cannot find, and warns on every render. Every Helix
         tag starts with `helix-`, in both tiers, and no other name does. */
      template: { compilerOptions: { isCustomElement: (tag) => tag.startsWith('helix-') } },
    }),
  ],
})
