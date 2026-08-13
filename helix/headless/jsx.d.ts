import type { HelixBaseCard, HelixBaseDisclosure, HelixOpenChangeEvent } from '@helix-io/headless'

/**
 * This type can be used to create scoped tags for your components.
 *
 * Usage:
 *
 * ```ts
 * import type { ScopedElements } from "path/to/library/jsx-integration";
 *
 * declare module "my-library" {
 *   namespace JSX {
 *     interface IntrinsicElements
 *       extends ScopedElements<'test-', ''> {}
 *   }
 * }
 * ```
 *
 * @deprecated Runtime scoped elements result in duplicate types and can confusing for developers. It is recommended to use the `prefix` and `suffix` options to generate new types instead.
 */
export type ScopedElements<Prefix extends string = '', Suffix extends string = ''> = {
  [Key in keyof CustomElements as `${Prefix}${Key}${Suffix}`]: CustomElements[Key]
}

/**
 * A generic type for strongly typing custom events with their targets
 * @template T - The type of the event target (extends EventTarget)
 * @template D - The type of the detail payload for the custom event
 */
type TypedEvent<T extends EventTarget, E = Event> = E & {
  target: T
}

type BaseProps<T extends HTMLElement> = {
  /** Content added between the opening and closing tags of the element */
  children?: any
  /** Used for declaratively styling one or more elements using CSS (Cascading Stylesheets) */
  class?: string
  /** Used for declaratively styling one or more elements using CSS (Cascading Stylesheets) */
  className?: string
  /** Takes an object where the key is the class name(s) and the value is a boolean expression. When true, the class is applied, and when false, it is removed. */
  classList?: Record<string, boolean | undefined>
  /** Specifies the text direction of the element. */
  dir?: 'ltr' | 'rtl'
  /** Contains a space-separated list of the part names of the element that should be exposed on the host element. */
  exportparts?: string
  /** For <label> and <output>, lets you associate the label with some control. */
  htmlFor?: string
  /** Specifies whether the element should be hidden. */
  hidden?: boolean | string
  /** A unique identifier for the element. */
  id?: string
  /** Keys tell React which array item each component corresponds to */
  key?: string | number
  /** Specifies the language of the element. */
  lang?: string
  /** Defines the element's semantic role for accessibility APIs. */
  role?: string
  /** Contains a space-separated list of the part names of the element. Part names allows CSS to select and style specific elements in a shadow tree via the ::part pseudo-element. */
  part?: string
  /** Use the ref attribute with a variable to assign a DOM element to the variable once the element is rendered. */
  ref?: T | ((e: T) => void)
  /** Adds a reference for a custom element slot */
  slot?: string
  /** Prop for setting inline styles */
  style?: Record<string, string | number>
  /** Overrides the default Tab button behavior. Avoid using values other than -1 and 0. */
  tabIndex?: number
  /** Specifies the tooltip text for the element. */
  title?: string
  /** Passing 'no' excludes the element content from being translated. */
  translate?: 'yes' | 'no'
  /** The popover global attribute is used to designate an element as a popover element. */
  popover?: 'auto' | 'hint' | 'manual'
  /** Turns an element element into a popover control button; takes the ID of the popover element to control as its value. */
  popovertarget?: 'top' | 'bottom' | 'left' | 'right' | 'auto'
  /** Specifies the action to be performed on a popover element being controlled by a control element. */
  popovertargetaction?: 'show' | 'hide' | 'toggle'
}

