import { cancelable, headless, Pressable, Slot, string, Text, View, web } from '../../../render.js'

/**
 * Option's headless tier: one choice in a list.
 *
 * **An option joins whichever owner stands around it**, Listbox here, and Select,
 * Combobox, Command, and Time Picker as they move: on the web the owner walks its
 * children, and on a phone the option joins through a context. The owner writes
 * `selected`, and says which option the keys are on, which draws it `active`.
 *
 * **A press asks with `before-select`**, which a handler may refuse, and then the
 * owner decides whether the choice stands. A `disabled` option is not chosen.
 *
 * **An option with `href` is a link**: a press follows it and chooses nothing, on
 * a phone through the app's open-link.
 *
 * **Selected and active look different.** Selected draws a check at the end of
 * the row, or what is passed into `indicator`. Active draws the fill a hover
 * draws. A touch draws no hover.
 *
 * **What a screen reader hears.** The web says `option` on the host and names it
 * by its label part, with the description as its description. A phone says a
 * button, selected or not, named by the label, with the description as its hint.
 * Each option takes a screen reader's focus of its own on a phone, where the web
 * points `aria-activedescendant` at it.
 *
 * **The web's**: `alternate`, `alternate-label`, and `opens`, which Command reads;
 * `download`, `rel`, and `target`, which a phone's open-link has no use for; and
 * the `hovered` state.
 *
 * **Held to `helix-option`.** `helix system check` compares the props, the events,
 * the states, the regions, and the parts with what the manifest says the element
 * has.
 */
export default headless('option', {
  props: {
    alternate: web(''),
    alternateLabel: web(''),
    /* Written by a test or a page that draws an option alone. */
    dataActive: false,
    description: string(),
    disabled: false,
    download: web(false),
    href: '',
    label: '',
    opens: web(''),
    rel: web(''),
    selected: false,
    target: web(''),
    textValue: '',
    value: '',
  },
  events: {
    beforeSelect: cancelable(['href', 'value']),
  },
  states: ['active', 'disabled', 'hasIndicator', 'hovered', 'pressed', 'selected', 'settled'],
  option: {
    checkShown: 'checkShown',
    described: 'described',
    description: 'description',
    disabled: 'disabled',
    dragging: 'dragging',
    dropAfter: 'dropAfter',
    dropBefore: 'dropBefore',
    dropShown: 'dropShown',
    highlighted: 'highlighted',
    href: 'href',
    label: 'label',
    onBeforeSelect: 'beforeSelect',
    selected: 'selected',
    textValue: 'textValue',
    value: 'value',
  },
  render: ({ option, props, state }) => (
    <Pressable
      also={{ 'item-active': state.active, 'item-selected': state.selected }}
      data-dragging={option.dragging}
      data-highlight={option.highlighted}
      describedby="description"
      disabled={props.disabled}
      part="item"
      role="option"
    >
      <Slot name="start" />
      <View part="text">
        <View part="label">
          <Slot>
            <Text part="label-text">{props.label}</Text>
          </Slot>
        </View>
        {option.described ? (
          <View part="description">
            <Slot name="description">
              <Text part="description-text">{props.description}</Text>
            </Slot>
          </View>
        ) : (
          <Slot name="description" />
        )}
      </View>
      <Slot name="end" />
      <Slot name="indicator" />
      {option.checkShown && (
        <View
          ariaHidden
          icon="check"
          part="check"
          platform="native"
        />
      )}
      {option.dropShown && (
        <View
          ariaHidden
          data-after={option.dropAfter}
          data-before={option.dropBefore}
          part="drop"
          platform="native"
        />
      )}
    </Pressable>
  ),
})
