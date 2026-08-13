import type {
  Helix,
  HelixAccordion,
  HelixAccordionItem,
  HelixAppHeader,
  HelixAvatar,
  HelixBreadcrumbs,
  HelixBreadcrumbsItem,
  HelixButton,
  HelixCallout,
  HelixCard,
  HelixDivider,
  HelixIcon,
  HelixOpenChangeEvent,
  HelixRemoveRequestEvent,
  HelixTag,
} from '@helix-io/web';

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

/** `HelixAccordionItem` component event */
export type HelixAccordionItemElementEvent<E = Event> = TypedEvent<
  HelixAccordionItem,
  E
>;
/** `OpenChange` event type */
export type HelixAccordionItemOpenChangeElementEvent =
  HelixAccordionItemElementEvent<HelixOpenChangeEvent>;

export type HelixAccordionItemProps = {
  /** Tightens the trigger for dense layouts. */
  dense?: HelixAccordionItem["dense"];
  /** Whether the element is open. Setting this enters controlled mode. */
  open?: HelixAccordionItem["open"];
  /** Initial open state for uncontrolled use. Ignored once `open` is set. */
  "default-open"?: HelixAccordionItem["defaultOpen"];
  /** Initial open state for uncontrolled use. Ignored once `open` is set. */
  defaultOpen?: HelixAccordionItem["defaultOpen"];

  /** Fired when the item opens or closes. */
  onOpenChange?: (e: HelixAccordionItemOpenChangeElementEvent) => void;
};

export type HelixAccordionItemSolidJsProps = {
  /** Tightens the trigger for dense layouts. */
  "prop:dense"?: HelixAccordionItem["dense"];
  /** Whether the element is open. Setting this enters controlled mode. */
  "prop:open"?: HelixAccordionItem["open"];
  /** Initial open state for uncontrolled use. Ignored once `open` is set. */
  "bool:default-open"?: HelixAccordionItem["defaultOpen"];
  /** Initial open state for uncontrolled use. Ignored once `open` is set. */
  "prop:defaultOpen"?: HelixAccordionItem["defaultOpen"];
  /** Fired when the item opens or closes. */
  "on:OpenChange"?: (e: HelixAccordionItemOpenChangeElementEvent) => void;

  /** Set the innerHTML of the element */
  innerHTML?: string;
  /** Set the textContent of the element */
  textContent?: string | number;
};

export type HelixAccordionProps = {
  /** Removes the surrounding surface, leaving only the separating rules. */
  appearance?: HelixAccordion["appearance"];
  /** Whether more than one item may be open at once. */
  multiple?: HelixAccordion["multiple"];
};

export type HelixAccordionSolidJsProps = {
  /** Removes the surrounding surface, leaving only the separating rules. */
  "prop:appearance"?: HelixAccordion["appearance"];
  /** Whether more than one item may be open at once. */
  "prop:multiple"?: HelixAccordion["multiple"];

  /** Set the innerHTML of the element */
  innerHTML?: string;
  /** Set the textContent of the element */
  textContent?: string | number;
};

export type HelixButtonProps = {
  /** How much visual weight the button carries. */
  appearance?: HelixButton["appearance"];
  /** Height and inset of the control. */
  size?: HelixButton["size"];
  /** What activating the button does to its form. */
  type?: HelixButton["type"];
  /** Navigates to this URL instead of acting on a form. */
  href?: HelixButton["href"];
  /** Browsing context for `href`, such as `_blank`. */
  target?: HelixButton["target"];
  /** Relationship of the linked URL, defaulted when `target` opens a new tab. */
  rel?: HelixButton["rel"];
  /** Whether the control is non-interactive.

Reflected, because the styled tier selects on it, and mirrored to
`aria-disabled` rather than removing the element from the accessibility
tree, so a screen reader can still announce that the control exists. */
  disabled?: HelixButton["disabled"];
};

export type HelixButtonSolidJsProps = {
  /** How much visual weight the button carries. */
  "prop:appearance"?: HelixButton["appearance"];
  /** Height and inset of the control. */
  "prop:size"?: HelixButton["size"];
  /** What activating the button does to its form. */
  "prop:type"?: HelixButton["type"];
  /** Navigates to this URL instead of acting on a form. */
  "prop:href"?: HelixButton["href"];
  /** Browsing context for `href`, such as `_blank`. */
  "prop:target"?: HelixButton["target"];
  /** Relationship of the linked URL, defaulted when `target` opens a new tab. */
  "prop:rel"?: HelixButton["rel"];
  /** Whether the control is non-interactive.

Reflected, because the styled tier selects on it, and mirrored to
`aria-disabled` rather than removing the element from the accessibility
tree, so a screen reader can still announce that the control exists. */
  "prop:disabled"?: HelixButton["disabled"];

  /** Set the innerHTML of the element */
  innerHTML?: string;
  /** Set the textContent of the element */
  textContent?: string | number;
};

export type HelixCalloutProps = {
  /** What kind of attention the passage needs. */
  severity?: HelixCallout["severity"];
};

export type HelixCalloutSolidJsProps = {
  /** What kind of attention the passage needs. */
  "prop:severity"?: HelixCallout["severity"];

  /** Set the innerHTML of the element */
  innerHTML?: string;
  /** Set the textContent of the element */
  textContent?: string | number;
};

