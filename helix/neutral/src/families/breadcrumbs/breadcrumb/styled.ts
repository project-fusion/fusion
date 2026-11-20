import { difference, fn, native, product, quotient, sum, token, web } from '../../../style.js'
import { styles } from '../../../table.js'
import breadcrumb from './headless.js'

/**
 * A crumb's styled tier. Its
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
    hooks: {
      controlPaddingInline: token('space-xs'),
      /* The crumb's line rounded up to an even height, and its padding. */
      controlSize: sum(
        fn('round', 'up', product(token('text-control'), token('leading-normal')), '2px'),
        product(token('space-2xs'), 2),
      ),
      currentColor: token('color-foreground'),
      fontWeight: token('weight-medium'),
      gap: token('space-xs'),
      hoverBackgroundColor: token('color-hover'),
      linkColor: token('color-foreground-muted'),
      radius: token('radii-sm'),
      separatorColor: token('color-foreground-muted'),
    },
    /* Set by the trail, `breadcrumbs/root`, by its `separation`; read here. */
    own: {
      breadcrumbsMarkGlyph: null,
      breadcrumbsMarkWords: null,
      breadcrumbsSplitFill: null,
      breadcrumbsSplitRule: null,
      /* The chevron's even size, seven tenths of the region's icon step. */
      breadcrumbSeparator: null,
    },
    stylesheet: 'breadcrumbs/breadcrumb/breadcrumb.generated.css',
  },
  ({ hook, on, own, rule }) => {
    /* A crumb's height: the text size times the leading, and never `1lh`. */
    const control = hook.controlSize
    const hover = hook.hoverBackgroundColor
    const ring = [token('size-focus-ring'), 'solid', token('color-focus-ring')] as const
    const separator = {
      own: { breadcrumbSeparator: fn('round', product(token('size-icon'), 0.7), '2px') },
      color: hook.separatorColor,
      display: 'block',
      userSelect: 'none',
    } as const
    /* The crumb's line rounded up to an even height, so the box centers on a
       whole pixel in the row. */
    const evenLine = { lineHeight: fn('round', 'up', '1lh', '2px') } as const
    /* Centered on the capitals, the lift rounded to the pixel. */
    const chevron = {
      blockSize: own.breadcrumbSeparator,
      inlineSize: own.breadcrumbSeparator,
      verticalAlign: fn('round', difference('0.5cap', quotient(own.breadcrumbSeparator, 2)), '1px'),
    } as const
    /* The slash in the chevron's box, with the glyph centered, so it sits on
       the crumbs' baseline and keeps their spacing. */
    const slash = {
      display: 'inline-block',
      inlineSize: own.breadcrumbSeparator,
      textAlign: 'center',
    } as const
    /* The press reaches the target, in a transparent box, so nothing drawn
       moves. */
    const reach = {
      content: '""',
      inset: quotient(difference(token('size-target'), '100%'), '-2'),
      position: 'absolute',
    } as const
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
          '--button-padding-inline': hook.controlPaddingInline,
          /* What sits between a trigger's label and its chevron. */
          '--button-gap': token('space-2xs'),
          alignItems: 'center',
          display: 'inline-flex',
          gap: hook.gap,
          /* No wider than the trail, so a long unbroken word wraps inside it. */
          maxInlineSize: '100%',
          minInlineSize: 0,
        }),
        /* An icon in a crumb is drawn to the crumb's text, in the link, in the
           trigger and in a control alike, at Button's even step, so the glyph's
           center is on a whole pixel. The crumb's line is rounded up to an even
           height, so a link is a whole number of pixels tall. */
        web([
          rule({
            '--icon-size': fn('round', 'down', '1.15em', '2px'),
            lineHeight: fn('round', 'up', product('1em', token('leading-normal')), '2px'),
          }),
        ]),
        native([rule({ '--icon-size': '1.15em' })]),
        rule({ fontWeight: hook.fontWeight }),
        rule({ has: 'current' }, { color: hook.currentColor }),
        /* A hidden crumb takes no room, and nor does one a long trail folded
           away. */
        rule({ folded: true }, { display: 'none' }),
      ]),
      /* Written out: `hidden` is the global attribute, which is no prop of the element. */
      on({ part: 'host', selector: ':host([hidden])' }, [web([rule({ display: 'none' })])]),
      /* Each crumb draws the separator before it, and the first draws none. */
      on('separator', [
        rule(separator),
        web([rule(evenLine)]),
        rule({ place: 'first' }, { display: 'none' }),
      ]),
      on({ part: 'separator', inner: 'svg' }, [web([rule(chevron)])]),
      /* The slash takes the chevron's box, an em wide and centered in it, so a trail
         keeps its spacing whichever mark it draws. Before the crumb and before its
         fold button alike: the fold separator's rule is with its group. */
      on('separator-mark', [web([rule({ part: { 'data-mark': 'slash' } }, slash)])]),
      /* **A phone's slash is the same box**, drawn ahead of the separator's
         chevron, which the trail puts away under `separator="slash"`, before
         a crumb and before its fold button alike. */
      on({ before: 'separator' }, [
        native([rule({ ...slash, content: own.breadcrumbsMarkWords('none') })]),
      ]),
      on({ before: 'fold-separator' }, [
        native([rule({ ...slash, content: own.breadcrumbsMarkWords('none') })]),
      ]),
      on(
        ['separator-mark', 'fold-separator-mark'],
        [native([rule({ display: own.breadcrumbsMarkGlyph('flex') })])],
      ),
      /* An anchor of your own, which belongs to the page and is styled here
         through the slot. */
      on({ slotted: 'a' }, [
        web([
          rule({
            backgroundColor: 'transparent',
            borderRadius: hook.radius,
            /* The crumb's own ink and no underline, as a crumb this component
               draws takes. */
            color: hook.linkColor,
            textDecoration: 'none',
            padding: [token('space-2xs'), token('space-xs')],
            position: 'relative',
            transition: ['background-color', token('duration-fast'), token('easing-standard')],
            /* A long unbroken word breaks inside the column it was given. */
            minInlineSize: 0,
            overflowWrap: 'anywhere',
          }),
          rule({ place: 'first' }, pulled),
          rule({ end: true }, split),
          rule({ hover: true }, { backgroundColor: hover, color: hook.currentColor }),
          /* A press steps past the hover, as every control's does. */
          rule({ active: true }, { backgroundColor: token('color-press') }),
          rule(
            { focusVisible: true },
            {
              outline: ring,
              outlineOffset: token('size-focus-offset'),
            },
          ),
          rule(
            { focusVisible: true, end: true },
            {
              outlineOffset: product(token('size-focus-offset'), '-1'),
            },
          ),
          /* A focused half draws above its neighbor, so nothing paints over its
           ring. */
          rule(
            { focusVisible: true, end: true },
            {
              position: 'relative',
              zIndex: token('layer-raised'),
            },
          ),
        ]),
      ]),
      /* The crumb itself, a link or the current page. The gap is what sits
         between a mark and the word beside it. */
      on('link', [
        rule({
          alignItems: 'center',
          borderRadius: hook.radius,
          color: hook.linkColor,
          display: 'inline-flex',
          gap: token('space-xs'),
          /* A long unbroken word breaks inside the trail. */
          minInlineSize: 0,
          padding: [token('space-2xs'), token('space-xs')],
          textDecoration: 'none',
          web: { overflowWrap: 'anywhere' },
        }),
        /* The first link is pulled back, as the first slotted anchor is. */
        rule({ lacks: 'current', has: 'href', place: 'first' }, pulled),
        /* The block half of the padding is the hover fill's, which a crumb that
           is no link does not draw, and the inline half is for words the crumb
           draws itself, the current page's. */
        rule({ lacks: 'href' }, { paddingBlock: token('space-none') }),
        rule({ has: 'current' }, { color: hook.currentColor }),
        /* The split control's label half: square inner corners, and the space
           between the word and the chevron split across the seam. */
        rule({ end: true }, split),
        /* `outlined`: a hairline between the halves while the crumb is in
           use, on the trigger's side of the seam. Under `plain` it is
           transparent. */
        rule({ end: true }, { position: 'relative' }),
        /* After the split, which pads the words: a crumb that is no link and
           no current page draws no words of its own to pad. */
        rule({ lacks: ['current', 'href'] }, { paddingInline: token('space-none') }),
        rule(
          { lacks: 'current', active: true, has: 'href' },
          { backgroundColor: token('color-press') },
        ),
        web([
          rule(
            { lacks: 'current', hover: true, has: 'href' },
            {
              backgroundColor: hover,
              color: hook.currentColor,
            },
          ),
          rule(
            { lacks: 'current', focusVisible: true, has: 'href' },
            {
              outline: ring,
              outlineOffset: token('size-focus-offset'),
            },
          ),
          rule(
            { lacks: 'current', focusVisible: true, has: 'href', end: true },
            {
              outlineOffset: product(token('size-focus-offset'), '-1'),
            },
          ),
          /* A focused half draws above its neighbor, so nothing paints over its
           ring. */
          rule(
            { focusVisible: true, end: true },
            {
              position: 'relative',
              zIndex: token('layer-raised'),
            },
          ),
        ]),
      ]),
      /* `plain`: both halves take the light fill while either is under the
         pointer, and the half under it the full fill over that. */
      /* Written out: the vocabulary names no part beside another. */
      on({ part: 'link', selector: ':host(:state(end)) [part="link"]:hover ~ slot[name="end"]' }, [
        web([rule({ '--icon-button-background-color': own.breadcrumbsSplitFill('transparent') })]),
      ]),
      /* Written out: the vocabulary names no part beside another, and no slot in a state. */
      on(
        {
          part: 'link',
          selector:
            ':host(:state(end)) [part="link"]:has(~ slot[name="end"]:hover),\n:host(:state(end)) [part="link"]:has(~ slot[name="end"]:hover) ::slotted(a)',
        },
        [web([rule({ backgroundColor: own.breadcrumbsSplitFill('transparent') })])],
      ),
      on({ after: 'link' }, [
        rule(
          { end: true },
          {
            backgroundColor: own.breadcrumbsSplitRule('transparent'),
            content: '""',
            inlineSize: token('border-thin'),
            insetBlock: '20%',
            insetInlineEnd: product(token('border-thin'), '-1'),
            pointerEvents: 'none',
            position: 'absolute',
          },
        ),
        /* At rest a split crumb reads as one crumb, as a plain one does: the
           line shows while either half is under the pointer or has focus, and
           while the crumb's menu is open. A phone keeps the line. */
        web([
          rule(
            { end: true },
            {
              opacity: 0,
              transition: ['opacity', token('duration-fast'), token('easing-standard')],
            },
          ),
        ]),
      ]),
      /* Written out: the vocabulary names no host hover for a part's
         pseudo-element, and no part beside a slot. */
      on(
        {
          part: 'link',
          selector:
            ':host(:state(end):hover) [part="link"]::after,\n:host(:state(end)) [part="link"]:focus-visible::after,\n:host(:state(end)) [part="link"]:focus-within::after,\n:host(:state(end)) [part="link"]:has(~ slot[name="end"]:focus-within)::after',
        },
        [web([rule({ opacity: 1 })])],
      ),
      /* The link the crumb draws from `href` reaches the target, by
         `::before`, since a split crumb draws its rule in `::after`. */
      on({ before: 'link' }, [web([rule({ current: false, href: true }, reach)])]),
      /* Written out: no condition names a slotted anchor's pseudo-element. */
      on({ part: 'host', selector: '::slotted(a)::after' }, [web([rule(reach)])]),
      /* The trigger half. The hooks reach a Button or an Icon Button however
         deep it sits, and its focus ring is drawn inside it, so it stays clear
         of the label's last letter. */
      on({ region: 'end' }, [
        rule(
          { end: true },
          {
            '--button-radius': hook.radius,
            '--button-radius-start': token('radii-none'),
            '--helix-size-focus-offset': product(token('size-focus-ring'), '-1'),
            '--icon-button-background-color-hover': hover,
            '--icon-button-radius': hook.radius,
            alignItems: 'center',
            display: 'inline-flex',
            marginInlineStart: product(hook.gap, '-1'),
          },
        ),
      ]),
      /* A slot holds no interaction a condition names, so the trigger half's
         stays written out. */
      /* Written out: a condition reads no interaction of a slot. */
      on({ part: 'host', selector: ':host(:state(end)) slot[name="end"]:focus-within' }, [
        web([rule({ position: 'relative', zIndex: token('layer-raised') })]),
      ]),
      /* The fold after the first crumb of a long slotted trail: a chevron, and
         the ghost icon button that opens its menu, which the host sizes as
         any control in a crumb. */
      /* The fold's button takes a crumb's hover, its fill and its ink, by the
         same hooks: the Icon Button stands where a plain button stood. */
      on('expand', [
        rule({ '--icon-button-background-color-hover': hover }),
        rule({ hover: true }, { '--icon-button-foreground-color': hook.currentColor }),
      ]),
      on('fold-separator', [rule(separator), web([rule(evenLine)])]),
      on({ part: 'fold-separator', inner: 'svg' }, [web([rule(chevron)])]),
      /* The fold's slash takes the same box as the slash before a crumb. */
      on({ part: 'fold-separator', inner: '[data-mark="slash"]' }, [web([rule(slash)])]),
    ]
  },
)
