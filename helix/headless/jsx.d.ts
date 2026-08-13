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
  HelixBaseDrawer,
  HelixBaseIcon,
  HelixBaseTable,
  HelixBaseTableCell,
  HelixBaseTableRow,
  HelixBaseTabs,
  HelixBaseTabsPanel,
  HelixBaseTabsTab,
  HelixBaseTag,
  HelixBaseToggleGroup,
  HelixBaseToggleGroupItem,
  HelixBaseToolbar,
  HelixBaseTree,
  HelixBaseTreeItem,
  HelixOpenChangeEvent,
  HelixRemoveRequestEvent,
  HelixSelectionChangeEvent,
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

/** `HelixBaseAccordionItem` component event */
export type HelixBaseAccordionItemElementEvent<E = Event> = TypedEvent<
  HelixBaseAccordionItem,
  E
>;
/** `OpenChange` event type */
export type HelixBaseAccordionItemOpenChangeElementEvent =
  HelixBaseAccordionItemElementEvent<HelixOpenChangeEvent>;

export type HelixBaseAccordionItemProps = {
  /** Where the open indicator sits, or whether there is one.

`auto` resolves to `end`, which is where a reader scanning a list of
summaries expects it: the label starts at the same x on every row, and the
indicator is found once at the edge rather than shifting with the text.
`start` is for a tree-like reading, where the indicator leads the label.
`none` is for a row that carries its own affordance and would otherwise
have two. */
  "chevron-placement"?: HelixBaseAccordionItem["chevronPlacement"];
  /** Where the open indicator sits, or whether there is one.

`auto` resolves to `end`, which is where a reader scanning a list of
summaries expects it: the label starts at the same x on every row, and the
indicator is found once at the edge rather than shifting with the text.
`start` is for a tree-like reading, where the indicator leads the label.
`none` is for a row that carries its own affordance and would otherwise
have two. */
  chevronPlacement?: HelixBaseAccordionItem["chevronPlacement"];
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
  /** Where the open indicator sits, or whether there is one.

`auto` resolves to `end`, which is where a reader scanning a list of
summaries expects it: the label starts at the same x on every row, and the
indicator is found once at the edge rather than shifting with the text.
`start` is for a tree-like reading, where the indicator leads the label.
`none` is for a row that carries its own affordance and would otherwise
have two. */
  "attr:chevron-placement"?: HelixBaseAccordionItem["chevronPlacement"];
  /** Where the open indicator sits, or whether there is one.

`auto` resolves to `end`, which is where a reader scanning a list of
summaries expects it: the label starts at the same x on every row, and the
indicator is found once at the edge rather than shifting with the text.
`start` is for a tree-like reading, where the indicator leads the label.
`none` is for a row that carries its own affordance and would otherwise
have two. */
  "prop:chevronPlacement"?: HelixBaseAccordionItem["chevronPlacement"];
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

export type HelixBaseAppHeaderProps = {
  /** Where the navigation sits in the bar.

`center` puts it in the middle of the banner rather than beside the brand,
which reads as the site's spine when the nav is the primary thing in the
header rather than an afterthought next to a logo. */
  "nav-align"?: HelixBaseAppHeader["navAlign"];
  /** Where the navigation sits in the bar.

`center` puts it in the middle of the banner rather than beside the brand,
which reads as the site's spine when the nav is the primary thing in the
header rather than an afterthought next to a logo. */
  navAlign?: HelixBaseAppHeader["navAlign"];
};

export type HelixBaseAppHeaderSolidJsProps = {
  /** Where the navigation sits in the bar.

`center` puts it in the middle of the banner rather than beside the brand,
which reads as the site's spine when the nav is the primary thing in the
header rather than an afterthought next to a logo. */
  "attr:nav-align"?: HelixBaseAppHeader["navAlign"];
  /** Where the navigation sits in the bar.

`center` puts it in the middle of the banner rather than beside the brand,
which reads as the site's spine when the nav is the primary thing in the
header rather than an afterthought next to a logo. */
  "prop:navAlign"?: HelixBaseAppHeader["navAlign"];

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

export type HelixBaseButtonProps = {
  /** What activating the button does to its form. */
  type?: HelixBaseButton["type"];
  /** Navigates to this URL instead of acting on a form. */
  href?: HelixBaseButton["href"];
  /** Browsing context for `href`, such as `_blank`. */
  target?: HelixBaseButton["target"];
  /** Relationship of the linked URL, defaulted when `target` opens a new tab. */
  rel?: HelixBaseButton["rel"];
  /** Accessible name, for a button whose content is not text.

Lives here rather than only on `IconButton` so the two share one render.
An icon-only button without it is a control a screen reader announces as
"button" and nothing else. */
  label?: HelixBaseButton["label"];
  /** Whether the control is non-interactive.

Reflected, because the styled tier selects on it, and mirrored to
`aria-disabled` rather than removing the element from the accessibility
tree, so a screen reader can still announce that the control exists. */
  disabled?: HelixBaseButton["disabled"];
  /** Whether the button holds its group's tab stop.

A toolbar keeps one tab stop across its children, and the obvious way to do
that is to write `tabindex` onto each of them. That is a change to markup
the consumer rendered, so a React consumer's hydration reports it and does
not patch it up. A parent sets this property instead, which writes nothing,
and the stop lands on the inner control inside the shadow root.

No attribute, because it is coordination between elements rather than
anything a consumer sets. */
  focusable?: HelixBaseButton["focusable"];
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
  /** Accessible name, for a button whose content is not text.

Lives here rather than only on `IconButton` so the two share one render.
An icon-only button without it is a control a screen reader announces as
"button" and nothing else. */
  "prop:label"?: HelixBaseButton["label"];
  /** Whether the control is non-interactive.

Reflected, because the styled tier selects on it, and mirrored to
`aria-disabled` rather than removing the element from the accessibility
tree, so a screen reader can still announce that the control exists. */
  "prop:disabled"?: HelixBaseButton["disabled"];
  /** Whether the button holds its group's tab stop.

A toolbar keeps one tab stop across its children, and the obvious way to do
that is to write `tabindex` onto each of them. That is a change to markup
the consumer rendered, so a React consumer's hydration reports it and does
not patch it up. A parent sets this property instead, which writes nothing,
and the stop lands on the inner control inside the shadow root.

No attribute, because it is coordination between elements rather than
anything a consumer sets. */
  "prop:focusable"?: HelixBaseButton["focusable"];

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

/** `HelixBaseDrawer` component event */
export type HelixBaseDrawerElementEvent<E = Event> = TypedEvent<
  HelixBaseDrawer,
  E
>;
/** `OpenChange` event type */
export type HelixBaseDrawerOpenChangeElementEvent =
  HelixBaseDrawerElementEvent<HelixOpenChangeEvent>;

export type HelixBaseDrawerProps = {
  /** Which edge the drawer comes from. */
  placement?: HelixBaseDrawer["placement"];
  /** Accessible name for the panel. */
  label?: HelixBaseDrawer["label"];
  /** Whether the drawer blocks the page behind it.

Turning this off removes the focus trap and the scrim together, because
they are one decision: a panel that traps focus without covering the page
strands the reader, and one that covers without trapping lets them tab
behind the cover.

Not reflected. It stays `true` by default, since a drawer that silently
lost its focus trap because a consumer forgot a word would be worse than an
attribute on the host, and nothing selects on it: the scrim is rendered or
not, rather than shown or hidden by CSS. */
  modal?: HelixBaseDrawer["modal"];
  /** Whether the element is open. Setting this enters controlled mode. */
  open?: HelixBaseDrawer["open"];
  /** Initial open state for uncontrolled use. Ignored once `open` is set. */
  "default-open"?: HelixBaseDrawer["defaultOpen"];
  /** Initial open state for uncontrolled use. Ignored once `open` is set. */
  defaultOpen?: HelixBaseDrawer["defaultOpen"];

  /** Fired when the drawer opens or closes. */
  onOpenChange?: (e: HelixBaseDrawerOpenChangeElementEvent) => void;
};

export type HelixBaseDrawerSolidJsProps = {
  /** Which edge the drawer comes from. */
  "prop:placement"?: HelixBaseDrawer["placement"];
  /** Accessible name for the panel. */
  "prop:label"?: HelixBaseDrawer["label"];
  /** Whether the drawer blocks the page behind it.

Turning this off removes the focus trap and the scrim together, because
they are one decision: a panel that traps focus without covering the page
strands the reader, and one that covers without trapping lets them tab
behind the cover.

Not reflected. It stays `true` by default, since a drawer that silently
lost its focus trap because a consumer forgot a word would be worse than an
attribute on the host, and nothing selects on it: the scrim is rendered or
not, rather than shown or hidden by CSS. */
  "prop:modal"?: HelixBaseDrawer["modal"];
  /** Whether the element is open. Setting this enters controlled mode. */
  "prop:open"?: HelixBaseDrawer["open"];
  /** Initial open state for uncontrolled use. Ignored once `open` is set. */
  "bool:default-open"?: HelixBaseDrawer["defaultOpen"];
  /** Initial open state for uncontrolled use. Ignored once `open` is set. */
  "prop:defaultOpen"?: HelixBaseDrawer["defaultOpen"];
  /** Fired when the drawer opens or closes. */
  "on:OpenChange"?: (e: HelixBaseDrawerOpenChangeElementEvent) => void;

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

export type HelixBaseCardProps = {};

export type HelixBaseCardSolidJsProps = {
  /** Set the innerHTML of the element */
  innerHTML?: string;
  /** Set the textContent of the element */
  textContent?: string | number;
};

export type HelixBaseTableProps = {
  /** Column track list, as CSS.

A raw track list rather than a count, because a table's columns are rarely
equal: `16rem minmax(0, 1fr)` is the common shape and no count expresses it. */
  columns?: HelixBaseTable["columns"];
  /** Accessible name for the table. */
  label?: HelixBaseTable["label"];
};

export type HelixBaseTableSolidJsProps = {
  /** Column track list, as CSS.

A raw track list rather than a count, because a table's columns are rarely
equal: `16rem minmax(0, 1fr)` is the common shape and no count expresses it. */
  "prop:columns"?: HelixBaseTable["columns"];
  /** Accessible name for the table. */
  "prop:label"?: HelixBaseTable["label"];

  /** Set the innerHTML of the element */
  innerHTML?: string;
  /** Set the textContent of the element */
  textContent?: string | number;
};

export type HelixBaseTableRowProps = {};

export type HelixBaseTableRowSolidJsProps = {
  /** Set the innerHTML of the element */
  innerHTML?: string;
  /** Set the textContent of the element */
  textContent?: string | number;
};

export type HelixBaseTableCellProps = {
  /** Whether the cell heads its column. */
  header?: HelixBaseTableCell["header"];
};

export type HelixBaseTableCellSolidJsProps = {
  /** Whether the cell heads its column. */
  "prop:header"?: HelixBaseTableCell["header"];

  /** Set the innerHTML of the element */
  innerHTML?: string;
  /** Set the textContent of the element */
  textContent?: string | number;
};

export type HelixBaseTabsPanelProps = {
  /** Pairs the panel with the tab of the same value. */
  value?: HelixBaseTabsPanel["value"];
  /** Whether this panel is the visible one. */
  selected?: HelixBaseTabsPanel["selected"];
};

export type HelixBaseTabsPanelSolidJsProps = {
  /** Pairs the panel with the tab of the same value. */
  "prop:value"?: HelixBaseTabsPanel["value"];
  /** Whether this panel is the visible one. */
  "prop:selected"?: HelixBaseTabsPanel["selected"];

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

/** `HelixBaseTabs` component event */
export type HelixBaseTabsElementEvent<E = Event> = TypedEvent<HelixBaseTabs, E>;
/** `SelectionChange` event type */
export type HelixBaseTabsSelectionChangeElementEvent =
  HelixBaseTabsElementEvent<HelixSelectionChangeEvent>;

export type HelixBaseTabsProps = {
  /** Accessible name for the tab list. */
  label?: HelixBaseTabs["label"];
  /** Value of the selected tab. */
  value?: HelixBaseTabs["value"];
  /** Whether arrowing to a tab also selects it.

Automatic is the default because showing a panel is usually cheap. Set this
where it is not, so a reader arrowing past four tabs does not load four
panels on the way. */
  manual?: HelixBaseTabs["manual"];

  /** Fired when a tab is chosen. Dispatched by the tab and listened for here, because the root is what a consumer holds. */
  onSelectionChange?: (e: HelixBaseTabsSelectionChangeElementEvent) => void;
};

export type HelixBaseTabsSolidJsProps = {
  /** Accessible name for the tab list. */
  "prop:label"?: HelixBaseTabs["label"];
  /** Value of the selected tab. */
  "prop:value"?: HelixBaseTabs["value"];
  /** Whether arrowing to a tab also selects it.

Automatic is the default because showing a panel is usually cheap. Set this
where it is not, so a reader arrowing past four tabs does not load four
panels on the way. */
  "prop:manual"?: HelixBaseTabs["manual"];
  /** Fired when a tab is chosen. Dispatched by the tab and listened for here, because the root is what a consumer holds. */
  "on:SelectionChange"?: (e: HelixBaseTabsSelectionChangeElementEvent) => void;

  /** Set the innerHTML of the element */
  innerHTML?: string;
  /** Set the textContent of the element */
  textContent?: string | number;
};

/** `HelixBaseTabsTab` component event */
export type HelixBaseTabsTabElementEvent<E = Event> = TypedEvent<
  HelixBaseTabsTab,
  E
>;
/** `SelectionChange` event type */
export type HelixBaseTabsTabSelectionChangeElementEvent =
  HelixBaseTabsTabElementEvent<HelixSelectionChangeEvent>;

export type HelixBaseTabsTabProps = {
  /** Identifies the tab, and pairs it with the panel of the same value. */
  value?: HelixBaseTabsTab["value"];
  /** Whether this tab is the current one. */
  selected?: HelixBaseTabsTab["selected"];
  /** Whether the tab can be chosen. */
  disabled?: HelixBaseTabsTab["disabled"];

  /** Fired when the tab is chosen. */
  onSelectionChange?: (e: HelixBaseTabsTabSelectionChangeElementEvent) => void;
};

export type HelixBaseTabsTabSolidJsProps = {
  /** Identifies the tab, and pairs it with the panel of the same value. */
  "prop:value"?: HelixBaseTabsTab["value"];
  /** Whether this tab is the current one. */
  "prop:selected"?: HelixBaseTabsTab["selected"];
  /** Whether the tab can be chosen. */
  "prop:disabled"?: HelixBaseTabsTab["disabled"];
  /** Fired when the tab is chosen. */
  "on:SelectionChange"?: (
    e: HelixBaseTabsTabSelectionChangeElementEvent,
  ) => void;

  /** Set the innerHTML of the element */
  innerHTML?: string;
  /** Set the textContent of the element */
  textContent?: string | number;
};

/** `HelixBaseToggleGroupItem` component event */
export type HelixBaseToggleGroupItemElementEvent<E = Event> = TypedEvent<
  HelixBaseToggleGroupItem,
  E
>;
/** `SelectionChange` event type */
export type HelixBaseToggleGroupItemSelectionChangeElementEvent =
  HelixBaseToggleGroupItemElementEvent<HelixSelectionChangeEvent>;

export type HelixBaseToggleGroupItemProps = {
  /** Identifies the item to the group. */
  value?: HelixBaseToggleGroupItem["value"];
  /** Makes the item a link rather than a radio. */
  href?: HelixBaseToggleGroupItem["href"];
  /** Whether this item is the current one. */
  selected?: HelixBaseToggleGroupItem["selected"];
  /** Whether the item can be chosen. */
  disabled?: HelixBaseToggleGroupItem["disabled"];

  /** Fired when the item is chosen. */
  onSelectionChange?: (
    e: HelixBaseToggleGroupItemSelectionChangeElementEvent,
  ) => void;
};

export type HelixBaseToggleGroupItemSolidJsProps = {
  /** Identifies the item to the group. */
  "prop:value"?: HelixBaseToggleGroupItem["value"];
  /** Makes the item a link rather than a radio. */
  "prop:href"?: HelixBaseToggleGroupItem["href"];
  /** Whether this item is the current one. */
  "prop:selected"?: HelixBaseToggleGroupItem["selected"];
  /** Whether the item can be chosen. */
  "prop:disabled"?: HelixBaseToggleGroupItem["disabled"];
  /** Fired when the item is chosen. */
  "on:SelectionChange"?: (
    e: HelixBaseToggleGroupItemSelectionChangeElementEvent,
  ) => void;

  /** Set the innerHTML of the element */
  innerHTML?: string;
  /** Set the textContent of the element */
  textContent?: string | number;
};

/** `HelixBaseToggleGroup` component event */
export type HelixBaseToggleGroupElementEvent<E = Event> = TypedEvent<
  HelixBaseToggleGroup,
  E
>;
/** `SelectionChange` event type */
export type HelixBaseToggleGroupSelectionChangeElementEvent =
  HelixBaseToggleGroupElementEvent<HelixSelectionChangeEvent>;

export type HelixBaseToggleGroupProps = {
  /** Accessible name for the group. */
  label?: HelixBaseToggleGroup["label"];
  /** Value of the selected item. */
  value?: HelixBaseToggleGroup["value"];
  /** Renders items as links in a navigation landmark rather than as radios. */
  nav?: HelixBaseToggleGroup["nav"];

  /** Fired when an item is chosen. Dispatched by the item and listened for here. */
  onSelectionChange?: (
    e: HelixBaseToggleGroupSelectionChangeElementEvent,
  ) => void;
};

export type HelixBaseToggleGroupSolidJsProps = {
  /** Accessible name for the group. */
  "prop:label"?: HelixBaseToggleGroup["label"];
  /** Value of the selected item. */
  "prop:value"?: HelixBaseToggleGroup["value"];
  /** Renders items as links in a navigation landmark rather than as radios. */
  "prop:nav"?: HelixBaseToggleGroup["nav"];
  /** Fired when an item is chosen. Dispatched by the item and listened for here. */
  "on:SelectionChange"?: (
    e: HelixBaseToggleGroupSelectionChangeElementEvent,
  ) => void;

  /** Set the innerHTML of the element */
  innerHTML?: string;
  /** Set the textContent of the element */
  textContent?: string | number;
};

/** `HelixBaseTreeItem` component event */
export type HelixBaseTreeItemElementEvent<E = Event> = TypedEvent<
  HelixBaseTreeItem,
  E
>;
/** `SelectionChange` event type */
export type HelixBaseTreeItemSelectionChangeElementEvent =
  HelixBaseTreeItemElementEvent<HelixSelectionChangeEvent>;

export type HelixBaseTreeItemProps = {
  /** Identifies the item to the consumer, carried in `SelectionChange`. */
  value?: HelixBaseTreeItem["value"];
  /** Whether this item is the current one. */
  selected?: HelixBaseTreeItem["selected"];
  /** Whether a branch is showing its children. */
  expanded?: HelixBaseTreeItem["expanded"];
  /** Depth from the root, set by the tree so indentation needs no CSS nesting.

Not reflected. The tree assigns this after it upgrades, so an attribute
here would be a change to markup the consumer rendered and hydration would
report it. The indent it drives is written onto the row instead, inside the
shadow root, which is not part of the tree React hydrates. */
  level?: HelixBaseTreeItem["level"];
  /** Whether this item holds the tree's single tab stop. */
  focusable?: HelixBaseTreeItem["focusable"];

  /** Fired when the item is chosen. */
  onSelectionChange?: (e: HelixBaseTreeItemSelectionChangeElementEvent) => void;
};

export type HelixBaseTreeItemSolidJsProps = {
  /** Identifies the item to the consumer, carried in `SelectionChange`. */
  "prop:value"?: HelixBaseTreeItem["value"];
  /** Whether this item is the current one. */
  "prop:selected"?: HelixBaseTreeItem["selected"];
  /** Whether a branch is showing its children. */
  "prop:expanded"?: HelixBaseTreeItem["expanded"];
  /** Depth from the root, set by the tree so indentation needs no CSS nesting.

Not reflected. The tree assigns this after it upgrades, so an attribute
here would be a change to markup the consumer rendered and hydration would
report it. The indent it drives is written onto the row instead, inside the
shadow root, which is not part of the tree React hydrates. */
  "prop:level"?: HelixBaseTreeItem["level"];
  /** Whether this item holds the tree's single tab stop. */
  "prop:focusable"?: HelixBaseTreeItem["focusable"];
  /** Fired when the item is chosen. */
  "on:SelectionChange"?: (
    e: HelixBaseTreeItemSelectionChangeElementEvent,
  ) => void;

  /** Set the innerHTML of the element */
  innerHTML?: string;
  /** Set the textContent of the element */
  textContent?: string | number;
};

/** `HelixBaseTree` component event */
export type HelixBaseTreeElementEvent<E = Event> = TypedEvent<HelixBaseTree, E>;
/** `SelectionChange` event type */
export type HelixBaseTreeSelectionChangeElementEvent =
  HelixBaseTreeElementEvent<HelixSelectionChangeEvent>;

export type HelixBaseTreeProps = {
  /** Accessible name for the tree. */
  label?: HelixBaseTree["label"];
  /** Value of the selected item, kept in step with the items themselves. */
  value?: HelixBaseTree["value"];

  /** Fired when an item is chosen. Dispatched by the item and listened for here, because the tree is what a consumer holds a reference to. */
  onSelectionChange?: (e: HelixBaseTreeSelectionChangeElementEvent) => void;
};

export type HelixBaseTreeSolidJsProps = {
  /** Accessible name for the tree. */
  "prop:label"?: HelixBaseTree["label"];
  /** Value of the selected item, kept in step with the items themselves. */
  "prop:value"?: HelixBaseTree["value"];
  /** Fired when an item is chosen. Dispatched by the item and listened for here, because the tree is what a consumer holds a reference to. */
  "on:SelectionChange"?: (e: HelixBaseTreeSelectionChangeElementEvent) => void;

  /** Set the innerHTML of the element */
  innerHTML?: string;
  /** Set the textContent of the element */
  textContent?: string | number;
};

export type HelixBaseToolbarProps = {
  /** Accessible name for the toolbar. */
  label?: HelixBaseToolbar["label"];
  /** Which way the arrow keys move. */
  orientation?: HelixBaseToolbar["orientation"];
};

export type HelixBaseToolbarSolidJsProps = {
  /** Accessible name for the toolbar. */
  "prop:label"?: HelixBaseToolbar["label"];
  /** Which way the arrow keys move. */
  "prop:orientation"?: HelixBaseToolbar["orientation"];

  /** Set the innerHTML of the element */
  innerHTML?: string;
  /** Set the textContent of the element */
  textContent?: string | number;
};

export type CustomElements = {
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
   * - `chevron-placement`/`chevronPlacement`: Where the open indicator sits, or whether there is one.
   *
   * `auto` resolves to `end`, which is where a reader scanning a list of
   * summaries expects it: the label starts at the same x on every row, and the
   * indicator is found once at the edge rather than shifting with the text.
   * `start` is for a tree-like reading, where the indicator leads the label.
   * `none` is for a row that carries its own affordance and would otherwise
   * have two.
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
   * - `chevron`: The open and close indicator.
   * - `content`: The revealed region.
   * - `content-inner`: Padding wrapper inside the animated region.
   */
  "helix-base-accordion-item": Partial<
    HelixBaseAccordionItemProps & BaseProps<HelixBaseAccordionItem> & BaseEvents
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
   * The host is the banner and spans the viewport; the row inside it is what gets
   * centred. A banner that is itself narrowed leaves its background stopping
   * short of the window edges, which reads as a floating bar rather than as the
   * top of the page. That needs one element and one row, not a wrapper as well:
   * the host carries the material and `content` carries the measure.
   *
   * ## Attributes & Properties
   *
   * Component attributes and properties that can be applied to the element or by using JavaScript.
   *
   * - `nav-align`/`navAlign`: Where the navigation sits in the bar.
   *
   * `center` puts it in the middle of the banner rather than beside the brand,
   * which reads as the site's spine when the nav is the primary thing in the
   * header rather than an afterthought next to a logo.
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
   * - `content`: The centred row inside the banner.
   * - `nav`: The navigation region.
   */
  "helix-base-app-header": Partial<
    HelixBaseAppHeaderProps & BaseProps<HelixBaseAppHeader> & BaseEvents
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
   * - `icon`: The icon region.
   * - `content`: The content region.
   */
  "helix-base-callout": Partial<
    HelixBaseCalloutProps & BaseProps<HelixBaseCallout> & BaseEvents
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
   * Takes `WithOpen`, so `open`, `defaultOpen`, and `OpenChange` behave exactly
   * as they do on an accordion item, and a consumer already knows the API.
   *
   * Modal by default, which is three things together and not one: focus is
   * trapped inside, Escape and an outside press close it, and the page behind is
   * covered. A panel with the look of a modal and none of its behavior is worse
   * than an inline one, because it invites the reader to treat it as blocking.
   *
   * Content stays mounted when closed, so it is in the server's markup and can
   * animate. It is `inert` while closed, which takes it out of the tab order and
   * the accessibility tree without removing its box.
   *
   * ## Attributes & Properties
   *
   * Component attributes and properties that can be applied to the element or by using JavaScript.
   *
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
   * - `open`: Whether the element is open. Setting this enters controlled mode.
   * - `default-open`/`defaultOpen`: Initial open state for uncontrolled use. Ignored once `open` is set.
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
   * ## CSS Parts
   *
   * Custom selectors for styling elements within the component.
   *
   * - `scrim`: The cover over the page behind.
   * - `panel`: The sliding panel.
   * - `header`: The header region.
   * - `content`: The scrolling content region.
   */
  "helix-base-drawer": Partial<
    HelixBaseDrawerProps & BaseProps<HelixBaseDrawer> & BaseEvents
  >;

  /**
   * The set is Phosphor, drawn on a 256 box at stroke-width 16, and each glyph is
   * rendered as its own inner markup rather than as a single path. Most icons are
   * several elements at once, each with its own stroke and fill, so a one-path
   * model would draw a fraction of the set and quietly drop the rest.
   *
   * **The markup is trusted by construction.** It is generated at build time from
   * SVG files in this repository, never from anything a user supplies, which is
   * what makes `unsafeSVG` the right tool rather than a risk.
   *
   * A name with no match renders nothing at all instead of an empty box, so a
   * typo cannot leave a hole in a layout that looks deliberate.
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
   * Regions are slots rather than separate elements, because a header, body, and
   * footer carry no state, no behavior, and no API of their own. Slotting them
   * costs one custom element instead of five and lets the consumer bring their
   * own markup, so a title can be a real `<h2>` rather than an emulated one.
   *
   * The host is the surface. A wrapper `<div part="container">` would be a second
   * box doing nothing the host cannot: the element itself takes the border, the
   * radius, and the grid, and a consumer styles `helix-card` rather than reaching
   * through `::part`. One node instead of two, on every card on the page.
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
   */
  "helix-base-card": Partial<
    HelixBaseCardProps & BaseProps<HelixBaseCard> & BaseEvents
  >;

  /**
   * A grid rather than a `<table>`, so every column lines up across rows while
   * each row stays a real element that can be styled, hidden, or made
   * interactive. Table layout gives column alignment and takes away almost
   * everything else; grid gives both.
   *
   * The cost is that the roles have to be declared, since a grid of divs is not a
   * table to anyone reading it. `table`, `row`, `cell`, and `columnheader` are
   * all set explicitly, and rows are `display: contents` so their cells become
   * items of the one grid that does the aligning.
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
  "helix-base-table": Partial<
    HelixBaseTableProps & BaseProps<HelixBaseTable> & BaseEvents
  >;

  /**
   * `display: contents` in the styled tier, so the row's cells become items of
   * the table's own grid and every column lines up across every row. The row
   * still exists as an element, which is what a `<table>` gives away when its
   * cells are laid out by the table algorithm.
   *
   * ## Slots
   *
   * Areas where markup can be added to the component.
   *
   * - `(default)`: The row's cells.
   */
  "helix-base-table-row": Partial<
    HelixBaseTableRowProps & BaseProps<HelixBaseTableRow> & BaseEvents
  >;

  /**
   * Carries its own role, because a grid of divs is not a table to anything
   * reading it. `header` makes the cell a `columnheader`, which is what lets a
   * screen reader announce "Attribute, appearance" rather than just the value.
   *
   * The role goes on the host rather than inside the shadow root, because the
   * cell has to be a child of its row in the flat tree for the table's structure
   * to hold together.
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
  "helix-base-table-cell": Partial<
    HelixBaseTableCellProps & BaseProps<HelixBaseTableCell> & BaseEvents
  >;

  /**
   * Hidden rather than unmounted when inactive, so anything typed into a panel is
   * still there when the reader comes back to it, and so the content is in the
   * server's markup for a crawler regardless of which tab is open.
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
  "helix-base-tabs-panel": Partial<
    HelixBaseTabsPanelProps & BaseProps<HelixBaseTabsPanel> & BaseEvents
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
   * - `remove`: The remove button, when `removable`.
   */
  "helix-base-tag": Partial<
    HelixBaseTagProps & BaseProps<HelixBaseTag> & BaseEvents
  >;

  /**
   * Selection is coordinated by event, the same shape the accordion and the tree
   * use: a tab dispatches `SelectionChange` and the root pairs it with the panel
   * of the same value. Nothing registers with anything, so tabs added later work
   * without the root being told.
   *
   * The tab list is a single tab stop, moved with the arrow keys. Selection
   * follows focus, which is the right default for a small set where showing a
   * panel is cheap; a set where it is not should use `manual`.
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
  "helix-base-tabs": Partial<
    HelixBaseTabsProps & BaseProps<HelixBaseTabs> & BaseEvents
  >;

  /**
   * An element rather than a slot because it owns selection and its own tab stop.
   *
   * Its id and the id it controls are both derived from `value`, so the pairing
   * between a tab and its panel survives server rendering. A generated id would
   * differ between the server's render and the client's and break the link, and
   * `aria-controls` pointing at nothing is worse than not being there.
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
  "helix-base-tabs-tab": Partial<
    HelixBaseTabsTabProps & BaseProps<HelixBaseTabsTab> & BaseEvents
  >;

  /**
   * Renders an `<a>` when given an `href` and a `<button role="radio">`
   * otherwise, which is what lets one component serve both a set of options and a
   * navigation bar without either being a lie. A nav item that announces itself
   * as a radio is wrong, and so is a link that cannot be opened in a new tab.
   *
   * The selected item carries `aria-current="page"` in the link form and
   * `aria-checked` in the radio form, because those are the words each context
   * uses for the same idea.
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
  "helix-base-toggle-group-item": Partial<
    HelixBaseToggleGroupItemProps &
      BaseProps<HelixBaseToggleGroupItem> &
      BaseEvents
  >;

  /**
   * The indicator is one element that travels, not a background that appears on
   * whichever item is current. That difference is the whole point: a fill that
   * swaps is two things changing at once and reads as a flicker, while one that
   * moves is a single object the eye follows, and it says where the selection
   * came from as well as where it went.
   *
   * Its position and width are measured from the selected item and written onto
   * the indicator as custom properties, because labels are different lengths and
   * no proportion of the group is the right answer. Measurement is client-side by
   * necessity, so the server renders the indicator hidden and it fades in once it
   * has somewhere to be, which is the harmless direction: it appears rather than
   * jumping from a wrong place.
   *
   * `nav` makes the group a navigation landmark whose items are links, rather
   * than a radio group. A set of page links that announces itself as a radio
   * group is a lie, and it is the reason this exists rather than tabs being bent
   * to the purpose: a tab controls a panel.
   *
   * ## Attributes & Properties
   *
   * Component attributes and properties that can be applied to the element or by using JavaScript.
   *
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
   * ## CSS Parts
   *
   * Custom selectors for styling elements within the component.
   *
   * - `indicator`: The moving marker behind the selected item.
   */
  "helix-base-toggle-group": Partial<
    HelixBaseToggleGroupProps & BaseProps<HelixBaseToggleGroup> & BaseEvents
  >;

  /**
   * An element rather than a slot because it owns state: whether it is expanded,
   * whether it is selected, and whether it is the one holding focus.
   *
   * A branch is any item with something slotted into `children`, detected in
   * `firstUpdated` rather than declared by the consumer. That is a client-side
   * enhancement by necessity, since the server cannot inspect children, so the
   * server renders the node as a leaf and the twisty appears on hydration. It
   * appears rather than disappearing, which is the harmless direction.
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
  "helix-base-tree-item": Partial<
    HelixBaseTreeItemProps & BaseProps<HelixBaseTreeItem> & BaseEvents
  >;

  /**
   * Focus is a single tab stop, moved with the arrow keys, which is what the tree
   * pattern requires: a sidebar of forty items should not be forty presses of Tab
   * to get past. The tree owns which item is the tab stop and moves it as focus
   * moves, so the browser's own focus order is never fought with.
   *
   * Items are found with `instanceof`, never by tag name, so the headless tier
   * does not learn about the styled one.
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
   * ## CSS Parts
   *
   * Custom selectors for styling elements within the component.
   *
   * - `tree`: The tree container.
   */
  "helix-base-tree": Partial<
    HelixBaseTreeProps & BaseProps<HelixBaseTree> & BaseEvents
  >;

  /**
   * Separate from a button group, and the difference is what it holds: a group is
   * homogeneous, a toolbar is not. A toolbar mixes buttons, toggles, and menus,
   * which is why it is its own component rather than a variant of something.
   *
   * The whole toolbar is one tab stop and the arrows move between controls, so a
   * page with three toolbars costs three presses of Tab to get past rather than
   * thirty. Controls are found by asking the browser what is focusable rather
   * than by matching tag names, so a toolbar works with anything put in it,
   * including a consumer's own elements.
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
   * ## CSS Parts
   *
   * Custom selectors for styling elements within the component.
   *
   * - `toolbar`: The toolbar container.
   */
  "helix-base-toolbar": Partial<
    HelixBaseToolbarProps & BaseProps<HelixBaseToolbar> & BaseEvents
  >;
};

export type CustomElementsSolidJs = {
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
   * - `chevron-placement`/`chevronPlacement`: Where the open indicator sits, or whether there is one.
   *
   * `auto` resolves to `end`, which is where a reader scanning a list of
   * summaries expects it: the label starts at the same x on every row, and the
   * indicator is found once at the edge rather than shifting with the text.
   * `start` is for a tree-like reading, where the indicator leads the label.
   * `none` is for a row that carries its own affordance and would otherwise
   * have two.
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
   * - `chevron`: The open and close indicator.
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
   * The host is the banner and spans the viewport; the row inside it is what gets
   * centred. A banner that is itself narrowed leaves its background stopping
   * short of the window edges, which reads as a floating bar rather than as the
   * top of the page. That needs one element and one row, not a wrapper as well:
   * the host carries the material and `content` carries the measure.
   *
   * ## Attributes & Properties
   *
   * Component attributes and properties that can be applied to the element or by using JavaScript.
   *
   * - `nav-align`/`navAlign`: Where the navigation sits in the bar.
   *
   * `center` puts it in the middle of the banner rather than beside the brand,
   * which reads as the site's spine when the nav is the primary thing in the
   * header rather than an afterthought next to a logo.
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
   * - `content`: The centred row inside the banner.
   * - `nav`: The navigation region.
   */
  "helix-base-app-header": Partial<
    HelixBaseAppHeaderProps &
      HelixBaseAppHeaderSolidJsProps &
      BaseProps<HelixBaseAppHeader> &
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
   * Takes `WithOpen`, so `open`, `defaultOpen`, and `OpenChange` behave exactly
   * as they do on an accordion item, and a consumer already knows the API.
   *
   * Modal by default, which is three things together and not one: focus is
   * trapped inside, Escape and an outside press close it, and the page behind is
   * covered. A panel with the look of a modal and none of its behavior is worse
   * than an inline one, because it invites the reader to treat it as blocking.
   *
   * Content stays mounted when closed, so it is in the server's markup and can
   * animate. It is `inert` while closed, which takes it out of the tab order and
   * the accessibility tree without removing its box.
   *
   * ## Attributes & Properties
   *
   * Component attributes and properties that can be applied to the element or by using JavaScript.
   *
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
   * - `open`: Whether the element is open. Setting this enters controlled mode.
   * - `default-open`/`defaultOpen`: Initial open state for uncontrolled use. Ignored once `open` is set.
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
   * ## CSS Parts
   *
   * Custom selectors for styling elements within the component.
   *
   * - `scrim`: The cover over the page behind.
   * - `panel`: The sliding panel.
   * - `header`: The header region.
   * - `content`: The scrolling content region.
   */
  "helix-base-drawer": Partial<
    HelixBaseDrawerProps &
      HelixBaseDrawerSolidJsProps &
      BaseProps<HelixBaseDrawer> &
      BaseEvents
  >;

  /**
   * The set is Phosphor, drawn on a 256 box at stroke-width 16, and each glyph is
   * rendered as its own inner markup rather than as a single path. Most icons are
   * several elements at once, each with its own stroke and fill, so a one-path
   * model would draw a fraction of the set and quietly drop the rest.
   *
   * **The markup is trusted by construction.** It is generated at build time from
   * SVG files in this repository, never from anything a user supplies, which is
   * what makes `unsafeSVG` the right tool rather than a risk.
   *
   * A name with no match renders nothing at all instead of an empty box, so a
   * typo cannot leave a hole in a layout that looks deliberate.
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
   * Regions are slots rather than separate elements, because a header, body, and
   * footer carry no state, no behavior, and no API of their own. Slotting them
   * costs one custom element instead of five and lets the consumer bring their
   * own markup, so a title can be a real `<h2>` rather than an emulated one.
   *
   * The host is the surface. A wrapper `<div part="container">` would be a second
   * box doing nothing the host cannot: the element itself takes the border, the
   * radius, and the grid, and a consumer styles `helix-card` rather than reaching
   * through `::part`. One node instead of two, on every card on the page.
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
   */
  "helix-base-card": Partial<
    HelixBaseCardProps &
      HelixBaseCardSolidJsProps &
      BaseProps<HelixBaseCard> &
      BaseEvents
  >;

  /**
   * A grid rather than a `<table>`, so every column lines up across rows while
   * each row stays a real element that can be styled, hidden, or made
   * interactive. Table layout gives column alignment and takes away almost
   * everything else; grid gives both.
   *
   * The cost is that the roles have to be declared, since a grid of divs is not a
   * table to anyone reading it. `table`, `row`, `cell`, and `columnheader` are
   * all set explicitly, and rows are `display: contents` so their cells become
   * items of the one grid that does the aligning.
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
  "helix-base-table": Partial<
    HelixBaseTableProps &
      HelixBaseTableSolidJsProps &
      BaseProps<HelixBaseTable> &
      BaseEvents
  >;

  /**
   * `display: contents` in the styled tier, so the row's cells become items of
   * the table's own grid and every column lines up across every row. The row
   * still exists as an element, which is what a `<table>` gives away when its
   * cells are laid out by the table algorithm.
   *
   * ## Slots
   *
   * Areas where markup can be added to the component.
   *
   * - `(default)`: The row's cells.
   */
  "helix-base-table-row": Partial<
    HelixBaseTableRowProps &
      HelixBaseTableRowSolidJsProps &
      BaseProps<HelixBaseTableRow> &
      BaseEvents
  >;

  /**
   * Carries its own role, because a grid of divs is not a table to anything
   * reading it. `header` makes the cell a `columnheader`, which is what lets a
   * screen reader announce "Attribute, appearance" rather than just the value.
   *
   * The role goes on the host rather than inside the shadow root, because the
   * cell has to be a child of its row in the flat tree for the table's structure
   * to hold together.
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
  "helix-base-table-cell": Partial<
    HelixBaseTableCellProps &
      HelixBaseTableCellSolidJsProps &
      BaseProps<HelixBaseTableCell> &
      BaseEvents
  >;

  /**
   * Hidden rather than unmounted when inactive, so anything typed into a panel is
   * still there when the reader comes back to it, and so the content is in the
   * server's markup for a crawler regardless of which tab is open.
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
  "helix-base-tabs-panel": Partial<
    HelixBaseTabsPanelProps &
      HelixBaseTabsPanelSolidJsProps &
      BaseProps<HelixBaseTabsPanel> &
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
   * - `remove`: The remove button, when `removable`.
   */
  "helix-base-tag": Partial<
    HelixBaseTagProps &
      HelixBaseTagSolidJsProps &
      BaseProps<HelixBaseTag> &
      BaseEvents
  >;

  /**
   * Selection is coordinated by event, the same shape the accordion and the tree
   * use: a tab dispatches `SelectionChange` and the root pairs it with the panel
   * of the same value. Nothing registers with anything, so tabs added later work
   * without the root being told.
   *
   * The tab list is a single tab stop, moved with the arrow keys. Selection
   * follows focus, which is the right default for a small set where showing a
   * panel is cheap; a set where it is not should use `manual`.
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
  "helix-base-tabs": Partial<
    HelixBaseTabsProps &
      HelixBaseTabsSolidJsProps &
      BaseProps<HelixBaseTabs> &
      BaseEvents
  >;

  /**
   * An element rather than a slot because it owns selection and its own tab stop.
   *
   * Its id and the id it controls are both derived from `value`, so the pairing
   * between a tab and its panel survives server rendering. A generated id would
   * differ between the server's render and the client's and break the link, and
   * `aria-controls` pointing at nothing is worse than not being there.
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
  "helix-base-tabs-tab": Partial<
    HelixBaseTabsTabProps &
      HelixBaseTabsTabSolidJsProps &
      BaseProps<HelixBaseTabsTab> &
      BaseEvents
  >;

  /**
   * Renders an `<a>` when given an `href` and a `<button role="radio">`
   * otherwise, which is what lets one component serve both a set of options and a
   * navigation bar without either being a lie. A nav item that announces itself
   * as a radio is wrong, and so is a link that cannot be opened in a new tab.
   *
   * The selected item carries `aria-current="page"` in the link form and
   * `aria-checked` in the radio form, because those are the words each context
   * uses for the same idea.
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
  "helix-base-toggle-group-item": Partial<
    HelixBaseToggleGroupItemProps &
      HelixBaseToggleGroupItemSolidJsProps &
      BaseProps<HelixBaseToggleGroupItem> &
      BaseEvents
  >;

  /**
   * The indicator is one element that travels, not a background that appears on
   * whichever item is current. That difference is the whole point: a fill that
   * swaps is two things changing at once and reads as a flicker, while one that
   * moves is a single object the eye follows, and it says where the selection
   * came from as well as where it went.
   *
   * Its position and width are measured from the selected item and written onto
   * the indicator as custom properties, because labels are different lengths and
   * no proportion of the group is the right answer. Measurement is client-side by
   * necessity, so the server renders the indicator hidden and it fades in once it
   * has somewhere to be, which is the harmless direction: it appears rather than
   * jumping from a wrong place.
   *
   * `nav` makes the group a navigation landmark whose items are links, rather
   * than a radio group. A set of page links that announces itself as a radio
   * group is a lie, and it is the reason this exists rather than tabs being bent
   * to the purpose: a tab controls a panel.
   *
   * ## Attributes & Properties
   *
   * Component attributes and properties that can be applied to the element or by using JavaScript.
   *
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
   * ## CSS Parts
   *
   * Custom selectors for styling elements within the component.
   *
   * - `indicator`: The moving marker behind the selected item.
   */
  "helix-base-toggle-group": Partial<
    HelixBaseToggleGroupProps &
      HelixBaseToggleGroupSolidJsProps &
      BaseProps<HelixBaseToggleGroup> &
      BaseEvents
  >;

  /**
   * An element rather than a slot because it owns state: whether it is expanded,
   * whether it is selected, and whether it is the one holding focus.
   *
   * A branch is any item with something slotted into `children`, detected in
   * `firstUpdated` rather than declared by the consumer. That is a client-side
   * enhancement by necessity, since the server cannot inspect children, so the
   * server renders the node as a leaf and the twisty appears on hydration. It
   * appears rather than disappearing, which is the harmless direction.
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
  "helix-base-tree-item": Partial<
    HelixBaseTreeItemProps &
      HelixBaseTreeItemSolidJsProps &
      BaseProps<HelixBaseTreeItem> &
      BaseEvents
  >;

  /**
   * Focus is a single tab stop, moved with the arrow keys, which is what the tree
   * pattern requires: a sidebar of forty items should not be forty presses of Tab
   * to get past. The tree owns which item is the tab stop and moves it as focus
   * moves, so the browser's own focus order is never fought with.
   *
   * Items are found with `instanceof`, never by tag name, so the headless tier
   * does not learn about the styled one.
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
   * ## CSS Parts
   *
   * Custom selectors for styling elements within the component.
   *
   * - `tree`: The tree container.
   */
  "helix-base-tree": Partial<
    HelixBaseTreeProps &
      HelixBaseTreeSolidJsProps &
      BaseProps<HelixBaseTree> &
      BaseEvents
  >;

  /**
   * Separate from a button group, and the difference is what it holds: a group is
   * homogeneous, a toolbar is not. A toolbar mixes buttons, toggles, and menus,
   * which is why it is its own component rather than a variant of something.
   *
   * The whole toolbar is one tab stop and the arrows move between controls, so a
   * page with three toolbars costs three presses of Tab to get past rather than
   * thirty. Controls are found by asking the browser what is focusable rather
   * than by matching tag names, so a toolbar works with anything put in it,
   * including a consumer's own elements.
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
   * ## CSS Parts
   *
   * Custom selectors for styling elements within the component.
   *
   * - `toolbar`: The toolbar container.
   */
  "helix-base-toolbar": Partial<
    HelixBaseToolbarProps &
      HelixBaseToolbarSolidJsProps &
      BaseProps<HelixBaseToolbar> &
      BaseEvents
  >;
};

export type CustomCssProperties = {
  /** Track list for the columns. */
  "--table-columns"?: string;
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