export type HelixCardProps = {
  /** How the card separates itself from the page. */
  appearance?: HelixCard["appearance"];
  /** Tightens the inset for dense layouts. */
  dense?: HelixCard["dense"];
  /** Whether media sits above the content stack or beside it. */
  orientation?: HelixCard["orientation"];
};

export type HelixCardSolidJsProps = {
  /** How the card separates itself from the page. */
  "prop:appearance"?: HelixCard["appearance"];
  /** Tightens the inset for dense layouts. */
  "prop:dense"?: HelixCard["dense"];
  /** Whether media sits above the content stack or beside it. */
  "prop:orientation"?: HelixCard["orientation"];

  /** Set the innerHTML of the element */
  innerHTML?: string;
  /** Set the textContent of the element */
  textContent?: string | number;
};

export type HelixAvatarProps = {
  /** Whether the avatar is a circle or a rounded square. */
  shape?: HelixAvatar["shape"];
  /** Edge length of the avatar. */
  size?: HelixAvatar["size"];
  /** Image to show. Falls back to initials if it fails to load. */
  src?: HelixAvatar["src"];
  /** Name of the person or entity. Used for the label and the initials. */
  name?: HelixAvatar["name"];
};

export type HelixAvatarSolidJsProps = {
  /** Whether the avatar is a circle or a rounded square. */
  "prop:shape"?: HelixAvatar["shape"];
  /** Edge length of the avatar. */
  "prop:size"?: HelixAvatar["size"];
  /** Image to show. Falls back to initials if it fails to load. */
  "prop:src"?: HelixAvatar["src"];
  /** Name of the person or entity. Used for the label and the initials. */
  "prop:name"?: HelixAvatar["name"];

  /** Set the innerHTML of the element */
  innerHTML?: string;
  /** Set the textContent of the element */
  textContent?: string | number;
};

export type HelixBreadcrumbsItemProps = {
  /** Where the step leads. Ignored when the item is the current page. */
  href?: HelixBreadcrumbsItem["href"];
  /** Whether this item is the page the reader is on. */
  current?: HelixBreadcrumbsItem["current"];
};

export type HelixBreadcrumbsItemSolidJsProps = {
  /** Where the step leads. Ignored when the item is the current page. */
  "prop:href"?: HelixBreadcrumbsItem["href"];
  /** Whether this item is the page the reader is on. */
  "prop:current"?: HelixBreadcrumbsItem["current"];

  /** Set the innerHTML of the element */
  innerHTML?: string;
  /** Set the textContent of the element */
  textContent?: string | number;
};

export type HelixBreadcrumbsProps = {
  /** Accessible name for the landmark.

Named rather than left bare because a page may hold more than one
navigation, and landmarks are how a screen-reader user chooses between them. */
  label?: HelixBreadcrumbs["label"];
};

export type HelixBreadcrumbsSolidJsProps = {
  /** Accessible name for the landmark.

Named rather than left bare because a page may hold more than one
navigation, and landmarks are how a screen-reader user chooses between them. */
  "prop:label"?: HelixBreadcrumbs["label"];

  /** Set the innerHTML of the element */
  innerHTML?: string;
  /** Set the textContent of the element */
  textContent?: string | number;
};

export type HelixAppHeaderProps = {
  /** Whether the banner sticks to the top of the viewport. */
  sticky?: HelixAppHeader["sticky"];
};

export type HelixAppHeaderSolidJsProps = {
  /** Whether the banner sticks to the top of the viewport. */
  "prop:sticky"?: HelixAppHeader["sticky"];

  /** Set the innerHTML of the element */
  innerHTML?: string;
  /** Set the textContent of the element */
  textContent?: string | number;
};

export type HelixDividerProps = {
  /** Which way the rule runs. */
  orientation?: HelixDivider["orientation"];
};

export type HelixDividerSolidJsProps = {
  /** Which way the rule runs. */
  "prop:orientation"?: HelixDivider["orientation"];

  /** Set the innerHTML of the element */
  innerHTML?: string;
  /** Set the textContent of the element */
  textContent?: string | number;
};

export type HelixIconProps = {
  /** Name of the icon in the Helix set. */
  name?: HelixIcon["name"];
  /** Accessible name, for an icon that is not decorative. */
  label?: HelixIcon["label"];
};

export type HelixIconSolidJsProps = {
  /** Name of the icon in the Helix set. */
  "prop:name"?: HelixIcon["name"];
  /** Accessible name, for an icon that is not decorative. */
  "prop:label"?: HelixIcon["label"];

  /** Set the innerHTML of the element */
  innerHTML?: string;
  /** Set the textContent of the element */
  textContent?: string | number;
};

/** `HelixTag` component event */
export type HelixTagElementEvent<E = Event> = TypedEvent<HelixTag, E>;
/** `RemoveRequest` event type */
export type HelixTagRemoveRequestElementEvent =
  HelixTagElementEvent<HelixRemoveRequestEvent>;

