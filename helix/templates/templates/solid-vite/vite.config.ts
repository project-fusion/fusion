import { defineConfig } from 'vite'
import solid from 'vite-plugin-solid'

/* Solid needs no setting for custom elements: it sets a property on one by
   default, `attr:` forces an attribute, and `on:` binds an event by its own
   name. */
export default defineConfig({ plugins: [solid()] })
