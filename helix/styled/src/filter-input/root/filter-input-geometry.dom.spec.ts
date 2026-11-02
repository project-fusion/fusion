import '@fusion.dev/helix-testing/dom/register'
import { beforeAll, describe, expect, test } from 'bun:test'
import { hasLayout, mount, part, registerDom } from '@fusion.dev/helix-testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
  await import('../menu/index.js')
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
   otherwise, and the field is such a container: a wrapping box of tokens. Left
   alone the trigger measured 40 against tokens of 28 and carried `space-control`
   either side against their `xs`, so the row read as a control with tokens stuck
   to it. Nothing in the manifest or the markup says that, and this family's only
   photograph is `preview`, which slots nothing at either end. */
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

  geometry('the control does not make the field any taller than it already is', async () => {
    /* Said as a comparison rather than against a number, which is what it means:
       a control at either end has to fit inside the box the field already keeps
       for its tokens rather than set the height itself. Written as `chip + 12`
       it was really a bound on the token size, and it went red the day the
       tokens changed while the thing it guards was still true. */
    const withControl = box(part(await mount(row), 'field')).height
    const withoutControl = box(
      part(
        await mount(`
          <helix-filter-input label="Filter rows" placeholder="Add a filter">
            <helix-filter-chip label="Disposition" name="disposition" slot="tags">refunded</helix-filter-chip>
          </helix-filter-input>`),
        'field',
      ),
    ).height
    expect(withControl).toBe(withoutControl)
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

/* Measured from the seam with a lead, and from the inside of the border without
   one. The row's gap alone left the text 4 from the seam against that 12. */
describe('what follows the lead', () => {
  const lead = '<helix-button emphasis="ghost" slot="start">Filter</helix-button>'
  const chip = (name: string): string =>
    `<helix-filter-chip label="${name}" name="${name}" slot="tags">A value</helix-filter-chip>`
  const fromField = (filter: Element, element: Element | null): number => {
    const field = part(filter, 'field') as HTMLElement
    return box(element).left - box(field).left - field.clientLeft
  }
  const fromSeam = (filter: Element, element: Element | null): number =>
    box(element).left - box(part(filter, 'lead')).right

  /* Each is read before the next mounts, which takes the last one off the page. */
  const bareStart = async (): Promise<number> => {
    const bare = await mount('<helix-filter-input label="Filter rows"></helix-filter-input>')
    return fromField(bare, part(bare, 'control'))
  }

  geometry('text starts as far from the seam as it does from a bare field', async () => {
    const led = await mount(`<helix-filter-input label="Filter rows">${lead}</helix-filter-input>`)
    const start = fromSeam(led, part(led, 'control'))
    expect(start).toBe(await bareStart())
  })

  geometry('a chip takes the same start', async () => {
    const led = await mount(
      `<helix-filter-input label="Filter rows">${lead}${chip('one')}</helix-filter-input>`,
    )
    const start = fromSeam(led, led.querySelector('helix-filter-chip'))
    expect(start).toBe(await bareStart())
  })

  geometry('a later line starts at the padding of the field', async () => {
    const led = await mount(
      `<div style="inline-size: 240px"><helix-filter-input label="Filter rows">${lead}${chip('one')}${chip('two')}${chip('three')}</helix-filter-input></div>`,
    )
    const filter = led.querySelector('helix-filter-input') as Element
    const chips = [...filter.querySelectorAll('helix-filter-chip')]
    const [first] = chips
    const later = chips.find((one) => box(one).top > box(first ?? null).top)
    expect(later).toBeDefined()
    const start = fromField(filter, later ?? null)
    expect(start).toBe(await bareStart())
  })
})