export type HelixTagProps = {
  /** Which status the tag reports. */
  appearance?: HelixTag["appearance"];
  /** Height and inset of the tag. */
  size?: HelixTag["size"];
  /** Whether the tag offers a control to remove itself. */
  removable?: HelixTag["removable"];
  /** Accessible name for the remove control.

A property rather than text read from the tag, because naming the button
"Remove Draft" would mean reading `textContent` and the server has no tree
to read it from.

The attribute is named explicitly. Lit lowercases a property name to get an
attribute rather than dash-casing it, so this would otherwise be reachable
only as `removelabel`, which nobody would guess and no linter would catch. */
  "remove-label"?: HelixTag["removeLabel"];
  /** Accessible name for the remove control.

A property rather than text read from the tag, because naming the button
"Remove Draft" would mean reading `textContent` and the server has no tree
to read it from.

The attribute is named explicitly. Lit lowercases a property name to get an
attribute rather than dash-casing it, so this would otherwise be reachable
only as `removelabel`, which nobody would guess and no linter would catch. */
  removeLabel?: HelixTag["removeLabel"];

  /** Fired when the reader asks to remove the tag. */
  onRemoveRequest?: (e: HelixTagRemoveRequestElementEvent) => void;
};

export type HelixTagSolidJsProps = {
  /** Which status the tag reports. */
  "prop:appearance"?: HelixTag["appearance"];
  /** Height and inset of the tag. */
  "prop:size"?: HelixTag["size"];
  /** Whether the tag offers a control to remove itself. */
  "prop:removable"?: HelixTag["removable"];
  /** Accessible name for the remove control.

A property rather than text read from the tag, because naming the button
"Remove Draft" would mean reading `textContent` and the server has no tree
to read it from.

The attribute is named explicitly. Lit lowercases a property name to get an
attribute rather than dash-casing it, so this would otherwise be reachable
only as `removelabel`, which nobody would guess and no linter would catch. */
  "attr:remove-label"?: HelixTag["removeLabel"];
  /** Accessible name for the remove control.

A property rather than text read from the tag, because naming the button
"Remove Draft" would mean reading `textContent` and the server has no tree
to read it from.

The attribute is named explicitly. Lit lowercases a property name to get an
attribute rather than dash-casing it, so this would otherwise be reachable
only as `removelabel`, which nobody would guess and no linter would catch. */
  "prop:removeLabel"?: HelixTag["removeLabel"];
  /** Fired when the reader asks to remove the tag. */
  "on:RemoveRequest"?: (e: HelixTagRemoveRequestElementEvent) => void;

  /** Set the innerHTML of the element */
  innerHTML?: string;
  /** Set the textContent of the element */
  textContent?: string | number;
};

