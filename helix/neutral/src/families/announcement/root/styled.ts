import densitySm from '../../../fragments/density-sm.js'
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
 * Announcement's styled tier.
 *
 * **A band across the page, one height whether or not it holds a control.**
 * Its floor is the small control step and its padding, so a button added to
 * it moves nothing below, and a message long enough to wrap still makes it
 * taller. Its controls are the small step, said once on the host.
 *
 * **The tone tints the band and never the words**, in a gradient mixed with
 * the ground the band rides, with more of the hue in the dark scheme, where
 * a little of it into near black is near black. `neutral` keeps the resting
 * fill. `separation` is the rung: unset is sunk below the page, `filled` the
 * surface step, and `outlined` no fill and a hairline under the band in its
 * tone. There is no `elevated`: the band usually sits at the top of the page
 * with nothing under it to lift off.
 *
 * **The message is centered, and the dismiss button stands out of flow** at
 * the end, with the message and the actions kept clear of it on both sides,
 * so the middle stays the middle. **On a phone the actions go under the
 * message where the line has no room for both**, centered, so the message
 * keeps its width at any text size. The web's stay beside it on one line.
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
      toneColor: own.announcementColor,
    }),
    own: { announcementColor: null, announcementGround: null, announcementTint: null },
    props: {
      separation: oneOf(['filled', 'outlined']),
      tone: oneOf(['accent', 'danger', 'info', 'neutral', 'primary', 'success', 'warning']),
    },
    stylesheet: 'announcement/root/announcement-root.generated.css',
  },
  ({ hook, include, on, own, rule, variants }) => {
    const iconSize = token('size-icon')
    /* The dismiss button's side, and the room kept clear of it. */
    const dismissSize = sum(iconSize, product(token('space-2xs'), 2))
    const clearance = sum(iconSize, product(token('space-2xs'), 2), token('space-xs'))
    /* More of the hue in the dark scheme, at the band's start and its end. */
    const tintStart = scheme(
      mix(own.announcementTint, 18, own.announcementGround),
      mix(own.announcementTint, 32, own.announcementGround),
    )
    const tintEnd = scheme(
      mix(own.announcementTint, 10, own.announcementGround),
      mix(own.announcementTint, 20, own.announcementGround),
    )
    return [
      include(densitySm),
      on('host', [
        rule({
          own: {
            announcementColor: token('color-foreground-muted'),
            announcementGround: token('color-background'),
            announcementTint: hook.toneColor,
          },
          alignItems: 'center',
          /* A step down in light, and the neutral gray in dark, where the
             sunken rung is darker than the page and reads as a hole. */
          backgroundColor: hook.backgroundColor(
            scheme(token('color-surface-sunken'), token('color-neutral-subtle')),
          ),
          color: hook.foregroundColor,
          display: 'flex',
          fontSize: hook.fontSize,
          fontWeight: token('weight-medium'),
          inlineSize: '100%',
          minBlockSize: hook.blockSize,
          paddingBlock: token('space-xs'),
          paddingInline: hook.inset,
          position: 'relative',
        }),
        /* A phone's band wraps where the message and the actions do not fit a line. */
        native([
          rule({
            columnGap: token('space-md'),
            flexWrap: 'wrap',
            justifyContent: 'center',
            rowGap: token('space-2xs'),
          }),
        ]),
        variants('tone', {
          accent: { own: { announcementColor: token('color-accent') } },
          danger: { own: { announcementColor: token('color-danger') } },
          info: { own: { announcementColor: token('color-info') } },
          neutral: { backgroundImage: 'none' },
          primary: { own: { announcementColor: token('color-primary') } },
          success: { own: { announcementColor: token('color-success') } },
          warning: { own: { announcementColor: token('color-warning') } },
        }),
        rule(
          { tone: ['accent', 'danger', 'info', 'primary', 'success', 'warning'] },
          { backgroundImage: fn('linear-gradient', 'to right', tintStart, tintEnd) },
        ),
        /* A ground of its own, the wash every filled surface takes. A tone's
           tint is still mixed against `surface`, since a mix with a wash would
           come out translucent. */
        rule(
          { separation: 'filled' },
          {
            own: { announcementGround: token('color-surface') },
            backgroundColor: hook.backgroundColor(token('color-surface-filled')),
          },
        ),
        rule(
          { separation: 'outlined' },
          {
            backgroundColor: hook.backgroundColor('transparent'),
            borderBlockEnd: [token('border-thin'), 'solid', token('color-border')],
          },
        ),
        rule(
          {
            separation: 'outlined',
            tone: ['accent', 'danger', 'info', 'primary', 'success', 'warning'],
          },
          /* An edge and no fill, so the tone's gradient goes with the ground. */
          {
            backgroundImage: 'none',
            borderBlockEndColor: mix(own.announcementTint, 40, own.announcementGround),
          },
        ),
        rule({ waiting: true }, { display: 'none' }),
        rule({ print: true }, { backgroundColor: 'transparent' }),
      ]),
      /* Centered, and clear of the dismiss button where there is one. */
      on('content', [
        rule({
          flex: '1 1 auto',
          minInlineSize: 0,
          textAlign: hook.textAlign,
          /* A long unbroken word breaks inside the column it was given. */
          web: { overflowWrap: 'anywhere' },
        }),
        /* A phone breaks the line from a basis that does not shrink, since
           it lays the words out at the room they are given, so the message
           asks for sixteen ems, and no more than the line, before the
           actions may stand beside it. */
        native([rule({ flex: '1 0 16em', maxInlineSize: '100%' })]),
        rule({ dismissible: true }, { paddingInline: clearance }),
      ]),
      on('actions', [
        rule({
          alignItems: 'center',
          display: 'flex',
          flex: '0 0 auto',
          gap: token('space-xs'),
        }),
        /* On a line of their own on a phone, the actions narrow to fit it, so they
           never run past the band. */
        native([rule({ flex: '0 1 auto', minInlineSize: 0 })]),
        rule({ dismissible: true }, { marginInlineEnd: clearance }),
        rule({ 'data-empty': true }, { display: 'none' }),
      ]),
      on({ region: 'actions', slotted: '*' }, [
        web([rule({ marginInlineStart: token('space-md') })]),
        native([rule({ child: 'later' }, { marginInlineStart: token('space-md') })]),
      ]),
      /* The glyph and a small pad, out of flow at the end. */
      on('dismiss', [
        rule({
          web: { all: 'unset', cursor: 'pointer' },
          boxSizing: 'border-box',
          blockSize: dismissSize,
          inlineSize: dismissSize,
          borderRadius: token('radii-sm'),
          color: token('color-foreground-muted'),
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
        /* A press, a step past the hover's wash, so a tap shows on a phone. */
        rule(
          { active: true },
          { backgroundColor: token('color-press'), color: token('color-foreground') },
        ),
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
      on('dismiss-mark', [rule({ blockSize: iconSize, inlineSize: iconSize })]),
    ]
  },
)
