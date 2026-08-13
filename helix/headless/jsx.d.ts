import type {
  Helix,
  HelixBaseAppHeader,
  HelixBaseButton,
  HelixBaseCard,
  HelixBaseDisclosure,
  HelixBaseDivider,
  HelixBaseIcon,
  HelixOpenChangeEvent,
} from '@helix-io/headless';

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
export type ScopedElements<
  Prefix extends string = "",
  Suffix extends string = "",
> = {
  [
    Key in keyof CustomElements as `${Prefix}${Key}${Suffix}`
  ]: CustomElements[Key];
};

/**
 * A generic type for strongly typing custom events with their targets
 * @template T - The type of the event target (extends EventTarget)
 * @template D - The type of the detail payload for the custom event
 */
type TypedEvent<T extends EventTarget, E = Event> = E & {
  target: T;
};

type BaseProps<T extends HTMLElement> = {
  /** Content added between the opening and closing tags of the element */
  children?: any;
  /** Used for declaratively styling one or more elements using CSS (Cascading Stylesheets) */
  class?: string;
  /** Used for declaratively styling one or more elements using CSS (Cascading Stylesheets) */
  className?: string;
  /** Takes an object where the key is the class name(s) and the value is a boolean expression. When true, the class is applied, and when false, it is removed. */
  classList?: Record<string, boolean | undefined>;
  /** Specifies the text direction of the element. */
  dir?: "ltr" | "rtl";
  /** Contains a space-separated list of the part names of the element that should be exposed on the host element. */
  exportparts?: string;
  /** For <label> and <output>, lets you associate the label with some control. */
  htmlFor?: string;
  /** Specifies whether the element should be hidden. */
  hidden?: boolean | string;
  /** A unique identifier for the element. */
  id?: string;
  /** Keys tell React which array item each component corresponds to */
  key?: string | number;
  /** Specifies the language of the element. */
  lang?: string;
  /** Defines the element's semantic role for accessibility APIs. */
  role?: string;
  /** Contains a space-separated list of the part names of the element. Part names allows CSS to select and style specific elements in a shadow tree via the ::part pseudo-element. */
  part?: string;
  /** Use the ref attribute with a variable to assign a DOM element to the variable once the element is rendered. */
  ref?: T | ((e: T) => void);
  /** Adds a reference for a custom element slot */
  slot?: string;
  /** Prop for setting inline styles */
  style?: Record<string, string | number>;
  /** Overrides the default Tab button behavior. Avoid using values other than -1 and 0. */
  tabIndex?: number;
  /** Specifies the tooltip text for the element. */
  title?: string;
  /** Passing 'no' excludes the element content from being translated. */
  translate?: "yes" | "no";
  /** The popover global attribute is used to designate an element as a popover element. */
  popover?: "auto" | "hint" | "manual";
  /** Turns an element element into a popover control button; takes the ID of the popover element to control as its value. */
  popovertarget?: "top" | "bottom" | "left" | "right" | "auto";
  /** Specifies the action to be performed on a popover element being controlled by a control element. */
  popovertargetaction?: "show" | "hide" | "toggle";
};

