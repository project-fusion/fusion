import { afterEach, describe, expect, test } from 'bun:test'
import { COMPILED, COMPILER, compile, compilers } from './compile.js'

/** What the stand-in compiler was asked, by path. */
const asked = new Map<string, Record<string, unknown>>()

/**
 * A stand-in for Sucrase's `transform`, put where the preview would load it
 * from, so no spec reaches the network. It strips `: number` and fails on `<<`.
 */
const stub = (cdn: string): void => {
  compilers.set(
    cdn,
    Promise.resolve((source: string, options: Record<string, unknown>) => {
      asked.set(options.filePath as string, options)
      if (source.includes('<<')) {
        throw new Error(`Error transforming ${options.filePath}: Unexpected token (1:9)`)
      }
      return { code: source.replace(/: number/g, ''), sourceMap: { mappings: 'AAAA', version: 3 } }
    }),
  )
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

  test('loads the pinned compiler from `cdn`, and says so when it does not load, then tries again', async () => {
    const code = await compile('test-nowhere:/', 'app.ts', 'export {}')
    expect(code).toStartWith(
      `throw new SyntaxError("app.ts needs ${COMPILER} from test-nowhere:/, which did not load:`,
    )
    await Promise.resolve()
    expect(compilers.has('test-nowhere:/')).toBe(false)
  })
})
