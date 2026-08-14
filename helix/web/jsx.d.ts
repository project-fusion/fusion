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
  HelixDrawer,
  HelixFlex,
  HelixGrid,
  HelixIcon,
  HelixIconButton,
  HelixOpenChangeEvent,
  HelixRemoveRequestEvent,
  HelixSelectionChangeEvent,
  HelixTable,
  HelixTableCell,
  HelixTableRow,
  HelixTabs,
  HelixTabsPanel,
  HelixTabsTab,
  HelixTag,
  HelixText,
  HelixToggleGroup,
  HelixToggleGroupItem,
  HelixToolbar,
  HelixTree,
  HelixTreeItem,
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

export type HelixAppHeaderProps = {
  /** Whether the banner is flat or a pane of material.

Flat by default. Material is translucency plus blur, and a filter makes the
header a containing block for `position: fixed` descendants, so any overlay
rendered inside it is positioned against the header rather than the
viewport. Opt in knowing that. */
  appearance?: HelixAppHeader["appearance"];
  /** Whether the banner sticks to the top of the viewport.

Opt in, because a reflected `true` writes an attribute the server's markup
does not have. Every default here is the absent attribute. */
  sticky?: HelixAppHeader["sticky"];
  /** Where the navigation sits in the bar.

Centred by default, which reads as the site's spine when the navigation is
the primary thing in the header rather than an afterthought beside a logo.
Centred against the banner rather than against whatever space the brand
left over, so the middle of the nav is the middle of the window whatever
the wordmark and the actions happen to measure.

`start` is the opt-out, for a header whose navigation trails the brand. */
  "nav-align"?: HelixAppHeader["navAlign"];
  /** Where the navigation sits in the bar.

Centred by default, which reads as the site's spine when the navigation is
the primary thing in the header rather than an afterthought beside a logo.
Centred against the banner rather than against whatever space the brand
left over, so the middle of the nav is the middle of the window whatever
the wordmark and the actions happen to measure.

`start` is the opt-out, for a header whose navigation trails the brand. */
  navAlign?: HelixAppHeader["navAlign"];
};

