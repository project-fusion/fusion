import { oneOf } from '../../../render.js'
import { first, hookOf, token, web } from '../../../style.js'
import { styles } from '../../../table.js'
import root from './headless.js'

/**
 * Copy Button's styled tier.
 *
 * **It is drawn over Icon Button's rules**: the web element adopts Icon
 * Button's stylesheet before this one, and a phone lays Icon Button's rules
 * under these. Its own hooks set the ink and the size Icon Button's rules
 * read, each falling back to what an icon button draws.
 *
 * **A press never resizes it**: the marks stand in one cell, and under
 * `show-label` its words take a second one, as wide as the longest of them
 * on the web. The check holds the success ink and the cross the danger ink,
 * through a hover too. Print leaves the button out, and is the web's.
 */
export default styles(
  root,
  {
    prefix: 'copy-button',
    over: 'icon-button',
    hooks: {
      color: null,
      colorHover: null,
      errorColor: token('color-danger'),
      iconSize: token('size-icon-tight'),
      size: hookOf('icon-button', 'size', token('size-control')),
      successColor: token('color-success'),
    },
    own: { iconButtonInk: null, iconButtonInkHover: null, iconButtonSize: null },
    props: {
      emphasis: oneOf(['ghost', 'outlined', 'solid', 'subtle']),
      tone: oneOf(['accent', 'danger', 'neutral', 'primary']),
    },
    stylesheet: 'copy-button/root/copy-button-root.generated.css',
  },
  ({ hook, on, rule }) => {
    const success = hook.successColor
    const danger = hook.errorColor
    return [
      /* Its own hooks over the icon button's defaults. A `tone` keeps its own ink. */
      on('host', [
        rule({
          own: {
            iconButtonInk: hook.color(token('color-foreground-muted')),
            iconButtonInkHover: first(hook.colorHover, hook.color, token('color-foreground')),
            iconButtonSize: hook.size,
          },
        }),
      ]),
      /* The confirmation must not resize the button. */
      on('button', [web([rule({ display: 'inline-grid', placeItems: 'center' })])]),
      on({ part: 'button', inner: '> slot' }, [web([rule({ gridArea: '1 / 1' })])]),
      /* Under `show-label`, the words sit in a second cell beside the icon. */
      on('button', [
        rule(
          { showLabel: true },
          {
            columnGap: token('space-xs'),
            web: { gridAutoFlow: 'column' },
            inlineSize: 'auto',
            paddingInline: token('space-sm'),
          },
        ),
      ]),
      /* The three words share one cell on the web, so the widest sets the width. */
      on('text', [
        rule({
          display: web('inline-grid'),
          fontWeight: token('weight-medium'),
          justifyItems: web('start'),
          web: { gridArea: '1 / 2' },
        }),
      ]),
      on({ part: 'text', inner: '> span' }, [web([rule({ gridArea: '1 / 1' })])]),
      on({ part: 'text', inner: '> [hidden]' }, [
        web([rule({ display: 'block', visibility: 'hidden' })]),
      ]),
      /* A slot is `display: contents`, which `[hidden]` in the UA sheet does not beat. */
      /* Written out: a condition reads no attribute of a slot. */
      on({ part: 'button', selector: 'slot[hidden]' }, [web([rule({ display: 'none' })])]),
      /* The confirmation is the one moment this control is loud, under the pointer too. */
      on('button', [
        rule({ part: { 'data-copied': true } }, { color: success }),
        rule({ part: { 'data-failed': true } }, { color: danger }),
      ]),
      /* The marks drawn by default, which an icon passed in replaces. */
      on('mark', [
        rule({
          blockSize: hook.iconSize,
          inlineSize: hook.iconSize,
        }),
      ]),
      on('host', [rule({ print: true }, { display: 'none' })]),
    ]
  },
)
