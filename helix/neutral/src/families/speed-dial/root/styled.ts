import { oneOf } from '../../../render.js'
import { hookOf, list, native, product, quotient, token, web } from '../../../style.js'
import { styles } from '../../../table.js'
import root from './headless.js'

/**
 * Speed Dial's styled tier, which writes
 * `helix/styled/src/speed-dial/root/speed-dial-root.generated.css`.
 *
 * **The drawn trigger is a round button in the primary surface**, raised,
 * lifted further under the pointer and set down as it is pressed, with a
 * plus at the icon size. **The actions are a column with no surface of
 * their own**, lined up on the end of the trigger they open from, and the
 * dial hands each action which way its name and its mark run.
 *
 * **They arrive from the button**, each a little smaller and a step toward
 * it, once the column is placed, one after another, nearest the button
 * first, and are simply there under reduced motion. Under `labels="hover"`
 * each name shows only while its action is under the pointer or has focus,
 * and takes no press. Print leaves the dial out, and is the web's.
 */
export default styles(
  root,
  {
    prefix: 'speed-dial',
    hooks: {
      backgroundColor: token('color-primary-surface'),
      color: token('color-foreground-on-primary'),
      gap: token('space-sm'),
      shadow: token('shadow-md'),
      size: token('size-control'),
      stagger: null,
      travel: token('space-md'),
    },
    own: [
      'dial-from',
      'speed-dial-align',
      'speed-dial-label-opacity',
      'speed-dial-row',
      'speed-dial-stagger',
    ],
    props: { labels: oneOf(['hover']) },
    stylesheet: 'speed-dial/root/speed-dial-root.generated.css',
  },
  ({ hook, on, own, rule }) => {
    const ring = [token('size-focus-ring'), 'solid', token('color-focus-ring')] as const
    const travel = hook.travel
    const fast = token('duration-fast')
    const arrived = { opacity: 1, scale: 1, translate: [0, 0] } as const
    return [
      /* The trigger's own box, which docks as anything else does. */
      on('host', [rule({ display: 'inline-flex' })]),
      on('actions', [
        rule({
          backgroundColor: 'transparent',
          border: 'none',
          display: 'flex',
          flexDirection: 'column',
          gap: hook.gap,
          margin: token('space-none'),
          overflow: 'visible',
          padding: token('space-none'),
        }),
        /* Lined up on the end the trigger is on, the row order handed down. */
        rule({ own: { row: 'row-reverse' }, alignItems: 'flex-end' }),
        rule(
          { state: 'alignedStart' },
          { own: { align: 'flex-start', row: 'row' }, alignItems: 'flex-start' },
        ),
      ]),
      on({ part: 'actions', selector: '[part="actions"][hidden]' }, [
        web([rule({ display: 'none' })]),
      ]),
      /* They arrive from the button, once the column is placed. */
      on('actions', [
        rule({ own: { dialFrom: travel } }),
        rule({ state: 'placedBottom' }, { own: { dialFrom: product(travel, '-1') } }),
      ]),
      on({ region: 'default', slotted: '*' }, [
        rule({
          opacity: 0,
          scale: 0.8,
          transition: list(
            ['opacity', fast, token('easing-standard')],
            ['scale', fast, token('easing-emphasized')],
            ['translate', fast, token('easing-emphasized')],
          ),
          translate: [0, own.dialFrom],
        }),
        /* A phone reads the side the column landed on, which it is given
           once it is placed. */
        native([
          rule(
            [
              { state: 'placedBottom' },
              { state: 'placedLeft' },
              { state: 'placedRight' },
              { state: 'placedTop' },
            ],
            arrived,
          ),
        ]),
      ]),
      on({ part: 'actions', selector: '[part="actions"][data-placed] ::slotted(*)' }, [
        web([rule(arrived)]),
      ]),
      /* Nearest the button first, counting from the end where the column
         runs upward and from the start where it runs down. */
      on('host', [rule({ own: { stagger: hook.stagger(quotient(fast, 3)) } })]),
      on(
        {
          part: 'actions',
          selector: '[part="actions"][data-placed] ::slotted(:nth-last-child(2))',
        },
        [web([rule({ transitionDelay: own.stagger })])],
      ),
      on(
        {
          part: 'actions',
          selector: '[part="actions"][data-placed] ::slotted(:nth-last-child(3))',
        },
        [web([rule({ transitionDelay: product(own.stagger, 2) })])],
      ),
      on(
        {
          part: 'actions',
          selector: '[part="actions"][data-placed] ::slotted(:nth-last-child(4))',
        },
        [web([rule({ transitionDelay: product(own.stagger, 3) })])],
      ),
      on(
        {
          part: 'actions',
          selector: '[part="actions"][data-placed] ::slotted(:nth-last-child(n + 5))',
        },
        [web([rule({ transitionDelay: product(own.stagger, 4) })])],
      ),
      on(
        {
          part: 'actions',
          selector:
            ':host(:state(placed-bottom)) [part="actions"][data-placed] ::slotted(:nth-child(2))',
        },
        [web([rule({ transitionDelay: own.stagger })])],
      ),
      on(
        {
          part: 'actions',
          selector:
            ':host(:state(placed-bottom)) [part="actions"][data-placed] ::slotted(:nth-child(3))',
        },
        [web([rule({ transitionDelay: product(own.stagger, 2) })])],
      ),
      on(
        {
          part: 'actions',
          selector:
            ':host(:state(placed-bottom)) [part="actions"][data-placed] ::slotted(:nth-child(4))',
        },
        [web([rule({ transitionDelay: product(own.stagger, 3) })])],
      ),
      on(
        {
          part: 'actions',
          selector:
            ':host(:state(placed-bottom)) [part="actions"][data-placed] ::slotted(:nth-child(n + 5))',
        },
        [web([rule({ transitionDelay: product(own.stagger, 4) })])],
      ),
      /* A phone times them by the same places, once the column is placed:
         from the end where it runs upward or beside the button, and from the
         start where it runs down. */
      on({ region: 'default', slotted: '*' }, [
        native([
          rule(
            [
              { nthLast: 2, state: 'placedTop' },
              { nthLast: 2, state: 'placedLeft' },
              { nthLast: 2, state: 'placedRight' },
              { nth: 2, state: 'placedBottom' },
            ],
            { transitionDelay: own.stagger },
          ),
          rule(
            [
              { nthLast: 3, state: 'placedTop' },
              { nthLast: 3, state: 'placedLeft' },
              { nthLast: 3, state: 'placedRight' },
              { nth: 3, state: 'placedBottom' },
            ],
            { transitionDelay: product(own.stagger, 2) },
          ),
          rule(
            [
              { nthLast: 4, state: 'placedTop' },
              { nthLast: 4, state: 'placedLeft' },
              { nthLast: 4, state: 'placedRight' },
              { nth: 4, state: 'placedBottom' },
            ],
            { transitionDelay: product(own.stagger, 3) },
          ),
          rule(
            [
              { nthLast: { from: 5 }, state: 'placedTop' },
              { nthLast: { from: 5 }, state: 'placedLeft' },
              { nthLast: { from: 5 }, state: 'placedRight' },
              { nth: { from: 5 }, state: 'placedBottom' },
            ],
            { transitionDelay: product(own.stagger, 4) },
          ),
        ]),
        /* Put down where they belong. */
        rule(
          { reducedMotion: true },
          { opacity: 1, scale: 1, transition: 'none', transitionDelay: '0s', translate: [0, 0] },
        ),
      ]),
      /* The trigger the dial draws where none is passed in. */
      on('trigger', [
        rule({
          all: web('unset'),
          '--icon-size': token('size-icon'),
          alignItems: 'center',
          backgroundColor: hook.backgroundColor,
          blockSize: hook.size,
          borderRadius: token('radii-full'),
          boxShadow: hook.shadow,
          boxSizing: 'border-box',
          color: hook.color,
          cursor: web('pointer'),
          display: 'inline-flex',
          inlineSize: hook.size,
          justifyContent: 'center',
          transition: ['box-shadow', fast, token('easing-standard')],
        }),
        rule({ hover: true }, { boxShadow: token('shadow-lg') }),
        rule({ active: true }, { boxShadow: token('shadow-sm') }),
        rule({ focusVisible: true }, { outline: ring, outlineOffset: token('size-focus-offset') }),
        /* The lift arrives at once under reduced motion. */
        rule({ reducedMotion: true }, { transition: 'none' }),
      ]),
      /* A glyph of your own takes the plus's size, and so does the plus. */
      on({ region: 'icon', slotted: '*' }, [
        rule({ blockSize: hookOf('icon', 'size'), inlineSize: hookOf('icon', 'size') }),
      ]),
      on('icon-mark', [
        native([
          rule({ blockSize: token('size-icon'), flex: '0 0 auto', inlineSize: token('size-icon') }),
        ]),
      ]),
      on('host', [rule({ print: true }, { display: 'none' })]),
      /* Names on demand: each shows while its action is under the pointer
         or has focus, and only the marks take a press. */
      on('host', [rule({ labels: 'hover' }, { own: { labelOpacity: 0 } })]),
      on('actions', [rule({ labels: 'hover' }, { pointerEvents: 'none' })]),
      on({ region: 'default', slotted: '*' }, [
        rule({ labels: 'hover' }, { pointerEvents: 'none' }),
      ]),
    ]
  },
)
