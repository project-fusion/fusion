import '@fusion.dev/helix-testing/dom/register'
import { afterEach, beforeAll, describe, expect, test } from 'bun:test'
import { hasLayout, part, registerDom, settle, type Updatable } from '@fusion.dev/helix-testing/dom'

/* Browser only: happy-dom lays nothing out and does not scroll. */
const inBrowser = hasLayout() ? test : (): void => {}

/**
 * A fling, driven a frame at a time the way a phone's momentum drives it.
 *
 * **The rows are shorter than the estimate and the list starts in the middle**,
 * so every row the fling draws above the reader is news to the list. That is
 * the case that moved the content under the reader and wrote the scroll offset
 * while the box was moving, which ends a fling on iOS.
 *
 * Each frame, the content offset of every row on screen is compared with the
 * frame before. A row moves in the content only when something above it
 * changed height without the list making up for it. A scroll offset the list
 * writes is counted apart from the one the fling writes, and the move it makes
 * is taken off.
 */
const SHEET = `helix-headless-virtual-list::part(viewport) { block-size: 20rem; }
helix-headless-virtual-list > [data-index] { block-size: 21px; }
helix-headless-virtual-list > [data-index]:has([data-size="tall"]) { block-size: 47.5px; }`

/* Added for each test and taken out after it, because every spec file of the
   family runs on one page and these row heights would hold for the others. */
const sheet = (): void => {
  const style = document.createElement('style')
  style.dataset.fling = ''
  style.textContent = SHEET
  document.head.append(style)
}

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

afterEach(() => {
  for (const style of document.head.querySelectorAll('style[data-fling]')) {
    style.remove()
  }
})

interface Frame {
  /** How far a row on screen moved in the content, less what the list wrote. */
  shift: number
  /** Pixels of the box with no row in them. */
  gap: number
  /** What the list wrote to the scroll offset during the frame. */
  wrote: number
}

/** A list of `count` rows, `measured` or not, every third one tall where `tall` is set. */
const list = async (count: number, extra: string, tall = false): Promise<Updatable> => {
  sheet()
  /* The template is indented as an example writes it, so the whitespace around
     the row is drawn too, and stays drawn if the list leaks it. */
  document.body.innerHTML = `<helix-headless-virtual-list estimate="32" label="Rows" ${extra}>
      <template>
        <div class="row"><span data-field="name" data-field-data-size="size"></span></div>
      </template>
    </helix-headless-virtual-list>`
  const host = document.body.firstElementChild as Updatable & { items: unknown[] }
  host.items = Array.from({ length: count }, (_, at) => ({
    name: `Row ${at + 1}`,
    size: tall && at % 3 === 0 ? 'tall' : 'short',
  }))
  await settle(host)
  return host
}

/** Drives `frames` frames of a fling that starts at `speed` pixels a frame and decays. */
const fling = async (host: Updatable, speed: number, frames: number): Promise<Frame[]> => {
  const box = part(host, 'viewport') as HTMLElement
  const own = Object.getOwnPropertyDescriptor(Element.prototype, 'scrollTop') as PropertyDescriptor
  let driving = false
  let wrote = 0
  Object.defineProperty(box, 'scrollTop', {
    configurable: true,
    get: () => own.get?.call(box),
    set: (value: number) => {
      const from = own.get?.call(box) as number
      own.set?.call(box, value)
      if (!driving) {
        wrote += (own.get?.call(box) as number) - from
      }
    },
  })
  const offsets = (): Map<number, number> => {
    const frame = box.getBoundingClientRect()
    const found = new Map<number, number>()
    for (const row of host.querySelectorAll<HTMLElement>(':scope > [data-index]')) {
      const rect = row.getBoundingClientRect()
      if (rect.bottom > frame.top && rect.top < frame.bottom) {
        found.set(Number(row.dataset.index), rect.top - frame.top + box.scrollTop)
      }
    }
    return found
  }
  const gap = (): number => {
    const frame = box.getBoundingClientRect()
    const rows = [...host.querySelectorAll<HTMLElement>(':scope > [data-index]')].map((row) =>
      row.getBoundingClientRect(),
    )
    const top = Math.min(...rows.map((rect) => rect.top))
    const bottom = Math.max(...rows.map((rect) => rect.bottom))
    return Math.max(0, top - frame.top) + Math.max(0, frame.bottom - bottom)
  }
  const log: Frame[] = []
  let before = offsets()
  let velocity = speed
  for (let frame = 0; frame < frames; frame++) {
    driving = true
    box.scrollTop += velocity
    driving = false
    velocity *= 0.95
    await new Promise((done) => requestAnimationFrame(done))
    await host.updateComplete
    const after = offsets()
    const moved = [...after].find(([index]) => before.has(index))
    log.push({
      gap: gap(),
      shift: moved ? Math.abs(moved[1] - (before.get(moved[0]) as number) - wrote) : 0,
      wrote,
    })
    wrote = 0
    before = after
  }
  delete (box as { scrollTop?: number }).scrollTop
  return log
}

