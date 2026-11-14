import { headless, Slot } from '../../../render.js'

/**
 * Sandbox Toolbar's headless tier: the bar across the top of a sandbox, its
 * items at the start, usually the files, and at the end, usually menus.
 *
 * **It is no toolbar to a screen reader.** That role gives a group of similar
 * controls one tab stop, and the bar holds a tab list, whose own arrow keys the
 * role would break. Each item is reached as the platform reaches it.
 *
 * **Held to `helix-sandbox-toolbar`.** `helix system check` compares the
 * regions and the parts with what the manifest says the element has.
 */
export default headless('sandbox-toolbar', {
  props: {},
  states: ['settled'],
  render: () => (
    <>
      <Slot />
      <Slot name="end" />
    </>
  ),
})
