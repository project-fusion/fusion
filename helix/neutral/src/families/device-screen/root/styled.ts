import touches from '../../../fragments/device-screen-touches.js'
import { oneOf } from '../../../render.js'
import {
  difference,
  fn,
  measured,
  mix,
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
 * Device Screen's styled tier: a dark body around a screen with rounded
 * corners, fitted to the space it is given, with its hardware buttons raised
 * in a row above it.
 *
 * **The body is measured in screens.** Every length of the body is a
 * fraction of the device's own width as drawn, so a device drawn small keeps
 * the proportions it has drawn large. The screen's width is whichever fits:
 * the box's width less the two sides, or its height less the top and
 * bottom, turned into a width by the screen's shape.
 */
export default styles(
  root,
  {
    prefix: 'device-screen',
    hooks: {
      bezel: 0.045,
      bezelBlock: null,
      bezelColor: scheme(
        mix(token('color-surface-media'), 86, token('color-foreground-media')),
        mix(token('color-surface-media'), 80, token('color-foreground-media')),
      ),
      bezelRadius: null,
      blockSize: '36rem',
      radius: 0.13,
    },
    own: {
      deviceScreenAcross: null,
      deviceScreenBeside: null,
      deviceScreenBlock: null,
      deviceScreenDown: null,
      deviceScreenEnd: null,
      deviceScreenInline: null,
      deviceScreenRadius: null,
      deviceScreenScale: null,
      deviceScreenScreen: null,
      deviceScreenSide: null,
      deviceScreenUnit: null,
    },
    props: {
      separation: oneOf(['plain']),
    },
    stylesheet: 'device-screen/root/device-screen-root.generated.css',
  },
  ({ hook, include, on, own, rule }) => {
    const ratio = measured('device-screen-ratio', 0.4615)
    return [
      /* **A box of its own**, so the page can size and place the device as it
         would any block, `block-size: 100%` filling a pane. */
      on('host', [rule({ blockSize: hook.blockSize, display: 'block' })]),
      /* **One row for each strip and the rest for the device**, which takes
         what is left whichever strips a consumer fills. The buttons are a row
         above it at rest and a row below it with `controls-placement="bottom"`;
         a column at a side is inside the device's own box. */
      on('region', [
        rule({
          blockSize: '100%',
          boxSizing: 'border-box',
          display: 'grid',
          gridTemplateAreas: '"header" "controls" "device" "footer"',
          gridTemplateColumns: 'minmax(0, 1fr)',
          gridTemplateRows: 'auto auto minmax(0, 1fr) auto',
          position: 'relative',
        }),
        rule(
          { controlsPlacement: 'bottom' },
          {
            gridTemplateAreas: '"header" "device" "controls" "footer"',
            gridTemplateRows: 'auto minmax(0, 1fr) auto auto',
          },
        ),
        /* **Full screen is the whole screen**, and the device fits its height. */
        rule(
          { fullscreen: true },
          { backgroundColor: token('color-surface'), padding: token('space-md') },
        ),
      ]),
      on('header', [rule({ gridArea: 'header' })]),
      on('footer', [rule({ gridArea: 'footer' })]),
      /* **A size container, so the device can fit it both ways.** A phone is
         taller than most of the boxes it is put in, and a tablet turned on its
         side is wider, so the device takes whichever of the two runs out
         first. A size container has no width of its own to offer a row that
         asks, so it offers the device's at the frame's height. */
      on('device', [
        rule({
          alignItems: 'center',
          containIntrinsicInlineSize: product(hook.blockSize, ratio),
          containerType: 'size',
          display: 'flex',
          gap: token('space-xs'),
          gridArea: 'device',
          justifyContent: 'center',
          minBlockSize: 0,
        }),
      ]),
      /* Written out: a column of buttons is drawn inside the device's box, and
         the vocabulary has no word for a part that holds another. The column
         stands against the bezel, its own padding being the gap. */
      on({ part: 'device', selector: '[part="device"]:has(> [part="controls"])' }, [
        web([rule({ gap: 0 })]),
      ]),
      on('bezel', [
        rule({
          own: {
            deviceScreenSide: hook.bezel,
            deviceScreenEnd: hook.bezelBlock(own.deviceScreenSide),
            deviceScreenRadius: hook.radius,
            deviceScreenInline: own.deviceScreenSide,
            deviceScreenBlock: own.deviceScreenEnd,
            deviceScreenScale: 1,
            deviceScreenAcross: sum(
              1,
              product(product(2, own.deviceScreenInline), own.deviceScreenScale),
            ),
            deviceScreenDown: sum(
              quotient(1, ratio),
              product(product(2, own.deviceScreenBlock), own.deviceScreenScale),
            ),
            deviceScreenScreen: fn(
              'min',
              quotient(difference('100cqi', own.deviceScreenBeside('0px')), own.deviceScreenAcross),
              quotient('100cqb', own.deviceScreenDown),
            ),
            deviceScreenUnit: product(own.deviceScreenScreen, own.deviceScreenScale),
          },
          /* **A step lighter in dark**, where the body is a dark thing on a
             black page: 80% and a 60% rim put the body a rung off the page and
             the rim at 2.3:1. */
          backgroundColor: hook.bezelColor,
          blockSize: product(own.deviceScreenScreen, own.deviceScreenDown),
          borderRadius: product(
            own.deviceScreenUnit,
            hook.bezelRadius(sum(own.deviceScreenRadius, own.deviceScreenSide)),
          ),
          boxShadow: token('shadow-md'),
          boxSizing: 'border-box',
          inlineSize: product(own.deviceScreenScreen, own.deviceScreenAcross),
          /* A rim lighter than the body, which is the edge a dark body would
             lose against a dark page. An outline, so it takes none of the room
             the screen is measured in. */
          outline: [
            token('border-thin'),
            'solid',
            scheme(
              mix(token('color-surface-media'), 72, token('color-foreground-media')),
              mix(token('color-surface-media'), 60, token('color-foreground-media')),
            ),
          ],
          outlineOffset: product(token('border-thin'), '-1'),
          padding: [
            product(own.deviceScreenUnit, own.deviceScreenBlock),
            product(own.deviceScreenUnit, own.deviceScreenInline),
          ],
          position: 'relative',
        }),
        /* **A device on its side keeps its body.** Turned a quarter, the drawn
           screen is the device's height wide, so the body is measured in the
           screen's height, and its top and bottom are at its sides. */
        rule(
          { sideways: true },
          {
            own: {
              deviceScreenInline: own.deviceScreenEnd,
              deviceScreenBlock: own.deviceScreenSide,
              deviceScreenScale: quotient(1, ratio),
            },
          },
        ),
      ]),
      /* Written out, as the gap above is: a column of buttons beside the device
         takes its width from the device's. */
      on(
        {
          part: 'bezel',
          selector: '[part="device"]:has(> [part="controls"]) > [part="bezel"]',
        },
        [
          web([
            rule({
              own: {
                deviceScreenBeside: sum(token('size-control'), product(token('space-lg'), 2)),
              },
            }),
          ]),
        ],
      ),
      on('bezel', [
        rule({ shape: 'square' }, { own: { deviceScreenRadius: 0 } }),
        rule(
          { separation: 'plain' },
          {
            own: { deviceScreenEnd: 0, deviceScreenSide: 0 },
            backgroundColor: 'transparent',
            boxShadow: 'none',
            outline: 'none',
          },
        ),
      ]),
      /* **The screen is black until the stream draws on it**, as a screen is,
         in either mode. */
      on('screen', [
        rule({
          backgroundColor: token('color-surface-media'),
          blockSize: '100%',
          borderRadius: product(own.deviceScreenUnit, own.deviceScreenRadius),
          containerType: 'size',
          inlineSize: '100%',
          overflow: 'hidden',
          position: 'relative',
          userSelect: 'none',
        }),
      ]),
      on(['bezel', 'screen'], [rule({ shape: 'circle' }, { borderRadius: token('radii-full') })]),
      on('screen', [
        rule(
          { focusVisible: true },
          {
            outline: [token('size-focus-ring'), 'solid', token('color-focus-ring')],
            outlineOffset: token('size-focus-offset'),
          },
        ),
      ]),
      /* **The picture turns, and the screen does not.** Turned a quarter, the
         picture is the screen's height wide, so it is sized from the screen's
         other dimension and turned about its middle. */
      on('picture', [
        rule({
          inset: 0,
          position: 'absolute',
          rotate: measured('device-screen-rotation', '0deg'),
        }),
        rule(
          { sideways: true },
          {
            blockSize: '100cqi',
            inlineSize: '100cqb',
            inset: '50% auto auto 50%',
            translate: '-50% -50%',
          },
        ),
      ]),
      /* **The stream fills the screen, and takes no presses of its own**, so a
         press is the screen's to read and an image is never dragged out of it. */
      on({ region: 'default', slotted: '*' }, [
        rule({
          blockSize: '100%',
          display: 'block',
          inlineSize: '100%',
          objectFit: 'fill',
          pointerEvents: 'none',
        }),
      ]),
      /* A picture of a real device lies over the screen it frames. */
      on({ region: 'bezel', slotted: '*' }, [
        rule({
          blockSize: '100%',
          inlineSize: '100%',
          inset: 0,
          pointerEvents: 'none',
          position: 'absolute',
        }),
      ]),
      include(touches),
      /* The words while the stream connects, over a dimmed screen. */
      on('loading', [
        rule({
          alignItems: 'center',
          color: token('color-foreground-media'),
          display: 'grid',
          fontFamily: token('font-sans'),
          fontSize: token('text-sm'),
          inset: 0,
          justifyItems: 'center',
          padding: token('space-md'),
          pointerEvents: 'none',
          position: 'absolute',
          textAlign: 'center',
        }),
        rule(
          { loading: true },
          { backgroundColor: mix(token('color-surface-media'), 72, 'transparent') },
        ),
      ]),
      /* **The hardware buttons, raised**, standing apart from the page as the
         device does. A row centered over it, or a column beside it. */
      on('controls', [
        rule({
          /* **A press past the hover.** A raised button's hover outranks Icon
             Button's own press, so the press hook is read in every state, at
             the strengths of `color-press` in the overlay it rests on. It
             inherits to a page's own buttons in the slot, which join the row. */
          '--icon-button-background-color-active': scheme(
            mix(token('color-foreground'), 16, token('color-surface-overlay')),
            mix(token('color-foreground'), 20, token('color-surface-overlay')),
          ),
          alignItems: 'center',
          display: 'flex',
          flex: 'none',
          flexWrap: 'wrap',
          gap: token('space-2xs'),
          gridArea: 'controls',
          justifyContent: 'center',
          /* Above and below only, for the raised buttons' shadow. */
          padding: [token('space-xs'), token('space-none')],
        }),
        /* **A column stays one column**, the width the device leaves it, and
           scrolls where the frame is too short for every button. Its padding
           holds a raised button's shadow, which a box that scrolls clips. */
        rule(
          { controlsPlacement: ['end', 'start'] },
          {
            flexDirection: 'column',
            flexWrap: 'nowrap',
            justifyContent: 'flex-start',
            maxBlockSize: '100%',
            overflowY: 'auto',
            padding: [token('space-xl'), token('space-lg')],
            scrollbarWidth: 'none',
          },
        ),
        rule({ print: true }, { display: 'none' }),
      ]),
      /* Written out: every child of the row, the buttons, their Tooltips and
         the slot, keeps its size in a column too short for them all. */
      on({ part: 'controls', selector: '[part="controls"] > *' }, [web([rule({ flex: 'none' })])]),
      on({ region: 'controls', slotted: '*' }, [rule({ flex: 'none' })]),
      /* **What the screen says while no stream is inside, over its black.** It
         stands beside the screen at the screen's own insets and corners, so a
         button in it is pressed as a button is. */
      on('empty', [
        rule({
          alignItems: 'center',
          borderRadius: product(own.deviceScreenUnit, own.deviceScreenRadius),
          color: token('color-foreground-media'),
          display: 'grid',
          fontFamily: token('font-sans'),
          fontSize: token('text-sm'),
          inset: [
            product(own.deviceScreenUnit, own.deviceScreenBlock),
            product(own.deviceScreenUnit, own.deviceScreenInline),
          ],
          justifyItems: 'center',
          overflow: 'hidden',
          padding: token('space-md'),
          position: 'absolute',
          textAlign: 'center',
        }),
        rule({ shape: 'circle' }, { borderRadius: token('radii-full') }),
      ]),
      /* On paper the screen's picture is the information, so its black is kept. */
      on(['bezel', 'screen'], [rule({ print: true }, { printColorAdjust: 'exact' })]),
    ]
  },
)