describe('a fling', () => {
  for (const [name, extra, tall] of [
    ['measured, rows shorter than the estimate', 'measured', false],
    ['not measured, rows of two heights', '', true],
    ['measured, rows of two heights', 'measured', true],
  ] as const) {
    inBrowser(`moves no row under the reader and writes no scroll offset: ${name}`, async () => {
      const host = await list(5000, extra, tall)
      ;(
        host as unknown as { scrollToIndex: (index: number, options: object) => void }
      ).scrollToIndex(3000, { align: 'start' })
      await settle(host)
      await new Promise((done) => setTimeout(done, 200))
      for (const speed of [-70, 70]) {
        const frames = await fling(host, speed, 24)
        expect(Math.max(...frames.map((frame) => frame.shift))).toBeLessThan(1)
        expect(frames.filter((frame) => frame.wrote !== 0)).toHaveLength(0)
        expect(Math.max(...frames.map((frame) => frame.gap))).toBe(0)
        /* Longer than the list waits before it squares the spacer. */
        await new Promise((done) => setTimeout(done, 200))
      }
    })
  }

  inBrowser('draws a screen ahead of the box in the direction it scrolls', async () => {
    const host = await list(5000, '')
    const box = part(host, 'viewport') as HTMLElement
    box.scrollTop = 32_000
    await new Promise((done) => requestAnimationFrame(done))
    await settle(host)
    const rows = [...host.querySelectorAll<HTMLElement>(':scope > [data-index]')]
    const last = rows.at(-1)?.getBoundingClientRect().bottom ?? 0
    expect(last - box.getBoundingClientRect().bottom).toBeGreaterThanOrEqual(box.clientHeight)
  })

  /* **A row drawn or taken out while a finger moves the box ends the touch on
     iOS**, which reads a change to what the slot holds as a change to the box:
     on the Simulator a drag of 130 points moved the list 10 and the rest of it
     did nothing. A browser here cannot feel that, so this holds the cause: with
     a finger on the box, rows already drawn cover the drag, and none comes or
     goes until it stops. */
  inBrowser(
    'draws and takes out no row while a finger moves the box within the rows drawn',
    async () => {
      const host = await list(5000, '')
      const box = part(host, 'viewport') as HTMLElement
      box.dispatchEvent(new Event('touchstart', { bubbles: true }))
      // A move past the rows drawn draws the screens either side of the finger, once.
      const room = box.clientHeight
      box.scrollTop = room * 3
      await new Promise((done) => requestAnimationFrame(done))
      await host.updateComplete
      const changes: MutationRecord[] = []
      const watch = new MutationObserver((records) => changes.push(...records))
      watch.observe(host, { childList: true })
      for (let step = 1; step <= 6; step++) {
        box.scrollTop = room * 3 + (room * step) / 4
        await new Promise((done) => requestAnimationFrame(done))
        await host.updateComplete
      }
      watch.disconnect()
      expect(changes).toHaveLength(0)
      box.dispatchEvent(new Event('touchend', { bubbles: true }))
      await new Promise((done) => setTimeout(done, 250))
      await host.updateComplete
      // Once it is still, the window moves to where the box is, and there is no gap.
      const rows = [...host.querySelectorAll<HTMLElement>(':scope > [data-index]')]
      const frame = box.getBoundingClientRect()
      expect(rows[0]?.getBoundingClientRect().top).toBeLessThanOrEqual(frame.top)
      expect(rows.at(-1)?.getBoundingClientRect().bottom ?? 0).toBeGreaterThanOrEqual(frame.bottom)
    },
  )

  inBrowser('keeps no node of a row it has taken out', async () => {
    const host = await list(5000, '')
    const box = part(host, 'viewport') as HTMLElement
    for (let step = 0; step < 40; step++) {
      box.scrollTop += 600
      await new Promise((done) => requestAnimationFrame(done))
      await host.updateComplete
    }
    const rows = host.querySelectorAll(':scope > [data-index]').length
    /* The rows and the template, and nothing a row left behind. */
    expect(host.childNodes.length).toBeLessThanOrEqual(rows + 3)
  })
})