export type HelixAppHeaderSolidJsProps = {
  /** Whether the banner is flat or a pane of material.

Flat by default. Material is translucency plus blur, and a filter makes the
header a containing block for `position: fixed` descendants, so any overlay
rendered inside it is positioned against the header rather than the
viewport. Opt in knowing that. */
  "prop:appearance"?: HelixAppHeader["appearance"];
  /** Whether the banner sticks to the top of the viewport.

Opt in, because a reflected `true` writes an attribute the server's markup
does not have. Every default here is the absent attribute. */
  "prop:sticky"?: HelixAppHeader["sticky"];
  /** Where the navigation sits in the bar.

Centred by default, which reads as the site's spine when the navigation is
the primary thing in the header rather than an afterthought beside a logo.
Centred against the banner rather than against whatever space the brand
left over, so the middle of the nav is the middle of the window whatever
the wordmark and the actions happen to measure.

`start` is the opt-out, for a header whose navigation trails the brand. */
  "attr:nav-align"?: HelixAppHeader["navAlign"];
  /** Where the navigation sits in the bar.

Centred by default, which reads as the site's spine when the navigation is
the primary thing in the header rather than an afterthought beside a logo.
Centred against the banner rather than against whatever space the brand
left over, so the middle of the nav is the middle of the window whatever
the wordmark and the actions happen to measure.

`start` is the opt-out, for a header whose navigation trails the brand. */
  "prop:navAlign"?: HelixAppHeader["navAlign"];

  /** Set the innerHTML of the element */
  innerHTML?: string;
  /** Set the textContent of the element */
  textContent?: string | number;
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
  /** Where the open indicator sits, or whether there is one.

`auto` resolves to `end`, which is where a reader scanning a list of
summaries expects it: the label starts at the same x on every row, and the
indicator is found once at the edge rather than shifting with the text.
`start` is for a tree-like reading, where the indicator leads the label.
`none` is for a row that carries its own affordance and would otherwise
have two. */
  "chevron-placement"?: HelixAccordionItem["chevronPlacement"];
  /** Where the open indicator sits, or whether there is one.

`auto` resolves to `end`, which is where a reader scanning a list of
summaries expects it: the label starts at the same x on every row, and the
indicator is found once at the edge rather than shifting with the text.
`start` is for a tree-like reading, where the indicator leads the label.
`none` is for a row that carries its own affordance and would otherwise
have two. */
  chevronPlacement?: HelixAccordionItem["chevronPlacement"];

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
  /** Where the open indicator sits, or whether there is one.

`auto` resolves to `end`, which is where a reader scanning a list of
summaries expects it: the label starts at the same x on every row, and the
indicator is found once at the edge rather than shifting with the text.
`start` is for a tree-like reading, where the indicator leads the label.
`none` is for a row that carries its own affordance and would otherwise
have two. */
  "attr:chevron-placement"?: HelixAccordionItem["chevronPlacement"];
  /** Where the open indicator sits, or whether there is one.

`auto` resolves to `end`, which is where a reader scanning a list of
summaries expects it: the label starts at the same x on every row, and the
indicator is found once at the edge rather than shifting with the text.
`start` is for a tree-like reading, where the indicator leads the label.
`none` is for a row that carries its own affordance and would otherwise
have two. */
  "prop:chevronPlacement"?: HelixAccordionItem["chevronPlacement"];
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
  /** Accessible name, for a button whose content is not text.

Lives here rather than only on `IconButton` so the two share one render.
An icon-only button without it is a control a screen reader announces as
"button" and nothing else. */
  label?: HelixButton["label"];
  /** Whether the control is non-interactive.

Reflected, because the styled tier selects on it, and mirrored to
`aria-disabled` rather than removing the element from the accessibility
tree, so a screen reader can still announce that the control exists. */
  disabled?: HelixButton["disabled"];
  /** Whether the button holds its group's tab stop.

A toolbar keeps one tab stop across its children, and the obvious way to do
that is to write `tabindex` onto each of them. That is a change to markup
the consumer rendered, so a React consumer's hydration reports it and does
not patch it up. A parent sets this property instead, which writes nothing,
and the stop lands on the inner control inside the shadow root.

No attribute, because it is coordination between elements rather than
anything a consumer sets. */
  focusable?: HelixButton["focusable"];
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
  /** Accessible name, for a button whose content is not text.

Lives here rather than only on `IconButton` so the two share one render.
An icon-only button without it is a control a screen reader announces as
"button" and nothing else. */
  "prop:label"?: HelixButton["label"];
  /** Whether the control is non-interactive.

Reflected, because the styled tier selects on it, and mirrored to
`aria-disabled` rather than removing the element from the accessibility
tree, so a screen reader can still announce that the control exists. */
  "prop:disabled"?: HelixButton["disabled"];
  /** Whether the button holds its group's tab stop.

A toolbar keeps one tab stop across its children, and the obvious way to do
that is to write `tabindex` onto each of them. That is a change to markup
the consumer rendered, so a React consumer's hydration reports it and does
not patch it up. A parent sets this property instead, which writes nothing,
and the stop lands on the inner control inside the shadow root.

No attribute, because it is coordination between elements rather than
anything a consumer sets. */
  "prop:focusable"?: HelixButton["focusable"];

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

export type HelixFlexProps = {
  /** Whether items run across or down. */
  direction?: HelixFlex["direction"];
  /** Space between items, named on the space scale. */
  gap?: HelixFlex["gap"];
  /** Alignment across the direction. */
  align?: HelixFlex["align"];
  /** Distribution along the direction. */
  justify?: HelixFlex["justify"];
  /** Whether items wrap onto more lines. */
  wrap?: HelixFlex["wrap"];
  /** Flows with surrounding text instead of taking the full width. */
  inline?: HelixFlex["inline"];
};

export type HelixFlexSolidJsProps = {
  /** Whether items run across or down. */
  "prop:direction"?: HelixFlex["direction"];
  /** Space between items, named on the space scale. */
  "prop:gap"?: HelixFlex["gap"];
  /** Alignment across the direction. */
  "prop:align"?: HelixFlex["align"];
  /** Distribution along the direction. */
  "prop:justify"?: HelixFlex["justify"];
  /** Whether items wrap onto more lines. */
  "prop:wrap"?: HelixFlex["wrap"];
  /** Flows with surrounding text instead of taking the full width. */
  "prop:inline"?: HelixFlex["inline"];

  /** Set the innerHTML of the element */
  innerHTML?: string;
  /** Set the textContent of the element */
  textContent?: string | number;
};

/** `HelixDrawer` component event */
export type HelixDrawerElementEvent<E = Event> = TypedEvent<HelixDrawer, E>;
/** `OpenChange` event type */
export type HelixDrawerOpenChangeElementEvent =
  HelixDrawerElementEvent<HelixOpenChangeEvent>;

export type HelixDrawerProps = {
  /** Removes the panel's own surface, for a drawer inside another surface. */
  appearance?: HelixDrawer["appearance"];
  /** Whether the element is open. Setting this enters controlled mode. */
  open?: HelixDrawer["open"];
  /** Initial open state for uncontrolled use. Ignored once `open` is set. */
  "default-open"?: HelixDrawer["defaultOpen"];
  /** Initial open state for uncontrolled use. Ignored once `open` is set. */
  defaultOpen?: HelixDrawer["defaultOpen"];
  /** Which edge the drawer comes from. */
  placement?: HelixDrawer["placement"];
  /** Accessible name for the panel. */
  label?: HelixDrawer["label"];
  /** Whether the drawer blocks the page behind it.

Turning this off removes the focus trap and the scrim together, because
they are one decision: a panel that traps focus without covering the page
strands the reader, and one that covers without trapping lets them tab
behind the cover.

Not reflected. It stays `true` by default, since a drawer that silently
lost its focus trap because a consumer forgot a word would be worse than an
attribute on the host, and nothing selects on it: the scrim is rendered or
not, rather than shown or hidden by CSS. */
  modal?: HelixDrawer["modal"];

  /** Fired when the drawer opens or closes. */
  onOpenChange?: (e: HelixDrawerOpenChangeElementEvent) => void;
};

export type HelixDrawerSolidJsProps = {
  /** Removes the panel's own surface, for a drawer inside another surface. */
  "prop:appearance"?: HelixDrawer["appearance"];
  /** Whether the element is open. Setting this enters controlled mode. */
  "prop:open"?: HelixDrawer["open"];
  /** Initial open state for uncontrolled use. Ignored once `open` is set. */
  "bool:default-open"?: HelixDrawer["defaultOpen"];
  /** Initial open state for uncontrolled use. Ignored once `open` is set. */
  "prop:defaultOpen"?: HelixDrawer["defaultOpen"];
  /** Which edge the drawer comes from. */
  "prop:placement"?: HelixDrawer["placement"];
  /** Accessible name for the panel. */
  "prop:label"?: HelixDrawer["label"];
  /** Whether the drawer blocks the page behind it.

Turning this off removes the focus trap and the scrim together, because
they are one decision: a panel that traps focus without covering the page
strands the reader, and one that covers without trapping lets them tab
behind the cover.

Not reflected. It stays `true` by default, since a drawer that silently
lost its focus trap because a consumer forgot a word would be worse than an
attribute on the host, and nothing selects on it: the scrim is rendered or
not, rather than shown or hidden by CSS. */
  "prop:modal"?: HelixDrawer["modal"];
  /** Fired when the drawer opens or closes. */
  "on:OpenChange"?: (e: HelixDrawerOpenChangeElementEvent) => void;

  /** Set the innerHTML of the element */
  innerHTML?: string;
  /** Set the textContent of the element */
  textContent?: string | number;
};

export type HelixGridProps = {
  /** Fixed number of equal columns. */
  columns?: HelixGrid["columns"];
  /** Minimum column width, filling as many as fit.

Takes precedence over `columns`: a grid that both fixes a count and reflows
is two intentions in one element. */
  min?: HelixGrid["min"];
  /** Space between cells, named on the space scale. */
  gap?: HelixGrid["gap"];
  /** Alignment of each cell within its row. */
  align?: HelixGrid["align"];
};

export type HelixGridSolidJsProps = {
  /** Fixed number of equal columns. */
  "prop:columns"?: HelixGrid["columns"];
  /** Minimum column width, filling as many as fit.

Takes precedence over `columns`: a grid that both fixes a count and reflows
is two intentions in one element. */
  "prop:min"?: HelixGrid["min"];
  /** Space between cells, named on the space scale. */
  "prop:gap"?: HelixGrid["gap"];
  /** Alignment of each cell within its row. */
  "prop:align"?: HelixGrid["align"];

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

export type HelixIconButtonProps = {
  /** How much visual weight the button carries. */
  appearance?: HelixIconButton["appearance"];
  /** Edge length of the control. */
  size?: HelixIconButton["size"];
  /** What activating the button does to its form. */
  type?: HelixIconButton["type"];
  /** Navigates to this URL instead of acting on a form. */
  href?: HelixIconButton["href"];
  /** Browsing context for `href`, such as `_blank`. */
  target?: HelixIconButton["target"];
  /** Relationship of the linked URL, defaulted when `target` opens a new tab. */
  rel?: HelixIconButton["rel"];
  /** Accessible name, for a button whose content is not text.

Lives here rather than only on `IconButton` so the two share one render.
An icon-only button without it is a control a screen reader announces as
"button" and nothing else. */
  label?: HelixIconButton["label"];
  /** Whether the control is non-interactive.

Reflected, because the styled tier selects on it, and mirrored to
`aria-disabled` rather than removing the element from the accessibility
tree, so a screen reader can still announce that the control exists. */
  disabled?: HelixIconButton["disabled"];
  /** Whether the button holds its group's tab stop.

A toolbar keeps one tab stop across its children, and the obvious way to do
that is to write `tabindex` onto each of them. That is a change to markup
the consumer rendered, so a React consumer's hydration reports it and does
not patch it up. A parent sets this property instead, which writes nothing,
and the stop lands on the inner control inside the shadow root.

No attribute, because it is coordination between elements rather than
anything a consumer sets. */
  focusable?: HelixIconButton["focusable"];
};

export type HelixIconButtonSolidJsProps = {
  /** How much visual weight the button carries. */
  "prop:appearance"?: HelixIconButton["appearance"];
  /** Edge length of the control. */
  "prop:size"?: HelixIconButton["size"];
  /** What activating the button does to its form. */
  "prop:type"?: HelixIconButton["type"];
  /** Navigates to this URL instead of acting on a form. */
  "prop:href"?: HelixIconButton["href"];
  /** Browsing context for `href`, such as `_blank`. */
  "prop:target"?: HelixIconButton["target"];
  /** Relationship of the linked URL, defaulted when `target` opens a new tab. */
  "prop:rel"?: HelixIconButton["rel"];
  /** Accessible name, for a button whose content is not text.

Lives here rather than only on `IconButton` so the two share one render.
An icon-only button without it is a control a screen reader announces as
"button" and nothing else. */
  "prop:label"?: HelixIconButton["label"];
  /** Whether the control is non-interactive.

Reflected, because the styled tier selects on it, and mirrored to
`aria-disabled` rather than removing the element from the accessibility
tree, so a screen reader can still announce that the control exists. */
  "prop:disabled"?: HelixIconButton["disabled"];
  /** Whether the button holds its group's tab stop.

A toolbar keeps one tab stop across its children, and the obvious way to do
that is to write `tabindex` onto each of them. That is a change to markup
the consumer rendered, so a React consumer's hydration reports it and does
not patch it up. A parent sets this property instead, which writes nothing,
and the stop lands on the inner control inside the shadow root.

No attribute, because it is coordination between elements rather than
anything a consumer sets. */
  "prop:focusable"?: HelixIconButton["focusable"];

  /** Set the innerHTML of the element */
  innerHTML?: string;
  /** Set the textContent of the element */
  textContent?: string | number;
};

export type HelixTableCellProps = {
  /** Whether the cell heads its column. */
  header?: HelixTableCell["header"];
};

export type HelixTableCellSolidJsProps = {
  /** Whether the cell heads its column. */
  "prop:header"?: HelixTableCell["header"];

  /** Set the innerHTML of the element */
  innerHTML?: string;
  /** Set the textContent of the element */
  textContent?: string | number;
};

export type HelixTableProps = {
  /** Column track list, as CSS.

A raw track list rather than a count, because a table's columns are rarely
equal: `16rem minmax(0, 1fr)` is the common shape and no count expresses it. */
  columns?: HelixTable["columns"];
  /** Accessible name for the table. */
  label?: HelixTable["label"];
};

export type HelixTableSolidJsProps = {
  /** Column track list, as CSS.

A raw track list rather than a count, because a table's columns are rarely
equal: `16rem minmax(0, 1fr)` is the common shape and no count expresses it. */
  "prop:columns"?: HelixTable["columns"];
  /** Accessible name for the table. */
  "prop:label"?: HelixTable["label"];

  /** Set the innerHTML of the element */
  innerHTML?: string;
  /** Set the textContent of the element */
  textContent?: string | number;
};

export type HelixTableRowProps = {};

export type HelixTableRowSolidJsProps = {
  /** Set the innerHTML of the element */
  innerHTML?: string;
  /** Set the textContent of the element */
  textContent?: string | number;
};

export type HelixTabsPanelProps = {
  /** Pairs the panel with the tab of the same value. */
  value?: HelixTabsPanel["value"];
  /** Whether this panel is the visible one. */
  selected?: HelixTabsPanel["selected"];
};

export type HelixTabsPanelSolidJsProps = {
  /** Pairs the panel with the tab of the same value. */
  "prop:value"?: HelixTabsPanel["value"];
  /** Whether this panel is the visible one. */
  "prop:selected"?: HelixTabsPanel["selected"];

  /** Set the innerHTML of the element */
  innerHTML?: string;
  /** Set the textContent of the element */
  textContent?: string | number;
};

/** `HelixTabsTab` component event */
export type HelixTabsTabElementEvent<E = Event> = TypedEvent<HelixTabsTab, E>;
/** `SelectionChange` event type */
export type HelixTabsTabSelectionChangeElementEvent =
  HelixTabsTabElementEvent<HelixSelectionChangeEvent>;

export type HelixTabsTabProps = {
  /** Identifies the tab, and pairs it with the panel of the same value. */
  value?: HelixTabsTab["value"];
  /** Whether this tab is the current one. */
  selected?: HelixTabsTab["selected"];
  /** Whether the tab can be chosen. */
  disabled?: HelixTabsTab["disabled"];

  /** Fired when the tab is chosen. */
  onSelectionChange?: (e: HelixTabsTabSelectionChangeElementEvent) => void;
};

export type HelixTabsTabSolidJsProps = {
  /** Identifies the tab, and pairs it with the panel of the same value. */
  "prop:value"?: HelixTabsTab["value"];
  /** Whether this tab is the current one. */
  "prop:selected"?: HelixTabsTab["selected"];
  /** Whether the tab can be chosen. */
  "prop:disabled"?: HelixTabsTab["disabled"];
  /** Fired when the tab is chosen. */
  "on:SelectionChange"?: (e: HelixTabsTabSelectionChangeElementEvent) => void;

  /** Set the innerHTML of the element */
  innerHTML?: string;
  /** Set the textContent of the element */
  textContent?: string | number;
};

/** `HelixTabs` component event */
export type HelixTabsElementEvent<E = Event> = TypedEvent<HelixTabs, E>;
/** `SelectionChange` event type */
export type HelixTabsSelectionChangeElementEvent =
  HelixTabsElementEvent<HelixSelectionChangeEvent>;

export type HelixTabsProps = {
  /** Accessible name for the tab list. */
  label?: HelixTabs["label"];
  /** Value of the selected tab. */
  value?: HelixTabs["value"];
  /** Whether arrowing to a tab also selects it.

Automatic is the default because showing a panel is usually cheap. Set this
where it is not, so a reader arrowing past four tabs does not load four
panels on the way. */
  manual?: HelixTabs["manual"];

  /** Fired when a tab is chosen. Dispatched by the tab and listened for here, because the root is what a consumer holds. */
  onSelectionChange?: (e: HelixTabsSelectionChangeElementEvent) => void;
};

export type HelixTabsSolidJsProps = {
  /** Accessible name for the tab list. */
  "prop:label"?: HelixTabs["label"];
  /** Value of the selected tab. */
  "prop:value"?: HelixTabs["value"];
  /** Whether arrowing to a tab also selects it.

Automatic is the default because showing a panel is usually cheap. Set this
where it is not, so a reader arrowing past four tabs does not load four
panels on the way. */
  "prop:manual"?: HelixTabs["manual"];
  /** Fired when a tab is chosen. Dispatched by the tab and listened for here, because the root is what a consumer holds. */
  "on:SelectionChange"?: (e: HelixTabsSelectionChangeElementEvent) => void;

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

export type HelixTextProps = {
  /** Which element to render. Decides the outline and the semantics. */
  as?: HelixText["as"];
  /** Type treatment. Defaults to the one that matches `as`. */
  appearance?: HelixText["appearance"];
  /** Colour role. Separate from `appearance`, because colour carries state. */
  tone?: HelixText["tone"];
};

export type HelixTextSolidJsProps = {
  /** Which element to render. Decides the outline and the semantics. */
  "prop:as"?: HelixText["as"];
  /** Type treatment. Defaults to the one that matches `as`. */
  "prop:appearance"?: HelixText["appearance"];
  /** Colour role. Separate from `appearance`, because colour carries state. */
  "prop:tone"?: HelixText["tone"];

  /** Set the innerHTML of the element */
  innerHTML?: string;
  /** Set the textContent of the element */
  textContent?: string | number;
};

/** `HelixToggleGroupItem` component event */
export type HelixToggleGroupItemElementEvent<E = Event> = TypedEvent<
  HelixToggleGroupItem,
  E
>;
/** `SelectionChange` event type */
export type HelixToggleGroupItemSelectionChangeElementEvent =
  HelixToggleGroupItemElementEvent<HelixSelectionChangeEvent>;

export type HelixToggleGroupItemProps = {
  /** Identifies the item to the group. */
  value?: HelixToggleGroupItem["value"];
  /** Makes the item a link rather than a radio. */
  href?: HelixToggleGroupItem["href"];
  /** Whether this item is the current one. */
  selected?: HelixToggleGroupItem["selected"];
  /** Whether the item can be chosen. */
  disabled?: HelixToggleGroupItem["disabled"];

  /** Fired when the item is chosen. */
  onSelectionChange?: (
    e: HelixToggleGroupItemSelectionChangeElementEvent,
  ) => void;
};

export type HelixToggleGroupItemSolidJsProps = {
  /** Identifies the item to the group. */
  "prop:value"?: HelixToggleGroupItem["value"];
  /** Makes the item a link rather than a radio. */
  "prop:href"?: HelixToggleGroupItem["href"];
  /** Whether this item is the current one. */
  "prop:selected"?: HelixToggleGroupItem["selected"];
  /** Whether the item can be chosen. */
  "prop:disabled"?: HelixToggleGroupItem["disabled"];
  /** Fired when the item is chosen. */
  "on:SelectionChange"?: (
    e: HelixToggleGroupItemSelectionChangeElementEvent,
  ) => void;

  /** Set the innerHTML of the element */
  innerHTML?: string;
  /** Set the textContent of the element */
  textContent?: string | number;
};

export type HelixToolbarProps = {
  /** Accessible name for the toolbar. */
  label?: HelixToolbar["label"];
  /** Which way the arrow keys move. */
  orientation?: HelixToolbar["orientation"];
};

export type HelixToolbarSolidJsProps = {
  /** Accessible name for the toolbar. */
  "prop:label"?: HelixToolbar["label"];
  /** Which way the arrow keys move. */
  "prop:orientation"?: HelixToolbar["orientation"];

  /** Set the innerHTML of the element */
  innerHTML?: string;
  /** Set the textContent of the element */
  textContent?: string | number;
};

/** `HelixToggleGroup` component event */
export type HelixToggleGroupElementEvent<E = Event> = TypedEvent<
  HelixToggleGroup,
  E
>;
/** `SelectionChange` event type */
export type HelixToggleGroupSelectionChangeElementEvent =
  HelixToggleGroupElementEvent<HelixSelectionChangeEvent>;

export type HelixToggleGroupProps = {
  /** How much chrome the group carries around its items. */
  appearance?: HelixToggleGroup["appearance"];
  /** Height and inset of the items. */
  size?: HelixToggleGroup["size"];
  /** Accessible name for the group. */
  label?: HelixToggleGroup["label"];
  /** Value of the selected item. */
  value?: HelixToggleGroup["value"];
  /** Renders items as links in a navigation landmark rather than as radios. */
  nav?: HelixToggleGroup["nav"];

  /** Fired when an item is chosen. Dispatched by the item and listened for here. */
  onSelectionChange?: (e: HelixToggleGroupSelectionChangeElementEvent) => void;
};

export type HelixToggleGroupSolidJsProps = {
  /** How much chrome the group carries around its items. */
  "prop:appearance"?: HelixToggleGroup["appearance"];
  /** Height and inset of the items. */
  "prop:size"?: HelixToggleGroup["size"];
  /** Accessible name for the group. */
  "prop:label"?: HelixToggleGroup["label"];
  /** Value of the selected item. */
  "prop:value"?: HelixToggleGroup["value"];
  /** Renders items as links in a navigation landmark rather than as radios. */
  "prop:nav"?: HelixToggleGroup["nav"];
  /** Fired when an item is chosen. Dispatched by the item and listened for here. */
  "on:SelectionChange"?: (
    e: HelixToggleGroupSelectionChangeElementEvent,
  ) => void;

  /** Set the innerHTML of the element */
  innerHTML?: string;
  /** Set the textContent of the element */
  textContent?: string | number;
};

/** `HelixTreeItem` component event */
export type HelixTreeItemElementEvent<E = Event> = TypedEvent<HelixTreeItem, E>;
/** `SelectionChange` event type */
export type HelixTreeItemSelectionChangeElementEvent =
  HelixTreeItemElementEvent<HelixSelectionChangeEvent>;

export type HelixTreeItemProps = {
  /** Identifies the item to the consumer, carried in `SelectionChange`. */
  value?: HelixTreeItem["value"];
  /** Whether this item is the current one. */
  selected?: HelixTreeItem["selected"];
  /** Whether a branch is showing its children. */
  expanded?: HelixTreeItem["expanded"];
  /** Depth from the root, set by the tree so indentation needs no CSS nesting.

Not reflected. The tree assigns this after it upgrades, so an attribute
here would be a change to markup the consumer rendered and hydration would
report it. The indent it drives is written onto the row instead, inside the
shadow root, which is not part of the tree React hydrates. */
  level?: HelixTreeItem["level"];
  /** Whether this item holds the tree's single tab stop. */
  focusable?: HelixTreeItem["focusable"];

  /** Fired when the item is chosen. */
  onSelectionChange?: (e: HelixTreeItemSelectionChangeElementEvent) => void;
};

export type HelixTreeItemSolidJsProps = {
  /** Identifies the item to the consumer, carried in `SelectionChange`. */
  "prop:value"?: HelixTreeItem["value"];
  /** Whether this item is the current one. */
  "prop:selected"?: HelixTreeItem["selected"];
  /** Whether a branch is showing its children. */
  "prop:expanded"?: HelixTreeItem["expanded"];
  /** Depth from the root, set by the tree so indentation needs no CSS nesting.

Not reflected. The tree assigns this after it upgrades, so an attribute
here would be a change to markup the consumer rendered and hydration would
report it. The indent it drives is written onto the row instead, inside the
shadow root, which is not part of the tree React hydrates. */
  "prop:level"?: HelixTreeItem["level"];
  /** Whether this item holds the tree's single tab stop. */
  "prop:focusable"?: HelixTreeItem["focusable"];
  /** Fired when the item is chosen. */
  "on:SelectionChange"?: (e: HelixTreeItemSelectionChangeElementEvent) => void;

  /** Set the innerHTML of the element */
  innerHTML?: string;
  /** Set the textContent of the element */
  textContent?: string | number;
};

/** `HelixTree` component event */
export type HelixTreeElementEvent<E = Event> = TypedEvent<HelixTree, E>;
/** `SelectionChange` event type */
export type HelixTreeSelectionChangeElementEvent =
  HelixTreeElementEvent<HelixSelectionChangeEvent>;

export type HelixTreeProps = {
  /** Accessible name for the tree. */
  label?: HelixTree["label"];
  /** Value of the selected item, kept in step with the items themselves. */
  value?: HelixTree["value"];

  /** Fired when an item is chosen. Dispatched by the item and listened for here, because the tree is what a consumer holds a reference to. */
  onSelectionChange?: (e: HelixTreeSelectionChangeElementEvent) => void;
};

export type HelixTreeSolidJsProps = {
  /** Accessible name for the tree. */
  "prop:label"?: HelixTree["label"];
  /** Value of the selected item, kept in step with the items themselves. */
  "prop:value"?: HelixTree["value"];
  /** Fired when an item is chosen. Dispatched by the item and listened for here, because the tree is what a consumer holds a reference to. */
  "on:SelectionChange"?: (e: HelixTreeSelectionChangeElementEvent) => void;

  /** Set the innerHTML of the element */
  innerHTML?: string;
  /** Set the textContent of the element */
  textContent?: string | number;
};

export type CustomElements = {
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
   * - `appearance`: Whether the banner is flat or a pane of material.
   *
   * Flat by default. Material is translucency plus blur, and a filter makes the
   * header a containing block for `position: fixed` descendants, so any overlay
   * rendered inside it is positioned against the header rather than the
   * viewport. Opt in knowing that.
   * - `sticky`: Whether the banner sticks to the top of the viewport.
   *
   * Opt in, because a reflected `true` writes an attribute the server's markup
   * does not have. Every default here is the absent attribute.
   * - `nav-align`/`navAlign`: Where the navigation sits in the bar.
   *
   * Centred by default, which reads as the site's spine when the navigation is
   * the primary thing in the header rather than an afterthought beside a logo.
   * Centred against the banner rather than against whatever space the brand
   * left over, so the middle of the nav is the middle of the window whatever
   * the wordmark and the actions happen to measure.
   *
   * `start` is the opt-out, for a header whose navigation trails the brand.
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
   * - `--app-header-background`: Fill behind the banner. (default: `undefined`)
   * - `--app-header-height`: Height of the banner. (default: `undefined`)
   * - `--app-header-inset`: Inline padding of the banner. (default: `undefined`)
   * - `--app-header-max-inline-size`: Width the content is centered in. (default: `undefined`)
   *
   * ## CSS Parts
   *
   * Custom selectors for styling elements within the component.
   *
   * - `content`: The centred row inside the banner.
   * - `nav`: The navigation region.
   * - `brand`: The leading region.
   * - `actions`: The trailing region.
   */
  "helix-app-header": Partial<
    HelixAppHeaderProps & BaseProps<HelixAppHeader> & BaseEvents
  >;

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
   * - `chevron-placement`/`chevronPlacement`: Where the open indicator sits, or whether there is one.
   *
   * `auto` resolves to `end`, which is where a reader scanning a list of
   * summaries expects it: the label starts at the same x on every row, and the
   * indicator is found once at the edge rather than shifting with the text.
   * `start` is for a tree-like reading, where the indicator leads the label.
   * `none` is for a row that carries its own affordance and would otherwise
   * have two.
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
   * - `chevron`: The open and close indicator.
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
   * - `label`: Accessible name, for a button whose content is not text.
   *
   * Lives here rather than only on `IconButton` so the two share one render.
   * An icon-only button without it is a control a screen reader announces as
   * "button" and nothing else.
   * - `disabled`: Whether the control is non-interactive.
   *
   * Reflected, because the styled tier selects on it, and mirrored to
   * `aria-disabled` rather than removing the element from the accessibility
   * tree, so a screen reader can still announce that the control exists.
   * - `focusable`: Whether the button holds its group's tab stop.
   *
   * A toolbar keeps one tab stop across its children, and the obvious way to do
   * that is to write `tabindex` onto each of them. That is a change to markup
   * the consumer rendered, so a React consumer's hydration reports it and does
   * not patch it up. A parent sets this property instead, which writes nothing,
   * and the stop lands on the inner control inside the shadow root.
   *
   * No attribute, because it is coordination between elements rather than
   * anything a consumer sets. (property only)
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
   */
  "helix-card": Partial<HelixCardProps & BaseProps<HelixCard> & BaseEvents>;

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
   * - `icon`: The icon region.
   * - `content`: The content region.
   */
  "helix-callout": Partial<
    HelixCalloutProps & BaseProps<HelixCallout> & BaseEvents
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
   * The host is the flex container itself and the only child is a slot, so the
   * element adds no box of its own: `<helix-flex>` costs exactly the `<div>` it
   * replaces.
   *
   * There is no separate Stack. A stack is this with `direction="column"`, and a
   * second element whose whole definition is one default of the first is a name
   * to learn rather than a capability to gain.
   *
   * Gap takes a space token name rather than a length, so spacing stays on the
   * scale. A layout that can say `gap="13px"` is one that will.
   *
   * Presentation only, so there is no headless tier: the split exists to keep
   * behavior separate from styling, and this is entirely styling.
   *
   * ## Attributes & Properties
   *
   * Component attributes and properties that can be applied to the element or by using JavaScript.
   *
   * - `direction`: Whether items run across or down.
   * - `gap`: Space between items, named on the space scale.
   * - `align`: Alignment across the direction.
   * - `justify`: Distribution along the direction.
   * - `wrap`: Whether items wrap onto more lines.
   * - `inline`: Flows with surrounding text instead of taking the full width.
   *
   * ## Slots
   *
   * Areas where markup can be added to the component.
   *
   * - `(default)`: The items to lay out.
   */
  "helix-flex": Partial<HelixFlexProps & BaseProps<HelixFlex> & BaseEvents>;

  /**
   * The panel translates and the scrim fades, both on transform and opacity only,
   * which is the one place motion is allowed to carry the work: the surface at
   * rest is flat and the movement is what says something happened.
   *
   * ## Attributes & Properties
   *
   * Component attributes and properties that can be applied to the element or by using JavaScript.
   *
   * - `appearance`: Removes the panel's own surface, for a drawer inside another surface.
   * - `open`: Whether the element is open. Setting this enters controlled mode.
   * - `default-open`/`defaultOpen`: Initial open state for uncontrolled use. Ignored once `open` is set.
   * - `placement`: Which edge the drawer comes from.
   * - `label`: Accessible name for the panel.
   * - `modal`: Whether the drawer blocks the page behind it.
   *
   * Turning this off removes the focus trap and the scrim together, because
   * they are one decision: a panel that traps focus without covering the page
   * strands the reader, and one that covers without trapping lets them tab
   * behind the cover.
   *
   * Not reflected. It stays `true` by default, since a drawer that silently
   * lost its focus trap because a consumer forgot a word would be worse than an
   * attribute on the host, and nothing selects on it: the scrim is rendered or
   * not, rather than shown or hidden by CSS.
   * - `isOpen`: The resolved open state, whichever mode the element is in. (property only) (readonly)
   *
   * ## Events
   *
   * Events that will be emitted by the component.
   *
   * - `OpenChange`: Fired when the drawer opens or closes.
   *
   * ## Slots
   *
   * Areas where markup can be added to the component.
   *
   * - `(default)`: The drawer's content.
   * - `header`: Content pinned above the scrolling area.
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
   * - `--drawer-size`: Width or height of the panel. (default: `undefined`)
   *
   * ## CSS Parts
   *
   * Custom selectors for styling elements within the component.
   *
   * - `scrim`: The cover over the page behind.
   * - `panel`: The sliding panel.
   * - `header`: The header region.
   * - `content`: The scrolling content region.
   */
  "helix-drawer": Partial<
    HelixDrawerProps & BaseProps<HelixDrawer> & BaseEvents
  >;

  /**
   * Two ways to declare columns, and only two. `columns` is a fixed count;
   * `min` fills as many equal columns as fit above that width, which is a
   * responsive layout with no breakpoint to maintain. Setting `min` wins, because
   * a fixed count that also reflows is two intentions in one element.
   *
   * Presentation only, so there is no headless tier.
   *
   * ## Attributes & Properties
   *
   * Component attributes and properties that can be applied to the element or by using JavaScript.
   *
   * - `columns`: Fixed number of equal columns.
   * - `min`: Minimum column width, filling as many as fit.
   *
   * Takes precedence over `columns`: a grid that both fixes a count and reflows
   * is two intentions in one element.
   * - `gap`: Space between cells, named on the space scale.
   * - `align`: Alignment of each cell within its row.
   *
   * ## Slots
   *
   * Areas where markup can be added to the component.
   *
   * - `(default)`: The items to lay out.
   *
   * ## CSS Custom Properties
   *
   * CSS variables available for styling the component.
   *
   * - `--grid-min`: Column width floor when `min` is set. (default: `undefined`)
   */
  "helix-grid": Partial<HelixGridProps & BaseProps<HelixGrid> & BaseEvents>;

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
   * Top-level rather than `Button.Icon`, because a namespace means composition:
   * `Card.Header` is part of a card, and an icon-only button is not part of a
   * button. It is a button with different content and a different shape, which
   * makes it its own component.
   *
   * `label` is not optional in practice. An icon-only control with no accessible
   * name is announced as "button" and nothing else, which is the single most
   * common way a toolbar becomes unusable without sight.
   *
   * ## Attributes & Properties
   *
   * Component attributes and properties that can be applied to the element or by using JavaScript.
   *
   * - `appearance`: How much visual weight the button carries.
   * - `size`: Edge length of the control.
   * - `type`: What activating the button does to its form.
   * - `href`: Navigates to this URL instead of acting on a form.
   * - `target`: Browsing context for `href`, such as `_blank`.
   * - `rel`: Relationship of the linked URL, defaulted when `target` opens a new tab.
   * - `label`: Accessible name, for a button whose content is not text.
   *
   * Lives here rather than only on `IconButton` so the two share one render.
   * An icon-only button without it is a control a screen reader announces as
   * "button" and nothing else.
   * - `disabled`: Whether the control is non-interactive.
   *
   * Reflected, because the styled tier selects on it, and mirrored to
   * `aria-disabled` rather than removing the element from the accessibility
   * tree, so a screen reader can still announce that the control exists.
   * - `focusable`: Whether the button holds its group's tab stop.
   *
   * A toolbar keeps one tab stop across its children, and the obvious way to do
   * that is to write `tabindex` onto each of them. That is a change to markup
   * the consumer rendered, so a React consumer's hydration reports it and does
   * not patch it up. A parent sets this property instead, which writes nothing,
   * and the stop lands on the inner control inside the shadow root.
   *
   * No attribute, because it is coordination between elements rather than
   * anything a consumer sets. (property only)
   * - `form`: The form this control belongs to, if any. (property only) (readonly)
   * - `labels`: Labels associated with this control. (property only) (readonly)
   *
   * ## Slots
   *
   * Areas where markup can be added to the component.
   *
   * - `(default)`: The icon.
   * - `start`: Content before the label, usually an icon.
   * - `end`: Content after the label.
   *
   * ## CSS Custom Properties
   *
   * CSS variables available for styling the component.
   *
   * - `--icon-button-size`: Edge length of the control. (default: `undefined`)
   *
   * ## CSS Parts
   *
   * Custom selectors for styling elements within the component.
   *
   * - `button`: The inner button or anchor.
   */
  "helix-icon-button": Partial<
    HelixIconButtonProps & BaseProps<HelixIconButton> & BaseEvents
  >;

  /**
   * Hairline rules between rows and no fill, per the rule that depth comes from a
   * single border rather than from elevation. A dense table earns its density by
   * decorating none of it.
   *
   * ## Attributes & Properties
   *
   * Component attributes and properties that can be applied to the element or by using JavaScript.
   *
   * - `header`: Whether the cell heads its column.
   *
   * ## Slots
   *
   * Areas where markup can be added to the component.
   *
   * - `(default)`: The cell's content.
   */
  "helix-table-cell": Partial<
    HelixTableCellProps & BaseProps<HelixTableCell> & BaseEvents
  >;

  /**
   * Hairline rules between rows and no fill, per the rule that depth comes from a
   * single border rather than from elevation. A dense table earns its density by
   * decorating none of it.
   *
   * ## Attributes & Properties
   *
   * Component attributes and properties that can be applied to the element or by using JavaScript.
   *
   * - `columns`: Column track list, as CSS.
   *
   * A raw track list rather than a count, because a table's columns are rarely
   * equal: `16rem minmax(0, 1fr)` is the common shape and no count expresses it.
   * - `label`: Accessible name for the table.
   *
   * ## Slots
   *
   * Areas where markup can be added to the component.
   *
   * - `(default)`: The table's rows.
   *
   * ## CSS Custom Properties
   *
   * CSS variables available for styling the component.
   *
   * - `--table-columns`: Track list for the columns. (default: `undefined`)
   *
   * ## CSS Parts
   *
   * Custom selectors for styling elements within the component.
   *
   * - `table`: The grid.
   */
  "helix-table": Partial<HelixTableProps & BaseProps<HelixTable> & BaseEvents>;

  /**
   * Hairline rules between rows and no fill, per the rule that depth comes from a
   * single border rather than from elevation. A dense table earns its density by
   * decorating none of it.
   *
   * ## Slots
   *
   * Areas where markup can be added to the component.
   *
   * - `(default)`: The row's cells.
   */
  "helix-table-row": Partial<
    HelixTableRowProps & BaseProps<HelixTableRow> & BaseEvents
  >;

  /**
   * Selection is marked with a rule under the active tab rather than a filled
   * pill, which keeps the row flat and lets the underline animate between tabs as
   * a movement instead of two separate fills.
   *
   * ## Attributes & Properties
   *
   * Component attributes and properties that can be applied to the element or by using JavaScript.
   *
   * - `value`: Pairs the panel with the tab of the same value.
   * - `selected`: Whether this panel is the visible one.
   *
   * ## Slots
   *
   * Areas where markup can be added to the component.
   *
   * - `(default)`: The panel's content.
   *
   * ## CSS Parts
   *
   * Custom selectors for styling elements within the component.
   *
   * - `panel`: The panel container.
   */
  "helix-tabs-panel": Partial<
    HelixTabsPanelProps & BaseProps<HelixTabsPanel> & BaseEvents
  >;

  /**
   * Selection is marked with a rule under the active tab rather than a filled
   * pill, which keeps the row flat and lets the underline animate between tabs as
   * a movement instead of two separate fills.
   *
   * ## Attributes & Properties
   *
   * Component attributes and properties that can be applied to the element or by using JavaScript.
   *
   * - `value`: Identifies the tab, and pairs it with the panel of the same value.
   * - `selected`: Whether this tab is the current one.
   * - `disabled`: Whether the tab can be chosen.
   *
   * ## Events
   *
   * Events that will be emitted by the component.
   *
   * - `SelectionChange`: Fired when the tab is chosen.
   *
   * ## Slots
   *
   * Areas where markup can be added to the component.
   *
   * - `(default)`: The tab's label.
   *
   * ## Methods
   *
   * Methods that can be called to access component functionality.
   *
   * - `focusTab() => void`: Moves focus to this tab.
   * - `select() => void`: Selects this tab and announces it.
   *
   * ## CSS Parts
   *
   * Custom selectors for styling elements within the component.
   *
   * - `tab`: The tab itself.
   */
  "helix-tabs-tab": Partial<
    HelixTabsTabProps & BaseProps<HelixTabsTab> & BaseEvents
  >;

  /**
   * Selection is marked with a rule under the active tab rather than a filled
   * pill, which keeps the row flat and lets the underline animate between tabs as
   * a movement instead of two separate fills.
   *
   * ## Attributes & Properties
   *
   * Component attributes and properties that can be applied to the element or by using JavaScript.
   *
   * - `label`: Accessible name for the tab list.
   * - `value`: Value of the selected tab.
   * - `manual`: Whether arrowing to a tab also selects it.
   *
   * Automatic is the default because showing a panel is usually cheap. Set this
   * where it is not, so a reader arrowing past four tabs does not load four
   * panels on the way.
   *
   * ## Events
   *
   * Events that will be emitted by the component.
   *
   * - `SelectionChange`: Fired when a tab is chosen. Dispatched by the tab and listened for here, because the root is what a consumer holds.
   *
   * ## Slots
   *
   * Areas where markup can be added to the component.
   *
   * - `(default)`: The tabs.
   * - `panels`: The panels.
   *
   * ## CSS Parts
   *
   * Custom selectors for styling elements within the component.
   *
   * - `tabs`: The tab list.
   * - `panels`: The panel container.
   */
  "helix-tabs": Partial<HelixTabsProps & BaseProps<HelixTabs> & BaseEvents>;

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
   * - `remove`: The remove button, when `removable`.
   */
  "helix-tag": Partial<HelixTagProps & BaseProps<HelixTag> & BaseEvents>;

  /**
   * Two properties, and they answer different questions. `as` is the element,
   * which decides the document outline and what a screen reader announces.
   * `appearance` is the treatment, which decides size, weight, leading, and
   * tracking together.
   *
   * They are separate because they genuinely come apart: a section's second
   * heading sometimes has to look smaller without lying about the outline, and a
   * `<p>` sometimes has to read as a caption. They default to matching, so the
   * common case is `as="h2"` and nothing else.
   *
   * The pairing is resolved in CSS rather than by computing an attribute, so the
   * element writes nothing to its own host: `as="h2"` picks up the heading ramp
   * through a selector, and setting `appearance` takes the pairing rule out of
   * play. Deriving it in `willUpdate` worked, but it put an attribute on the host
   * that the server's markup did not have, which is a hydration mismatch in every
   * React consumer.
   *
   * **Size, weight, and leading are not properties.** Exposing them separately
   * offers a few hundred combinations of which a handful are right, and every
   * caller then picks one. An appearance is a decision the system already made:
   * the ramp is named, and a page built from it is consistent because there was
   * nothing else to choose.
   *
   * `tone` stays separate, because colour carries state rather than typography.
   * Folding it in would mean `caption-danger` and `label-primary` and the rest of
   * the cross product, which is the explosion `appearance` exists to prevent.
   *
   * ## Attributes & Properties
   *
   * Component attributes and properties that can be applied to the element or by using JavaScript.
   *
   * - `as`: Which element to render. Decides the outline and the semantics.
   * - `appearance`: Type treatment. Defaults to the one that matches `as`.
   * - `tone`: Colour role. Separate from `appearance`, because colour carries state.
   *
   * ## Slots
   *
   * Areas where markup can be added to the component.
   *
   * - `(default)`: The text.
   *
   * ## CSS Parts
   *
   * Custom selectors for styling elements within the component.
   *
   * - `text`: The rendered element.
   */
  "helix-text": Partial<HelixTextProps & BaseProps<HelixText> & BaseEvents>;

  /**
   * Carries no background of its own. The selected look comes from the group's
   * indicator sitting behind it, which is what lets that marker travel instead of
   * one fill appearing as another disappears.
   *
   * ## Attributes & Properties
   *
   * Component attributes and properties that can be applied to the element or by using JavaScript.
   *
   * - `value`: Identifies the item to the group.
   * - `href`: Makes the item a link rather than a radio.
   * - `selected`: Whether this item is the current one.
   * - `disabled`: Whether the item can be chosen.
   *
   * ## Events
   *
   * Events that will be emitted by the component.
   *
   * - `SelectionChange`: Fired when the item is chosen.
   *
   * ## Slots
   *
   * Areas where markup can be added to the component.
   *
   * - `(default)`: The item's label.
   *
   * ## Methods
   *
   * Methods that can be called to access component functionality.
   *
   * - `focusItem() => void`: Moves focus to this item.
   * - `select() => void`: Chooses this item and announces it.
   *
   * ## CSS Parts
   *
   * Custom selectors for styling elements within the component.
   *
   * - `item`: The button or anchor.
   */
  "helix-toggle-group-item": Partial<
    HelixToggleGroupItemProps & BaseProps<HelixToggleGroupItem> & BaseEvents
  >;

  /**
   * No chrome of its own: a toolbar is a place controls sit, and a border around
   * them would be a second frame inside whatever already frames the bar.
   *
   * ## Attributes & Properties
   *
   * Component attributes and properties that can be applied to the element or by using JavaScript.
   *
   * - `label`: Accessible name for the toolbar.
   * - `orientation`: Which way the arrow keys move.
   *
   * ## Slots
   *
   * Areas where markup can be added to the component.
   *
   * - `(default)`: The toolbar's controls.
   *
   * ## CSS Custom Properties
   *
   * CSS variables available for styling the component.
   *
   * - `--toolbar-gap`: Space between controls. (default: `undefined`)
   *
   * ## CSS Parts
   *
   * Custom selectors for styling elements within the component.
   *
   * - `toolbar`: The toolbar container.
   */
  "helix-toolbar": Partial<
    HelixToolbarProps & BaseProps<HelixToolbar> & BaseEvents
  >;

  /**
   * The indicator travels between items rather than the fill swapping. A fill
   * that appears on one item as it disappears from another is two changes at once
   * and reads as a flicker; one object moving is something the eye follows, and
   * it says where the selection came from as well as where it went.
   *
   * It animates `translate` and `inline-size`. Width is a layout property and the
   * rule is transform and opacity only, but the indicator is out of flow, so
   * animating its width reflows nothing else. Scaling instead would distort the
   * corner radius, which is worse than the exception.
   *
   * ## Attributes & Properties
   *
   * Component attributes and properties that can be applied to the element or by using JavaScript.
   *
   * - `appearance`: How much chrome the group carries around its items.
   * - `size`: Height and inset of the items.
   * - `label`: Accessible name for the group.
   * - `value`: Value of the selected item.
   * - `nav`: Renders items as links in a navigation landmark rather than as radios.
   *
   * ## Events
   *
   * Events that will be emitted by the component.
   *
   * - `SelectionChange`: Fired when an item is chosen. Dispatched by the item and listened for here.
   *
   * ## Slots
   *
   * Areas where markup can be added to the component.
   *
   * - `(default)`: The group's items.
   *
   * ## CSS Custom Properties
   *
   * CSS variables available for styling the component.
   *
   * - `--toggle-group-indicator-color`: Fill of the moving marker. (default: `undefined`)
   *
   * ## CSS Parts
   *
   * Custom selectors for styling elements within the component.
   *
   * - `indicator`: The moving marker behind the selected item.
   */
  "helix-toggle-group": Partial<
    HelixToggleGroupProps & BaseProps<HelixToggleGroup> & BaseEvents
  >;

  /**
   * Indent comes from the `level` the tree sets, as a multiple of one hook, so a
   * node moved to another depth re-indents without any nested selector. Nesting
   * selectors by depth is the usual approach and stops working at whatever depth
   * nobody wrote a rule for.
   *
   * The twisty rotates rather than swapping glyphs, so opening a branch is a
   * short movement instead of a substitution. Motion carries the state change;
   * the row itself stays flat.
   *
   * ## Attributes & Properties
   *
   * Component attributes and properties that can be applied to the element or by using JavaScript.
   *
   * - `value`: Identifies the item to the consumer, carried in `SelectionChange`.
   * - `selected`: Whether this item is the current one.
   * - `expanded`: Whether a branch is showing its children.
   * - `level`: Depth from the root, set by the tree so indentation needs no CSS nesting.
   *
   * Not reflected. The tree assigns this after it upgrades, so an attribute
   * here would be a change to markup the consumer rendered and hydration would
   * report it. The indent it drives is written onto the row instead, inside the
   * shadow root, which is not part of the tree React hydrates.
   * - `focusable`: Whether this item holds the tree's single tab stop. (property only)
   * - `isBranch`: Whether this node has children. (property only) (readonly)
   *
   * ## Events
   *
   * Events that will be emitted by the component.
   *
   * - `SelectionChange`: Fired when the item is chosen.
   *
   * ## Slots
   *
   * Areas where markup can be added to the component.
   *
   * - `(default)`: The item's label.
   * - `children`: Nested items, which make this a branch.
   *
   * ## Methods
   *
   * Methods that can be called to access component functionality.
   *
   * - `focusItem() => void`: Moves focus to this node.
   * - `select() => void`: Selects this node and announces it.
   *
   * ## CSS Custom Properties
   *
   * CSS variables available for styling the component.
   *
   * - `--tree-indent`: Indent added per level. (default: `undefined`)
   *
   * ## CSS Parts
   *
   * Custom selectors for styling elements within the component.
   *
   * - `item`: The node, and the focus target.
   * - `row`: The clickable label row.
   * - `toggle`: The expand and collapse control.
   * - `label`: The label text.
   * - `group`: The container for nested items.
   */
  "helix-tree-item": Partial<
    HelixTreeItemProps & BaseProps<HelixTreeItem> & BaseEvents
  >;

  /**
   * Quiet by default: no rules between rows and no fill except on the selected
   * item. A navigation tree is read by scanning, and every line of chrome added
   * to it is one more thing between the reader and the label.
   *
   * ## Attributes & Properties
   *
   * Component attributes and properties that can be applied to the element or by using JavaScript.
   *
   * - `label`: Accessible name for the tree.
   * - `value`: Value of the selected item, kept in step with the items themselves.
   *
   * ## Events
   *
   * Events that will be emitted by the component.
   *
   * - `SelectionChange`: Fired when an item is chosen. Dispatched by the item and listened for here, because the tree is what a consumer holds a reference to.
   *
   * ## Slots
   *
   * Areas where markup can be added to the component.
   *
   * - `(default)`: The tree's items.
   *
   * ## CSS Custom Properties
   *
   * CSS variables available for styling the component.
   *
   * - `--tree-indent`: Indent added per level. (default: `undefined`)
   *
   * ## CSS Parts
   *
   * Custom selectors for styling elements within the component.
   *
   * - `tree`: The tree container.
   */
  "helix-tree": Partial<HelixTreeProps & BaseProps<HelixTree> & BaseEvents>;
};

export type CustomElementsSolidJs = {
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
   * - `appearance`: Whether the banner is flat or a pane of material.
   *
   * Flat by default. Material is translucency plus blur, and a filter makes the
   * header a containing block for `position: fixed` descendants, so any overlay
   * rendered inside it is positioned against the header rather than the
   * viewport. Opt in knowing that.
   * - `sticky`: Whether the banner sticks to the top of the viewport.
   *
   * Opt in, because a reflected `true` writes an attribute the server's markup
   * does not have. Every default here is the absent attribute.
   * - `nav-align`/`navAlign`: Where the navigation sits in the bar.
   *
   * Centred by default, which reads as the site's spine when the navigation is
   * the primary thing in the header rather than an afterthought beside a logo.
   * Centred against the banner rather than against whatever space the brand
   * left over, so the middle of the nav is the middle of the window whatever
   * the wordmark and the actions happen to measure.
   *
   * `start` is the opt-out, for a header whose navigation trails the brand.
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
   * - `--app-header-background`: Fill behind the banner. (default: `undefined`)
   * - `--app-header-height`: Height of the banner. (default: `undefined`)
   * - `--app-header-inset`: Inline padding of the banner. (default: `undefined`)
   * - `--app-header-max-inline-size`: Width the content is centered in. (default: `undefined`)
   *
   * ## CSS Parts
   *
   * Custom selectors for styling elements within the component.
   *
   * - `content`: The centred row inside the banner.
   * - `nav`: The navigation region.
   * - `brand`: The leading region.
   * - `actions`: The trailing region.
   */
  "helix-app-header": Partial<
    HelixAppHeaderProps &
      HelixAppHeaderSolidJsProps &
      BaseProps<HelixAppHeader> &
      BaseEvents
  >;

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
   * - `chevron-placement`/`chevronPlacement`: Where the open indicator sits, or whether there is one.
   *
   * `auto` resolves to `end`, which is where a reader scanning a list of
   * summaries expects it: the label starts at the same x on every row, and the
   * indicator is found once at the edge rather than shifting with the text.
   * `start` is for a tree-like reading, where the indicator leads the label.
   * `none` is for a row that carries its own affordance and would otherwise
   * have two.
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
   * - `chevron`: The open and close indicator.
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
   * - `label`: Accessible name, for a button whose content is not text.
   *
   * Lives here rather than only on `IconButton` so the two share one render.
   * An icon-only button without it is a control a screen reader announces as
   * "button" and nothing else.
   * - `disabled`: Whether the control is non-interactive.
   *
   * Reflected, because the styled tier selects on it, and mirrored to
   * `aria-disabled` rather than removing the element from the accessibility
   * tree, so a screen reader can still announce that the control exists.
   * - `focusable`: Whether the button holds its group's tab stop.
   *
   * A toolbar keeps one tab stop across its children, and the obvious way to do
   * that is to write `tabindex` onto each of them. That is a change to markup
   * the consumer rendered, so a React consumer's hydration reports it and does
   * not patch it up. A parent sets this property instead, which writes nothing,
   * and the stop lands on the inner control inside the shadow root.
   *
   * No attribute, because it is coordination between elements rather than
   * anything a consumer sets. (property only)
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
   */
  "helix-card": Partial<
    HelixCardProps & HelixCardSolidJsProps & BaseProps<HelixCard> & BaseEvents
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
   * The host is the flex container itself and the only child is a slot, so the
   * element adds no box of its own: `<helix-flex>` costs exactly the `<div>` it
   * replaces.
   *
   * There is no separate Stack. A stack is this with `direction="column"`, and a
   * second element whose whole definition is one default of the first is a name
   * to learn rather than a capability to gain.
   *
   * Gap takes a space token name rather than a length, so spacing stays on the
   * scale. A layout that can say `gap="13px"` is one that will.
   *
   * Presentation only, so there is no headless tier: the split exists to keep
   * behavior separate from styling, and this is entirely styling.
   *
   * ## Attributes & Properties
   *
   * Component attributes and properties that can be applied to the element or by using JavaScript.
   *
   * - `direction`: Whether items run across or down.
   * - `gap`: Space between items, named on the space scale.
   * - `align`: Alignment across the direction.
   * - `justify`: Distribution along the direction.
   * - `wrap`: Whether items wrap onto more lines.
   * - `inline`: Flows with surrounding text instead of taking the full width.
   *
   * ## Slots
   *
   * Areas where markup can be added to the component.
   *
   * - `(default)`: The items to lay out.
   */
  "helix-flex": Partial<
    HelixFlexProps & HelixFlexSolidJsProps & BaseProps<HelixFlex> & BaseEvents
  >;

  /**
   * The panel translates and the scrim fades, both on transform and opacity only,
   * which is the one place motion is allowed to carry the work: the surface at
   * rest is flat and the movement is what says something happened.
   *
   * ## Attributes & Properties
   *
   * Component attributes and properties that can be applied to the element or by using JavaScript.
   *
   * - `appearance`: Removes the panel's own surface, for a drawer inside another surface.
   * - `open`: Whether the element is open. Setting this enters controlled mode.
   * - `default-open`/`defaultOpen`: Initial open state for uncontrolled use. Ignored once `open` is set.
   * - `placement`: Which edge the drawer comes from.
   * - `label`: Accessible name for the panel.
   * - `modal`: Whether the drawer blocks the page behind it.
   *
   * Turning this off removes the focus trap and the scrim together, because
   * they are one decision: a panel that traps focus without covering the page
   * strands the reader, and one that covers without trapping lets them tab
   * behind the cover.
   *
   * Not reflected. It stays `true` by default, since a drawer that silently
   * lost its focus trap because a consumer forgot a word would be worse than an
   * attribute on the host, and nothing selects on it: the scrim is rendered or
   * not, rather than shown or hidden by CSS.
   * - `isOpen`: The resolved open state, whichever mode the element is in. (property only) (readonly)
   *
   * ## Events
   *
   * Events that will be emitted by the component.
   *
   * - `OpenChange`: Fired when the drawer opens or closes.
   *
   * ## Slots
   *
   * Areas where markup can be added to the component.
   *
   * - `(default)`: The drawer's content.
   * - `header`: Content pinned above the scrolling area.
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
   * - `--drawer-size`: Width or height of the panel. (default: `undefined`)
   *
   * ## CSS Parts
   *
   * Custom selectors for styling elements within the component.
   *
   * - `scrim`: The cover over the page behind.
   * - `panel`: The sliding panel.
   * - `header`: The header region.
   * - `content`: The scrolling content region.
   */
  "helix-drawer": Partial<
    HelixDrawerProps &
      HelixDrawerSolidJsProps &
      BaseProps<HelixDrawer> &
      BaseEvents
  >;

  /**
   * Two ways to declare columns, and only two. `columns` is a fixed count;
   * `min` fills as many equal columns as fit above that width, which is a
   * responsive layout with no breakpoint to maintain. Setting `min` wins, because
   * a fixed count that also reflows is two intentions in one element.
   *
   * Presentation only, so there is no headless tier.
   *
   * ## Attributes & Properties
   *
   * Component attributes and properties that can be applied to the element or by using JavaScript.
   *
   * - `columns`: Fixed number of equal columns.
   * - `min`: Minimum column width, filling as many as fit.
   *
   * Takes precedence over `columns`: a grid that both fixes a count and reflows
   * is two intentions in one element.
   * - `gap`: Space between cells, named on the space scale.
   * - `align`: Alignment of each cell within its row.
   *
   * ## Slots
   *
   * Areas where markup can be added to the component.
   *
   * - `(default)`: The items to lay out.
   *
   * ## CSS Custom Properties
   *
   * CSS variables available for styling the component.
   *
   * - `--grid-min`: Column width floor when `min` is set. (default: `undefined`)
   */
  "helix-grid": Partial<
    HelixGridProps & HelixGridSolidJsProps & BaseProps<HelixGrid> & BaseEvents
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
   * Top-level rather than `Button.Icon`, because a namespace means composition:
   * `Card.Header` is part of a card, and an icon-only button is not part of a
   * button. It is a button with different content and a different shape, which
   * makes it its own component.
   *
   * `label` is not optional in practice. An icon-only control with no accessible
   * name is announced as "button" and nothing else, which is the single most
   * common way a toolbar becomes unusable without sight.
   *
   * ## Attributes & Properties
   *
   * Component attributes and properties that can be applied to the element or by using JavaScript.
   *
   * - `appearance`: How much visual weight the button carries.
   * - `size`: Edge length of the control.
   * - `type`: What activating the button does to its form.
   * - `href`: Navigates to this URL instead of acting on a form.
   * - `target`: Browsing context for `href`, such as `_blank`.
   * - `rel`: Relationship of the linked URL, defaulted when `target` opens a new tab.
   * - `label`: Accessible name, for a button whose content is not text.
   *
   * Lives here rather than only on `IconButton` so the two share one render.
   * An icon-only button without it is a control a screen reader announces as
   * "button" and nothing else.
   * - `disabled`: Whether the control is non-interactive.
   *
   * Reflected, because the styled tier selects on it, and mirrored to
   * `aria-disabled` rather than removing the element from the accessibility
   * tree, so a screen reader can still announce that the control exists.
   * - `focusable`: Whether the button holds its group's tab stop.
   *
   * A toolbar keeps one tab stop across its children, and the obvious way to do
   * that is to write `tabindex` onto each of them. That is a change to markup
   * the consumer rendered, so a React consumer's hydration reports it and does
   * not patch it up. A parent sets this property instead, which writes nothing,
   * and the stop lands on the inner control inside the shadow root.
   *
   * No attribute, because it is coordination between elements rather than
   * anything a consumer sets. (property only)
   * - `form`: The form this control belongs to, if any. (property only) (readonly)
   * - `labels`: Labels associated with this control. (property only) (readonly)
   *
   * ## Slots
   *
   * Areas where markup can be added to the component.
   *
   * - `(default)`: The icon.
   * - `start`: Content before the label, usually an icon.
   * - `end`: Content after the label.
   *
   * ## CSS Custom Properties
   *
   * CSS variables available for styling the component.
   *
   * - `--icon-button-size`: Edge length of the control. (default: `undefined`)
   *
   * ## CSS Parts
   *
   * Custom selectors for styling elements within the component.
   *
   * - `button`: The inner button or anchor.
   */
  "helix-icon-button": Partial<
    HelixIconButtonProps &
      HelixIconButtonSolidJsProps &
      BaseProps<HelixIconButton> &
      BaseEvents
  >;

  /**
   * Hairline rules between rows and no fill, per the rule that depth comes from a
   * single border rather than from elevation. A dense table earns its density by
   * decorating none of it.
   *
   * ## Attributes & Properties
   *
   * Component attributes and properties that can be applied to the element or by using JavaScript.
   *
   * - `header`: Whether the cell heads its column.
   *
   * ## Slots
   *
   * Areas where markup can be added to the component.
   *
   * - `(default)`: The cell's content.
   */
  "helix-table-cell": Partial<
    HelixTableCellProps &
      HelixTableCellSolidJsProps &
      BaseProps<HelixTableCell> &
      BaseEvents
  >;

  /**
   * Hairline rules between rows and no fill, per the rule that depth comes from a
   * single border rather than from elevation. A dense table earns its density by
   * decorating none of it.
   *
   * ## Attributes & Properties
   *
   * Component attributes and properties that can be applied to the element or by using JavaScript.
   *
   * - `columns`: Column track list, as CSS.
   *
   * A raw track list rather than a count, because a table's columns are rarely
   * equal: `16rem minmax(0, 1fr)` is the common shape and no count expresses it.
   * - `label`: Accessible name for the table.
   *
   * ## Slots
   *
   * Areas where markup can be added to the component.
   *
   * - `(default)`: The table's rows.
   *
   * ## CSS Custom Properties
   *
   * CSS variables available for styling the component.
   *
   * - `--table-columns`: Track list for the columns. (default: `undefined`)
   *
   * ## CSS Parts
   *
   * Custom selectors for styling elements within the component.
   *
   * - `table`: The grid.
   */
  "helix-table": Partial<
    HelixTableProps &
      HelixTableSolidJsProps &
      BaseProps<HelixTable> &
      BaseEvents
  >;

  /**
   * Hairline rules between rows and no fill, per the rule that depth comes from a
   * single border rather than from elevation. A dense table earns its density by
   * decorating none of it.
   *
   * ## Slots
   *
   * Areas where markup can be added to the component.
   *
   * - `(default)`: The row's cells.
   */
  "helix-table-row": Partial<
    HelixTableRowProps &
      HelixTableRowSolidJsProps &
      BaseProps<HelixTableRow> &
      BaseEvents
  >;

  /**
   * Selection is marked with a rule under the active tab rather than a filled
   * pill, which keeps the row flat and lets the underline animate between tabs as
   * a movement instead of two separate fills.
   *
   * ## Attributes & Properties
   *
   * Component attributes and properties that can be applied to the element or by using JavaScript.
   *
   * - `value`: Pairs the panel with the tab of the same value.
   * - `selected`: Whether this panel is the visible one.
   *
   * ## Slots
   *
   * Areas where markup can be added to the component.
   *
   * - `(default)`: The panel's content.
   *
   * ## CSS Parts
   *
   * Custom selectors for styling elements within the component.
   *
   * - `panel`: The panel container.
   */
  "helix-tabs-panel": Partial<
    HelixTabsPanelProps &
      HelixTabsPanelSolidJsProps &
      BaseProps<HelixTabsPanel> &
      BaseEvents
  >;

  /**
   * Selection is marked with a rule under the active tab rather than a filled
   * pill, which keeps the row flat and lets the underline animate between tabs as
   * a movement instead of two separate fills.
   *
   * ## Attributes & Properties
   *
   * Component attributes and properties that can be applied to the element or by using JavaScript.
   *
   * - `value`: Identifies the tab, and pairs it with the panel of the same value.
   * - `selected`: Whether this tab is the current one.
   * - `disabled`: Whether the tab can be chosen.
   *
   * ## Events
   *
   * Events that will be emitted by the component.
   *
   * - `SelectionChange`: Fired when the tab is chosen.
   *
   * ## Slots
   *
   * Areas where markup can be added to the component.
   *
   * - `(default)`: The tab's label.
   *
   * ## Methods
   *
   * Methods that can be called to access component functionality.
   *
   * - `focusTab() => void`: Moves focus to this tab.
   * - `select() => void`: Selects this tab and announces it.
   *
   * ## CSS Parts
   *
   * Custom selectors for styling elements within the component.
   *
   * - `tab`: The tab itself.
   */
  "helix-tabs-tab": Partial<
    HelixTabsTabProps &
      HelixTabsTabSolidJsProps &
      BaseProps<HelixTabsTab> &
      BaseEvents
  >;

  /**
   * Selection is marked with a rule under the active tab rather than a filled
   * pill, which keeps the row flat and lets the underline animate between tabs as
   * a movement instead of two separate fills.
   *
   * ## Attributes & Properties
   *
   * Component attributes and properties that can be applied to the element or by using JavaScript.
   *
   * - `label`: Accessible name for the tab list.
   * - `value`: Value of the selected tab.
   * - `manual`: Whether arrowing to a tab also selects it.
   *
   * Automatic is the default because showing a panel is usually cheap. Set this
   * where it is not, so a reader arrowing past four tabs does not load four
   * panels on the way.
   *
   * ## Events
   *
   * Events that will be emitted by the component.
   *
   * - `SelectionChange`: Fired when a tab is chosen. Dispatched by the tab and listened for here, because the root is what a consumer holds.
   *
   * ## Slots
   *
   * Areas where markup can be added to the component.
   *
   * - `(default)`: The tabs.
   * - `panels`: The panels.
   *
   * ## CSS Parts
   *
   * Custom selectors for styling elements within the component.
   *
   * - `tabs`: The tab list.
   * - `panels`: The panel container.
   */
  "helix-tabs": Partial<
    HelixTabsProps & HelixTabsSolidJsProps & BaseProps<HelixTabs> & BaseEvents
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
   * - `remove`: The remove button, when `removable`.
   */
  "helix-tag": Partial<
    HelixTagProps & HelixTagSolidJsProps & BaseProps<HelixTag> & BaseEvents
  >;

  /**
   * Two properties, and they answer different questions. `as` is the element,
   * which decides the document outline and what a screen reader announces.
   * `appearance` is the treatment, which decides size, weight, leading, and
   * tracking together.
   *
   * They are separate because they genuinely come apart: a section's second
   * heading sometimes has to look smaller without lying about the outline, and a
   * `<p>` sometimes has to read as a caption. They default to matching, so the
   * common case is `as="h2"` and nothing else.
   *
   * The pairing is resolved in CSS rather than by computing an attribute, so the
   * element writes nothing to its own host: `as="h2"` picks up the heading ramp
   * through a selector, and setting `appearance` takes the pairing rule out of
   * play. Deriving it in `willUpdate` worked, but it put an attribute on the host
   * that the server's markup did not have, which is a hydration mismatch in every
   * React consumer.
   *
   * **Size, weight, and leading are not properties.** Exposing them separately
   * offers a few hundred combinations of which a handful are right, and every
   * caller then picks one. An appearance is a decision the system already made:
   * the ramp is named, and a page built from it is consistent because there was
   * nothing else to choose.
   *
   * `tone` stays separate, because colour carries state rather than typography.
   * Folding it in would mean `caption-danger` and `label-primary` and the rest of
   * the cross product, which is the explosion `appearance` exists to prevent.
   *
   * ## Attributes & Properties
   *
   * Component attributes and properties that can be applied to the element or by using JavaScript.
   *
   * - `as`: Which element to render. Decides the outline and the semantics.
   * - `appearance`: Type treatment. Defaults to the one that matches `as`.
   * - `tone`: Colour role. Separate from `appearance`, because colour carries state.
   *
   * ## Slots
   *
   * Areas where markup can be added to the component.
   *
   * - `(default)`: The text.
   *
   * ## CSS Parts
   *
   * Custom selectors for styling elements within the component.
   *
   * - `text`: The rendered element.
   */
  "helix-text": Partial<
    HelixTextProps & HelixTextSolidJsProps & BaseProps<HelixText> & BaseEvents
  >;

  /**
   * Carries no background of its own. The selected look comes from the group's
   * indicator sitting behind it, which is what lets that marker travel instead of
   * one fill appearing as another disappears.
   *
   * ## Attributes & Properties
   *
   * Component attributes and properties that can be applied to the element or by using JavaScript.
   *
   * - `value`: Identifies the item to the group.
   * - `href`: Makes the item a link rather than a radio.
   * - `selected`: Whether this item is the current one.
   * - `disabled`: Whether the item can be chosen.
   *
   * ## Events
   *
   * Events that will be emitted by the component.
   *
   * - `SelectionChange`: Fired when the item is chosen.
   *
   * ## Slots
   *
   * Areas where markup can be added to the component.
   *
   * - `(default)`: The item's label.
   *
   * ## Methods
   *
   * Methods that can be called to access component functionality.
   *
   * - `focusItem() => void`: Moves focus to this item.
   * - `select() => void`: Chooses this item and announces it.
   *
   * ## CSS Parts
   *
   * Custom selectors for styling elements within the component.
   *
   * - `item`: The button or anchor.
   */
  "helix-toggle-group-item": Partial<
    HelixToggleGroupItemProps &
      HelixToggleGroupItemSolidJsProps &
      BaseProps<HelixToggleGroupItem> &
      BaseEvents
  >;

  /**
   * No chrome of its own: a toolbar is a place controls sit, and a border around
   * them would be a second frame inside whatever already frames the bar.
   *
   * ## Attributes & Properties
   *
   * Component attributes and properties that can be applied to the element or by using JavaScript.
   *
   * - `label`: Accessible name for the toolbar.
   * - `orientation`: Which way the arrow keys move.
   *
   * ## Slots
   *
   * Areas where markup can be added to the component.
   *
   * - `(default)`: The toolbar's controls.
   *
   * ## CSS Custom Properties
   *
   * CSS variables available for styling the component.
   *
   * - `--toolbar-gap`: Space between controls. (default: `undefined`)
   *
   * ## CSS Parts
   *
   * Custom selectors for styling elements within the component.
   *
   * - `toolbar`: The toolbar container.
   */
  "helix-toolbar": Partial<
    HelixToolbarProps &
      HelixToolbarSolidJsProps &
      BaseProps<HelixToolbar> &
      BaseEvents
  >;

  /**
   * The indicator travels between items rather than the fill swapping. A fill
   * that appears on one item as it disappears from another is two changes at once
   * and reads as a flicker; one object moving is something the eye follows, and
   * it says where the selection came from as well as where it went.
   *
   * It animates `translate` and `inline-size`. Width is a layout property and the
   * rule is transform and opacity only, but the indicator is out of flow, so
   * animating its width reflows nothing else. Scaling instead would distort the
   * corner radius, which is worse than the exception.
   *
   * ## Attributes & Properties
   *
   * Component attributes and properties that can be applied to the element or by using JavaScript.
   *
   * - `appearance`: How much chrome the group carries around its items.
   * - `size`: Height and inset of the items.
   * - `label`: Accessible name for the group.
   * - `value`: Value of the selected item.
   * - `nav`: Renders items as links in a navigation landmark rather than as radios.
   *
   * ## Events
   *
   * Events that will be emitted by the component.
   *
   * - `SelectionChange`: Fired when an item is chosen. Dispatched by the item and listened for here.
   *
   * ## Slots
   *
   * Areas where markup can be added to the component.
   *
   * - `(default)`: The group's items.
   *
   * ## CSS Custom Properties
   *
   * CSS variables available for styling the component.
   *
   * - `--toggle-group-indicator-color`: Fill of the moving marker. (default: `undefined`)
   *
   * ## CSS Parts
   *
   * Custom selectors for styling elements within the component.
   *
   * - `indicator`: The moving marker behind the selected item.
   */
  "helix-toggle-group": Partial<
    HelixToggleGroupProps &
      HelixToggleGroupSolidJsProps &
      BaseProps<HelixToggleGroup> &
      BaseEvents
  >;

  /**
   * Indent comes from the `level` the tree sets, as a multiple of one hook, so a
   * node moved to another depth re-indents without any nested selector. Nesting
   * selectors by depth is the usual approach and stops working at whatever depth
   * nobody wrote a rule for.
   *
   * The twisty rotates rather than swapping glyphs, so opening a branch is a
   * short movement instead of a substitution. Motion carries the state change;
   * the row itself stays flat.
   *
   * ## Attributes & Properties
   *
   * Component attributes and properties that can be applied to the element or by using JavaScript.
   *
   * - `value`: Identifies the item to the consumer, carried in `SelectionChange`.
   * - `selected`: Whether this item is the current one.
   * - `expanded`: Whether a branch is showing its children.
   * - `level`: Depth from the root, set by the tree so indentation needs no CSS nesting.
   *
   * Not reflected. The tree assigns this after it upgrades, so an attribute
   * here would be a change to markup the consumer rendered and hydration would
   * report it. The indent it drives is written onto the row instead, inside the
   * shadow root, which is not part of the tree React hydrates.
   * - `focusable`: Whether this item holds the tree's single tab stop. (property only)
   * - `isBranch`: Whether this node has children. (property only) (readonly)
   *
   * ## Events
   *
   * Events that will be emitted by the component.
   *
   * - `SelectionChange`: Fired when the item is chosen.
   *
   * ## Slots
   *
   * Areas where markup can be added to the component.
   *
   * - `(default)`: The item's label.
   * - `children`: Nested items, which make this a branch.
   *
   * ## Methods
   *
   * Methods that can be called to access component functionality.
   *
   * - `focusItem() => void`: Moves focus to this node.
   * - `select() => void`: Selects this node and announces it.
   *
   * ## CSS Custom Properties
   *
   * CSS variables available for styling the component.
   *
   * - `--tree-indent`: Indent added per level. (default: `undefined`)
   *
   * ## CSS Parts
   *
   * Custom selectors for styling elements within the component.
   *
   * - `item`: The node, and the focus target.
   * - `row`: The clickable label row.
   * - `toggle`: The expand and collapse control.
   * - `label`: The label text.
   * - `group`: The container for nested items.
   */
  "helix-tree-item": Partial<
    HelixTreeItemProps &
      HelixTreeItemSolidJsProps &
      BaseProps<HelixTreeItem> &
      BaseEvents
  >;

  /**
   * Quiet by default: no rules between rows and no fill except on the selected
   * item. A navigation tree is read by scanning, and every line of chrome added
   * to it is one more thing between the reader and the label.
   *
   * ## Attributes & Properties
   *
   * Component attributes and properties that can be applied to the element or by using JavaScript.
   *
   * - `label`: Accessible name for the tree.
   * - `value`: Value of the selected item, kept in step with the items themselves.
   *
   * ## Events
   *
   * Events that will be emitted by the component.
   *
   * - `SelectionChange`: Fired when an item is chosen. Dispatched by the item and listened for here, because the tree is what a consumer holds a reference to.
   *
   * ## Slots
   *
   * Areas where markup can be added to the component.
   *
   * - `(default)`: The tree's items.
   *
   * ## CSS Custom Properties
   *
   * CSS variables available for styling the component.
   *
   * - `--tree-indent`: Indent added per level. (default: `undefined`)
   *
   * ## CSS Parts
   *
   * Custom selectors for styling elements within the component.
   *
   * - `tree`: The tree container.
   */
  "helix-tree": Partial<
    HelixTreeProps & HelixTreeSolidJsProps & BaseProps<HelixTree> & BaseEvents
  >;
};

export type CustomCssProperties = {
  /** Fill behind the banner. */
  "--app-header-background"?: string;
  /** Height of the banner. */
  "--app-header-height"?: string;
  /** Inline padding of the banner. */
  "--app-header-inset"?: string;
  /** Width the content is centered in. */
  "--app-header-max-inline-size"?: string;
  /** Inset of the trigger and content. */
  "--accordion-item-padding"?: string;
  /** Color of the surrounding rule. */
  "--accordion-border-color"?: string;
  /** Corner radius of the stack. */
  "--accordion-radii"?: string;
  /** Fill behind the initials. */
  "--avatar-background-color"?: string;
  /** Edge length of the avatar. */
  "--avatar-size"?: string;
  /** Color of the separator. */
  "--breadcrumbs-separator-color"?: string;
  /** Space between items and separators. */
  "--breadcrumbs-gap"?: string;
  /** Fill behind the button. */
  "--button-background-color"?: string;
  /** Label and icon color. */
  "--button-foreground-color"?: string;
  /** Corner radius of the control. */
  "--button-radii"?: string;
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
  /** Fill behind the callout. */
  "--callout-background-color"?: string;
  /** Corner radius of the callout. */
  "--callout-radii"?: string;
  /** Color of the rule. */
  "--divider-color"?: string;
  /** Thickness of the rule. */
  "--divider-thickness"?: string;
  /** Width or height of the panel. */
  "--drawer-size"?: string;
  /** Column width floor when `min` is set. */
  "--grid-min"?: string;
  /** Edge length of the icon's box. */
  "--icon-size"?: string;
  /** Edge length of the control. */
  "--icon-button-size"?: string;
  /** Track list for the columns. */
  "--table-columns"?: string;
  /** Fill behind the tag. */
  "--tag-background-color"?: string;
  /** Label color. */
  "--tag-foreground-color"?: string;
  /** Corner radius of the tag. */
  "--tag-radii"?: string;
  /** Space between controls. */
  "--toolbar-gap"?: string;
  /** Fill of the moving marker. */
  "--toggle-group-indicator-color"?: string;
  /** Indent added per level. */
  "--tree-indent"?: string;
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
