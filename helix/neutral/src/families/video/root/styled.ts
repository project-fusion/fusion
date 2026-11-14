import videoSound from '../../../fragments/video-sound.js'
import videoWaiting from '../../../fragments/video-waiting.js'
import { oneOf } from '../../../render.js'
import {
  difference,
  fn,
  list,
  measured,
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
 * Every control on the web's bar, by name, so the rules that make a control of
 * a button reach each one.
 */
const BAR = [
  'play',
  'mute',
  'captions',
  'rewind',
  'forward',
  'speed',
  'previous',
  'next',
  'download',
  'pip',
  'remote',
  'more',
  'fullscreen',
] as const

/** The controls on a phone's bar, each a press of its own. */
const PRESSES = ['play', 'mute', 'captions', 'extra', 'more', 'fullscreen'] as const

/** The glyph on a phone's control, as the web's glyph reads `--icon-size`. */
const MARKS = [
  'play-mark',
  'pause-mark',
  'mute-mark',
  'volume-mark',
  'captions-mark',
  'extra-mark',
  'more-mark',
  'fullscreen-mark',
  'exit-fullscreen-mark',
] as const

/** The regions a glyph is passed into. */
const ICONS = [
  'captions-icon',
  'download-icon',
  'exit-fullscreen-icon',
  'forward-icon',
  'fullscreen-icon',
  'more-icon',
  'mute-icon',
  'next-icon',
  'pause-icon',
  'pip-icon',
  'play-icon',
  'previous-icon',
  'remote-icon',
  'rewind-icon',
  'speed-icon',
  'start-icon',
  'volume-icon',
] as const

const fade = list(['opacity', token('duration-fast'), token('easing-standard')])

const ring = {
  outline: [token('size-focus-ring'), 'solid', token('color-focus-ring')],
  outlineOffset: token('size-focus-offset'),
} as const

/**
 * Video's styled tier.
 *
 * **A video is a dark region, and says so once**, with `color-scheme: dark`
 * on the host: the controls and what is passed in draw in the dark scheme on
 * both platforms, over a well that is black in both.
 *
 * **The bar sits over the picture**, on a gradient that fades up into it, so
 * the video keeps its own size and nothing below it moves. `filled` gives the
 * bar a ground of its own, which stays, and `plain` puts the controls on the
 * picture with nothing behind them. The bar and the header hide once a
 * playing video has gone `idle-delay` without input, unless focus is inside.
 *
 * **The large play button** stands in the middle of the picture, sized
 * against it between a control's height and half again the loose one's, a
 * disc and a ring so it reads over any frame. The loading and failure
 * messages stand there too, the loading one with a turning ring.
 *
 * **The web's**: the volume level that stands up out of the bar on a hover,
 * the caption drawn from a side-loaded track, the range thumbs, and print. On
 * a phone the scrubber is a Slider, which draws its own track and thumb.
 */
export default styles(
  root,
  {
    prefix: 'video',
    props: { separation: oneOf(['filled', 'plain']) },
    hooks: {
      aspectRatio: measured('video-intrinsic-ratio', '16 / 9'),
      controlsColor: token('color-foreground'),
      radius: token('radii-md'),
      speedSize: '2.5rem',
      startSize: fn(
        'clamp',
        token('size-control'),
        '15%',
        product(token('size-control-loose'), 1.5),
      ),
      wellBackgroundColor: token('color-surface-media'),
    },
    own: {
      videoBarGap: null,
      videoBarPad: null,
      videoLevelSize: null,
      videoRailSize: null,
      videoSpin: null,
      videoThumbSize: null,
    },
    stylesheet: 'video/root/video-root.generated.css',
  },
  ({ hook, include, keyframes, on, own, rule }) => [
    on('host', [
      rule({ colorScheme: 'dark', display: 'block', position: 'relative' }),
      /* The two rails, their thumbs three rails across, the level's height,
         and the turn every spinner reads, named once, and the bar's padding
         and gap. None is a thing a page is invited to move. */
      rule({
        own: {
          videoLevelSize: '4.5rem',
          videoRailSize: token('space-2xs'),
          videoSpin: token('duration-turn'),
          videoThumbSize: product(own.videoRailSize, 3),
          videoBarPad: token('space-xs'),
          videoBarGap: token('space-xs'),
        },
      }),
      /* On a touch screen both make room for each control's press. */
      rule(
        { coarsePointer: true },
        {
          own: {
            videoBarGap: fn(
              'max',
              token('space-xs'),
              difference(token('size-target'), token('size-icon-loose')),
            ),
            videoBarPad: fn(
              'max',
              token('space-xs'),
              quotient(difference(token('size-target'), token('size-icon-loose')), 2),
            ),
          },
        },
      ),
      rule({ print: true }, { display: 'none' }),
    ]),
    on('stage', [
      rule({
        borderRadius: hook.radius,
        display: 'block',
        overflow: 'hidden',
        position: 'relative',
        web: {
          outline: [token('border-thin'), 'solid', token('color-border')],
          outlineOffset: product(token('border-thin'), '-1'),
        },
      }),
      /* The picture in the flow, and what stands over it centered on it. */
      native([
        rule({
          alignItems: 'center',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
        }),
      ]),
      web([
        rule(
          { focusVisible: true },
          {
            outline: [token('size-focus-ring'), 'solid', token('color-focus-ring')],
            outlineOffset: product(token('size-focus-offset'), '-1'),
          },
        ),
      ]),
    ]),
    on('video', [
      rule({
        aspectRatio: hook.aspectRatio,
        backgroundColor: hook.wellBackgroundColor,
        blockSize: 'auto',
        display: 'block',
        inlineSize: '100%',
        objectFit: 'contain',
      }),
    ]),
    /* A phone's poster, over the picture until it plays. */
    on('still', [
      native([
        rule({
          /* Placed by its four edges, since an absolute box takes no stretch. */
          insetBlockEnd: 0,
          insetBlockStart: 0,
          insetInlineEnd: 0,
          insetInlineStart: 0,
          objectFit: 'contain',
          position: 'absolute',
        }),
      ]),
    ]),
    on('controls', [
      rule({
        alignItems: 'center',
        color: hook.controlsColor,
        display: 'flex',
        gap: own.videoBarGap,
        insetBlockEnd: 0,
        insetInline: 0,
        opacity: 1,
        padding: [own.videoBarPad, token('space-sm')],
        position: 'absolute',
        transition: fade,
        /* The bar's own width, which the controls ask how much room they have. */
        web: { containerType: 'inline-size' },
      }),
      native([rule({ flexDirection: 'row' })]),
      rule(
        { separation: 'filled' },
        { backgroundColor: token('color-surface'), color: token('color-foreground') },
      ),
      native([
        rule({ idle: true }, { opacity: 0 }),
        rule({ idle: true, separation: 'filled' }, { opacity: 1 }),
        rule({ reducedMotion: true }, { transition: 'none' }),
      ]),
    ]),
    /* The shading reaches higher than the bar does. */
    on({ before: 'stage' }, [
      rule({
        /* At full strength behind the bar, then fading above it. */
        backgroundImage: fn(
          'linear-gradient',
          'to top',
          token('color-overlay'),
          [token('color-overlay'), sum(token('size-icon-loose'), product(own.videoBarPad, 2))],
          'transparent',
        ),
        blockSize: sum(token('size-icon-loose'), token('space-2xl')),
        content: '""',
        insetBlockEnd: 0,
        insetInline: 0,
        opacity: 1,
        pointerEvents: 'none',
        position: 'absolute',
        transition: fade,
      }),
      rule({ separation: 'filled' }, { content: 'none' }),
      native([rule({ idle: true }, { opacity: 0 })]),
    ]),
    /* Written out: the bar stays on the filled separation and while focus is inside. */
    on(
      {
        part: 'controls',
        selector:
          ':host([separation="filled"]:where(:state(idle)):not(:focus-within)) [part="controls"]',
      },
      [web([rule({ opacity: 1 })])],
    ),
    on(
      {
        part: 'stage',
        selector: ':host(:where(:state(idle)):not(:focus-within)) [part="stage"]::before',
      },
      [web([rule({ opacity: 0 })])],
    ),
    on(
      {
        part: 'stage',
        selector:
          ':host([separation="plain"]) [part="stage"]::before, :host([controls]) [part="stage"]::before',
      },
      [web([rule({ content: 'none' })])],
    ),
    on(
      {
        part: 'controls',
        selector: ':host(:where(:state(idle)):not(:focus-within)) [part="controls"]',
      },
      [web([rule({ opacity: 0 })])],
    ),
    /* Every control on the bar, each a plain mark in a box the size of a loose icon. */
    on(BAR, [
      web([
        rule({
          all: 'unset',
          '--icon-size': token('size-icon-tight'),
          alignItems: 'center',
          borderRadius: token('radii-sm'),
          boxSizing: 'border-box',
          color: 'inherit',
          cursor: 'pointer',
          display: 'flex',
          flex: [0, 0, 'auto'],
          justifyContent: 'center',
          minBlockSize: token('size-icon-loose'),
          minInlineSize: token('size-icon-loose'),
        }),
      ]),
    ]),
    /* The speed says its number, and draws no glyph. */
    on('extra-mark', [native([rule({ part: { hidden: true } }, { display: 'none' })])]),
    /* A phone's extras, a row of presses in the order written. */
    on('extras', [
      native([
        rule({
          alignItems: 'center',
          display: 'flex',
          flexDirection: 'row',
          gap: token('space-xs'),
        }),
      ]),
    ]),
    on(PRESSES, [
      native([
        rule({
          alignItems: 'center',
          borderRadius: token('radii-sm'),
          display: 'flex',
          flexGrow: 0,
          flexShrink: 0,
          justifyContent: 'center',
          minBlockSize: token('size-icon-loose'),
          minInlineSize: token('size-icon-loose'),
        }),
        rule({ focusVisible: true }, ring),
      ]),
    ]),
    on(MARKS, [
      native([
        rule({
          blockSize: token('size-icon-tight'),
          color: hook.controlsColor,
          inlineSize: token('size-icon-tight'),
        }),
        rule({ separation: 'filled' }, { color: token('color-foreground') }),
      ]),
    ]),
    /* A glyph passed in is drawn at the size of the glyph it replaces. */
    on({ region: ICONS, slotted: '*' }, [
      rule({
        blockSize: fn('var', '--icon-size', token('size-icon')),
        flex: [0, 0, 'auto'],
        inlineSize: fn('var', '--icon-size', token('size-icon')),
      }),
    ]),
    on(BAR, [web([rule({ focusVisible: true }, ring)])]),
    on(['scrubber', 'volume'], [web([rule({ focusVisible: true }, ring)])]),
    on('time', [
      rule({
        color: 'inherit',
        flex: [0, 0, 'auto'],
        fontFamily: token('font-sans'),
        fontSize: token('text-xs'),
        fontVariantNumeric: 'tabular-nums',
      }),
      /* The time goes first when the bar is narrow. */
      web([rule({ inlineSize: { below: '18rem' } }, { display: 'none' })]),
      /* A phone's words take no ink from the bar around them, so the bar's is
         named. The reader's text size grows them, so the clock gives way to the
         scrubber, on one line, before it pushes the controls off the bar. */
      native([
        rule({ color: hook.controlsColor, flexShrink: 1, minInlineSize: 0 }),
        rule({ separation: 'filled' }, { color: token('color-foreground') }),
      ]),
    ]),
    /* **A bar holding extra controls lets the clock go sooner**, by what two
       of them take on a touch screen, 41 pixels each with their gap. A
       playlist's player draws previous and next, and at 390 on a phone its bar
       was 342 wide with the clock still on it, so the scrubber was 16 pixels.
       Without the clock it is 98. A phone's clock gives way by shrinking. */
    on(
      {
        part: 'time',
        selector:
          '[part="controls"]:has(> :is([part~="previous"], [part~="next"], [part~="rewind"], [part~="forward"], [part~="speed"], [part~="pip"], [part~="remote"], [part~="download"])) [part="time"]',
      },
      [web([rule({ inlineSize: { below: '23.5rem' } }, { display: 'none' })])],
    ),
    include(videoSound),
    /* The menu takes no width of its own: what a reader sees is its trigger. */
    on('overflow', [web([rule({ display: 'contents' })])]),
    on('start', [
      /* Rounded to whole even pixels. */
      web([rule({ all: 'unset', '--icon-size': fn('round', '40%', '2px') })]),
      native([rule({ '--icon-size': '40%' })]),
      rule({
        alignItems: 'center',
        aspectRatio: 1,
        backgroundColor: token('color-overlay'),
        borderRadius: token('radii-full'),
        boxShadow: [
          0,
          0,
          0,
          token('border-thin'),
          mix(token('color-foreground'), 40, 'transparent'),
        ],
        boxSizing: 'border-box',
        color: token('color-foreground'),
        display: 'flex',
        justifyContent: 'center',
        position: 'absolute',
        transition: list(['background-color', token('duration-fast'), token('easing-standard')]),
        web: { cursor: 'pointer' },
      }),
      web([
        rule({
          inlineSize: hook.startSize,
          insetBlockStart: '50%',
          insetInlineStart: '50%',
          translate: ['-50%', '-50%'],
        }),
        rule(
          { hover: true },
          {
            backgroundColor: mix(token('color-overlay'), 88, token('color-foreground')),
          },
        ),
        rule({ focusVisible: true }, ring),
      ]),
      /* A phone sizes it against the picture between the same floor and cap. */
      native([
        rule({
          inlineSize: '15%',
          maxInlineSize: product(token('size-control-loose'), 1.5),
          minInlineSize: token('size-control'),
        }),
        rule({ focusVisible: true }, ring),
      ]),
    ]),
    on('start-mark', [
      native([
        rule({
          blockSize: '40%',
          color: token('color-foreground'),
          inlineSize: '40%',
        }),
      ]),
    ]),
    on('cue', [
      rule({
        backgroundColor: token('color-overlay'),
        borderRadius: token('radii-sm'),
        color: token('color-foreground'),
        fontFamily: token('font-sans'),
        fontSize: token('text-md'),
        inlineSize: 'max-content',
        insetBlockEnd: sum(token('size-icon-loose'), token('space-lg')),
        insetInlineStart: '50%',
        margin: token('space-none'),
        maxInlineSize: fn('min', '80%', '36rem'),
        padding: [token('space-2xs'), token('space-xs')],
        position: 'absolute',
        textAlign: 'center',
        textWrap: 'balance',
        transition: list(['inset-block-end', token('duration-fast'), token('easing-standard')]),
        translate: ['-50%', 0],
      }),
    ]),
    on(
      {
        part: 'cue',
        selector: ':host(:where(:state(idle)):not(:focus-within)) [part="cue"]',
      },
      [web([rule({ insetBlockEnd: token('space-lg') })])],
    ),
    /* A poster passed in covers the picture exactly, and takes its presses back. */
    on({ region: 'poster' }, [
      rule({ display: 'block', inset: 0, pointerEvents: 'none', position: 'absolute' }),
    ]),
    on({ region: 'poster', slotted: '*' }, [
      rule({
        blockSize: '100%',
        display: 'block',
        inlineSize: '100%',
        objectFit: 'contain',
        pointerEvents: 'auto',
      }),
    ]),
    /* One width, whatever the speed says, so the scrubber beside it never jumps. */
    on('speed', [
      web([
        rule({
          fontFamily: token('font-sans'),
          fontSize: token('text-xs'),
          fontVariantNumeric: 'tabular-nums',
          fontWeight: token('weight-medium'),
          minInlineSize: hook.speedSize,
        }),
      ]),
    ]),
    on('extra', [
      native([
        rule({
          fontFamily: token('font-sans'),
          fontSize: token('text-xs'),
          fontVariantNumeric: 'tabular-nums',
          fontWeight: token('weight-medium'),
        }),
      ]),
    ]),
    /* Written out: connected reads as on, in the primary color. */
    on({ part: 'remote', selector: ':host [part~="remote"][aria-pressed="true"]' }, [
      web([rule({ color: token('color-primary') })]),
    ]),
    include(videoWaiting),
    keyframes('video-spin', { to: { rotate: '1turn' } }),
    /* The header rides with the bar, over the frame at the top start. */
    on('header', [
      rule({
        alignItems: 'center',
        color: hook.controlsColor,
        display: 'flex',
        gap: token('space-sm'),
        insetBlockStart: 0,
        insetInline: 0,
        opacity: 'inherit',
        paddingInline: token('space-sm'),
        position: 'absolute',
        zIndex: token('layer-raised'),
      }),
      /* On a shade of its own, as the bar is, held across the header's height
         and fading below it; the picture under it still takes a press. */
      web([
        rule({
          backgroundImage: fn(
            'linear-gradient',
            'to bottom',
            token('color-overlay'),
            [token('color-overlay'), difference('100%', token('space-lg'))],
            'transparent',
          ),
          pointerEvents: 'none',
        }),
      ]),
      native([
        rule({ flexDirection: 'row', opacity: 1, transition: fade }),
        rule({ idle: true }, { opacity: 0 }),
        rule({ reducedMotion: true }, { transition: 'none' }),
      ]),
    ]),
    /* The space above and below the slotted line, on the line, so an empty
       header has no height. */
    on({ region: 'header', slotted: '*' }, [
      web([
        rule({
          marginBlock: [token('space-sm'), token('space-lg')],
          pointerEvents: 'auto',
        }),
      ]),
    ]),
    /* Written out: an empty header takes no room. */
    on({ part: 'header', selector: ':host [part="header"]:not(:has(*))' }, [
      web([rule({ display: 'none' })]),
    ]),
    /* The press reaches the target size in a transparent box, so nothing drawn moves. */
    on(BAR, [web([rule({ position: 'relative' })])]),
    /* Written out: a pseudo-element names one part, and this box is every control's. */
    on(
      {
        part: 'play',
        selector:
          ':host [part="play"]::after, :host [part="mute"]::after, :host [part="captions"]::after, :host [part="rewind"]::after, :host [part="forward"]::after, :host [part="speed"]::after, :host [part="previous"]::after, :host [part="next"]::after, :host [part="download"]::after, :host [part="pip"]::after, :host [part~="remote"]::after, :host [part="more"]::after, :host [part="fullscreen"]::after',
      },
      [
        web([
          rule({
            content: '""',
            inset: product(difference(token('size-target'), '100%'), '-0.5'),
            position: 'absolute',
          }),
        ]),
      ],
    ),
    on(BAR, [web([rule({ hover: true }, { backgroundColor: token('color-hover') })])]),
  ],
)
