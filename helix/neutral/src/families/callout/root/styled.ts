import { list, mix, product, sum, token, web } from '../../../style.js'
import { styles } from '../../../table.js'
import { prop } from '../../../tree.js'
import root from './headless.js'

/**
 * Callout's styled tier, which writes
 * `helix/styled/src/callout/root/callout-root.generated.css`.
 *
 * **The host is the box, rounded on every corner, and the tone's edge is a
 * bar inside it, clipped by it.** A thick border on one rounded side thins
 * to nothing at each end, and squaring two corners gives up the shape. A
 * straight bar the box clips has neither problem.
 *
 * **The tint, the bar and the mark are the tone**, or a color of the page's
 * own through `--callout-accent-color`, and `neutral` keeps to the muted ink,
 * since a note that reports no status has no hue to say. `separation` is
 * where the box ends: the tint with the bar, an edge of the tone with no
 * fill, or the bar and the mark alone. The bar stays in every one, being
 * what says the tone where the hue is not seen.
 *
 * **The inset and the type are the controls' steps**, so a callout in a
 * `data-density` region is as tight as the controls beside it.
 *
 * **A dismissed callout fades out before it hides, and in as it shows
 * again**, at once under reduced motion. Print draws the edge and the mark
 * in ink with no fill, and is the web's.
 */
export default styles(
  root,
  {
    prefix: 'callout',
    hooks: [
      'accent-color',
      'background-color',
      'bar-thickness',
      'font-size',
      'gap',
      'padding',
      'radius',
    ],
    own: ['callout-bar', 'callout-color', 'callout-inset', 'callout-tone'],
    props: [prop('separation', ['filled', 'outlined', 'plain'])],
    stylesheet: 'callout/root/callout-root.generated.css',
  },
  ({ hook, on, own, rule, variants }) => {
    const iconSize = token('size-icon')
    return [
      on('host', [
        rule({
          own: {
            tone: token('color-info'),
            color: hook.accentColor(own.tone),
            bar: hook.barThickness(token('border-thick')),
            inset: hook.padding(token('space-control')),
          },
          fontSize: hook.fontSize(token('text-control')),
          backgroundColor: hook.backgroundColor(mix(own.color, 10, 'transparent')),
          overflow: 'hidden',
          position: 'relative',
          borderRadius: hook.radius(token('radii-sm')),
          color: token('color-foreground'),
          display: 'flex',
          gap: hook.gap(token('space-sm')),
          padding: own.inset,
          paddingInlineStart: sum(own.inset, own.bar),
        }),
        variants('tone', {
          danger: { own: { tone: token('color-danger') } },
          neutral: { own: { tone: token('color-foreground-muted') } },
          success: { own: { tone: token('color-success') } },
          warning: { own: { tone: token('color-warning') } },
        }),
        rule(
          { separation: 'outlined' },
          {
            backgroundColor: hook.backgroundColor('transparent'),
            boxShadow: [
              'inset',
              0,
              0,
              0,
              token('border-thin'),
              mix(own.color, 45, token('color-background')),
            ],
          },
        ),
        rule({ separation: 'plain' }, { backgroundColor: hook.backgroundColor('transparent') }),
        rule(
          { state: 'exiting' },
          {
            opacity: 0,
            transition: ['opacity', token('duration-normal'), token('easing-accelerate')],
          },
        ),
        rule(
          { state: 'entering' },
          { transition: ['opacity', token('duration-normal'), token('easing-decelerate')] },
        ),
        rule({ entering: true, state: 'entering' }, { opacity: 0 }),
        rule(
          [
            { reducedMotion: true, state: 'exiting' },
            { reducedMotion: true, state: 'entering' },
          ],
          { transition: 'none' },
        ),
        /* A phone draws nothing of a callout once it has faded out. */
        rule({ platform: 'native', state: 'closed' }, { display: 'none' }),
        rule({ print: true }, { backgroundColor: 'transparent' }),
      ]),
      /* The tone's edge. Straight, and clipped to the host's corners. */
      on({ before: 'host' }, [
        rule({
          backgroundColor: own.color,
          content: '""',
          inlineSize: own.bar,
          insetBlock: 0,
          insetInlineStart: 0,
          position: 'absolute',
        }),
      ]),
      on('icon', [rule({ color: own.color, display: 'inline-flex', flex: '0 0 auto' })]),
      on('icon-mark', [rule({ blockSize: iconSize, inlineSize: iconSize })]),
      on({ region: 'icon', slotted: '*' }, [
        rule({ '--icon-size': iconSize, blockSize: iconSize, inlineSize: iconSize }),
      ]),
      /* A view does not shrink as a browser's flex item does, so on a phone
         the content takes the room the dismiss button leaves it. */
      on('content', [
        rule({ lineHeight: token('leading-normal'), minInlineSize: 0 }),
        rule({ platform: 'native' }, { flex: '1 1 auto' }),
      ]),
      /* At the end of the first line, as quiet as the mark at the start. */
      on('dismiss', [
        rule({
          all: web('unset'),
          boxSizing: 'border-box',
          blockSize: sum(iconSize, product(token('space-2xs'), 2)),
          borderRadius: token('radii-sm'),
          color: token('color-foreground-muted'),
          cursor: web('pointer'),
          display: 'inline-flex',
          flex: '0 0 auto',
          inlineSize: sum(iconSize, product(token('space-2xs'), 2)),
          marginBlock: product(token('space-2xs'), '-1'),
          marginInline: ['auto', product(token('space-2xs'), '-1')],
          placeContent: 'center',
          placeItems: 'center',
          transition: list(
            ['background-color', token('duration-fast'), token('easing-standard')],
            ['color', token('duration-fast'), token('easing-standard')],
          ),
        }),
        rule(
          { hover: true },
          {
            backgroundColor: mix(token('color-foreground'), 8, 'transparent'),
            color: token('color-foreground'),
          },
        ),
        rule(
          { focusVisible: true },
          {
            outline: [token('size-focus-ring'), 'solid', token('color-focus-ring')],
            outlineOffset: token('size-focus-offset'),
          },
        ),
        rule({ reducedMotion: true }, { transition: 'none' }),
      ]),
      on(
        ['dismiss-mark'],
        [rule({ '--icon-size': iconSize, blockSize: iconSize, inlineSize: iconSize })],
      ),
      on({ region: 'dismiss-icon', slotted: '*' }, [
        rule({ '--icon-size': iconSize, blockSize: iconSize, inlineSize: iconSize }),
      ]),
      /* The heading on a line of its own, over the content. */
      on({ region: 'heading', slotted: '*' }, [
        rule({
          color: token('color-foreground'),
          display: 'block',
          fontSize: hook.fontSize(token('text-control')),
          fontWeight: token('weight-semibold'),
          margin: token('space-none'),
        }),
      ]),
    ]
  },
)
