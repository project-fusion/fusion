import type {
  HelixCard,
  HelixCardBody,
  HelixCardFooter,
  HelixCardHeader,
  HelixCardTitle,
  HelixDisclosure,
} from '@helix-io/web'

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

/** `HelixDisclosure` component event */
export type HelixDisclosureElementEvent<E = Event> = TypedEvent<HelixDisclosure, E>
/** `helix-open-change` event type */
export type HelixDisclosureHelixOpenChangeElementEvent =
  HelixDisclosureElementEvent<HelixOpenChangeEvent>

export type HelixDisclosureProps = {
  /** Visual weight of the disclosure. */
  appearance?: HelixDisclosure['appearance']
  /** Reduces the vertical padding for dense layouts. */
  dense?: HelixDisclosure['dense']
  /** Whether the element is open. Setting this enters controlled mode. */
  open?: HelixDisclosure['open']
  /** Initial open state for uncontrolled use. Ignored once `open` is set. */
  'default-open'?: HelixDisclosure['defaultOpen']
  /** Initial open state for uncontrolled use. Ignored once `open` is set. */
  defaultOpen?: HelixDisclosure['defaultOpen']

  /** Fired when the disclosure opens or closes. */
  'onhelix-open-change'?: (e: HelixDisclosureHelixOpenChangeElementEvent) => void
}

export type HelixDisclosureSolidJsProps = {
  /** Visual weight of the disclosure. */
  'prop:appearance'?: HelixDisclosure['appearance']
  /** Reduces the vertical padding for dense layouts. */
  'prop:dense'?: HelixDisclosure['dense']
  /** Whether the element is open. Setting this enters controlled mode. */
  'prop:open'?: HelixDisclosure['open']
  /** Initial open state for uncontrolled use. Ignored once `open` is set. */
  'bool:default-open'?: HelixDisclosure['defaultOpen']
  /** Initial open state for uncontrolled use. Ignored once `open` is set. */
  'prop:defaultOpen'?: HelixDisclosure['defaultOpen']
  /** Fired when the disclosure opens or closes. */
  'on:helix-open-change'?: (e: HelixDisclosureHelixOpenChangeElementEvent) => void

  /** Set the innerHTML of the element */
  innerHTML?: string
  /** Set the textContent of the element */
  textContent?: string | number
}

export type HelixCardFooterProps = {}

export type HelixCardFooterSolidJsProps = {
  /** Set the innerHTML of the element */
  innerHTML?: string
  /** Set the textContent of the element */
  textContent?: string | number
}

export type HelixCardBodyProps = {}

export type HelixCardBodySolidJsProps = {
  /** Set the innerHTML of the element */
  innerHTML?: string
  /** Set the textContent of the element */
  textContent?: string | number
}

export type HelixCardTitleProps = {
  /** Heading level, 1 through 6. */
  level?: HelixCardTitle['level']
}

export type HelixCardTitleSolidJsProps = {
  /** Heading level, 1 through 6. */
  'prop:level'?: HelixCardTitle['level']

  /** Set the innerHTML of the element */
  innerHTML?: string
  /** Set the textContent of the element */
  textContent?: string | number
}

export type HelixCardHeaderProps = {}

export type HelixCardHeaderSolidJsProps = {
  /** Set the innerHTML of the element */
  innerHTML?: string
  /** Set the textContent of the element */
  textContent?: string | number
}

export type HelixCardProps = {
  /** How the card separates itself from the page.

`outlined` is the default because a hairline is denser than a shadow,
scales better, and needs no tuning per color scheme. `elevated` is for a
card that genuinely floats above the content behind it. */
  appearance?: HelixCard['appearance']
  /** Tightens the inset for dense layouts. */
  dense?: HelixCard['dense']
}

export type HelixCardSolidJsProps = {
  /** How the card separates itself from the page.

`outlined` is the default because a hairline is denser than a shadow,
scales better, and needs no tuning per color scheme. `elevated` is for a
card that genuinely floats above the content behind it. */
  'prop:appearance'?: HelixCard['appearance']
  /** Tightens the inset for dense layouts. */
  'prop:dense'?: HelixCard['dense']

  /** Set the innerHTML of the element */
  innerHTML?: string
  /** Set the textContent of the element */
  textContent?: string | number
}

