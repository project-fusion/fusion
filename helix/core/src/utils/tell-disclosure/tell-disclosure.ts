import { reportRuntime } from '../report-runtime/report-runtime.js'

/** Triggers already told they cannot carry the state, so it is said once. */
const warned = new WeakSet<Element>()

/**
 * Tells a slotted trigger that it opens something, whether it is open, and,
 * where `popup` names it, what kind of thing it opens.
 *
 * **Writing `aria-expanded` onto the consumer's element is a hydration
 * mismatch, so it is not written.** The gap that answer was reaching for is
 * real: a consumer who has to mirror `open` back onto their own trigger is a
 * consumer who will forget, and the failure is silent to everyone who can see
 * the screen. It is still the wrong answer, because a component decorating a
 * consumer's markup after upgrading is one whose output a React consumer's
 * hydration disagrees with.
 *
 * **Measured 28 Aug 2026 against React 19.2.8.** Four
 * families were server-rendered as React emits them and hydrated with the
 * element definitions loaded either side of `hydrateRoot`:
 *
 * ```
 * case        writes to trigger   hydration mismatch
 * megamenu    aria-expanded       yes, both load orders
 * speed dial  aria-expanded       yes, both load orders
 * popover     nothing             no
 * menu        nothing             no
 * ```
 *
 * The popover row holds for the first render. Since then Popover writes
 * `aria-expanded` onto a plain `<button>` trigger from the reader's first
 * press on, after hydration, and calls this only for a Helix trigger.
 *
 * React reports "some attributes of the server rendered HTML didn't match the
 * client properties. This won't be patched up", and the cost is not the console
 * line: it answers a mismatch by discarding the server's HTML for that subtree
 * and rebuilding it, which is what the carousel's own note records blinding an
 * `<helix-aura>` two sections away.
 *
 * **A property crosses the gap that an attribute cannot.** React diffs the
 * attributes it rendered and never looks at a property, so the state reaches
 * the trigger, lands as `aria-expanded` inside *that element's* shadow root,
 * and the consumer's markup is exactly what they served. Both positions get
 * what they were protecting: nothing is written onto the consumer's element,
 * and the reader is still told what the control does.
 *
 * **Set before upgrade is safe**, which is what lets this run without waiting
 * for a definition: `ReactiveElement` captures an instance property assigned
 * before it upgrades and re-applies it, so a trigger whose module has not
 * loaded yet still ends up with the value.
 *
 * **A plain element is warned about rather than written to.** A
 * `<button slot="trigger">` has no shadow root to keep the state out of the
 * markup and no property to take it, and a consumer cannot mirror it themselves
 * because the open state belongs to the component. Saying so once is the same
 * answer `Tooltip` gives about the link it will not write for them, and not at
 * all to a trigger that already carries `aria-expanded`, which is a consumer
 * mirroring the state from the component's `toggle` event.
 */
export const tellDisclosure = (
  trigger: Element | null | undefined,
  open: boolean,
  popup?: 'dialog' | 'grid' | 'listbox' | 'menu' | 'tree',
): void => {
  if (!trigger) {
    return
  }
  /* A custom element, which is the only kind that can hold this without putting
     it in the markup. The tag is the test rather than `'expanded' in trigger`,
     because the trigger may not have upgraded yet and the property lives on the
     prototype: asking too early would fall through to the warning for an
     element that is about to be perfectly capable. */
  if (trigger.localName.includes('-')) {
    ;(trigger as unknown as Record<string, unknown>).expanded = open
    /* What it opens, where that is one of the kinds a reader names: a menu
       button is announced as one, and a disclosure is announced by its state. */
    if (popup) {
      ;(trigger as unknown as Record<string, unknown>).popup = popup
    }
    return
  }
  /* A consumer who took the warning's advice has already said it, and a
     warning that fires either way cannot tell them they have. */
  if (warned.has(trigger) || trigger.hasAttribute('aria-expanded')) {
    return
  }
  warned.add(trigger)
  reportRuntime({
    kind: 'untold-trigger',
    message:
      `<${trigger.localName}> is slotted as a trigger and cannot be told that it opens something. ` +
      'The state would have to be written onto your markup as `aria-expanded`, which a React ' +
      "consumer's hydration reports and does not patch up, so it is not written. Slot a " +
      '`helix-button` or `helix-icon-button`, which carry it inside their own shadow root, or ' +
      'add `aria-haspopup` and your own `aria-expanded` to this element.',
    tag: trigger.localName,
  })
}
