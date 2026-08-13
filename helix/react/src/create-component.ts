import {
  createElement,
  type ForwardRefExoticComponent,
  forwardRef,
  type PropsWithoutRef,
  type ReactNode,
  type RefAttributes,
  useEffect,
  useLayoutEffect,
  useRef,
} from 'react'

/**
 * `useLayoutEffect` warns during SSR because it cannot run there. Properties
 * and listeners only matter once there is a DOM, so fall back to `useEffect`
 * on the server, where neither branch executes anyway.
 */
const useIsomorphicLayoutEffect = typeof document === 'undefined' ? useEffect : useLayoutEffect

export interface ComponentDefinition {
  /**
   * Custom event names the element dispatches, mapped to their React prop.
   * `{ 'open-change': 'onOpenChange' }`.
   */
  events: Record<string, string>
  /**
   * Property names that must be assigned to the element rather than set as
   * attributes.
   */
  properties: readonly string[]
  tagName: string
}

export interface BaseProps {
  children?: ReactNode
  className?: string
  id?: string
  slot?: string
  style?: Record<string, string | number>
}

/**
 * Wraps a custom element as a React component.
 *
 * Two things React does not do for custom elements, and this does:
 *
 * **Custom events.** React only knows how to bind its own synthetic event
 * names. `open-change` is not one, so `onOpenChange` is attached with
 * `addEventListener` directly and the detail is passed through, which is what
 * makes the callback receive `{ open: true }` rather than a raw Event.
 *
 * **Non-attribute properties.** Attributes stringify. An object or array
 * crossing the boundary as an attribute arrives as `[object Object]`, so
 * anything in `properties` is assigned to the element instead. Booleans go the
 * same route so `false` removes rather than setting `"false"`, which is truthy
 * as an attribute.
 */
export const createComponent = <Props extends BaseProps>({
  events,
  properties,
  tagName,
}: ComponentDefinition): ForwardRefExoticComponent<
  PropsWithoutRef<Props> & RefAttributes<HTMLElement>
> => {
  const propertySet = new Set(properties)

  const Component = forwardRef<HTMLElement, Props>((props, forwardedRef) => {
    const elementRef = useRef<HTMLElement | null>(null)
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
            ;(handler as (detail: unknown, event: Event) => void)(
              (event as CustomEvent).detail,
              event,
            )
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
      // Event handlers and element properties are wired in the effects above.
      if (propertySet.has(key) || Object.values(events).includes(key)) {
        continue
      }
      attributes[key] = value
    }

    attributes.ref = (node: HTMLElement | null) => {
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
  return Component as ForwardRefExoticComponent<PropsWithoutRef<Props> & RefAttributes<HTMLElement>>
}