type BaseEvents = {
  // Mouse Events

  /** Triggered when the element is clicked by the user by mouse or keyboard. */
  onClick?: (event: MouseEvent) => void;
  /** Fired when the context menu is triggered, often by right-clicking. */
  onContextMenu?: (event: MouseEvent) => void;
  /** Fired when the element is double-clicked. */
  onDoubleClick?: (event: MouseEvent) => void;
  /** Fired repeatedly as the draggable element is being dragged. */
  onDrag?: (event: DragEvent) => void;
  /** Fired when the dragging of a draggable element is finished. */
  onDragEnd?: (event: DragEvent) => void;
  /** Fired when a dragged element or text selection enters a valid drop target. */
  onDragEnter?: (event: DragEvent) => void;
  /** Fired when a dragged element or text selection leaves a valid drop target. */
  onDragExit?: (event: DragEvent) => void;
  /** Fired when a dragged element or text selection leaves a valid drop target. */
  onDragLeave?: (event: DragEvent) => void;
  /** Fired when an element or text selection is being dragged over a valid drop target (every few hundred milliseconds). */
  onDragOver?: (event: DragEvent) => void;
  /** Fired when a draggable element starts being dragged. */
  onDragStart?: (event: DragEvent) => void;
  /** Fired when a dragged element is dropped onto a drop target. */
  onDrop?: (event: DragEvent) => void;
  /** Fired when a mouse button is pressed down on the element. */
  onMouseDown?: (event: MouseEvent) => void;
  /** Fired when the mouse cursor enters the element. */
  onMouseEnter?: (event: MouseEvent) => void;
  /** Triggered when the mouse cursor leaves the element. */
  onMouseLeave?: (event: MouseEvent) => void;
  /** Fired at an element when a pointing device (usually a mouse) is moved while the cursor's hotspot is inside it. */
  onMouseMove?: (event: MouseEvent) => void;
  /** Fired at an Element when a pointing device (usually a mouse) is used to move the cursor so that it is no longer contained within the element or one of its children. */
  onMouseOut?: (event: MouseEvent) => void;
  /** Fired at an Element when a pointing device (such as a mouse or trackpad) is used to move the cursor onto the element or one of its child elements. */
  onMouseOver?: (event: MouseEvent) => void;
  /** Fired when a mouse button is released on the element. */
  onMouseUp?: (event: MouseEvent) => void;

  // Keyboard Events

  /** Fired when a key is pressed down. */
  onKeyDown?: (event: KeyboardEvent) => void;
  /** Fired when a key is released.. */
  onKeyUp?: (event: KeyboardEvent) => void;
  /** Fired when a key is pressed down. */
  onKeyPressed?: (event: KeyboardEvent) => void;

  // Focus Events

  /** Fired when the element receives focus, often triggered by tab navigation. */
  onFocus?: (event: FocusEvent) => void;
  /** Fired when the element loses focus. */
  onBlur?: (event: FocusEvent) => void;

  // Form Events

  /** Fired when the value of an input element changes, such as with text inputs or select elements. */
  onChange?: (event: Event) => void;
  /** Fires when the value of an <input>, <select>, or <textarea> element has been changed. */
  onInput?: (event: Event) => void;
  /** Fired when a form is submitted, usually on pressing Enter in a text input. */
  onSubmit?: (event: Event) => void;
  /** Fired when a form is reset. */
  onReset?: (event: Event) => void;

  // UI Events

  /** Fired when the content of an element is scrolled. */
  onScroll?: (event: UIEvent) => void;

  // Wheel Events

  /** Fired when the mouse wheel is scrolled while the element is focused. */
  onWheel?: (event: WheelEvent) => void;

  // Animation Events

  /** Fired when a CSS animation starts. */
  onAnimationStart?: (event: AnimationEvent) => void;
  /** Fired when a CSS animation completes. */
  onAnimationEnd?: (event: AnimationEvent) => void;
  /** Fired when a CSS animation completes one iteration. */
  onAnimationIteration?: (event: AnimationEvent) => void;

  // Transition Events

  /** Fired when a CSS transition has completed. */
  onTransitionEnd?: (event: TransitionEvent) => void;

  // Media Events

  /** Fired when an element (usually an image) finishes loading */
  onLoad?: (event: Event) => void;
  /** Fired when an error occurs during the loading of an element, like an image not being found. */
  onError?: (event: Event) => void;

  // Clipboard Events

  /** Fires when the user initiates a copy action through the browser's user interface. */
  onCopy?: (event: ClipboardEvent) => void;
  /** Fired when the user has initiated a "cut" action through the browser's user interface. */
  onCut?: (event: ClipboardEvent) => void;
  /** Fired when the user has initiated a "paste" action through the browser's user interface. */
  onPaste?: (event: ClipboardEvent) => void;
};

export type HelixBaseButtonProps = {
  /** What activating the button does to its form. */
  type?: HelixBaseButton["type"];
  /** Navigates to this URL instead of acting on a form. */
  href?: HelixBaseButton["href"];
  /** Browsing context for `href`, such as `_blank`. */
  target?: HelixBaseButton["target"];
  /** Relationship of the linked URL, defaulted when `target` opens a new tab. */
  rel?: HelixBaseButton["rel"];
  /** Whether the control is non-interactive.

Reflected, because the styled tier selects on it, and mirrored to
`aria-disabled` rather than removing the element from the accessibility
tree, so a screen reader can still announce that the control exists. */
  disabled?: HelixBaseButton["disabled"];
};

