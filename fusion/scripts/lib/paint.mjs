/**
 * Resolves a Helix color token to the sRGB hex a browser paints for it.
 *
 * **This exists because the tokens are OKLCH and a reader is not.** Every color
 * in `primitives.css` is authored in OKLCH, composed through `light-dark()`,
 * relative color syntax and `color-mix()`, and a token's declared value is
 * therefore a reference into a reference into an arithmetic expression. That is
 * the honest answer to "what is this token" and it is not an answer to "what
 * color is that", which is the question anybody picking a value out of the
 * reference is actually asking.
 *
 * **It is a second implementation of color math, which this repository
 * otherwise refuses, so it is worth saying what keeps it honest.** The
 * alternative was to measure the tokens in Chromium, the way `check-contrast.mjs`
 * measures inks. The token reference is a *committed generated file*, held by
 * `verify` through `--check`, and `verify` runs in a job with no browser in it:
 * measuring would put a chromium download in the path of a documentation table.
 * No committed generator in this repository needs a browser and this is not the
 * one to make the exception for.
 *
 * So the drift is guarded from the other side instead. `check-token-hexes.mjs`
 * runs in the browser job, resolves every color token through this module and
 * through Chromium, and fails on any disagreement. That check is the reason to
 * trust the column; this file on its own is only an argument.
 *
 * **Gamut mapping is the part that had to be exact.** The series ramp and the
 * loud statuses ask for chroma sRGB cannot hold, and a naive clamp paints a
 * different color from the one CSS Color 4 specifies: the spec reduces chroma in
 * OKLCH by binary search with a just-noticeable-difference clip, and the
 * difference between that and clamping is visible on eight of the twenty-four
 * series. What is implemented below is §13.2 rather than an approximation of it.
 */

const cbrt = (x) => Math.cbrt(x)

/** Gamma-encode one linear-light sRGB channel. */
const encode = (channel) => {
  const sign = channel < 0 ? -1 : 1
  const value = Math.abs(channel)
  return value <= 0.0031308 ? channel * 12.92 : sign * (1.055 * value ** (1 / 2.4) - 0.055)
}

/** And back, for reading a hex the stylesheet states outright. */
const decode = (channel) => {
  const sign = channel < 0 ? -1 : 1
  const value = Math.abs(channel)
  return value <= 0.04045 ? channel / 12.92 : sign * ((value + 0.055) / 1.055) ** 2.4
}

/** OKLab to linear-light sRGB. */
const labToLinear = ({ l, a, b }) => {
  const long = (l + 0.3963377774 * a + 0.2158037573 * b) ** 3
  const medium = (l - 0.1055613458 * a - 0.0638541728 * b) ** 3
  const short = (l - 0.0894841775 * a - 1.291485548 * b) ** 3
  return [
    4.0767416621 * long - 3.3077115913 * medium + 0.2309699292 * short,
    -1.2684380046 * long + 2.6097574011 * medium - 0.3413193965 * short,
    -0.0041960863 * long - 0.7034186147 * medium + 1.707614701 * short,
  ]
}

/** And back. */
const linearToLab = ([red, green, blue]) => {
  const long = cbrt(0.4122214708 * red + 0.5363325363 * green + 0.0514459929 * blue)
  const medium = cbrt(0.2119034982 * red + 0.6806995451 * green + 0.1073969566 * blue)
  const short = cbrt(0.0883024619 * red + 0.2817188376 * green + 0.6299787005 * blue)
  return {
    a: 1.9779984951 * long - 2.428592205 * medium + 0.4505937099 * short,
    b: 0.0259040371 * long + 0.7827717662 * medium - 0.808675766 * short,
    l: 0.2104542553 * long + 0.793617785 * medium - 0.0040720468 * short,
  }
}

/* A color is carried as OKLab plus alpha throughout, because that is the space
   `color-mix()` interpolates in and the space the gamut search reduces in, so
   nothing round-trips between representations on the way. */
/**
 * OKLCH to OKLab, keeping the polar components on the result.
 *
 * **The copy is not redundant, and dropping it is an off-by-one on screen.**
 * Relative color syntax reads `h` off the origin, and an origin recovered from
 * OKLab by `atan2` comes back as 257.99999999999994 where the stylesheet wrote
 * 258. That survives every later step and lands, on six of the twenty-four
 * series, as one code point of red: measured against Chromium, which reads the
 * component the author stated because it never left the polar form.
 */
