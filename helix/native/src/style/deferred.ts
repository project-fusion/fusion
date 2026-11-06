/**
 * Declarations an element gives the children passed into it that read a
 * child's own private value, which each child resolves where it is drawn.
 *
 * **CSS resolves a `var()` on the element a declaration lands on**, so a
 * group's `::slotted(*)` margin that reads `--_avatar-size` reads each
 * avatar's own size. A phone resolves the rest of a slotted style at the
 * element that gives it, where that private value is not set, so these are
 * kept apart and handed to the child with what the element has already
 * worked out of them: its hooks and its own values.
 */
import type { Value } from './form.js'
import type { Resolution } from './resolved.js'

/** A declaration a child resolves in its own context. */
export type Deferred = readonly (readonly [property: string, value: Value])[]

/** Whether a private value is another element's, which CSS writes `--_name`. */
const privateName = (name: string): boolean => name.startsWith('_')

/** Whether `value` reads a private value of the element it lands on. */
export const readsPrivate = (value: Value): boolean => {
  if ('inherited' in value) {
    return privateName(value.inherited.name) || fallbackReads(value.inherited.fallback)
  }
  if ('hook' in value) {
    return fallbackReads(value.hook.fallback)
  }
  if ('own' in value) {
    return fallbackReads(value.own.fallback)
  }
  if ('calc' in value) {
    return value.calc.operands.some(readsPrivate)
  }
  if ('function' in value) {
    return value.function.arguments.some(readsPrivate)
  }
  if ('space' in value) {
    return value.space.some(readsPrivate)
  }
  if ('list' in value) {
    return value.list.some(readsPrivate)
  }
  return false
}

const fallbackReads = (fallback: Value | undefined): boolean =>
  fallback !== undefined && readsPrivate(fallback)

/** A resolution written back as a value, or `undefined` where it is neither a number nor words. */
const literal = (resolved: Resolution): Value | undefined =>
  typeof resolved === 'number'
    ? { number: resolved }
    : typeof resolved === 'string'
      ? { text: resolved }
      : undefined

/**
 * `value` with what the element giving it has worked out: a hook it sets, its
 * own private values, and what it inherits. A private value of the child's,
 * `_name`, becomes the child's own value `name`, which the child resolves.
 * Tokens stay, since a child reads the same theme.
 */
export const handedOn = (value: Value, resolve: (value: Value) => Resolution): Value => {
  const on = (inner: Value): Value => handedOn(inner, resolve)
  if ('inherited' in value) {
    const { fallback, name } = value.inherited
    if (!privateName(name)) {
      return literal(resolve(value)) ?? value
    }
    return {
      own: { name: name.slice(1), ...(fallback === undefined ? {} : { fallback: on(fallback) }) },
    }
  }
  if ('hook' in value) {
    /* Set on the element giving it, the hook is its value; unset, its fallback. */
    const { fallback, ...bare } = value.hook
    const kept = literal(resolve({ hook: bare }))
    return kept ?? (fallback === undefined ? value : on(fallback))
  }
  if ('own' in value) {
    return literal(resolve(value)) ?? value
  }
  return within(value, on)
}

/** `value` with each value it holds handed on, for one that holds several. */
const within = (value: Value, on: (inner: Value) => Value): Value => {
  if ('calc' in value) {
    return { calc: { ...value.calc, operands: value.calc.operands.map(on) } } as Value
  }
  if ('function' in value) {
    return { function: { ...value.function, arguments: value.function.arguments.map(on) } } as Value
  }
  if ('space' in value) {
    return { space: value.space.map(on) } as Value
  }
  if ('list' in value) {
    return { list: value.list.map(on) } as Value
  }
  return value
}

/**
 * Takes the declarations in `declared` that read a child's private value out,
 * and returns them as the child resolves them. What is left in `declared` is
 * resolved at the element giving it, as before.
 */
export const deferFrom = (
  declared: Map<string, Value>,
  resolve: (value: Value) => Resolution,
): Deferred => {
  const deferred: (readonly [string, Value])[] = []
  for (const [property, value] of [...declared]) {
    if (readsPrivate(value)) {
      declared.delete(property)
      deferred.push([property, handedOn(value, resolve)])
    }
  }
  return deferred
}