export type CustomElements = {
  /**
   * The open and close transition animates `grid-template-rows` from `0fr` to
   * `1fr`, which is the only technique that reaches the content's intrinsic
   * height without measuring it in JavaScript. It is disabled under
   * `prefers-reduced-motion`.
   *
   * Usable on its own as a disclosure, with no accordion around it.
   *
   * ## Attributes & Properties
   *
   * Component attributes and properties that can be applied to the element or by using JavaScript.
   *
   * - `dense`: Tightens the trigger for dense layouts.
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
   * - `setOpen(next: boolean) => void`: Requests an open-state change. In uncontrolled mode the element updates
   * itself; in controlled mode it only notifies and waits for the consumer.
   * - `focusTrigger() => void`: Moves focus to this item's trigger.
   *
   * The parent accordion drives arrow-key navigation and cannot reach the
   * trigger itself, because it is inside this item's shadow root. Exposing the
   * intent as a method keeps the parent out of the child's internals.
   *
   * ## CSS Custom Properties
   *
   * CSS variables available for styling the component.
   *
   * - `--accordion-item-padding`: Inset of the trigger and content. (default: `undefined`)
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
  "helix-accordion-item": Partial<
    HelixAccordionItemProps & BaseProps<HelixAccordionItem> & BaseEvents
  >;

  /**
   * Items sit in a single bordered stack, sharing one rule between neighbours
   * rather than each drawing its own, so the seam between two items is one pixel
   * and not two.
   *
   * ## Attributes & Properties
   *
   * Component attributes and properties that can be applied to the element or by using JavaScript.
   *
   * - `appearance`: Removes the surrounding surface, leaving only the separating rules.
   * - `multiple`: Whether more than one item may be open at once.
   *
   * ## Slots
   *
   * Areas where markup can be added to the component.
   *
   * - `(default)`: The accordion's items.
   *
   * ## CSS Custom Properties
   *
   * CSS variables available for styling the component.
   *
   * - `--accordion-border-color`: Color of the surrounding rule. (default: `undefined`)
   * - `--accordion-radii`: Corner radius of the stack. (default: `undefined`)
   *
   * ## CSS Parts
   *
   * Custom selectors for styling elements within the component.
   *
   * - `container`: The stack of items.
   */
  "helix-accordion": Partial<
    HelixAccordionProps & BaseProps<HelixAccordion> & BaseEvents
  >;

  /**
   * Four appearances and three sizes, all drawn on one control so a link styled
   * as a button and a real button are indistinguishable to a reader. The focus
   * ring is declared here rather than inherited, because the base layer's
   * `:focus-visible` rule is a light-DOM rule and stops at the shadow boundary.
   *
   * ## Attributes & Properties
   *
   * Component attributes and properties that can be applied to the element or by using JavaScript.
   *
   * - `appearance`: How much visual weight the button carries.
   * - `size`: Height and inset of the control.
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
   * ## CSS Custom Properties
   *
   * CSS variables available for styling the component.
   *
   * - `--button-background-color`: Fill behind the button. (default: `undefined`)
   * - `--button-foreground-color`: Label and icon color. (default: `undefined`)
   * - `--button-radii`: Corner radius of the control. (default: `undefined`)
   *
   * ## CSS Parts
   *
   * Custom selectors for styling elements within the component.
   *
   * - `button`: The inner button or anchor.
   */
  "helix-button": Partial<
    HelixButtonProps & BaseProps<HelixButton> & BaseEvents
  >;

  /**
   * Tinted from the severity's status color with `color-mix`, and marked with a
   * bar on the inline start so the severity survives being read in greyscale or
   * by anyone who does not distinguish the hues.
   *
   * There is no `appearance` here. `severity` carries the meaning and lives on
   * the headless tier; this tier only decides what that meaning looks like.
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
   * ## CSS Custom Properties
   *
   * CSS variables available for styling the component.
   *
   * - `--callout-background-color`: Fill behind the callout. (default: `undefined`)
   * - `--callout-radii`: Corner radius of the callout. (default: `undefined`)
   *
   * ## CSS Parts
   *
   * Custom selectors for styling elements within the component.
   *
   * - `callout`: The callout body.
   * - `icon`: The icon region.
   * - `content`: The content region.
   */
  "helix-callout": Partial<
    HelixCalloutProps & BaseProps<HelixCallout> & BaseEvents
  >;

  /**
   * Regions are slots: `media`, `header`, the default slot for content, and
   * `footer`. An omitted region takes no space, so a card with only content needs
   * no wrapper markup at all.
   *
   * `media` runs edge to edge and clips to the card's corners, so an image needs
   * no inset correction. Set `orientation="horizontal"` to move it alongside the
   * header, content, and footer stack rather than above it.
   *
   * Regions are bare slots with no wrapper element, so an omitted one occupies no
   * space without the card having to detect that it is missing. Style slotted
   * content directly rather than reaching for a part: a header is whatever
   * element you slotted, not a wrapper we put around it.
   *
   * ## Attributes & Properties
   *
   * Component attributes and properties that can be applied to the element or by using JavaScript.
   *
   * - `appearance`: How the card separates itself from the page.
   * - `dense`: Tightens the inset for dense layouts.
   * - `orientation`: Whether media sits above the content stack or beside it.
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
   * ## CSS Custom Properties
   *
   * CSS variables available for styling the component.
   *
   * - `--card-background-color`: Surface behind the card. (default: `undefined`)
   * - `--card-border-color`: Border color of the surface. (default: `undefined`)
   * - `--card-media-size`: Width of the media column when horizontal. (default: `undefined`)
   * - `--card-padding`: Inset applied to each region. (default: `undefined`)
   * - `--card-radii`: Corner radius of the surface. (default: `undefined`)
   *
   * ## CSS Parts
   *
   * Custom selectors for styling elements within the component.
   *
   * - `container`: The card surface.
   */
  "helix-card": Partial<HelixCardProps & BaseProps<HelixCard> & BaseEvents>;

  /**
   * Initials scale with the avatar rather than being sized per size, because the
   * font size is set in `em` against the avatar's own dimension. One rule covers
   * every size, including one a consumer sets themselves through
   * `--avatar-size`.
   *
   * ## Attributes & Properties
   *
   * Component attributes and properties that can be applied to the element or by using JavaScript.
   *
   * - `shape`: Whether the avatar is a circle or a rounded square.
   * - `size`: Edge length of the avatar.
   * - `src`: Image to show. Falls back to initials if it fails to load.
   * - `name`: Name of the person or entity. Used for the label and the initials.
   *
   * ## Slots
   *
   * Areas where markup can be added to the component.
   *
   * - `(default)`: Replaces the image and initials entirely, for an icon.
   *
   * ## CSS Custom Properties
   *
   * CSS variables available for styling the component.
   *
   * - `--avatar-background-color`: Fill behind the initials. (default: `undefined`)
   * - `--avatar-size`: Edge length of the avatar. (default: `undefined`)
   *
   * ## CSS Parts
   *
   * Custom selectors for styling elements within the component.
   *
   * - `avatar`: The avatar body.
   * - `image`: The image, when one is loading or loaded.
   * - `initials`: The initials shown when there is no usable image.
   */
  "helix-avatar": Partial<
    HelixAvatarProps & BaseProps<HelixAvatar> & BaseEvents
  >;

  /**
   * The separator is hidden on the first item with `:host(:first-child)`, so no
   * item needs to know its own index and the parent needs no coordination.
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
   * ## CSS Custom Properties
   *
   * CSS variables available for styling the component.
   *
   * - `--breadcrumbs-separator-color`: Color of the separator. (default: `undefined`)
   *
   * ## CSS Parts
   *
   * Custom selectors for styling elements within the component.
   *
   * - `separator`: The separator preceding the item.
   * - `link`: The item's link, or its text when current.
   */
  "helix-breadcrumbs-item": Partial<
    HelixBreadcrumbsItemProps & BaseProps<HelixBreadcrumbsItem> & BaseEvents
  >;

  /**
   * A single wrapping line by default. The trail wraps rather than scrolling,
   * because a truncated path tells the reader less than a two-line one.
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
   * ## CSS Custom Properties
   *
   * CSS variables available for styling the component.
   *
   * - `--breadcrumbs-gap`: Space between items and separators. (default: `undefined`)
   *
   * ## CSS Parts
   *
   * Custom selectors for styling elements within the component.
   *
   * - `nav`: The navigation landmark.
   * - `list`: The ordered list.
   */
  "helix-breadcrumbs": Partial<
    HelixBreadcrumbsProps & BaseProps<HelixBreadcrumbs> & BaseEvents
  >;

  /**
   * Sticky and translucent, drawn on the material tokens so the page content
   * blurs behind it rather than being hidden by an opaque bar. The separating
   * rule and shadow appear only once the page has scrolled, which keeps the bar
   * flat against the hero and lifts it off the content afterwards.
   *
   * ## Attributes & Properties
   *
   * Component attributes and properties that can be applied to the element or by using JavaScript.
   *
   * - `sticky`: Whether the banner sticks to the top of the viewport.
   *
   * ## Slots
   *
   * Areas where markup can be added to the component.
   *
   * - `brand`: Wordmark or logo, at the inline start.
   * - `(default)`: Primary navigation.
   * - `actions`: Trailing actions, such as a call to action.
   *
   * ## CSS Custom Properties
   *
   * CSS variables available for styling the component.
   *
   * - `--app-header-background`: Material behind the banner. (default: `undefined`)
   * - `--app-header-height`: Height of the banner. (default: `undefined`)
   * - `--app-header-inset`: Inline padding of the banner. (default: `undefined`)
   * - `--app-header-max-inline-size`: Width the content is centered in. (default: `undefined`)
   *
   * ## CSS Parts
   *
   * Custom selectors for styling elements within the component.
   *
   * - `bar`: The banner itself.
   * - `nav`: The navigation region.
   */
  "helix-app-header": Partial<
    HelixAppHeaderProps & BaseProps<HelixAppHeader> & BaseEvents
  >;

  /**
   * A one-pixel rule in the border color, running the full inline size by
   * default. A vertical divider stretches to its flex parent instead of setting
   * its own height, so it matches whatever it sits beside without being told how
   * tall that is.
   *
   * ## Attributes & Properties
   *
   * Component attributes and properties that can be applied to the element or by using JavaScript.
   *
   * - `orientation`: Which way the rule runs.
   *
   * ## CSS Custom Properties
   *
   * CSS variables available for styling the component.
   *
   * - `--divider-color`: Color of the rule. (default: `undefined`)
   * - `--divider-thickness`: Thickness of the rule. (default: `undefined`)
   *
   * ## CSS Parts
   *
   * Custom selectors for styling elements within the component.
   *
   * - `line`: The rule itself.
   */
  "helix-divider": Partial<
    HelixDividerProps & BaseProps<HelixDivider> & BaseEvents
  >;

  /**
   * Draws in `currentColor` and sizes from `--icon-size`, so an icon inherits the
   * color of the text it sits in and a container can resize it without reaching
   * for a prop. Inside a button that hook is set in `em`, which keeps the icon in
   * proportion as the button's own size changes.
   *
   * ## Attributes & Properties
   *
   * Component attributes and properties that can be applied to the element or by using JavaScript.
   *
   * - `name`: Name of the icon in the Helix set.
   * - `label`: Accessible name, for an icon that is not decorative.
   *
   * ## CSS Custom Properties
   *
   * CSS variables available for styling the component.
   *
   * - `--icon-size`: Edge length of the icon's box. (default: `undefined`)
   *
   * ## CSS Parts
   *
   * Custom selectors for styling elements within the component.
   *
   * - `svg`: The rendered SVG.
   */
  "helix-icon": Partial<HelixIconProps & BaseProps<HelixIcon> & BaseEvents>;

  /**
   * Five appearances, drawn as a tinted fill derived from the status color with
   * `color-mix` rather than from a token per status. The alternative was eight
   * new tokens whose only job was to be a lighter version of one that already
   * existed, and they would have had to be re-derived by every theme.
   *
   * ## Attributes & Properties
   *
   * Component attributes and properties that can be applied to the element or by using JavaScript.
   *
   * - `appearance`: Which status the tag reports.
   * - `size`: Height and inset of the tag.
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
   * ## CSS Custom Properties
   *
   * CSS variables available for styling the component.
   *
   * - `--tag-background-color`: Fill behind the tag. (default: `undefined`)
   * - `--tag-foreground-color`: Label color. (default: `undefined`)
   * - `--tag-radii`: Corner radius of the tag. (default: `undefined`)
   *
   * ## CSS Parts
   *
   * Custom selectors for styling elements within the component.
   *
   * - `tag`: The tag body.
   * - `remove`: The remove button, when `removable`.
   */
  "helix-tag": Partial<HelixTagProps & BaseProps<HelixTag> & BaseEvents>;
};

