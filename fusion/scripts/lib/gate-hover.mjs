/**
 * Moves every `:hover` selector in a sheet under `@media (hover: hover)`.
 *
 * **A touch screen keeps `:hover` on the last thing tapped.** Measured in Safari
 * on an iOS 27 simulator on October 31, 2026: a Button rests at 240 and still reads 224
 * two seconds after a tap. One step at compile time covers every sheet, so
 * nobody has to remember the wrapper, and the source stays readable.
 *
 * **A rule that shows something on hover says what happens on touch.** Either
 * the sheet shows it at rest under `@media (hover: none)`, or a comment starting
 * `hover stays on touch` directly before the rule keeps the tap as the way in,
 * as the speaker's level on Video does.
 *
 * `:not(:hover)` is left alone, because it holds on a device with no hover.
 */
const GATED = /:hover\b/
const INVERTED = /:not\([^()]*:hover[^()]*\)/g
const KEEP = /^\s*\/\*\s*hover stays on touch/
const HOVER_QUERY = /\(\s*(any-)?hover\s*:/
const CONDITIONAL = /^@(media|supports|container|layer)\b/

/** The index just past the comment or string that starts at `at`, or `at`. */
const skip = (css, at) => {
  if (css[at] === '/' && css[at + 1] === '*') {
    const end = css.indexOf('*/', at + 2)
    return end === -1 ? css.length : end + 2
  }
  if (css[at] === '"' || css[at] === "'") {
    let i = at + 1
    while (i < css.length && css[i] !== css[at]) {
      i += css[i] === '\\' ? 2 : 1
    }
    return i + 1
  }
  return at
}

/** The commas at the top level of a selector list, as separate selectors. */
const splitSelectors = (prelude) => {
  const parts = []
  let depth = 0
  let start = 0
  for (let i = 0; i < prelude.length; i += 1) {
    const next = skip(prelude, i)
    if (next !== i) {
      i = next - 1
      continue
    }
    if (prelude[i] === '(' || prelude[i] === '[') {
      depth += 1
    } else if (prelude[i] === ')' || prelude[i] === ']') {
      depth -= 1
    } else if (prelude[i] === ',' && depth === 0) {
      parts.push(prelude.slice(start, i))
      start = i + 1
    }
  }
  parts.push(prelude.slice(start))
  return parts.map((part) => part.trim())
}

const withoutComments = (text) => text.replace(/\/\*[\s\S]*?\*\//g, ' ')

const gateRule = (prelude, body) => {
  const selectors = splitSelectors(withoutComments(prelude))
  const hovering = (selector) => GATED.test(selector.replace(INVERTED, ''))
  const gated = selectors.filter(hovering)
  if (gated.length === 0 || KEEP.test(prelude)) {
    return `${prelude}{${body}}`
  }
  const rest = selectors.filter((selector) => !hovering(selector))
  const gatedRule = `@media (hover: hover) {\n${gated.join(',\n')} {${body}}\n}`
  return rest.length === 0 ? gatedRule : `${rest.join(',\n')} {${body}}\n${gatedRule}`
}

export const gateHover = (css) => {
  let out = ''
  let i = 0
  let start = 0
  while (i < css.length) {
    const next = skip(css, i)
    if (next !== i) {
      i = next
      continue
    }
    if (css[i] === ';') {
      i += 1
      out += css.slice(start, i)
      start = i
      continue
    }
    if (css[i] !== '{') {
      i += 1
      continue
    }
    const prelude = css.slice(start, i)
    let depth = 1
    let end = i + 1
    while (end < css.length && depth > 0) {
      const after = skip(css, end)
      if (after !== end) {
        end = after
        continue
      }
      depth += css[end] === '{' ? 1 : css[end] === '}' ? -1 : 0
      end += 1
    }
    const body = css.slice(i + 1, end - 1)
    const head = withoutComments(prelude).trim()
    if (head.startsWith('@')) {
      const open = CONDITIONAL.test(head) && !HOVER_QUERY.test(head)
      out += `${prelude}{${open ? gateHover(body) : body}}`
    } else {
      out += gateRule(prelude, body)
    }
    i = end
    start = end
  }
  return out + css.slice(start)
}
