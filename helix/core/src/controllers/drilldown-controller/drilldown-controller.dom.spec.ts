import { beforeAll, describe, expect, test } from 'bun:test'
import { registerDom } from '@helix-io/testing/dom'
import { DrilldownController, type DrilldownOptions } from './drilldown-controller.js'

/**
 * One page of a nested set showing at a time, with a way back.
 *
 * A drill-down replaces the panel rather than opening a second one beside it,
 * which is the right shape wherever there is no room for two: on a phone there
 * is no second column, and on a touch screen no hover to open one with.
 *
 * **The tree is the state.** A row's page is its own children, assigned to a
 * slot, so the controller holds one reference, the row currently drilled into,
 * and derives everything else from the DOM. The alternative, an id per page and
 * a map beside it, is a second copy of the structure a consumer can put out of
 * step with the first. These specs mostly ask that: change the markup and the
 * controller agrees, because it never held a copy.
 *
 * No layout is involved, so nothing here is arranged rather than measured.
 */
beforeAll(() => {
  registerDom()
})

/**
 * A three-level menu, written the way a consumer writes one.
 *
 * The nesting *is* the wiring: `Color` contains the page it opens, and that
 * page's `Warm` contains the page *it* opens. There are no ids and nothing to
 * keep in step.
 */
const MARKUP = `
  <div id="panel">
    <i id="file">File</i>
    <i id="color">Color
      <i id="warm" slot="page">Warm
        <i id="red" slot="page">Red</i>
        <i id="amber" slot="page">Amber</i>
      </i>
      <i id="cool" slot="page">Cool</i>
    </i>
    <i id="quit">Quit</i>
  </div>`

interface Scene {
  asked: number
  drill: DrilldownController
  row(id: string): Element
}

const scene = (options: Partial<DrilldownOptions> = {}): Scene => {
  document.body.innerHTML = MARKUP
  const panel = document.getElementById('panel') as HTMLElement
  const made = { asked: 0 } as Scene
  made.drill = new DrilldownController(
    { addController: () => {}, requestUpdate: () => (made.asked += 1) } as never,
    { root: () => [...panel.children].filter((child) => child.slot === ''), ...options },
  )
  made.row = (id) => document.getElementById(id) as Element
  return made
}

const ids = (rows: Element[]): string[] => rows.map((row) => row.id)

describe('the page a reader is on', () => {
  test('starts at the top, whose rows are the ones nothing opened', () => {
    const one = scene()
    expect(one.drill.atRoot).toBe(true)
    expect(ids(one.drill.rows)).toEqual(['file', 'color', 'quit'])
  })

  test('and has no name, because the panel’s own label is the name of the place', () => {
    expect(scene().drill.label).toBe('')
  })
})

describe('drilling into a row', () => {
  test('shows that row’s own page in place of the one showing', () => {
    const one = scene()
    expect(one.drill.enter(one.row('color'))).toBe(true)
    expect(ids(one.drill.rows)).toEqual(['warm', 'cool'])
  })

  /* The row's own text and not its subtree, because a row that opens a page
     *contains* that page's rows: `textContent` would read back the whole
     thing, so the title of the Color page would be "Color Warm Red Amber
     Cool". */
  test('and is named by the row’s own text, not by everything under it', () => {
    const one = scene()
    one.drill.enter(one.row('color'))
    expect(one.drill.label).toBe('Color')
  })

  test('telling the host, because nothing else would redraw the panel', () => {
    const one = scene()
    one.drill.enter(one.row('color'))
    expect(one.asked).toBe(1)
  })

  /* Refused rather than drilled into empty, which would leave a reader on a
     blank panel with a back control as its only content and nothing saying
     why. */
  test('unless the row has no page, which is refused rather than shown empty', () => {
    const one = scene()
    expect(one.drill.enter(one.row('file'))).toBe(false)
    expect([one.drill.atRoot, one.asked]).toEqual([true, 0])
  })

  test('as many levels down as the markup goes', () => {
    const one = scene()
    one.drill.enter(one.row('color'))
    one.drill.enter(one.row('warm'))
    expect(ids(one.drill.rows)).toEqual(['red', 'amber'])
    expect([one.drill.label, one.drill.depth]).toEqual(['Warm', 2])
  })
})

describe('asking whether a row opens a page', () => {
  test('is whether anything under it is assigned to the page slot', () => {
    const one = scene()
    expect([one.drill.hasPage(one.row('color')), one.drill.hasPage(one.row('file'))]).toEqual([
      true,
      false,
    ])
  })
})

describe('going back', () => {
  /* A stack, not a pointer: a reader three levels down pressed one control and
     expects one level. */
  test('is one level, not all the way to the top', () => {
    const one = scene()
    one.drill.enter(one.row('color'))
    one.drill.enter(one.row('warm'))
    expect(one.drill.back()).toBe(true)
    expect([one.drill.label, ids(one.drill.rows)]).toEqual(['Color', ['warm', 'cool']])
  })

  test('and again, which arrives at the top', () => {
    const one = scene()
    one.drill.enter(one.row('color'))
    one.drill.enter(one.row('warm'))
    one.drill.back()
    one.drill.back()
    expect([one.drill.atRoot, ids(one.drill.rows)]).toEqual([true, ['file', 'color', 'quit']])
  })

  test('and says so when there was nowhere to go', () => {
    const one = scene()
    expect(one.drill.back()).toBe(false)
    expect(one.asked).toBe(0)
  })
})

