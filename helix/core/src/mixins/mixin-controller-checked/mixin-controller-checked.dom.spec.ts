import { beforeAll, describe, expect, test } from 'bun:test'
import { registerDom } from '@fusion.dev/helix-testing/dom'

/**
 * A read-only checked control: seen, focused and submitted, never changed by
 * a press. The mixin's own half, asked of a probe whose template is the inner
 * checkbox the families draw, with the refusal bound to its `click`.
 *
 * What it shares with `open` and `active` is asked in
 * `mixin-controllers.dom.spec.ts`; read-only is checked's alone.
 */
type Probe = HTMLElement & {
  checked: boolean
  readOnly: boolean
  requestChecked(next: boolean): boolean
  updateComplete: Promise<boolean>
}

const tag = 'probe-checked-readonly'

beforeAll(async () => {
  registerDom()
  /* After the DOM: Lit reads `HTMLElement` off the global when it loads. */
  const { html } = await import('lit')
  const { HelixElement } = await import('../../helix-element/helix-element.js')
  const { MixinControllerChecked } = await import('./mixin-controller-checked.js')
  customElements.define(
    tag,
    class extends MixinControllerChecked(HelixElement) {
      protected override render() {
        return html`<input part="control" type="checkbox" .checked=${this.checked} @click=${this.holdReadOnly} />`
      }
    },
  )
})

const mount = async (markup: string): Promise<Probe> => {
  document.body.innerHTML = markup
  const host = document.body.firstElementChild as Probe
  await host.updateComplete
  return host
}

const control = (host: Probe): HTMLInputElement =>
  host.shadowRoot?.querySelector('[part="control"]') as HTMLInputElement

const press = (host: Probe): MouseEvent => {
  const click = new MouseEvent('click', { bubbles: true, cancelable: true, composed: true })
  control(host).dispatchEvent(click)
  return click
}

describe('a read-only checked control', () => {
  test('is not read-only until asked, and a press goes through', async () => {
    const host = await mount(`<${tag}></${tag}>`)
    expect(host.readOnly).toBe(false)
    expect(press(host).defaultPrevented).toBe(false)
  })

  test('refuses a press on its inner control, keeping its box as it was', async () => {
    const host = await mount(`<${tag} readonly checked></${tag}>`)
    expect(host.readOnly).toBe(true)
    expect(press(host).defaultPrevented).toBe(true)
    expect(host.checked).toBe(true)
  })

  test('reflects as the platform spells it, and lets go when cleared', async () => {
    const host = await mount(`<${tag}></${tag}>`)
    host.readOnly = true
    await host.updateComplete
    expect(host.hasAttribute('readonly')).toBe(true)
    host.readOnly = false
    await host.updateComplete
    expect(host.hasAttribute('readonly')).toBe(false)
    expect(press(host).defaultPrevented).toBe(false)
  })

  test('can still be set by a script, as a read-only text field can', async () => {
    const host = await mount(`<${tag} readonly></${tag}>`)
    host.checked = true
    await host.updateComplete
    expect(host.checked).toBe(true)
  })
})
