/**
 * Takes out what CSS reads as nothing in a stylesheet once `joinLines` has
 * joined its lines: the newlines a function's arguments were laid out on, the
 * last `;` in a block, and every newline left, which becomes a space.
 *
 * **A newline after `(` or before `)` separates nothing**, and one anywhere
 * else is the same whitespace as a space. A `color-mix()` or a `var()` the
 * formatter wrote over four lines then ships as one, and brotli finds it
 * where it finds the same call written on one line elsewhere.
 *
 * **The spaces around `{` and after `:` stay, and that was measured.** On the
 * styled Button bundled alone, October 7, 2026, with the rest of that day's
 * size work in place, this took 61 bytes brotli off, and taking those spaces
 * out as well took off 83. About 170 specs read a sheet in its written shape,
 * `display: none` under `[part="x"] {`, and the difference is not worth a
 * second shape for them to read.
 *
 * **No token changes.** A minifier would also rewrite values, and bun's lowers
 * `light-dark()` into malformed output. A quoted string is copied as it
 * stands, because a `;}` inside one is text.
 */
export const tighten = (css) =>
  css
    .split(/("(?:[^"\\\n]|\\[\s\S])*"|'(?:[^'\\\n]|\\[\s\S])*')/)
    .map((part, index) =>
      index % 2 === 1
        ? part
        : part
            .replace(/\(\n/g, '(')
            .replace(/\n\)/g, ')')
            .replace(/;\s*\}/g, '}')
            .replace(/\n/g, ' '),
    )
    .join('')
