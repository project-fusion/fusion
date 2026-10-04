import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [
    vue({
      /* **The one setting Vue needs.** Without it, Vue looks up every Helix tag
         as a component it cannot find, and warns on every render. Every Helix
         tag starts with `helix-`, in both tiers, and no other name does. */
      template: { compilerOptions: { isCustomElement: (tag) => tag.startsWith('helix-') } },
    }),
  ],
})
