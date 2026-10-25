import { mix, product, sum, token } from '../../../style.js'
import { styles } from '../../../table.js'
import breadcrumb from './headless.js'

/**
 * A crumb's styled tier, which writes
 * `helix/styled/src/breadcrumbs/breadcrumb/breadcrumb.generated.css`. Its
 * hooks are the trail's, `--breadcrumbs-*`.
 *
 * **A control in a crumb is a crumb-sized target.** The host hands a Button
 * or an Icon Button inside it the crumb's own height, written as the text
 * size times the leading and never `1lh`, which a custom property resolves
 * against the element that reads it.
 *
 * **The chevron is centered on the capitals** on the web, where the font's
 * metrics place it. A phone's glyph is an em of the crumb's words.
 *
 * **A link reads as a subtle button under the pointer**, its own and a
 * slotted anchor alike, and only the first crumb's is pulled back, so the
 * trail starts where the content around it does. **The current page reads
 * as where you are**, in the full ink.
 *
 * **A crumb with something in `end` is a split control**: the label and the
 * trigger touch, the inner corners go square, and the trail's `separation`
 * tells the halves apart with a shared fill under the pointer or a hairline.
 *
 * **Two selectors stay written out**: a half of the split control that
 * lights while its sibling is under the pointer, which no condition names.
 * **A link is an anchor** only with an `href` and while it is not the
 * current page, so `a[part="link"]` is written `{ current: false, href: true }`.
 */
