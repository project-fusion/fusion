import { headless, Slot } from '../../../render.js'

/**
 * An outline section's headless tier: a section of the page that an outline
 * draws a link for, written once for the web and a phone.
 *
 * **The web finds it by its id**, as it finds any anchor: the element takes
 * `anchor` as its id, and an outline with no links of yours draws a link
 * for each section on the page, in the order they stand. **A phone
 * registers its view** under `anchor`, as `useSection` does.
 *
 * `label` is the words its link says, and `level` its heading's level,
 * from 1, as `data-level` says it on a link of yours.
 *
 * **Held to `helix-outline-section`.** `helix family check` compares the
 * props, the states, and the region with what the manifest says the element
 * has.
 */
export default headless('outline-section', {
  props: {
    anchor: '',
    label: '',
    level: 1,
  },
  events: {},
  states: ['settled'],
  section: { id: 'anchor', label: 'label', level: 'level' },
  render: () => <Slot />,
})