export type CustomElementsSolidJs = {
  /**
   * The open and close transition animates `grid-template-rows` from `0fr` to
   * `1fr`, which is the only technique that reaches the content's intrinsic
   * height without measuring it in JavaScript. It is disabled under
   * `prefers-reduced-motion`.
   *
   * Usable on its own as a disclosure, with no accordion around it.
   *
   * ## Attributes & Properties
   *
   * Component attributes and properties that can be applied to the element or by using JavaScript.
   *
   * - `dense`: Tightens the trigger for dense layouts.
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
   * - `setOpen(next: boolean) => void`: Requests an open-state change. In uncontrolled mode the element updates
   * itself; in controlled mode it only notifies and waits for the consumer.
   * - `focusTrigger() => void`: Moves focus to this item's trigger.
   *
   * The parent accordion drives arrow-key navigation and cannot reach the
   * trigger itself, because it is inside this item's shadow root. Exposing the
   * intent as a method keeps the parent out of the child's internals.
   *
   * ## CSS Custom Properties
   *
   * CSS variables available for styling the component.
   *
   * - `--accordion-item-padding`: Inset of the trigger and content. (default: `undefined`)
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
  "helix-accordion-item": Partial<
    HelixAccordionItemProps &
      HelixAccordionItemSolidJsProps &
      BaseProps<HelixAccordionItem> &
      BaseEvents
  >;

  /**
   * Items sit in a single bordered stack, sharing one rule between neighbours
   * rather than each drawing its own, so the seam between two items is one pixel
   * and not two.
   *
   * ## Attributes & Properties
   *
   * Component attributes and properties that can be applied to the element or by using JavaScript.
   *
   * - `appearance`: Removes the surrounding surface, leaving only the separating rules.
   * - `multiple`: Whether more than one item may be open at once.
   *
   * ## Slots
   *
   * Areas where markup can be added to the component.
   *
   * - `(default)`: The accordion's items.
   *
   * ## CSS Custom Properties
   *
   * CSS variables available for styling the component.
   *
   * - `--accordion-border-color`: Color of the surrounding rule. (default: `undefined`)
   * - `--accordion-radii`: Corner radius of the stack. (default: `undefined`)
   *
   * ## CSS Parts
   *
   * Custom selectors for styling elements within the component.
   *
   * - `container`: The stack of items.
   */
  "helix-accordion": Partial<
    HelixAccordionProps &
      HelixAccordionSolidJsProps &
      BaseProps<HelixAccordion> &
      BaseEvents
  >;

  /**
   * Four appearances and three sizes, all drawn on one control so a link styled
   * as a button and a real button are indistinguishable to a reader. The focus
   * ring is declared here rather than inherited, because the base layer's
   * `:focus-visible` rule is a light-DOM rule and stops at the shadow boundary.
   *
   * ## Attributes & Properties
   *
   * Component attributes and properties that can be applied to the element or by using JavaScript.
   *
   * - `appearance`: How much visual weight the button carries.
   * - `size`: Height and inset of the control.
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
   * ## CSS Custom Properties
   *
   * CSS variables available for styling the component.
   *
   * - `--button-background-color`: Fill behind the button. (default: `undefined`)
   * - `--button-foreground-color`: Label and icon color. (default: `undefined`)
   * - `--button-radii`: Corner radius of the control. (default: `undefined`)
   *
   * ## CSS Parts
   *
   * Custom selectors for styling elements within the component.
   *
   * - `button`: The inner button or anchor.
   */
  "helix-button": Partial<
    HelixButtonProps &
      HelixButtonSolidJsProps &
      BaseProps<HelixButton> &
      BaseEvents
  >;

  /**
   * Tinted from the severity's status color with `color-mix`, and marked with a
   * bar on the inline start so the severity survives being read in greyscale or
   * by anyone who does not distinguish the hues.
   *
   * There is no `appearance` here. `severity` carries the meaning and lives on
   * the headless tier; this tier only decides what that meaning looks like.
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
   * ## CSS Custom Properties
   *
   * CSS variables available for styling the component.
   *
   * - `--callout-background-color`: Fill behind the callout. (default: `undefined`)
   * - `--callout-radii`: Corner radius of the callout. (default: `undefined`)
   *
   * ## CSS Parts
   *
   * Custom selectors for styling elements within the component.
   *
   * - `callout`: The callout body.
   * - `icon`: The icon region.
   * - `content`: The content region.
   */
  "helix-callout": Partial<
    HelixCalloutProps &
      HelixCalloutSolidJsProps &
      BaseProps<HelixCallout> &
      BaseEvents
  >;

  /**
   * Regions are slots: `media`, `header`, the default slot for content, and
   * `footer`. An omitted region takes no space, so a card with only content needs
   * no wrapper markup at all.
   *
   * `media` runs edge to edge and clips to the card's corners, so an image needs
   * no inset correction. Set `orientation="horizontal"` to move it alongside the
   * header, content, and footer stack rather than above it.
   *
   * Regions are bare slots with no wrapper element, so an omitted one occupies no
   * space without the card having to detect that it is missing. Style slotted
   * content directly rather than reaching for a part: a header is whatever
   * element you slotted, not a wrapper we put around it.
   *
   * ## Attributes & Properties
   *
   * Component attributes and properties that can be applied to the element or by using JavaScript.
   *
   * - `appearance`: How the card separates itself from the page.
   * - `dense`: Tightens the inset for dense layouts.
   * - `orientation`: Whether media sits above the content stack or beside it.
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
   * ## CSS Custom Properties
   *
   * CSS variables available for styling the component.
   *
   * - `--card-background-color`: Surface behind the card. (default: `undefined`)
   * - `--card-border-color`: Border color of the surface. (default: `undefined`)
   * - `--card-media-size`: Width of the media column when horizontal. (default: `undefined`)
   * - `--card-padding`: Inset applied to each region. (default: `undefined`)
   * - `--card-radii`: Corner radius of the surface. (default: `undefined`)
   *
   * ## CSS Parts
   *
   * Custom selectors for styling elements within the component.
   *
   * - `container`: The card surface.
   */
  "helix-card": Partial<
    HelixCardProps & HelixCardSolidJsProps & BaseProps<HelixCard> & BaseEvents
  >;

  /**
   * Initials scale with the avatar rather than being sized per size, because the
   * font size is set in `em` against the avatar's own dimension. One rule covers
   * every size, including one a consumer sets themselves through
   * `--avatar-size`.
   *
   * ## Attributes & Properties
   *
   * Component attributes and properties that can be applied to the element or by using JavaScript.
   *
   * - `shape`: Whether the avatar is a circle or a rounded square.
   * - `size`: Edge length of the avatar.
   * - `src`: Image to show. Falls back to initials if it fails to load.
   * - `name`: Name of the person or entity. Used for the label and the initials.
   *
   * ## Slots
   *
   * Areas where markup can be added to the component.
   *
   * - `(default)`: Replaces the image and initials entirely, for an icon.
   *
   * ## CSS Custom Properties
   *
   * CSS variables available for styling the component.
   *
   * - `--avatar-background-color`: Fill behind the initials. (default: `undefined`)
   * - `--avatar-size`: Edge length of the avatar. (default: `undefined`)
   *
   * ## CSS Parts
   *
   * Custom selectors for styling elements within the component.
   *
   * - `avatar`: The avatar body.
   * - `image`: The image, when one is loading or loaded.
   * - `initials`: The initials shown when there is no usable image.
   */
  "helix-avatar": Partial<
    HelixAvatarProps &
      HelixAvatarSolidJsProps &
      BaseProps<HelixAvatar> &
      BaseEvents
  >;

  /**
   * The separator is hidden on the first item with `:host(:first-child)`, so no
   * item needs to know its own index and the parent needs no coordination.
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
   * ## CSS Custom Properties
   *
   * CSS variables available for styling the component.
   *
   * - `--breadcrumbs-separator-color`: Color of the separator. (default: `undefined`)
   *
   * ## CSS Parts
   *
   * Custom selectors for styling elements within the component.
   *
   * - `separator`: The separator preceding the item.
   * - `link`: The item's link, or its text when current.
   */
  "helix-breadcrumbs-item": Partial<
    HelixBreadcrumbsItemProps &
      HelixBreadcrumbsItemSolidJsProps &
      BaseProps<HelixBreadcrumbsItem> &
      BaseEvents
  >;

  /**
   * A single wrapping line by default. The trail wraps rather than scrolling,
   * because a truncated path tells the reader less than a two-line one.
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
   * ## CSS Custom Properties
   *
   * CSS variables available for styling the component.
   *
   * - `--breadcrumbs-gap`: Space between items and separators. (default: `undefined`)
   *
   * ## CSS Parts
   *
   * Custom selectors for styling elements within the component.
   *
   * - `nav`: The navigation landmark.
   * - `list`: The ordered list.
   */
  "helix-breadcrumbs": Partial<
    HelixBreadcrumbsProps &
      HelixBreadcrumbsSolidJsProps &
      BaseProps<HelixBreadcrumbs> &
      BaseEvents
  >;

  /**
   * Sticky and translucent, drawn on the material tokens so the page content
   * blurs behind it rather than being hidden by an opaque bar. The separating
   * rule and shadow appear only once the page has scrolled, which keeps the bar
   * flat against the hero and lifts it off the content afterwards.
   *
   * ## Attributes & Properties
   *
   * Component attributes and properties that can be applied to the element or by using JavaScript.
   *
   * - `sticky`: Whether the banner sticks to the top of the viewport.
   *
   * ## Slots
   *
   * Areas where markup can be added to the component.
   *
   * - `brand`: Wordmark or logo, at the inline start.
   * - `(default)`: Primary navigation.
   * - `actions`: Trailing actions, such as a call to action.
   *
   * ## CSS Custom Properties
   *
   * CSS variables available for styling the component.
   *
   * - `--app-header-background`: Material behind the banner. (default: `undefined`)
   * - `--app-header-height`: Height of the banner. (default: `undefined`)
   * - `--app-header-inset`: Inline padding of the banner. (default: `undefined`)
   * - `--app-header-max-inline-size`: Width the content is centered in. (default: `undefined`)
   *
   * ## CSS Parts
   *
   * Custom selectors for styling elements within the component.
   *
   * - `bar`: The banner itself.
   * - `nav`: The navigation region.
   */
  "helix-app-header": Partial<
    HelixAppHeaderProps &
      HelixAppHeaderSolidJsProps &
      BaseProps<HelixAppHeader> &
      BaseEvents
  >;

  /**
   * A one-pixel rule in the border color, running the full inline size by
   * default. A vertical divider stretches to its flex parent instead of setting
   * its own height, so it matches whatever it sits beside without being told how
   * tall that is.
   *
   * ## Attributes & Properties
   *
   * Component attributes and properties that can be applied to the element or by using JavaScript.
   *
   * - `orientation`: Which way the rule runs.
   *
   * ## CSS Custom Properties
   *
   * CSS variables available for styling the component.
   *
   * - `--divider-color`: Color of the rule. (default: `undefined`)
   * - `--divider-thickness`: Thickness of the rule. (default: `undefined`)
   *
   * ## CSS Parts
   *
   * Custom selectors for styling elements within the component.
   *
   * - `line`: The rule itself.
   */
  "helix-divider": Partial<
    HelixDividerProps &
      HelixDividerSolidJsProps &
      BaseProps<HelixDivider> &
      BaseEvents
  >;

  /**
   * Draws in `currentColor` and sizes from `--icon-size`, so an icon inherits the
   * color of the text it sits in and a container can resize it without reaching
   * for a prop. Inside a button that hook is set in `em`, which keeps the icon in
   * proportion as the button's own size changes.
   *
   * ## Attributes & Properties
   *
   * Component attributes and properties that can be applied to the element or by using JavaScript.
   *
   * - `name`: Name of the icon in the Helix set.
   * - `label`: Accessible name, for an icon that is not decorative.
   *
   * ## CSS Custom Properties
   *
   * CSS variables available for styling the component.
   *
   * - `--icon-size`: Edge length of the icon's box. (default: `undefined`)
   *
   * ## CSS Parts
   *
   * Custom selectors for styling elements within the component.
   *
   * - `svg`: The rendered SVG.
   */
  "helix-icon": Partial<
    HelixIconProps & HelixIconSolidJsProps & BaseProps<HelixIcon> & BaseEvents
  >;

  /**
   * Five appearances, drawn as a tinted fill derived from the status color with
   * `color-mix` rather than from a token per status. The alternative was eight
   * new tokens whose only job was to be a lighter version of one that already
   * existed, and they would have had to be re-derived by every theme.
   *
   * ## Attributes & Properties
   *
   * Component attributes and properties that can be applied to the element or by using JavaScript.
   *
   * - `appearance`: Which status the tag reports.
   * - `size`: Height and inset of the tag.
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
   * ## CSS Custom Properties
   *
   * CSS variables available for styling the component.
   *
   * - `--tag-background-color`: Fill behind the tag. (default: `undefined`)
   * - `--tag-foreground-color`: Label color. (default: `undefined`)
   * - `--tag-radii`: Corner radius of the tag. (default: `undefined`)
   *
   * ## CSS Parts
   *
   * Custom selectors for styling elements within the component.
   *
   * - `tag`: The tag body.
   * - `remove`: The remove button, when `removable`.
   */
  "helix-tag": Partial<
    HelixTagProps & HelixTagSolidJsProps & BaseProps<HelixTag> & BaseEvents
  >;
};

