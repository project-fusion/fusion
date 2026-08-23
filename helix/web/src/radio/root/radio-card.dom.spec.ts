import { beforeAll, describe, expect, test } from 'bun:test'
import { hasLayout, mount, part, registerDom } from '@fusion-io/testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
  await import('../../checkbox/index.js')
})

type Choice = HTMLElement & { updateComplete: Promise<boolean> }

const radio = async (extra = ''): Promise<Choice> =>
  (await mount(`<helix-radio value="one" ${extra}>Solo</helix-radio>`)) as Choice

const checkbox = async (extra = ''): Promise<Choice> =>
  (await mount(`<helix-checkbox value="one" ${extra}>Backups</helix-checkbox>`)) as Choice

describe('the card appearance', () => {
  test('reflects, because that is what the stylesheet selects on', async () => {
    expect((await radio('variant="card"')).getAttribute('variant')).toBe('card')
    expect((await checkbox('variant="card"')).getAttribute('variant')).toBe('card')
  })

  test('the mark is still rendered, which is the whole point of it staying', async () => {
    /* A card whose only marker was its own border would ask a reader to compare
       surfaces across a row to find the answer, and would leave nothing at all
       for a high-contrast display. */
    expect(part(await radio('variant="card"'), 'box')).toBeTruthy()
    expect(part(await checkbox('variant="card"'), 'box')).toBeTruthy()
  })
})

/**
 * Mounts several at once and hands back a lookup by id.
 *
 * One call, because `mount` assigns `document.body.innerHTML`: mounting a
 * second thing detaches the first, and `getComputedStyle` on a detached element
 * returns empty strings for everything. That reads as `NaN` at the assertion
 * and looks exactly like a stylesheet that did not apply, which is the thing
 * these specs exist to detect.
 */
const board = async (markup: string): Promise<(id: string) => Choice> => {
  await mount(`<div>${markup}</div>`)
  return (id) => {
    const found = document.getElementById(id)
    if (!found) {
      throw new Error(`nothing mounted with id "${id}"`)
    }
    return found as Choice
  }
}

/** The border on whichever part is the target, which differs by control. */
const edge = (host: Choice, name: string): CSSStyleDeclaration =>
  getComputedStyle(part(host, name) as HTMLElement)

if (hasLayout()) {
  describe('the card appearance in a browser', () => {
    /* Browser-only, and the reason is the fault this is written against: a rule
       whose selector matches nothing is valid CSS that silently does nothing.
       `check:selectors` catches a `[part=]` naming a part nothing renders, and
       it cannot catch a `:host([variant="card"])` that never matches because
       the property was never reflected. Only a computed style can. */
    test('the row becomes a bounded surface, and the plain one does not', async () => {
      const find = await board(
        `<helix-radio id="card" variant="card" value="one">Solo</helix-radio>
         <helix-radio id="plain" value="two">Team</helix-radio>`,
      )
      expect(Number.parseFloat(edge(find('card'), 'item').borderTopWidth)).toBeGreaterThan(0)
      expect(Number.parseFloat(edge(find('plain'), 'item').borderTopWidth)).toBe(0)
    })

    test('the checkbox does the same, on its label rather than a button', async () => {
      // Different part, because the checkbox's target is the `<label>` that
      // forwards a press to the real input. Same appearance, so it has to look
      // the same beside a card set of radios.
      const find = await board(
        `<helix-checkbox id="card" variant="card" value="one">Backups</helix-checkbox>
         <helix-checkbox id="plain" value="two">Audit</helix-checkbox>`,
      )
      expect(Number.parseFloat(edge(find('card'), 'field').borderTopWidth)).toBeGreaterThan(0)
      expect(Number.parseFloat(edge(find('plain'), 'field').borderTopWidth)).toBe(0)
    })

    test('a chosen card is lifted rather than colored', async () => {
      /* This component's own rule about the dot, restated for the surface:
         color is reserved for state, and being chosen is an answer rather than
         a state. If someone reaches for an accent border here later, this is
         the decision they are changing. */
      const find = await board(
        `<helix-radio id="chosen" variant="card" selected value="one">Solo</helix-radio>
         <helix-radio id="rest" variant="card" value="two">Team</helix-radio>`,
      )
      const chosen = edge(find('chosen'), 'item')
      const rest = edge(find('rest'), 'item')

      expect(chosen.backgroundColor).not.toBe(rest.backgroundColor)
      expect(chosen.borderTopColor).not.toBe(rest.borderTopColor)
    })
  })
}
