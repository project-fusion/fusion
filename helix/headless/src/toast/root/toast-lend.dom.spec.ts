import '@fusion.dev/helix-testing/dom/register'
import { afterEach, beforeAll, describe, expect, test } from 'bun:test'
import { lockScroll, openModal, unlockScroll } from '@fusion.dev/helix-core'
import { hasLayout, mount, nextFrame, registerDom } from '@fusion.dev/helix-testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

/** A modal surface as Dialog draws one: a host holding the page, its `<dialog>` in its shadow root. */
const modalHost = (): { dialog: HTMLDialogElement; host: HTMLElement; shut: () => void } => {
  const host = document.createElement('div')
  host.attachShadow({ mode: 'open' }).innerHTML = '<dialog><button>Keep</button></dialog>'
  document.body.append(host)
  const dialog = host.shadowRoot?.querySelector('dialog') as HTMLDialogElement
  /* happy-dom reads `:modal` and matches nothing with it. */
  if (!hasLayout()) {
    const matches = dialog.matches.bind(dialog)
    dialog.matches = ((selector: string) =>
      selector === ':modal' ? dialog.open : matches(selector)) as typeof dialog.matches
  }
  lockScroll(host)
  openModal(dialog)
  return {
    dialog,
    host,
    shut: () => {
      dialog.close()
      dialog.dispatchEvent(new Event('close'))
      unlockScroll(host)
    },
  }
}

const settled = async (): Promise<void> => {
  await nextFrame()
  await nextFrame()
}

const page = async (): Promise<{ app: HTMLElement; toast: HTMLElement }> => {
  const app = (await mount(
    `<div id="app"><p id="before">Page</p><helix-headless-toast label="Notifications">
       <helix-headless-toast-item>Project saved.<button slot="actions">Retry</button></helix-headless-toast-item>
     </helix-headless-toast></div>`,
  )) as HTMLElement
  const toast = app.querySelector('helix-headless-toast') as HTMLElement
  await (toast as HTMLElement & { updateComplete: Promise<unknown> }).updateComplete
  return { app, toast }
}

let opened: Array<() => void> = []

afterEach(() => {
  for (const shut of opened) {
    shut()
  }
  opened = []
})

describe('a toast above a modal', () => {
  test('moves into the modal that opens while a message shows, and back as it closes', async () => {
    const { app, toast } = await page()
    const modal = modalHost()
    opened.push(modal.shut)
    await settled()
    expect(toast.parentNode === modal.dialog).toBe(true)
    modal.shut()
    opened = []
    await settled()
    expect(toast.parentNode === app).toBe(true)
    expect(app.lastElementChild === toast).toBe(true)
  })

  test('keeps its place for the page while it is away', async () => {
    const { app, toast } = await page()
    const modal = modalHost()
    opened.push(modal.shut)
    await settled()
    /* What a framework does with the parent it rendered the region in. */
    const added = document.createElement('p')
    app.insertBefore(added, toast)
    modal.shut()
    opened = []
    await settled()
    expect(toast.previousElementSibling === added).toBe(true)
  })

  test('leaves with the page that removes it while it is away', async () => {
    const { app, toast } = await page()
    const modal = modalHost()
    opened.push(modal.shut)
    await settled()
    app.removeChild(toast)
    expect(toast.isConnected).toBe(false)
    modal.shut()
    opened = []
    await settled()
    expect(toast.isConnected).toBe(false)
    expect(app.querySelector('helix-headless-toast')).toBe(null)
  })

  test('stays where it is while no message shows', async () => {
    const app = (await mount(
      '<div><helix-headless-toast label="Notifications"></helix-headless-toast></div>',
    )) as HTMLElement
    const toast = app.querySelector('helix-headless-toast') as HTMLElement
    await (toast as HTMLElement & { updateComplete: Promise<unknown> }).updateComplete
    const modal = modalHost()
    opened.push(modal.shut)
    await settled()
    expect(toast.parentNode === app).toBe(true)
  })

  /* Only in a browser, which makes everything outside an open modal inert. */
  test('a message takes a press while a modal is open', async () => {
    if (!hasLayout()) {
      return
    }
    const { toast } = await page()
    const modal = modalHost()
    opened.push(modal.shut)
    await settled()
    const action = toast.querySelector('button') as HTMLButtonElement
    action.focus()
    expect(modal.host.shadowRoot?.activeElement === action).toBe(true)
    const box = action.getBoundingClientRect()
    const hit = modal.host.shadowRoot?.elementFromPoint(box.x + box.width / 2, box.y + 2)
    expect(hit === action).toBe(true)
  })
})