export type CustomCssProperties = {
  /** Inset of the trigger and content. */
  "--accordion-item-padding"?: string;
  /** Color of the surrounding rule. */
  "--accordion-border-color"?: string;
  /** Corner radius of the stack. */
  "--accordion-radii"?: string;
  /** Fill behind the button. */
  "--button-background-color"?: string;
  /** Label and icon color. */
  "--button-foreground-color"?: string;
  /** Corner radius of the control. */
  "--button-radii"?: string;
  /** Fill behind the callout. */
  "--callout-background-color"?: string;
  /** Corner radius of the callout. */
  "--callout-radii"?: string;
  /** Surface behind the card. */
  "--card-background-color"?: string;
  /** Border color of the surface. */
  "--card-border-color"?: string;
  /** Width of the media column when horizontal. */
  "--card-media-size"?: string;
  /** Inset applied to each region. */
  "--card-padding"?: string;
  /** Corner radius of the surface. */
  "--card-radii"?: string;
  /** Fill behind the initials. */
  "--avatar-background-color"?: string;
  /** Edge length of the avatar. */
  "--avatar-size"?: string;
  /** Color of the separator. */
  "--breadcrumbs-separator-color"?: string;
  /** Space between items and separators. */
  "--breadcrumbs-gap"?: string;
  /** Material behind the banner. */
  "--app-header-background"?: string;
  /** Height of the banner. */
  "--app-header-height"?: string;
  /** Inline padding of the banner. */
  "--app-header-inset"?: string;
  /** Width the content is centered in. */
  "--app-header-max-inline-size"?: string;
  /** Color of the rule. */
  "--divider-color"?: string;
  /** Thickness of the rule. */
  "--divider-thickness"?: string;
  /** Edge length of the icon's box. */
  "--icon-size"?: string;
  /** Fill behind the tag. */
  "--tag-background-color"?: string;
  /** Label color. */
  "--tag-foreground-color"?: string;
  /** Corner radius of the tag. */
  "--tag-radii"?: string;
};

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