export type HelixBaseButtonSolidJsProps = {
  /** What activating the button does to its form. */
  "prop:type"?: HelixBaseButton["type"];
  /** Navigates to this URL instead of acting on a form. */
  "prop:href"?: HelixBaseButton["href"];
  /** Browsing context for `href`, such as `_blank`. */
  "prop:target"?: HelixBaseButton["target"];
  /** Relationship of the linked URL, defaulted when `target` opens a new tab. */
  "prop:rel"?: HelixBaseButton["rel"];
  /** Whether the control is non-interactive.

Reflected, because the styled tier selects on it, and mirrored to
`aria-disabled` rather than removing the element from the accessibility
tree, so a screen reader can still announce that the control exists. */
  "prop:disabled"?: HelixBaseButton["disabled"];

  /** Set the innerHTML of the element */
  innerHTML?: string;
  /** Set the textContent of the element */
  textContent?: string | number;
};

export type HelixBaseAppHeaderProps = {};

export type HelixBaseAppHeaderSolidJsProps = {
  /** Set the innerHTML of the element */
  innerHTML?: string;
  /** Set the textContent of the element */
  textContent?: string | number;
};

export type HelixBaseCardProps = {};

export type HelixBaseCardSolidJsProps = {
  /** Set the innerHTML of the element */
  innerHTML?: string;
  /** Set the textContent of the element */
  textContent?: string | number;
};

/** `HelixBaseDisclosure` component event */
export type HelixBaseDisclosureElementEvent<E = Event> = TypedEvent<
  HelixBaseDisclosure,
  E
>;
/** `OpenChange` event type */
export type HelixBaseDisclosureOpenChangeElementEvent =
  HelixBaseDisclosureElementEvent<HelixOpenChangeEvent>;

export type HelixBaseDisclosureProps = {
  /** Whether the element is open. Setting this enters controlled mode. */
  open?: HelixBaseDisclosure["open"];
  /** Initial open state for uncontrolled use. Ignored once `open` is set. */
  "default-open"?: HelixBaseDisclosure["defaultOpen"];
  /** Initial open state for uncontrolled use. Ignored once `open` is set. */
  defaultOpen?: HelixBaseDisclosure["defaultOpen"];

  /** Fired when the disclosure opens or closes. */
  onOpenChange?: (e: HelixBaseDisclosureOpenChangeElementEvent) => void;
};

export type HelixBaseDisclosureSolidJsProps = {
  /** Whether the element is open. Setting this enters controlled mode. */
  "prop:open"?: HelixBaseDisclosure["open"];
  /** Initial open state for uncontrolled use. Ignored once `open` is set. */
  "bool:default-open"?: HelixBaseDisclosure["defaultOpen"];
  /** Initial open state for uncontrolled use. Ignored once `open` is set. */
  "prop:defaultOpen"?: HelixBaseDisclosure["defaultOpen"];
  /** Fired when the disclosure opens or closes. */
  "on:OpenChange"?: (e: HelixBaseDisclosureOpenChangeElementEvent) => void;

  /** Set the innerHTML of the element */
  innerHTML?: string;
  /** Set the textContent of the element */
  textContent?: string | number;
};

export type HelixBaseIconProps = {
  /** Name of the icon in the Helix set. */
  name?: HelixBaseIcon["name"];
  /** Accessible name, for an icon that is not decorative. */
  label?: HelixBaseIcon["label"];
};

export type HelixBaseIconSolidJsProps = {
  /** Name of the icon in the Helix set. */
  "prop:name"?: HelixBaseIcon["name"];
  /** Accessible name, for an icon that is not decorative. */
  "prop:label"?: HelixBaseIcon["label"];

  /** Set the innerHTML of the element */
  innerHTML?: string;
  /** Set the textContent of the element */
  textContent?: string | number;
};

export type HelixBaseDividerProps = {
  /** Which way the rule runs. */
  orientation?: HelixBaseDivider["orientation"];
};

export type HelixBaseDividerSolidJsProps = {
  /** Which way the rule runs. */
  "prop:orientation"?: HelixBaseDivider["orientation"];

  /** Set the innerHTML of the element */
  innerHTML?: string;
  /** Set the textContent of the element */
  textContent?: string | number;
};