type BaseEvents = {
  // Mouse Events

  /** Triggered when the element is clicked by the user by mouse or keyboard. */
  onClick?: (event: MouseEvent) => void
  /** Fired when the context menu is triggered, often by right-clicking. */
  onContextMenu?: (event: MouseEvent) => void
  /** Fired when the element is double-clicked. */
  onDoubleClick?: (event: MouseEvent) => void
  /** Fired repeatedly as the draggable element is being dragged. */
  onDrag?: (event: DragEvent) => void
  /** Fired when the dragging of a draggable element is finished. */
  onDragEnd?: (event: DragEvent) => void
  /** Fired when a dragged element or text selection enters a valid drop target. */
  onDragEnter?: (event: DragEvent) => void
  /** Fired when a dragged element or text selection leaves a valid drop target. */
  onDragExit?: (event: DragEvent) => void
  /** Fired when a dragged element or text selection leaves a valid drop target. */
  onDragLeave?: (event: DragEvent) => void
  /** Fired when an element or text selection is being dragged over a valid drop target (every few hundred milliseconds). */
  onDragOver?: (event: DragEvent) => void
  /** Fired when a draggable element starts being dragged. */
  onDragStart?: (event: DragEvent) => void
  /** Fired when a dragged element is dropped onto a drop target. */
  onDrop?: (event: DragEvent) => void
  /** Fired when a mouse button is pressed down on the element. */
  onMouseDown?: (event: MouseEvent) => void
  /** Fired when the mouse cursor enters the element. */
  onMouseEnter?: (event: MouseEvent) => void
  /** Triggered when the mouse cursor leaves the element. */
  onMouseLeave?: (event: MouseEvent) => void
  /** Fired at an element when a pointing device (usually a mouse) is moved while the cursor's hotspot is inside it. */
  onMouseMove?: (event: MouseEvent) => void
  /** Fired at an Element when a pointing device (usually a mouse) is used to move the cursor so that it is no longer contained within the element or one of its children. */
  onMouseOut?: (event: MouseEvent) => void
  /** Fired at an Element when a pointing device (such as a mouse or trackpad) is used to move the cursor onto the element or one of its child elements. */
  onMouseOver?: (event: MouseEvent) => void
  /** Fired when a mouse button is released on the element. */
  onMouseUp?: (event: MouseEvent) => void

  // Keyboard Events

  /** Fired when a key is pressed down. */
  onKeyDown?: (event: KeyboardEvent) => void
  /** Fired when a key is released.. */
  onKeyUp?: (event: KeyboardEvent) => void
  /** Fired when a key is pressed down. */
  onKeyPressed?: (event: KeyboardEvent) => void

  // Focus Events

  /** Fired when the element receives focus, often triggered by tab navigation. */
  onFocus?: (event: FocusEvent) => void
  /** Fired when the element loses focus. */
  onBlur?: (event: FocusEvent) => void

  // Form Events

  /** Fired when the value of an input element changes, such as with text inputs or select elements. */
  onChange?: (event: Event) => void
  /** Fires when the value of an <input>, <select>, or <textarea> element has been changed. */
  onInput?: (event: Event) => void
  /** Fired when a form is submitted, usually on pressing Enter in a text input. */
  onSubmit?: (event: Event) => void
  /** Fired when a form is reset. */
  onReset?: (event: Event) => void

  // UI Events

  /** Fired when the content of an element is scrolled. */
  onScroll?: (event: UIEvent) => void

  // Wheel Events

  /** Fired when the mouse wheel is scrolled while the element is focused. */
  onWheel?: (event: WheelEvent) => void

  // Animation Events

  /** Fired when a CSS animation starts. */
  onAnimationStart?: (event: AnimationEvent) => void
  /** Fired when a CSS animation completes. */
  onAnimationEnd?: (event: AnimationEvent) => void
  /** Fired when a CSS animation completes one iteration. */
  onAnimationIteration?: (event: AnimationEvent) => void

  // Transition Events

  /** Fired when a CSS transition has completed. */
  onTransitionEnd?: (event: TransitionEvent) => void

  // Media Events

  /** Fired when an element (usually an image) finishes loading */
  onLoad?: (event: Event) => void
  /** Fired when an error occurs during the loading of an element, like an image not being found. */
  onError?: (event: Event) => void

  // Clipboard Events

  /** Fires when the user initiates a copy action through the browser's user interface. */
  onCopy?: (event: ClipboardEvent) => void
  /** Fired when the user has initiated a "cut" action through the browser's user interface. */
  onCut?: (event: ClipboardEvent) => void
  /** Fired when the user has initiated a "paste" action through the browser's user interface. */
  onPaste?: (event: ClipboardEvent) => void
}

export type HelixBaseCardProps = {}

export type HelixBaseCardSolidJsProps = {
  /** Set the innerHTML of the element */
  innerHTML?: string
  /** Set the textContent of the element */
  textContent?: string | number
}

/** `HelixBaseDisclosure` component event */
export type HelixBaseDisclosureElementEvent<E = Event> = TypedEvent<HelixBaseDisclosure, E>
/** `OpenChange` event type */
export type HelixBaseDisclosureOpenChangeElementEvent =
  HelixBaseDisclosureElementEvent<HelixOpenChangeEvent>

