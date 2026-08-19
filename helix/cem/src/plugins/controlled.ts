import type { HelixDeclaration, HelixMember, Plugin } from '../types.js'

/** Reads the tag's comment, which the analyzer hands over as text or as parts. */
const text = (comment: unknown): string => {
  if (typeof comment === 'string') {
    return comment.trim()
  }
  if (Array.isArray(comment)) {
    return comment
      .map((part) => (part as { text?: string }).text ?? '')
      .join('')
      .trim()
  }
  return ''
}

/**
 * Records which properties are controlled, and what answers each one.
 *
 * ```ts
 * /** Whether the control is checked. @controlled helix-change *\/
 * accessor checked = false
 * ```
 *
 * **Declared, never inferred, for the reason `@event` is.** The first version
 * of `helix-controlled-props` worked this out from `inheritedFrom`, on the
 * grounds that a controlled property comes from one of the four controller
 * mixins. Eight do not: pagination's `page` and its size `value`, toast's
 * `open`, listbox's `filter`, splitter's `position` and `collapsed`,
 * carousel's `index`, date picker's `month` are each implemented in the
 * component and pass their own `label` to `requestControlledChange`. They
 * inherit from nothing, so a third of the controlled surface was unguarded
 * while every check reported success.
 *
 * There is no signal in the manifest that would have found them, and there is
 * no signal in the source either that is not a guess: `requestControlledChange`
 * is called from a private method three hundred lines from the property it
 * settles. So the property says so, `check:controlled` holds the tag and the
 * call together, and anything reading the manifest gets the answer without
 * knowing how any of it is implemented.
 *
 * The value is one or more event names, space separated. `open` names two
 * because opening and closing are separate events, and a consumer who owns the
 * state has to hear both.
 *
 * Written onto the member rather than the declaration so it survives
 * inheritance: a component's `checked` is a copy of the mixin's, and a list
 * kept beside the members would have to be merged by hand at every tier.
 */
export const controlled = (): Plugin => ({
  analyzePhase({ moduleDoc, node, ts }) {
    if (!(ts.isClassDeclaration(node) || ts.isClassExpression(node))) {
      return
    }

    const found = new Map<string, string[]>()
    for (const member of node.members) {
      if (!member.name) {
        continue
      }
      for (const tag of ts.getJSDocTags(member)) {
        if (tag.tagName.getText() !== 'controlled') {
          continue
        }
        const events = text(tag.comment).split(/\s+/).filter(Boolean)
        if (events.length > 0) {
          found.set(member.name.getText(), events)
        }
      }
    }

    if (found.size === 0) {
      return
    }

    /* Every declaration in the module carrying a member of that name, rather
       than the one matching `node.name`. A mixin's members are written on a
       class expression called `CheckedElement` and land in a declaration called
       `MixinControllerChecked`, so matching by name would annotate nothing at
       all, silently, which is the failure this tag exists to end. */
    for (const declaration of (moduleDoc.declarations ?? []) as HelixDeclaration[]) {
      for (const member of (declaration.members ?? []) as HelixMember[]) {
        const events = found.get(member.name)
        if (events) {
          member.helix = { ...member.helix, controlled: events }
        }
      }
    }
  },
  name: 'helix-controlled',
})
