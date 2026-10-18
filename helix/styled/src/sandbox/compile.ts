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
 * and a sandbox with no TypeScript loads none.
 *
 * **In a worker of its own**, which has no access to the page and keeps a
 * long compile off the page's thread. The worker's script is text, so the
 * `import()` of an address known only at run time is one no bundler reads:
 * written in this module, Turbopack refused to build a page that imported
 * it, the TypeScript build having dropped the comments that tell bundlers to
 * leave it alone. The compiler reads the source as text, and the example
 * itself still runs only in the frame.
 */
export const COMPILER = 'sucrase@3.35.1'

/** Whether a module file is TypeScript or JSX, which a browser cannot run as written. */
export const COMPILED = /\.(?:[cm]?ts|[jt]sx)$/

/** Sucrase's `transform`, as the worker runs it: rejects with what failed. */
type Transform = (
  source: string,
  options: Record<string, unknown>,
) => Promise<{ code: string; sourceMap?: Record<string, unknown> }>

/**
 * The worker's script, written short since it ships as a string no minifier
 * reads. Each message is a number, the compiler's address, the source and the
 * options. The worker loads the address once, and again after a load that
 * failed, and answers with the number and what `transform` returned, or the
 * number and what went wrong.
 */
export const WORKER =
  'const l={};onmessage=async({data:[i,a,s,o]})=>{let c;try{c=await(l[a]??=import(a))}catch(e){delete l[a];return postMessage([i,,o.filePath+" needs "+a+", which did not load: "+e])}try{postMessage([i,c.transform(s,o)])}catch(e){postMessage([i,,String(e?.message)])}}'

/** The one worker every preview on the page compiles in, started on the first compile. */
let worker: Worker | undefined

/** The address the worker starts from, where a page has served it as a file. */
let workerAddress: string | URL | undefined

/**
 * Starts the compiler's worker from a file the page serves, rather than from
 * a `blob:` address.
 *
 * **For a page whose Content Security Policy refuses `blob:` workers**, which
 * `worker-src 'self'` does, and which leaves TypeScript and JSX panes
 * uncompiled. Copy `@fusion.dev/helix/sandbox/compile-worker.js` to where the
 * page serves its own scripts, and call this before the first preview
 * compiles:
 *
 * ```js
 * import { registerCompilerWorker } from '@fusion.dev/helix/sandbox'
 *
 * registerCompilerWorker('/sandbox/compile-worker.js')
 * ```
 *
 * The compiler itself still loads from the preview's `cdn`, so the policy's
 * `script-src` names that host either way. A worker already started keeps
 * running, and the address applies to the next page that starts one.
 */
export const registerCompilerWorker = (address: string | URL): void => {
  workerAddress = address
}

/** How many messages the worker has been sent, which numbers each. */
let sent = 0

/** The answers the worker owes, by the number of the message they answer. */
const owed = new Map<number, (answer: [number, Awaited<ReturnType<Transform>>?, string?]) => void>()

/** The compiler at an address, in the worker. */
const inWorker =
  (address: string): Transform =>
  (source, options) => {
    if (!worker) {
      worker = new Worker(
        workerAddress ?? URL.createObjectURL(new Blob([WORKER], { type: 'text/javascript' })),
        { type: 'module' },
      )
      worker.onmessage = ({ data }: MessageEvent<[number]>) => {
        owed.get(data[0])?.(data)
        owed.delete(data[0])
      }
    }
    sent += 1
    const id = sent
    worker.postMessage([id, address, source, options])
    return new Promise((resolve, reject) => {
      owed.set(id, ([, result, error]) => (result ? resolve(result) : reject(new Error(error))))
    })
  }

/**
 * The compiler for each `cdn`, so each is set up once a page. A spec puts a
 * stand-in here, for an address of its own.
 */
export const compilers = new Map<string, Transform>()

/** The compiler at `cdn`. */
const compilerAt = (cdn: string): Transform => {
  let compiler = compilers.get(cdn)
  if (!compiler) {
    compiler = inWorker(`${cdn}${COMPILER}`)
    compilers.set(cdn, compiler)
  }
  return compiler
}

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
 * console, and only where the example imports the file.
 */
export const compile = async (cdn: string, path: string, source: string): Promise<string> => {
  try {
    const { code, sourceMap } = await compilerAt(cdn)(source, {
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
    return `throw new SyntaxError(${JSON.stringify((error as Error).message)})`
  }
}
