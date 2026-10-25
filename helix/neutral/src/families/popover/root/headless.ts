import {
  bind,
  box,
  derive,
  event,
  headless,
  layer,
  live,
  prop,
  region,
  toggle,
  when,
  wrap,
} from '../../../tree.js'

/**
 * Popover's headless tier: a panel that opens next to its trigger and holds
 * any content, opened on `open`.
 *
 * **A press on the trigger opens it, and closes it while it is open.** The
 * trigger is passed into `trigger`, and the panel is placed against it on
 * the side `placement` names, turned to the other side where that one has
 * no room unless `flip` is false, `offset` from it and slid along it by
 * `cross-offset`. A trigger that says whether it is expanded, as a Button
 * does, says whether the panel is open.
 *
 * **Every way out asks `before-close` first**, which a handler may refuse:
 * a close request, which is Escape, a phone's back, or a screen reader's
 * escape, and a press outside the panel. `toggle` is sent once it stands
 * open or closed. Opening moves focus into the panel, and closing from
 * inside gives it back to the trigger.
 *
 * **`modal` holds the reader in the panel** while it is open, as a dialog
 * does, and a press outside and a close request still close it. `arrow`
 * draws a point on the panel's edge facing the trigger.
 *
 * **Its name is `label`**, then `fallback-label`. A phone says its name as
 * it opens.
 *
 * **The web's**: the invoker commands, an `anchor` other than the trigger,
 * `container-padding`, a name taken from the first heading inside, a press
 * a command's invoker sends, and focus moving out of the trigger and the
 * panel closing it. A phone has no command, no document to find an element
 * in by its id, and keeps every layer 8 points from the window's edges.
 *
 * **Held to `helix-popover`.** `helix family check` compares the props, the
 * events, the states, the regions, and the parts with what the manifest says
 * the element has.
 */
export default headless('popover', {
  derived: { name: derive('popover-name') },
  events: [
    event('before-close', { cancelable: true, detail: ['open'] }),
    event('before-open', { cancelable: true, detail: ['open'] }),
    event('toggle', { bare: true, detail: ['newState', 'oldState'] }),
  ],
  props: [
    prop('arrow', 'boolean', { default: false }),
    prop('cross-offset', 'number', { default: 0 }),
    prop('default-open', 'boolean', { default: false }),
    prop('fallback-label', 'string', { default: 'Popover' }),
    prop('flip', 'boolean', { default: true }),
    prop('label', 'string', { default: '' }),
    prop('modal', 'boolean', { default: false }),
    prop('offset', 'number', { default: 4 }),
    prop('open', 'boolean'),
    prop(
      'placement',
      [
        'bottom',
        'bottom-end',
        'bottom-start',
        'left',
        'left-end',
        'left-start',
        'right',
        'right-end',
        'right-start',
        'top',
        'top-end',
        'top-start',
      ],
      { default: 'bottom-start' },
    ),
    /* An element by its id, and the room kept from the window's edges. */
    prop('anchor', 'string', { default: '', platform: 'web' }),
    prop('container-padding', 'number', { platform: 'web' }),
  ],
  states: [
    'aligned-end',
    'aligned-start',
    'entering',
    'exiting',
    'open',
    'placed-bottom',
    'placed-left',
    'placed-right',
    'placed-top',
    'settled',
  ],
  toggle: toggle({
    changes: 'toggle',
    checked: 'open',
    closes: 'before-close',
    initial: 'default-open',
    opens: 'before-open',
  }),
  tree: [
    /* The trigger's own box on a phone, which the panel is placed against.
       The web places it against the trigger passed in. */
    wrap('trigger', { platform: 'native', while: true }, [region('trigger')]),
    layer(
      'surface',
      {
        anchor: 'trigger',
        arrow: 'arrow',
        closedby: 'any',
        'cross-offset': bind('cross-offset'),
        flip: bind('flip'),
        label: bind('name'),
        modal: bind('modal'),
        offset: bind('offset'),
        open: bind('open'),
        placement: bind('placement'),
        presses: 'toggle',
        role: 'dialog',
      },
      [
        when(
          'arrow',
          box('arrow', {
            also: {
              'arrow-bottom': bind('placed-bottom'),
              'arrow-left': bind('placed-left'),
              'arrow-right': bind('placed-right'),
              'arrow-top': bind('placed-top'),
            },
            decorative: true,
          }),
        ),
        box('content', {}, [region('default')]),
        live('opening', { arrives: true, platform: 'native', says: bind('name') }),
      ],
    ),
  ],
})
