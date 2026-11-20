import { oneOf } from '../../../render.js'
import {
  difference,
  first,
  fn,
  inherit,
  mix,
  native,
  product,
  quotient,
  scheme,
  token,
  web,
} from '../../../style.js'
import { styles } from '../../../table.js'
import root from './headless.js'

/**
 * Tag's styled tier.
 *
 * **The host is the box, and its height is defined** rather than falling out
 * of padding, so a tag beside a control lines up: the `size-tag` step of the
 * region it is in, 24px at `md` and 20px at `sm`, against a 40px control and
 * a 32px dense one.
 *
 * **Every tone is one status color**, tinted for the fill and
 * deepened toward the foreground for the label, with no edge at rest. The fill
 * mixes in sRGB: measured in Chromium at 14 percent, an OKLab fill separated from a
 * near-black page by 4 to 10 sRGB levels, where sRGB gives 26 to 37 in light
 * and dark alike. The label mixes in OKLab, where four of five tones at full
 * strength failed 4.5:1 at 12px on their own wash.
 *
 * **`solid`, and a selected tag in a group, fill with the tone** and put an
 * inverse label on it. **`outlined` draws the tone at the edge alone.**
 *
 * **The label stays inside the tag.** The host is one line, so a tag given
 * less room than its words, as a squeezed table cell gives it, ends the words
 * with an ellipsis inside its rounded end. On the web the letters are trimmed
 * to their capitals and baseline where the browser can, so they sit at the
 * middle in any font.
 *
 * **In a `Tag.Group` the tag's cell takes focus**, stretched over the host's
 * padding so the ring goes round the whole tag. A phone draws the cell on
 * every tag, as the press the tag is, and its pull and its padding cancel.
 *
 * On a phone the height, the corners, the gaps and the remove mark stop
 * growing at 1.353 times the default text size, and the words grow fully.
 */
