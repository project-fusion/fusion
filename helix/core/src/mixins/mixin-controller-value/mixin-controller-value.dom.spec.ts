import { beforeAll, describe, expect, test } from 'bun:test'
import { registerDom } from '@fusion.dev/helix-testing/dom'

/**
 * The controlled and uncontrolled contract, asked of the mixin rather than of a
 * component that happens to mix it in.
 *
 * **This is the multiplier.** Six families mix this in and every one of them
 * inherits whatever it does, so a fault here is a fault six times over, and
 * every component spec that covers it does so by coincidence: a component
 * asserts the component, and passes for the wrong reason whenever the mixin is
 * wrong in a way that component never reaches.
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
  const names_ = ['helix-before-change', 'input', 'change']
  for (const name of names_) {
    host.addEventListener(name, listen)
  }
  act()
  await host.updateComplete
  for (const name of names_) {
    host.removeEventListener(name, listen)
  }
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
    expect(names).toEqual(['helix-before-change', 'input', 'change'])
    expect(host.value).toBe('two')
  })

  test('and a refusal leaves it exactly where it was', async () => {
    const host = await mount(`<${tag} default-value="one"></${tag}>`)
    host.addEventListener('helix-before-change', (event) => {
      event.preventDefault()
    })
    expect(host.requestValue('two')).toBe(false)
    await host.updateComplete
    expect(host.value).toBe('one')
  })
})

describe('a control whose consumer declared a value', () => {
  /* A declared property is a seed and a correction, the way `<input value>` is,
     and a consumer who wants the change for themselves refuses it. See (294). */
  test('announces the change and applies it, a declared value being a seed', async () => {
    const host = await mount(`<${tag} value="theirs"></${tag}>`)
    const names = await heard(host, () => {
      host.requestValue('ours')
    })
    expect(names).toEqual(['helix-before-change', 'input', 'change'])
    expect(host.value).toBe('ours')
  })

  test('and refusing is what keeps it where they put it', async () => {
    const host = await mount(`<${tag} value="theirs"></${tag}>`)
    host.addEventListener('helix-before-change', (event: Event) => {
      event.preventDefault()
    })
    host.requestValue('ours')
    await host.updateComplete
    expect(host.value).toBe('theirs')
  })

  test('and moves when the consumer passes a new one', async () => {
    const host = await mount(`<${tag} value="theirs"></${tag}>`)
    host.value = 'their next'
    await host.updateComplete
    expect(host.value).toBe('their next')
  })
})

describe('writing the property', () => {
  /* There is no mode to take over: a write is a write, the way it is on a
     native control, and the element keeps applying its own changes whoever
     wrote last. See (294). */
  test('is a seed and a correction, and never stops the control responding', async () => {
    const host = await mount(`<${tag} default-value="one"></${tag}>`)
    host.value = 'written by a script'
    await host.updateComplete
    expect(host.requestValue('two')).toBe(true)
    await host.updateComplete
    expect(host.value).toBe('two')
  })

  test('and markup that declared a value does not stop it either', async () => {
    const host = await mount(`<${tag} value="theirs"></${tag}>`)
    host.setAttribute('default-value', 'noise')
    await host.updateComplete
    host.requestValue('ours')
    await host.updateComplete
    expect(host.value).toBe('ours')
  })
})

describe('the names a change arrives under', () => {
  /* One request event whatever the control, and the native pair after it.
     `announcesInput` picks only which native event reports the result: a
     continuous control sends `input` while a reader is still editing and
     withholds `change`. The request is `helix-before-change` either way, which
     is the distinction the platform already draws. See (294). */
  test('is `helix-before-change` and then `input` and `change`, in steps', async () => {
    const host = await mount(`<${tag}></${tag}>`)
    expect(await heard(host, () => host.requestValue('x'))).toEqual([
      'helix-before-change',
      'input',
      'change',
    ])
  })

  test('and `change` is withheld while a reader is still editing', async () => {
    const host = await mount(`<${inputTag}></${inputTag}>`)
    expect(await heard(host, () => (host as Probe).requestValue('x'))).toEqual([
      'helix-before-change',
      'input',
    ])
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
