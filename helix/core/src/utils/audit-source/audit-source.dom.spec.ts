import { afterEach, beforeAll, describe, expect, test } from 'bun:test'
import { registerDom } from '@fusion.dev/helix-testing/dom'

/* A chart whose `for` named nothing drew nothing and said nothing. */

let auditSource: typeof import('./audit-source.js').auditSource

beforeAll(async () => {
  registerDom()
  ;({ auditSource } = await import('./audit-source.js'))
})

const warn = console.warn
afterEach(() => {
  console.warn = warn
})

const settle = (): Promise<void> => new Promise((done) => setTimeout(done, 5))

const chart = (id: string): HTMLElement & { for: string } => {
  const host = document.createElement('div') as unknown as HTMLElement & { for: string }
  host.for = id
  document.body.append(host)
  return host
}

describe('the missing-table audit', () => {
  test('reports a `for` that names no table once, and one that does not', async () => {
    const warnings: string[] = []
    console.warn = (message: string) => warnings.push(message)
    const lost = chart('nowhere')
    auditSource(lost, () => null)
    auditSource(lost, () => null)
    const found = chart('sales')
    auditSource(found, () => document.createElement('table'))
    await settle()
    expect(warnings).toHaveLength(1)
    expect(warnings[0]).toContain('for="nowhere"')
  })

  test('says nothing for a chart with no `for`, or one taken off the page first', async () => {
    const warnings: string[] = []
    console.warn = (message: string) => warnings.push(message)
    auditSource(chart(''), () => null)
    const gone = chart('nowhere')
    auditSource(gone, () => null)
    gone.remove()
    await settle()
    expect(warnings).toEqual([])
  })
})