export type HelixBaseDisclosureProps = {
  /** Whether the element is open. Setting this enters controlled mode. */
  open?: HelixBaseDisclosure['open']
  /** Initial open state for uncontrolled use. Ignored once `open` is set. */
  'default-open'?: HelixBaseDisclosure['defaultOpen']
  /** Initial open state for uncontrolled use. Ignored once `open` is set. */
  defaultOpen?: HelixBaseDisclosure['defaultOpen']

  /** Fired when the disclosure opens or closes. */
  onOpenChange?: (e: HelixBaseDisclosureOpenChangeElementEvent) => void
}

export type HelixBaseDisclosureSolidJsProps = {
  /** Whether the element is open. Setting this enters controlled mode. */
  'prop:open'?: HelixBaseDisclosure['open']
  /** Initial open state for uncontrolled use. Ignored once `open` is set. */
  'bool:default-open'?: HelixBaseDisclosure['defaultOpen']
  /** Initial open state for uncontrolled use. Ignored once `open` is set. */
  'prop:defaultOpen'?: HelixBaseDisclosure['defaultOpen']
  /** Fired when the disclosure opens or closes. */
  'on:OpenChange'?: (e: HelixBaseDisclosureOpenChangeElementEvent) => void

  /** Set the innerHTML of the element */
  innerHTML?: string
  /** Set the textContent of the element */
  textContent?: string | number
}

export type CustomElements = {
  /**
   * Regions are slots rather than separate elements, because a header, body, and
   * footer carry no state, no behavior, and no API of their own. Slotting them
   * costs one custom element instead of five and lets the consumer bring their
   * own markup, so a title can be a real `<h2>` rather than an emulated one.
   *
   * Name the card with `aria-label` or `aria-labelledby`. That is the only
   * naming that survives server rendering: reading a title out of the light DOM
   * needs a DOM, and the server has none.
   *
   * ## Slots
   *
   * Areas where markup can be added to the component.
   *
   * - `header`: Title and any actions for the whole card.
   * - `(default)`: The card's main content.
   * - `footer`: Actions that conclude the card.
   *
   * ## CSS Parts
   *
   * Custom selectors for styling elements within the component.
   *
   * - `container`: The card surface.
   * - `header`: The header region.
   * - `body`: The content region.
   * - `footer`: The footer region.
   */
  'helix-base-card': Partial<HelixBaseCardProps & BaseProps<HelixBaseCard> & BaseEvents>

  /**
   * Content stays mounted when closed and is hidden by the styled tier's CSS, so
   * an open and close transition is possible and the text is present in
   * server-rendered HTML. Closed content is `inert`, keeping it out of the tab
   * order and the accessibility tree without removing it from the box tree.
   *
   * Slated to become `Accordion.Item`: a disclosure is an accordion with one
   * section, and shipping both means two implementations of one behavior.
   *
   * ## Attributes & Properties
   *
   * Component attributes and properties that can be applied to the element or by using JavaScript.
   *
   * - `open`: Whether the element is open. Setting this enters controlled mode.
   * - `default-open`/`defaultOpen`: Initial open state for uncontrolled use. Ignored once `open` is set.
   * - `isOpen`: The resolved open state, whichever mode the element is in. (property only) (readonly)
   *
   * ## Events
   *
   * Events that will be emitted by the component.
   *
   * - `OpenChange`: Fired when the disclosure opens or closes.
   *
   * ## Slots
   *
   * Areas where markup can be added to the component.
   *
   * - `summary`: The always-visible trigger content.
   * - `(default)`: The content revealed when open.
   *
   * ## Methods
   *
   * Methods that can be called to access component functionality.
   *
   * - `setOpen(next: boolean) => void`: Requests an open-state change. In uncontrolled mode the element updates
   * itself; in controlled mode it only notifies and waits for the consumer.
   *
   * ## CSS Parts
   *
   * Custom selectors for styling elements within the component.
   *
   * - `container`: The outer wrapper.
   * - `trigger`: The clickable summary row.
   * - `content`: The revealed region.
   * - `content-inner`: Padding wrapper inside the animated region.
   */
  'helix-base-disclosure': Partial<
    HelixBaseDisclosureProps & BaseProps<HelixBaseDisclosure> & BaseEvents
  >
}

