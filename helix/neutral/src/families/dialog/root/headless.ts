import {
  bind,
  box,
  derive,
  event,
  headless,
  layer,
  live,
  pick,
  pressable,
  prop,
  region,
  toggle,
  when,
} from '../../../tree.js'

/**
 * Dialog's headless tier: a modal window over the page, opened on `open`.
 *
 * **It holds the reader until it closes**: the page behind takes no press,
 * no focus, and nothing a screen reader reaches, and Tab goes round inside
 * it. Opening moves focus to its first control, and closing puts focus back
 * where it was.
 *
 * **Every way out asks `before-close` first**, which a handler may refuse:
 * a close request, which is Escape, a phone's back, or a screen reader's
 * escape; a press on the scrim; and the close control `dismissible` draws,
 * named by `dismiss-label`. `closedby` says which of the first two a reader
 * has, `any` where it names none, and `persistent` keeps both from closing
 * it, while the close control still closes it. A press on the scrim the
 * dialog keeps open makes the panel swell and settle, `data-refused` for
 * the length of that motion, so the reader sees it was heard. `toggle` is
 * sent once it stands open or closed, and `close` once it has closed.
 *
 * **Its name is `label`**, then the words of the title passed into
 * `header`, then `fallback-label`. `alert` makes it an alert dialog, for a
 * question that interrupts. A phone says its name as it opens, and an alert
 * dialog's words with it, since React Native has no dialog role for a screen
 * reader to read it by.
 *
 * **The web's**: the invoker commands, `close(value)` and `returnValue`, a
 * `<form method="dialog">` closing it, the page's scroll held still, and a
 * description drawn from the words at the start of its body. React Native
 * has no command or form to take, and a modal layer covers the page.
 *
 * **Held to `helix-dialog`.** `helix family check` compares the props, the
 * events, the states, the regions, and the parts with what the manifest says
 * the element has.
 */
export default headless('dialog', {
  derived: {
    'dismiss-name': derive('dialog-dismiss-name'),
    dismissal: derive('dialog-dismissal'),
    name: derive('dialog-name'),
    said: derive('dialog-said'),
  },
  events: [
    event('before-close', { cancelable: true, detail: ['open'] }),
    event('before-open', { cancelable: true, detail: ['open'] }),
    event('close', { bare: true }),
    event('toggle', { bare: true, detail: ['newState', 'oldState'] }),
  ],
  props: [
    prop('alert', 'boolean', { default: false }),
    prop('closedby', ['any', 'closerequest', 'none']),
    prop('default-open', 'boolean', { default: false }),
    prop('dismiss-label', 'string', { default: 'Close' }),
    prop('dismissible', 'boolean', { default: false }),
    prop('fallback-label', 'string', { default: 'Dialog' }),
    prop('label', 'string', { default: '' }),
    prop('open', 'boolean'),
    prop('persistent', 'boolean', { default: false }),
  ],
  states: ['entering', 'exiting', 'open', 'settled'],
  toggle: toggle({
    changes: 'toggle',
    checked: 'open',
    closed: 'close',
    closes: 'before-close',
    initial: 'default-open',
    opens: 'before-open',
  }),
  tree: [
    layer(
      'surface',
      {
        closedby: bind('dismissal'),
        label: bind('name'),
        modal: true,
        open: bind('open'),
        refuses: true,
        role: pick('alert', { true: 'alertdialog' }, 'dialog'),
      },
      [
        region('icon'),
        region('header', { part: 'header' }),
        region('default', { part: 'body' }),
        region('footer', { part: 'footer' }),
        when(
          'dismissible',
          pressable('dismiss', { label: bind('dismiss-name'), role: 'button', toggles: true }, [
            region('dismiss-icon', {}, [box('dismiss-mark', { decorative: true, glyph: 'x' })]),
          ]),
        ),
        live('opening', { arrives: true, platform: 'native', says: bind('said') }),
      ],
    ),
  ],
})
