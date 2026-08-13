'use client'

import {
  createElement,
  type ForwardRefExoticComponent,
  forwardRef,
  type HTMLAttributes,
  type PropsWithoutRef,
  type RefAttributes,
  useEffect,
  useLayoutEffect,
  useRef,
} from 'react'

/**
 * `useLayoutEffect` warns during SSR because it cannot run there. Properties
 * and listeners only matter once there is a DOM, so fall back to `useEffect` on
 * the server, where neither branch executes anyway.
 */
const useIsomorphicLayoutEffect = typeof document === 'undefined' ? useEffect : useLayoutEffect

export interface ComponentDefinition {
  /**
   * Custom event names the element dispatches, mapped to their React prop.
   * `{ OpenChange: 'onOpenChange' }`.
   */
  events: Record<string, string>

  /**
   * Property names that must be assigned to the element rather than set as an
   * attribute.
   */
  properties: readonly string[]

  tagName: string
}

/**
 * Props every wrapper accepts.
 *
 * Extends React's HTML attributes, so standard handlers and attributes work and
 * typecheck: `onClick`, `onFocus`, `className`, `style`, `id`, `slot`, ARIA and
 * `data-*`. They reach the element through React's own event system, which is
 * exactly why Helix event names carry a prefix: an unprefixed `onInput` would
 * bind React's synthetic listener rather than the component's event.
 */
export interface BaseProps extends HTMLAttributes<HTMLElement> {}

/**
 * Wraps a custom element as a React component.
 *
 * Two things React does not do for custom elements, and this does:
 *
 * **Custom events.** React binds only event names it recognizes.
 * `OpenChange` is not one, so `onOpenChange` is attached with
 * `addEventListener` and the callback receives the event itself, typed as the
 * component's own `CustomEvent` subclass, so `event.detail` is typed.
 *
 * **Non-attribute properties.** Attributes stringify, so an object crossing the
 * boundary as an attribute arrives as `[object Object]`. Anything in
 * `properties` is assigned to the element instead. Booleans go the same route,
 * because `false` as an attribute is the string `"false"`, which is truthy.
 *
 * The `Element` type parameter is what makes `ref` useful: a component with
 * imperative methods is unreachable through a ref typed as a bare
 * `HTMLElement`.
 */
export const createComponent = <Element extends HTMLElement, Props extends BaseProps>({
  events,
  properties,
  tagName,
}: ComponentDefinition): ForwardRefExoticComponent<
  PropsWithoutRef<Props> & RefAttributes<Element>
> => {
  const propertySet = new Set(properties)
  const handlerNames = new Set(Object.values(events))

  const Component = forwardRef<Element, Props>((props, forwardedRef) => {
    const elementRef = useRef<Element | null>(null)
    // Held in a ref so re-renders do not detach and reattach every listener,
    // which would drop events fired between the two.
    const handlers = useRef<Record<string, unknown>>({})
    handlers.current = props as unknown as Record<string, unknown>

    useIsomorphicLayoutEffect(() => {
      const element = elementRef.current
      if (!element) {
        return
      }

      const listeners = Object.entries(events).map(([eventName, propName]) => {
        const listener = (event: Event): void => {
          const handler = handlers.current[propName]
          if (typeof handler === 'function') {
            ;(handler as (event: Event) => void)(event)
          }
        }
        element.addEventListener(eventName, listener)
        return { eventName, listener }
      })

      return () => {
        for (const { eventName, listener } of listeners) {
          element.removeEventListener(eventName, listener)
        }
      }
    }, [])

    useIsomorphicLayoutEffect(() => {
      const element = elementRef.current
      if (!element) {
        return
      }
      for (const name of propertySet) {
        const value = (props as Record<string, unknown>)[name]
        if (value !== undefined) {
          ;(element as unknown as Record<string, unknown>)[name] = value
        }
      }
    })

    const attributes: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(props)) {
      // Element properties and Helix event handlers are wired in the effects
      // above. Everything else, including React's own `onClick` and
      // `className`, passes through to React untouched.
      if (propertySet.has(key) || handlerNames.has(key)) {
        continue
      }
      attributes[key] = value
    }

    attributes.ref = (node: Element | null) => {
      elementRef.current = node
      if (typeof forwardedRef === 'function') {
        forwardedRef(node)
      } else if (forwardedRef) {
        forwardedRef.current = node
      }
    }

    return createElement(tagName, attributes, props.children)
  })

  Component.displayName = tagName
  return Component as ForwardRefExoticComponent<PropsWithoutRef<Props> & RefAttributes<Element>>
}