export type CustomElements = {
  /**
   * Renders a real `<button>`, or an `<a>` when `href` is set, so activation,
   * focus, and the browser's own affordances come from the platform rather than
   * from key handlers. `delegatesFocus` puts focus on that inner control, and it
   * serializes into the server's markup, so the button is keyboard reachable
   * before any JavaScript loads.
   *
   * Form submission is explicit. A `<button type="submit">` inside a shadow root
   * submits nothing, because the form is on the other side of the boundary, so
   * the inner control is always `type="button"` and this element calls
   * `requestSubmit()` on its form instead. That routes through validation, unlike
   * `submit()`.
   *
   * ## Attributes & Properties
   *
   * Component attributes and properties that can be applied to the element or by using JavaScript.
   *
   * - `type`: What activating the button does to its form.
   * - `href`: Navigates to this URL instead of acting on a form.
   * - `target`: Browsing context for `href`, such as `_blank`.
   * - `rel`: Relationship of the linked URL, defaulted when `target` opens a new tab.
   * - `disabled`: Whether the control is non-interactive.
   *
   * Reflected, because the styled tier selects on it, and mirrored to
   * `aria-disabled` rather than removing the element from the accessibility
   * tree, so a screen reader can still announce that the control exists.
   * - `form`: The form this control belongs to, if any. (property only) (readonly)
   * - `labels`: Labels associated with this control. (property only) (readonly)
   *
   * ## Slots
   *
   * Areas where markup can be added to the component.
   *
   * - `(default)`: The button's label.
   * - `start`: Content before the label, usually an icon.
   * - `end`: Content after the label.
   *
   * ## CSS Parts
   *
   * Custom selectors for styling elements within the component.
   *
   * - `button`: The inner button or anchor.
   */
  "helix-base-button": Partial<
    HelixBaseButtonProps & BaseProps<HelixBaseButton> & BaseEvents
  >;

  /**
   * Tracks whether the page has scrolled and reflects it as `data-scrolled`, so
   * the styled tier can lift the bar off the page without a scroll handler of its
   * own. Scroll position is the one piece of state the server genuinely cannot
   * know, so it is read on connect rather than derived: a fresh load starts at
   * the top, which is what the server rendered, and a reload part-way down
   * corrects on hydration.
   *
   * The listener is passive and reads `scrollY` only, so it never blocks
   * scrolling.
   *
   * Brand and actions are bare slots. `<nav>` keeps its wrapper because it is a
   * landmark the navigation needs whether or not anything is in it; the other two
   * are `display: contents` when unassigned and cost nothing.
   *
   * ## Slots
   *
   * Areas where markup can be added to the component.
   *
   * - `brand`: Wordmark or logo, at the inline start.
   * - `(default)`: Primary navigation.
   * - `actions`: Trailing actions, such as a call to action.
   *
   * ## CSS Parts
   *
   * Custom selectors for styling elements within the component.
   *
   * - `bar`: The banner itself.
   * - `nav`: The navigation region.
   */
  "helix-base-app-header": Partial<
    HelixBaseAppHeaderProps & BaseProps<HelixBaseAppHeader> & BaseEvents
  >;

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
   * - `media`: Image or video that runs edge to edge, outside the inset.
   * - `header`: Title and any actions for the whole card.
   * - `(default)`: The card's main content.
   * - `footer`: Actions that conclude the card.
   *
   * ## CSS Parts
   *
   * Custom selectors for styling elements within the component.
   *
   * - `container`: The card surface.
   */
  "helix-base-card": Partial<
    HelixBaseCardProps & BaseProps<HelixBaseCard> & BaseEvents
  >;

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
  "helix-base-disclosure": Partial<
    HelixBaseDisclosureProps & BaseProps<HelixBaseDisclosure> & BaseEvents
  >;

  /**
   * Icons are data rather than components, so the set is a plain record of path
   * strings and this element is the only thing that knows how to draw one. A name
   * with no match renders nothing at all instead of an empty box, so a typo
   * cannot leave a hole in a layout that looks deliberate.
   *
   * An icon is decorative by default and hidden from assistive technology. Give
   * it a `label` only when the icon is the sole carrier of meaning, such as
   * inside a button with no text.
   *
   * ## Attributes & Properties
   *
   * Component attributes and properties that can be applied to the element or by using JavaScript.
   *
   * - `name`: Name of the icon in the Helix set.
   * - `label`: Accessible name, for an icon that is not decorative.
   *
   * ## CSS Parts
   *
   * Custom selectors for styling elements within the component.
   *
   * - `svg`: The rendered SVG.
   */
  "helix-base-icon": Partial<
    HelixBaseIconProps & BaseProps<HelixBaseIcon> & BaseEvents
  >;

  /**
   * The separator role lives on the rule inside the shadow root rather than on
   * the host. A role does not need to cross the shadow boundary the way an IDREF
   * does, and putting it on the rendered element means the semantics are in the
   * server's markup with no attribute written during a lifecycle the server never
   * runs.
   *
   * Use `orientation="vertical"` between items on one line, such as inside a
   * toolbar. A vertical divider stretches to its flex parent rather than setting
   * a height of its own.
   *
   * ## Attributes & Properties
   *
   * Component attributes and properties that can be applied to the element or by using JavaScript.
   *
   * - `orientation`: Which way the rule runs.
   *
   * ## CSS Parts
   *
   * Custom selectors for styling elements within the component.
   *
   * - `line`: The rule itself.
   */
  "helix-base-divider": Partial<
    HelixBaseDividerProps & BaseProps<HelixBaseDivider> & BaseEvents
  >;
};

