import { bind, box, collection, event, headless, prop, region } from '../../../tree.js'

/**
 * Steps' headless tier: the stages of a sequence and which one the reader is
 * on.
 *
 * **The sequence holds which stage is current, and its steps join it**, by
 * `value`. A press on a stage's name goes to it: the step sends `select`,
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
  collection: collection({
    after: 'activate',
    before: 'before-activate',
    chosen: 'active',
    initial: 'default-active',
    keys: { along: 'orientation', chooses: false, letters: false, wrap: false },
    optional: true,
    roves: 'arrows',
  }),
  events: [
    event('activate', { detail: ['previous', 'value'] }),
    event('before-activate', { cancelable: true, detail: ['value'] }),
    /* A step's press, which reaches the sequence before it acts on it. */
    event('select', { cancelable: true, detail: ['value'] }),
  ],
  host: { label: bind('label'), role: 'list' },
  props: [
    prop('active', 'string'),
    prop('default-active', 'string', { default: '' }),
    /* Unset is no value, so the arrows rove only while it is set. */
    prop('arrows', 'boolean'),
    prop('completion', ['passed'], { platform: 'web' }),
    prop('label', 'string', { default: 'Steps' }),
    prop('linear', 'boolean', { default: false, platform: 'web' }),
    prop('orientation', ['vertical']),
    prop('progress-label', 'string', {
      default: '{share, number, percent} complete',
      platform: 'web',
    }),
    prop('variant', ['numeric']),
  ],
  states: ['complete', 'settled'],
  tree: [
    region('default'),
    /* Hidden until a stylesheet gives it a `display`, which a phone's page
       cannot. */
    box('progress', {
      hidden: true,
      label: bind('label'),
      platform: 'web',
      role: 'progressbar',
      valuemax: 100,
      valuemin: 0,
    }),
  ],
})
