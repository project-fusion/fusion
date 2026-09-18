import { beforeAll, describe, expect, test } from 'bun:test'
import { hasLayout, mount, part, registerDom } from '@fusion.dev/helix-testing/dom'

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

describe('the card separations', () => {
  test('reflect, because that is what the stylesheet selects on', async () => {
    for (const value of ['filled', 'outlined']) {
      expect((await radio(`separation="${value}"`)).getAttribute('separation')).toBe(value)
      expect((await checkbox(`separation="${value}"`)).getAttribute('separation')).toBe(value)
    }
  })

  test('the mark is still rendered, which is the whole point of it staying', async () => {
    /* A card whose only marker was its own border would ask a reader to compare
       surfaces across a row to find the answer, and would leave nothing at all
       for a high-contrast display. */
    for (const value of ['filled', 'outlined']) {
      expect(part(await radio(`separation="${value}"`), 'box')).toBeTruthy()
      expect(part(await checkbox(`separation="${value}"`), 'box')).toBeTruthy()
    }
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
       A static rule catches a `[part=]` naming a part nothing renders, and
       cannot catch a `:host([separation="outlined"])` that never matches
       because the property was never reflected. Only a computed style can. */
    test('the row becomes a bounded surface, and the plain one does not', async () => {
      const find = await board(
        `<helix-radio id="card" separation="outlined" value="one">Solo</helix-radio>
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
        `<helix-checkbox id="card" separation="outlined" value="one">Backups</helix-checkbox>
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
        `<helix-radio id="chosen" separation="outlined" selected value="one">Solo</helix-radio>
         <helix-radio id="rest" separation="outlined" value="two">Team</helix-radio>`,
      )
      const chosen = edge(find('chosen'), 'item')
      const rest = edge(find('rest'), 'item')

      expect(chosen.backgroundColor).not.toBe(rest.backgroundColor)
      expect(chosen.borderTopColor).not.toBe(rest.borderTopColor)
    })

    test('a filled card keeps its ground and loses its edge', async () => {
      /* The value's whole content, and the one thing a static rule cannot see:
         the border is kept and made transparent, so a set mixing the two does
         not step, and a reader tells the cards apart by their ground. */
      const find = await board(
        `<helix-radio id="filled" separation="filled" value="one">Solo</helix-radio>
         <helix-radio id="outlined" separation="outlined" value="two">Team</helix-radio>`,
      )
      const filled = edge(find('filled'), 'item')
      const outlined = edge(find('outlined'), 'item')

      expect(filled.backgroundColor).toBe(outlined.backgroundColor)
      expect(filled.borderTopWidth).toBe(outlined.borderTopWidth)
      expect(filled.borderTopColor).toBe('rgba(0, 0, 0, 0)')
      expect(outlined.borderTopColor).not.toBe('rgba(0, 0, 0, 0)')
    })

    /* Invisible to every static rule and to a one-line card: with
       `align-items: start` and a band derived from the row's own small label,
       the circle sat 2.7px above the sentence it belonged to, measured on the
       cards example, and only a card with a description shows it. Half a pixel
       of slack, the band being centered against a line box that is a token
       times a unitless leading. */
    const offBy = (host: Choice): number => {
      const box = (part(host, 'box') as HTMLElement).getBoundingClientRect()
      const line = (host.querySelector('div') as HTMLElement).getBoundingClientRect()
      return Math.abs(box.y + box.height / 2 - (line.y + line.height / 2))
    }

    const described = (id: string): string =>
      `<helix-radio id="${id}" separation="outlined" value="one"
         ><div>Solo</div><div>One seat, and everything on it.</div
       ></helix-radio>`

    test('the control centers on the first line, not on the top of the text block', async () => {
      expect(offBy((await board(described('card')))('card'))).toBeLessThan(0.5)
    })

    test('and it stays there under a page whose own leading is nothing like the card', async () => {
      /* What the restated font and leading on the box buy, and the only way to
         see them: `1lh` resolves against whatever line-height the box has, so
         an unrestated one reads the page's and the circle leaves the sentence
         the moment a consumer sets one. Both the label and the box state the
         card's line, so neither moves. */
      const find = await board(described('card'))
      const host = find('card')
      const holder = host.parentElement as HTMLElement
      holder.style.lineHeight = '4'
      holder.style.fontSize = '32px'
      await host.updateComplete

      expect(offBy(host)).toBeLessThan(0.5)
    })
  })
}
