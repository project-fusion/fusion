import { headless, number, numberOrString, object, Slot, Text, View } from '../../../render.js'
import { bind, derive } from '../../../tree.js'

/**
 * Badge's headless tier: a count, a dot, or words, pinned to what it wraps.
 *
 * **The mark is worked out from the value**, by core's badge derivations, on
 * both platforms: no value is a dot, zero is blank and draws nothing a reader
 * hears, a count past `max` reads `{max}+`, and `format-options` writes a
 * count in `locale`, such as `1.2K`. `label` names the mark, with `{count}`
 * filled in. Each is a value the element computes, and the indicator carries
 * three of them as the web's `data-` flags its rules read: `data-dot` for no
 * value, `data-single` for one character, and `data-blank` for zero.
 *
 * **The indicator is a status**, named by its words. A phone draws it as one
 * element a screen reader reaches, and hides it while it says nothing: a
 * blank mark, or a dot with no label. The icon passed into the mark is
 * hidden from screen readers, as the count and `label` are what it says.
 *
 * **Describing the wrapped control is the web's.** The web element points
 * the first control it wraps at its words, so focusing it says "Inbox,
 * button, 8 unread". A phone has no reference from a passed-in child to a
 * sibling's words, so the control and the count are two stops.
 */
export default headless('badge', {
  props: {
    /* JSON on the web's attribute, such as `{"notation":"compact"}`. */
    formatOptions: object(),
    label: '',
    locale: '',
    max: number(),
    value: numberOrString(''),
  },
  events: {},
  states: ['blank', 'capped', 'dot', 'hasIcon', 'settled'],
  derived: {
    blank: derive('badge-blank'),
    capped: derive('badge-capped'),
    dot: derive('badge-dot'),
    hasIcon: bind('icon'),
    shows: derive('badge-text'),
    single: derive('badge-single'),
    unset: derive('badge-unset'),
    words: derive('badge-words'),
  },
  render: ({ derived }) => (
    <>
      <Slot />
      <View
        ariaHidden={!derived.words}
        data-blank={derived.blank}
        data-dot={derived.unset}
        data-single={derived.single}
        label={derived.words}
        part="indicator"
        role="status"
      >
        <Slot
          ariaHidden
          name="icon"
          part="icon"
        />
        <Text
          ariaHidden={derived.blank}
          part="count"
        >
          {derived.shows}
        </Text>
      </View>
    </>
  ),
})
