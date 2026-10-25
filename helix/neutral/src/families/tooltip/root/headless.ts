import {
  bind,
  box,
  derive,
  event,
  headless,
  layer,
  pick,
  prop,
  region,
  text,
  toggle,
  wrap,
} from '../../../tree.js'

/**
 * Tooltip's headless tier: a short text that appears next to its trigger,
 * opened on `open`.
 *
 * **The trigger is passed in, and the tooltip describes it** with the words
 * of `content`, or of the content passed into `content`: a phone's hint,
 * and the trigger's description on the web. A trigger already named by
 * those words is not described by them again.
 *
 * **It shows as a reader asks**: on the web, as the pointer rests on the
 * trigger for `delay` or focus lands on it, and it hides `delay-out` after
 * the pointer leaves, on blur, and on Escape. A phone has no pointer to
 * rest, so a long press on the trigger shows it, where the trigger has no
 * long press of its own, as the plan for hover-only patterns says, and a
 * touch elsewhere or a close request hides it. **Using the trigger hides
 * it**, unless `persist` is set, for words that change to say what the
 * trigger did, as a copy button's do. `disabled` keeps it from showing.
 *
 * **Every way it shows and hides asks first**: `before-open` and
 * `before-close`, which a handler may refuse, and `toggle` is sent once it
 * stands the other way. The bubble stands on the side `placement` names,
 * `offset` from the trigger to the tip of its arrow, and turns to another
 * side where that one has no room.
 *
 * **The web's**: `for`, which names a trigger by its id, `hoverable`,
 * `show-on`, `skip-delay`, `within`, and the delays, which time a pointer.
 * A phone has no document to find a trigger in and no pointer to time.
 *
 * **Held to `helix-tooltip`.** `helix family check` compares the props, the
 * events, the states, the regions, and the parts with what the manifest says
 * the element has.
 */
export default headless('tooltip', {
  derived: { hint: derive('tooltip-hint') },
  events: [
    event('before-close', { cancelable: true, detail: ['open'] }),
    event('before-open', { cancelable: true, detail: ['open'] }),
    event('toggle', { bare: true, detail: ['newState', 'oldState'] }),
  ],
  props: [
    prop('content', 'string', { default: '' }),
    prop('default-open', 'boolean', { default: false }),
    prop('disabled', 'boolean', { default: false }),
    prop('offset', 'number', { default: 8 }),
    prop('open', 'boolean'),
    prop('persist', 'boolean', { default: false }),
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
      { default: 'top' },
    ),
    /* What a pointer and a document have. */
    prop('delay', 'number', { default: 400, platform: 'web' }),
    prop('delay-out', 'number', { default: 100, platform: 'web' }),
    prop('for', 'string', { default: '', platform: 'web' }),
    prop('hoverable', 'boolean', { default: true, platform: 'web' }),
    prop('show-on', ['focus'], { platform: 'web' }),
    prop('skip-delay', 'number', { default: 300, platform: 'web' }),
    prop('within', 'string', { default: '', platform: 'web' }),
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
    readonly: 'disabled',
  }),
  tree: [
    /* The trigger's own box on a phone, which the bubble is placed against.
       The web places it against the trigger passed in. */
    wrap('trigger', { platform: 'native', while: true }, [region('default')]),
    layer(
      'surface',
      {
        also: {
          'surface-bottom': bind('placed-bottom'),
          'surface-left': bind('placed-left'),
          'surface-right': bind('placed-right'),
          'surface-top': bind('placed-top'),
        },
        anchor: 'trigger',
        arrow: 'arrow',
        closedby: 'any',
        hint: bind('hint'),
        offset: bind('offset'),
        open: bind('open'),
        placement: bind('placement'),
        presses: pick('persist', { true: 'none' }, 'close'),
        role: 'tooltip',
      },
      [
        box('arrow', {
          also: {
            'arrow-bottom': bind('placed-bottom'),
            'arrow-left': bind('placed-left'),
            'arrow-right': bind('placed-right'),
            'arrow-top': bind('placed-top'),
          },
        }),
        region('content', {}, [text('words', { says: bind('content') })]),
      ],
    ),
  ],
})
