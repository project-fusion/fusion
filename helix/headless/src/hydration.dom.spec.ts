import { beforeAll, expect, test } from 'bun:test'
import { registerDom } from '@fusion.dev/helix-testing/dom'

let mount: (html: string) => Promise<Element>
let tags: string[] = []
let definitions: { ctor: CustomElementConstructor; tag: string }[] = []

/**
 * Every element, asked what it writes onto its own host before anyone can stop
 * it.
 *
 * **A consumer's server sends exactly the markup they typed.** Helix ships no
 * declarative shadow DOM, so a server-rendered `<helix-thing label="x">` is an
 * unknown tag carrying that one attribute and nothing else. Whatever the element
 * adds to itself once it upgrades is an attribute React never rendered, and a
 * React consumer reports that as a hydration mismatch and does not patch it up.
 *
 * **This is a mount rather than a read of the source, because the source cannot
 * be read for it.** `check:reflected-defaults` guards one route to the fault,
 * Lit reflecting a property whose default is non-empty, and there are others it
 * cannot see: a `setAttribute` in `updated`, a `toggleAttribute`, a `dataset`
 * write. Every one of those produces the identical symptom from a place a
 * static pass has no reason to look. Mounting the element and asking the DOM
 * what happened is the only question that covers all of them at once.
 *
 * It also covers the mechanisms nobody has invented yet, which is the point of
 * asking the outcome rather than enumerating the causes.
 *
 * **The window is the first update**, because that is the window that matters: a
 * definition landing during module evaluation upgrades every matching element
 * synchronously, and Lit's render and `firstUpdated` follow in one microtask
 * checkpoint. React may not have reached the node yet. Anything written later,
 * in response to a reader or a measurement, is after hydration and is fine.
 *
 * `data-settled` on `HelixElement` was this fault, found four separate times as
 * four route-specific bugs and patched three times by deferring a registration
 * before anybody looked at the cause. It is an `ElementInternals.states` entry
 * now, which is not in the DOM at all. This spec is what stops the next one
 * being found the same way.
 *
 * **It was found the same way once more, on 27 Aug 2026**, and the gap was that
 * a bare mount asks only the resting state. `data-checked`, `data-open` and
 * `data-has-label` were written on the element a consumer had configured, so
 * the landing page reported a mismatch on a `default-checked` switch, a
 * `default-checked` checkbox and a `default-open` accordion item while every
 * one of them passed here. The second test below is that hole closed: it types
 * what a server would have sent and asks for the host back unchanged.
 */
beforeAll(async () => {
  registerDom()
  ;({ mount } = await import('@fusion.dev/helix-testing/dom'))
  /* Read back from the registration the barrel performs, so the list is every
     tag this package really defines rather than a list here that goes stale the
     day one is added.
     *
     * **This patched `customElements.define` around the import until 27 Aug
     * 2026, and that answers correctly only for the first importer.** A second
     * import is a module-cache hit and defines nothing, so any spec that touched
     * a component before this file ran silently shrank the list: it happened the
     * day a cross-family spec was added above this one alphabetically, and what
     * it reported was a floor count, 164 against 250, which names nothing about
     * the cause. `declaredTags` reads what the generated registration left and
     * gives the same answer whoever imported first. */
  await import('./index.js')
  const { definedTags } = await import('@fusion.dev/helix-core')
  definitions = definedTags().flatMap((tag) => {
    const ctor = customElements.get(tag)
    return ctor ? [{ ctor, tag }] : []
  })
  tags = definitions.map(({ tag }) => tag)
})

/**
 * The attributes a consumer could type on this element, one at a time.
 *
 * **A bare mount asks the resting case and only the resting case**, which is
 * the half that was already guarded and the half that was already right. What
 * it cannot see is the element a consumer asked for something: `data-checked`
 * was written only on a box that was checked, so every one of these tags passed
 * the test below while the showcase on the landing page reported three of them.
 *
 * Read off Lit's own `elementProperties` rather than listed here, so an element
 * that gains one is covered the day it does. Booleans, because a value would
 * have to be invented and a wrong one is a different test, and `label` beside
 * them for the one state that comes from a slot rather than a property:
 * `Checkbox` asks `assignedNodes` and used to write `data-has-label` on the
 * answer, which no server could ever have sent.
 *
 * One at a time rather than all at once, so a failure names the attribute that
 * caused it and no two of them can combine into a case a consumer would not
 * write. The whole sweep is around four hundred mounts and takes half a second.
 */
