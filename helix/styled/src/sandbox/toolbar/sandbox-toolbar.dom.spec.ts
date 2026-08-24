import { beforeAll, describe, expect, test } from 'bun:test'
import { mount, registerDom, slotted } from '@helix-io/testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

/**
 * The bar over the editor, whose whole contract is two ends and no box.
 *
 * **Thin because the component is**, which is the honest version of a part
 * spec: it renders two bare slots and nothing else, so the only things it can
 * promise are that both ends take what is put in them and that an unfilled end
 * costs nothing. Inventing more would be a spec asserting the framework.
 */
describe('the sandbox toolbar', () => {
  test('takes items at both ends, and keeps them at the end they were given', async () => {
    const host = await mount(
      `<helix-sandbox-toolbar>
        <button id="first" type="button">Files</button>
        <button id="last" slot="end" type="button">Menu</button>
      </helix-sandbox-toolbar>`,
    )
    expect(slotted(host)[0]?.id).toBe('first')
    expect(slotted(host, 'end')[0]?.id).toBe('last')
  })

  /* Both slots are bare, so an unfilled one generates no box and costs no gap.
     A wrapper around either would put a gap in a bar that has nothing at that
     end, which is the fault the bare slots exist to avoid. */
  test('costs nothing at an end nobody filled', async () => {
    const host = await mount('<helix-sandbox-toolbar></helix-sandbox-toolbar>')
    expect(slotted(host)).toHaveLength(0)
    expect(slotted(host, 'end')).toHaveLength(0)
    expect(host.shadowRoot?.querySelectorAll('slot')).toHaveLength(2)
  })
})
