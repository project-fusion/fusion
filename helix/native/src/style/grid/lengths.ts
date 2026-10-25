/**
 * A length a grid's track list writes, worked out to points: `px`, `rem`,
 * `em`, and `%`, and `calc()`, `min()`, `max()`, and `clamp()` over them.
 */

/** What lengths resolve against: the size of a rem and of an em, in points. */
export interface Basis {
  readonly em: number
  readonly rem: number
}

/** One token of a length: a number with its unit, a function's name, or a mark. */
interface Token {
  readonly amount?: number
  readonly call?: string
  readonly mark?: string
  readonly unit?: string
}

const TOKEN = /\s*(?:(-?(?:\d+\.?\d*|\.\d+))(px|rem|em|%)?|([a-z-]+)\(|([()+\-*/,]))/iy

/** A length's tokens, or nothing where something in it is no token of a length. */
const tokensOf = (source: string): Token[] | undefined => {
  const tokens: Token[] = []
  TOKEN.lastIndex = 0
  while (TOKEN.lastIndex < source.length) {
    const at = TOKEN.lastIndex
    const match = TOKEN.exec(source)
    if (match === null || TOKEN.lastIndex === at) {
      return undefined
    }
    const [, amount, unit, call, mark] = match
    tokens.push(
      amount === undefined
        ? call === undefined
          ? { mark: mark ?? '' }
          : { call: call.toLowerCase() }
        : { amount: Number(amount), unit: (unit ?? '').toLowerCase() },
    )
  }
  return tokens
}

/** What each math function makes of its arguments. */
const FUNCTIONS: Readonly<Record<string, (values: readonly number[]) => number | undefined>> = {
  calc: (values) => (values.length === 1 ? values[0] : undefined),
  clamp: ([least, value, most, ...rest]) =>
    least === undefined || value === undefined || most === undefined || rest.length > 0
      ? undefined
      : Math.max(least, Math.min(value, most)),
  max: (values) => Math.max(...values),
  min: (values) => Math.min(...values),
}

/** Reads a length's tokens in order, by the precedence arithmetic has. */
class Reader {
  private at = 0

  constructor(
    private readonly tokens: readonly Token[],
    private readonly basis: Basis,
    private readonly percent: number,
  ) {}

  /** The whole length, or nothing where tokens are left over. */
  read(): number | undefined {
    const total = this.sum()
    return this.at === this.tokens.length ? total : undefined
  }

  private mark(): string | undefined {
    return this.tokens[this.at]?.mark
  }

  private sum(): number | undefined {
    let total = this.product()
    while (total !== undefined && (this.mark() === '+' || this.mark() === '-')) {
      const sign = this.mark() === '-' ? -1 : 1
      this.at += 1
      const next = this.product()
      total = next === undefined ? undefined : total + sign * next
    }
    return total
  }

  private product(): number | undefined {
    let total = this.operand()
    while (total !== undefined && (this.mark() === '*' || this.mark() === '/')) {
      const divides = this.mark() === '/'
      this.at += 1
      const next = this.operand()
      total =
        next === undefined || (divides && next === 0)
          ? undefined
          : divides
            ? total / next
            : total * next
    }
    return total
  }

  private operand(): number | undefined {
    const token = this.tokens[this.at]
    this.at += 1
    if (token?.amount !== undefined) {
      return this.unit(token.amount, token.unit ?? '')
    }
    if (token?.mark === '(') {
      const inner = this.sum()
      return this.closes() ? inner : undefined
    }
    return token?.call === undefined ? undefined : this.call(token.call)
  }

  private closes(): boolean {
    const closes = this.mark() === ')'
    this.at += 1
    return closes
  }

  private call(name: string): number | undefined {
    const values = [this.sum()]
    while (this.mark() === ',') {
      this.at += 1
      values.push(this.sum())
    }
    if (!this.closes() || values.some((value) => value === undefined)) {
      return undefined
    }
    return FUNCTIONS[name]?.(values as number[])
  }

  private unit(amount: number, unit: string): number | undefined {
    const per: Readonly<Record<string, number>> = {
      '': 1,
      '%': this.percent / 100,
      em: this.basis.em,
      px: 1,
      rem: this.basis.rem,
    }
    const each = per[unit]
    return each === undefined ? undefined : amount * each
  }
}

/**
 * A length in points, `%` of `percent`, or `undefined` where it is not one a
 * phone can work out, such as a `var()` or a unit it has no size for.
 */
export const lengthOf = (text: string, basis: Basis, percent: number): number | undefined => {
  const tokens = tokensOf(text.trim())
  return tokens === undefined ? undefined : new Reader(tokens, basis, percent).read()
}
