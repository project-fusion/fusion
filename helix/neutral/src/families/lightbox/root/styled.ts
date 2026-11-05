import { list, native, sum, token, web } from '../../../style.js'
import { styles } from '../../../table.js'
import root from './headless.js'

/** The viewer's own controls, each a round ground over the picture. */
const CONTROLS = ['previous', 'next', 'dismiss', 'zoom-in', 'zoom-out'] as const

/** The chrome that fades while the reader is still, the counter with the controls. */
const CHROME = ['counter', ...CONTROLS] as const

/* The chrome fades rather than leaves, so the picture never changes size. */
const fade = list(
  ['opacity', token('duration-fast'), token('easing-standard')],
  ['visibility', token('duration-fast'), token('easing-standard')],
)

const hidden = { opacity: 0, visibility: 'hidden' } as const

const ring = {
  outline: [token('size-focus-ring'), 'solid', token('color-focus-ring')],
  outlineOffset: token('size-focus-offset'),
} as const

const glyph = {
  '--icon-size': token('size-icon'),
  blockSize: token('size-icon'),
  inlineSize: token('size-icon'),
} as const

/**
 * Lightbox's styled tier.
 *
 * **A lightbox is a dark region, and says so once**, with `color-scheme: dark`
 * on the host, as Video does: the chrome passed in is the consumer's own
 * components, which resolve their own tokens and would otherwise draw
 * page-colored ink on a black room. On a phone the whole element and what is
 * passed into it draw in the dark scheme.
 *
 * **A takeover rather than a panel.** The viewer is the whole window, the
 * header, the item, and the footer in three rows, and the scrim behind it is
 * the opaque background, so the page under it is gone rather than dimmed.
 *
 * **The viewer's own controls are drawn over the picture** and out of the
 * rows: previous and next at the middle of either side, the close in the top
 * corner at the end of the line, zoom out and zoom in in the bottom corner
 * under it, and the counter in the top corner at the start. Each has a ground
 * of its own, since an arrow on a photograph is legible against half of one.
 * At either end they stay focusable and fade to the disabled opacity.
 *
 * **The chrome fades while the reader is still**, `idle`, and keeps its place.
 * Print leaves the viewer out.
 */