export type CustomElementsSolidJs = {
  /**
   * Regions are slots rather than separate elements, because a header, body, and
   * footer carry no state, no behavior, and no API of their own. Slotting them
   * costs one custom element instead of five and lets the consumer bring their
   * own markup, so a title can be a real `<h2>` rather than an emulated one.
   *
   * Name the card with `aria-label` or `aria-labelledby`. That is the only
   * naming that survives server rendering: reading a title out of the light DOM
   * needs a DOM, and the server has none.
   *
   * ## Slots
   *
   * Areas where markup can be added to the component.
   *
   * - `header`: Title and any actions for the whole card.
   * - `(default)`: The card's main content.
   * - `footer`: Actions that conclude the card.
   *
   * ## CSS Parts
   *
   * Custom selectors for styling elements within the component.
   *
   * - `container`: The card surface.
   * - `header`: The header region.
   * - `body`: The content region.
   * - `footer`: The footer region.
   */
  'helix-base-card': Partial<
    HelixBaseCardProps & HelixBaseCardSolidJsProps & BaseProps<HelixBaseCard> & BaseEvents
  >

  /**
   * Content stays mounted when closed and is hidden by the styled tier's CSS, so
   * an open and close transition is possible and the text is present in
   * server-rendered HTML. Closed content is `inert`, keeping it out of the tab
   * order and the accessibility tree without removing it from the box tree.
   *
   * Slated to become `Accordion.Item`: a disclosure is an accordion with one
   * section, and shipping both means two implementations of one behavior.
   *
   * ## Attributes & Properties
   *
   * Component attributes and properties that can be applied to the element or by using JavaScript.
   *
   * - `open`: Whether the element is open. Setting this enters controlled mode.
   * - `default-open`/`defaultOpen`: Initial open state for uncontrolled use. Ignored once `open` is set.
   * - `isOpen`: The resolved open state, whichever mode the element is in. (property only) (readonly)
   *
   * ## Events
   *
   * Events that will be emitted by the component.
   *
   * - `OpenChange`: Fired when the disclosure opens or closes.
   *
   * ## Slots
   *
   * Areas where markup can be added to the component.
   *
   * - `summary`: The always-visible trigger content.
   * - `(default)`: The content revealed when open.
   *
   * ## Methods
   *
   * Methods that can be called to access component functionality.
   *
   * - `setOpen(next: boolean) => void`: Requests an open-state change. In uncontrolled mode the element updates
   * itself; in controlled mode it only notifies and waits for the consumer.
   *
   * ## CSS Parts
   *
   * Custom selectors for styling elements within the component.
   *
   * - `container`: The outer wrapper.
   * - `trigger`: The clickable summary row.
   * - `content`: The revealed region.
   * - `content-inner`: Padding wrapper inside the animated region.
   */
  'helix-base-disclosure': Partial<
    HelixBaseDisclosureProps &
      HelixBaseDisclosureSolidJsProps &
      BaseProps<HelixBaseDisclosure> &
      BaseEvents
  >
}

export type CustomCssProperties = {}

declare module 'react' {
  namespace JSX {
    interface IntrinsicElements extends CustomElements {}
  }
  export interface CSSProperties extends CustomCssProperties {}
}

declare module 'react/jsx-runtime' {
  namespace JSX {
    interface IntrinsicElements extends CustomElements {}
  }
  export interface CSSProperties extends CustomCssProperties {}
}

declare module 'react/jsx-dev-runtime' {
  namespace JSX {
    interface IntrinsicElements extends CustomElements {}
  }
  export interface CSSProperties extends CustomCssProperties {}
}

declare module 'preact' {
  namespace JSX {
    interface IntrinsicElements extends CustomElements {}
  }
  export interface CSSProperties extends CustomCssProperties {}
}

declare module '@builder.io/qwik' {
  namespace JSX {
    interface IntrinsicElements extends CustomElements {}
  }
  export interface CSSProperties extends CustomCssProperties {}
}

declare module '@stencil/core' {
  namespace JSX {
    interface IntrinsicElements extends CustomElements {}
  }
  export interface CSSProperties extends CustomCssProperties {}
}

declare module 'hono/jsx' {
  namespace JSX {
    interface IntrinsicElements extends CustomElements {}
  }
  export interface CSSProperties extends CustomCssProperties {}
}

declare module 'react-native' {
  namespace JSX {
    interface IntrinsicElements extends CustomElements {}
  }
  export interface CSSProperties extends CustomCssProperties {}
}

declare module 'solid-js' {
  namespace JSX {
    interface IntrinsicElements extends CustomElementsSolidJs {}
  }
  export interface CSSProperties extends CustomCssProperties {}
}

declare global {
  namespace JSX {
    interface IntrinsicElements extends CustomElements {}
  }
  export interface CSSProperties extends CustomCssProperties {}
}
