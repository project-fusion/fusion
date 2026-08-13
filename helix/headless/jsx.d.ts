import type {
  Helix,
  HelixBaseAccordion,
  HelixBaseAccordionItem,
  HelixBaseAppHeader,
  HelixBaseAvatar,
  HelixBaseBreadcrumbs,
  HelixBaseBreadcrumbsItem,
  HelixBaseButton,
  HelixBaseCallout,
  HelixBaseCard,
  HelixBaseDivider,
  HelixBaseIcon,
  HelixBaseTag,
  HelixOpenChangeEvent,
  HelixRemoveRequestEvent,
  initialsOf,
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
  /** Use the ref attribute with a variable to assign a DOM element to the variable once the element is rendered. */
  ref?: import('react').Ref<T>;
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

export type HelixBaseAppHeaderProps = {};

export type HelixBaseAppHeaderSolidJsProps = {
  /** Set the innerHTML of the element */
  innerHTML?: string;
  /** Set the textContent of the element */
  textContent?: string | number;
};

export type HelixBaseAvatarProps = {
  /** Image to show. Falls back to initials if it fails to load. */
  src?: HelixBaseAvatar["src"];
  /** Name of the person or entity. Used for the label and the initials. */
  name?: HelixBaseAvatar["name"];
};

export type HelixBaseAvatarSolidJsProps = {
  /** Image to show. Falls back to initials if it fails to load. */
  "prop:src"?: HelixBaseAvatar["src"];
  /** Name of the person or entity. Used for the label and the initials. */
  "prop:name"?: HelixBaseAvatar["name"];

  /** Set the innerHTML of the element */
  innerHTML?: string;
  /** Set the textContent of the element */
  textContent?: string | number;
};

/** `HelixBaseAccordionItem` component event */
export type HelixBaseAccordionItemElementEvent<E = Event> = TypedEvent<
  HelixBaseAccordionItem,
  E
>;
/** `OpenChange` event type */
export type HelixBaseAccordionItemOpenChangeElementEvent =
  HelixBaseAccordionItemElementEvent<HelixOpenChangeEvent>;

export type HelixBaseAccordionItemProps = {
  /** Whether the element is open. Setting this enters controlled mode. */
  open?: HelixBaseAccordionItem["open"];
  /** Initial open state for uncontrolled use. Ignored once `open` is set. */
  "default-open"?: HelixBaseAccordionItem["defaultOpen"];
  /** Initial open state for uncontrolled use. Ignored once `open` is set. */
  defaultOpen?: HelixBaseAccordionItem["defaultOpen"];

  /** Fired when the item opens or closes. */
  onOpenChange?: (e: HelixBaseAccordionItemOpenChangeElementEvent) => void;
};

export type HelixBaseAccordionItemSolidJsProps = {
  /** Whether the element is open. Setting this enters controlled mode. */
  "prop:open"?: HelixBaseAccordionItem["open"];
  /** Initial open state for uncontrolled use. Ignored once `open` is set. */
  "bool:default-open"?: HelixBaseAccordionItem["defaultOpen"];
  /** Initial open state for uncontrolled use. Ignored once `open` is set. */
  "prop:defaultOpen"?: HelixBaseAccordionItem["defaultOpen"];
  /** Fired when the item opens or closes. */
  "on:OpenChange"?: (e: HelixBaseAccordionItemOpenChangeElementEvent) => void;

  /** Set the innerHTML of the element */
  innerHTML?: string;
  /** Set the textContent of the element */
  textContent?: string | number;
};

export type HelixBaseAccordionProps = {
  /** Whether more than one item may be open at once. */
  multiple?: HelixBaseAccordion["multiple"];
};

export type HelixBaseAccordionSolidJsProps = {
  /** Whether more than one item may be open at once. */
  "prop:multiple"?: HelixBaseAccordion["multiple"];

  /** Set the innerHTML of the element */
  innerHTML?: string;
  /** Set the textContent of the element */
  textContent?: string | number;
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

export type HelixBaseCalloutProps = {
  /** What kind of attention the passage needs. */
  severity?: HelixBaseCallout["severity"];
};

export type HelixBaseCalloutSolidJsProps = {
  /** What kind of attention the passage needs. */
  "prop:severity"?: HelixBaseCallout["severity"];

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

export type HelixBaseBreadcrumbsItemProps = {
  /** Where the step leads. Ignored when the item is the current page. */
  href?: HelixBaseBreadcrumbsItem["href"];
  /** Whether this item is the page the reader is on. */
  current?: HelixBaseBreadcrumbsItem["current"];
};

export type HelixBaseBreadcrumbsItemSolidJsProps = {
  /** Where the step leads. Ignored when the item is the current page. */
  "prop:href"?: HelixBaseBreadcrumbsItem["href"];
  /** Whether this item is the page the reader is on. */
  "prop:current"?: HelixBaseBreadcrumbsItem["current"];

  /** Set the innerHTML of the element */
  innerHTML?: string;
  /** Set the textContent of the element */
  textContent?: string | number;
};

export type HelixBaseBreadcrumbsProps = {
  /** Accessible name for the landmark.

Named rather than left bare because a page may hold more than one
navigation, and landmarks are how a screen-reader user chooses between them. */
  label?: HelixBaseBreadcrumbs["label"];
};

export type HelixBaseBreadcrumbsSolidJsProps = {
  /** Accessible name for the landmark.

Named rather than left bare because a page may hold more than one
navigation, and landmarks are how a screen-reader user chooses between them. */
  "prop:label"?: HelixBaseBreadcrumbs["label"];

  /** Set the innerHTML of the element */
  innerHTML?: string;
  /** Set the textContent of the element */
  textContent?: string | number;
};

/** `HelixBaseTag` component event */
export type HelixBaseTagElementEvent<E = Event> = TypedEvent<HelixBaseTag, E>;
/** `RemoveRequest` event type */
export type HelixBaseTagRemoveRequestElementEvent =
  HelixBaseTagElementEvent<HelixRemoveRequestEvent>;

export type HelixBaseTagProps = {
  /** Whether the tag offers a control to remove itself. */
  removable?: HelixBaseTag["removable"];
  /** Accessible name for the remove control.

A property rather than text read from the tag, because naming the button
"Remove Draft" would mean reading `textContent` and the server has no tree
to read it from.

The attribute is named explicitly. Lit lowercases a property name to get an
attribute rather than dash-casing it, so this would otherwise be reachable
only as `removelabel`, which nobody would guess and no linter would catch. */
  "remove-label"?: HelixBaseTag["removeLabel"];
  /** Accessible name for the remove control.

A property rather than text read from the tag, because naming the button
"Remove Draft" would mean reading `textContent` and the server has no tree
to read it from.

The attribute is named explicitly. Lit lowercases a property name to get an
attribute rather than dash-casing it, so this would otherwise be reachable
only as `removelabel`, which nobody would guess and no linter would catch. */
  removeLabel?: HelixBaseTag["removeLabel"];

  /** Fired when the reader asks to remove the tag. */
  onRemoveRequest?: (e: HelixBaseTagRemoveRequestElementEvent) => void;
};

export type HelixBaseTagSolidJsProps = {
  /** Whether the tag offers a control to remove itself. */
  "prop:removable"?: HelixBaseTag["removable"];
  /** Accessible name for the remove control.

A property rather than text read from the tag, because naming the button
"Remove Draft" would mean reading `textContent` and the server has no tree
to read it from.

The attribute is named explicitly. Lit lowercases a property name to get an
attribute rather than dash-casing it, so this would otherwise be reachable
only as `removelabel`, which nobody would guess and no linter would catch. */
  "attr:remove-label"?: HelixBaseTag["removeLabel"];
  /** Accessible name for the remove control.

A property rather than text read from the tag, because naming the button
"Remove Draft" would mean reading `textContent` and the server has no tree
to read it from.

The attribute is named explicitly. Lit lowercases a property name to get an
attribute rather than dash-casing it, so this would otherwise be reachable
only as `removelabel`, which nobody would guess and no linter would catch. */
  "prop:removeLabel"?: HelixBaseTag["removeLabel"];
  /** Fired when the reader asks to remove the tag. */
  "on:RemoveRequest"?: (e: HelixBaseTagRemoveRequestElementEvent) => void;

  /** Set the innerHTML of the element */
  innerHTML?: string;
  /** Set the textContent of the element */
  textContent?: string | number;
};

export type CustomElements = {
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
   * The fallback is the reason this is an element. An image that fails to load
   * leaves a broken icon and no name, so the avatar listens for the error and
   * falls back to initials derived from `name`.
   *
   * `name` is required for the accessible name whether or not there is an image,
   * because an avatar with no name tells a screen-reader user nothing. Initials
   * are hidden from assistive technology: they are a visual shorthand for the
   * name that is already announced, and would otherwise be read out letter by
   * letter after it.
   *
   * ## Attributes & Properties
   *
   * Component attributes and properties that can be applied to the element or by using JavaScript.
   *
   * - `src`: Image to show. Falls back to initials if it fails to load.
   * - `name`: Name of the person or entity. Used for the label and the initials.
   *
   * ## Slots
   *
   * Areas where markup can be added to the component.
   *
   * - `(default)`: Replaces the image and initials entirely, for an icon.
   *
   * ## CSS Parts
   *
   * Custom selectors for styling elements within the component.
   *
   * - `avatar`: The avatar body.
   * - `image`: The image, when one is loading or loaded.
   * - `initials`: The initials shown when there is no usable image.
   */
  "helix-base-avatar": Partial<
    HelixBaseAvatarProps & BaseProps<HelixBaseAvatar> & BaseEvents
  >;

  /**
   * Carries its own open state, which is why it is an element rather than a slot.
   * Used alone it is a disclosure, and that is deliberate: shipping a separate
   * `Disclosure` meant two implementations of one behavior, which is what this
   * replaced.
   *
   * Content stays mounted when closed and is hidden by the styled tier's CSS, so
   * it can animate and so the text is present in server-rendered HTML. Closed
   * content is `inert`, keeping it out of the tab order and the accessibility
   * tree without removing it from the box tree.
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
   * - `OpenChange`: Fired when the item opens or closes.
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
   * - `focusTrigger() => void`: Moves focus to this item's trigger.
   *
   * The parent accordion drives arrow-key navigation and cannot reach the
   * trigger itself, because it is inside this item's shadow root. Exposing the
   * intent as a method keeps the parent out of the child's internals.
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
  "helix-base-accordion-item": Partial<
    HelixBaseAccordionItemProps & BaseProps<HelixBaseAccordionItem> & BaseEvents
  >;

  /**
   * Coordination is by event rather than by registration. Items dispatch
   * `OpenChange`, which bubbles and is composed, so the accordion learns that one
   * opened by listening to itself. No ready handshake, no child registry, and
   * nothing to keep in step when items are added or removed.
   *
   * Items are matched with `instanceof HelixBaseAccordionItem`, never by tag
   * name. A headless component that looked for `helix-accordion-item` would only
   * work with the styled tier, which is the tier it is not allowed to know about.
   *
   * Every listener is attached on connect, so none of it runs on the server,
   * where there is no tree to walk and no events to hear.
   *
   * ## Attributes & Properties
   *
   * Component attributes and properties that can be applied to the element or by using JavaScript.
   *
   * - `multiple`: Whether more than one item may be open at once.
   *
   * ## Slots
   *
   * Areas where markup can be added to the component.
   *
   * - `(default)`: The accordion's items.
   *
   * ## CSS Parts
   *
   * Custom selectors for styling elements within the component.
   *
   * - `container`: The stack of items.
   */
  "helix-base-accordion": Partial<
    HelixBaseAccordionProps & BaseProps<HelixBaseAccordion> & BaseEvents
  >;

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
   * `severity` lives on the headless tier rather than being an `appearance` on the
   * styled one, because it is meaning and not decoration. It picks the icon and
   * that icon's accessible name, so a reader who cannot see that the box is red
   * still hears "Error". A callout whose severity existed only as a color would
   * say nothing to them at all.
   *
   * The icon is the fallback content of a slot, so a consumer replaces it by
   * slotting their own and the default disappears with no emptiness check. That
   * is what slot fallback is for.
   *
   * ## Attributes & Properties
   *
   * Component attributes and properties that can be applied to the element or by using JavaScript.
   *
   * - `severity`: What kind of attention the passage needs.
   *
   * ## Slots
   *
   * Areas where markup can be added to the component.
   *
   * - `(default)`: The callout's content.
   * - `icon`: Replaces the icon chosen by `severity`.
   *
   * ## CSS Parts
   *
   * Custom selectors for styling elements within the component.
   *
   * - `callout`: The callout body.
   * - `icon`: The icon region.
   * - `content`: The content region.
   */
  "helix-base-callout": Partial<
    HelixBaseCalloutProps & BaseProps<HelixBaseCallout> & BaseEvents
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
   * An element rather than a slot because it carries API of its own: `href`,
   * whether it is the current page, and the separator that precedes it.
   *
   * Each item renders its own separator and hides it with `:host(:first-child)`,
   * so the trail needs no index and no coordination from the parent. Structural
   * pseudo-classes are allowed inside `:host()`, unlike `:has()`, and this was
   * verified in a browser before being relied on.
   *
   * The current page is a `<span>`, not a link. Linking a page to itself is a
   * known screen-reader annoyance, and `aria-current="page"` is what actually
   * conveys position.
   *
   * ## Attributes & Properties
   *
   * Component attributes and properties that can be applied to the element or by using JavaScript.
   *
   * - `href`: Where the step leads. Ignored when the item is the current page.
   * - `current`: Whether this item is the page the reader is on.
   *
   * ## Slots
   *
   * Areas where markup can be added to the component.
   *
   * - `(default)`: The item's label.
   * - `separator`: Replaces the separator shown before this item.
   *
   * ## CSS Parts
   *
   * Custom selectors for styling elements within the component.
   *
   * - `separator`: The separator preceding the item.
   * - `link`: The item's link, or its text when current.
   */
  "helix-base-breadcrumbs-item": Partial<
    HelixBaseBreadcrumbsItemProps &
      BaseProps<HelixBaseBreadcrumbsItem> &
      BaseEvents
  >;

  /**
   * A navigation landmark wrapping a list. `role="list"` is set explicitly on the
   * `<ol>` even though it is already a list: removing the markers with
   * `list-style: none` strips list semantics in Safari, and a breadcrumb trail
   * always removes its markers.
   *
   * Items are slotted rather than wrapped, so they are `<ol>` children in the flat
   * tree and each carries `role="listitem"` itself.
   *
   * ## Attributes & Properties
   *
   * Component attributes and properties that can be applied to the element or by using JavaScript.
   *
   * - `label`: Accessible name for the landmark.
   *
   * Named rather than left bare because a page may hold more than one
   * navigation, and landmarks are how a screen-reader user chooses between them.
   *
   * ## Slots
   *
   * Areas where markup can be added to the component.
   *
   * - `(default)`: The trail's items, in order from root to current page.
   *
   * ## CSS Parts
   *
   * Custom selectors for styling elements within the component.
   *
   * - `nav`: The navigation landmark.
   * - `list`: The ordered list.
   */
  "helix-base-breadcrumbs": Partial<
    HelixBaseBreadcrumbsProps & BaseProps<HelixBaseBreadcrumbs> & BaseEvents
  >;

  /**
   * A tag is a label, and optionally a label the reader can take off. `removable`
   * is what separates it from a badge: a badge reports a state the reader cannot
   * change, a tag names something they can.
   *
   * Removing is a request, not an action. The tag dispatches `RemoveRequest` and
   * does nothing else, because the consumer owns the list it sits in; taking the
   * node out from under them would put their state and the document out of step.
   * The event is cancelable, so `preventDefault()` is a refusal.
   *
   * ## Attributes & Properties
   *
   * Component attributes and properties that can be applied to the element or by using JavaScript.
   *
   * - `removable`: Whether the tag offers a control to remove itself.
   * - `remove-label`/`removeLabel`: Accessible name for the remove control.
   *
   * A property rather than text read from the tag, because naming the button
   * "Remove Draft" would mean reading `textContent` and the server has no tree
   * to read it from.
   *
   * The attribute is named explicitly. Lit lowercases a property name to get an
   * attribute rather than dash-casing it, so this would otherwise be reachable
   * only as `removelabel`, which nobody would guess and no linter would catch.
   *
   * ## Events
   *
   * Events that will be emitted by the component.
   *
   * - `RemoveRequest`: Fired when the reader asks to remove the tag.
   *
   * ## Slots
   *
   * Areas where markup can be added to the component.
   *
   * - `(default)`: The tag's label.
   *
   * ## CSS Parts
   *
   * Custom selectors for styling elements within the component.
   *
   * - `tag`: The tag body.
   * - `remove`: The remove button, when `removable`.
   */
  "helix-base-tag": Partial<
    HelixBaseTagProps & BaseProps<HelixBaseTag> & BaseEvents
  >;
};

export type CustomElementsSolidJs = {
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
   * The fallback is the reason this is an element. An image that fails to load
   * leaves a broken icon and no name, so the avatar listens for the error and
   * falls back to initials derived from `name`.
   *
   * `name` is required for the accessible name whether or not there is an image,
   * because an avatar with no name tells a screen-reader user nothing. Initials
   * are hidden from assistive technology: they are a visual shorthand for the
   * name that is already announced, and would otherwise be read out letter by
   * letter after it.
   *
   * ## Attributes & Properties
   *
   * Component attributes and properties that can be applied to the element or by using JavaScript.
   *
   * - `src`: Image to show. Falls back to initials if it fails to load.
   * - `name`: Name of the person or entity. Used for the label and the initials.
   *
   * ## Slots
   *
   * Areas where markup can be added to the component.
   *
   * - `(default)`: Replaces the image and initials entirely, for an icon.
   *
   * ## CSS Parts
   *
   * Custom selectors for styling elements within the component.
   *
   * - `avatar`: The avatar body.
   * - `image`: The image, when one is loading or loaded.
   * - `initials`: The initials shown when there is no usable image.
   */
  "helix-base-avatar": Partial<
    HelixBaseAvatarProps &
      HelixBaseAvatarSolidJsProps &
      BaseProps<HelixBaseAvatar> &
      BaseEvents
  >;

  /**
   * Carries its own open state, which is why it is an element rather than a slot.
   * Used alone it is a disclosure, and that is deliberate: shipping a separate
   * `Disclosure` meant two implementations of one behavior, which is what this
   * replaced.
   *
   * Content stays mounted when closed and is hidden by the styled tier's CSS, so
   * it can animate and so the text is present in server-rendered HTML. Closed
   * content is `inert`, keeping it out of the tab order and the accessibility
   * tree without removing it from the box tree.
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
   * - `OpenChange`: Fired when the item opens or closes.
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
   * - `focusTrigger() => void`: Moves focus to this item's trigger.
   *
   * The parent accordion drives arrow-key navigation and cannot reach the
   * trigger itself, because it is inside this item's shadow root. Exposing the
   * intent as a method keeps the parent out of the child's internals.
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
  "helix-base-accordion-item": Partial<
    HelixBaseAccordionItemProps &
      HelixBaseAccordionItemSolidJsProps &
      BaseProps<HelixBaseAccordionItem> &
      BaseEvents
  >;

  /**
   * Coordination is by event rather than by registration. Items dispatch
   * `OpenChange`, which bubbles and is composed, so the accordion learns that one
   * opened by listening to itself. No ready handshake, no child registry, and
   * nothing to keep in step when items are added or removed.
   *
   * Items are matched with `instanceof HelixBaseAccordionItem`, never by tag
   * name. A headless component that looked for `helix-accordion-item` would only
   * work with the styled tier, which is the tier it is not allowed to know about.
   *
   * Every listener is attached on connect, so none of it runs on the server,
   * where there is no tree to walk and no events to hear.
   *
   * ## Attributes & Properties
   *
   * Component attributes and properties that can be applied to the element or by using JavaScript.
   *
   * - `multiple`: Whether more than one item may be open at once.
   *
   * ## Slots
   *
   * Areas where markup can be added to the component.
   *
   * - `(default)`: The accordion's items.
   *
   * ## CSS Parts
   *
   * Custom selectors for styling elements within the component.
   *
   * - `container`: The stack of items.
   */
  "helix-base-accordion": Partial<
    HelixBaseAccordionProps &
      HelixBaseAccordionSolidJsProps &
      BaseProps<HelixBaseAccordion> &
      BaseEvents
  >;

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
   * `severity` lives on the headless tier rather than being an `appearance` on the
   * styled one, because it is meaning and not decoration. It picks the icon and
   * that icon's accessible name, so a reader who cannot see that the box is red
   * still hears "Error". A callout whose severity existed only as a color would
   * say nothing to them at all.
   *
   * The icon is the fallback content of a slot, so a consumer replaces it by
   * slotting their own and the default disappears with no emptiness check. That
   * is what slot fallback is for.
   *
   * ## Attributes & Properties
   *
   * Component attributes and properties that can be applied to the element or by using JavaScript.
   *
   * - `severity`: What kind of attention the passage needs.
   *
   * ## Slots
   *
   * Areas where markup can be added to the component.
   *
   * - `(default)`: The callout's content.
   * - `icon`: Replaces the icon chosen by `severity`.
   *
   * ## CSS Parts
   *
   * Custom selectors for styling elements within the component.
   *
   * - `callout`: The callout body.
   * - `icon`: The icon region.
   * - `content`: The content region.
   */
  "helix-base-callout": Partial<
    HelixBaseCalloutProps &
      HelixBaseCalloutSolidJsProps &
      BaseProps<HelixBaseCallout> &
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
   * An element rather than a slot because it carries API of its own: `href`,
   * whether it is the current page, and the separator that precedes it.
   *
   * Each item renders its own separator and hides it with `:host(:first-child)`,
   * so the trail needs no index and no coordination from the parent. Structural
   * pseudo-classes are allowed inside `:host()`, unlike `:has()`, and this was
   * verified in a browser before being relied on.
   *
   * The current page is a `<span>`, not a link. Linking a page to itself is a
   * known screen-reader annoyance, and `aria-current="page"` is what actually
   * conveys position.
   *
   * ## Attributes & Properties
   *
   * Component attributes and properties that can be applied to the element or by using JavaScript.
   *
   * - `href`: Where the step leads. Ignored when the item is the current page.
   * - `current`: Whether this item is the page the reader is on.
   *
   * ## Slots
   *
   * Areas where markup can be added to the component.
   *
   * - `(default)`: The item's label.
   * - `separator`: Replaces the separator shown before this item.
   *
   * ## CSS Parts
   *
   * Custom selectors for styling elements within the component.
   *
   * - `separator`: The separator preceding the item.
   * - `link`: The item's link, or its text when current.
   */
  "helix-base-breadcrumbs-item": Partial<
    HelixBaseBreadcrumbsItemProps &
      HelixBaseBreadcrumbsItemSolidJsProps &
      BaseProps<HelixBaseBreadcrumbsItem> &
      BaseEvents
  >;

  /**
   * A navigation landmark wrapping a list. `role="list"` is set explicitly on the
   * `<ol>` even though it is already a list: removing the markers with
   * `list-style: none` strips list semantics in Safari, and a breadcrumb trail
   * always removes its markers.
   *
   * Items are slotted rather than wrapped, so they are `<ol>` children in the flat
   * tree and each carries `role="listitem"` itself.
   *
   * ## Attributes & Properties
   *
   * Component attributes and properties that can be applied to the element or by using JavaScript.
   *
   * - `label`: Accessible name for the landmark.
   *
   * Named rather than left bare because a page may hold more than one
   * navigation, and landmarks are how a screen-reader user chooses between them.
   *
   * ## Slots
   *
   * Areas where markup can be added to the component.
   *
   * - `(default)`: The trail's items, in order from root to current page.
   *
   * ## CSS Parts
   *
   * Custom selectors for styling elements within the component.
   *
   * - `nav`: The navigation landmark.
   * - `list`: The ordered list.
   */
  "helix-base-breadcrumbs": Partial<
    HelixBaseBreadcrumbsProps &
      HelixBaseBreadcrumbsSolidJsProps &
      BaseProps<HelixBaseBreadcrumbs> &
      BaseEvents
  >;

  /**
   * A tag is a label, and optionally a label the reader can take off. `removable`
   * is what separates it from a badge: a badge reports a state the reader cannot
   * change, a tag names something they can.
   *
   * Removing is a request, not an action. The tag dispatches `RemoveRequest` and
   * does nothing else, because the consumer owns the list it sits in; taking the
   * node out from under them would put their state and the document out of step.
   * The event is cancelable, so `preventDefault()` is a refusal.
   *
   * ## Attributes & Properties
   *
   * Component attributes and properties that can be applied to the element or by using JavaScript.
   *
   * - `removable`: Whether the tag offers a control to remove itself.
   * - `remove-label`/`removeLabel`: Accessible name for the remove control.
   *
   * A property rather than text read from the tag, because naming the button
   * "Remove Draft" would mean reading `textContent` and the server has no tree
   * to read it from.
   *
   * The attribute is named explicitly. Lit lowercases a property name to get an
   * attribute rather than dash-casing it, so this would otherwise be reachable
   * only as `removelabel`, which nobody would guess and no linter would catch.
   *
   * ## Events
   *
   * Events that will be emitted by the component.
   *
   * - `RemoveRequest`: Fired when the reader asks to remove the tag.
   *
   * ## Slots
   *
   * Areas where markup can be added to the component.
   *
   * - `(default)`: The tag's label.
   *
   * ## CSS Parts
   *
   * Custom selectors for styling elements within the component.
   *
   * - `tag`: The tag body.
   * - `remove`: The remove button, when `removable`.
   */
  "helix-base-tag": Partial<
    HelixBaseTagProps &
      HelixBaseTagSolidJsProps &
      BaseProps<HelixBaseTag> &
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
