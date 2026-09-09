import { beforeAll, describe, expect, test } from 'bun:test'
import { hasLayout, mount, part, registerDom } from '@fusion.dev/helix-testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
  await import('../../button/index.js')
})

/**
 * Registers a test only where there is layout to measure.
 *
 * Registration-time rather than `test.skipIf`, which the browser harness does
 * not have. `Tree`'s geometry block records why.
 */
const geometry = hasLayout() ? test : (): void => {}

/** A trigger at the start and a token beside it, which is the usual filter row. */
const row = `
  <helix-filter-input label="Filter rows" placeholder="Add a filter">
    <helix-button emphasis="ghost" slot="start">Filter</helix-button>
    <helix-filter-chip label="Disposition" name="disposition" slot="tags">refunded</helix-filter-chip>
  </helix-filter-input>`

const box = (element: Element | null): DOMRect => (element as HTMLElement).getBoundingClientRect()

/* Only a browser can say this. The trigger is a `Button`, whose height is the
   control size unless a container that has already sized its own row says
   otherwise, and the field is such a container: a wrapping box of tokens at
   `sm`. Left alone the trigger measured 40 against chips of 32 and carried
   `space-control` either side against their `xs`, so the row read as a control
   with tokens stuck to it. Nothing in the manifest or the markup says that, and
   this family's only photograph is `preview`, which slots nothing at either
   end. */
describe('what sits at either end of the field', () => {
  geometry('a slotted control is the height of the tokens beside it', async () => {
    const filter = await mount(row)
    const trigger = filter.querySelector('helix-button')
    const chip = filter.querySelector('helix-filter-chip')
    expect(box(trigger).height).toBe(box(chip).height)
  })

  geometry('and their tops line up, so the row has one baseline', async () => {
    const filter = await mount(row)
    expect(box(filter.querySelector('helix-button')).top).toBe(
      box(filter.querySelector('helix-filter-chip')).top,
    )
  })

  geometry('the control does not make the field taller than its tokens do', async () => {
    const filter = await mount(row)
    const field = box(part(filter, 'field'))
    const chip = box(filter.querySelector('helix-filter-chip'))
    /* The field is the tokens plus `2xs` above and below plus its own hairline,
       and a control at either end has to fit inside that rather than set it. */
    expect(field.height).toBeLessThan(chip.height + 12)
  })

  /* Reached through the `<slot>` rather than by `::slotted()`, which matches an
     assigned node and never anything inside it: the trigger a consumer writes
     usually sits inside a `FilterMenu`, one level further in than any selector
     here can go. */
  geometry('and a trigger nested inside the picker is sized the same way', async () => {
    const filter = await mount(`
      <helix-filter-input label="Filter rows">
        <helix-filter-menu label="Filter" slot="start">
          <helix-button emphasis="ghost" slot="trigger">Filter</helix-button>
          <helix-filter-field label="Disposition" name="disposition"></helix-filter-field>
        </helix-filter-menu>
        <helix-filter-chip label="Disposition" name="disposition" slot="tags">refunded</helix-filter-chip>
      </helix-filter-input>`)
    const trigger = filter.querySelector('helix-filter-menu helix-button')
    const chip = filter.querySelector('helix-filter-chip')
    expect(box(trigger).height).toBe(box(chip).height)
  })
})