export type CustomElements = {
  /**
   * The content region animates between collapsed and expanded by transitioning a
   * grid row, which is the only technique that reaches the content's intrinsic
   * height without measuring it in JavaScript.
   *
   * ## Attributes & Properties
   *
   * Component attributes and properties that can be applied to the element or by using JavaScript.
   *
   * - `appearance`: Visual weight of the disclosure.
   * - `dense`: Reduces the vertical padding for dense layouts.
   * - `open`: Whether the element is open. Setting this enters controlled mode.
   * - `default-open`/`defaultOpen`: Initial open state for uncontrolled use. Ignored once `open` is set.
   * - `isOpen`: The resolved open state, whichever mode the element is in. (property only) (readonly)
   *
   * ## Events
   *
   * Events that will be emitted by the component.
   *
   * - `helix-open-change`: Fired when the disclosure opens or closes.
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
   * ## CSS Custom Properties
   *
   * CSS variables available for styling the component.
   *
   * - `--disclosure-background-color`: Surface behind the disclosure. (default: `undefined`)
   * - `--disclosure-border-color`: Border color of the container. (default: `undefined`)
   * - `--disclosure-padding`: Inner padding of trigger and content. (default: `undefined`)
   *
   * ## CSS Parts
   *
   * Custom selectors for styling elements within the component.
   *
   * - `container`: The outer wrapper.
   * - `trigger`: The clickable summary row.
   * - `content`: The revealed region. Animates open and closed.
   * - `content-inner`: Padding wrapper inside the animated region.
   */
  'helix-disclosure': Partial<HelixDisclosureProps & BaseProps<HelixDisclosure> & BaseEvents>

  /**
   * Aligns its content to the end, so buttons sit where a user expects to finish.
   *
   * ## Slots
   *
   * Areas where markup can be added to the component.
   *
   * - `(default)`: Actions, typically buttons.
   *
   * ## CSS Custom Properties
   *
   * CSS variables available for styling the component.
   *
   * - `--card-padding`: Inset, inherited from the card unless overridden. (default: `undefined`)
   *
   * ## CSS Parts
   *
   * Custom selectors for styling elements within the component.
   *
   * - `container`: The region.
   */
  'helix-card-footer': Partial<HelixCardFooterProps & BaseProps<HelixCardFooter> & BaseEvents>

  /**
   * Carries the card's inset and muted foreground so content does not need to restate either.
   *
   * ## Slots
   *
   * Areas where markup can be added to the component.
   *
   * - `(default)`: The card's content.
   *
   * ## CSS Custom Properties
   *
   * CSS variables available for styling the component.
   *
   * - `--card-padding`: Inset, inherited from the card unless overridden. (default: `undefined`)
   *
   * ## CSS Parts
   *
   * Custom selectors for styling elements within the component.
   *
   * - `container`: The region.
   */
  'helix-card-body': Partial<HelixCardBodyProps & BaseProps<HelixCardBody> & BaseEvents>

  /**
   * Renders as a heading whose level the consumer sets, because the correct level
   * depends on the surrounding document.
   *
   * ## Attributes & Properties
   *
   * Component attributes and properties that can be applied to the element or by using JavaScript.
   *
   * - `level`: Heading level, 1 through 6.
   *
   * ## Slots
   *
   * Areas where markup can be added to the component.
   *
   * - `(default)`: The title text.
   *
   * ## CSS Parts
   *
   * Custom selectors for styling elements within the component.
   *
   * - `heading`: The heading element.
   */
  'helix-card-title': Partial<HelixCardTitleProps & BaseProps<HelixCardTitle> & BaseEvents>

  /**
   * Sits above the body, separated by a rule. Omit it entirely for a card that needs no heading.
   *
   * ## Slots
   *
   * Areas where markup can be added to the component.
   *
   * - `(default)`: Title and actions.
   *
   * ## CSS Custom Properties
   *
   * CSS variables available for styling the component.
   *
   * - `--card-padding`: Inset, inherited from the card unless overridden. (default: `undefined`)
   *
   * ## CSS Parts
   *
   * Custom selectors for styling elements within the component.
   *
   * - `container`: The region.
   */
  'helix-card-header': Partial<HelixCardHeaderProps & BaseProps<HelixCardHeader> & BaseEvents>

  /**
   * Set `aria-labelledby` or `aria-label` for a name present in server-rendered
   * HTML; otherwise the card adopts the first `Card.Title` beneath it once in a
   * browser.
   *
   * ## Attributes & Properties
   *
   * Component attributes and properties that can be applied to the element or by using JavaScript.
   *
   * - `appearance`: How the card separates itself from the page.
   *
   * `outlined` is the default because a hairline is denser than a shadow,
   * scales better, and needs no tuning per color scheme. `elevated` is for a
   * card that genuinely floats above the content behind it.
   * - `dense`: Tightens the inset for dense layouts.
   *
   * ## Slots
   *
   * Areas where markup can be added to the component.
   *
   * - `(default)`: Card regions, typically Header, Body, and Footer.
   *
   * ## CSS Custom Properties
   *
   * CSS variables available for styling the component.
   *
   * - `--card-background-color`: Surface behind the card. (default: `undefined`)
   * - `--card-border-color`: Border color of the surface. (default: `undefined`)
   * - `--card-padding`: Inset applied to each region. (default: `undefined`)
   * - `--card-radii`: Corner radius of the surface. (default: `undefined`)
   *
   * ## CSS Parts
   *
   * Custom selectors for styling elements within the component.
   *
   * - `container`: The card surface.
   */
  'helix-card': Partial<HelixCardProps & BaseProps<HelixCard> & BaseEvents>
}

