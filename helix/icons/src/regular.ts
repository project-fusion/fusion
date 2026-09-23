/**
 * The set at regular weight, which is what every other library draws.
 *
 * Lighter than the type it sits beside, which is why it is not the default: at
 * `icon-sm` in a tree row it reads as a paler gray than the words it belongs
 * to. Offered because it is the weight a consumer with their own type scale
 * asks for, and because a weight nobody can choose is a decision this library
 * took on their behalf.
 *
 * **No `icons` record here.** That record is what `<helix-icon name>` reads and
 * what no bundler can shake, so a copy per weight would be 15 kB of index for
 * every subpath. A consumer naming an icon in markup gets the default weight; a
 * consumer who wants this one imports the value and hands it over.
 */
export * from './regular.generated.js'
export type { HelixIcon } from './types.js'