export default styles(
  root,
  {
    prefix: 'tag',
    hooks: ({ own }) => ({
      backgroundColor: own.tagFill,
      borderColor: own.tagEdge,
      disabledOpacity: token('opacity-disabled'),
      fontWeight: token('weight-medium'),
      foregroundColor: own.tagLabel,
      gap: token('space-2xs'),
      radius: null,
    }),
    own: {
      tagColor: null,
      tagDismiss: null,
      tagEdge: null,
      tagFill: null,
      tagHeight: null,
      tagInset: null,
      tagLabel: null,
      tagOn: null,
      tagSolid: null,
      tagText: null,
    },
    props: {
      emphasis: oneOf(['outlined', 'solid', 'subtle']),
      shape: oneOf(['pill']),
      tone: oneOf(['accent', 'danger', 'info', 'neutral', 'primary', 'success', 'warning']),
    },
    stylesheet: 'tag/root/tag-root.generated.css',
  },
  ({ hook, on, own, rule, variants }) => {
    /* A tone's own solid fill and the ink solved against it, where the tone
       has one. */
    const solid = {
      own: {
        tagFill: first(own.tagSolid, mix(own.tagColor, 82, token('color-foreground'))),
        tagEdge: own.tagFill,
        tagLabel: first(own.tagOn, token('color-foreground-inverse')),
      },
    } as const
    const dismissSize = fn(
      'max',
      own.tagText,
      difference(fn('round', quotient(own.tagHeight, 2), '2px'), '2px'),
    )
    return [
      on('host', [
        rule({
          alignItems: 'center',
          backgroundColor: hook.backgroundColor,
          blockSize: own.tagHeight,
          border: [token('border-thin'), 'solid', hook.borderColor],
          borderRadius: hook.radius(token('radii-sm')),
          color: hook.foregroundColor,
          display: 'inline-flex',
          fontSize: own.tagText,
          fontWeight: hook.fontWeight,
          gap: hook.gap,
          lineHeight: token('leading-tight'),
          maxInlineSize: '100%',
          /* And less than that beside something else: the label ends in an
           ellipsis. */
          minInlineSize: 0,
          paddingInline: own.tagInset,
          whiteSpace: 'nowrap',
          /* An icon in a tag is half the tag, on an even pixel. */
          '--icon-size': fn('round', quotient(own.tagHeight, 2), '2px'),
          /* On the middle of the line in running text, whatever comes first. */
          web: { verticalAlign: 'middle' },
          own: {
            tagHeight: token('size-tag'),
            tagColor: token('color-foreground-muted'),
            tagText: token('text-xs'),
            tagInset: token('space-xs'),
            /* Translucent, so a tag on a card tints the card, and deeper in
             dark, where 14% over black was a ground nobody saw. */
            tagFill: scheme(
              mix(own.tagColor, 14, 'transparent', 'srgb'),
              mix(own.tagColor, 22, 'transparent', 'srgb'),
            ),
            tagEdge: 'transparent',
            tagLabel: mix(own.tagColor, 55, token('color-foreground')),
          },
        }),
        /* Fully rounded ends, and the remove button's ring rounded to match. */
        rule({ shape: 'pill' }, { borderRadius: hook.radius(token('radii-full')) }),
        variants('emphasis', {
          solid,
          outlined: {
            own: {
              tagFill: 'transparent',
              tagEdge: mix(own.tagColor, 45, token('color-background'), 'srgb'),
            },
          },
        }),
        variants('tone', {
          primary: {
            own: {
              tagColor: token('color-primary'),
              tagSolid: token('color-primary-surface'),
              tagOn: token('color-foreground-on-primary'),
            },
          },
          accent: {
            own: {
              tagColor: token('color-accent'),
              tagSolid: token('color-accent-surface'),
              tagOn: token('color-foreground-on-accent'),
            },
          },
          info: {
            own: {
              tagColor: token('color-info'),
              tagSolid: token('color-info-surface'),
              tagOn: token('color-foreground-on-status'),
            },
          },
          success: {
            own: {
              tagColor: token('color-success'),
              tagSolid: token('color-success-surface'),
              tagOn: token('color-foreground-on-status'),
            },
          },
          /* The solid warning fill under the page's color. */
          warning: {
            own: {
              tagColor: token('color-warning'),
              tagSolid: token('color-warning-solid'),
              tagOn: token('color-background'),
            },
          },
          danger: {
            own: {
              tagColor: token('color-danger'),
              tagSolid: token('color-danger-surface'),
              tagOn: token('color-foreground-on-status'),
            },
          },
        }),
        /* Out of reach, and drawn so: the platform's own disabled step. */
        rule({ has: 'disabled' }, { opacity: hook.disabledOpacity }),
        /* Selected in a group that selects: the tone filled, as `solid` draws it. */
        rule({ selected: true }, solid),
        rule({ print: true }, { web: { printColorAdjust: 'economy' } }),
      ]),
      on('dismiss', [
        /* Inside the tag's inline padding, and not pulled past it. The font is
         the tag's, so the mark's em is the tag's em and not the button's. */
        rule({
          font: web('inherit'),
          background: 'none',
          border: 'none',
          borderRadius: token('radii-sm'),
          color: inherit(),
          web: { cursor: 'pointer' },
          display: 'inline-flex',
          marginInlineEnd: product(token('space-2xs'), '-1'),
          padding: token('space-2xs'),
          position: 'relative',
        }),
        rule({ shape: 'pill' }, { borderRadius: token('radii-full') }),
        /* The hover and press washes of the tag's own ink, not on a disabled
         tag, whose cross takes no press. */
        web([
          rule(
            { hover: true, lacks: 'disabled' },
            {
              backgroundColor: scheme(
                mix('currentcolor', 8, 'transparent'),
                mix('currentcolor', 12, 'transparent'),
              ),
            },
          ),
        ]),
        native([rule({ hover: true }, { backgroundColor: mix(own.tagColor, 20, 'transparent') })]),
        /* Inside the cross's own box, where the ring has room. */
        rule(
          { focusVisible: true },
          {
            outline: [token('size-focus-ring'), 'solid', token('color-focus-ring')],
            outlineOffset: product(token('size-focus-offset'), '-1'),
          },
        ),
        rule({ has: 'disabled' }, { web: { cursor: 'not-allowed' } }),
        web([
          rule(
            { active: true, lacks: 'disabled' },
            {
              backgroundColor: scheme(
                mix('currentcolor', 16, 'transparent'),
                mix('currentcolor', 19, 'transparent'),
              ),
            },
          ),
        ]),
        native([rule({ active: true }, { backgroundColor: token('color-press') })]),
      ]),
      /* The press reaches `--helix-size-target`, in a transparent box, so nothing drawn
       moves. Where the control is already that size the box sits inside it. */
      on({ after: 'dismiss' }, [
        web([
          rule({
            content: '""',
            inset: quotient(difference(token('size-target'), '100%'), '-2'),
            position: 'absolute',
          }),
        ]),
      ]),
      /* A `<slot>` is `display: contents` and draws no box to end in an
       ellipsis, and the block it becomes is a flex item, which keeps an
       automatic least width until it is told otherwise. */
      on({ region: 'default' }, [
        rule({ display: 'block', minInlineSize: 0, overflow: 'hidden', textOverflow: 'ellipsis' }),
        /* Aligned to the page's start, whatever direction its letters take. */
        web([rule({ textAlign: 'match-parent' })]),
        /* Trimmed to the capitals and the baseline, the box is the letters, and
         the equal padding is room for the descenders the ellipsis's clip would
         cut. Only where the trim is supported. */
        web([
          rule(
            { supports: '(text-box: trim-both cap alphabetic)' },
            { paddingBlock: token('space-2xs'), textBox: 'trim-both cap alphabetic' },
          ),
        ]),
      ]),
      /* An icon in the label sits on the middle of the line, not on its
       baseline. */
      on({ region: 'default', slotted: 'helix-icon' }, [
        rule({ marginInlineEnd: hook.gap, verticalAlign: 'middle' }),
      ]),
      /* A step under the tag's own icon, even, and never under the tag's text. */
      on('dismiss-mark', [
        rule({
          own: { tagDismiss: dismissSize },
          blockSize: own.tagDismiss,
          inlineSize: own.tagDismiss,
        }),
      ]),
      /* The category a tag belongs to, before the label it qualifies, every
       declaration on what is passed in, so an empty `start` draws nothing. */
      on({ region: 'start', slotted: '*' }, [
        rule({
          fontWeight: token('weight-semibold'),
          marginInlineEnd: own.tagInset,
          opacity: token('opacity-quiet'),
        }),
      ]),
      /* A link tag keeps the tag's ink, takes an underline under a pointer, and
       ends in an ellipsis as the plain label does. */
      on('link', [
        rule({ color: inherit(), display: 'block', minInlineSize: 0, textDecoration: 'none' }),
        rule({ canHover: true, hover: true, href: true }, { textDecoration: 'underline' }),
        rule(
          { focusVisible: true },
          {
            borderRadius: token('radii-sm'),
            outline: [token('size-focus-ring'), 'solid', token('color-focus-ring')],
            outlineOffset: token('size-focus-offset'),
          },
        ),
      ]),
      on('cell', [
        rule({
          alignItems: 'center',
          alignSelf: 'stretch',
          borderRadius: inherit(),
          web: { cursor: 'default' },
          display: 'inline-flex',
          gap: hook.gap,
          marginInline: product(own.tagInset, '-1'),
          minInlineSize: 0,
          paddingInline: own.tagInset,
        }),
        rule(
          { focusVisible: true },
          {
            outline: [token('size-focus-ring'), 'solid', token('color-focus-ring')],
            outlineOffset: token('size-focus-offset'),
          },
        ),
        /* **A tag that can be chosen answers the pointer**, as a selectable
           row does: the pointer, the hover wash over its fill, and the press a
           step past it. In a group that selects, the focus ring was the only
           sign a tag could be chosen. A tag in a group that does not select
           stays a label. */
        web([
          rule({ disabled: false, selectable: true }, { cursor: 'pointer' }),
          rule(
            { disabled: false, hover: true, selectable: true },
            { backgroundColor: token('color-hover') },
          ),
          rule(
            { active: true, disabled: false, selectable: true },
            { backgroundColor: token('color-press') },
          ),
        ]),
      ]),
    ]
  },
)
