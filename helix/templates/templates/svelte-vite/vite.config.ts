import { svelte } from '@sveltejs/vite-plugin-svelte'
import { defineConfig } from 'vite'

/* Svelte needs no setting for custom elements: it sets a property where the
   element has one, an attribute otherwise, and binds `on*` with
   `addEventListener`. */
export default defineConfig({ plugins: [svelte()] })
