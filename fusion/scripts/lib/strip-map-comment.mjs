/**
 * A built file without the comment naming its source map.
 *
 * **Only the comment on the file's last line, and only one naming a `.map`
 * file.** The compiler writes `//# sourceMappingURL=<file>.map` as a file's
 * last line and nowhere else. A pattern that took the comment off any line
 * also took it out of code: `@fusion.dev/helix`'s sandbox builds a module whose
 * last line is a `//# sourceMappingURL=data:` comment, in a template literal,
 * and from 0.184.0 every release cut that line out of `compile.js`, which left
 * the file unparseable and with it every import of the package's root.
 */
export const stripMapComment = (code) =>
  code.replace(/\n?\/\/# sourceMappingURL=[^\n]*\.map[ \t]*\n?$/, '')
