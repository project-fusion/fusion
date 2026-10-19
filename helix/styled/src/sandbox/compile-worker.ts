/*
 * The compiler's worker as a file of its own, for a page whose Content
 * Security Policy refuses `blob:` workers.
 *
 * The preview starts its worker from a `blob:` address by default, which needs
 * nothing copied or served. A policy with `worker-src 'self'` refuses that
 * address, so TypeScript and JSX panes do not compile there. Serve this file
 * from the page's own origin and hand its address to `registerCompilerWorker`
 * from `@fusion.dev/helix/sandbox`, and the worker is a script of the page's
 * origin instead.
 *
 * **The one copy of the program.** `bun run compile-worker` minifies it into
 * the text the preview starts from a `blob:` address by default, so the two
 * cannot drift. It is never imported, so no bundler reads its `import()` of an
 * address known only at run time, and it imports nothing, so a copied file
 * runs alone.
 */

/**
 * The version of the messages the worker and the page exchange, which every
 * answer ends with. A page that copied this file from an older release answers
 * with another, or none, and is told to copy it again. Raise it whenever the
 * messages change, and only then, so an upgrade that leaves them alone asks
 * nobody to copy anything.
 */
export const PROTOCOL = 1

/** The worker's own scope, which the DOM library this package builds with does not name. */
const scope = globalThis as unknown as {
  onmessage: ((event: MessageEvent<[number, string, string, { filePath: string }]>) => void) | null
  postMessage: (message: unknown) => void
}

/** The compiler at each address, once its load has begun. */
const loaded: Record<string, Promise<{ transform: (...args: unknown[]) => unknown }>> = {}

scope.onmessage = async ({ data: [id, address, source, options] }) => {
  let compiler: { transform: (...args: unknown[]) => unknown }
  try {
    loaded[address] ??= import(address)
    compiler = await loaded[address]
  } catch (error) {
    delete loaded[address]
    scope.postMessage([
      id,
      undefined,
      `${options.filePath} needs ${address}, which did not load: ${error}`,
      PROTOCOL,
    ])
    return
  }
  try {
    scope.postMessage([id, compiler.transform(source, options), undefined, PROTOCOL])
  } catch (error) {
    scope.postMessage([id, undefined, String((error as Error | undefined)?.message), PROTOCOL])
  }
}
