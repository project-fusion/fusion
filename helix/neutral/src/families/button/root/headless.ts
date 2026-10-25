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
 * Button's headless tier: what it takes, what it sends, and its parts.
 *
 * **A Button Group presses it.** In a group with a `selection-mode`, a button
 * with a `value` joins the group's set: its press, a tap, Space, or Enter,
 * presses or releases it, and while it is pressed it is in its `pressed`
 * state, announced as a toggle button, or as a radio under `single`. Outside
 * a group, and in a group without one, it is a button of its own. `pressed`
 * is the group's to write, as on the web.
 *
 * **Held to Button's web element.** `helix family check` compares these props,
 * the event, the states, the regions, and the parts with what the manifest
 * says `helix-button` has, so the source cannot drop or invent one unseen.
 */
export default headless('button', {
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