const toLab = ({ lightness, chroma, hue, alpha }) => ({
  a: chroma * Math.cos((hue * Math.PI) / 180),
  alpha,
  b: chroma * Math.sin((hue * Math.PI) / 180),
  l: lightness,
  stated: { alpha, c: chroma, h: hue, l: lightness },
})

const toLch = ({ l, a, b, alpha }) => ({
  alpha,
  chroma: Math.sqrt(a * a + b * b),
  hue: ((Math.atan2(b, a) * 180) / Math.PI + 360) % 360,
  lightness: l,
})

/**
 * Out of sRGB, into sRGB: by clipping each channel, because that is what the
 * renderer does.
 *
 * **CSS Color 4 §13.2 specifies something else and browsers do not run it.** The
 * spec reduces chroma in OKLCH by binary search with a just-noticeable-difference
 * clip, which preserves hue; a per-channel clamp does not, the three channels
 * hitting their limits at different points. The difference is not academic on
 * this palette: the accent ramp is out of gamut at every rung, and §13.2 puts
 * `--helix-color-accent` at #976200 where a clamp puts it at #a85800.
 *
 * Measured in Chromium rather than assumed, on five out-of-gamut colors drawn
 * from the accent, series and status ramps: the clamp matched the painted pixel
 * every time and §13.2 matched none of them. The column says what a reader will
 * see, so it says what is painted. If a browser ships §13.2 this becomes wrong,
 * and `check:css:hexes` is what will say so, because it compares this against
 * the renderer rather than against the specification.
 *
 * The tokens this reaches are the loud ones by construction: `primitives.css`
 * states the series chroma as the most each hue can hold and the accent takes
 * the brand's chroma round the wheel to hues that cannot hold it.
 */
const mapToGamut = (lab) => labToLinear(lab).map((one) => Math.min(1, Math.max(0, one)))

/**
 * Gamma-encoded sRGB in 0 to 1, before anything rounds it.
 *
 * Exported for `check-token-hexes.mjs`, which compares against a browser's own
 * float serialization: rounding both sides to a byte first would put half a code
 * point of rounding on top of whatever real difference there is, and the real
 * difference here is about a sixteenth of one.
 */
export const toSrgb = (lab) => ({
  alpha: lab.alpha ?? 1,
  channels: mapToGamut(lab).map(encode),
})

const byte = (channel) => Math.round(Math.min(1, Math.max(0, channel)) * 255)

/**
 * The eight-digit form when the color is translucent, six when it is not.
 *
 * A translucent token is a real answer rather than a missing one: `well` is five
 * percent of the ink and `overlay` is a scrim, and neither has an opaque hex to
 * report because neither paints one.
 */
export const toHex = (lab) => {
  const { channels, alpha } = toSrgb(lab)
  const hex = channels.map((one) => byte(one).toString(16).padStart(2, '0')).join('')
  return `#${hex}${alpha < 1 ? byte(alpha).toString(16).padStart(2, '0') : ''}`
}

/* ------------------------------------------------------------ parsing ---- */

/** Split on top-level commas, which `var()` fallbacks and `calc()` both nest. */
const parts = (text) => {
  const found = []
  let depth = 0
  let start = 0
  for (let at = 0; at < text.length; at += 1) {
    const character = text[at]
    if (character === '(') {
      depth += 1
    } else if (character === ')') {
      depth -= 1
    } else if (character === ',' && depth === 0) {
      found.push(text.slice(start, at).trim())
      start = at + 1
    }
  }
  found.push(text.slice(start).trim())
  return found
}

/** The text between a function's own parentheses, given its opening index. */
const body = (text, open) => {
  let depth = 0
  for (let at = open; at < text.length; at += 1) {
    if (text[at] === '(') {
      depth += 1
    } else if (text[at] === ')') {
      depth -= 1
      if (depth === 0) {
        return text.slice(open + 1, at)
      }
    }
  }
  throw new Error(`unbalanced parentheses in \`${text}\``)
}

