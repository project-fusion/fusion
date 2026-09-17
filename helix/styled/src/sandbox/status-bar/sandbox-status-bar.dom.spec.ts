import { beforeAll, describe, expect, test } from 'bun:test'
import { mount, part, registerDom, slotted } from '@fusion.dev/helix-testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

const bar = async (attributes = ''): Promise<HTMLElement> =>
  await mount(`<helix-sandbox-status-bar ${attributes}></helix-sandbox-status-bar>`)

/**
 * The bar under the editor, and the two readouts that are its own.
 *
 * **Absence is the contract here rather than a default**, which is the whole of
 * what makes this element worth its own spec: a bar with no cursor to report
 * draws no cursor readout, where a component that showed `Ln 0, Col 0` would be
 * reporting a position nothing is at. The same for the language.
 */
describe('the sandbox status bar', () => {
  test('reports a position only when it has both halves of one', async () => {
    expect(part(await bar(), 'caret')).toBeNull()
    expect(part(await bar('line="3"'), 'caret')).toBeNull()
    expect(part(await bar('column="7"'), 'caret')).toBeNull()
    expect(part(await bar('line="3" column="7"'), 'caret')?.textContent).toBe('Ln 3, Col 7')
  })

  /* One-based, because an editor's gutter is and a reader comparing the two
     should not have to add one. */
  test('counts from one, the way the gutter beside it does', async () => {
    const host = await bar('line="1" column="1"')
    expect(part(host, 'caret')?.textContent).toBe('Ln 1, Col 1')
  })

  /* A known language gets the name people write, and an unknown one is passed
     through rather than dropped: a bar that silently shows nothing for a
     language the editor is genuinely in would be lying about the file. */
  test('names a language it knows, and passes through one it does not', async () => {
    expect(part(await bar('language="tsx"'), 'language')?.textContent).toBe('TSX')
    expect(part(await bar('language="css"'), 'language')?.textContent).toBe('CSS')
    expect(part(await bar('language="rust"'), 'language')?.textContent).toBe('rust')
    expect(part(await bar(), 'language')).toBeNull()
  })

  /* And a name the map inherits is not a name the map has. `LABELS[language]`
     reached `Object.prototype`, so every inherited key came back truthy and the
     fallback never fired: the bar painted the whole source of `Object` where
     the word should have been passed through unchanged. `language` is any
     string a consumer writes, not a union, so this is ordinary input. */
  test('and a language named after something every object has is still passed through', async () => {
    expect(part(await bar('language="constructor"'), 'language')?.textContent).toBe('constructor')
    expect(part(await bar('language="toString"'), 'language')?.textContent).toBe('toString')
  })

  /* Two slots, and the readouts sit between them: what a consumer puts at the
     start stays at the start and what they put at the end stays after the
     readouts, which is the arrangement the bar exists to provide. */
  test("keeps a consumer's items on either side of its readouts", async () => {
    const host = await mount(
      `<helix-sandbox-status-bar line="2" column="4" language="html">
        <span id="first">left</span>
        <span id="last" slot="end">right</span>
      </helix-sandbox-status-bar>`,
    )
    expect(slotted(host)[0]?.id).toBe('first')
    expect(slotted(host, 'end')[0]?.id).toBe('last')
    expect(part(host, 'caret')).not.toBeNull()
    expect(part(host, 'language')?.textContent).toBe('HTML')
  })
})
