import {
  bind,
  box,
  derive,
  event,
  headless,
  item,
  pressable,
  prop,
  region,
  when,
  wrap,
} from '../../../tree.js'

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
 * **Held to `helix-tag`.** `helix family check` compares the props, the
 * event, the states, the regions, and the parts with what the manifest says
 * the element has.
 */
export default headless('tag', {
  events: [event('dismiss', { cancelable: true, detail: ['label'] })],
  item: item('tag-group', { chooses: true, named: ['start', 'default'] }),
  props: [
    prop('disabled', 'boolean', { default: false }),
    prop('dismiss-label', 'string', { default: 'Remove {label}' }),
    prop('dismissible', 'boolean', { default: false }),
    prop('href', 'string', { default: '' }),
    prop('value', 'string', { default: '' }),
    /* What a Tag Group writes on its tags. */
    prop('selected', 'boolean', { attribute: false }),
  ],
  states: ['focus-visible', 'selected', 'settled'],
  tree: [
    pressable(
      'cell',
      {
        chooses: true,
        disabled: bind('disabled'),
        href: bind('href'),
        selected: bind('selected'),
      },
      [
        region('start', { part: 'start' }),
        wrap('link', { href: bind('href') }, [region('default', { part: 'label' })]),
        when(
          'dismissible',
          pressable(
            'dismiss',
            {
              decorative: true,
              disabled: bind('disabled'),
              label: derive('tag-remove-name'),
              sends: 'dismiss',
            },
            [region('dismiss-icon', {}, [box('dismiss-mark', { decorative: true, glyph: 'x' })])],
          ),
        ),
      ],
    ),
  ],
})
