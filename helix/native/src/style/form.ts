/**
 * The intermediate form as this runtime reads it: each type read-only, and
 * the major version it reads.
 */
import type * as Form from '../ir.generated.js'
import { VERSION } from '../ir.generated.js'

/**
 * A type with every field and item read-only, at any depth.
 *
 * **The form's types are generated from the compiler's structs**, in
 * `ir.generated.ts`, so this runtime holds no copy of the contract. A
 * generated type is mutable, and the runtime only reads the form, so each is
 * taken read-only here.
 */
type Frozen<T> = T extends object ? { readonly [K in keyof T]: Frozen<T[K]> } : T

/** A declaration's value, as `helix system build` writes it. */
export type Value = Frozen<Form.Value>

/** What a rule applies under. */
export type Condition = Frozen<Form.Condition>

/** A property and its value. */
export type Declaration = readonly [property: string, value: Value]

/** One rule of a family's intermediate form. */
export type Rule = Frozen<{ kind: 'rule' } & Form.Rule>

/** A named animation of a family's intermediate form. */
export type Keyframes = Frozen<{ kind: 'keyframes' } & Form.Keyframes>

/** A prop of a family's API. */
export type Prop = Frozen<Form.Prop>

/** A node of a family's part tree. */
export type Node = Frozen<Form.Node>

/** A family's intermediate form. */
export type Family = Frozen<Form.Family>

/**
 * The major version of the intermediate form this runtime reads, from the
 * version its types were generated at.
 *
 * **A form in another major is refused, never guessed at.** `helix system
 * build` writes `major.minor`. A minor adds only what this runtime may
 * ignore, and anything else is a new major.
 */
export const MAJOR = Number(VERSION.split('.')[0])

/**
 * `family`, where this runtime reads its major.
 *
 * @throws An error naming the family and both versions where it does not.
 */
export const readable = (family: Family): Family => {
  if (Number(family.version.split('.')[0]) !== MAJOR) {
    throw new Error(
      `${family.name}: the intermediate form is version ${family.version}, and this runtime reads ${MAJOR}.x`,
    )
  }
  return family
}
