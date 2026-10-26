import { first, fn, list, mix, native, product, scheme, sum, token, web } from '../../../style.js'
import { styles } from '../../../table.js'
import { prop } from '../../../tree.js'
import root from './headless.js'

/**
 * Announcement's styled tier, which writes
 * `helix/styled/src/announcement/root/announcement-root.generated.css`.
 *
 * **A band across the page, one height whether or not it holds a control.**
 * Its floor is the small control step and its padding, so a button added to
 * it moves nothing below, and a message long enough to wrap still makes it
 * taller. Its controls are the small step, said once on the host.
 *
 * **The tone tints the band and never the words**, in a gradient mixed with
 * the ground the band rides, with more of the hue in the dark scheme, where
 * a little of it into near black is near black. `neutral` keeps the resting
 * fill. `separation` is the rung: sunk below the page, the surface step, or
 * a hairline under the band in its tone.
 *
 * **The message is centered, and the dismiss button stands out of flow** at
 * the end, with the message and the actions kept clear of it on both sides,
 * so the middle stays the middle. **The actions go under the message where
 * the line has no room for both**, centered, so the message keeps its width
 * at any width and text size.
 *
 * A queued announcement that waits draws nothing. Print draws no fill, and is
 * the web's.
 */
export default styles(
  root,
  {
    prefix: 'announcement',
    hooks: ({ own }) => ({
      backgroundColor: null,
      blockSize: sum(token('size-control'), product(token('space-xs'), 2)),
      fontSize: token('text-sm'),
      foregroundColor: token('color-foreground'),
      inset: token('space-lg'),
      textAlign: 'center',
      toneColor: own.color,
    }),
    own: ['announcement-color', 'announcement-ground', 'announcement-tint'],
    props: [prop('separation', ['elevated', 'filled', 'outlined'])],
    stylesheet: 'announcement/root/announcement-root.generated.css',
  },
  ({ hook, on, own, rule, variants }) => {
    const iconSize = token('size-icon')
    /* The dismiss button's side, and the room kept clear of it. */
    const dismissSize = sum(iconSize, product(token('space-2xs'), 2))
    const clearance = sum(iconSize, product(token('space-2xs'), 2), token('space-xs'))
    /* More of the hue in the dark scheme, at the band's start and its end. */
    const tintStart = scheme(mix(own.tint, 18, own.ground), mix(own.tint, 32, own.ground))
    const tintEnd = scheme(mix(own.tint, 10, own.ground), mix(own.tint, 20, own.ground))
    return [
      on('host', [
        rule({
          '--helix-size-icon': token('size-icon-sm'),
          '--helix-size-icon-loose': product(token('size-icon'), 1.2),
          '--helix-size-icon-tight': product(token('size-icon'), 0.8),
          '--helix-size-control': token('size-control-sm'),
          '--helix-size-control-loose': product(token('size-control'), 1.2),
          '--helix-size-control-tight': product(token('size-control'), 0.8),
          own: {
            color: token('color-foreground-muted'),
            ground: token('color-background'),
            tint: first(hook.toneColor, own.color),
          },
          alignItems: 'center',
          backgroundColor: hook.backgroundColor(token('color-surface-sunken')),
          color: hook.foregroundColor,
          columnGap: token('space-md'),
          display: 'flex',
          flexWrap: 'wrap',
          fontSize: hook.fontSize,
          fontWeight: token('weight-medium'),
          inlineSize: '100%',
          justifyContent: 'center',
          minBlockSize: hook.blockSize,
          paddingBlock: token('space-xs'),
          paddingInline: hook.inset,
          position: 'relative',
          rowGap: token('space-2xs'),
        }),
        variants('tone', {
          accent: { own: { color: token('color-accent') } },
          danger: { own: { color: token('color-danger') } },
          info: { own: { color: token('color-info') } },
          neutral: { backgroundImage: 'none' },
          primary: { own: { color: token('color-primary') } },
          success: { own: { color: token('color-success') } },
          warning: { own: { color: token('color-warning') } },
        }),
        rule(
          { tone: ['accent', 'danger', 'info', 'primary', 'success', 'warning'] },
          { backgroundImage: fn('linear-gradient', 'to right', tintStart, tintEnd) },
        ),
        rule(
          { separation: 'filled' },
          { backgroundColor: hook.backgroundColor(token('color-surface-sunken')) },
        ),
        rule(
          { separation: 'elevated' },
          {
            own: { ground: token('color-surface') },
            backgroundColor: hook.backgroundColor(token('color-surface')),
          },
        ),
        rule(
          { separation: 'outlined' },
          { borderBlockEnd: [token('border-thin'), 'solid', token('color-border')] },
        ),
        rule(
          {
            separation: 'outlined',
            tone: ['accent', 'danger', 'info', 'primary', 'success', 'warning'],
          },
          { borderBlockEndColor: mix(own.tint, 40, own.ground) },
        ),
        rule({ waiting: true }, { display: 'none' }),
        rule({ print: true }, { backgroundColor: 'transparent' }),
      ]),
      /* Centered, and clear of the dismiss button where there is one. */
      on('content', [
        rule({ flex: '1 1 auto', minInlineSize: 0, textAlign: hook.textAlign }),
        /* A phone breaks the line from a basis that does not shrink, since
           it lays the words out at the room they are given, so the message
           asks for sixteen ems, and no more than the line, before the
           actions may stand beside it. */
        native([rule({ flex: '1 0 16em', maxInlineSize: '100%' })]),
        rule({ dismissible: true }, { paddingInline: clearance }),
      ]),
      on('actions', [
        /* On a line of their own, the actions narrow to fit it, so they never run
           past the band. */
        rule({
          alignItems: 'center',
          display: 'flex',
          flex: '0 1 auto',
          gap: token('space-xs'),
          minInlineSize: 0,
        }),
        rule({ dismissible: true }, { marginInlineEnd: clearance }),
        rule({ 'data-empty': true }, { display: 'none' }),
      ]),
      on({ region: 'actions', slotted: '*' }, [
        rule({ child: 'later' }, { marginInlineStart: token('space-md') }),
      ]),
      /* The glyph and a small pad, out of flow at the end. */
      on('dismiss', [
        rule({
          all: web('unset'),
          boxSizing: 'border-box',
          blockSize: dismissSize,
          inlineSize: dismissSize,
          borderRadius: token('radii-sm'),
          color: token('color-foreground-muted'),
          cursor: web('pointer'),
          display: 'inline-flex',
          flex: '0 0 auto',
          placeContent: 'center',
          placeItems: 'center',
          position: 'absolute',
          insetInlineEnd: hook.inset,
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
      ]),
      on('dismiss-mark', [rule({ blockSize: iconSize, inlineSize: iconSize })]),
    ]
  },
)
