import {
  boolean,
  headless,
  oneOf,
  Pressable,
  property,
  Slot,
  set,
  string,
  View,
  Wrap,
  web,
} from '../../../render.js'

/**
 * A list row's headless tier: what it takes, what it sends, and its parts.
 *
 * **Each region has a box of its own, and the layout is the boxes'.** The
 * leading content, the label and its description in a body, and the trailing
 * content, so the description sits under the label on every platform without a
 * stylesheet placing content from outside.
 *
 * **The row is `row-current` as well while it is current**, which is a second
 * token on the same part on the web.
 *
 * **Held to `helix-list-item`.** `helix family check` compares the props,
 * events, states, regions, and parts with what the manifest says the element
 * has.
 */
export default headless('list-item', {
  /* A row of its list's collection: a press on it chooses it, in a list that
     selects, and a `reorderable` list names its grip, which moves it. */
  memberOf: set('list', { grip: 'grip' }),
  props: {
    current: oneOf(['date', 'location', 'page', 'step', 'time', 'true']),
    disabled: false,
    /* `focusable`, `grip`, `move`, `selected`, and `selectionOnly` are what
       the list writes on its rows. */
    focusable: property(boolean()),
    grip: property(string()),
    /* `href`, `rel`, and `target` are a link's, for a row that is a
       destination. */
    href: '',
    move: property(oneOf(['dragging', 'drop-after', 'drop-before'])),
    rel: web(''),
    selected: property(boolean()),
    selectionOnly: property(false),
    target: web(''),
    value: '',
  },
  events: {
    action: [],
  },
  states: ['dragging', 'dropAfter', 'dropBefore', 'focusVisible', 'selected', 'settled'],
  render: ({ props }) => (
    <Pressable
      also={{ 'row-current': props.current }}
      chooses
      disabled={props.disabled}
      part="row"
      selected={props.selected}
    >
      {/* Everything but `end` is the link, so a control there is a control of
        its own. */}
      <Wrap
        current={props.current}
        href={props.href}
        part="link"
      >
        <View part="rail" />
        <Slot
          name="start"
          part="start"
        />
        <View part="body">
          <Slot part="label" />
          <Slot
            name="description"
            part="description"
          />
        </View>
      </Wrap>
      <Slot
        name="end"
        part="end"
      />
      {props.grip && (
        <Pressable
          label={props.grip}
          part="grip"
        >
          <View
            ariaHidden
            icon="dots-six-vertical"
            part="grip-mark"
          />
        </Pressable>
      )}
    </Pressable>
  ),
})
