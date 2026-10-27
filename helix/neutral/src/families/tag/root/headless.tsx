import {
  boolean,
  cancelable,
  headless,
  Pressable,
  property,
  Slot,
  set,
  View,
  Wrap,
} from '../../../render.js'
import { derive } from '../../../tree.js'

/**
 * Tag's headless tier: a label, its category before it, and a button that
 * asks for the tag to be removed.
 *
 * **A remove press asks, and the page removes.** It sends `dismiss`, which a
 * handler can cancel, with the tag's own words as its `label`, and the tag
 * stays until the page takes it out of its list. The button is named for its
 * tag, `dismiss-label` with `{label}` for the tag's words, its category
 * first: "Remove Apple". The words come from what is passed into the tag, so
 * a phone works the name out as the web does, and reads the words registered
 * for `helix-tag` in the tag's language where `dismiss-label` is its English.
 *
 * **On a phone the tag is one press, and its remove button is for the
 * pointer.** A screen reader reaches the tag as one element, and is offered
 * the remove press as an action of the tag named as the button is, as a
 * tab's close mark is. On the web, the cell is drawn only in a `Tag.Group`,
 * where it is the row's one cell and takes focus, and the remove button is a
 * button of its own.
 *
 * **In a `Tag.Group` a tag is an item of its set**: a press selects it where
 * the group selects, and the tag stands for its `value`, or for its words,
 * its category first, where it has none. A tag with an `href` is a link: its
 * press opens it, and in a group that selects nothing, the group follows it.
 *
 * **Held to `helix-tag`.** `helix system check` compares the props, the
 * event, the states, the regions, and the parts with what the manifest says
 * the element has.
 */
export default headless('tag', {
  memberOf: set('tag-group', { labelledby: ['start', 'default'] }),
  props: {
    disabled: false,
    dismissible: false,
    dismissLabel: 'Remove {label}',
    href: '',
    /* What a Tag Group writes on its tags. */
    selected: property(boolean()),
    value: '',
  },
  events: {
    dismiss: cancelable(['label']),
  },
  states: ['focusVisible', 'selected', 'settled'],
  render: ({ props, send }) => (
    <Pressable
      disabled={props.disabled}
      href={props.href}
      part="cell"
      selected={props.selected}
      selects
    >
      <Slot
        name="start"
        part="start"
      />
      <Wrap
        href={props.href}
        part="link"
      >
        <Slot part="label" />
      </Wrap>
      {props.dismissible && (
        <Pressable
          ariaHidden
          disabled={props.disabled}
          label={derive('tag-remove-name')}
          onPress={send.dismiss}
          part="dismiss"
        >
          <Slot name="dismiss-icon">
            <View
              ariaHidden
              icon="x"
              part="dismiss-mark"
            />
          </Slot>
        </Pressable>
      )}
    </Pressable>
  ),
})
