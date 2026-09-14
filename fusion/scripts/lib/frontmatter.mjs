/**
 * The frontmatter of one MDX file, as strings.
 *
 * Hand-parsed, because the whole grammar is `key: value` at the top level: a
 * YAML dependency to read nine of those is one a content package would carry
 * for nothing, and a parser that refuses anything it does not understand is
 * what keeps the grammar that small. Two content packages read the same
 * grammar, so they read it with the same code.
 *
 * Problems are returned rather than thrown, since the two callers disagree
 * about what to do with one: the docs collect every problem in a page before
 * reporting, the insights stop at the first.
 */

/**
 * Parses `source`'s frontmatter block into `{ fields, problems }`. `fields` is
 * every `key: value` as strings, with a single-quoted value unquoted and `''`
 * inside it read as one quote; `problems` names what the block gets wrong,
 * and is empty when nothing does. Keys have to be in alphabetical order, the
 * rule every object literal here follows.
 */
export const frontmatter = (source) => {
  const problems = []
  const match = /^---\n([\s\S]*?)\n---\n/.exec(source)
  if (!match) {
    return { fields: undefined, problems: ['has no frontmatter block'] }
  }
  const fields = {}
  for (const line of match[1].split('\n')) {
    const pair = /^([a-zA-Z]+): (.*)$/.exec(line)
    if (!pair) {
      problems.push(`frontmatter line is not \`key: value\`: ${line}`)
      continue
    }
    fields[pair[1]] = pair[2].replace(/^'(.*)'$/, '$1').replace(/''/g, "'")
  }
  const keys = Object.keys(fields)
  const sorted = [...keys].sort()
  if (keys.join() !== sorted.join()) {
    problems.push(`frontmatter keys are ${keys.join(', ')}, want ${sorted.join(', ')}`)
  }
  return { fields, problems }
}
