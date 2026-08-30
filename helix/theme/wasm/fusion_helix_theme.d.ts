/* tslint:disable */
/* eslint-disable */

/**
 * Derives a theme, and renders it under every selector asked for.
 *
 * **One call, because a derivation is the expensive part and rendering is not.**
 * Measured in this build: 17ms to derive and a fraction of a millisecond to
 * render a block. The theme builder wants the same theme under two selectors,
 * one for the preview and one for the block a reader copies, so an
 * intent-in-CSS-out function would have it deriving twice for one keystroke.
 * The result carries `css` keyed by selector, empty when none were asked for.
 *
 * `selectors` is a JSON array, keeping the boundary uniformly JSON in and JSON
 * out rather than mixing in a bound array type for one argument.
 *
 * # Errors
 *
 * When either argument is not the JSON it should be, or when the engine refuses
 * the intent.
 */
export function derive(intent: string, selectors: string): string;

/**
 * Reads a hex color into its OKLCH components, as JSON.
 *
 * **Throws rather than returning a `NaN` triple**, which is the decision
 * `resolve` makes for a brand: every comparison against `NaN` is false, so a
 * color that could not be read travels onward looking like a color. A caller
 * passing the value of a color input never sees this.
 *
 * # Errors
 *
 * When the string is not a hex color.
 */
export function hexToOklch(hex: string): string;

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
    readonly memory: WebAssembly.Memory;
    readonly derive: (a: number, b: number, c: number, d: number) => [number, number, number, number];
    readonly hexToOklch: (a: number, b: number) => [number, number, number, number];
    readonly __wbindgen_externrefs: WebAssembly.Table;
    readonly __wbindgen_malloc: (a: number, b: number) => number;
    readonly __wbindgen_realloc: (a: number, b: number, c: number, d: number) => number;
    readonly __externref_table_dealloc: (a: number) => void;
    readonly __wbindgen_free: (a: number, b: number, c: number) => void;
    readonly __wbindgen_start: () => void;
}

export type SyncInitInput = BufferSource | WebAssembly.Module;

/**
 * Instantiates the given `module`, which can either be bytes or
 * a precompiled `WebAssembly.Module`.
 *
 * @param {{ module: SyncInitInput }} module - Passing `SyncInitInput` directly is deprecated.
 *
 * @returns {InitOutput}
 */
export function initSync(module: { module: SyncInitInput } | SyncInitInput): InitOutput;

/**
 * If `module_or_path` is {RequestInfo} or {URL}, makes a request and
 * for everything else, calls `WebAssembly.instantiate` directly.
 *
 * @param {{ module_or_path: InitInput | Promise<InitInput> }} module_or_path - Passing `InitInput` directly is deprecated.
 *
 * @returns {Promise<InitOutput>}
 */
export default function __wbg_init (module_or_path?: { module_or_path: InitInput | Promise<InitInput> } | InitInput | Promise<InitInput>): Promise<InitOutput>;
