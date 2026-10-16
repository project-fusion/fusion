/**
 * The languages a snippet can be written in.
 *
 * **`ts` and `tsx` are here because the documentation is mostly written in
 * them**, and the base JavaScript grammar reads both wrongly, where a partial
 * reading would be harmless. Measured on a `tsx` fence highlighted as `js`:
 * `<helix-input` came out as the variable `helix`, the operator `-` and the
 * variable `input`, which is the parser doing arithmetic on a tag name and
 * coloring the result confidently. A grammar that does not know the dialect
 * does not degrade, it lies.
 *
 * `tsx` covers JSX as well, since the dialect is a superset: there is no `jsx`
 * member because a JSX file that is not TypeScript still parses under it, and
 * a fourth entry would be a distinction with no consequence. `languageOf`
 * reads `jsx` as `tsx`.
 *
 * `json` is JSON alone, with no comments, so a setting a form reads as JSON is
 * colored as the parser that reads it will read it.
 *
 * `sh` is the one grammar here that is not shipped as it comes: see `shell.ts`
 * for why a mode that knows sh perfectly colors nothing in `bun add`.
 */
export type HighlightLanguage = 'css' | 'html' | 'js' | 'json' | 'sh' | 'ts' | 'tsx'

/**
 * The names a page or a file writes for each language, in lowercase.
 *
 * `jsx` is read as `tsx`, the dialect being a superset.
 */
const NAMES: Record<string, HighlightLanguage> = {
  bash: 'sh',
  cjs: 'js',
  css: 'css',
  cts: 'ts',
  htm: 'html',
  html: 'html',
  javascript: 'js',
  js: 'js',
  json: 'json',
  jsx: 'tsx',
  mjs: 'js',
  mts: 'ts',
  sh: 'sh',
  shell: 'sh',
  ts: 'ts',
  tsx: 'tsx',
  typescript: 'ts',
  zsh: 'sh',
}

/**
 * The language a name stands for, in any case: `TypeScript`, `bash` or `mjs`.
 * `undefined` for a name no grammar here reads.
 */
export const languageOf = (name: string): HighlightLanguage | undefined =>
  NAMES[name.trim().toLowerCase()]