export default styles(
  root,
  {
    prefix: 'lightbox',
    hooks: ({ own }) => ({
      controlSize: token('size-control'),
      foreground: token('color-foreground'),
      gap: token('space-sm'),
      padding: token('space-md'),
      scrim: own.lightboxScrim,
    }),
    own: { lightboxScrim: null },
    stylesheet: 'lightbox/root/lightbox-root.generated.css',
  },
  ({ hook, on, rule }) => [
    on('host', [
      rule({ colorScheme: 'dark', display: 'contents' }),
      rule({ own: { lightboxScrim: token('color-background') } }),
      rule({ print: true }, { display: 'none' }),
    ]),
    on('dialog', [
      rule({
        backgroundColor: 'transparent',
        blockSize: '100dvh',
        border: 'none',
        boxSizing: 'border-box',
        color: hook.foreground,
        display: 'grid',
        gap: hook.gap,
        gridTemplateRows: ['auto', '1fr', 'auto'],
        inlineSize: '100vw',
        maxBlockSize: '100dvh',
        maxInlineSize: '100vw',
        padding: hook.padding,
      }),
      /* A horizontal drag is the viewer's swipe; the browser keeps the
         vertical pan and the pinch, and leaves both to a viewer that zooms. */
      web([
        rule({ touchAction: ['pan-y', 'pinch-zoom'] }),
        rule({ zoomable: true }, { touchAction: 'none' }),
      ]),
      native([rule({ display: 'flex', flexDirection: 'column' })]),
      /* No ring on the viewer itself, which is the whole screen. */
      rule({ focusVisible: true }, { outline: 'none' }),
    ]),
    /* Written out: the vocabulary names no dialog's own `open` attribute. */
    on({ part: 'dialog', selector: '[part="dialog"]:not([open])' }, [
      web([rule({ display: 'none' })]),
    ]),
    on({ backdrop: 'dialog' }, [rule({ backgroundColor: hook.scrim })]),
    on(['header', 'footer'], [rule({ display: 'grid', gap: hook.gap })]),
    on('viewport', [
      rule({
        alignItems: 'center',
        display: 'flex',
        justifyContent: 'center',
        minBlockSize: 0,
        overflow: 'hidden',
      }),
      native([rule({ flexGrow: 1 })]),
      web([
        rule({ zoomable: true }, { cursor: 'zoom-in' }),
        rule({ zoomed: true }, { cursor: 'grab' }),
      ]),
    ]),
    on({ region: 'header', slotted: '*' }, [
      rule({ transition: fade }),
      rule({ idle: true }, hidden),
      rule({ reducedMotion: true }, { transition: 'none' }),
    ]),
    on({ region: 'footer', slotted: '*' }, [
      rule({ transition: fade }),
      rule({ idle: true }, hidden),
      rule({ reducedMotion: true }, { transition: 'none' }),
    ]),
    on(CONTROLS, [
      web([rule({ all: 'unset', boxSizing: 'border-box', cursor: 'pointer' })]),
      rule({
        alignItems: 'center',
        backgroundColor: token('color-surface-overlay'),
        blockSize: hook.controlSize,
        borderRadius: token('radii-full'),
        boxShadow: token('shadow-md'),
        color: hook.foreground,
        display: 'inline-flex',
        inlineSize: hook.controlSize,
        justifyContent: 'center',
        position: 'absolute',
        transition: fade,
      }),
      native([rule({ display: 'flex' })]),
      web([rule({ hover: true }, { backgroundColor: token('color-surface-sunken') })]),
      rule({ focusVisible: true }, ring),
      native([rule({ part: { disabled: true } }, { opacity: token('opacity-disabled') })]),
    ]),
    /* At either end of a set that does not loop, or of the scale: still focusable. */
    on(
      {
        part: 'previous',
        selector:
          '[part="previous"][aria-disabled="true"], [part="next"][aria-disabled="true"], [part="zoom-in"][aria-disabled="true"], [part="zoom-out"][aria-disabled="true"]',
      },
      [web([rule({ cursor: 'default', opacity: token('opacity-disabled') })])],
    ),
    on(['previous', 'next'], [
      web([rule({ insetBlockStart: '50%', translate: [0, '-50%'] })]),
      /* Yoga reads a top of half against the row, so a phone centers the
         control between both edges. */
      native([rule({ insetBlockEnd: 0, insetBlockStart: 0, marginBlock: 'auto' })]),
    ]),
    on('previous', [rule({ insetInlineStart: hook.padding })]),
    on('next', [rule({ insetInlineEnd: hook.padding })]),
    on('dismiss', [rule({ insetBlockStart: hook.padding, insetInlineEnd: hook.padding })]),
    /* Zoom out and zoom in, under the close control: out first, as a scale reads. */
    on(['zoom-in', 'zoom-out'], [rule({ insetBlockEnd: hook.padding })]),
    on('zoom-in', [rule({ insetInlineEnd: hook.padding })]),
    on('zoom-out', [
      rule({ insetInlineEnd: sum(hook.padding, hook.controlSize, token('space-xs')) }),
    ]),
    on({ inner: 'svg', part: 'previous' }, [web([rule(glyph)])]),
    on({ inner: 'svg', part: 'next' }, [web([rule(glyph)])]),
    on({ inner: 'svg', part: 'dismiss' }, [web([rule(glyph)])]),
    on({ inner: 'svg', part: 'zoom-in' }, [web([rule(glyph)])]),
    on({ inner: 'svg', part: 'zoom-out' }, [web([rule(glyph)])]),
    on(
      ['previous-mark', 'next-mark', 'dismiss-mark', 'zoom-in-mark', 'zoom-out-mark'],
      [native([rule({ ...glyph, color: hook.foreground })])],
    ),
    /* A glyph passed in is sized as the default one, so swapping it changes nothing. */
    on({ region: 'previous-icon', slotted: '*' }, [rule(glyph)]),
    on({ region: 'next-icon', slotted: '*' }, [rule(glyph)]),
    on({ region: 'dismiss-icon', slotted: '*' }, [rule(glyph)]),
    on({ region: 'zoom-in-icon', slotted: '*' }, [rule(glyph)]),
    on({ region: 'zoom-out-icon', slotted: '*' }, [rule(glyph)]),
    on('counter', [
      rule({
        backgroundColor: token('color-surface-overlay'),
        borderRadius: token('radii-full'),
        boxShadow: token('shadow-md'),
        color: hook.foreground,
        fontFamily: token('font-sans'),
        fontSize: token('text-sm'),
        fontVariantNumeric: 'tabular-nums',
        insetBlockStart: hook.padding,
        insetInlineStart: hook.padding,
        lineHeight: token('leading-tight'),
        padding: [token('space-2xs'), token('space-sm')],
        position: 'absolute',
        transition: fade,
      }),
    ]),
    on(CHROME, [
      rule({ idle: true }, hidden),
      rule({ reducedMotion: true }, { transition: 'none' }),
    ]),
  ],
)