describe('the way back being rebuilt from the tree', () => {
  /* The stack is walked up from the current row rather than kept beside it, so
     it cannot disagree with the tree. A page removed while it was showing takes
     its ancestors with it, and `atRoot` becomes true rather than the controller
     holding a reference to something detached. */
  test('means a page removed while showing lands the reader at the top', () => {
    const one = scene()
    one.drill.enter(one.row('color'))
    one.drill.enter(one.row('warm'))
    one.row('warm').remove()
    expect(one.drill.atRoot).toBe(true)
    expect(ids(one.drill.rows)).toEqual(['file', 'color', 'quit'])
  })

  /* The half the walk alone did not catch, and the likelier one: a consumer
     removing a whole section rather than the row a reader happens to be on.
     The subtree comes away intact, so the child still has a parent and the
     parent still has a parent. Measured before the fix: `depth` answered 2,
     `rows` listed a page nobody could see, and `back()` walked to a second
     detached row before reaching the top. */
  test('and so does one whose ancestor was removed, subtree and all', () => {
    const one = scene()
    one.drill.enter(one.row('color'))
    one.drill.enter(one.row('warm'))
    one.row('color').remove()
    expect([one.drill.atRoot, one.drill.depth, one.drill.label]).toEqual([true, 0, ''])
    expect(ids(one.drill.rows)).toEqual(['file', 'quit'])
    expect(one.drill.back()).toBe(false)
  })

  /* And the other direction: a consumer who moves a row in the markup has moved
     its page with it, because the page is the row's own children. */
  test('and a row moved in the markup takes its page with it', () => {
    const one = scene()
    const panel = document.getElementById('panel') as HTMLElement
    panel.prepend(one.row('color'))
    one.drill.enter(one.row('color'))
    expect(ids(one.drill.rows)).toEqual(['warm', 'cool'])
  })
})

describe('how deep the reader is', () => {
  /* Counted by walking up rather than by keeping a number, for the reason the
     stack is: a count can be wrong about a tree, and the tree is what renders. */
  test('is zero at the top and counts down from there', () => {
    const one = scene()
    expect(one.drill.depth).toBe(0)
    one.drill.enter(one.row('color'))
    expect(one.drill.depth).toBe(1)
    one.drill.enter(one.row('warm'))
    expect(one.drill.depth).toBe(2)
  })
})

describe('closing the panel', () => {
  /* For closing rather than for navigating: a panel that reopens where it was
     left is showing a reader a place they have no memory of choosing. */
  test('puts the reader back at the top, so it reopens where it opened', () => {
    const one = scene()
    one.drill.enter(one.row('color'))
    one.drill.reset()
    expect(one.drill.atRoot).toBe(true)
  })

  test('and asks for nothing when it was already there', () => {
    const one = scene()
    one.drill.reset()
    expect(one.asked).toBe(0)
  })

  test('as does the host going away', () => {
    const one = scene()
    one.drill.enter(one.row('color'))
    one.drill.hostDisconnected()
    expect(one.drill.atRoot).toBe(true)
  })
})

describe('a container holding things other than rows', () => {
  /* The controller does not guess from a tag name it cannot know. A menu with
     separators in it says which of its children are rows. */
  test('says which of its children count, rather than being guessed at', () => {
    document.body.innerHTML = `
      <div id="panel">
        <i id="one">One</i>
        <hr id="rule">
        <i id="two">Two
          <i id="three" slot="page">Three</i>
          <hr id="rule-two" slot="page">
        </i>
      </div>`
    const panel = document.getElementById('panel') as HTMLElement
    const drill = new DrilldownController(
      { addController: () => {}, requestUpdate: () => {} } as never,
      {
        isRow: (element) => element.tagName === 'I',
        root: () => [...panel.children].filter((child) => child.slot === ''),
      },
    )
    expect(ids(drill.rows)).toEqual(['one', 'two'])
    drill.enter(document.getElementById('two') as Element)
    expect(ids(drill.rows)).toEqual(['three'])
  })

  test('and which slot a page arrives in, where `page` is not the name', () => {
    document.body.innerHTML = `
      <div id="panel">
        <i id="one">One
          <i id="deep" slot="under">Deep</i>
        </i>
      </div>`
    const panel = document.getElementById('panel') as HTMLElement
    const drill = new DrilldownController(
      { addController: () => {}, requestUpdate: () => {} } as never,
      { root: () => [...panel.children].filter((child) => child.slot === ''), slot: 'under' },
    )
    expect(drill.enter(document.getElementById('one') as Element)).toBe(true)
    expect(ids(drill.rows)).toEqual(['deep'])
  })
})