export type CustomElementsSolidJs = {
  /**
   * Renders a real `<button>`, or an `<a>` when `href` is set, so activation,
   * focus, and the browser's own affordances come from the platform rather than
   * from key handlers. `delegatesFocus` puts focus on that inner control, and it
   * serializes into the server's markup, so the button is keyboard reachable
   * before any JavaScript loads.
   *
   * Form submission is explicit. A `<button type="submit">` inside a shadow root
   * submits nothing, because the form is on the other side of the boundary, so
   * the inner control is always `type="button"` and this element calls
   * `requestSubmit()` on its form instead. That routes through validation, unlike
   * `submit()`.
   *
   * ## Attributes & Properties
   *
   * Component attributes and properties that can be applied to the element or by using JavaScript.
   *
   * - `type`: What activating the button does to its form.
   * - `href`: Navigates to this URL instead of acting on a form.
   * - `target`: Browsing context for `href`, such as `_blank`.
   * - `rel`: Relationship of the linked URL, defaulted when `target` opens a new tab.
   * - `disabled`: Whether the control is non-interactive.
   *
   * Reflected, because the styled tier selects on it, and mirrored to
   * `aria-disabled` rather than removing the element from the accessibility
   * tree, so a screen reader can still announce that the control exists.
   * - `form`: The form this control belongs to, if any. (property only) (readonly)
   * - `labels`: Labels associated with this control. (property only) (readonly)
   *
   * ## Slots
   *
   * Areas where markup can be added to the component.
   *
   * - `(default)`: The button's label.
   * - `start`: Content before the label, usually an icon.
   * - `end`: Content after the label.
   *
   * ## CSS Parts
   *
   * Custom selectors for styling elements within the component.
   *
   * - `button`: The inner button or anchor.
   */
  "helix-base-button": Partial<
    HelixBaseButtonProps &
      HelixBaseButtonSolidJsProps &
      BaseProps<HelixBaseButton> &
      BaseEvents
  >;

  /**
   * Tracks whether the page has scrolled and reflects it as `data-scrolled`, so
   * the styled tier can lift the bar off the page without a scroll handler of its
   * own. Scroll position is the one piece of state the server genuinely cannot
   * know, so it is read on connect rather than derived: a fresh load starts at
   * the top, which is what the server rendered, and a reload part-way down
   * corrects on hydration.
   *
   * The listener is passive and reads `scrollY` only, so it never blocks
   * scrolling.
   *
   * Brand and actions are bare slots. `<nav>` keeps its wrapper because it is a
   * landmark the navigation needs whether or not anything is in it; the other two
   * are `display: contents` when unassigned and cost nothing.
   *
   * ## Slots
   *
   * Areas where markup can be added to the component.
   *
   * - `brand`: Wordmark or logo, at the inline start.
   * - `(default)`: Primary navigation.
   * - `actions`: Trailing actions, such as a call to action.
   *
   * ## CSS Parts
   *
   * Custom selectors for styling elements within the component.
   *
   * - `bar`: The banner itself.
   * - `nav`: The navigation region.
   */
  "helix-base-app-header": Partial<
    HelixBaseAppHeaderProps &
      HelixBaseAppHeaderSolidJsProps &
      BaseProps<HelixBaseAppHeader> &
      BaseEvents
  >;

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
   * - `media`: Image or video that runs edge to edge, outside the inset.
   * - `header`: Title and any actions for the whole card.
   * - `(default)`: The card's main content.
   * - `footer`: Actions that conclude the card.
   *
   * ## CSS Parts
   *
   * Custom selectors for styling elements within the component.
   *
   * - `container`: The card surface.
   */
  "helix-base-card": Partial<
    HelixBaseCardProps &
      HelixBaseCardSolidJsProps &
      BaseProps<HelixBaseCard> &
      BaseEvents
  >;

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
  "helix-base-disclosure": Partial<
    HelixBaseDisclosureProps &
      HelixBaseDisclosureSolidJsProps &
      BaseProps<HelixBaseDisclosure> &
      BaseEvents
  >;

  /**
   * Icons are data rather than components, so the set is a plain record of path
   * strings and this element is the only thing that knows how to draw one. A name
   * with no match renders nothing at all instead of an empty box, so a typo
   * cannot leave a hole in a layout that looks deliberate.
   *
   * An icon is decorative by default and hidden from assistive technology. Give
   * it a `label` only when the icon is the sole carrier of meaning, such as
   * inside a button with no text.
   *
   * ## Attributes & Properties
   *
   * Component attributes and properties that can be applied to the element or by using JavaScript.
   *
   * - `name`: Name of the icon in the Helix set.
   * - `label`: Accessible name, for an icon that is not decorative.
   *
   * ## CSS Parts
   *
   * Custom selectors for styling elements within the component.
   *
   * - `svg`: The rendered SVG.
   */
  "helix-base-icon": Partial<
    HelixBaseIconProps &
      HelixBaseIconSolidJsProps &
      BaseProps<HelixBaseIcon> &
      BaseEvents
  >;

  /**
   * The separator role lives on the rule inside the shadow root rather than on
   * the host. A role does not need to cross the shadow boundary the way an IDREF
   * does, and putting it on the rendered element means the semantics are in the
   * server's markup with no attribute written during a lifecycle the server never
   * runs.
   *
   * Use `orientation="vertical"` between items on one line, such as inside a
   * toolbar. A vertical divider stretches to its flex parent rather than setting
   * a height of its own.
   *
   * ## Attributes & Properties
   *
   * Component attributes and properties that can be applied to the element or by using JavaScript.
   *
   * - `orientation`: Which way the rule runs.
   *
   * ## CSS Parts
   *
   * Custom selectors for styling elements within the component.
   *
   * - `line`: The rule itself.
   */
  "helix-base-divider": Partial<
    HelixBaseDividerProps &
      HelixBaseDividerSolidJsProps &
      BaseProps<HelixBaseDivider> &
      BaseEvents
  >;
};

