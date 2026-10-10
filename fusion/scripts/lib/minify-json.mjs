/**
 * A JSON file without the whitespace between its tokens.
 *
 * **Only the whitespace, and nothing parsed.** Parsing and printing the file
 * again would rewrite what it holds as well: `1.0` comes back as `1`, and an
 * object's integer-like keys come back in ascending order wherever they were
 * written. This removes the whitespace outside strings and keeps every token
 * byte for byte, so the file parses to what it parsed to before.
 */
export const minifyJson = (text) => text.replace(/("(?:[^"\\]|\\[\s\S])*")|[ \t\n\r]+/g, '$1')
