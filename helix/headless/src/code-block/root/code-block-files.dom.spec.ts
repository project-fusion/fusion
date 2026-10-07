import { beforeAll, describe, expect, test } from 'bun:test'
import { hasState, mount, part, registerDom, settle } from '@fusion.dev/helix-testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

type Block = HTMLElement & { file?: string; updateComplete: Promise<boolean> }

const FILES = `<helix-headless-code-block label="app.ts">const a = 1</helix-headless-code-block>
  <helix-headless-code-block label="app.css">a { color: red }</helix-headless-code-block>
  <helix-headless-code-block language="html">&lt;p&gt;</helix-headless-code-block>`

/** A block holding files, once it and each file have drawn. */
const files = async (attributes = '', inside = FILES): Promise<Block> => {
  const host = (await mount(
    `<helix-headless-code-block ${attributes}>${inside}</helix-headless-code-block>`,
  )) as Block
  await settle(host)
  for (const block of host.querySelectorAll('helix-headless-code-block')) {
    await settle(block as Block)
  }
  return host
}

const tabs = (host: Block): HTMLElement[] => [
  ...(host.shadowRoot?.querySelectorAll<HTMLElement>('[part="file-tab"]') ?? []),
]

const shown = (host: Block): (string | null)[] =>
  [...host.querySelectorAll('helix-headless-code-block')]
    .filter((block) => !block.hasAttribute('hidden'))
    .map((block) => block.getAttribute('label') ?? block.getAttribute('language'))

describe('several code blocks as files', () => {
  test('draw a tab list named by `files-label`, one tab for each file, named by its label or its language', async () => {
    const host = await files()
    const list = part(host, 'files')
    expect(list?.getAttribute('role')).toBe('tablist')
    expect(list?.getAttribute('aria-label')).toBe('Files')
    expect(tabs(host).map((tab) => tab.textContent)).toEqual(['app.ts', 'app.css', 'html'])
    expect(tabs(host).map((tab) => tab.getAttribute('role'))).toEqual(['tab', 'tab', 'tab'])
  })

  test('show the first file, and only it, with its tab selected and the panel labeled by it', async () => {
    const host = await files()
    expect(shown(host)).toEqual(['app.ts'])
    expect(tabs(host).map((tab) => tab.getAttribute('aria-selected'))).toEqual([
      'true',
      'false',
      'false',
    ])
    expect(tabs(host).map((tab) => tab.tabIndex)).toEqual([0, -1, -1])
    const panel = host.shadowRoot?.querySelector('[role="tabpanel"]')
    expect(panel?.getAttribute('aria-labelledby')).toBe(tabs(host)[0]?.id ?? '')
  })

  test('`file` names the file shown', async () => {
    const host = await files('file="app.css"')
    expect(shown(host)).toEqual(['app.css'])
  })

  test('a press on a tab asks first, then shows its file and says change', async () => {
    const host = await files()
    const heard: string[] = []
    host.addEventListener('helix-before-change', (event) => {
      heard.push(`before ${(event as CustomEvent<{ value: string }>).detail.value}`)
    })
    host.addEventListener('change', () => heard.push(`change ${host.file}`))
    tabs(host)[2]?.click()
    await settle(host)
    expect(heard).toEqual(['before html', 'change html'])
    expect(host.file).toBe('html')
    expect(shown(host)).toEqual(['html'])
  })

  test('a canceled helix-before-change keeps the file shown', async () => {
    const host = await files()
    host.addEventListener('helix-before-change', (event) => event.preventDefault())
    tabs(host)[1]?.click()
    await settle(host)
    expect(host.file).toBeUndefined()
    expect(shown(host)).toEqual(['app.ts'])
  })

  test('the arrow keys move along the tabs and show each file, and Home and End go to the ends', async () => {
    const host = await files()
    const press = async (key: string) => {
      part(host, 'files')?.dispatchEvent(
        new KeyboardEvent('keydown', { bubbles: true, cancelable: true, composed: true, key }),
      )
      await settle(host)
    }
    await press('ArrowRight')
    expect(shown(host)).toEqual(['app.css'])
    await press('End')
    expect(shown(host)).toEqual(['html'])
    await press('ArrowRight')
    expect(shown(host)).toEqual(['app.ts'])
    await press('ArrowLeft')
    expect(shown(host)).toEqual(['html'])
    await press('Home')
    expect(shown(host)).toEqual(['app.ts'])
    expect(host.shadowRoot?.activeElement).toBe(tabs(host)[0] as HTMLElement)
  })

  test('a file under tabs draws no name of its own, and its copy button still says it', async () => {
    const host = await files()
    const first = host.querySelector('helix-headless-code-block') as Block
    expect(hasState(first, 'tabbed')).toBe(true)
    expect(part(first, 'label')).toBeNull()
    expect(part(first, 'copy')?.getAttribute('label')).toBe('Copy code, app.ts')
  })

  test('one block inside another draws no tabs, and keeps its name', async () => {
    const host = await files(
      '',
      '<helix-headless-code-block label="app.ts">const a = 1</helix-headless-code-block>',
    )
    expect(part(host, 'files')).toBeNull()
    const only = host.querySelector('helix-headless-code-block') as Block
    expect(only.hidden).toBe(false)
    expect(hasState(only, 'tabbed')).toBe(false)
    expect(part(only, 'label')?.textContent).toBe('app.ts')
  })
})
