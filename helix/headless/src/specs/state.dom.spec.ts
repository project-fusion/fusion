import { beforeAll, describe, expect, test } from 'bun:test'
import type { PageState } from '@fusion.dev/helix-core'
import { mount, registerDom } from '@fusion.dev/helix-testing/dom'

let core: typeof import('@fusion.dev/helix-core')

beforeAll(async () => {
  registerDom()
  core = await import('@fusion.dev/helix-core')
  await import('../input/index.js')
  await import('../checkbox/index.js')
  await import('../popover/index.js')
})

const PAGE = `<div>
  <helix-headless-input id="title" label="Title"></helix-headless-input>
  <helix-headless-input label="Password" type="password"></helix-headless-input>
  <helix-headless-input label="Unsaved" snapshot="off"></helix-headless-input>
  <helix-headless-checkbox label="Done"></helix-headless-checkbox>
  <helix-headless-popover label="More"><button slot="trigger">More</button>Details</helix-headless-popover>
</div>`

type Field = HTMLElement & {
  checked: boolean
  open: boolean
  requestChecked(next: boolean): boolean
  requestOpen(next: boolean): boolean
  requestValue(next: string): boolean
  updateComplete: Promise<unknown>
  value: string
}

const page = async (): Promise<HTMLElement> => {
  document.body.replaceChildren()
  return mount(PAGE)
}

const settle = async (holder: HTMLElement): Promise<void> => {
  for (const element of holder.querySelectorAll('*')) {
    await (element as Partial<Field>).updateComplete
  }
}

describe('captureState', () => {
  test('keeps each element’s value, check and open state, and never a password', async () => {
    const holder = await page()
    const [title, password, unsaved] = [
      ...holder.querySelectorAll('helix-headless-input'),
    ] as unknown as Field[]
    title?.requestValue('Launch plan')
    password?.requestValue('hunter2')
    unsaved?.requestValue('scratch')
    ;(holder.querySelector('helix-headless-checkbox') as unknown as Field).requestChecked(true)
    await settle(holder)
    const snapshot = core.captureState()
    const entries = Object.fromEntries(snapshot.entries.map((entry) => [entry.path, entry.state]))
    expect(entries['#title']).toEqual({ value: 'Launch plan' })
    expect(JSON.stringify(snapshot)).not.toContain('hunter2')
    expect(JSON.stringify(snapshot)).not.toContain('scratch')
    expect(Object.values(entries)).toContainEqual({ checked: true })
    expect(Object.values(entries)).toContainEqual({ open: false })
    expect(snapshot.version).toBe(1)
  })
})

describe('restoreState', () => {
  test('puts a captured screen back on a fresh page, through each element’s requests', async () => {
    const before = await page()
    ;(before.querySelector('#title') as unknown as Field).requestValue('Launch plan')
    ;(before.querySelector('helix-headless-checkbox') as unknown as Field).requestChecked(true)
    ;(before.querySelector('helix-headless-popover') as unknown as Field).requestOpen(true)
    await settle(before)
    const snapshot: PageState = JSON.parse(JSON.stringify(core.captureState()))
    const after = await page()
    const asked: string[] = []
    /* Not bubbling, so heard on the popover itself. */
    after
      .querySelector('helix-headless-popover')
      ?.addEventListener('helix-before-open', () => asked.push('open'))
    const report = await core.restoreState(snapshot)
    expect(report.missed).toEqual([])
    expect(report.refused).toEqual([])
    expect((after.querySelector('#title') as unknown as Field).value).toBe('Launch plan')
    expect((after.querySelector('helix-headless-checkbox') as unknown as Field).checked).toBe(true)
    expect((after.querySelector('helix-headless-popover') as unknown as Field).open).toBe(true)
    expect(asked).toEqual(['open'])
  })

  test('reports an entry the page refused, and one it no longer draws', async () => {
    const before = await page()
    ;(before.querySelector('#title') as unknown as Field).requestValue('Launch plan')
    await settle(before)
    const snapshot = core.captureState()
    snapshot.entries.push({
      path: 'helix-headless-input:9',
      state: { value: 'x' },
      tag: 'helix-headless-input',
    })
    const after = await page()
    after.addEventListener('helix-before-change', (event) => event.preventDefault())
    const report = await core.restoreState(snapshot)
    expect(report.refused).toContain('#title')
    expect(report.missed).toEqual(['helix-headless-input:9'])
  })

  test('is on the page for tools that reach it only through its globals', () => {
    const slot = (globalThis as Record<symbol, unknown>)[Symbol.for('fusion.dev/helix/state')] as {
      captureState: unknown
      restoreState: unknown
    }
    expect(typeof slot.captureState).toBe('function')
    expect(typeof slot.restoreState).toBe('function')
  })
})

describe('pathOf', () => {
  test('names an element by its id, or by its tag and place, across shadow roots', async () => {
    const holder = await page()
    const title = holder.querySelector('#title') as HTMLElement
    const field = title.shadowRoot?.querySelector('input') as HTMLElement
    expect(core.pathOf(title)).toBe('#title')
    expect(core.pathOf(field)).toBe('#title >> #control')
    expect(core.elementAt('#title >> #control')).toBe(field)
    expect(
      core.elementAt(core.pathOf(holder.querySelector('helix-headless-checkbox') as Element)),
    ).toBe(holder.querySelector('helix-headless-checkbox'))
  })
})
