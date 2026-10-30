import '@fusion.dev/helix-testing/dom/register'
import { beforeAll, describe, expect, test } from 'bun:test'
import { registerDom } from '@fusion.dev/helix-testing/dom'

/*
 * React writes an attribute for a prop on an element that is not defined yet,
 * and HTML lowers its name, so `defaultPosition={16}` arrives as
 * `defaultposition`. Judged with real React in `fusion/scripts/react-versions`.
 */
describe('a camelCase property written as React writes it before an element upgrades', () => {
  let Element: new () => HTMLElement & {
    defaultPosition: number | undefined
    updateComplete: Promise<boolean>
  }

  beforeAll(async () => {
    registerDom()
    const { HelixElement } = await import('./helix-element.js')
    class Lowered extends HelixElement {
      static override properties = {
        defaultPosition: { attribute: 'default-position', type: Number },
        plain: { type: String },
      }
      declare defaultPosition: number | undefined
    }
    customElements.define('spec-lowered-attributes', Lowered)
    Element = Lowered as never
  })

  test('reaches the property through its lower-case name', () => {
    const element = new Element()
    element.setAttribute('defaultposition', '16')
    expect(element.defaultPosition).toBe(16)
  })

  test('its own attribute still works', () => {
    const element = new Element()
    element.setAttribute('default-position', '24')
    expect(element.defaultPosition).toBe(24)
  })

  test('only a property with a dashed attribute gets a second name', () => {
    expect(
      (Element as unknown as { observedAttributes: string[] }).observedAttributes.sort(),
    ).toEqual(['default-position', 'defaultposition', 'plain'])
  })
})
