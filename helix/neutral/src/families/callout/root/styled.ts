import { oneOf } from '../../../render.js'
import { list, mix, native, product, sum, token, web } from '../../../style.js'
import { styles } from '../../../table.js'
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
    hooks: ({ own }) => ({
      accentColor: own.calloutTone,
      backgroundColor: null,
      barThickness: token('border-thick'),
      fontSize: token('text-control'),
      gap: token('space-sm'),
      padding: token('space-control'),
      radius: token('radii-sm'),
    }),
    own: { calloutBar: null, calloutColor: null, calloutInset: null, calloutTone: null },
    props: { separation: oneOf(['filled', 'outlined', 'plain']) },
    stylesheet: 'callout/root/callout-root.generated.css',
  },
  ({ hook, on, own, rule, variants }) => {
    const iconSize = token('size-icon')
    return [
      on('host', [
        rule({
          own: {
            calloutTone: token('color-info'),
            calloutColor: hook.accentColor,
            calloutBar: hook.barThickness,
            calloutInset: hook.padding,
          },
          fontSize: hook.fontSize,
          backgroundColor: hook.backgroundColor(mix(own.calloutColor, 10, 'transparent')),
          overflow: 'hidden',
          position: 'relative',
          borderRadius: hook.radius,
          color: token('color-foreground'),
          display: 'flex',
          gap: hook.gap,
          padding: own.calloutInset,
          paddingInlineStart: sum(own.calloutInset, own.calloutBar),
        }),
        variants('tone', {
          danger: { own: { calloutTone: token('color-danger') } },
          neutral: { own: { calloutTone: token('color-foreground-muted') } },
          success: { own: { calloutTone: token('color-success') } },
          warning: { own: { calloutTone: token('color-warning') } },
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
              mix(own.calloutColor, 45, token('color-background')),
            ],
          },
        ),
        rule({ separation: 'plain' }, { backgroundColor: hook.backgroundColor('transparent') }),
        rule(
          { exiting: true },
          {
            opacity: 0,
            transition: ['opacity', token('duration-normal'), token('easing-accelerate')],
          },
        ),
        rule(
          { entering: true },
          { transition: ['opacity', token('duration-normal'), token('easing-decelerate')] },
        ),
        rule({ startingStyle: true, entering: true }, { opacity: 0 }),
        rule(
          [
            { reducedMotion: true, exiting: true },
            { reducedMotion: true, entering: true },
          ],
          { transition: 'none' },
        ),
        /* A phone draws nothing of a callout once it has faded out. */
        native([rule({ closed: true }, { display: 'none' })]),
        rule({ print: true }, { backgroundColor: 'transparent' }),
      ]),
      /* The tone's edge. Straight, and clipped to the host's corners. */
      on({ before: 'host' }, [
        rule({
          backgroundColor: own.calloutColor,
          content: '""',
          inlineSize: own.calloutBar,
          insetBlock: 0,
          insetInlineStart: 0,
          position: 'absolute',
        }),
      ]),
      on('icon', [rule({ color: own.calloutColor, display: 'inline-flex', flex: '0 0 auto' })]),
      on('icon-mark', [rule({ blockSize: iconSize, inlineSize: iconSize })]),
      on({ region: 'icon', slotted: '*' }, [
        rule({ '--icon-size': iconSize, blockSize: iconSize, inlineSize: iconSize }),
      ]),
      /* A view does not shrink as a browser's flex item does, so on a phone
         the content takes the room the dismiss button leaves it. */
      on('content', [
        rule({ lineHeight: token('leading-normal'), minInlineSize: 0 }),
        native([rule({ flex: '1 1 auto' })]),
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
          fontSize: hook.fontSize,
          fontWeight: token('weight-semibold'),
          margin: token('space-none'),
        }),
      ]),
    ]
  },
)
