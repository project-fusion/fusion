import { mix, product, token, web } from '../../../style.js'
import { styles } from '../../../table.js'
import root from './headless.js'

/**
 * Drilldown's styled tier, which writes
 * `helix/styled/src/drilldown/root/drilldown-root.generated.css`.
 *
 * **A region, not an overlay**: it sits where it is put, with a fill and a
 * width and no shadow, and clips the page that slides in. The header over a
 * page below the top holds the way back and the page's name, a step taller
 * than the rows. **The page slides in from the side it came from**, a
 * share of its width with a fade, and is simply there under reduced motion.
 * The words shown in place of rows are quiet and centered, as every
 * collection draws them, and rows that are already there dim while new ones
 * load. Print leaves it out, and is the web's.
 */
export default styles(
  root,
  {
    prefix: 'drilldown',
    hooks: [
      'back-color',
      'back-hover-background-color',
      'background-color',
      'duration',
      'header-block-size',
      'header-border-color',
      'inline-size',
      'page-padding-block',
      'title-color',
      'title-font-size',
      'title-font-weight',
      'travel',
    ],
    own: ['drilldown-sign'],
    stylesheet: 'drilldown/root/drilldown-root.generated.css',
  },
  ({ hook, keyframes, on, own, rule }) => {
    const ring = [token('size-focus-ring'), 'solid', token('color-focus-ring')] as const
    const travel = product(hook.travel('12%'), own.sign(1))
    const duration = hook.duration(token('duration-normal'))
    return [
      on('host', [
        rule({
          backgroundColor: hook.backgroundColor(token('color-surface')),
          blockSize: 'fit-content',
          display: 'block',
          inlineSize: hook.inlineSize('100%'),
          overflow: 'hidden',
        }),
        rule({ print: true }, { display: 'none' }),
      ]),
      /* The way back and the page's name, a step taller than the rows. */
      on('header', [
        rule({
          alignItems: 'center',
          blockSize: hook.headerBlockSize(token('size-control')),
          borderBlockEnd: [
            token('border-thin'),
            'solid',
            hook.headerBorderColor(token('color-border')),
          ],
          display: 'flex',
          gap: token('space-2xs'),
          paddingInline: token('space-2xs'),
        }),
      ]),
      on('back', [
        rule({
          all: web('unset'),
          alignItems: 'center',
          blockSize: token('size-control-tight'),
          borderRadius: token('radii-sm'),
          boxSizing: 'border-box',
          color: hook.backColor(token('color-foreground-muted')),
          cursor: web('pointer'),
          display: 'flex',
          inlineSize: token('size-control-tight'),
          justifyContent: 'center',
        }),
      ]),
      on('back-mark', [
        rule({ blockSize: token('size-icon-tight'), inlineSize: token('size-icon-tight') }),
        /* The caret points back along the line, so it turns in a
           right-to-left page, as the web's mirror rule turns it. */
        rule({ dir: 'rtl', platform: 'native' }, { scale: '-1 1' }),
      ]),
      on({ region: 'back-icon', slotted: '*' }, [
        rule({ blockSize: token('size-icon-tight'), inlineSize: token('size-icon-tight') }),
      ]),
      on('back', [
        rule(
          { hover: true },
          {
            backgroundColor: hook.backHoverBackgroundColor(
              mix(token('color-foreground'), 8, 'transparent'),
            ),
            color: token('color-foreground'),
          },
        ),
        rule({ focusVisible: true }, { outline: ring, outlineOffset: token('size-focus-offset') }),
      ]),
      on('title', [
        rule({
          color: hook.titleColor(token('color-foreground')),
          fontFamily: token('font-sans'),
          fontSize: hook.titleFontSize(token('text-sm')),
          fontWeight: hook.titleFontWeight(token('weight-medium')),
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }),
      ]),
      /* The page slides in from the side it came from, toward which the
         text runs going deeper. */
      on('page', [
        rule({
          own: { sign: 1 },
          paddingBlock: hook.pagePaddingBlock(token('space-2xs')),
        }),
        rule({ dir: 'rtl' }, { own: { sign: '-1' } }),
        rule(
          { state: 'forward' },
          { animation: ['drilldown-forward', duration, token('easing-decelerate')] },
        ),
        rule(
          { state: 'back' },
          { animation: ['drilldown-back', duration, token('easing-decelerate')] },
        ),
      ]),
      keyframes('drilldown-forward', { from: { opacity: 0, translate: [travel, 0] } }),
      keyframes('drilldown-back', {
        from: { opacity: 0, translate: [product(travel, '-1'), 0] },
      }),
      /* The instant swap: the header and the title still say where you are. */
      on('page', [
        rule({ reducedMotion: true, state: 'forward' }, { animation: 'none' }),
        rule({ reducedMotion: true, state: 'back' }, { animation: 'none' }),
      ]),
      /* What a collection says in place of rows, quiet and centered. */
      on(
        ['empty', 'loading'],
        [
          rule({
            color: token('color-foreground-muted'),
            fontFamily: token('font-sans'),
            fontSize: token('text-sm'),
            margin: token('space-none'),
            paddingBlock: token('space-md'),
            paddingInline: token('space-sm'),
            textAlign: 'center',
          }),
        ],
      ),
      /* Rows that are already there dim, and hold still, while new ones load. */
      on('page', [rule({ loading: true }, { opacity: 0.5 })]),
    ]
  },
)
