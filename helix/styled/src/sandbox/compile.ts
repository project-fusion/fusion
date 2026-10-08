/**
 * The compiler a module file in TypeScript or JSX runs through before the
 * frame loads it, by its npm name and its pinned version.
 *
 * **Sucrase, measured against esbuild-wasm on October 8, 2026**, on a TSX
 * module of 241 lines with the automatic JSX runtime:
 *
 * | | Sucrase 3.35 | esbuild-wasm 0.28 |
 * | --- | --- | --- |
 * | Download, gzip | 48 KB, and 9 KB of `buffer` esm.sh adds | 3.2 MB of WebAssembly, and 19 KB |
 * | First compile | 14 ms | 188 ms, the WebAssembly starting |
 * | Each after | 0.8 ms | 4.6 ms |
 * | Automatic JSX runtime | yes | yes |
 * | Source map | yes | yes |
 *
 * Both compile what a sandbox holds, and neither checks types. esbuild-wasm
 * downloads 56 times as much before the first module runs, which a reader
 * waits through on the first edit of every page. Sucrase also keeps every line
 * where it was, so a line number in an error in the frame is the line in the
 * pane even where a browser ignores the source map.
 *
 * **Loaded the first time a module needs it**, from the preview's `cdn` as a
 * package in `dependencies` is, so the published package carries no compiler
 * and a sandbox with no TypeScript loads none. It runs in the page, and reads
 * the source as text: the example itself still runs only in the frame.
 */
export const COMPILER = 'sucrase@3.35.1'

/** Whether a module file is TypeScript or JSX, which a browser cannot run as written. */
export const COMPILED = /\.(?:[cm]?ts|[jt]sx)$/

/** Sucrase's `transform`, as much of it as this calls. */
type Transform = (
  source: string,
  options: Record<string, unknown>,
) => { code: string; sourceMap?: Record<string, unknown> }

/** The compiler loaded from each address, so each loads once a page. */
export const compilers = new Map<string, Promise<Transform>>()

/** The compiler at `cdn`, loaded once, or again after a load that failed. */
const compilerAt = (cdn: string): Promise<Transform> => {
  let loading = compilers.get(cdn)
  if (!loading) {
    const address = `${cdn}${COMPILER}`
    loading = import(/* @vite-ignore */ /* webpackIgnore: true */ address).then(
      (loaded: { transform: Transform }) => loaded.transform,
    )
    loading.catch(() => compilers.delete(cdn))
    compilers.set(cdn, loading)
  }
  return loading
}

/** A module that throws `message` when it runs, which the frame reports as uncaught. */
const throwing = (message: string): string => `throw new SyntaxError(${JSON.stringify(message)})`

/**
 * A module file compiled to JavaScript, with its source map inline, for the
 * frame to load as its other modules.
 *
 * `.ts` is read as TypeScript, `.tsx` as TypeScript with JSX, and `.jsx` as
 * JSX. JSX compiles to the automatic runtime, `react/jsx-runtime`, which an
 * example lists in `dependencies`, or to the runtime a
 * `@jsxImportSource preact` comment in the file names.
 *
 * **What fails to compile still runs, as a module that throws** what the
 * compiler said, such as `Error transforming app.tsx: Unexpected token (2:1)`.
 * The frame reports it as it reports any error an example does not catch, so
 * it shows over the example in the preview's `error` part and in the
 * terminal, and only where the example imports the file.
 */
export const compile = async (cdn: string, path: string, source: string): Promise<string> => {
  let transform: Transform
  try {
    transform = await compilerAt(cdn)
  } catch (error) {
    return throwing(`${path} needs ${COMPILER} from ${cdn}, which did not load: ${error}`)
  }
  try {
    const { code, sourceMap } = transform(source, {
      filePath: path,
      jsxImportSource: /@jsxImportSource\s+(\S+)/.exec(source)?.[1],
      jsxRuntime: 'automatic',
      production: true,
      sourceMapOptions: { compiledFilename: path },
      transforms: [
        ...(/tsx?$/.test(path) ? ['typescript'] : []),
        ...(/x$/.test(path) ? ['jsx'] : []),
      ],
    })
    const map = JSON.stringify({ ...sourceMap, sourcesContent: [source] })
    return `${code}\n//# sourceMappingURL=data:application/json;charset=utf-8,${encodeURIComponent(map)}`
  } catch (error) {
    return throwing((error as Error).message)
  }
}
