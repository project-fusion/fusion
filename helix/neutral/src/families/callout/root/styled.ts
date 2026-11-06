import { oneOf } from '../../../render.js'
import {
  difference,
  fn,
  list,
  mix,
  native,
  product,
  quotient,
  scheme,
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
      gap: token('space-field'),
      padding: token('space-control'),
      radius: token('radii-md'),
    }),
    own: {
      calloutBar: null,
      calloutColor: null,
      calloutIcon: null,
      calloutInset: null,
      calloutLine: null,
      calloutTone: null,
    },
    props: { separation: oneOf(['filled', 'outlined', 'plain']) },
    stylesheet: 'callout/root/callout-root.generated.css',
  },
  ({ hook, on, own, rule, variants }) => {
    const iconSize = token('size-icon')
    /* The mark's step: the tight icon, never under the small one. */
    const mark = own.calloutIcon
    const dismissGlyph = {
      '--icon-size': token('size-icon-tight'),
      blockSize: token('size-icon-tight'),
      inlineSize: token('size-icon-tight'),
    } as const
    return [
      on('host', [
        rule({
          own: {
            calloutTone: token('color-info'),
            calloutColor: hook.accentColor,
            calloutBar: hook.barThickness,
            calloutInset: hook.padding,
            calloutIcon: fn('max', token('size-icon-tight'), token('size-icon-sm')),
          },
          fontSize: hook.fontSize,
          /* 18% in dark, where 10% of a status ink barely parted from the black page. */
          backgroundColor: hook.backgroundColor(
            scheme(
              mix(own.calloutColor, 10, 'transparent'),
              mix(own.calloutColor, 18, 'transparent'),
            ),
          ),
          /* A hairline of the tone. */
          boxShadow: [
            'inset',
            0,
            0,
            0,
            token('border-thin'),
            mix(own.calloutColor, 28, token('color-background')),
          ],
          position: 'relative',
          borderRadius: hook.radius,
          /* Clipped by the box, the bar with it; `clip` on the web, which starts no
             scroll container. */
          web: { overflow: 'clip' },
          color: token('color-foreground'),
          display: 'flex',
          gap: hook.gap,
          padding: own.calloutInset,
          paddingInlineStart: sum(own.calloutInset, own.calloutBar),
        }),
        /* One line of the content, which the mark centers on: a whole pixel on the web. */
        web([
          rule({
            own: {
              calloutLine: fn(
                'round',
                'up',
                product(hook.fontSize, token('leading-normal')),
                '1px',
              ),
            },
          }),
        ]),
        native([
          rule({
            overflow: 'hidden',
            own: { calloutLine: product(hook.fontSize, token('leading-normal')) },
          }),
        ]),
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
            /* Square, as a quotation's rule is, since nothing else of the box is drawn:
               the corner clipped the bar at both ends into a crescent. */
            borderRadius: hook.radius(token('radii-none')),
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
      /* Centered on the first line of the content, whatever its size. */
      on('icon', [
        rule({
          color: own.calloutColor,
          display: 'inline-flex',
          flex: '0 0 auto',
          web: {
            marginBlockStart: fn(
              'max',
              token('space-none'),
              fn('round', 'down', quotient(difference(own.calloutLine, mark), 2), '1px'),
            ),
          },
        }),
        native([
          rule({
            marginBlockStart: fn(
              'max',
              token('space-none'),
              quotient(difference(own.calloutLine, mark), 2),
            ),
          }),
        ]),
      ]),
      on('icon-mark', [rule({ blockSize: mark, inlineSize: mark })]),
      on({ region: 'icon', slotted: '*' }, [
        rule({ '--icon-size': mark, blockSize: mark, inlineSize: mark }),
      ]),
      /* A view does not shrink as a browser's flex item does, so on a phone
         the content takes the room the dismiss button leaves it. */
      on('content', [
        /* A long unbroken word breaks inside the column it was given. */
        rule({
          lineHeight: own.calloutLine,
          minInlineSize: 0,
          web: { overflowWrap: 'break-word' },
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
      /* Smaller than the callout's own mark, which leads the message: the dismiss
         is a control at the end of it, drawn as Announcement, Notification and
         Toast draw theirs. */
      on(['dismiss-mark'], [rule(dismissGlyph)]),
      on({ region: 'dismiss-icon', slotted: '*' }, [rule(dismissGlyph)]),
      /* A link passed in reads as a link: the primary ink, underlined quietly. */
      on({ region: 'default', slotted: 'a:not([data-link])' }, [
        web([
          rule({
            color: token('color-primary'),
            textDecoration: 'underline',
            textDecorationColor: mix('currentColor', 35, 'transparent'),
            textDecorationThickness: token('border-thin'),
            textUnderlineOffset: '0.25em',
          }),
        ]),
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
