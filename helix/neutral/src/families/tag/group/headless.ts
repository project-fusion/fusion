import { bind, box, collection, event, headless, prop, region, text, when } from '../../../tree.js'

/**
 * Tag Group's headless tier: a set of tags that the arrow keys move through,
 * and that a reader selects and removes from the keyboard.
 *
 * **The group holds which tags are selected**, as a list holds its rows: as
 * many as `selection-mode` says, a press or Space adding or taking out a tag,
 * or selecting it alone under `selection-behavior="replace"`, and Enter
 * selecting a tag that is no link and following one that is. The arrow keys,
 * Home, End and a typed letter move focus, stopping at the ends. Shift with
 * an arrow, Home, End, a press or Space selects the range from the tag last
 * pressed, in place of the range the last such action selected, as React
 * Aria's does. Control or Command with Space adds or takes out a tag only
 * under `replace` in `multiple`. Control or Command with A selects every tag
 * that is not disabled, Escape without Control or Command lets go of the
 * selection, and `disallow-empty-selection` keeps one tag selected once one
 * is. A change asks with `before-change` and tells with `change`, `value`
 * holding the selected tags' values separated by commas: in the order they
 * were pressed, and in the order the tags stand after a range or Control or
 * Command with A.
 *
 * **Delete or Backspace on a `dismissible` tag sends its `dismiss`**, as its
 * remove button does, which reaches the group too. Once the page takes the
 * tag out, focus moves to the next tag, or to the one before after the last,
 * and to the `empty` part once none is left, which says `empty-text` or
 * what is passed into `empty`.
 *
 * **On a phone the set is a group named by `label`**, where the web is a
 * grid of rows: React Native has no grid, and each tag is one press a screen
 * reader reaches, selected or not.
 *
 * **Held to `helix-tag-group`.** `helix family check` compares the props,
 * the events, the states, the regions, and the parts with what the manifest
 * says the element has.
 */
export default headless('tag-group', {
  collection: collection({
    after: 'change',
    before: 'before-change',
    behavior: 'selection-behavior',
    chosen: 'value',
    empty: 'empty',
    keeps: 'disallow-empty-selection',
    keys: { adds: 'replace', chooses: false, enter: 'selects', escape: 'plain', wrap: false },
    label: 'label',
    mode: 'selection-mode',
    order: 'pressed',
    removes: { empty: 'empty', event: 'dismiss' },
  }),
  events: [
    event('before-change', { cancelable: true, detail: ['value'] }),
    /* The platform's own name, as a form control sends it. */
    event('change', { bare: true }),
    /* A tag's, which reaches the group as it bubbles on the web. */
    event('dismiss', { cancelable: true, detail: ['label'] }),
  ],
  props: [
    prop('disallow-empty-selection', 'boolean', { default: false }),
    /* The old name of `empty-text`, which the web reads for one release. */
    prop('empty-label', 'string', { platform: 'web' }),
    prop('empty-text', 'string', { default: 'No tags' }),
    prop('label', 'string', { default: '' }),
    prop('selection-behavior', ['replace', 'toggle'], { default: 'toggle' }),
    prop('selection-mode', ['multiple', 'single']),
    prop('value', 'string', { default: '' }),
  ],
  states: ['empty', 'settled'],
  tree: [
    region('default'),
    when(
      'empty',
      box('empty', {}, [region('empty', {}, [text('empty-words', { says: bind('empty-text') })])]),
    ),
  ],
})