export type CustomElementsSolidJs = {
  /**
   * The content region animates between collapsed and expanded by transitioning a
   * grid row, which is the only technique that reaches the content's intrinsic
   * height without measuring it in JavaScript.
   *
   * ## Attributes & Properties
   *
   * Component attributes and properties that can be applied to the element or by using JavaScript.
   *
   * - `appearance`: Visual weight of the disclosure.
   * - `dense`: Reduces the vertical padding for dense layouts.
   * - `open`: Whether the element is open. Setting this enters controlled mode.
   * - `default-open`/`defaultOpen`: Initial open state for uncontrolled use. Ignored once `open` is set.
   * - `isOpen`: The resolved open state, whichever mode the element is in. (property only) (readonly)
   *
   * ## Events
   *
   * Events that will be emitted by the component.
   *
   * - `helix-open-change`: Fired when the disclosure opens or closes.
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
   * ## CSS Custom Properties
   *
   * CSS variables available for styling the component.
   *
   * - `--disclosure-background-color`: Surface behind the disclosure. (default: `undefined`)
   * - `--disclosure-border-color`: Border color of the container. (default: `undefined`)
   * - `--disclosure-padding`: Inner padding of trigger and content. (default: `undefined`)
   *
   * ## CSS Parts
   *
   * Custom selectors for styling elements within the component.
   *
   * - `container`: The outer wrapper.
   * - `trigger`: The clickable summary row.
   * - `content`: The revealed region. Animates open and closed.
   * - `content-inner`: Padding wrapper inside the animated region.
   */
  'helix-disclosure': Partial<
    HelixDisclosureProps & HelixDisclosureSolidJsProps & BaseProps<HelixDisclosure> & BaseEvents
  >

  /**
   * Aligns its content to the end, so buttons sit where a user expects to finish.
   *
   * ## Slots
   *
   * Areas where markup can be added to the component.
   *
   * - `(default)`: Actions, typically buttons.
   *
   * ## CSS Custom Properties
   *
   * CSS variables available for styling the component.
   *
   * - `--card-padding`: Inset, inherited from the card unless overridden. (default: `undefined`)
   *
   * ## CSS Parts
   *
   * Custom selectors for styling elements within the component.
   *
   * - `container`: The region.
   */
  'helix-card-footer': Partial<
    HelixCardFooterProps & HelixCardFooterSolidJsProps & BaseProps<HelixCardFooter> & BaseEvents
  >

  /**
   * Carries the card's inset and muted foreground so content does not need to restate either.
   *
   * ## Slots
   *
   * Areas where markup can be added to the component.
   *
   * - `(default)`: The card's content.
   *
   * ## CSS Custom Properties
   *
   * CSS variables available for styling the component.
   *
   * - `--card-padding`: Inset, inherited from the card unless overridden. (default: `undefined`)
   *
   * ## CSS Parts
   *
   * Custom selectors for styling elements within the component.
   *
   * - `container`: The region.
   */
  'helix-card-body': Partial<
    HelixCardBodyProps & HelixCardBodySolidJsProps & BaseProps<HelixCardBody> & BaseEvents
  >

  /**
   * Renders as a heading whose level the consumer sets, because the correct level
   * depends on the surrounding document.
   *
   * ## Attributes & Properties
   *
   * Component attributes and properties that can be applied to the element or by using JavaScript.
   *
   * - `level`: Heading level, 1 through 6.
   *
   * ## Slots
   *
   * Areas where markup can be added to the component.
   *
   * - `(default)`: The title text.
   *
   * ## CSS Parts
   *
   * Custom selectors for styling elements within the component.
   *
   * - `heading`: The heading element.
   */
  'helix-card-title': Partial<
    HelixCardTitleProps & HelixCardTitleSolidJsProps & BaseProps<HelixCardTitle> & BaseEvents
  >

  /**
   * Sits above the body, separated by a rule. Omit it entirely for a card that needs no heading.
   *
   * ## Slots
   *
   * Areas where markup can be added to the component.
   *
   * - `(default)`: Title and actions.
   *
   * ## CSS Custom Properties
   *
   * CSS variables available for styling the component.
   *
   * - `--card-padding`: Inset, inherited from the card unless overridden. (default: `undefined`)
   *
   * ## CSS Parts
   *
   * Custom selectors for styling elements within the component.
   *
   * - `container`: The region.
   */
  'helix-card-header': Partial<
    HelixCardHeaderProps & HelixCardHeaderSolidJsProps & BaseProps<HelixCardHeader> & BaseEvents
  >

  /**
   * Set `aria-labelledby` or `aria-label` for a name present in server-rendered
   * HTML; otherwise the card adopts the first `Card.Title` beneath it once in a
   * browser.
   *
   * ## Attributes & Properties
   *
   * Component attributes and properties that can be applied to the element or by using JavaScript.
   *
   * - `appearance`: How the card separates itself from the page.
   *
   * `outlined` is the default because a hairline is denser than a shadow,
   * scales better, and needs no tuning per color scheme. `elevated` is for a
   * card that genuinely floats above the content behind it.
   * - `dense`: Tightens the inset for dense layouts.
   *
   * ## Slots
   *
   * Areas where markup can be added to the component.
   *
   * - `(default)`: Card regions, typically Header, Body, and Footer.
   *
   * ## CSS Custom Properties
   *
   * CSS variables available for styling the component.
   *
   * - `--card-background-color`: Surface behind the card. (default: `undefined`)
   * - `--card-border-color`: Border color of the surface. (default: `undefined`)
   * - `--card-padding`: Inset applied to each region. (default: `undefined`)
   * - `--card-radii`: Corner radius of the surface. (default: `undefined`)
   *
   * ## CSS Parts
   *
   * Custom selectors for styling elements within the component.
   *
   * - `container`: The card surface.
   */
  'helix-card': Partial<HelixCardProps & HelixCardSolidJsProps & BaseProps<HelixCard> & BaseEvents>
}

export type CustomCssProperties = {
  /** Surface behind the disclosure. */
  '--disclosure-background-color'?: string
  /** Border color of the container. */
  '--disclosure-border-color'?: string
  /** Inner padding of trigger and content. */
  '--disclosure-padding'?: string
  /** Inset, inherited from the card unless overridden. */
  '--card-padding'?: string
  /** Surface behind the card. */
  '--card-background-color'?: string
  /** Border color of the surface. */
  '--card-border-color'?: string
  /** Corner radius of the surface. */
  '--card-radii'?: string
}

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
