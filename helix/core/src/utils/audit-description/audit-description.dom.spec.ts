import '@fusion.dev/helix-testing/dom/register'
import { afterEach, beforeAll, describe, expect, test } from 'bun:test'
import { registerDom } from '@fusion.dev/helix-testing/dom'

/* A List at `kind="description"` drew a static details panel that Description
   List draws with a real `<dt>` and `<dd>`, and nothing said so. */

let auditDescription: typeof import('./audit-description.js').auditDescription

beforeAll(async () => {
  registerDom()
  ;({ auditDescription } = await import('./audit-description.js'))
})

const warn = console.warn
afterEach(() => {
  console.warn = warn
})

describe('the static-description audit', () => {
  test('reports a list nobody presses, selects, or reorders, once, naming Description List', () => {
    const warnings: string[] = []
    console.warn = (message: string) => warnings.push(message)
    const host = document.createElement('helix-list')
    auditDescription(host, false)
    auditDescription(host, false)
    expect(warnings).toHaveLength(1)
    expect(warnings[0]).toContain('<helix-list kind="description">')
    expect(warnings[0]).toContain(
      'write <helix-description-list> with one <helix-description-list-item>',
    )
  })

  test('names the headless tier for a headless list', () => {
    const warnings: string[] = []
    console.warn = (message: string) => warnings.push(message)
    auditDescription(document.createElement('helix-headless-list'), false)
    expect(warnings[0]).toContain('<helix-headless-description-list>')
  })

  test('says nothing for an interactive list', () => {
    const warnings: string[] = []
    console.warn = (message: string) => warnings.push(message)
    auditDescription(document.createElement('helix-list'), true)
    expect(warnings).toEqual([])
  })
})
