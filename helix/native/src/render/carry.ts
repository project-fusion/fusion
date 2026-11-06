/**
 * The contexts a layer carries from where its element is drawn to the layer
 * host, where React would otherwise lose them: the theme and the sets an
 * element offers what it holds.
 *
 * **A layer is drawn in the host `HelixRoot` draws**, outside the element
 * that opens it, so a context provided around the element does not reach
 * what the layer holds. Without the theme, a popover in a dark part of the
 * app drew in the app's own mode, and without its set, a menu's items could
 * not join their menu. Each module that provides such a context names it
 * here once, as it makes it, and a layer provides each again inside the host
 * with the value it had where the element is drawn.
 *
 * **The toolbar's contexts are not carried**: a dialog or a menu opened from a
 * toolbar is in no toolbar, as on the web, and the host gives none.
 */
import { type Context, createElement, type ReactNode, use } from 'react'

/** Each context a layer carries, in the order modules named them. */
const carried: Context<unknown>[] = []

/** Names a context a layer carries into the host, once. */
export const carryIntoLayers = <Value>(context: Context<Value>): void => {
  const named = context as Context<unknown>
  if (!carried.includes(named)) {
    carried.push(named)
  }
}

/** A context and the value it has where a layer's element is drawn. */
export type Carried = readonly (readonly [Context<unknown>, unknown])[]

/**
 * The value of each carried context where it is read. `use` reads a context
 * in a loop, so a context named after the layer first drew is read too.
 */
export const useCarried = (): Carried => carried.map((context) => [context, use(context)])

/** `content` inside a provider of each carried context, with the value it had. */
export const provideCarried = (values: Carried, content: ReactNode): ReactNode =>
  values.reduceRight<ReactNode>(
    (inner, [context, value]) => createElement(context.Provider, { value }, inner),
    content,
  )
