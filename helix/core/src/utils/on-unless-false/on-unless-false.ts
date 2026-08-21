import type { ComplexAttributeConverter } from 'lit'

/**
 * For a boolean property that is on unless a consumer says otherwise.
 *
 * **Lit's boolean converter cannot express false, and that is the whole
 * problem.** It answers `value !== null`, so an attribute is true by being
 * there: `modal` is true, `modal=""` is true, and `modal="false"` is true as
 * well, because it is present. A property defaulting to `true` therefore has no
 * attribute that turns it off at all, and a consumer who writes the obvious
 * thing gets the opposite of what they asked for, silently.
 *
 * Found on `Drawer.modal`, where it mattered: a tour cannot point inside a
 * modal, so `modal="false"` is exactly what a consumer reaches for, and it left
 * the drawer modal. Two others have the same shape, `Video.playsInline` and the
 * sandbox source's `tabIndents`.
 *
 * So: absent is the default, present is on, and the one string that means off
 * is the one a consumer would write. `"false"` only, and not `"0"` or `"no"`,
 * because a converter that accepts a vocabulary invites a consumer to guess at
 * it, and the one they guess wrong is the one that silently means on.
 *
 * **The other answer is to invert the property, and it is worse.** `Drawer`
 * would take `modeless`, absent meaning modal, which satisfies the rule that a
 * reflected property takes no default. It also renames the thing every consumer
 * already writes, to a word nobody reaches for, so that markup can express a
 * state that is rare. The name stays and the attribute learns to say no.
 */
export const onUnlessFalse: ComplexAttributeConverter<boolean> = {
  fromAttribute: (value: string | null): boolean => value !== null && value !== 'false',
  /* Written out so it survives being reflected later. `''` rather than
     `'true'`, which is what a boolean attribute looks like everywhere else. */
  toAttribute: (value: boolean): string | null => (value ? '' : 'false'),
}