export type CustomCssProperties = {};

declare module "react" {
  namespace JSX {
    interface IntrinsicElements extends CustomElements {}
  }
  export interface CSSProperties extends CustomCssProperties {}
}

declare module "react/jsx-runtime" {
  namespace JSX {
    interface IntrinsicElements extends CustomElements {}
  }
  export interface CSSProperties extends CustomCssProperties {}
}

declare module "react/jsx-dev-runtime" {
  namespace JSX {
    interface IntrinsicElements extends CustomElements {}
  }
  export interface CSSProperties extends CustomCssProperties {}
}

declare module "preact" {
  namespace JSX {
    interface IntrinsicElements extends CustomElements {}
  }
  export interface CSSProperties extends CustomCssProperties {}
}

declare module "@builder.io/qwik" {
  namespace JSX {
    interface IntrinsicElements extends CustomElements {}
  }
  export interface CSSProperties extends CustomCssProperties {}
}

declare module "@stencil/core" {
  namespace JSX {
    interface IntrinsicElements extends CustomElements {}
  }
  export interface CSSProperties extends CustomCssProperties {}
}

declare module "hono/jsx" {
  namespace JSX {
    interface IntrinsicElements extends CustomElements {}
  }
  export interface CSSProperties extends CustomCssProperties {}
}

declare module "react-native" {
  namespace JSX {
    interface IntrinsicElements extends CustomElements {}
  }
  export interface CSSProperties extends CustomCssProperties {}
}

declare module "solid-js" {
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
