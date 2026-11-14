import { fn, measured, native, product, sum, token, web } from '../../../style.js'
import { styles } from '../../../table.js'
import pane from './headless.js'

/**
 * Sandbox Source's styled tier.
 *
 * **Every metric that places a character is set on the field and on the
 * colored copy under it alike**, so the two match: the mono face with no
 * ligatures, so `</` and `=>` show the characters written, a size no smaller
 * than a field's least, and a tab of two. The text is the full ink, as Code
 * Input's is: code in the muted ink read as disabled.
 *
 * **Under `tokenize` the field is drawn transparent over the copy**, both in
 * one grid cell of a box that scrolls, so the copy is as tall as the text and
 * the field stretches to it, and the two never drift. The row is at least as
 * tall as the text and fills the box beyond that. The focus ring is drawn
 * inside the pane, on the box that stays in view, since a ring outside would
 * be clipped.
 *
 * **Under `line-numbers` each line is a block of the copy**, numbered in a
 * gutter by its `::before`, so a line that wraps is one block and its number
 * stands beside its first row. The gutter is the start padding of the copy
 * and of the field alike. A phone draws each line as a row, its number in a
 * column as wide as the last number, two steps before its words.
 *
 * **Each kind takes its color from a hook of its own**, the syntax token of its
 * name by default, as the editor colors it.
 */
