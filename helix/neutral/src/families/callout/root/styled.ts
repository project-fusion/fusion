import { oneOf } from '../../../render.js'
import {
  difference,
  list,
  mix,
  native,
  product,
  quotient,
  sum,
  token,
  web,
} from '../../../style.js'
import { styles } from '../../../table.js'
import root from './headless.js'

/**
 * Callout's styled tier.
 *
 * **The host is the box, rounded on every corner, with a hairline of the tone
 * inside it**, as a Tag draws, so a callout sits with its nearest relative.
 * **A bar is drawn inside the box and clipped by it**, where `plain` or
 * `--callout-bar-thickness` asks for one. A thick border on one rounded side
 * thins to nothing at each end, and squaring two corners gives up the shape.
 * A straight bar the box clips has neither problem.
 *
 * **The tint, the hairline and the mark are the tone**, or a color of the
 * page's own through `--callout-accent-color`, and `neutral` keeps to the muted
 * ink, since a note that reports no status has no hue to say. `separation` is
 * where the box ends: the tint with the hairline, an edge of the tone with no
 * fill, or a bar and the mark alone. The bar says the tone where there is no
 * box to carry it.
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
      barThickness: '0px',
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
          /* A hairline of the tone. */
          boxShadow: [
            'inset',
            0,
            0,
            0,
            token('border-thin'),
            mix(own.calloutColor, 28, token('color-background')),
          ],
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
          warning: { own: { calloutTone: token('color-warning-mark') } },
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
        /* The bar and the mark and nothing behind them, for an aside in running
           prose. */
        rule(
          { separation: 'plain' },
          {
            own: { calloutBar: hook.barThickness(token('border-thick')) },
            backgroundColor: hook.backgroundColor('transparent'),
            boxShadow: 'none',
          },
        ),
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
        /* The hairline is an inset shadow, which forced colors drop. */
        rule(
          { forcedColors: true },
          {
            outline: [token('border-thin'), 'solid', 'CanvasText'],
            outlineOffset: product(token('border-thin'), '-1'),
          },
        ),
        rule({ print: true }, { backgroundColor: 'transparent' }),
      ]),
      /* Written out: `tone` lists no `primary`, on the element as here, and the
         sheet draws one. A phone's callout takes the tones the prop lists. */
      on({ part: 'host', selector: ':host([tone="primary"])' }, [
        web([rule({ own: { calloutTone: token('color-primary') } })]),
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
        /* A long unbroken word breaks inside the column it was given. */
        rule({
          lineHeight: token('leading-normal'),
          minInlineSize: 0,
          web: { overflowWrap: 'anywhere' },
        }),
        native([rule({ flex: '1 1 auto' })]),
      ]),
      /* At the end of the first line, as quiet as the mark at the start. */
      on('dismiss', [
        rule({
          web: { all: 'unset', cursor: 'pointer' },
          boxSizing: 'border-box',
          position: 'relative',
          blockSize: sum(iconSize, product(token('space-2xs'), 2)),
          borderRadius: token('radii-sm'),
          color: token('color-foreground-muted'),
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
            backgroundColor: token('color-hover'),
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
      /* The press reaches `--helix-size-target`, in a transparent box, so nothing
         drawn moves. Where the control is already that size the box sits inside it. */
      on({ after: 'dismiss' }, [
        web([
          rule({
            content: '""',
            inset: quotient(difference(token('size-target'), '100%'), '-2'),
            position: 'absolute',
          }),
        ]),
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
