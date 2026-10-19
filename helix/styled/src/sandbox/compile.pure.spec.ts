import { afterEach, describe, expect, test } from 'bun:test'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { COMPILED, COMPILER, compile, compilers, PROTOCOL, WORKER } from './compile.js'

/** What the stand-in compiler was asked, by path. */
const asked = new Map<string, Record<string, unknown>>()

/**
 * A stand-in for Sucrase's `transform`, put where the preview would load it
 * from, so no spec reaches the network. It strips `: number` and fails on `<<`.
 */
const stub = (cdn: string): void => {
  compilers.set(cdn, async (source: string, options: Record<string, unknown>) => {
    asked.set(options.filePath as string, options)
    if (source.includes('<<')) {
      throw new Error(`Error transforming ${options.filePath}: Unexpected token (1:9)`)
    }
    return { code: source.replace(/: number/g, ''), sourceMap: { mappings: 'AAAA', version: 3 } }
  })
}

afterEach(() => {
  compilers.clear()
  asked.clear()
})

describe('a module in TypeScript or JSX', () => {
  test('is a module the preview compiles, by the end of its name', () => {
    for (const path of ['app.ts', 'app.tsx', 'app.jsx', 'lib/app.mts', 'app.cts']) {
      expect([path, COMPILED.test(path)]).toEqual([path, true])
    }
    for (const path of ['app.js', 'app.mjs', 'styles.css', 'app.ts.md']) {
      expect([path, COMPILED.test(path)]).toEqual([path, false])
    }
  })

  test('compiles to JavaScript with its source map inline, the source in it', async () => {
    stub('test:/')
    const code = await compile('test:/', 'math.ts', 'export const two: number = 2')
    const [js, comment] = code.split('\n//# sourceMappingURL=data:application/json;charset=utf-8,')
    expect(js).toBe('export const two = 2')
    expect(JSON.parse(decodeURIComponent(comment ?? ''))).toEqual({
      mappings: 'AAAA',
      sourcesContent: ['export const two: number = 2'],
      version: 3,
    })
  })

  test('reads `.ts` as TypeScript, `.tsx` as TypeScript with JSX, and `.jsx` as JSX, to the automatic runtime', async () => {
    stub('test:/')
    await compile('test:/', 'a.ts', '')
    await compile('test:/', 'b.tsx', '')
    await compile('test:/', 'c.jsx', '/** @jsxImportSource preact */')
    expect(asked.get('a.ts')?.transforms).toEqual(['typescript'])
    expect(asked.get('b.tsx')?.transforms).toEqual(['typescript', 'jsx'])
    expect(asked.get('c.jsx')?.transforms).toEqual(['jsx'])
    expect(asked.get('b.tsx')?.jsxRuntime).toBe('automatic')
    expect(asked.get('b.tsx')?.jsxImportSource).toBeUndefined()
    expect(asked.get('c.jsx')?.jsxImportSource).toBe('preact')
  })

  test('that does not compile is a module that throws what the compiler said', async () => {
    stub('test:/')
    expect(await compile('test:/', 'app.tsx', 'const a = <<')).toBe(
      'throw new SyntaxError("Error transforming app.tsx: Unexpected token (1:9)")',
    )
  })

  /* In a worker, whose script imports the compiler from `cdn`, so no bundler
     reads the import. Here, `cdn` is a folder with no compiler in it. */
  test('loads the pinned compiler from `cdn` in a worker, and says so when it does not load', async () => {
    const nowhere = new URL('./no-compiler-here/', import.meta.url).href
    expect(await compile(nowhere, 'app.ts', 'export {}')).toStartWith(
      `throw new SyntaxError("app.ts needs ${nowhere}${COMPILER}, which did not load:`,
    )
  })
})

/* The worker a page serves as a file runs the program the `blob:` one does, so
   a page that switches to it compiles the same. Each is sent a module that
   compiles, one whose compiler throws, and an address that does not load. */
describe('the compiler worker served as a file', () => {
  const answers = async (worker: Worker, address: string): Promise<unknown[]> => {
    const asks: [number, string, string, { filePath: string }][] = [
      [1, address, 'abc', { filePath: 'a.ts' }],
      [2, address, 'a << b', { filePath: 'b.ts' }],
      [3, `${address}.missing`, 'abc', { filePath: 'c.ts' }],
    ]
    const got = new Map<number, unknown>()
    await new Promise<void>((done) => {
      worker.onmessage = ({ data }: MessageEvent<[number]>) => {
        got.set(data[0], data)
        if (got.size === asks.length) {
          done()
        }
      }
      for (const ask of asks) {
        worker.postMessage(ask)
      }
    })
    worker.terminate()
    /* The engine's own words after the colon name the importing script, which
       is the one thing the two ways differ in. */
    return asks.map(([id]) => {
      const answer = got.get(id) as unknown[]
      const error = answer[2]
      return typeof error === 'string'
        ? [...answer.slice(0, 2), error.split(': ')[0], ...answer.slice(3)]
        : answer
    })
  }

  test('answers as the blob worker does', async () => {
    const folder = mkdtempSync(join(tmpdir(), 'helix-compile-worker-'))
    const module = join(folder, 'transform.mjs')
    writeFileSync(
      module,
      "export const transform = (source) => { if (source.includes('<<')) throw new Error('Unexpected token'); return { code: source.toUpperCase() } }",
    )
    const address = pathToFileURL(module).href
    const blob = new Worker(URL.createObjectURL(new Blob([WORKER], { type: 'text/javascript' })), {
      type: 'module',
    })
    const file = new Worker(new URL('./compile-worker.ts', import.meta.url), { type: 'module' })
    const [fromBlob, fromFile] = [await answers(blob, address), await answers(file, address)]
    expect(fromFile).toEqual(fromBlob)
    expect(fromFile[0]).toEqual([1, { code: 'ABC' }, undefined, PROTOCOL])
    expect(fromFile.map((answer) => (answer as unknown[])[3])).toEqual([
      PROTOCOL,
      PROTOCOL,
      PROTOCOL,
    ])
  })
})