export default styles(
  pane,
  {
    prefix: 'sandbox-source',
    hooks: {
      backgroundColor: token('color-background'),
      bracketColor: token('color-primary-subtle'),
      callableColor: token('color-syntax-callable'),
      commentColor: token('color-syntax-comment'),
      completionsBorderWidth: token('border-floating'),
      completionsShadow: token('shadow-floating'),
      constantColor: token('color-syntax-constant'),
      invalidColor: token('color-syntax-invalid'),
      keywordColor: token('color-syntax-keyword'),
      lineNumberColor: token('color-foreground-muted'),
      minBlockSize: '12rem',
      nameColor: token('color-syntax-name'),
      stringColor: token('color-syntax-string'),
      tagColor: token('color-syntax-tag'),
    },
    stylesheet: 'sandbox/source/sandbox-source.generated.css',
  },
  ({ hook, on, rule }) => {
    const face = {
      fontFamily: token('font-mono'),
      fontSize: fn('max', token('text-field-min'), token('text-sm')),
      fontVariantLigatures: 'none',
      lineHeight: token('leading-normal'),
    }
    const metrics = {
      border: 'none',
      color: token('color-foreground'),
      ...face,
      inlineSize: '100%',
      minBlockSize: hook.minBlockSize,
      padding: token('space-sm'),
      web: { tabSize: 2 },
    }
    const ring = {
      outline: [token('size-focus-ring'), 'solid', token('color-focus-ring')],
      outlineOffset: product(token('size-focus-offset'), '-1'),
    }
    return [
      on('host', [rule({ display: 'block', web: { blockSize: '100%' } })]),
      on(['highlight', 'source'], [rule(metrics)]),
      on('source', [
        rule({
          backgroundColor: hook.backgroundColor,
          display: 'block',
          web: { blockSize: '100%', resize: 'none' },
        }),
        web([rule({ focusVisible: true }, { backgroundColor: token('color-surface'), ...ring })]),
      ]),
      on('field', [
        web([
          rule({
            backgroundColor: hook.backgroundColor,
            blockSize: '100%',
            display: 'grid',
            gridTemplateRows: 'minmax(max-content, auto)',
            overflow: 'auto',
          }),
          rule({ focusWithin: true }, { backgroundColor: token('color-surface') }),
        ]),
      ]),
      on({ part: 'field', selector: '[part="field"]:has(> [part="source"]:focus-visible)' }, [
        web([rule(ring)]),
      ]),
      on({ part: 'field', selector: '[part="field"] > [part]' }, [
        web([
          rule({
            gridArea: '1 / 1',
            letterSpacing: 'normal',
            margin: 0,
            overflowWrap: 'break-word',
            whiteSpace: 'pre-wrap',
          }),
        ]),
      ]),
      on(
        {
          part: 'field',
          selector:
            '[part="field"] > [part="source"], [part="field"] > [part="source"]:focus-visible',
        },
        [
          web([
            rule({
              WebkitTextFillColor: 'transparent',
              alignSelf: 'stretch',
              backgroundColor: 'transparent',
              blockSize: 'auto',
              caretColor: token('color-foreground'),
              color: 'transparent',
              outline: 'none',
              overflow: 'hidden',
            }),
          ]),
        ],
      ),
      on({ part: 'field', selector: ':host([line-numbers]) [part="field"] > [part]' }, [
        web([
          rule({
            paddingInlineStart: sum(
              product(token('space-sm'), '3'),
              measured('_sandbox-source-gutter', '1ch'),
            ),
          }),
        ]),
      ]),
      on({ part: 'highlight', selector: ':host([line-numbers]) [part="highlight"]' }, [
        web([rule({ counterReset: 'line' })]),
      ]),
      on('line', [
        web([
          rule({
            counterIncrement: 'line',
            display: 'block',
            minBlockSize: '1lh',
            position: 'relative',
          }),
        ]),
      ]),
      on({ part: 'line', selector: '[part="line"]::before' }, [
        web([
          rule({
            color: hook.lineNumberColor,
            content: 'counter(line)',
            insetInlineEnd: sum('100%', product(token('space-sm'), '2')),
            position: 'absolute',
            textAlign: 'end',
          }),
        ]),
      ]),
      on({ part: 'token', selector: '[data-kind="callable"]' }, [
        web([rule({ color: hook.callableColor })]),
      ]),
      on({ part: 'token', selector: '[data-kind="comment"]' }, [
        web([rule({ color: hook.commentColor })]),
      ]),
      on({ part: 'token', selector: '[data-kind="constant"]' }, [
        web([rule({ color: hook.constantColor })]),
      ]),
      on({ part: 'token', selector: '[data-kind="invalid"]' }, [
        web([rule({ color: hook.invalidColor })]),
      ]),
      on({ part: 'token', selector: '[data-kind="keyword"]' }, [
        web([rule({ color: hook.keywordColor })]),
      ]),
      on({ part: 'token', selector: '[data-kind="name"]' }, [
        web([rule({ color: hook.nameColor })]),
      ]),
      on({ part: 'token', selector: '[data-kind="string"]' }, [
        web([rule({ color: hook.stringColor })]),
      ]),
      on({ part: 'token', selector: '[data-kind="tag"]' }, [web([rule({ color: hook.tagColor })])]),
      on({ part: 'field', selector: '[part="field"]:focus-within [part~="bracket"]' }, [
        web([rule({ backgroundColor: hook.bracketColor, borderRadius: token('radii-sm') })]),
      ]),
      on({ part: 'field', selector: '[part="field"]:focus-within [part~="bracket-unmatched"]' }, [
        web([rule({ backgroundColor: 'transparent', color: hook.invalidColor })]),
      ]),
      on('field', [web([rule({ position: 'relative' })])]),
      on('completions', [
        rule({
          backgroundColor: token('color-surface-overlay'),
          border: [hook.completionsBorderWidth, 'solid', token('color-border')],
          borderRadius: token('radii-sm'),
          boxShadow: hook.completionsShadow,
          fontFamily: token('font-mono'),
          fontSize: fn('max', token('text-field-min'), token('text-sm')),
          fontVariantLigatures: 'none',
          maxBlockSize: '12rem',
          minInlineSize: '8rem',
          overflowY: 'auto',
          padding: token('space-2xs'),
          position: 'absolute',
          zIndex: token('layer-raised'),
        }),
      ]),
      on('completion', [
        rule({
          borderRadius: token('radii-sm'),
          color: token('color-foreground'),
          web: { cursor: 'pointer' },
          padding: [token('space-2xs'), token('space-xs')],
          whiteSpace: 'nowrap',
        }),
      ]),
      on('completion-active', [rule({ backgroundColor: token('color-primary-surface') })]),
      /* A phone's lines: a row to each, its number in a column as wide as the
         last number, then its words, which wrap. */
      on('row', [native([rule({ flexDirection: 'row' })])]),
      on('number', [
        native([
          rule({
            ...face,
            color: hook.lineNumberColor,
            inlineSize: product(measured('sandbox-source-digits', 1), '1ch'),
            marginInlineEnd: product(token('space-sm'), '2'),
            textAlign: 'end',
          }),
        ]),
      ]),
      on('words', [native([rule({ ...face, color: token('color-foreground'), flex: 1 })])]),
      on('run', [
        native([
          rule({ part: { 'data-kind': 'callable' } }, { color: hook.callableColor }),
          rule({ part: { 'data-kind': 'comment' } }, { color: hook.commentColor }),
          rule({ part: { 'data-kind': 'constant' } }, { color: hook.constantColor }),
          rule({ part: { 'data-kind': 'invalid' } }, { color: hook.invalidColor }),
          rule({ part: { 'data-kind': 'keyword' } }, { color: hook.keywordColor }),
          rule({ part: { 'data-kind': 'name' } }, { color: hook.nameColor }),
          rule({ part: { 'data-kind': 'string' } }, { color: hook.stringColor }),
          rule({ part: { 'data-kind': 'tag' } }, { color: hook.tagColor }),
        ]),
      ]),
    ]
  },
)
