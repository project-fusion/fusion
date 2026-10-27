import { headless, object, oneOf, Pressable, Slot, View } from '../../../render.js'
import { derive } from '../../../tree.js'

/**
 * Callout's headless tier: a passage set apart as a note, information, a
 * warning, or an error.
 *
 * **The tone is said in words**: the mark is an image named for it, "Error"
 * for `danger`, from `tone-label` or `tone-labels`, so the color is never
 * the only place the meaning is. An icon passed into `icon` replaces the
 * mark, and the name stays on the box around it.
 *
 * **A dismissible callout hides itself.** Its dismiss button, named for the
 * callout's heading or its tone, sends `dismiss` with what the callout is
 * called as `label`, which a handler may refuse. Unless one does, the
 * callout closes: `open` turns false and it is no longer drawn. The page
 * shows it again by writing `open`.
 *
 * **A dismissal hands focus on**: where the dismiss button was pressed,
 * focus moves to the dismiss button of the callout beside it, the next one
 * first. On a phone, the callouts beside it are those drawn in the same
 * Helix element, or outside any.
 *
 * **The web's**: focus handed to the next tab stop where no callout beside
 * it can take it, since a phone has no tab order to read.
 *
 * **Held to `helix-callout`.** `helix system check` compares the props, the
 * event, the states, the regions, and the parts with what the manifest says
 * the element has.
 */
export default headless('callout', {
  props: {
    dismissible: false,
    dismissLabel: 'Dismiss {label}',
    open: true,
    tone: oneOf(['danger', 'info', 'neutral', 'success', 'warning']),
    toneLabel: '',
    toneLabels: object(),
  },
  events: {
    dismiss: { cancelable: true, detail: ['label'], gives: { label: 'dismissed' } },
  },
  states: ['closed', 'entering', 'exiting', 'hasHeading', 'hasIcon', 'settled'],
  derived: {
    dismissed: derive('callout-dismissed'),
    dismissName: derive('callout-dismiss-name'),
    glyph: derive('callout-glyph'),
    toneName: derive('callout-tone-name'),
  },
  host: { role: 'note' },
  toggle: { onBeforeClose: 'dismiss', prop: 'open' },
  render: ({ derived, props }) => (
    <>
      <View
        label={derived.toneName}
        part="icon"
        role="img"
      >
        <Slot
          ariaHidden
          name="icon"
        >
          <View
            ariaHidden
            icon={derived.glyph}
            part="icon-mark"
          />
        </Slot>
      </View>
      <View part="content">
        <Slot name="heading" />
        <Slot />
      </View>
      {props.dismissible && (
        <Pressable
          label={derived.dismissName}
          part="dismiss"
          role="button"
          toggles
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
    </>
  ),
})