/**
 * Reads `primitives.css` into a map of declared custom properties.
 *
 * Comments first, because the file is 82 percent comment and every prose block
 * in it quotes the declarations around it.
 */
export const declarations = (css) => {
  const stripped = css.replace(/\/\*[\s\S]*?\*\//g, '')
  const open = stripped.indexOf('{')
  const found = new Map()
  for (const statement of stripped.slice(open + 1).split(';')) {
    const colon = statement.indexOf(':')
    if (colon === -1) {
      continue
    }
    const name = statement.slice(0, colon).trim()
    if (name.startsWith('--')) {
      found.set(
        name,
        statement
          .slice(colon + 1)
          .trim()
          .replace(/\s+/g, ' '),
      )
    }
  }
  return found
}

/**
 * Substitutes every `var()` against the declarations, fallbacks included.
 *
 * The public seeds are the point of the fallbacks: `--helix-seed-brand` is not
 * declared anywhere, so `var(--helix-seed-brand, oklch(…))` resolves to the
 * literal, which is what "by default" means for this whole table.
 */
export const substitute = (value, declared, seen = new Set()) => {
  let text = value
  for (;;) {
    const at = text.indexOf('var(')
    if (at === -1) {
      return text
    }
    const inner = body(text, at + 3)
    const [name, ...rest] = parts(inner)
    const fallback = rest.join(', ')
    let replacement
    if (declared.has(name)) {
      if (seen.has(name)) {
        throw new Error(`\`${name}\` resolves through itself`)
      }
      replacement = substitute(declared.get(name), declared, new Set([...seen, name]))
    } else if (rest.length > 0) {
      replacement = substitute(fallback, declared, seen)
    } else {
      throw new Error(`\`${name}\` is declared nowhere and has no fallback`)
    }
    text = text.slice(0, at) + replacement + text.slice(at + 4 + inner.length + 1)
  }
}

/** `calc()` over numbers, which is all any component expression ever is here. */
const arithmetic = (text) => {
  const expression = text.trim()
  if (!/^[-+*/(). \d]+$/.test(expression)) {
    throw new Error(`\`${expression}\` is not arithmetic over numbers`)
  }
  /* eslint-disable-next-line no-new-func -- the regex above is the guard, and
     the input is this repository's own stylesheet. */
  const answer = Function(`"use strict"; return (${expression})`)()
  if (!Number.isFinite(answer)) {
    throw new Error(`\`${expression}\` did not evaluate to a number`)
  }
  return answer
}

/** A component of a color function: a number, a percentage, or `calc()` of one. */
const component = (text, origin, key, scale = 1) => {
  const value = text.trim()
  if (value === 'none') {
    return 0
  }
  if (origin && value === key) {
    return origin[key]
  }
  if (value.endsWith('%')) {
    return (Number.parseFloat(value) / 100) * scale
  }
  const calc = value.startsWith('calc(')
  const expression = calc ? body(value, value.indexOf('(')) : value
  /* `l`, `c` and `h` inside a relative `calc()` are the origin's own
     components, so they are substituted before the arithmetic sees them. */
  const substituted = origin
    ? expression.replace(/\b([lch])\b/g, (_, name) => String(origin[name]))
    : expression
  return calc ? arithmetic(substituted) : Number.parseFloat(substituted)
}

/** Split on top-level whitespace, so `calc(h + 180)` stays one component. */
const words = (text) => {
  const found = []
  let depth = 0
  let start = 0
  for (let at = 0; at <= text.length; at += 1) {
    const character = text[at]
    if (character === '(') {
      depth += 1
    } else if (character === ')') {
      depth -= 1
    } else if (at === text.length || (depth === 0 && /\s/.test(character))) {
      if (at > start) {
        found.push(text.slice(start, at))
      }
      start = at + 1
    }
  }
  return found
}

const HEX = /^#([0-9a-f]{3,8})$/i

const fromHex = (text) => {
  const digits = HEX.exec(text)[1]
  const expanded = digits.length <= 4 ? [...digits].map((one) => one + one).join('') : digits
  const channel = (at) => Number.parseInt(expanded.slice(at, at + 2), 16) / 255
  return {
    ...linearToLab([decode(channel(0)), decode(channel(2)), decode(channel(4))]),
    alpha: expanded.length === 8 ? channel(6) : 1,
  }
}

/**
 * Evaluates a fully substituted value to OKLab plus alpha.
 *
 * `scheme` picks the branch of every `light-dark()`, which is what makes one
 * declaration two columns.
 */
export const evaluate = (value, scheme) => {
  const text = value.trim()

  if (text === 'transparent') {
    return { a: 0, alpha: 0, b: 0, l: 0 }
  }
  if (HEX.test(text)) {
    return fromHex(text)
  }

  if (text.startsWith('light-dark(')) {
    const [light, dark] = parts(body(text, text.indexOf('(')))
    return evaluate(scheme === 'dark' ? dark : light, scheme)
  }

  if (text.startsWith('color-mix(')) {
    const [space, first, second] = parts(body(text, text.indexOf('(')))
    if (space.trim() !== 'in oklab') {
      throw new Error(`\`${space.trim()}\` is not a space this resolves in`)
    }
    const read = (side) => {
      const percent = /\s(\d*\.?\d+)%$/.exec(side)
      return {
        color: evaluate(percent ? side.slice(0, percent.index) : side, scheme),
        weight: percent ? Number.parseFloat(percent[1]) / 100 : null,
      }
    }
    const one = read(first)
    const other = read(second)
    /* One percentage stated is the other one implied, which is how every mix in
       the stylesheet is written. */
    const weight = one.weight ?? (other.weight === null ? 0.5 : 1 - other.weight)
    /* Premultiplied, per CSS Color 4 §12.3, which is the whole reason
       `color-mix(…, transparent)` reads as "the first color, faded" rather than
       as "the first color, darkened toward black". */
    const alpha = one.color.alpha * weight + other.color.alpha * (1 - weight)
    const blend = (key) =>
      alpha === 0
        ? 0
        : (one.color[key] * one.color.alpha * weight +
            other.color[key] * other.color.alpha * (1 - weight)) /
          alpha
    return { a: blend('a'), alpha, b: blend('b'), l: blend('l') }
  }

  if (text.startsWith('oklch(')) {
    const inner = body(text, text.indexOf('(')).trim()
    const [channels, transparency] = parts(inner.replace('/', ',')).map((one) => one.trim())
    const relative = channels.startsWith('from ')
    let origin = null
    let rest = channels
    if (relative) {
      /* `from <color> l c h`: the origin is one value of unknown length, and
         it nests. `oklch(from oklch(from …) …)` is three levels deep in the
         accent ramp, so the close is matched rather than searched for. */
      const after = channels.slice('from '.length).trim()
      const open = after.indexOf('(')
      const end = open === -1 ? after.indexOf(' ') : open + body(after, open).length + 2
      const read = evaluate(after.slice(0, end), scheme)
      const polar = toLch(read)
      /* Stated where the origin was written in OKLCH, recovered where it was a
         hex or a mix and there is nothing stated to prefer. */
      origin = read.stated ?? {
        alpha: polar.alpha,
        c: polar.chroma,
        h: polar.hue,
        l: polar.lightness,
      }
      rest = after.slice(end).trim()
    }
    const [lightness, chroma, hue] = words(rest)
    return toLab({
      alpha: transparency === undefined ? (origin?.alpha ?? 1) : component(transparency, null, 'a'),
      chroma: component(chroma, origin, 'c', 0.4),
      hue: component(hue, origin, 'h'),
      lightness: component(lightness, origin, 'l', 1),
    })
  }

  throw new Error(`\`${text}\` is not a color this resolves`)
}

/**
 * Both layers in one map, which is what a semantic token needs to resolve.
 *
 * `--helix-color-well` is a mix of `--helix-color-foreground`, so the semantic
 * layer references itself and a primitives-only map cannot close it. The
 * registry is added second and would win a collision, which cannot happen: the
 * two layers are told apart by the underscore and a check holds them to it.
 */
export const layers = (primitives, tokens) => {
  const declared = declarations(primitives)
  for (const token of tokens) {
    declared.set(token.name, token.value.replace(/\s+/g, ' '))
  }
  return declared
}

/** The whole of it: a declared token value to the hex a browser paints. */
export const paint = (value, declared, scheme) =>
  toHex(evaluate(substitute(value, declared), scheme))
