import { boolean, cancelable, headless, oneOf, Slot, string, View, web } from '../../../render.js'
import { bind, derive } from '../../../tree.js'

/**
 * Steps' headless tier: the stages of a sequence and which one the reader is
 * on.
 *
 * **The sequence holds which stage is current, and its steps join it**, by
 * `value`. A press on a stage's name goes to it: the step sends `before-select`,
 * the sequence `before-activate`, and either may refuse, and then it sends
 * `activate`. **It may hold none**: without `active`, each step's own
 * `current` says where the reader is, so a server's markup is right before
 * any script runs. The web names a step with no `value` by its place, from
 * 1, and a phone moves only among steps with a value.
 *
 * **With `arrows`, the stages' names are one stop** whose arrow keys move
 * focus along the way the steps run, choosing nothing and stopping at the
 * ends: Left and Right in a row, Up and Down in a column. The arrows across
 * them are left to the page. Without it, each name is a stop of its own.
 *
 * **What keeps a reader in order is the web's for now**: `linear`, which
 * holds a stage ahead out of reach until those before it are finished,
 * `completion="passed"`, `validate`, the `next()`, `previous()`, and
 * `reset()` methods, and the `progress` bar's reading. A phone's sequence
 * goes to any stage that is not disabled.
 *
 * **The sequence is a list named by `label`**, and each step a list item,
 * on the web and on a phone.
 *
 * **Held to `helix-steps`.** `helix family check` compares the props, the
 * events, the states, the region, and the part with what the manifest says
 * the element has.
 */
export default headless('steps', {
  props: {
    active: string(),
    /* Unset is no value, so the arrows rove only while it is set. */
    arrows: boolean(),
    completion: web(oneOf(['passed'])),
    defaultActive: '',
    fallbackLabel: 'Steps',
    label: '',
    linear: web(false),
    orientation: oneOf(['vertical']),
    progressLabel: web('{share, number, percent} complete'),
    variant: oneOf(['numeric']),
  },
  events: {
    activate: ['previous', 'value'],
    beforeActivate: cancelable(['value']),
    /* A step's press, which reaches the sequence before it acts on it. */
    beforeSelect: cancelable(['value']),
  },
  states: ['complete', 'settled'],
  derived: {
    name: derive('steps-name'),
  },
  collection: {
    defaultProp: 'defaultActive',
    keys: {
      loop: false,
      orientation: 'orientation',
      selectionFollowsFocus: false,
      typeahead: false,
    },
    onBeforeChange: 'beforeActivate',
    onChange: 'activate',
    optional: true,
    prop: 'active',
    roves: 'arrows',
  },
  host: { label: bind('name'), role: 'list' },
  render: ({ props }) => (
    <>
      <Slot />
      {/* Hidden until a stylesheet gives it a `display`, which a phone's page
          cannot. */}
      <View
        hidden
        label={props.label}
        part="progress"
        platform="web"
        role="progressbar"
        valuemax={100}
        valuemin={0}
      />
    </>
  ),
})
