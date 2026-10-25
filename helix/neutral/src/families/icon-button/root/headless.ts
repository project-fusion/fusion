import {
  bind,
  box,
  event,
  headless,
  item,
  live,
  pressable,
  prop,
  region,
  when,
} from '../../../tree.js'

/**
 * Icon Button's headless tier: a button whose content is an icon, named by
 * its `label`.
 *
 * **Button's tree, under its own name.** The web element extends Button's,
 * so it takes the same props, sends the same press, and draws the same
 * parts. A phone reuses Button's press machine on the same `button` part.
 * The icon is passed in as the default region's content, such as a
 * `HelixIcon`, which draws the glyph.
 *
 * **Named by `label`.** The content is a glyph, which says nothing to a
 * screen reader, so the button is announced as a button with the label's
 * words.
 *
 * **It does not toggle on its own.** A Button Group in a selection mode
 * presses it, as it presses a Button: the button joins the group's set,
 * shows it as its `pressed` state, and is announced as a toggle button, or
 * as a radio under `single`. While it is pressed it takes the group's solid
 * fill, as a pressed Button does, on the web and on a phone.
 *
 * **Held to Icon Button's web element.** `helix family check` compares these
 * props, the event, the states, the regions, and the parts with what the
 * manifest says `helix-icon-button` has.
 */
export default headless('icon-button', {
  events: [event('press', { detail: ['pointerType'] })],
  item: item('button-group', { chooses: true, state: 'pressed' }),
  props: [
    prop('disabled', 'boolean', { default: false }),
    prop('expanded', 'boolean', { attribute: false }),
    prop('focusable', 'boolean', { attribute: false, default: true }),
    /* A disabled control kept in the tab order and announced as disabled, so
       a tooltip can say why. */
    prop('focusable-when-disabled', 'boolean', { default: false }),
    prop('label', 'string'),
    prop('pending', 'boolean', { default: false }),
    prop('pending-label', 'string', { default: 'Loading' }),
    prop('popup', ['dialog', 'grid', 'listbox', 'menu', 'tree'], { attribute: false }),
    prop('pressed', 'boolean', { attribute: false }),
    /* What names it among a Button Group's pressed values, and its form
       value on the web. */
    prop('value', 'string', { default: '' }),
    /* A form's and an invoker's, which a phone has neither of. */
    prop('command', 'string', { default: '', platform: 'web' }),
    prop('commandfor', 'string', { default: '', platform: 'web' }),
    prop('formaction', 'string', { default: '', platform: 'web' }),
    prop('formenctype', 'string', { default: '', platform: 'web' }),
    prop('formmethod', 'string', { default: '', platform: 'web' }),
    prop('formnovalidate', 'boolean', { default: false, platform: 'web' }),
    prop('formtarget', 'string', { default: '', platform: 'web' }),
    prop('name', 'string', { default: '', platform: 'web' }),
    prop('type', ['button', 'submit', 'reset'], { default: 'button', platform: 'web' }),
  ],
  states: ['pending', 'pressed', 'settled'],
  tree: [
    pressable(
      'button',
      {
        busy: bind('pending'),
        chooses: true,
        disabled: bind('disabled'),
        expanded: bind('expanded'),
        'focusable-when-disabled': bind('focusable-when-disabled'),
        label: bind('label'),
        popup: bind('popup'),
        pressed: bind('pressed'),
        role: 'button',
        sends: 'press',
      },
      [
        region('start'),
        region('default', { part: 'text' }),
        region('end'),
        when('pending', box('spinner', { decorative: true })),
      ],
    ),
    live('live', { says: bind('pending-label'), while: bind('pending') }),
  ],
})
