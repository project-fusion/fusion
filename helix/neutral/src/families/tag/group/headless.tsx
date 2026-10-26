import {
  bare,
  cancelable,
  headless,
  oneOf,
  Slot,
  string,
  Text,
  View,
  web,
} from '../../../render.js'

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
  props: {
    disallowEmptySelection: false,
    /* The old name of `empty-text`, which the web reads for one release. */
    emptyLabel: web(string()),
    emptyText: 'No tags',
    label: '',
    selectionBehavior: oneOf(['replace', 'toggle'], 'toggle'),
    selectionMode: oneOf(['multiple', 'single']),
    value: '',
  },
  events: {
    beforeChange: cancelable(['value']),
    /* The platform's own name, as a form control sends it. */
    change: bare(),
    /* A tag's, which reaches the group as it bubbles on the web. */
    dismiss: cancelable(['label']),
  },
  states: ['empty', 'settled'],
  collection: {
    disallowEmptySelection: 'disallowEmptySelection',
    empty: 'empty',
    focusWhenEmpty: 'empty',
    keys: {
      adds: 'replace',
      enter: 'selects',
      escape: 'plain',
      loop: false,
      selectionFollowsFocus: false,
    },
    label: 'label',
    onBeforeChange: 'beforeChange',
    onChange: 'change',
    order: 'pressed',
    prop: 'value',
    removeOn: 'dismiss',
    selectionBehavior: 'selectionBehavior',
    selectionMode: 'selectionMode',
  },
  render: ({ props, state }) => (
    <>
      <Slot />
      {state.empty && (
        <View part="empty">
          <Slot name="empty">
            <Text part="empty-words">{props.emptyText}</Text>
          </Slot>
        </View>
      )}
    </>
  ),
})
