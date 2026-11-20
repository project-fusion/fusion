/**
 * A stylesheet's text with each `:where(...)` replaced by what it holds.
 *
 * **A spec holds that a rule exists, and the compiler's own tests hold its
 * weight.** Helix's compiler writes every condition of a generated rule
 * inside `:where()`, so every rule on one part ranks the same and the later
 * one wins: `:host(:where([emphasis="solid"])) [part="button"]`. A spec reads
 * that rule as `:host([emphasis="solid"]) [part="button"]`, the selector you
 * write by hand.
 *
 * **A rule that asks nothing of the host starts at a bare `:host`**, which the
 * compiler writes so every rule weighs the same: `:host [part="icon"]`. A spec
 * reads it as `[part="icon"]`. A rule on the host itself, `:host {`, keeps it.
 */
export const unweighted = (css: string): string => {
  let out = ''
  const closes: number[] = []
  let depth = 0
  for (let at = 0; at < css.length; at += 1) {
    const bare = /^:host\s+(?=[^\s{,])/.exec(css.slice(at, at + 16))
    if (bare && depth === 0 && /(^|[{},;]\s*)$/.test(css.slice(Math.max(0, at - 64), at))) {
      at += bare[0].length - 1
      continue
    }
    if (css.startsWith(':where(', at)) {
      depth += 1
      closes.push(depth)
      at += ':where('.length - 1
      continue
    }
    const character = css[at]
    if (character === '(') {
      depth += 1
      out += character
    } else if (character === ')') {
      if (closes.at(-1) === depth) {
        closes.pop()
      } else {
        out += character
      }
      depth -= 1
    } else {
      out += character
    }
  }
  return out
}