const declared = (ctor: CustomElementConstructor): string[] => {
  const properties = (
    ctor as unknown as {
      elementProperties?: Map<PropertyKey, { attribute?: boolean | string; type?: unknown }>
    }
  ).elementProperties
  const names: string[] = []
  for (const [key, declaration] of properties ?? []) {
    if (declaration.attribute === false) {
      continue
    }
    const attribute =
      typeof declaration.attribute === 'string' ? declaration.attribute : String(key).toLowerCase()
    if (attribute === 'label') {
      names.push('label="Label"')
    } else if (declaration.type === Boolean) {
      names.push(attribute)
    }
  }
  return names.sort()
}

const KNOWN = new Set<string>()

test('no element writes to its own host before hydration could have reached it', async () => {
  const offenders: string[] = []
  let mounted = 0

  for (const tag of tags) {
    let host: (Element & { updateComplete?: Promise<unknown> }) | undefined
    try {
      host = (await mount(`<${tag}></${tag}>`)) as Element & { updateComplete?: Promise<unknown> }
      await host.updateComplete
    } catch {
      /* An element that cannot stand alone is not a case a consumer can hit
         either: a part with no parent throws here and is unreachable there. */
      continue
    }
    mounted += 1
    const added = host.getAttributeNames().sort()
    if (added.length > 0 && !KNOWN.has(tag)) {
      offenders.push(
        `${tag} added ${added.map((name) => `${name}="${host?.getAttribute(name)}"`).join(' ')}`,
      )
    }
  }

  /* A floor rather than an exact count, so adding a family does not fail this,
     and high enough that a barrel which failed to load cannot pass it. */
  expect(mounted).toBeGreaterThan(90)
  expect(offenders).toEqual([])
})

test('no element writes to its own host when a consumer asks for a state', async () => {
  /* The same question as above, of the element a consumer configured.
     `default-checked`, `default-open` and a `label` are what a server sends, and
     what came back was that plus `data-checked`, `data-open` and
     `data-has-label`, each written on the first update. All three are
     `ElementInternals.states` entries now, which is not in the DOM, and this is
     what says so for every family at once rather than for the three that
     happened to be on a page somebody loaded.

     **What it still cannot see is a write a parent makes**, which is 302: a
     listbox choosing a row puts `selected` onto the row, and no mount of one
     element alone produces that. Every solo case is covered here. */
  const offenders: string[] = []
  let asked = 0

  for (const { ctor, tag } of definitions) {
    for (const typed of declared(ctor)) {
      const attribute = typed.split('=')[0] as string
      let host: (Element & { updateComplete?: Promise<unknown> }) | undefined
      try {
        host = (await mount(`<${tag} ${typed}></${tag}>`)) as Element & {
          updateComplete?: Promise<unknown>
        }
        await host.updateComplete
      } catch {
        /* Unreachable for a consumer too, per the bare mount above. */
        continue
      }
      asked += 1
      const found = host.getAttributeNames().sort()
      if (found.join(' ') !== attribute && !KNOWN.has(tag)) {
        offenders.push(`${tag} was served ${attribute} and holds ${found.join(' ')}`)
      }
    }
  }

  /* A floor for the same reason as the bare mount's, and a higher one: this
     counts an element once per attribute it declares rather than once. 261 when
     it was written. */
  expect(asked).toBeGreaterThan(250)
  expect(offenders).toEqual([])
})

test('every named entry still offends, so the list cannot outlive the work', async () => {
  /* The other half of a named list, and the half usually missing: a component
     fixed while its name stays behind means the next regression is waved through
     under a name nobody rechecked. Vacuously true while `KNOWN` is empty, which
     is the point at which it costs nothing and is ready for the next entry. */
  const stillWriting: string[] = []
  for (const tag of KNOWN) {
    const host = (await mount(`<${tag}></${tag}>`)) as Element & {
      updateComplete: Promise<unknown>
    }
    await host.updateComplete
    if (host.getAttributeNames().length > 0) {
      stillWriting.push(tag)
    }
  }
  expect(stillWriting.sort()).toEqual([...KNOWN].sort())
})
