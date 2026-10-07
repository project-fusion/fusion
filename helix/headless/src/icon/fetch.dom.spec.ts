import { afterEach, beforeAll, describe, expect, test } from 'bun:test'
import { registerDom } from '@fusion.dev/helix-testing/dom'

beforeAll(() => {
  registerDom()
})

describe('reading an SVG file as an icon', () => {
  test('keeps the shapes, the box, and the root paint on a group around them', async () => {
    const { readIconFile } = await import('./fetch.js')
    const icon = readIconFile(
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14"/></svg>',
      '/plus.svg',
    )
    expect(icon?.viewBox).toBe('0 0 24 24')
    expect(icon?.name).toBe('/plus.svg')
    expect(icon?.content).toContain('<g fill="none" stroke="currentColor" stroke-width="2">')
    expect(icon?.content).toContain('d="M5 12h14"')
  })

  test('takes the box from the width and height where there is no viewBox', async () => {
    const { readIconFile } = await import('./fetch.js')
    const icon = readIconFile(
      '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="16"><rect width="32" height="16"/></svg>',
      'x',
    )
    expect(icon?.viewBox).toBe('0 0 32 16')
  })

  /* The markup is drawn as it is, so anything in the file that could run is
     taken out before it is. */
  test('takes out scripts, handlers, script links and animations that write them', async () => {
    const { readIconFile } = await import('./fetch.js')
    const icon = readIconFile(
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10" onload="alert(1)">
        <script>alert(2)</script>
        <foreignObject><div>x</div></foreignObject>
        <a href="javascript:alert(3)"><circle r="4" onclick="alert(4)"/></a>
        <set attributeName="href" to="javascript:alert(5)"/>
        <rect width="2" height="2"/>
      </svg>`,
      'x',
    )
    const content = icon?.content ?? ''
    expect(content).not.toContain('alert')
    expect(content).not.toContain('script')
    expect(content).not.toContain('foreignObject')
    expect(content).toContain('<rect')
    expect(content).toContain('<circle')
  })

  test('a file that is no SVG is no icon', async () => {
    const { readIconFile } = await import('./fetch.js')
    expect(readIconFile('<html><body>Not found</body></html>', 'x')).toBeUndefined()
  })
})

describe('fetching an icon', () => {
  const original = globalThis.fetch
  afterEach(() => {
    globalThis.fetch = original
  })

  test('fetches a file once however many times it is asked for', async () => {
    let asked = 0
    globalThis.fetch = (async () => {
      asked += 1
      return new Response('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 8 8"><rect/></svg>')
    }) as unknown as typeof fetch
    const { fetchIcon } = await import('./fetch.js')
    const first = fetchIcon('/once.svg')
    const second = fetchIcon('/once.svg')
    expect(first).toBeInstanceOf(Promise)
    expect(second).toBe(first)
    const icon = await first
    expect(icon?.viewBox).toBe('0 0 8 8')
    expect(fetchIcon('/once.svg')).toBe(icon)
    expect(asked).toBe(1)
  })

  test('a file that cannot be fetched draws nothing', async () => {
    globalThis.fetch = (async () => new Response('', { status: 404 })) as unknown as typeof fetch
    const { fetchIcon } = await import('./fetch.js')
    expect(await fetchIcon('/missing.svg')).toBeUndefined()
    expect(fetchIcon('/missing.svg')).toBeUndefined()
  })
})