export default styles(
  breadcrumb,
  {
    prefix: 'breadcrumbs',
    hooks: [
      'control-padding-inline',
      'control-size',
      'current-color',
      'font-weight',
      'gap',
      'hover-color',
      'link-color',
      'radius',
      'separator-color',
    ],
    /* Set by the trail, `breadcrumbs/root`, by its `separation`; read here. */
    own: [
      'breadcrumbs-mark-glyph',
      'breadcrumbs-mark-words',
      'breadcrumbs-split-fill',
      'breadcrumbs-split-rule',
    ],
    stylesheet: 'breadcrumbs/breadcrumb/breadcrumb.generated.css',
  },
  ({ hook, on, own, rule }) => {
    /* A crumb's height: the text size times the leading, and never `1lh`. */
    const control = hook.controlSize(
      sum(product(token('text-control'), token('leading-normal')), product(token('space-2xs'), 2)),
    )
    const hover = hook.hoverColor(mix(token('color-foreground'), 8, 'transparent'))
    const ring = [token('size-focus-ring'), 'solid', token('color-focus-ring')] as const
    const separator = {
      color: hook.separatorColor(token('color-foreground-subtle')),
      display: 'block',
      userSelect: 'none',
    } as const
    const chevron = {
      blockSize: '1em',
      inlineSize: '1em',
      verticalAlign: 'calc(0.5cap - 0.5em)',
    } as const
    /* The slash in the chevron's box: an inline block an em wide, with the glyph
       centered, so it sits on the crumbs' baseline and keeps their spacing. */
    const slash = { display: 'inline-block', inlineSize: '1em', textAlign: 'center' } as const
    const pulled = { marginInlineStart: product(token('space-xs'), '-1') } as const
    const split = {
      borderEndEndRadius: token('radii-none'),
      borderStartEndRadius: token('radii-none'),
      paddingInlineEnd: token('space-2xs'),
    } as const
    return [
      on('host', [
        rule({
          '--icon-button-size': control,
          '--button-size': control,
          '--button-padding-inline': hook.controlPaddingInline(token('space-xs')),
          /* What sits between a trigger's label and its chevron. */
          '--button-gap': token('space-2xs'),
          alignItems: 'center',
          display: 'inline-flex',
          gap: hook.gap(token('space-xs')),
        }),
        rule({ fontWeight: hook.fontWeight(token('weight-medium')) }),
        rule({ current: true }, { color: hook.currentColor(token('color-foreground')) }),
        /* A hidden crumb takes no room, and nor does one a long trail folded
           away. */
        rule({ state: 'folded' }, { display: 'none' }),
      ]),
      /* `hidden` is the web's own attribute and no prop, so it stays written
         out. */
      on({ part: 'host', selector: ':host([hidden])' }, [
        rule({ platform: 'web' }, { display: 'none' }),
      ]),
      /* Each crumb draws the separator before it, and the first draws none. */
      on('separator', [rule(separator), rule({ place: 'first' }, { display: 'none' })]),
      on({ part: 'separator', inner: 'svg' }, [rule({ platform: 'web' }, chevron)]),
      /* The slash takes the chevron's box, an em wide and centered in it, so a trail
         keeps its spacing whichever mark it draws. Before the crumb and before its
         fold button alike: the fold separator's rule is with its group. */
      on('separator-mark', [rule({ part: { 'data-mark': 'slash' }, platform: 'web' }, slash)]),
      /* **A phone's slash is the same box**, drawn ahead of the separator's
         chevron, which the trail puts away under `separator="slash"`, before
         a crumb and before its fold button alike. */
      on({ before: 'separator' }, [
        rule({ platform: 'native' }, { ...slash, content: own.markWords('none') }),
      ]),
      on({ before: 'fold-separator' }, [
        rule({ platform: 'native' }, { ...slash, content: own.markWords('none') }),
      ]),
      on(
        ['separator-mark', 'fold-separator-mark'],
        [rule({ platform: 'native' }, { display: own.markGlyph('flex') })],
      ),
      /* An anchor of your own, which belongs to the page and is styled here
         through the slot. */
      on({ slotted: 'a' }, [
        rule(
          { platform: 'web' },
          {
            backgroundColor: 'transparent',
            borderRadius: hook.radius(token('radii-sm')),
            padding: [token('space-2xs'), token('space-xs')],
            transition: ['background-color', token('duration-fast'), token('easing-standard')],
          },
        ),
        rule({ place: 'first', platform: 'web' }, pulled),
        rule({ platform: 'web', state: 'end' }, split),
        rule({ hover: true, platform: 'web' }, { backgroundColor: hover }),
        rule(
          { focusVisible: true, platform: 'web' },
          {
            outline: ring,
            outlineOffset: token('size-focus-offset'),
          },
        ),
        rule(
          { focusVisible: true, platform: 'web', state: 'end' },
          {
            outlineOffset: product(token('size-focus-offset'), '-1'),
          },
        ),
        /* A focused half draws above its neighbor, so nothing paints over its
           ring. */
        rule(
          { focusVisible: true, platform: 'web', state: 'end' },
          {
            position: 'relative',
            zIndex: token('layer-raised'),
          },
        ),
      ]),
      /* The crumb itself, a link or the current page. The gap is what sits
         between a mark and the word beside it. */
      on('link', [
        rule({
          alignItems: 'center',
          borderRadius: hook.radius(token('radii-sm')),
          color: hook.linkColor(token('color-foreground-muted')),
          display: 'inline-flex',
          gap: token('space-xs'),
          padding: [token('space-2xs'), token('space-xs')],
          textDecoration: 'none',
        }),
        /* The first link is pulled back, as the first slotted anchor is. */
        rule({ current: false, href: true, place: 'first' }, pulled),
        /* The block half of the padding is the hover fill's, which a crumb that
           is no link does not draw, and the inline half is for words the crumb
           draws itself, the current page's. */
        rule({ href: false }, { paddingBlock: token('space-none') }),
        rule({ current: false, href: false }, { paddingInline: token('space-none') }),
        rule({ current: true }, { color: hook.currentColor(token('color-foreground')) }),
        /* The split control's label half: square inner corners, and the space
           between the word and the chevron split across the seam. */
        rule({ state: 'end' }, split),
        /* `outlined`: a hairline between the halves, at rest as well, on the
           trigger's side of the seam. Under `plain` it is transparent. */
        rule({ state: 'end' }, { position: 'relative' }),
        rule(
          { current: false, hover: true, href: true, platform: 'web' },
          {
            backgroundColor: hover,
            color: hook.currentColor(token('color-foreground')),
          },
        ),
        rule(
          { current: false, focusVisible: true, href: true, platform: 'web' },
          {
            outline: ring,
            outlineOffset: token('size-focus-offset'),
          },
        ),
        rule(
          { current: false, focusVisible: true, href: true, platform: 'web', state: 'end' },
          {
            outlineOffset: product(token('size-focus-offset'), '-1'),
          },
        ),
        /* A focused half draws above its neighbor, so nothing paints over its
           ring. */
        rule(
          { focusVisible: true, platform: 'web', state: 'end' },
          {
            position: 'relative',
            zIndex: token('layer-raised'),
          },
        ),
      ]),
      /* `plain`: both halves take the light fill while either is under the
         pointer, and the half under it the full fill over that. */
      on({ part: 'link', selector: ':host(:state(end)) [part="link"]:hover ~ slot[name="end"]' }, [
        rule(
          { platform: 'web' },
          { '--icon-button-background-color': own.splitFill('transparent') },
        ),
      ]),
      on(
        {
          part: 'link',
          selector:
            ':host(:state(end)) [part="link"]:has(~ slot[name="end"]:hover),\n:host(:state(end)) [part="link"]:has(~ slot[name="end"]:hover) ::slotted(a)',
        },
        [rule({ platform: 'web' }, { backgroundColor: own.splitFill('transparent') })],
      ),
      on({ after: 'link' }, [
        rule(
          { state: 'end' },
          {
            backgroundColor: own.splitRule('transparent'),
            content: '""',
            inlineSize: token('border-thin'),
            insetBlock: '20%',
            insetInlineEnd: product(token('border-thin'), '-1'),
            pointerEvents: 'none',
            position: 'absolute',
          },
        ),
      ]),
      /* The trigger half. The hooks reach a Button or an Icon Button however
         deep it sits, and its focus ring is drawn inside it, so it stays clear
         of the label's last letter. */
      on({ region: 'end' }, [
        rule(
          { state: 'end' },
          {
            '--button-radius': hook.radius(token('radii-sm')),
            '--button-radius-start': token('radii-none'),
            '--helix-size-focus-offset': product(token('size-focus-ring'), '-1'),
            '--icon-button-background-color-hover': hover,
            '--icon-button-radius': hook.radius(token('radii-sm')),
            '--icon-size': '1.15em',
            alignItems: 'center',
            display: 'inline-flex',
            marginInlineStart: product(hook.gap(token('space-xs')), '-1'),
          },
        ),
      ]),
      /* A slot holds no interaction a condition names, so the trigger half's
         stays written out. */
      on({ part: 'host', selector: ':host(:state(end)) slot[name="end"]:focus-within' }, [
        rule({ platform: 'web' }, { position: 'relative', zIndex: token('layer-raised') }),
      ]),
      /* The fold after the first crumb of a long slotted trail: a chevron, and
         the ghost icon button that opens its menu, which the host sizes as
         any control in a crumb. */
      on('fold-separator', [rule(separator)]),
      on({ part: 'fold-separator', inner: 'svg' }, [rule({ platform: 'web' }, chevron)]),
      /* The fold's slash takes the same box as the slash before a crumb. */
      on({ part: 'fold-separator', inner: '[data-mark="slash"]' }, [
        rule({ platform: 'web' }, slash),
      ]),
    ]
  },
)
