import printEconomy from '../../../fragments/print-economy.js'
import { inherit, inherited, token } from '../../../style.js'
import { styles } from '../../../table.js'
import { prop } from '../../../tree.js'
import root from './headless.js'

/**
 * Text's styled tier, which writes `helix/styled/src/text/root/text-root.generated.css`.
 *
 * **`as` sets the element, and `variant` the ramp**: size, weight, leading
 * and tracking together. The two match by default, so `as="h2"` takes the
 * heading ramp and a `variant` overrides it. Each `--text-*` hook overrides
 * one value of the ramp, and with none set the words keep the type around
 * them.
 *
 * **Inline or a block by what it renders.** `p`, `h1` to `h6`, and a text
 * with `lines` are blocks. On a phone a block is a view holding the run, and
 * an inline text is the run alone, nested in the words around it.
 *
 * **`text-wrap` breaks the lines on a phone too**: `balance` and `pretty`
 * choose Android's balanced and high-quality line breaking, and iOS's
 * standard, which has no balance of its own. `nowrap` keeps one line.
 */
export default styles(
  root,
  {
    prefix: 'text',
    hooks: ['font-family', 'font-size', 'font-weight', 'letter-spacing', 'line-height'],
    props: [
      prop('emphasis', ['muted']),
      prop('tone', ['accent', 'danger', 'info', 'primary', 'success', 'warning']),
      prop('variant', [
        'display',
        'heading',
        'subheading',
        'title',
        'body',
        'body-strong',
        'caption',
        'label',
        'code',
      ]),
    ],
    stylesheet: 'text/root/text-root.generated.css',
  },
  ({ hook, include, on, rule, variants }) => [
    /* Each value of the ramp reads its hook first. Unset, a declaration whose
       only value is an unset property inherits, which is what these inherited
       properties do with no declaration at all, so the resting text is
       unchanged. A phone leaves each unset hook out, and the words take the
       type around them. */
    on('host', [
      rule({
        display: 'inline',
        fontFamily: hook.fontFamily(),
        fontSize: hook.fontSize(),
        fontWeight: hook.fontWeight(),
        letterSpacing: hook.letterSpacing(),
        lineHeight: hook.lineHeight(),
      }),
      rule({ as: ['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'] }, { display: 'block' }),
      /* The ramps live here, and the `data-text` recipe for a plain element
         stays in the base layer. A document rule reaches inside every component
         that slots a `helix-text` and beats that component's own stylesheet, so
         a dialog asking for a smaller title would get the ramp's instead. */
      rule([{ variant: 'display' }, { as: 'h1', variant: false }], {
        fontFamily: hook.fontFamily(token('font-display')),
        fontSize: hook.fontSize(token('text-3xl')),
        fontWeight: hook.fontWeight(token('weight-semibold')),
        letterSpacing: hook.letterSpacing(token('tracking-tight')),
        lineHeight: hook.lineHeight(token('leading-heading')),
      }),
      rule([{ variant: 'heading' }, { as: 'h2', variant: false }], {
        fontFamily: hook.fontFamily(token('font-sans')),
        fontSize: hook.fontSize(token('text-2xl')),
        fontWeight: hook.fontWeight(token('weight-semibold')),
        letterSpacing: hook.letterSpacing(token('tracking-tight')),
        lineHeight: hook.lineHeight(token('leading-heading')),
      }),
      rule([{ variant: 'subheading' }, { as: 'h3', variant: false }], {
        fontFamily: hook.fontFamily(token('font-sans')),
        fontSize: hook.fontSize(token('text-xl')),
        fontWeight: hook.fontWeight(token('weight-semibold')),
        letterSpacing: hook.letterSpacing(token('tracking-tight')),
        lineHeight: hook.lineHeight(token('leading-heading')),
      }),
      rule([{ variant: 'title' }, { as: 'h4', variant: false }], {
        fontFamily: hook.fontFamily(token('font-sans')),
        fontSize: hook.fontSize(token('text-lg')),
        fontWeight: hook.fontWeight(token('weight-semibold')),
        letterSpacing: hook.letterSpacing(token('tracking-normal')),
        lineHeight: hook.lineHeight(token('leading-heading')),
      }),
      rule([{ variant: 'body' }, { as: 'p', variant: false }], {
        fontFamily: hook.fontFamily(token('font-sans')),
        fontSize: hook.fontSize(token('text-md')),
        fontWeight: hook.fontWeight(token('weight-regular')),
        letterSpacing: hook.letterSpacing(token('tracking-normal')),
        lineHeight: hook.lineHeight(token('leading-normal')),
      }),
      rule(
        [
          { variant: 'body-strong' },
          { as: 'h5', variant: false },
          { as: 'h6', variant: false },
          { as: 'strong', variant: false },
        ],
        {
          fontFamily: hook.fontFamily(token('font-sans')),
          fontSize: hook.fontSize(token('text-md')),
          fontWeight: hook.fontWeight(token('weight-medium')),
          letterSpacing: hook.letterSpacing(token('tracking-normal')),
          lineHeight: hook.lineHeight(token('leading-normal')),
        },
      ),
      rule(
        { variant: 'caption' },
        {
          fontFamily: hook.fontFamily(token('font-sans')),
          fontSize: hook.fontSize(token('text-sm')),
          fontWeight: hook.fontWeight(token('weight-regular')),
          letterSpacing: hook.letterSpacing(token('tracking-normal')),
          lineHeight: hook.lineHeight(token('leading-normal')),
        },
      ),
      /* `as="label"` is deprecated and no longer listed, and still takes the
         label ramp on the web, which reads the attribute as written. */
      rule([{ variant: 'label' }, { as: 'label', variant: false }], {
        fontFamily: hook.fontFamily(token('font-sans')),
        fontSize: hook.fontSize(token('text-xs')),
        fontWeight: hook.fontWeight(token('weight-medium')),
        letterSpacing: hook.letterSpacing(token('tracking-wide')),
        lineHeight: hook.lineHeight(token('leading-normal')),
      }),
      rule([{ variant: 'code' }, { as: 'code', variant: false }], {
        fontFamily: hook.fontFamily(token('font-mono')),
        fontSize: hook.fontSize(token('text-xs')),
        fontWeight: hook.fontWeight(token('weight-regular')),
        letterSpacing: hook.letterSpacing(token('tracking-normal')),
        lineHeight: hook.lineHeight(token('leading-normal')),
      }),
      /* **A heading keeps the heading ink where a surface mutes its body.** A
         card sets its body in the muted ink and names the full one in
         `--_heading-ink`; anywhere else a heading inherits, `currentColor`
         being the inherited color. A phone reads it from the element around. */
      rule(
        [
          { as: ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'] },
          { variant: ['display', 'heading', 'subheading', 'title'] },
        ],
        { color: inherited('_heading-ink', 'currentColor') },
      ),
      /* **Tone and emphasis again, for a text inside another shadow root.** The
         base layer colors `helix-text[tone]` from the document, which reaches
         no shadow tree. After the heading ink, which a tone overrides. */
      rule({ emphasis: 'muted' }, { color: token('color-foreground-muted') }),
      variants('tone', {
        accent: { color: token('color-accent') },
        danger: { color: token('color-danger') },
        info: { color: token('color-info') },
        primary: { color: token('color-primary') },
        success: { color: token('color-success') },
        warning: { color: token('color-warning') },
      }),
      rule({ emphasis: 'muted', tone: 'accent' }, { color: token('color-accent-muted') }),
      rule({ emphasis: 'muted', tone: 'danger' }, { color: token('color-danger-muted') }),
      rule({ emphasis: 'muted', tone: 'info' }, { color: token('color-info-muted') }),
      rule({ emphasis: 'muted', tone: 'primary' }, { color: token('color-primary-muted') }),
      rule({ emphasis: 'muted', tone: 'success' }, { color: token('color-success-muted') }),
      rule({ emphasis: 'muted', tone: 'warning' }, { color: token('color-warning-muted') }),
      /* A line count needs a width to break against, so a clamped text is a
         block. The count itself is written on the part, so a count that is no
         count cuts nothing off. */
      rule({ lines: true }, { display: 'block', minInlineSize: 0 }),
      /* Named for the CSS properties they set, so each rule is the value. */
      variants('text-align', {
        start: { textAlign: 'start' },
        center: { textAlign: 'center' },
        end: { textAlign: 'end' },
        justify: { textAlign: 'justify' },
      }),
      variants('text-wrap', {
        balance: { textWrap: 'balance' },
        pretty: { textWrap: 'pretty' },
        nowrap: { textWrap: 'nowrap' },
      }),
    ]),
    /* The part is the element `as` names, which takes the host's type. */
    on('text', [
      rule({
        color: inherit(),
        font: inherit(),
        letterSpacing: inherit(),
        margin: token('space-none'),
      }),
      /* `em` is the one tag in the map with nothing else restoring it. */
      rule({ as: 'em' }, { fontStyle: 'italic' }),
    ]),
    /* Type prints. */
    include(printEconomy),
  ],
)
