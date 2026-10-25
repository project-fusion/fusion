import {
  bind,
  box,
  derive,
  event,
  headless,
  pressable,
  prop,
  region,
  toggle,
  when,
} from '../../../tree.js'

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
 * **Held to `helix-callout`.** `helix family check` compares the props, the
 * event, the states, the regions, and the parts with what the manifest says
 * the element has.
 */
export default headless('callout', {
  derived: {
    'dismiss-name': derive('callout-dismiss-name'),
    dismissed: derive('callout-dismissed'),
    glyph: derive('callout-glyph'),
    'tone-name': derive('callout-tone-name'),
  },
  events: [
    event('dismiss', { cancelable: true, detail: ['label'], gives: { label: 'dismissed' } }),
  ],
  host: { role: 'note' },
  props: [
    prop('dismiss-label', 'string', { default: 'Dismiss {label}' }),
    prop('dismissible', 'boolean', { default: false }),
    prop('open', 'boolean', { default: true }),
    prop('tone', ['danger', 'info', 'neutral', 'success', 'warning']),
    prop('tone-label', 'string', { default: '' }),
    prop('tone-labels', 'object'),
  ],
  states: ['closed', 'entering', 'exiting', 'has-heading', 'has-icon', 'settled'],
  toggle: toggle({ checked: 'open', closes: 'dismiss' }),
  tree: [
    box('icon', { label: bind('tone-name'), role: 'img' }, [
      region('icon', { decorative: true }, [
        box('icon-mark', { decorative: true, glyph: bind('glyph') }),
      ]),
    ]),
    box('content', {}, [region('heading'), region('default')]),
    when(
      'dismissible',
      pressable('dismiss', { label: bind('dismiss-name'), role: 'button', toggles: true }, [
        region('dismiss-icon', {}, [box('dismiss-mark', { decorative: true, glyph: 'x' })]),
      ]),
    ),
  ],
})
