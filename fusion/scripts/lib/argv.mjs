/**
 * The two shapes of argument a script here takes: `--name value` and `--name`.
 *
 * Four scripts carried the same two lines each, and a reader of `--domain`
 * had to check which copy was in front of them to know whether an absent
 * value was `undefined` or the next flag. One copy, one answer: `argument`
 * hands back whatever follows the name, and nothing when the name is absent.
 */

/** The value after `--name`, or undefined where the name is not given. */
export const argument = (name) => {
  const at = process.argv.indexOf(`--${name}`)
  return at === -1 ? undefined : process.argv[at + 1]
}

/** Whether `--name` was given at all. */
export const flag = (name) => process.argv.includes(`--${name}`)
