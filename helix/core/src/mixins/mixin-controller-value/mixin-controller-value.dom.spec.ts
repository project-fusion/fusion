import { beforeAll, describe, expect, test } from 'bun:test'
import { registerDom } from '@fusion-io/testing/dom'

/**
 * The controlled and uncontrolled contract, asked of the mixin rather than of a
 * component that happens to mix it in.
 *
 * **This is the multiplier.** Six families mix this in and every one of them
 * inherits whatever it does, so a fault here is a fault six times over, and
 * every component spec that covers it does so by coincidence: a component
 * asserts the component, and passes for the wrong reason whenever the mixin is
 * wrong in a way that component never reaches. The repository has been bitten
 * by this contract twice.
 *
 * A real element rather than a stub host, because the parts most worth testing
 * are the ones Lit's machinery drives: `@property` on an accessor pair,
 * `willUpdate` reading the mode exactly once, and `requestUpdate` with an old
 * value so a refusal can put it back. A hand-written host would be asserting
 * the stub.
 */
const tag = 'probe-value'
const inputTag = 'probe-value-input'

type Probe = HTMLElement & {
  defaultValue: string
  requestValue(next: string): boolean
  updateComplete: Promise<boolean>
  value: string
}

beforeAll(async () => {
  registerDom()
  const { HelixFormElement } = await import('../../helix-form-element/helix-form-element.js')
  const { MixinControllerValue } = await import('./mixin-controller-value.js')
  customElements.define(tag, class extends MixinControllerValue(HelixFormElement) {})
  customElements.define(
    inputTag,
    class extends MixinControllerValue(HelixFormElement) {
      protected override readonly announcesInput = true
    },
  )
})

/** Mounted and settled, so `willUpdate` has run and the mode is decided. */
const mount = async (markup: string): Promise<Probe> => {
  document.body.innerHTML = markup
  const host = document.body.firstElementChild as Probe
  await host.updateComplete
  return host
}

/** Every event of either name the host announced while `act` ran. */
const heard = async (host: Probe, act: () => void): Promise<string[]> => {
  const names: string[] = []
  const listen = (event: Event): void => {
    names.push(event.type)
  }
  host.addEventListener('helix-change', listen)
  host.addEventListener('helix-input', listen)
  act()
  await host.updateComplete
  host.removeEventListener('helix-change', listen)
  host.removeEventListener('helix-input', listen)
  return names
}

describe('the value a control holds', () => {
  test('is the markup’s until something sets one, which is what `default-value` is for', async () => {
    const host = await mount(`<${tag} default-value="seed"></${tag}>`)
    expect(host.value).toBe('seed')
  })

  test('reads back whatever was written, in either mode, because there is one property', async () => {
    const host = await mount(`<${tag} default-value="seed" value="theirs"></${tag}>`)
    expect(host.value).toBe('theirs')
  })

  test('is the empty string when nothing declared one, rather than undefined', async () => {
    const host = await mount(`<${tag}></${tag}>`)
    expect(host.value).toBe('')
  })
})

describe('an uncontrolled control', () => {
  test('announces the change and then makes it', async () => {
    const host = await mount(`<${tag} default-value="one"></${tag}>`)
    const names = await heard(host, () => {
      expect(host.requestValue('two')).toBe(true)
    })
    expect(names).toEqual(['helix-change'])
    expect(host.value).toBe('two')
  })

  test('and a refusal leaves it exactly where it was', async () => {
    const host = await mount(`<${tag} default-value="one"></${tag}>`)
    host.addEventListener('helix-change', (event) => {
      event.preventDefault()
    })
    expect(host.requestValue('two')).toBe(false)
    await host.updateComplete
    expect(host.value).toBe('one')
  })
})

describe('a controlled control', () => {
  test('announces the change and applies none of it, which is what controlled means', async () => {
    const host = await mount(`<${tag} value="theirs"></${tag}>`)
    const names = await heard(host, () => {
      host.requestValue('ours')
    })
    expect(names).toEqual(['helix-change'])
    expect(host.value).toBe('theirs')
  })

  test('and moves when the consumer passes a new one', async () => {
    const host = await mount(`<${tag} value="theirs"></${tag}>`)
    host.value = 'their next'
    await host.updateComplete
    expect(host.value).toBe('their next')
  })
})

describe('which mode a control is in', () => {
  /* The fault this exists to prevent: a script assigning `value` to a control
     nobody owns would hand it to a consumer who never asked for it, and the
     control would stop responding to its own reader from then on. */
  test('is decided at the first update, so a later assignment does not take it over', async () => {
    const host = await mount(`<${tag} default-value="one"></${tag}>`)
    host.value = 'written by a script'
    await host.updateComplete
    expect(host.requestValue('two')).toBe(true)
    await host.updateComplete
    expect(host.value).toBe('two')
  })

  /* And the other way round, which is the half that makes it a decision rather
     than a guess: markup that owns the value keeps owning it even after the
     control has been through an update that did not mention it. */
  test('and a controlled one stays controlled across updates that say nothing about it', async () => {
    const host = await mount(`<${tag} value="theirs"></${tag}>`)
    host.setAttribute('default-value', 'noise')
    await host.updateComplete
    host.requestValue('ours')
    await host.updateComplete
    expect(host.value).toBe('theirs')
  })
})

describe('the name the change arrives under', () => {
  /* It selects the event and not the timing: `requestValue` is called whenever
     the value moves either way, and this decides what a consumer hears, so the
     name tells them how often to expect it. */
  test('is `helix-change` for a control that moves in steps', async () => {
    const host = await mount(`<${tag}></${tag}>`)
    expect(await heard(host, () => host.requestValue('x'))).toEqual(['helix-change'])
  })

  test('and `helix-input` for one the reader moves continuously', async () => {
    const host = await mount(`<${inputTag}></${inputTag}>`)
    expect(await heard(host, () => (host as Probe).requestValue('x'))).toEqual(['helix-input'])
  })
})

describe('a request that asks for the value already held', () => {
  test('stands, and announces nothing, because nothing moved', async () => {
    const host = await mount(`<${tag} default-value="same"></${tag}>`)
    const names = await heard(host, () => {
      expect(host.requestValue('same')).toBe(true)
    })
    expect(names).toEqual([])
  })
})

describe('a form putting a control back', () => {
  test('a reset drops both halves, so a control written to is served fresh', async () => {
    const host = await mount(`<${tag} default-value="seed"></${tag}>`)
    host.requestValue('typed')
    await host.updateComplete
    expect(host.value).toBe('typed')
    ;(host as unknown as { formResetCallback(): void }).formResetCallback()
    await host.updateComplete
    expect(host.value).toBe('seed')
  })

  test('a restore with state takes it', async () => {
    const host = await mount(`<${tag} default-value="seed"></${tag}>`)
    ;(
      host as unknown as { formStateRestoreCallback(s: string | null): void }
    ).formStateRestoreCallback('restored')
    await host.updateComplete
    expect(host.value).toBe('restored')
  })

  /* A restore with nothing recorded is a form the browser knows nothing about,
     which is the same situation as a fresh one and not an empty control. */
  test('and a restore with none falls back to the markup rather than to empty', async () => {
    const host = await mount(`<${tag} default-value="seed"></${tag}>`)
    ;(
      host as unknown as { formStateRestoreCallback(s: string | null): void }
    ).formStateRestoreCallback(null)
    await host.updateComplete
    expect(host.value).toBe('seed')
  })
})
