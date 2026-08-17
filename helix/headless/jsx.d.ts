import type {
  Helix,
  HelixBaseAccordion,
  HelixBaseAccordionItem,
  HelixBaseAnnouncement,
  HelixBaseAppHeader,
  HelixBaseAvatar,
  HelixBaseAvatarGroup,
  HelixBaseBadge,
  HelixBaseBlockquote,
  HelixBaseBreadcrumb,
  HelixBaseBreadcrumbs,
  HelixBaseButton,
  HelixBaseButtonGroup,
  HelixBaseCalendar,
  HelixBaseCallout,
  HelixBaseCard,
  HelixBaseCarousel,
  HelixBaseCheckbox,
  HelixBaseCheckboxGroup,
  HelixBaseDialog,
  HelixBaseDivider,
  HelixBaseDrawer,
  HelixBaseDrilldown,
  HelixBaseDrilldownItem,
  HelixBaseEmpty,
  HelixBaseIcon,
  HelixBaseIconButton,
  HelixBaseInput,
  HelixBaseKbd,
  HelixBaseList,
  HelixBaseListItem,
  HelixBaseListbox,
  HelixBaseMenu,
  HelixBaseMenuItem,
  HelixBaseNavigation,
  HelixBaseOption,
  HelixBaseOptionGroup,
  HelixBaseOutline,
  HelixBasePopover,
  HelixBaseProgress,
  HelixBaseQuote,
  HelixBaseRadio,
  HelixBaseRadioGroup,
  HelixBaseSelect,
  HelixBaseSkeleton,
  HelixBaseSlider,
  HelixBaseSpinner,
  HelixBaseStat,
  HelixBaseStatGroup,
  HelixBaseSwitch,
  HelixBaseTable,
  HelixBaseTableCell,
  HelixBaseTableColumn,
  HelixBaseTableRow,
  HelixBaseTabs,
  HelixBaseTabsPanel,
  HelixBaseTabsTab,
  HelixBaseTag,
  HelixBaseTextarea,
  HelixBaseToast,
  HelixBaseToastItem,
  HelixBaseToggle,
  HelixBaseToggleGroup,
  HelixBaseToolbar,
  HelixBaseTooltip,
  HelixBaseTree,
  HelixBaseTreeItem,
  HelixChangeEvent,
  HelixCloseEvent,
  HelixDismissEvent,
  HelixFilterEvent,
  HelixFormElement,
  HelixNavigateEvent,
  HelixOpenEvent,
  HelixSelectEvent,
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
/** `helix-close` event type */
export type HelixBaseAccordionItemHelixCloseElementEvent =
  HelixBaseAccordionItemElementEvent<HelixCloseEvent>;
/** `helix-open` event type */
export type HelixBaseAccordionItemHelixOpenElementEvent =
  HelixBaseAccordionItemElementEvent<HelixOpenEvent>;

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
  /** Whether the element is open.

One property, not two. Reading gives the real state whichever mode the
element is in, so `dialog.open` answers the question anyone asking it
meant. Writing hands ownership to the consumer, which is what the
attribute in `<helix-dialog open>` does as well: from then on the element
announces changes and applies none of them.

It reads as an accessor pair rather than a field because those are two
different questions sharing one name, and the alternative was a second
property answering the first. That worked for a boolean, where `isOpen`
reads well; there is no such word for a value or an active item, so all
four of these mixins now have this shape instead of two shapes.

**Not reflected, and that is required rather than tidy.** Reflection
writes the resolved state back as an attribute, and writing the attribute
is how a consumer says they own it. So an uncontrolled element that
opened itself would put `open` on its own host and, from the next thing
that read it, be indistinguishable from one the consumer controls:
cloned, serialised for hydration, or diffed by a framework, it would come
back controlled and stop responding. `data-open` carries the resolved
state for stylesheets, which is what it has always been for. */
  open?: HelixBaseAccordionItem["open"];
  /** Initial open state for uncontrolled use, where nothing declared one. */
  "default-open"?: HelixBaseAccordionItem["defaultOpen"];
  /** Initial open state for uncontrolled use, where nothing declared one. */
  defaultOpen?: HelixBaseAccordionItem["defaultOpen"];
  /** The consumer's callback, invoked after the state is applied.

Not an attribute: it is a function. And not reachable from React's JSX,
which reserves every `on[A-Z]` prop for its own event system and drops
what it does not recognize; the generated wrapper listens for the events
instead. */
  onOpenChange?: HelixBaseAccordionItem["onOpenChange"];

  /** Fired before the section closes, and cancelable. */
  "onhelix-close"?: (e: HelixBaseAccordionItemHelixCloseElementEvent) => void;
  /** Fired when the item opens or closes. */
  "onhelix-open"?: (e: HelixBaseAccordionItemHelixOpenElementEvent) => void;
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
  /** Whether the element is open.

One property, not two. Reading gives the real state whichever mode the
element is in, so `dialog.open` answers the question anyone asking it
meant. Writing hands ownership to the consumer, which is what the
attribute in `<helix-dialog open>` does as well: from then on the element
announces changes and applies none of them.

It reads as an accessor pair rather than a field because those are two
different questions sharing one name, and the alternative was a second
property answering the first. That worked for a boolean, where `isOpen`
reads well; there is no such word for a value or an active item, so all
four of these mixins now have this shape instead of two shapes.

**Not reflected, and that is required rather than tidy.** Reflection
writes the resolved state back as an attribute, and writing the attribute
is how a consumer says they own it. So an uncontrolled element that
opened itself would put `open` on its own host and, from the next thing
that read it, be indistinguishable from one the consumer controls:
cloned, serialised for hydration, or diffed by a framework, it would come
back controlled and stop responding. `data-open` carries the resolved
state for stylesheets, which is what it has always been for. */
  "prop:open"?: HelixBaseAccordionItem["open"];
  /** Initial open state for uncontrolled use, where nothing declared one. */
  "bool:default-open"?: HelixBaseAccordionItem["defaultOpen"];
  /** Initial open state for uncontrolled use, where nothing declared one. */
  "prop:defaultOpen"?: HelixBaseAccordionItem["defaultOpen"];
  /** The consumer's callback, invoked after the state is applied.

Not an attribute: it is a function. And not reachable from React's JSX,
which reserves every `on[A-Z]` prop for its own event system and drops
what it does not recognize; the generated wrapper listens for the events
instead. */
  "prop:onOpenChange"?: HelixBaseAccordionItem["onOpenChange"];
  /** Fired before the section closes, and cancelable. */
  "on:helix-close"?: (e: HelixBaseAccordionItemHelixCloseElementEvent) => void;
  /** Fired when the item opens or closes. */
  "on:helix-open"?: (e: HelixBaseAccordionItemHelixOpenElementEvent) => void;

  /** Set the innerHTML of the element */
  innerHTML?: string;
  /** Set the textContent of the element */
  textContent?: string | number;
};

export type HelixBaseAccordionProps = {
  /** How many sections may be open at once.

Absent is `multiple`, so nothing closes unexpectedly and the default costs
no attribute on the host. `single` keeps exactly one open and refuses to
close the last; `single-collapsible` keeps at most one and lets it close.

A union rather than a mode plus a `collapsible` boolean, which would make
`collapsible` alongside `multiple` expressible and meaningless. */
  mode?: HelixBaseAccordion["mode"];
};

export type HelixBaseAccordionSolidJsProps = {
  /** How many sections may be open at once.

Absent is `multiple`, so nothing closes unexpectedly and the default costs
no attribute on the host. `single` keeps exactly one open and refuses to
close the last; `single-collapsible` keeps at most one and lets it close.

A union rather than a mode plus a `collapsible` boolean, which would make
`collapsible` alongside `multiple` expressible and meaningless. */
  "prop:mode"?: HelixBaseAccordion["mode"];

  /** Set the innerHTML of the element */
  innerHTML?: string;
  /** Set the textContent of the element */
  textContent?: string | number;
};

/** `HelixBaseAnnouncement` component event */
export type HelixBaseAnnouncementElementEvent<E = Event> = TypedEvent<
  HelixBaseAnnouncement,
  E
>;
/** `helix-dismiss` event type */
export type HelixBaseAnnouncementHelixDismissElementEvent =
  HelixBaseAnnouncementElementEvent<HelixDismissEvent>;

export type HelixBaseAnnouncementProps = {
  /** What kind of attention the message needs. */
  severity?: HelixBaseAnnouncement["severity"];
  /** Whether it offers a control to take it away. */
  dismissible?: HelixBaseAnnouncement["dismissible"];
  /** Accessible name for that control.

`attribute` is spelled out because Lit lowercases a property name to
derive one rather than dash-casing it, so this would otherwise be
reachable only as `dismisslabel`, which nobody would guess and no linter
would catch. */
  "dismiss-label"?: HelixBaseAnnouncement["dismissLabel"];
  /** Accessible name for that control.

`attribute` is spelled out because Lit lowercases a property name to
derive one rather than dash-casing it, so this would otherwise be
reachable only as `dismisslabel`, which nobody would guess and no linter
would catch. */
  dismissLabel?: HelixBaseAnnouncement["dismissLabel"];

  /** Fired when the reader asks to close it. */
  "onhelix-dismiss"?: (
    e: HelixBaseAnnouncementHelixDismissElementEvent,
  ) => void;
};

export type HelixBaseAnnouncementSolidJsProps = {
  /** What kind of attention the message needs. */
  "prop:severity"?: HelixBaseAnnouncement["severity"];
  /** Whether it offers a control to take it away. */
  "prop:dismissible"?: HelixBaseAnnouncement["dismissible"];
  /** Accessible name for that control.

`attribute` is spelled out because Lit lowercases a property name to
derive one rather than dash-casing it, so this would otherwise be
reachable only as `dismisslabel`, which nobody would guess and no linter
would catch. */
  "attr:dismiss-label"?: HelixBaseAnnouncement["dismissLabel"];
  /** Accessible name for that control.

`attribute` is spelled out because Lit lowercases a property name to
derive one rather than dash-casing it, so this would otherwise be
reachable only as `dismisslabel`, which nobody would guess and no linter
would catch. */
  "prop:dismissLabel"?: HelixBaseAnnouncement["dismissLabel"];
  /** Fired when the reader asks to close it. */
  "on:helix-dismiss"?: (
    e: HelixBaseAnnouncementHelixDismissElementEvent,
  ) => void;

  /** Set the innerHTML of the element */
  innerHTML?: string;
  /** Set the textContent of the element */
  textContent?: string | number;
};

export type HelixBaseAppHeaderProps = {
  /** Where the navigation sits in the bar.

Centered by default, which reads as the site's spine when the navigation is
the primary thing in the header rather than an afterthought beside a logo.
Centered against the banner rather than against whatever space the brand
left over, so the middle of the nav is the middle of the window whatever
the wordmark and the actions happen to measure.

`start` is the opt-out, for a header whose navigation trails the brand. */
  "nav-align"?: HelixBaseAppHeader["navAlign"];
  /** Where the navigation sits in the bar.

Centered by default, which reads as the site's spine when the navigation is
the primary thing in the header rather than an afterthought beside a logo.
Centered against the banner rather than against whatever space the brand
left over, so the middle of the nav is the middle of the window whatever
the wordmark and the actions happen to measure.

`start` is the opt-out, for a header whose navigation trails the brand. */
  navAlign?: HelixBaseAppHeader["navAlign"];
};

export type HelixBaseAppHeaderSolidJsProps = {
  /** Where the navigation sits in the bar.

Centered by default, which reads as the site's spine when the navigation is
the primary thing in the header rather than an afterthought beside a logo.
Centered against the banner rather than against whatever space the brand
left over, so the middle of the nav is the middle of the window whatever
the wordmark and the actions happen to measure.

`start` is the opt-out, for a header whose navigation trails the brand. */
  "attr:nav-align"?: HelixBaseAppHeader["navAlign"];
  /** Where the navigation sits in the bar.

Centered by default, which reads as the site's spine when the navigation is
the primary thing in the header rather than an afterthought beside a logo.
Centered against the banner rather than against whatever space the brand
left over, so the middle of the nav is the middle of the window whatever
the wordmark and the actions happen to measure.

`start` is the opt-out, for a header whose navigation trails the brand. */
  "prop:navAlign"?: HelixBaseAppHeader["navAlign"];

  /** Set the innerHTML of the element */
  innerHTML?: string;
  /** Set the textContent of the element */
  textContent?: string | number;
};

export type HelixBaseAvatarGroupProps = {
  /** Accessible name for the set, such as "Reviewers". */
  label?: HelixBaseAvatarGroup["label"];
  /** How many avatars are shown before the rest become a count.

Zero or less shows all of them, which is what an unset limit means and is
more useful than refusing to render. */
  max?: HelixBaseAvatarGroup["max"];
};

export type HelixBaseAvatarGroupSolidJsProps = {
  /** Accessible name for the set, such as "Reviewers". */
  "prop:label"?: HelixBaseAvatarGroup["label"];
  /** How many avatars are shown before the rest become a count.

Zero or less shows all of them, which is what an unset limit means and is
more useful than refusing to render. */
  "prop:max"?: HelixBaseAvatarGroup["max"];

  /** Set the innerHTML of the element */
  innerHTML?: string;
  /** Set the textContent of the element */
  textContent?: string | number;
};

/** `HelixBaseAvatar` component event */
export type HelixBaseAvatarElementEvent<E = Event> = TypedEvent<
  HelixBaseAvatar,
  E
>;

export type HelixBaseAvatarProps = {
  /** Image to show. Falls back to the slot, or to initials, if it fails. */
  src?: HelixBaseAvatar["src"];
  /** Name of the person or entity. Used for the label and the initials. */
  name?: HelixBaseAvatar["name"];

  /** Relayed from the image once it has loaded. */
  onload?: (e: HelixBaseAvatarElementEvent) => void;
  /** Relayed from the image when it fails. */
  onerror?: (e: HelixBaseAvatarElementEvent) => void;
};

export type HelixBaseAvatarSolidJsProps = {
  /** Image to show. Falls back to the slot, or to initials, if it fails. */
  "prop:src"?: HelixBaseAvatar["src"];
  /** Name of the person or entity. Used for the label and the initials. */
  "prop:name"?: HelixBaseAvatar["name"];
  /** Relayed from the image once it has loaded. */
  "on:load"?: (e: HelixBaseAvatarElementEvent) => void;
  /** Relayed from the image when it fails. */
  "on:error"?: (e: HelixBaseAvatarElementEvent) => void;

  /** Set the innerHTML of the element */
  innerHTML?: string;
  /** Set the textContent of the element */
  textContent?: string | number;
};

export type HelixBaseBadgeProps = {
  /** The count or short text to show. Absent shows a dot, zero shows nothing. */
  value?: HelixBaseBadge["value"];
  /** Cap for a numeric value. Past it the indicator reads `{max}+`. */
  max?: HelixBaseBadge["max"];
  /** Accessible name. Required for a dot, which has no text to read. */
  label?: HelixBaseBadge["label"];
};

export type HelixBaseBadgeSolidJsProps = {
  /** The count or short text to show. Absent shows a dot, zero shows nothing. */
  "prop:value"?: HelixBaseBadge["value"];
  /** Cap for a numeric value. Past it the indicator reads `{max}+`. */
  "prop:max"?: HelixBaseBadge["max"];
  /** Accessible name. Required for a dot, which has no text to read. */
  "prop:label"?: HelixBaseBadge["label"];

  /** Set the innerHTML of the element */
  innerHTML?: string;
  /** Set the textContent of the element */
  textContent?: string | number;
};

export type HelixBaseBlockquoteProps = {
  /** URL identifying where the passage came from. */
  cite?: HelixBaseBlockquote["cite"];
};

export type HelixBaseBlockquoteSolidJsProps = {
  /** URL identifying where the passage came from. */
  "prop:cite"?: HelixBaseBlockquote["cite"];

  /** Set the innerHTML of the element */
  innerHTML?: string;
  /** Set the textContent of the element */
  textContent?: string | number;
};

export type HelixBaseBreadcrumbProps = {
  /** Whether this item is the page the reader is on. */
  current?: HelixBaseBreadcrumb["current"];
};

export type HelixBaseBreadcrumbSolidJsProps = {
  /** Whether this item is the page the reader is on. */
  "prop:current"?: HelixBaseBreadcrumb["current"];

  /** Set the innerHTML of the element */
  innerHTML?: string;
  /** Set the textContent of the element */
  textContent?: string | number;
};

export type HelixBaseBreadcrumbsProps = {};

export type HelixBaseBreadcrumbsSolidJsProps = {
  /** Set the innerHTML of the element */
  innerHTML?: string;
  /** Set the textContent of the element */
  textContent?: string | number;
};

export type HelixBaseButtonGroupProps = {
  /** Accessible name for the group.

On the host through internals, so an author's `aria-label` still overrides
it and nothing lands on the host that a consumer's markup did not have. */
  label?: HelixBaseButtonGroup["label"];
};

export type HelixBaseButtonGroupSolidJsProps = {
  /** Accessible name for the group.

On the host through internals, so an author's `aria-label` still overrides
it and nothing lands on the host that a consumer's markup did not have. */
  "prop:label"?: HelixBaseButtonGroup["label"];

  /** Set the innerHTML of the element */
  innerHTML?: string;
  /** Set the textContent of the element */
  textContent?: string | number;
};

export type HelixBaseButtonProps = {
  /** What activating the button does to its form. */
  type?: HelixBaseButton["type"];
  /** Accessible name, for a button whose content is not text.

Lives here rather than only on `IconButton` so the two share one render.
An icon-only button without it is a control a screen reader announces as
"button" and nothing else. */
  label?: HelixBaseButton["label"];
  /** What to send when the button is activated, and what to send it to.

The platform's invoker attributes, forwarded onto the inner `<button>`
rather than left on the host: only a real button is recognized as an
invoker, so `commandfor` written on a custom element resolves nothing and
the trigger silently does nothing at all. A wrapper has to hand them down,
the same way `label` becomes `aria-label` in there.

```html
<helix-button commandfor="confirm" command="--show">Delete…</helix-button>
```

`commandFor` spells its attribute out, because Lit lowercases a property
name to derive one rather than dash-casing it, and what a consumer writes
is the platform's `commandfor`. */
  command?: HelixBaseButton["command"];
  /** The id of the element the command is sent to. */
  commandfor?: HelixBaseButton["commandFor"];
  /** The id of the element the command is sent to. */
  commandFor?: HelixBaseButton["commandFor"];
  /** Whether the control is non-interactive.

Reflected, because the styled tier selects on it, and mirrored to
`aria-disabled` rather than removing the element from the accessibility
tree, so a screen reader can still announce that the control exists. */
  disabled?: HelixBaseButton["disabled"];
  /** Name submitted with the form.

**Reflected, and it is the exception to "reflect only what CSS selects
on".** The platform builds a form's entry list from the `name` *content
attribute*, not from the property, so a control named through the property
submitted under no name at all and was silently dropped. Measured: two
inputs in one form, one named by attribute and one by property, and the
form carried a single entry.

Safe for a React consumer, which is what the rule is protecting: React
renders a custom element's props as attributes on the server, so the name
is already in the markup being hydrated and reflecting it writes what is
there. It is only a change to the markup when a consumer assigns it
imperatively later, and nothing is hydrating by then.

Here rather than on each control, where it was declared eight times and
reflected none of them. */
  name?: HelixBaseButton["name"];
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
  /** Accessible name, for a button whose content is not text.

Lives here rather than only on `IconButton` so the two share one render.
An icon-only button without it is a control a screen reader announces as
"button" and nothing else. */
  "prop:label"?: HelixBaseButton["label"];
  /** What to send when the button is activated, and what to send it to.

The platform's invoker attributes, forwarded onto the inner `<button>`
rather than left on the host: only a real button is recognized as an
invoker, so `commandfor` written on a custom element resolves nothing and
the trigger silently does nothing at all. A wrapper has to hand them down,
the same way `label` becomes `aria-label` in there.

```html
<helix-button commandfor="confirm" command="--show">Delete…</helix-button>
```

`commandFor` spells its attribute out, because Lit lowercases a property
name to derive one rather than dash-casing it, and what a consumer writes
is the platform's `commandfor`. */
  "prop:command"?: HelixBaseButton["command"];
  /** The id of the element the command is sent to. */
  "attr:commandfor"?: HelixBaseButton["commandFor"];
  /** The id of the element the command is sent to. */
  "prop:commandFor"?: HelixBaseButton["commandFor"];
  /** Whether the control is non-interactive.

Reflected, because the styled tier selects on it, and mirrored to
`aria-disabled` rather than removing the element from the accessibility
tree, so a screen reader can still announce that the control exists. */
  "prop:disabled"?: HelixBaseButton["disabled"];
  /** Name submitted with the form.

**Reflected, and it is the exception to "reflect only what CSS selects
on".** The platform builds a form's entry list from the `name` *content
attribute*, not from the property, so a control named through the property
submitted under no name at all and was silently dropped. Measured: two
inputs in one form, one named by attribute and one by property, and the
form carried a single entry.

Safe for a React consumer, which is what the rule is protecting: React
renders a custom element's props as attributes on the server, so the name
is already in the markup being hydrated and reflecting it writes what is
there. It is only a change to the markup when a consumer assigns it
imperatively later, and nothing is hydrating by then.

Here rather than on each control, where it was declared eight times and
reflected none of them. */
  "prop:name"?: HelixBaseButton["name"];
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

/** `HelixBaseCalendar` component event */
export type HelixBaseCalendarElementEvent<E = Event> = TypedEvent<
  HelixBaseCalendar,
  E
>;
/** `helix-change` event type */
export type HelixBaseCalendarHelixChangeElementEvent =
  HelixBaseCalendarElementEvent<HelixChangeEvent>;
/** `helix-navigate` event type */
export type HelixBaseCalendarHelixNavigateElementEvent =
  HelixBaseCalendarElementEvent<HelixNavigateEvent>;

export type HelixBaseCalendarProps = {
  /** How many dates can be held at once. */
  mode?: HelixBaseCalendar["mode"];
  /** How many months to show, side by side. */
  months?: HelixBaseCalendar["months"];
  /** Locale for month and day names. Absent uses the runtime's own. */
  locale?: HelixBaseCalendar["locale"];
  /** Dates that cannot be chosen, comma separated, as `YYYY-MM-DD`. */
  "disable-dates"?: HelixBaseCalendar["disableDates"];
  /** Dates that cannot be chosen, comma separated, as `YYYY-MM-DD`. */
  disableDates?: HelixBaseCalendar["disableDates"];
  /** Days of the week that cannot be chosen, comma separated, `0` to `6`. */
  "disable-days"?: HelixBaseCalendar["disableDays"];
  /** Days of the week that cannot be chosen, comma separated, `0` to `6`. */
  disableDays?: HelixBaseCalendar["disableDays"];
  /** Whether the current selection fails validation. */
  invalid?: HelixBaseCalendar["invalid"];
  /** The month on show, as `YYYY-MM`. Follows `value`, then the current month.

Separate from `value` on purpose, so paging selects nothing and a consumer
can drive the view. It said that and could not do it: the calendar wrote
this when the reader paged, so a consumer holding it was overwritten and
never told. Reading gives the month on show; writing declares it theirs,
and `default-month` seeds one the calendar owns. */
  month?: HelixBaseCalendar["month"];
  /** Accessible name for the control that pages back.

A property because this is the one component in the library that takes a
`locale`, and it carried two hardcoded English names with no way to change
them: a calendar rendering its own month names in Japanese still announced
its controls in English. `attribute:` spelled out, since Lit lowercases a
camelCase name rather than dash-casing it. */
  "previous-label"?: HelixBaseCalendar["previousLabel"];
  /** Accessible name for the control that pages back.

A property because this is the one component in the library that takes a
`locale`, and it carried two hardcoded English names with no way to change
them: a calendar rendering its own month names in Japanese still announced
its controls in English. `attribute:` spelled out, since Lit lowercases a
camelCase name rather than dash-casing it. */
  previousLabel?: HelixBaseCalendar["previousLabel"];
  /** Accessible name for the control that pages forward. */
  "next-label"?: HelixBaseCalendar["nextLabel"];
  /** Accessible name for the control that pages forward. */
  nextLabel?: HelixBaseCalendar["nextLabel"];
  /** Month to open on, where nothing declared one. */
  "default-month"?: HelixBaseCalendar["defaultMonth"];
  /** Month to open on, where nothing declared one. */
  defaultMonth?: HelixBaseCalendar["defaultMonth"];
  /** Earliest selectable date, as `YYYY-MM-DD`. */
  min?: HelixBaseCalendar["min"];
  /** Latest selectable date, as `YYYY-MM-DD`. */
  max?: HelixBaseCalendar["max"];
  /** Accessible name for the grid. */
  label?: HelixBaseCalendar["label"];
  /** First column of the week, `0` for Sunday through `6` for Saturday. */
  "first-day-of-week"?: HelixBaseCalendar["firstDayOfWeek"];
  /** First column of the week, `0` for Sunday through `6` for Saturday. */
  firstDayOfWeek?: HelixBaseCalendar["firstDayOfWeek"];
  /** The value the markup declared, which is where a reset returns to. */
  "default-value"?: HelixBaseCalendar["defaultValue"];
  /** The value the markup declared, which is where a reset returns to. */
  defaultValue?: HelixBaseCalendar["defaultValue"];
  /** What the control holds now, and what its form submits.

One property, not two. Reading gives the real value whichever mode the
control is in, so `input.value` answers the question anyone asking it
meant. Writing hands ownership to the consumer, which is what
`<helix-input value="x">` says too, and matches what a controlled input
means in React: the value is theirs and the control waits to be told.
`default-value` is how markup seeds one it does not want to own.

The same shape as the other three mixins, which is the point of them
being four of a kind rather than four of three kinds. */
  value?: HelixBaseCalendar["value"];
  /** Whether the control is non-interactive.

Reflected, because the styled tier selects on it, and mirrored to
`aria-disabled` rather than removing the element from the accessibility
tree, so a screen reader can still announce that the control exists. */
  disabled?: HelixBaseCalendar["disabled"];
  /** Name submitted with the form.

**Reflected, and it is the exception to "reflect only what CSS selects
on".** The platform builds a form's entry list from the `name` *content
attribute*, not from the property, so a control named through the property
submitted under no name at all and was silently dropped. Measured: two
inputs in one form, one named by attribute and one by property, and the
form carried a single entry.

Safe for a React consumer, which is what the rule is protecting: React
renders a custom element's props as attributes on the server, so the name
is already in the markup being hydrated and reflecting it writes what is
there. It is only a change to the markup when a consumer assigns it
imperatively later, and nothing is hydrating by then.

Here rather than on each control, where it was declared eight times and
reflected none of them. */
  name?: HelixBaseCalendar["name"];
  /** The consumer's callback, invoked after the value is applied.

Not an attribute: it is a function. `onValueChange` and not `onChange`,
because React reserves the latter for its own synthetic system and wires
it to the native `change`, so a Helix event named `Change` would never
fire at all. */
  onValueChange?: HelixBaseCalendar["onValueChange"];

  /** Fired before the dates change, and cancelable. */
  "onhelix-change"?: (e: HelixBaseCalendarHelixChangeElementEvent) => void;
  /** Fired before the month on show changes, and cancelable. */
  "onhelix-navigate"?: (e: HelixBaseCalendarHelixNavigateElementEvent) => void;
};

export type HelixBaseCalendarSolidJsProps = {
  /** How many dates can be held at once. */
  "prop:mode"?: HelixBaseCalendar["mode"];
  /** How many months to show, side by side. */
  "prop:months"?: HelixBaseCalendar["months"];
  /** Locale for month and day names. Absent uses the runtime's own. */
  "prop:locale"?: HelixBaseCalendar["locale"];
  /** Dates that cannot be chosen, comma separated, as `YYYY-MM-DD`. */
  "attr:disable-dates"?: HelixBaseCalendar["disableDates"];
  /** Dates that cannot be chosen, comma separated, as `YYYY-MM-DD`. */
  "prop:disableDates"?: HelixBaseCalendar["disableDates"];
  /** Days of the week that cannot be chosen, comma separated, `0` to `6`. */
  "attr:disable-days"?: HelixBaseCalendar["disableDays"];
  /** Days of the week that cannot be chosen, comma separated, `0` to `6`. */
  "prop:disableDays"?: HelixBaseCalendar["disableDays"];
  /** Whether the current selection fails validation. */
  "prop:invalid"?: HelixBaseCalendar["invalid"];
  /** The month on show, as `YYYY-MM`. Follows `value`, then the current month.

Separate from `value` on purpose, so paging selects nothing and a consumer
can drive the view. It said that and could not do it: the calendar wrote
this when the reader paged, so a consumer holding it was overwritten and
never told. Reading gives the month on show; writing declares it theirs,
and `default-month` seeds one the calendar owns. */
  "prop:month"?: HelixBaseCalendar["month"];
  /** Accessible name for the control that pages back.

A property because this is the one component in the library that takes a
`locale`, and it carried two hardcoded English names with no way to change
them: a calendar rendering its own month names in Japanese still announced
its controls in English. `attribute:` spelled out, since Lit lowercases a
camelCase name rather than dash-casing it. */
  "attr:previous-label"?: HelixBaseCalendar["previousLabel"];
  /** Accessible name for the control that pages back.

A property because this is the one component in the library that takes a
`locale`, and it carried two hardcoded English names with no way to change
them: a calendar rendering its own month names in Japanese still announced
its controls in English. `attribute:` spelled out, since Lit lowercases a
camelCase name rather than dash-casing it. */
  "prop:previousLabel"?: HelixBaseCalendar["previousLabel"];
  /** Accessible name for the control that pages forward. */
  "attr:next-label"?: HelixBaseCalendar["nextLabel"];
  /** Accessible name for the control that pages forward. */
  "prop:nextLabel"?: HelixBaseCalendar["nextLabel"];
  /** Month to open on, where nothing declared one. */
  "attr:default-month"?: HelixBaseCalendar["defaultMonth"];
  /** Month to open on, where nothing declared one. */
  "prop:defaultMonth"?: HelixBaseCalendar["defaultMonth"];
  /** Earliest selectable date, as `YYYY-MM-DD`. */
  "prop:min"?: HelixBaseCalendar["min"];
  /** Latest selectable date, as `YYYY-MM-DD`. */
  "prop:max"?: HelixBaseCalendar["max"];
  /** Accessible name for the grid. */
  "prop:label"?: HelixBaseCalendar["label"];
  /** First column of the week, `0` for Sunday through `6` for Saturday. */
  "attr:first-day-of-week"?: HelixBaseCalendar["firstDayOfWeek"];
  /** First column of the week, `0` for Sunday through `6` for Saturday. */
  "prop:firstDayOfWeek"?: HelixBaseCalendar["firstDayOfWeek"];
  /** The value the markup declared, which is where a reset returns to. */
  "attr:default-value"?: HelixBaseCalendar["defaultValue"];
  /** The value the markup declared, which is where a reset returns to. */
  "prop:defaultValue"?: HelixBaseCalendar["defaultValue"];
  /** What the control holds now, and what its form submits.

One property, not two. Reading gives the real value whichever mode the
control is in, so `input.value` answers the question anyone asking it
meant. Writing hands ownership to the consumer, which is what
`<helix-input value="x">` says too, and matches what a controlled input
means in React: the value is theirs and the control waits to be told.
`default-value` is how markup seeds one it does not want to own.

The same shape as the other three mixins, which is the point of them
being four of a kind rather than four of three kinds. */
  "prop:value"?: HelixBaseCalendar["value"];
  /** Whether the control is non-interactive.

Reflected, because the styled tier selects on it, and mirrored to
`aria-disabled` rather than removing the element from the accessibility
tree, so a screen reader can still announce that the control exists. */
  "prop:disabled"?: HelixBaseCalendar["disabled"];
  /** Name submitted with the form.

**Reflected, and it is the exception to "reflect only what CSS selects
on".** The platform builds a form's entry list from the `name` *content
attribute*, not from the property, so a control named through the property
submitted under no name at all and was silently dropped. Measured: two
inputs in one form, one named by attribute and one by property, and the
form carried a single entry.

Safe for a React consumer, which is what the rule is protecting: React
renders a custom element's props as attributes on the server, so the name
is already in the markup being hydrated and reflecting it writes what is
there. It is only a change to the markup when a consumer assigns it
imperatively later, and nothing is hydrating by then.

Here rather than on each control, where it was declared eight times and
reflected none of them. */
  "prop:name"?: HelixBaseCalendar["name"];
  /** The consumer's callback, invoked after the value is applied.

Not an attribute: it is a function. `onValueChange` and not `onChange`,
because React reserves the latter for its own synthetic system and wires
it to the native `change`, so a Helix event named `Change` would never
fire at all. */
  "prop:onValueChange"?: HelixBaseCalendar["onValueChange"];
  /** Fired before the dates change, and cancelable. */
  "on:helix-change"?: (e: HelixBaseCalendarHelixChangeElementEvent) => void;
  /** Fired before the month on show changes, and cancelable. */
  "on:helix-navigate"?: (e: HelixBaseCalendarHelixNavigateElementEvent) => void;

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

/** `HelixBaseCarousel` component event */
export type HelixBaseCarouselElementEvent<E = Event> = TypedEvent<
  HelixBaseCarousel,
  E
>;
/** `helix-select` event type */
export type HelixBaseCarouselHelixSelectElementEvent =
  HelixBaseCarouselElementEvent<HelixSelectEvent>;

export type HelixBaseCarouselProps = {
  /** Accessible name for the carousel. */
  label?: HelixBaseCarousel["label"];
  /** The slide in view, counted from zero.

Reading gives the real slide, in either mode. Writing sets it, the way a
script assigning to a native control does. Which mode the carousel is in is
read once, at the first update, from whether anything had declared an
`index` by then: declared, and the consumer owns it and the carousel only
announces where it would have gone; not declared, and the carousel owns it
and `default-index` says where it starts.

The same contract the four mixins carry, written out here rather than
extracted, because a slide is addressed by position and every one of those
mixins is keyed by a name. One consumer is not a mixin: if a second numeric
state turns up, this is what it is extracted from. */
  index?: HelixBaseCarousel["index"];
  /** Slide to start on, where nothing declared one. */
  "default-index"?: HelixBaseCarousel["defaultIndex"];
  /** Slide to start on, where nothing declared one. */
  defaultIndex?: HelixBaseCarousel["defaultIndex"];
  /** Whether moving past either end wraps to the other. */
  loop?: HelixBaseCarousel["loop"];
  /** Whether the carousel advances on its own. */
  autoplay?: HelixBaseCarousel["autoplay"];
  /** How long each slide is held, in milliseconds. */
  interval?: HelixBaseCarousel["interval"];

  /** Fired when the slide in view changes, with its index. */
  "onhelix-select"?: (e: HelixBaseCarouselHelixSelectElementEvent) => void;
};

export type HelixBaseCarouselSolidJsProps = {
  /** Accessible name for the carousel. */
  "prop:label"?: HelixBaseCarousel["label"];
  /** The slide in view, counted from zero.

Reading gives the real slide, in either mode. Writing sets it, the way a
script assigning to a native control does. Which mode the carousel is in is
read once, at the first update, from whether anything had declared an
`index` by then: declared, and the consumer owns it and the carousel only
announces where it would have gone; not declared, and the carousel owns it
and `default-index` says where it starts.

The same contract the four mixins carry, written out here rather than
extracted, because a slide is addressed by position and every one of those
mixins is keyed by a name. One consumer is not a mixin: if a second numeric
state turns up, this is what it is extracted from. */
  "prop:index"?: HelixBaseCarousel["index"];
  /** Slide to start on, where nothing declared one. */
  "attr:default-index"?: HelixBaseCarousel["defaultIndex"];
  /** Slide to start on, where nothing declared one. */
  "prop:defaultIndex"?: HelixBaseCarousel["defaultIndex"];
  /** Whether moving past either end wraps to the other. */
  "prop:loop"?: HelixBaseCarousel["loop"];
  /** Whether the carousel advances on its own. */
  "prop:autoplay"?: HelixBaseCarousel["autoplay"];
  /** How long each slide is held, in milliseconds. */
  "prop:interval"?: HelixBaseCarousel["interval"];
  /** Fired when the slide in view changes, with its index. */
  "on:helix-select"?: (e: HelixBaseCarouselHelixSelectElementEvent) => void;

  /** Set the innerHTML of the element */
  innerHTML?: string;
  /** Set the textContent of the element */
  textContent?: string | number;
};

/** `HelixBaseCheckboxGroup` component event */
export type HelixBaseCheckboxGroupElementEvent<E = Event> = TypedEvent<
  HelixBaseCheckboxGroup,
  E
>;
/** `helix-change` event type */
export type HelixBaseCheckboxGroupHelixChangeElementEvent =
  HelixBaseCheckboxGroupElementEvent<HelixChangeEvent>;

export type HelixBaseCheckboxGroupProps = {
  /** Whether the whole set is out of play.

Its own property rather than an inherited one, because this group is not
form-associated and `disabled` arrives with `HelixFormElement`. The boxes
are each form-associated and have their own, which is exactly why the two
have to be reconciled rather than simply written over. */
  disabled?: HelixBaseCheckboxGroup["disabled"];
  /** Name submitted with the form, given to every box that has none. */
  name?: HelixBaseCheckboxGroup["name"];
  /** The checked values, comma separated. */
  value?: HelixBaseCheckboxGroup["value"];
  /** Help under the control, shown while there is nothing wrong. */
  hint?: HelixBaseCheckboxGroup["hint"];
  /** What is wrong, in the reader's words rather than the browser's. */
  feedback?: HelixBaseCheckboxGroup["feedback"];
  /** The accessible name, and the fallback for the `label` slot. */
  label?: HelixBaseCheckboxGroup["label"];
  /** Whether the form refuses to submit without it. */
  required?: HelixBaseCheckboxGroup["required"];

  /** Fired when any box changes, with the whole set. */
  "onhelix-change"?: (e: HelixBaseCheckboxGroupHelixChangeElementEvent) => void;
};

export type HelixBaseCheckboxGroupSolidJsProps = {
  /** Whether the whole set is out of play.

Its own property rather than an inherited one, because this group is not
form-associated and `disabled` arrives with `HelixFormElement`. The boxes
are each form-associated and have their own, which is exactly why the two
have to be reconciled rather than simply written over. */
  "prop:disabled"?: HelixBaseCheckboxGroup["disabled"];
  /** Name submitted with the form, given to every box that has none. */
  "prop:name"?: HelixBaseCheckboxGroup["name"];
  /** The checked values, comma separated. */
  "prop:value"?: HelixBaseCheckboxGroup["value"];
  /** Help under the control, shown while there is nothing wrong. */
  "prop:hint"?: HelixBaseCheckboxGroup["hint"];
  /** What is wrong, in the reader's words rather than the browser's. */
  "prop:feedback"?: HelixBaseCheckboxGroup["feedback"];
  /** The accessible name, and the fallback for the `label` slot. */
  "prop:label"?: HelixBaseCheckboxGroup["label"];
  /** Whether the form refuses to submit without it. */
  "prop:required"?: HelixBaseCheckboxGroup["required"];
  /** Fired when any box changes, with the whole set. */
  "on:helix-change"?: (
    e: HelixBaseCheckboxGroupHelixChangeElementEvent,
  ) => void;

  /** Set the innerHTML of the element */
  innerHTML?: string;
  /** Set the textContent of the element */
  textContent?: string | number;
};

/** `HelixBaseCheckbox` component event */
export type HelixBaseCheckboxElementEvent<E = Event> = TypedEvent<
  HelixBaseCheckbox,
  E
>;
/** `helix-change` event type */
export type HelixBaseCheckboxHelixChangeElementEvent =
  HelixBaseCheckboxElementEvent<HelixChangeEvent>;

export type HelixBaseCheckboxProps = {
  /** Value submitted when the box is checked. */
  value?: HelixBaseCheckbox["value"];
  /** Whether the box shows as neither checked nor unchecked.

Presentation only. It never submits, and the first change resolves it. */
  indeterminate?: HelixBaseCheckbox["indeterminate"];
  /** Whether the control is checked.

One property rather than two. Reading gives the real state whichever
mode the control is in; writing hands ownership to the consumer, which
is what the attribute in `<helix-checkbox checked>` does as well. The
same shape all four of these mixins have, for the reason given on
`MixinControllerOpen.open`.

Not reflected: the attribute is the consumer's input and stays as they
wrote it, and `data-checked` carries the resolved state for stylesheets. */
  checked?: HelixBaseCheckbox["checked"];
  /** Initial checked state for uncontrolled use, where nothing declared one. */
  "default-checked"?: HelixBaseCheckbox["defaultChecked"];
  /** Initial checked state for uncontrolled use, where nothing declared one. */
  defaultChecked?: HelixBaseCheckbox["defaultChecked"];
  /** Help under the control, shown while there is nothing wrong. */
  hint?: HelixBaseCheckbox["hint"];
  /** What is wrong, in the reader's words rather than the browser's. */
  feedback?: HelixBaseCheckbox["feedback"];
  /** The accessible name, and the fallback for the `label` slot. */
  label?: HelixBaseCheckbox["label"];
  /** Whether the form refuses to submit without it. */
  required?: HelixBaseCheckbox["required"];
  /** Whether the control is non-interactive.

Reflected, because the styled tier selects on it, and mirrored to
`aria-disabled` rather than removing the element from the accessibility
tree, so a screen reader can still announce that the control exists. */
  disabled?: HelixBaseCheckbox["disabled"];
  /** Name submitted with the form.

**Reflected, and it is the exception to "reflect only what CSS selects
on".** The platform builds a form's entry list from the `name` *content
attribute*, not from the property, so a control named through the property
submitted under no name at all and was silently dropped. Measured: two
inputs in one form, one named by attribute and one by property, and the
form carried a single entry.

Safe for a React consumer, which is what the rule is protecting: React
renders a custom element's props as attributes on the server, so the name
is already in the markup being hydrated and reflecting it writes what is
there. It is only a change to the markup when a consumer assigns it
imperatively later, and nothing is hydrating by then.

Here rather than on each control, where it was declared eight times and
reflected none of them. */
  name?: HelixBaseCheckbox["name"];
  /** The consumer's callback, invoked after the state is applied.

Not an attribute: it is a function. And not reachable from React's JSX,
which reserves every `on[A-Z]` prop for its own event system and drops
what it does not recognize; the generated wrapper listens for the event
instead. */
  onCheckedChange?: HelixBaseCheckbox["onCheckedChange"];

  /** Fired before the state changes, and cancelable. */
  "onhelix-change"?: (e: HelixBaseCheckboxHelixChangeElementEvent) => void;
  /** Relayed from the input once the state has changed. */
  onchange?: (e: HelixBaseCheckboxElementEvent) => void;
};

export type HelixBaseCheckboxSolidJsProps = {
  /** Value submitted when the box is checked. */
  "prop:value"?: HelixBaseCheckbox["value"];
  /** Whether the box shows as neither checked nor unchecked.

Presentation only. It never submits, and the first change resolves it. */
  "prop:indeterminate"?: HelixBaseCheckbox["indeterminate"];
  /** Whether the control is checked.

One property rather than two. Reading gives the real state whichever
mode the control is in; writing hands ownership to the consumer, which
is what the attribute in `<helix-checkbox checked>` does as well. The
same shape all four of these mixins have, for the reason given on
`MixinControllerOpen.open`.

Not reflected: the attribute is the consumer's input and stays as they
wrote it, and `data-checked` carries the resolved state for stylesheets. */
  "prop:checked"?: HelixBaseCheckbox["checked"];
  /** Initial checked state for uncontrolled use, where nothing declared one. */
  "bool:default-checked"?: HelixBaseCheckbox["defaultChecked"];
  /** Initial checked state for uncontrolled use, where nothing declared one. */
  "prop:defaultChecked"?: HelixBaseCheckbox["defaultChecked"];
  /** Help under the control, shown while there is nothing wrong. */
  "prop:hint"?: HelixBaseCheckbox["hint"];
  /** What is wrong, in the reader's words rather than the browser's. */
  "prop:feedback"?: HelixBaseCheckbox["feedback"];
  /** The accessible name, and the fallback for the `label` slot. */
  "prop:label"?: HelixBaseCheckbox["label"];
  /** Whether the form refuses to submit without it. */
  "prop:required"?: HelixBaseCheckbox["required"];
  /** Whether the control is non-interactive.

Reflected, because the styled tier selects on it, and mirrored to
`aria-disabled` rather than removing the element from the accessibility
tree, so a screen reader can still announce that the control exists. */
  "prop:disabled"?: HelixBaseCheckbox["disabled"];
  /** Name submitted with the form.

**Reflected, and it is the exception to "reflect only what CSS selects
on".** The platform builds a form's entry list from the `name` *content
attribute*, not from the property, so a control named through the property
submitted under no name at all and was silently dropped. Measured: two
inputs in one form, one named by attribute and one by property, and the
form carried a single entry.

Safe for a React consumer, which is what the rule is protecting: React
renders a custom element's props as attributes on the server, so the name
is already in the markup being hydrated and reflecting it writes what is
there. It is only a change to the markup when a consumer assigns it
imperatively later, and nothing is hydrating by then.

Here rather than on each control, where it was declared eight times and
reflected none of them. */
  "prop:name"?: HelixBaseCheckbox["name"];
  /** The consumer's callback, invoked after the state is applied.

Not an attribute: it is a function. And not reachable from React's JSX,
which reserves every `on[A-Z]` prop for its own event system and drops
what it does not recognize; the generated wrapper listens for the event
instead. */
  "prop:onCheckedChange"?: HelixBaseCheckbox["onCheckedChange"];
  /** Fired before the state changes, and cancelable. */
  "on:helix-change"?: (e: HelixBaseCheckboxHelixChangeElementEvent) => void;
  /** Relayed from the input once the state has changed. */
  "on:change"?: (e: HelixBaseCheckboxElementEvent) => void;

  /** Set the innerHTML of the element */
  innerHTML?: string;
  /** Set the textContent of the element */
  textContent?: string | number;
};

/** `HelixBaseDialog` component event */
export type HelixBaseDialogElementEvent<E = Event> = TypedEvent<
  HelixBaseDialog,
  E
>;
/** `helix-open` event type */
export type HelixBaseDialogHelixOpenElementEvent =
  HelixBaseDialogElementEvent<HelixOpenEvent>;
/** `helix-close` event type */
export type HelixBaseDialogHelixCloseElementEvent =
  HelixBaseDialogElementEvent<HelixCloseEvent>;

export type HelixBaseDialogProps = {
  /** Accessible name for the dialog. */
  label?: HelixBaseDialog["label"];
  /** Whether Escape and the backdrop can close it.

Off for a dialog that must be answered. It does not disable the close
control a consumer slots in: refusing to be dismissed is not the same as
refusing to be closed, and a dialog with no way out at all is a trap. */
  persistent?: HelixBaseDialog["persistent"];
  /** Whether the element is open.

One property, not two. Reading gives the real state whichever mode the
element is in, so `dialog.open` answers the question anyone asking it
meant. Writing hands ownership to the consumer, which is what the
attribute in `<helix-dialog open>` does as well: from then on the element
announces changes and applies none of them.

It reads as an accessor pair rather than a field because those are two
different questions sharing one name, and the alternative was a second
property answering the first. That worked for a boolean, where `isOpen`
reads well; there is no such word for a value or an active item, so all
four of these mixins now have this shape instead of two shapes.

**Not reflected, and that is required rather than tidy.** Reflection
writes the resolved state back as an attribute, and writing the attribute
is how a consumer says they own it. So an uncontrolled element that
opened itself would put `open` on its own host and, from the next thing
that read it, be indistinguishable from one the consumer controls:
cloned, serialised for hydration, or diffed by a framework, it would come
back controlled and stop responding. `data-open` carries the resolved
state for stylesheets, which is what it has always been for. */
  open?: HelixBaseDialog["open"];
  /** Initial open state for uncontrolled use, where nothing declared one. */
  "default-open"?: HelixBaseDialog["defaultOpen"];
  /** Initial open state for uncontrolled use, where nothing declared one. */
  defaultOpen?: HelixBaseDialog["defaultOpen"];
  /** The consumer's callback, invoked after the state is applied.

Not an attribute: it is a function. And not reachable from React's JSX,
which reserves every `on[A-Z]` prop for its own event system and drops
what it does not recognize; the generated wrapper listens for the events
instead. */
  onOpenChange?: HelixBaseDialog["onOpenChange"];

  /** Fired before it opens, and cancelable. */
  "onhelix-open"?: (e: HelixBaseDialogHelixOpenElementEvent) => void;
  /** Fired before it closes, and cancelable. */
  "onhelix-close"?: (e: HelixBaseDialogHelixCloseElementEvent) => void;
};

export type HelixBaseDialogSolidJsProps = {
  /** Accessible name for the dialog. */
  "prop:label"?: HelixBaseDialog["label"];
  /** Whether Escape and the backdrop can close it.

Off for a dialog that must be answered. It does not disable the close
control a consumer slots in: refusing to be dismissed is not the same as
refusing to be closed, and a dialog with no way out at all is a trap. */
  "prop:persistent"?: HelixBaseDialog["persistent"];
  /** Whether the element is open.

One property, not two. Reading gives the real state whichever mode the
element is in, so `dialog.open` answers the question anyone asking it
meant. Writing hands ownership to the consumer, which is what the
attribute in `<helix-dialog open>` does as well: from then on the element
announces changes and applies none of them.

It reads as an accessor pair rather than a field because those are two
different questions sharing one name, and the alternative was a second
property answering the first. That worked for a boolean, where `isOpen`
reads well; there is no such word for a value or an active item, so all
four of these mixins now have this shape instead of two shapes.

**Not reflected, and that is required rather than tidy.** Reflection
writes the resolved state back as an attribute, and writing the attribute
is how a consumer says they own it. So an uncontrolled element that
opened itself would put `open` on its own host and, from the next thing
that read it, be indistinguishable from one the consumer controls:
cloned, serialised for hydration, or diffed by a framework, it would come
back controlled and stop responding. `data-open` carries the resolved
state for stylesheets, which is what it has always been for. */
  "prop:open"?: HelixBaseDialog["open"];
  /** Initial open state for uncontrolled use, where nothing declared one. */
  "bool:default-open"?: HelixBaseDialog["defaultOpen"];
  /** Initial open state for uncontrolled use, where nothing declared one. */
  "prop:defaultOpen"?: HelixBaseDialog["defaultOpen"];
  /** The consumer's callback, invoked after the state is applied.

Not an attribute: it is a function. And not reachable from React's JSX,
which reserves every `on[A-Z]` prop for its own event system and drops
what it does not recognize; the generated wrapper listens for the events
instead. */
  "prop:onOpenChange"?: HelixBaseDialog["onOpenChange"];
  /** Fired before it opens, and cancelable. */
  "on:helix-open"?: (e: HelixBaseDialogHelixOpenElementEvent) => void;
  /** Fired before it closes, and cancelable. */
  "on:helix-close"?: (e: HelixBaseDialogHelixCloseElementEvent) => void;

  /** Set the innerHTML of the element */
  innerHTML?: string;
  /** Set the textContent of the element */
  textContent?: string | number;
};

export type HelixBaseDividerProps = {
  /** Which way the rule runs. */
  orientation?: HelixBaseDivider["orientation"];
  /** Whether the rule is announced as a separator.

Off by default, and out of the accessibility tree. Most rules on a page
separate nothing: they underline a heading or close a section that space
had already closed, and announcing every one as a separator is noise a
screen-reader user has to walk past.

An opt-in, not a `decorative` opt-out, because a boolean attribute cannot
be turned off: `decorative="false"` parses as `true`, which would put the
quiet default out of reach from HTML and leave it settable only as a
property. An opt-in is absent by default, which every reflected property
here has to be. */
  announced?: HelixBaseDivider["announced"];
};

export type HelixBaseDividerSolidJsProps = {
  /** Which way the rule runs. */
  "prop:orientation"?: HelixBaseDivider["orientation"];
  /** Whether the rule is announced as a separator.

Off by default, and out of the accessibility tree. Most rules on a page
separate nothing: they underline a heading or close a section that space
had already closed, and announcing every one as a separator is noise a
screen-reader user has to walk past.

An opt-in, not a `decorative` opt-out, because a boolean attribute cannot
be turned off: `decorative="false"` parses as `true`, which would put the
quiet default out of reach from HTML and leave it settable only as a
property. An opt-in is absent by default, which every reflected property
here has to be. */
  "prop:announced"?: HelixBaseDivider["announced"];

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
/** `helix-close` event type */
export type HelixBaseDrawerHelixCloseElementEvent =
  HelixBaseDrawerElementEvent<HelixCloseEvent>;
/** `helix-open` event type */
export type HelixBaseDrawerHelixOpenElementEvent =
  HelixBaseDrawerElementEvent<HelixOpenEvent>;

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
  /** Whether the element is open.

One property, not two. Reading gives the real state whichever mode the
element is in, so `dialog.open` answers the question anyone asking it
meant. Writing hands ownership to the consumer, which is what the
attribute in `<helix-dialog open>` does as well: from then on the element
announces changes and applies none of them.

It reads as an accessor pair rather than a field because those are two
different questions sharing one name, and the alternative was a second
property answering the first. That worked for a boolean, where `isOpen`
reads well; there is no such word for a value or an active item, so all
four of these mixins now have this shape instead of two shapes.

**Not reflected, and that is required rather than tidy.** Reflection
writes the resolved state back as an attribute, and writing the attribute
is how a consumer says they own it. So an uncontrolled element that
opened itself would put `open` on its own host and, from the next thing
that read it, be indistinguishable from one the consumer controls:
cloned, serialised for hydration, or diffed by a framework, it would come
back controlled and stop responding. `data-open` carries the resolved
state for stylesheets, which is what it has always been for. */
  open?: HelixBaseDrawer["open"];
  /** Initial open state for uncontrolled use, where nothing declared one. */
  "default-open"?: HelixBaseDrawer["defaultOpen"];
  /** Initial open state for uncontrolled use, where nothing declared one. */
  defaultOpen?: HelixBaseDrawer["defaultOpen"];
  /** The consumer's callback, invoked after the state is applied.

Not an attribute: it is a function. And not reachable from React's JSX,
which reserves every `on[A-Z]` prop for its own event system and drops
what it does not recognize; the generated wrapper listens for the events
instead. */
  onOpenChange?: HelixBaseDrawer["onOpenChange"];

  /** Fired before the panel closes, and cancelable. */
  "onhelix-close"?: (e: HelixBaseDrawerHelixCloseElementEvent) => void;
  /** Fired when the drawer opens or closes. */
  "onhelix-open"?: (e: HelixBaseDrawerHelixOpenElementEvent) => void;
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
  /** Whether the element is open.

One property, not two. Reading gives the real state whichever mode the
element is in, so `dialog.open` answers the question anyone asking it
meant. Writing hands ownership to the consumer, which is what the
attribute in `<helix-dialog open>` does as well: from then on the element
announces changes and applies none of them.

It reads as an accessor pair rather than a field because those are two
different questions sharing one name, and the alternative was a second
property answering the first. That worked for a boolean, where `isOpen`
reads well; there is no such word for a value or an active item, so all
four of these mixins now have this shape instead of two shapes.

**Not reflected, and that is required rather than tidy.** Reflection
writes the resolved state back as an attribute, and writing the attribute
is how a consumer says they own it. So an uncontrolled element that
opened itself would put `open` on its own host and, from the next thing
that read it, be indistinguishable from one the consumer controls:
cloned, serialised for hydration, or diffed by a framework, it would come
back controlled and stop responding. `data-open` carries the resolved
state for stylesheets, which is what it has always been for. */
  "prop:open"?: HelixBaseDrawer["open"];
  /** Initial open state for uncontrolled use, where nothing declared one. */
  "bool:default-open"?: HelixBaseDrawer["defaultOpen"];
  /** Initial open state for uncontrolled use, where nothing declared one. */
  "prop:defaultOpen"?: HelixBaseDrawer["defaultOpen"];
  /** The consumer's callback, invoked after the state is applied.

Not an attribute: it is a function. And not reachable from React's JSX,
which reserves every `on[A-Z]` prop for its own event system and drops
what it does not recognize; the generated wrapper listens for the events
instead. */
  "prop:onOpenChange"?: HelixBaseDrawer["onOpenChange"];
  /** Fired before the panel closes, and cancelable. */
  "on:helix-close"?: (e: HelixBaseDrawerHelixCloseElementEvent) => void;
  /** Fired when the drawer opens or closes. */
  "on:helix-open"?: (e: HelixBaseDrawerHelixOpenElementEvent) => void;

  /** Set the innerHTML of the element */
  innerHTML?: string;
  /** Set the textContent of the element */
  textContent?: string | number;
};

/** `HelixBaseDrilldownItem` component event */
export type HelixBaseDrilldownItemElementEvent<E = Event> = TypedEvent<
  HelixBaseDrilldownItem,
  E
>;
/** `helix-select` event type */
export type HelixBaseDrilldownItemHelixSelectElementEvent =
  HelixBaseDrilldownItemElementEvent<HelixSelectEvent>;

export type HelixBaseDrilldownItemProps = {
  /** Whether the row can be reached at all. */
  disabled?: HelixBaseDrilldownItem["disabled"];
  /** Identifies the row to whatever is listening. */
  value?: HelixBaseDrilldownItem["value"];
  /** Whether the page showing is the one this row is on. Written by the stack. */
  onPage?: HelixBaseDrilldownItem["onPage"];
  /** Whether this row's own page is the one showing. Written by the stack. */
  showingPage?: HelixBaseDrilldownItem["showingPage"];
  /** Whether this row holds the region's tab stop. Written by the stack.

A drill-down keeps one stop and moves within it on the arrows, so every
other row is at `-1`. Every row was, including the first, which left
nothing in the region tab-reachable at all: the keyboard could not get in
without first clicking something with a pointer.

No attribute, the same as `Button`'s: this is coordination between
elements, and writing `tabindex` onto a host the consumer rendered is a
change a React consumer's hydration reports and does not patch up. The stop
lands inside this shadow root instead. */
  focusable?: HelixBaseDrilldownItem["focusable"];

  /** Fired when the row is chosen. */
  "onhelix-select"?: (e: HelixBaseDrilldownItemHelixSelectElementEvent) => void;
};

export type HelixBaseDrilldownItemSolidJsProps = {
  /** Whether the row can be reached at all. */
  "prop:disabled"?: HelixBaseDrilldownItem["disabled"];
  /** Identifies the row to whatever is listening. */
  "prop:value"?: HelixBaseDrilldownItem["value"];
  /** Whether the page showing is the one this row is on. Written by the stack. */
  "prop:onPage"?: HelixBaseDrilldownItem["onPage"];
  /** Whether this row's own page is the one showing. Written by the stack. */
  "prop:showingPage"?: HelixBaseDrilldownItem["showingPage"];
  /** Whether this row holds the region's tab stop. Written by the stack.

A drill-down keeps one stop and moves within it on the arrows, so every
other row is at `-1`. Every row was, including the first, which left
nothing in the region tab-reachable at all: the keyboard could not get in
without first clicking something with a pointer.

No attribute, the same as `Button`'s: this is coordination between
elements, and writing `tabindex` onto a host the consumer rendered is a
change a React consumer's hydration reports and does not patch up. The stop
lands inside this shadow root instead. */
  "prop:focusable"?: HelixBaseDrilldownItem["focusable"];
  /** Fired when the row is chosen. */
  "on:helix-select"?: (
    e: HelixBaseDrilldownItemHelixSelectElementEvent,
  ) => void;

  /** Set the innerHTML of the element */
  innerHTML?: string;
  /** Set the textContent of the element */
  textContent?: string | number;
};

/** `HelixBaseDrilldown` component event */
export type HelixBaseDrilldownElementEvent<E = Event> = TypedEvent<
  HelixBaseDrilldown,
  E
>;
/** `helix-select` event type */
export type HelixBaseDrilldownHelixSelectElementEvent =
  HelixBaseDrilldownElementEvent<HelixSelectEvent>;

export type HelixBaseDrilldownProps = {
  /** Accessible name for the region. */
  label?: HelixBaseDrilldown["label"];
  /** What the control returning from a page reads. */
  "back-label"?: HelixBaseDrilldown["backLabel"];
  /** What the control returning from a page reads. */
  backLabel?: HelixBaseDrilldown["backLabel"];

  /** Fired when a row with no page is chosen. */
  "onhelix-select"?: (e: HelixBaseDrilldownHelixSelectElementEvent) => void;
};

export type HelixBaseDrilldownSolidJsProps = {
  /** Accessible name for the region. */
  "prop:label"?: HelixBaseDrilldown["label"];
  /** What the control returning from a page reads. */
  "attr:back-label"?: HelixBaseDrilldown["backLabel"];
  /** What the control returning from a page reads. */
  "prop:backLabel"?: HelixBaseDrilldown["backLabel"];
  /** Fired when a row with no page is chosen. */
  "on:helix-select"?: (e: HelixBaseDrilldownHelixSelectElementEvent) => void;

  /** Set the innerHTML of the element */
  innerHTML?: string;
  /** Set the textContent of the element */
  textContent?: string | number;
};

export type HelixBaseEmptyProps = {
  /** Whether the state is announced when it appears.

On by default: an empty view almost always replaces something that was
loading. Turn it off for one that was on the page from the start, which
has nothing to announce because nothing changed. */
  "no-announce"?: HelixBaseEmpty["noAnnounce"];
  /** Whether the state is announced when it appears.

On by default: an empty view almost always replaces something that was
loading. Turn it off for one that was on the page from the start, which
has nothing to announce because nothing changed. */
  noAnnounce?: HelixBaseEmpty["noAnnounce"];
};

export type HelixBaseEmptySolidJsProps = {
  /** Whether the state is announced when it appears.

On by default: an empty view almost always replaces something that was
loading. Turn it off for one that was on the page from the start, which
has nothing to announce because nothing changed. */
  "bool:no-announce"?: HelixBaseEmpty["noAnnounce"];
  /** Whether the state is announced when it appears.

On by default: an empty view almost always replaces something that was
loading. Turn it off for one that was on the page from the start, which
has nothing to announce because nothing changed. */
  "prop:noAnnounce"?: HelixBaseEmpty["noAnnounce"];

  /** Set the innerHTML of the element */
  innerHTML?: string;
  /** Set the textContent of the element */
  textContent?: string | number;
};

export type HelixBaseIconButtonProps = {
  /** What activating the button does to its form. */
  type?: HelixBaseIconButton["type"];
  /** Accessible name, for a button whose content is not text.

Lives here rather than only on `IconButton` so the two share one render.
An icon-only button without it is a control a screen reader announces as
"button" and nothing else. */
  label?: HelixBaseIconButton["label"];
  /** What to send when the button is activated, and what to send it to.

The platform's invoker attributes, forwarded onto the inner `<button>`
rather than left on the host: only a real button is recognized as an
invoker, so `commandfor` written on a custom element resolves nothing and
the trigger silently does nothing at all. A wrapper has to hand them down,
the same way `label` becomes `aria-label` in there.

```html
<helix-button commandfor="confirm" command="--show">Delete…</helix-button>
```

`commandFor` spells its attribute out, because Lit lowercases a property
name to derive one rather than dash-casing it, and what a consumer writes
is the platform's `commandfor`. */
  command?: HelixBaseIconButton["command"];
  /** The id of the element the command is sent to. */
  commandfor?: HelixBaseIconButton["commandFor"];
  /** The id of the element the command is sent to. */
  commandFor?: HelixBaseIconButton["commandFor"];
  /** Whether the control is non-interactive.

Reflected, because the styled tier selects on it, and mirrored to
`aria-disabled` rather than removing the element from the accessibility
tree, so a screen reader can still announce that the control exists. */
  disabled?: HelixBaseIconButton["disabled"];
  /** Name submitted with the form.

**Reflected, and it is the exception to "reflect only what CSS selects
on".** The platform builds a form's entry list from the `name` *content
attribute*, not from the property, so a control named through the property
submitted under no name at all and was silently dropped. Measured: two
inputs in one form, one named by attribute and one by property, and the
form carried a single entry.

Safe for a React consumer, which is what the rule is protecting: React
renders a custom element's props as attributes on the server, so the name
is already in the markup being hydrated and reflecting it writes what is
there. It is only a change to the markup when a consumer assigns it
imperatively later, and nothing is hydrating by then.

Here rather than on each control, where it was declared eight times and
reflected none of them. */
  name?: HelixBaseIconButton["name"];
  /** Whether the button holds its group's tab stop.

A toolbar keeps one tab stop across its children, and the obvious way to do
that is to write `tabindex` onto each of them. That is a change to markup
the consumer rendered, so a React consumer's hydration reports it and does
not patch it up. A parent sets this property instead, which writes nothing,
and the stop lands on the inner control inside the shadow root.

No attribute, because it is coordination between elements rather than
anything a consumer sets. */
  focusable?: HelixBaseIconButton["focusable"];
};

export type HelixBaseIconButtonSolidJsProps = {
  /** What activating the button does to its form. */
  "prop:type"?: HelixBaseIconButton["type"];
  /** Accessible name, for a button whose content is not text.

Lives here rather than only on `IconButton` so the two share one render.
An icon-only button without it is a control a screen reader announces as
"button" and nothing else. */
  "prop:label"?: HelixBaseIconButton["label"];
  /** What to send when the button is activated, and what to send it to.

The platform's invoker attributes, forwarded onto the inner `<button>`
rather than left on the host: only a real button is recognized as an
invoker, so `commandfor` written on a custom element resolves nothing and
the trigger silently does nothing at all. A wrapper has to hand them down,
the same way `label` becomes `aria-label` in there.

```html
<helix-button commandfor="confirm" command="--show">Delete…</helix-button>
```

`commandFor` spells its attribute out, because Lit lowercases a property
name to derive one rather than dash-casing it, and what a consumer writes
is the platform's `commandfor`. */
  "prop:command"?: HelixBaseIconButton["command"];
  /** The id of the element the command is sent to. */
  "attr:commandfor"?: HelixBaseIconButton["commandFor"];
  /** The id of the element the command is sent to. */
  "prop:commandFor"?: HelixBaseIconButton["commandFor"];
  /** Whether the control is non-interactive.

Reflected, because the styled tier selects on it, and mirrored to
`aria-disabled` rather than removing the element from the accessibility
tree, so a screen reader can still announce that the control exists. */
  "prop:disabled"?: HelixBaseIconButton["disabled"];
  /** Name submitted with the form.

**Reflected, and it is the exception to "reflect only what CSS selects
on".** The platform builds a form's entry list from the `name` *content
attribute*, not from the property, so a control named through the property
submitted under no name at all and was silently dropped. Measured: two
inputs in one form, one named by attribute and one by property, and the
form carried a single entry.

Safe for a React consumer, which is what the rule is protecting: React
renders a custom element's props as attributes on the server, so the name
is already in the markup being hydrated and reflecting it writes what is
there. It is only a change to the markup when a consumer assigns it
imperatively later, and nothing is hydrating by then.

Here rather than on each control, where it was declared eight times and
reflected none of them. */
  "prop:name"?: HelixBaseIconButton["name"];
  /** Whether the button holds its group's tab stop.

A toolbar keeps one tab stop across its children, and the obvious way to do
that is to write `tabindex` onto each of them. That is a change to markup
the consumer rendered, so a React consumer's hydration reports it and does
not patch it up. A parent sets this property instead, which writes nothing,
and the stop lands on the inner control inside the shadow root.

No attribute, because it is coordination between elements rather than
anything a consumer sets. */
  "prop:focusable"?: HelixBaseIconButton["focusable"];

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

/** `HelixBaseInput` component event */
export type HelixBaseInputElementEvent<E = Event> = TypedEvent<
  HelixBaseInput,
  E
>;
/** `helix-change` event type */
export type HelixBaseInputHelixChangeElementEvent =
  HelixBaseInputElementEvent<HelixChangeEvent>;

export type HelixBaseInputProps = {
  /** Shown while the field is empty. Not a label: it goes when typing starts. */
  placeholder?: HelixBaseInput["placeholder"];
  /** Whether the field refuses input while still submitting its value. */
  "read-only"?: HelixBaseInput["readOnly"];
  /** Whether the field refuses input while still submitting its value. */
  readOnly?: HelixBaseInput["readOnly"];
  /** What the field accepts, which decides the keyboard and the validation. */
  type?: HelixBaseInput["type"];
  /** A regular expression the value has to match, as the platform reads it.

The class documentation promised `pattern` and `minlength` "and the rest"
were set on the real input, and no such properties existed: a consumer
following that sentence wrote an attribute on the host, it reached no input,
and the field constrained nothing while looking as though it did.

Forwarded rather than checked here, which is the whole reason validity is
the platform's: the browser knows what a `pattern` means, anchors it at both
ends, and produces the message in the reader's own language. */
  pattern?: HelixBaseInput["pattern"];
  /** Fewest characters the value may have. */
  minlength?: HelixBaseInput["minLength"];
  /** Fewest characters the value may have. */
  minLength?: HelixBaseInput["minLength"];
  /** Most characters the value may have. */
  maxlength?: HelixBaseInput["maxLength"];
  /** Most characters the value may have. */
  maxLength?: HelixBaseInput["maxLength"];
  /** The value the markup declared, which is where a reset returns to. */
  "default-value"?: HelixBaseInput["defaultValue"];
  /** The value the markup declared, which is where a reset returns to. */
  defaultValue?: HelixBaseInput["defaultValue"];
  /** What the control holds now, and what its form submits.

One property, not two. Reading gives the real value whichever mode the
control is in, so `input.value` answers the question anyone asking it
meant. Writing hands ownership to the consumer, which is what
`<helix-input value="x">` says too, and matches what a controlled input
means in React: the value is theirs and the control waits to be told.
`default-value` is how markup seeds one it does not want to own.

The same shape as the other three mixins, which is the point of them
being four of a kind rather than four of three kinds. */
  value?: HelixBaseInput["value"];
  /** Help under the control, shown while there is nothing wrong. */
  hint?: HelixBaseInput["hint"];
  /** What is wrong, in the reader's words rather than the browser's. */
  feedback?: HelixBaseInput["feedback"];
  /** The accessible name, and the fallback for the `label` slot. */
  label?: HelixBaseInput["label"];
  /** Whether the form refuses to submit without it. */
  required?: HelixBaseInput["required"];
  /** Whether the control is non-interactive.

Reflected, because the styled tier selects on it, and mirrored to
`aria-disabled` rather than removing the element from the accessibility
tree, so a screen reader can still announce that the control exists. */
  disabled?: HelixBaseInput["disabled"];
  /** Name submitted with the form.

**Reflected, and it is the exception to "reflect only what CSS selects
on".** The platform builds a form's entry list from the `name` *content
attribute*, not from the property, so a control named through the property
submitted under no name at all and was silently dropped. Measured: two
inputs in one form, one named by attribute and one by property, and the
form carried a single entry.

Safe for a React consumer, which is what the rule is protecting: React
renders a custom element's props as attributes on the server, so the name
is already in the markup being hydrated and reflecting it writes what is
there. It is only a change to the markup when a consumer assigns it
imperatively later, and nothing is hydrating by then.

Here rather than on each control, where it was declared eight times and
reflected none of them. */
  name?: HelixBaseInput["name"];
  /** The consumer's callback, invoked after the value is applied.

Not an attribute: it is a function. `onValueChange` and not `onChange`,
because React reserves the latter for its own synthetic system and wires
it to the native `change`, so a Helix event named `Change` would never
fire at all. */
  onValueChange?: HelixBaseInput["onValueChange"];

  /** Fired as the text changes, and cancelable. */
  "onhelix-change"?: (e: HelixBaseInputHelixChangeElementEvent) => void;
  /** Relayed from the input once the reader has finished. */
  onchange?: (e: HelixBaseInputElementEvent) => void;
};

export type HelixBaseInputSolidJsProps = {
  /** Shown while the field is empty. Not a label: it goes when typing starts. */
  "prop:placeholder"?: HelixBaseInput["placeholder"];
  /** Whether the field refuses input while still submitting its value. */
  "bool:read-only"?: HelixBaseInput["readOnly"];
  /** Whether the field refuses input while still submitting its value. */
  "prop:readOnly"?: HelixBaseInput["readOnly"];
  /** What the field accepts, which decides the keyboard and the validation. */
  "prop:type"?: HelixBaseInput["type"];
  /** A regular expression the value has to match, as the platform reads it.

The class documentation promised `pattern` and `minlength` "and the rest"
were set on the real input, and no such properties existed: a consumer
following that sentence wrote an attribute on the host, it reached no input,
and the field constrained nothing while looking as though it did.

Forwarded rather than checked here, which is the whole reason validity is
the platform's: the browser knows what a `pattern` means, anchors it at both
ends, and produces the message in the reader's own language. */
  "prop:pattern"?: HelixBaseInput["pattern"];
  /** Fewest characters the value may have. */
  "attr:minlength"?: HelixBaseInput["minLength"];
  /** Fewest characters the value may have. */
  "prop:minLength"?: HelixBaseInput["minLength"];
  /** Most characters the value may have. */
  "attr:maxlength"?: HelixBaseInput["maxLength"];
  /** Most characters the value may have. */
  "prop:maxLength"?: HelixBaseInput["maxLength"];
  /** The value the markup declared, which is where a reset returns to. */
  "attr:default-value"?: HelixBaseInput["defaultValue"];
  /** The value the markup declared, which is where a reset returns to. */
  "prop:defaultValue"?: HelixBaseInput["defaultValue"];
  /** What the control holds now, and what its form submits.

One property, not two. Reading gives the real value whichever mode the
control is in, so `input.value` answers the question anyone asking it
meant. Writing hands ownership to the consumer, which is what
`<helix-input value="x">` says too, and matches what a controlled input
means in React: the value is theirs and the control waits to be told.
`default-value` is how markup seeds one it does not want to own.

The same shape as the other three mixins, which is the point of them
being four of a kind rather than four of three kinds. */
  "prop:value"?: HelixBaseInput["value"];
  /** Help under the control, shown while there is nothing wrong. */
  "prop:hint"?: HelixBaseInput["hint"];
  /** What is wrong, in the reader's words rather than the browser's. */
  "prop:feedback"?: HelixBaseInput["feedback"];
  /** The accessible name, and the fallback for the `label` slot. */
  "prop:label"?: HelixBaseInput["label"];
  /** Whether the form refuses to submit without it. */
  "prop:required"?: HelixBaseInput["required"];
  /** Whether the control is non-interactive.

Reflected, because the styled tier selects on it, and mirrored to
`aria-disabled` rather than removing the element from the accessibility
tree, so a screen reader can still announce that the control exists. */
  "prop:disabled"?: HelixBaseInput["disabled"];
  /** Name submitted with the form.

**Reflected, and it is the exception to "reflect only what CSS selects
on".** The platform builds a form's entry list from the `name` *content
attribute*, not from the property, so a control named through the property
submitted under no name at all and was silently dropped. Measured: two
inputs in one form, one named by attribute and one by property, and the
form carried a single entry.

Safe for a React consumer, which is what the rule is protecting: React
renders a custom element's props as attributes on the server, so the name
is already in the markup being hydrated and reflecting it writes what is
there. It is only a change to the markup when a consumer assigns it
imperatively later, and nothing is hydrating by then.

Here rather than on each control, where it was declared eight times and
reflected none of them. */
  "prop:name"?: HelixBaseInput["name"];
  /** The consumer's callback, invoked after the value is applied.

Not an attribute: it is a function. `onValueChange` and not `onChange`,
because React reserves the latter for its own synthetic system and wires
it to the native `change`, so a Helix event named `Change` would never
fire at all. */
  "prop:onValueChange"?: HelixBaseInput["onValueChange"];
  /** Fired as the text changes, and cancelable. */
  "on:helix-change"?: (e: HelixBaseInputHelixChangeElementEvent) => void;
  /** Relayed from the input once the reader has finished. */
  "on:change"?: (e: HelixBaseInputElementEvent) => void;

  /** Set the innerHTML of the element */
  innerHTML?: string;
  /** Set the textContent of the element */
  textContent?: string | number;
};

export type HelixBaseKbdProps = {};

export type HelixBaseKbdSolidJsProps = {
  /** Set the innerHTML of the element */
  innerHTML?: string;
  /** Set the textContent of the element */
  textContent?: string | number;
};

export type HelixBaseListItemProps = {};

export type HelixBaseListItemSolidJsProps = {
  /** Set the innerHTML of the element */
  innerHTML?: string;
  /** Set the textContent of the element */
  textContent?: string | number;
};

export type HelixBaseListProps = {
  /** Accessible name for the set. */
  label?: HelixBaseList["label"];
  /** What kind of list this is, which is a fact about the content.

On the headless tier because it is meaning rather than decoration, the same
argument `severity` makes on `Callout`. A numbered list is numbered because
the order carries information; a bulleted one is bulleted because the items
are a set and the order does not. That distinction is the reader's, and it
has to survive with the stylesheet turned off.

- `default` is a run of rows and takes no marker. It is what a list of
  settings or files is: neither ordered nor a set to be counted.
- `ordered` numbers them, for steps.
- `unordered` bullets them, for a set.
- `description` pairs each row's label with its supporting text as a term
  and what the term means.

**`description` reuses the row's existing slots rather than inventing a
  second kind of row.** A term and its description is exactly the label and
  the supporting text `List.Item` already has, so the kind changes how the
  pair is drawn and nothing about what a consumer writes. A separate
  `List.Term` element would be a second row shape for one attribute's sake. */
  kind?: HelixBaseList["kind"];
};

export type HelixBaseListSolidJsProps = {
  /** Accessible name for the set. */
  "prop:label"?: HelixBaseList["label"];
  /** What kind of list this is, which is a fact about the content.

On the headless tier because it is meaning rather than decoration, the same
argument `severity` makes on `Callout`. A numbered list is numbered because
the order carries information; a bulleted one is bulleted because the items
are a set and the order does not. That distinction is the reader's, and it
has to survive with the stylesheet turned off.

- `default` is a run of rows and takes no marker. It is what a list of
  settings or files is: neither ordered nor a set to be counted.
- `ordered` numbers them, for steps.
- `unordered` bullets them, for a set.
- `description` pairs each row's label with its supporting text as a term
  and what the term means.

**`description` reuses the row's existing slots rather than inventing a
  second kind of row.** A term and its description is exactly the label and
  the supporting text `List.Item` already has, so the kind changes how the
  pair is drawn and nothing about what a consumer writes. A separate
  `List.Term` element would be a second row shape for one attribute's sake. */
  "prop:kind"?: HelixBaseList["kind"];

  /** Set the innerHTML of the element */
  innerHTML?: string;
  /** Set the textContent of the element */
  textContent?: string | number;
};

/** `HelixBaseListbox` component event */
export type HelixBaseListboxElementEvent<E = Event> = TypedEvent<
  HelixBaseListbox,
  E
>;
/** `helix-change` event type */
export type HelixBaseListboxHelixChangeElementEvent =
  HelixBaseListboxElementEvent<HelixChangeEvent>;
/** `helix-filter` event type */
export type HelixBaseListboxHelixFilterElementEvent =
  HelixBaseListboxElementEvent<HelixFilterEvent>;

export type HelixBaseListboxProps = {
  /** What the list is narrowed to, if anything.

Filtering hides rather than removes, so nothing about the value changes and
the list is still the consumer's own elements in their own order. Reading
gives what is being filtered on; writing declares it theirs, and
`default-filter` seeds one the list owns. */
  filter?: HelixBaseListbox["filter"];
  /** What to start narrowed to, where nothing declared it. */
  "default-filter"?: HelixBaseListbox["defaultFilter"];
  /** What to start narrowed to, where nothing declared it. */
  defaultFilter?: HelixBaseListbox["defaultFilter"];
  /** Whether the list renders a field for narrowing itself.

The field lives here rather than in whatever frames the list, because the
filtering already does: `filter`, the empty state and the keyboard are all
this component's. A select that drew its own search box above a listbox
would be writing the same field again, and so would a combobox, and so
would a command palette, which is the fault the three-family split exists
to prevent. */
  filterable?: HelixBaseListbox["filterable"];
  /** Placeholder for the field that narrows the list. */
  "filter-label"?: HelixBaseListbox["filterLabel"];
  /** Placeholder for the field that narrows the list. */
  filterLabel?: HelixBaseListbox["filterLabel"];
  /** Whether more than one option can be the answer. */
  multiple?: HelixBaseListbox["multiple"];
  /** What is shown when a filter has hidden every option. */
  "empty-text"?: HelixBaseListbox["emptyText"];
  /** What is shown when a filter has hidden every option. */
  emptyText?: HelixBaseListbox["emptyText"];
  /** The value the markup declared, which is where a reset returns to. */
  "default-value"?: HelixBaseListbox["defaultValue"];
  /** The value the markup declared, which is where a reset returns to. */
  defaultValue?: HelixBaseListbox["defaultValue"];
  /** What the control holds now, and what its form submits.

One property, not two. Reading gives the real value whichever mode the
control is in, so `input.value` answers the question anyone asking it
meant. Writing hands ownership to the consumer, which is what
`<helix-input value="x">` says too, and matches what a controlled input
means in React: the value is theirs and the control waits to be told.
`default-value` is how markup seeds one it does not want to own.

The same shape as the other three mixins, which is the point of them
being four of a kind rather than four of three kinds. */
  value?: HelixBaseListbox["value"];
  /** Help under the control, shown while there is nothing wrong. */
  hint?: HelixBaseListbox["hint"];
  /** What is wrong, in the reader's words rather than the browser's. */
  feedback?: HelixBaseListbox["feedback"];
  /** The accessible name, and the fallback for the `label` slot. */
  label?: HelixBaseListbox["label"];
  /** Whether the form refuses to submit without it. */
  required?: HelixBaseListbox["required"];
  /** Whether the control is non-interactive.

Reflected, because the styled tier selects on it, and mirrored to
`aria-disabled` rather than removing the element from the accessibility
tree, so a screen reader can still announce that the control exists. */
  disabled?: HelixBaseListbox["disabled"];
  /** Name submitted with the form.

**Reflected, and it is the exception to "reflect only what CSS selects
on".** The platform builds a form's entry list from the `name` *content
attribute*, not from the property, so a control named through the property
submitted under no name at all and was silently dropped. Measured: two
inputs in one form, one named by attribute and one by property, and the
form carried a single entry.

Safe for a React consumer, which is what the rule is protecting: React
renders a custom element's props as attributes on the server, so the name
is already in the markup being hydrated and reflecting it writes what is
there. It is only a change to the markup when a consumer assigns it
imperatively later, and nothing is hydrating by then.

Here rather than on each control, where it was declared eight times and
reflected none of them. */
  name?: HelixBaseListbox["name"];
  /** The consumer's callback, invoked after the value is applied.

Not an attribute: it is a function. `onValueChange` and not `onChange`,
because React reserves the latter for its own synthetic system and wires
it to the native `change`, so a Helix event named `Change` would never
fire at all. */
  onValueChange?: HelixBaseListbox["onValueChange"];

  /** Fired when the answer changes, and cancelable. */
  "onhelix-change"?: (e: HelixBaseListboxHelixChangeElementEvent) => void;
  /** Fired before the list narrows, and cancelable. */
  "onhelix-filter"?: (e: HelixBaseListboxHelixFilterElementEvent) => void;
};

export type HelixBaseListboxSolidJsProps = {
  /** What the list is narrowed to, if anything.

Filtering hides rather than removes, so nothing about the value changes and
the list is still the consumer's own elements in their own order. Reading
gives what is being filtered on; writing declares it theirs, and
`default-filter` seeds one the list owns. */
  "prop:filter"?: HelixBaseListbox["filter"];
  /** What to start narrowed to, where nothing declared it. */
  "attr:default-filter"?: HelixBaseListbox["defaultFilter"];
  /** What to start narrowed to, where nothing declared it. */
  "prop:defaultFilter"?: HelixBaseListbox["defaultFilter"];
  /** Whether the list renders a field for narrowing itself.

The field lives here rather than in whatever frames the list, because the
filtering already does: `filter`, the empty state and the keyboard are all
this component's. A select that drew its own search box above a listbox
would be writing the same field again, and so would a combobox, and so
would a command palette, which is the fault the three-family split exists
to prevent. */
  "prop:filterable"?: HelixBaseListbox["filterable"];
  /** Placeholder for the field that narrows the list. */
  "attr:filter-label"?: HelixBaseListbox["filterLabel"];
  /** Placeholder for the field that narrows the list. */
  "prop:filterLabel"?: HelixBaseListbox["filterLabel"];
  /** Whether more than one option can be the answer. */
  "prop:multiple"?: HelixBaseListbox["multiple"];
  /** What is shown when a filter has hidden every option. */
  "attr:empty-text"?: HelixBaseListbox["emptyText"];
  /** What is shown when a filter has hidden every option. */
  "prop:emptyText"?: HelixBaseListbox["emptyText"];
  /** The value the markup declared, which is where a reset returns to. */
  "attr:default-value"?: HelixBaseListbox["defaultValue"];
  /** The value the markup declared, which is where a reset returns to. */
  "prop:defaultValue"?: HelixBaseListbox["defaultValue"];
  /** What the control holds now, and what its form submits.

One property, not two. Reading gives the real value whichever mode the
control is in, so `input.value` answers the question anyone asking it
meant. Writing hands ownership to the consumer, which is what
`<helix-input value="x">` says too, and matches what a controlled input
means in React: the value is theirs and the control waits to be told.
`default-value` is how markup seeds one it does not want to own.

The same shape as the other three mixins, which is the point of them
being four of a kind rather than four of three kinds. */
  "prop:value"?: HelixBaseListbox["value"];
  /** Help under the control, shown while there is nothing wrong. */
  "prop:hint"?: HelixBaseListbox["hint"];
  /** What is wrong, in the reader's words rather than the browser's. */
  "prop:feedback"?: HelixBaseListbox["feedback"];
  /** The accessible name, and the fallback for the `label` slot. */
  "prop:label"?: HelixBaseListbox["label"];
  /** Whether the form refuses to submit without it. */
  "prop:required"?: HelixBaseListbox["required"];
  /** Whether the control is non-interactive.

Reflected, because the styled tier selects on it, and mirrored to
`aria-disabled` rather than removing the element from the accessibility
tree, so a screen reader can still announce that the control exists. */
  "prop:disabled"?: HelixBaseListbox["disabled"];
  /** Name submitted with the form.

**Reflected, and it is the exception to "reflect only what CSS selects
on".** The platform builds a form's entry list from the `name` *content
attribute*, not from the property, so a control named through the property
submitted under no name at all and was silently dropped. Measured: two
inputs in one form, one named by attribute and one by property, and the
form carried a single entry.

Safe for a React consumer, which is what the rule is protecting: React
renders a custom element's props as attributes on the server, so the name
is already in the markup being hydrated and reflecting it writes what is
there. It is only a change to the markup when a consumer assigns it
imperatively later, and nothing is hydrating by then.

Here rather than on each control, where it was declared eight times and
reflected none of them. */
  "prop:name"?: HelixBaseListbox["name"];
  /** The consumer's callback, invoked after the value is applied.

Not an attribute: it is a function. `onValueChange` and not `onChange`,
because React reserves the latter for its own synthetic system and wires
it to the native `change`, so a Helix event named `Change` would never
fire at all. */
  "prop:onValueChange"?: HelixBaseListbox["onValueChange"];
  /** Fired when the answer changes, and cancelable. */
  "on:helix-change"?: (e: HelixBaseListboxHelixChangeElementEvent) => void;
  /** Fired before the list narrows, and cancelable. */
  "on:helix-filter"?: (e: HelixBaseListboxHelixFilterElementEvent) => void;

  /** Set the innerHTML of the element */
  innerHTML?: string;
  /** Set the textContent of the element */
  textContent?: string | number;
};

/** `HelixBaseMenuItem` component event */
export type HelixBaseMenuItemElementEvent<E = Event> = TypedEvent<
  HelixBaseMenuItem,
  E
>;
/** `helix-select` event type */
export type HelixBaseMenuItemHelixSelectElementEvent =
  HelixBaseMenuItemElementEvent<HelixSelectEvent>;

export type HelixBaseMenuItemProps = {
  /** What this row stands for, carried in the event when it is chosen. */
  value?: HelixBaseMenuItem["value"];
  /** Whether the row is one of a set of choices.

Separate from `checked`, and it has to be. A row that is off is still a
choice, and `checked` alone cannot say so: an unticked row and a row that
was never tickable look identical from here. Announcing only the ticked one
as a checkbox tells a reader its siblings are commands, which is the one
thing they are not.

`checked` implies it, so a row that is on never has to say both. */
  checkable?: HelixBaseMenuItem["checkable"];
  /** Whether the row is ticked. */
  checked?: HelixBaseMenuItem["checked"];
  /** Whether the row can be chosen. */
  disabled?: HelixBaseMenuItem["disabled"];
  /** Whether this row is on the page currently showing.

Set by the menu, and a property rather than an attribute for that reason.
Public because the menu has to reach it, and not something a consumer
writes: which page is open is the menu's business. */
  onPage?: HelixBaseMenuItem["onPage"];
  /** Whether this row's submenu is the page showing.

Separate from `onPage`, and it has to be. A row that opened a page is not
itself on that page, so both are false for it, and rendering nothing on
that basis takes its `slot[name="submenu"]` with it: the rows inside have
nowhere to be assigned and are never laid out. The element that holds the
page has to keep the slot even when it shows no row of its own. */
  showingSubmenu?: HelixBaseMenuItem["showingSubmenu"];

  /** Fired when the row is chosen. */
  "onhelix-select"?: (e: HelixBaseMenuItemHelixSelectElementEvent) => void;
};

export type HelixBaseMenuItemSolidJsProps = {
  /** What this row stands for, carried in the event when it is chosen. */
  "prop:value"?: HelixBaseMenuItem["value"];
  /** Whether the row is one of a set of choices.

Separate from `checked`, and it has to be. A row that is off is still a
choice, and `checked` alone cannot say so: an unticked row and a row that
was never tickable look identical from here. Announcing only the ticked one
as a checkbox tells a reader its siblings are commands, which is the one
thing they are not.

`checked` implies it, so a row that is on never has to say both. */
  "prop:checkable"?: HelixBaseMenuItem["checkable"];
  /** Whether the row is ticked. */
  "prop:checked"?: HelixBaseMenuItem["checked"];
  /** Whether the row can be chosen. */
  "prop:disabled"?: HelixBaseMenuItem["disabled"];
  /** Whether this row is on the page currently showing.

Set by the menu, and a property rather than an attribute for that reason.
Public because the menu has to reach it, and not something a consumer
writes: which page is open is the menu's business. */
  "prop:onPage"?: HelixBaseMenuItem["onPage"];
  /** Whether this row's submenu is the page showing.

Separate from `onPage`, and it has to be. A row that opened a page is not
itself on that page, so both are false for it, and rendering nothing on
that basis takes its `slot[name="submenu"]` with it: the rows inside have
nowhere to be assigned and are never laid out. The element that holds the
page has to keep the slot even when it shows no row of its own. */
  "prop:showingSubmenu"?: HelixBaseMenuItem["showingSubmenu"];
  /** Fired when the row is chosen. */
  "on:helix-select"?: (e: HelixBaseMenuItemHelixSelectElementEvent) => void;

  /** Set the innerHTML of the element */
  innerHTML?: string;
  /** Set the textContent of the element */
  textContent?: string | number;
};

/** `HelixBaseMenu` component event */
export type HelixBaseMenuElementEvent<E = Event> = TypedEvent<HelixBaseMenu, E>;
/** `helix-open` event type */
export type HelixBaseMenuHelixOpenElementEvent =
  HelixBaseMenuElementEvent<HelixOpenEvent>;
/** `helix-close` event type */
export type HelixBaseMenuHelixCloseElementEvent =
  HelixBaseMenuElementEvent<HelixCloseEvent>;
/** `helix-select` event type */
export type HelixBaseMenuHelixSelectElementEvent =
  HelixBaseMenuElementEvent<HelixSelectEvent>;

export type HelixBaseMenuProps = {
  /** Preferred side. It moves if that side does not fit. */
  placement?: HelixBaseMenu["placement"];
  /** Space between the trigger and the surface, in pixels. */
  offset?: HelixBaseMenu["offset"];
  /** Accessible name for the surface. */
  label?: HelixBaseMenu["label"];
  /** What the row returning from a submenu reads. */
  "back-label"?: HelixBaseMenu["backLabel"];
  /** What the row returning from a submenu reads. */
  backLabel?: HelixBaseMenu["backLabel"];
  /** Whether the element is open.

One property, not two. Reading gives the real state whichever mode the
element is in, so `dialog.open` answers the question anyone asking it
meant. Writing hands ownership to the consumer, which is what the
attribute in `<helix-dialog open>` does as well: from then on the element
announces changes and applies none of them.

It reads as an accessor pair rather than a field because those are two
different questions sharing one name, and the alternative was a second
property answering the first. That worked for a boolean, where `isOpen`
reads well; there is no such word for a value or an active item, so all
four of these mixins now have this shape instead of two shapes.

**Not reflected, and that is required rather than tidy.** Reflection
writes the resolved state back as an attribute, and writing the attribute
is how a consumer says they own it. So an uncontrolled element that
opened itself would put `open` on its own host and, from the next thing
that read it, be indistinguishable from one the consumer controls:
cloned, serialised for hydration, or diffed by a framework, it would come
back controlled and stop responding. `data-open` carries the resolved
state for stylesheets, which is what it has always been for. */
  open?: HelixBaseMenu["open"];
  /** Initial open state for uncontrolled use, where nothing declared one. */
  "default-open"?: HelixBaseMenu["defaultOpen"];
  /** Initial open state for uncontrolled use, where nothing declared one. */
  defaultOpen?: HelixBaseMenu["defaultOpen"];
  /** The consumer's callback, invoked after the state is applied.

Not an attribute: it is a function. And not reachable from React's JSX,
which reserves every `on[A-Z]` prop for its own event system and drops
what it does not recognize; the generated wrapper listens for the events
instead. */
  onOpenChange?: HelixBaseMenu["onOpenChange"];

  /** Fired before it opens, and cancelable. */
  "onhelix-open"?: (e: HelixBaseMenuHelixOpenElementEvent) => void;
  /** Fired before it closes, and cancelable. */
  "onhelix-close"?: (e: HelixBaseMenuHelixCloseElementEvent) => void;
  /** Fired when an item is chosen. */
  "onhelix-select"?: (e: HelixBaseMenuHelixSelectElementEvent) => void;
};

export type HelixBaseMenuSolidJsProps = {
  /** Preferred side. It moves if that side does not fit. */
  "prop:placement"?: HelixBaseMenu["placement"];
  /** Space between the trigger and the surface, in pixels. */
  "prop:offset"?: HelixBaseMenu["offset"];
  /** Accessible name for the surface. */
  "prop:label"?: HelixBaseMenu["label"];
  /** What the row returning from a submenu reads. */
  "attr:back-label"?: HelixBaseMenu["backLabel"];
  /** What the row returning from a submenu reads. */
  "prop:backLabel"?: HelixBaseMenu["backLabel"];
  /** Whether the element is open.

One property, not two. Reading gives the real state whichever mode the
element is in, so `dialog.open` answers the question anyone asking it
meant. Writing hands ownership to the consumer, which is what the
attribute in `<helix-dialog open>` does as well: from then on the element
announces changes and applies none of them.

It reads as an accessor pair rather than a field because those are two
different questions sharing one name, and the alternative was a second
property answering the first. That worked for a boolean, where `isOpen`
reads well; there is no such word for a value or an active item, so all
four of these mixins now have this shape instead of two shapes.

**Not reflected, and that is required rather than tidy.** Reflection
writes the resolved state back as an attribute, and writing the attribute
is how a consumer says they own it. So an uncontrolled element that
opened itself would put `open` on its own host and, from the next thing
that read it, be indistinguishable from one the consumer controls:
cloned, serialised for hydration, or diffed by a framework, it would come
back controlled and stop responding. `data-open` carries the resolved
state for stylesheets, which is what it has always been for. */
  "prop:open"?: HelixBaseMenu["open"];
  /** Initial open state for uncontrolled use, where nothing declared one. */
  "bool:default-open"?: HelixBaseMenu["defaultOpen"];
  /** Initial open state for uncontrolled use, where nothing declared one. */
  "prop:defaultOpen"?: HelixBaseMenu["defaultOpen"];
  /** The consumer's callback, invoked after the state is applied.

Not an attribute: it is a function. And not reachable from React's JSX,
which reserves every `on[A-Z]` prop for its own event system and drops
what it does not recognize; the generated wrapper listens for the events
instead. */
  "prop:onOpenChange"?: HelixBaseMenu["onOpenChange"];
  /** Fired before it opens, and cancelable. */
  "on:helix-open"?: (e: HelixBaseMenuHelixOpenElementEvent) => void;
  /** Fired before it closes, and cancelable. */
  "on:helix-close"?: (e: HelixBaseMenuHelixCloseElementEvent) => void;
  /** Fired when an item is chosen. */
  "on:helix-select"?: (e: HelixBaseMenuHelixSelectElementEvent) => void;

  /** Set the innerHTML of the element */
  innerHTML?: string;
  /** Set the textContent of the element */
  textContent?: string | number;
};

export type HelixBaseNavigationProps = {
  /** Accessible name for the landmark. */
  label?: HelixBaseNavigation["label"];
};

export type HelixBaseNavigationSolidJsProps = {
  /** Accessible name for the landmark. */
  "prop:label"?: HelixBaseNavigation["label"];

  /** Set the innerHTML of the element */
  innerHTML?: string;
  /** Set the textContent of the element */
  textContent?: string | number;
};

export type HelixBaseOptionGroupProps = {
  /** The heading over the run. */
  label?: HelixBaseOptionGroup["label"];
};

export type HelixBaseOptionGroupSolidJsProps = {
  /** The heading over the run. */
  "prop:label"?: HelixBaseOptionGroup["label"];

  /** Set the innerHTML of the element */
  innerHTML?: string;
  /** Set the textContent of the element */
  textContent?: string | number;
};

/** `HelixBaseOption` component event */
export type HelixBaseOptionElementEvent<E = Event> = TypedEvent<
  HelixBaseOption,
  E
>;
/** `helix-select` event type */
export type HelixBaseOptionHelixSelectElementEvent =
  HelixBaseOptionElementEvent<HelixSelectEvent>;

export type HelixBaseOptionProps = {
  /** Whether this choice can be made. */
  disabled?: HelixBaseOption["disabled"];
  /** Whether this is the option the keyboard is on. Written by the listbox. */
  "data-active"?: HelixBaseOption["active"];
  /** Whether this is the option the keyboard is on. Written by the listbox. */
  active?: HelixBaseOption["active"];
  /** Whether this choice is currently chosen. Written by the listbox. */
  selected?: HelixBaseOption["selected"];
  /** Identifies this choice, and is what a form submits. */
  value?: HelixBaseOption["value"];

  /** Fired when this choice is made. */
  "onhelix-select"?: (e: HelixBaseOptionHelixSelectElementEvent) => void;
};

export type HelixBaseOptionSolidJsProps = {
  /** Whether this choice can be made. */
  "prop:disabled"?: HelixBaseOption["disabled"];
  /** Whether this is the option the keyboard is on. Written by the listbox. */
  "bool:data-active"?: HelixBaseOption["active"];
  /** Whether this is the option the keyboard is on. Written by the listbox. */
  "prop:active"?: HelixBaseOption["active"];
  /** Whether this choice is currently chosen. Written by the listbox. */
  "prop:selected"?: HelixBaseOption["selected"];
  /** Identifies this choice, and is what a form submits. */
  "prop:value"?: HelixBaseOption["value"];
  /** Fired when this choice is made. */
  "on:helix-select"?: (e: HelixBaseOptionHelixSelectElementEvent) => void;

  /** Set the innerHTML of the element */
  innerHTML?: string;
  /** Set the textContent of the element */
  textContent?: string | number;
};

export type HelixBaseOutlineProps = {
  /** Accessible name for the navigation. */
  label?: HelixBaseOutline["label"];
  /** How far below the top of the window a heading counts as reached, in pixels.

The reading line. A page with a sticky masthead sets this to its height, or
a little more: without it the current section changes as a heading slides
under the chrome rather than as it reaches the top of what can be seen. */
  offset?: HelixBaseOutline["offset"];
};

export type HelixBaseOutlineSolidJsProps = {
  /** Accessible name for the navigation. */
  "prop:label"?: HelixBaseOutline["label"];
  /** How far below the top of the window a heading counts as reached, in pixels.

The reading line. A page with a sticky masthead sets this to its height, or
a little more: without it the current section changes as a heading slides
under the chrome rather than as it reaches the top of what can be seen. */
  "prop:offset"?: HelixBaseOutline["offset"];

  /** Set the innerHTML of the element */
  innerHTML?: string;
  /** Set the textContent of the element */
  textContent?: string | number;
};

/** `HelixBasePopover` component event */
export type HelixBasePopoverElementEvent<E = Event> = TypedEvent<
  HelixBasePopover,
  E
>;
/** `helix-open` event type */
export type HelixBasePopoverHelixOpenElementEvent =
  HelixBasePopoverElementEvent<HelixOpenEvent>;
/** `helix-close` event type */
export type HelixBasePopoverHelixCloseElementEvent =
  HelixBasePopoverElementEvent<HelixCloseEvent>;

export type HelixBasePopoverProps = {
  /** Accessible name for the panel. */
  label?: HelixBasePopover["label"];
  /** Space between the trigger and the panel, in pixels. */
  offset?: HelixBasePopover["offset"];
  /** Preferred side. It moves if that side does not fit. */
  placement?: HelixBasePopover["placement"];
  /** Whether the element is open.

One property, not two. Reading gives the real state whichever mode the
element is in, so `dialog.open` answers the question anyone asking it
meant. Writing hands ownership to the consumer, which is what the
attribute in `<helix-dialog open>` does as well: from then on the element
announces changes and applies none of them.

It reads as an accessor pair rather than a field because those are two
different questions sharing one name, and the alternative was a second
property answering the first. That worked for a boolean, where `isOpen`
reads well; there is no such word for a value or an active item, so all
four of these mixins now have this shape instead of two shapes.

**Not reflected, and that is required rather than tidy.** Reflection
writes the resolved state back as an attribute, and writing the attribute
is how a consumer says they own it. So an uncontrolled element that
opened itself would put `open` on its own host and, from the next thing
that read it, be indistinguishable from one the consumer controls:
cloned, serialised for hydration, or diffed by a framework, it would come
back controlled and stop responding. `data-open` carries the resolved
state for stylesheets, which is what it has always been for. */
  open?: HelixBasePopover["open"];
  /** Initial open state for uncontrolled use, where nothing declared one. */
  "default-open"?: HelixBasePopover["defaultOpen"];
  /** Initial open state for uncontrolled use, where nothing declared one. */
  defaultOpen?: HelixBasePopover["defaultOpen"];
  /** The consumer's callback, invoked after the state is applied.

Not an attribute: it is a function. And not reachable from React's JSX,
which reserves every `on[A-Z]` prop for its own event system and drops
what it does not recognize; the generated wrapper listens for the events
instead. */
  onOpenChange?: HelixBasePopover["onOpenChange"];

  /** Fired before it opens, and cancelable. */
  "onhelix-open"?: (e: HelixBasePopoverHelixOpenElementEvent) => void;
  /** Fired before it closes, and cancelable. */
  "onhelix-close"?: (e: HelixBasePopoverHelixCloseElementEvent) => void;
};

export type HelixBasePopoverSolidJsProps = {
  /** Accessible name for the panel. */
  "prop:label"?: HelixBasePopover["label"];
  /** Space between the trigger and the panel, in pixels. */
  "prop:offset"?: HelixBasePopover["offset"];
  /** Preferred side. It moves if that side does not fit. */
  "prop:placement"?: HelixBasePopover["placement"];
  /** Whether the element is open.

One property, not two. Reading gives the real state whichever mode the
element is in, so `dialog.open` answers the question anyone asking it
meant. Writing hands ownership to the consumer, which is what the
attribute in `<helix-dialog open>` does as well: from then on the element
announces changes and applies none of them.

It reads as an accessor pair rather than a field because those are two
different questions sharing one name, and the alternative was a second
property answering the first. That worked for a boolean, where `isOpen`
reads well; there is no such word for a value or an active item, so all
four of these mixins now have this shape instead of two shapes.

**Not reflected, and that is required rather than tidy.** Reflection
writes the resolved state back as an attribute, and writing the attribute
is how a consumer says they own it. So an uncontrolled element that
opened itself would put `open` on its own host and, from the next thing
that read it, be indistinguishable from one the consumer controls:
cloned, serialised for hydration, or diffed by a framework, it would come
back controlled and stop responding. `data-open` carries the resolved
state for stylesheets, which is what it has always been for. */
  "prop:open"?: HelixBasePopover["open"];
  /** Initial open state for uncontrolled use, where nothing declared one. */
  "bool:default-open"?: HelixBasePopover["defaultOpen"];
  /** Initial open state for uncontrolled use, where nothing declared one. */
  "prop:defaultOpen"?: HelixBasePopover["defaultOpen"];
  /** The consumer's callback, invoked after the state is applied.

Not an attribute: it is a function. And not reachable from React's JSX,
which reserves every `on[A-Z]` prop for its own event system and drops
what it does not recognize; the generated wrapper listens for the events
instead. */
  "prop:onOpenChange"?: HelixBasePopover["onOpenChange"];
  /** Fired before it opens, and cancelable. */
  "on:helix-open"?: (e: HelixBasePopoverHelixOpenElementEvent) => void;
  /** Fired before it closes, and cancelable. */
  "on:helix-close"?: (e: HelixBasePopoverHelixCloseElementEvent) => void;

  /** Set the innerHTML of the element */
  innerHTML?: string;
  /** Set the textContent of the element */
  textContent?: string | number;
};

export type HelixBaseProgressProps = {
  /** Accessible name for what is in progress. */
  label?: HelixBaseProgress["label"];
  /** Whether the work has a knowable end.

On the headless tier rather than as an `appearance`, because it is
semantics before it is a picture: a progressbar with no `aria-valuenow` is
how the platform says "running, and nobody knows how far", and a reader on
a screen reader is told that rather than being read a number that means
nothing. `value` and `max` are ignored while it is set.

Not `Spinner`, which is the other thing this could be. A spinner says the
page is busy; a bar says a named piece of work is running, and keeps its
place in the layout when the answer arrives and it becomes determinate. */
  indeterminate?: HelixBaseProgress["indeterminate"];
  /** The total the work is measured against. */
  max?: HelixBaseProgress["max"];
  /** What has been done so far, in the same units as `max`.

Clamped between zero and `max` for both the fill and the announcement, so
the two can never disagree about what is on screen. */
  value?: HelixBaseProgress["value"];
  /** A reading for the value, where the number alone does not say enough.

"3 of 8 files" rather than "37". Announced instead of the percentage, and
never instead of the value itself: `aria-valuenow` still carries the
number, because assistive technology that ignores the text still has to
report progress. */
  "value-text"?: HelixBaseProgress["valueText"];
  /** A reading for the value, where the number alone does not say enough.

"3 of 8 files" rather than "37". Announced instead of the percentage, and
never instead of the value itself: `aria-valuenow` still carries the
number, because assistive technology that ignores the text still has to
report progress. */
  valueText?: HelixBaseProgress["valueText"];
};

export type HelixBaseProgressSolidJsProps = {
  /** Accessible name for what is in progress. */
  "prop:label"?: HelixBaseProgress["label"];
  /** Whether the work has a knowable end.

On the headless tier rather than as an `appearance`, because it is
semantics before it is a picture: a progressbar with no `aria-valuenow` is
how the platform says "running, and nobody knows how far", and a reader on
a screen reader is told that rather than being read a number that means
nothing. `value` and `max` are ignored while it is set.

Not `Spinner`, which is the other thing this could be. A spinner says the
page is busy; a bar says a named piece of work is running, and keeps its
place in the layout when the answer arrives and it becomes determinate. */
  "prop:indeterminate"?: HelixBaseProgress["indeterminate"];
  /** The total the work is measured against. */
  "prop:max"?: HelixBaseProgress["max"];
  /** What has been done so far, in the same units as `max`.

Clamped between zero and `max` for both the fill and the announcement, so
the two can never disagree about what is on screen. */
  "prop:value"?: HelixBaseProgress["value"];
  /** A reading for the value, where the number alone does not say enough.

"3 of 8 files" rather than "37". Announced instead of the percentage, and
never instead of the value itself: `aria-valuenow` still carries the
number, because assistive technology that ignores the text still has to
report progress. */
  "attr:value-text"?: HelixBaseProgress["valueText"];
  /** A reading for the value, where the number alone does not say enough.

"3 of 8 files" rather than "37". Announced instead of the percentage, and
never instead of the value itself: `aria-valuenow` still carries the
number, because assistive technology that ignores the text still has to
report progress. */
  "prop:valueText"?: HelixBaseProgress["valueText"];

  /** Set the innerHTML of the element */
  innerHTML?: string;
  /** Set the textContent of the element */
  textContent?: string | number;
};

export type HelixBaseQuoteProps = {
  /** URL identifying where the quotation came from. */
  cite?: HelixBaseQuote["cite"];
};

export type HelixBaseQuoteSolidJsProps = {
  /** URL identifying where the quotation came from. */
  "prop:cite"?: HelixBaseQuote["cite"];

  /** Set the innerHTML of the element */
  innerHTML?: string;
  /** Set the textContent of the element */
  textContent?: string | number;
};

/** `HelixBaseRadioGroup` component event */
export type HelixBaseRadioGroupElementEvent<E = Event> = TypedEvent<
  HelixBaseRadioGroup,
  E
>;
/** `helix-change` event type */
export type HelixBaseRadioGroupHelixChangeElementEvent =
  HelixBaseRadioGroupElementEvent<HelixChangeEvent>;

export type HelixBaseRadioGroupProps = {
  /** Which way the choices run. A column reads one line per answer. */
  orientation?: HelixBaseRadioGroup["orientation"];
  /** The value the markup declared, which is where a reset returns to. */
  "default-value"?: HelixBaseRadioGroup["defaultValue"];
  /** The value the markup declared, which is where a reset returns to. */
  defaultValue?: HelixBaseRadioGroup["defaultValue"];
  /** What the control holds now, and what its form submits.

One property, not two. Reading gives the real value whichever mode the
control is in, so `input.value` answers the question anyone asking it
meant. Writing hands ownership to the consumer, which is what
`<helix-input value="x">` says too, and matches what a controlled input
means in React: the value is theirs and the control waits to be told.
`default-value` is how markup seeds one it does not want to own.

The same shape as the other three mixins, which is the point of them
being four of a kind rather than four of three kinds. */
  value?: HelixBaseRadioGroup["value"];
  /** Help under the control, shown while there is nothing wrong. */
  hint?: HelixBaseRadioGroup["hint"];
  /** What is wrong, in the reader's words rather than the browser's. */
  feedback?: HelixBaseRadioGroup["feedback"];
  /** The accessible name, and the fallback for the `label` slot. */
  label?: HelixBaseRadioGroup["label"];
  /** Whether the form refuses to submit without it. */
  required?: HelixBaseRadioGroup["required"];
  /** Whether the control is non-interactive.

Reflected, because the styled tier selects on it, and mirrored to
`aria-disabled` rather than removing the element from the accessibility
tree, so a screen reader can still announce that the control exists. */
  disabled?: HelixBaseRadioGroup["disabled"];
  /** Name submitted with the form.

**Reflected, and it is the exception to "reflect only what CSS selects
on".** The platform builds a form's entry list from the `name` *content
attribute*, not from the property, so a control named through the property
submitted under no name at all and was silently dropped. Measured: two
inputs in one form, one named by attribute and one by property, and the
form carried a single entry.

Safe for a React consumer, which is what the rule is protecting: React
renders a custom element's props as attributes on the server, so the name
is already in the markup being hydrated and reflecting it writes what is
there. It is only a change to the markup when a consumer assigns it
imperatively later, and nothing is hydrating by then.

Here rather than on each control, where it was declared eight times and
reflected none of them. */
  name?: HelixBaseRadioGroup["name"];
  /** The consumer's callback, invoked after the value is applied.

Not an attribute: it is a function. `onValueChange` and not `onChange`,
because React reserves the latter for its own synthetic system and wires
it to the native `change`, so a Helix event named `Change` would never
fire at all. */
  onValueChange?: HelixBaseRadioGroup["onValueChange"];

  /** Fired when the answer changes, and cancelable. */
  "onhelix-change"?: (e: HelixBaseRadioGroupHelixChangeElementEvent) => void;
};

export type HelixBaseRadioGroupSolidJsProps = {
  /** Which way the choices run. A column reads one line per answer. */
  "prop:orientation"?: HelixBaseRadioGroup["orientation"];
  /** The value the markup declared, which is where a reset returns to. */
  "attr:default-value"?: HelixBaseRadioGroup["defaultValue"];
  /** The value the markup declared, which is where a reset returns to. */
  "prop:defaultValue"?: HelixBaseRadioGroup["defaultValue"];
  /** What the control holds now, and what its form submits.

One property, not two. Reading gives the real value whichever mode the
control is in, so `input.value` answers the question anyone asking it
meant. Writing hands ownership to the consumer, which is what
`<helix-input value="x">` says too, and matches what a controlled input
means in React: the value is theirs and the control waits to be told.
`default-value` is how markup seeds one it does not want to own.

The same shape as the other three mixins, which is the point of them
being four of a kind rather than four of three kinds. */
  "prop:value"?: HelixBaseRadioGroup["value"];
  /** Help under the control, shown while there is nothing wrong. */
  "prop:hint"?: HelixBaseRadioGroup["hint"];
  /** What is wrong, in the reader's words rather than the browser's. */
  "prop:feedback"?: HelixBaseRadioGroup["feedback"];
  /** The accessible name, and the fallback for the `label` slot. */
  "prop:label"?: HelixBaseRadioGroup["label"];
  /** Whether the form refuses to submit without it. */
  "prop:required"?: HelixBaseRadioGroup["required"];
  /** Whether the control is non-interactive.

Reflected, because the styled tier selects on it, and mirrored to
`aria-disabled` rather than removing the element from the accessibility
tree, so a screen reader can still announce that the control exists. */
  "prop:disabled"?: HelixBaseRadioGroup["disabled"];
  /** Name submitted with the form.

**Reflected, and it is the exception to "reflect only what CSS selects
on".** The platform builds a form's entry list from the `name` *content
attribute*, not from the property, so a control named through the property
submitted under no name at all and was silently dropped. Measured: two
inputs in one form, one named by attribute and one by property, and the
form carried a single entry.

Safe for a React consumer, which is what the rule is protecting: React
renders a custom element's props as attributes on the server, so the name
is already in the markup being hydrated and reflecting it writes what is
there. It is only a change to the markup when a consumer assigns it
imperatively later, and nothing is hydrating by then.

Here rather than on each control, where it was declared eight times and
reflected none of them. */
  "prop:name"?: HelixBaseRadioGroup["name"];
  /** The consumer's callback, invoked after the value is applied.

Not an attribute: it is a function. `onValueChange` and not `onChange`,
because React reserves the latter for its own synthetic system and wires
it to the native `change`, so a Helix event named `Change` would never
fire at all. */
  "prop:onValueChange"?: HelixBaseRadioGroup["onValueChange"];
  /** Fired when the answer changes, and cancelable. */
  "on:helix-change"?: (e: HelixBaseRadioGroupHelixChangeElementEvent) => void;

  /** Set the innerHTML of the element */
  innerHTML?: string;
  /** Set the textContent of the element */
  textContent?: string | number;
};

/** `HelixBaseRadio` component event */
export type HelixBaseRadioElementEvent<E = Event> = TypedEvent<
  HelixBaseRadio,
  E
>;
/** `helix-select` event type */
export type HelixBaseRadioHelixSelectElementEvent =
  HelixBaseRadioElementEvent<HelixSelectEvent>;

export type HelixBaseRadioProps = {
  /** Whether this choice can be made. */
  disabled?: HelixBaseRadio["disabled"];
  /** Whether this is the current choice. Written by the group. */
  selected?: HelixBaseRadio["selected"];
  /** Identifies this choice to the group, and is what the form submits. */
  value?: HelixBaseRadio["value"];

  /** Fired when this choice is made. */
  "onhelix-select"?: (e: HelixBaseRadioHelixSelectElementEvent) => void;
};

export type HelixBaseRadioSolidJsProps = {
  /** Whether this choice can be made. */
  "prop:disabled"?: HelixBaseRadio["disabled"];
  /** Whether this is the current choice. Written by the group. */
  "prop:selected"?: HelixBaseRadio["selected"];
  /** Identifies this choice to the group, and is what the form submits. */
  "prop:value"?: HelixBaseRadio["value"];
  /** Fired when this choice is made. */
  "on:helix-select"?: (e: HelixBaseRadioHelixSelectElementEvent) => void;

  /** Set the innerHTML of the element */
  innerHTML?: string;
  /** Set the textContent of the element */
  textContent?: string | number;
};

/** `HelixBaseSelect` component event */
export type HelixBaseSelectElementEvent<E = Event> = TypedEvent<
  HelixBaseSelect,
  E
>;
/** `helix-change` event type */
export type HelixBaseSelectHelixChangeElementEvent =
  HelixBaseSelectElementEvent<HelixChangeEvent>;
/** `helix-open` event type */
export type HelixBaseSelectHelixOpenElementEvent =
  HelixBaseSelectElementEvent<HelixOpenEvent>;
/** `helix-close` event type */
export type HelixBaseSelectHelixCloseElementEvent =
  HelixBaseSelectElementEvent<HelixCloseEvent>;

export type HelixBaseSelectProps = {
  /** Whether the list can be narrowed by typing.

Passed to the listbox rather than acted on here, because the listbox owns
the filtering, the empty state and the keyboard. This property existed and
was never read: it reflected, it type-checked, and nothing anywhere
rendered a field. API that does nothing is worse than API that is missing,
because a consumer sets it and believes it. */
  filterable?: HelixBaseSelect["filterable"];
  /** Whether more than one option can be the answer. */
  multiple?: HelixBaseSelect["multiple"];
  /** Shown on the trigger while nothing is chosen. */
  placeholder?: HelixBaseSelect["placeholder"];
  /** Whether the element is open.

One property, not two. Reading gives the real state whichever mode the
element is in, so `dialog.open` answers the question anyone asking it
meant. Writing hands ownership to the consumer, which is what the
attribute in `<helix-dialog open>` does as well: from then on the element
announces changes and applies none of them.

It reads as an accessor pair rather than a field because those are two
different questions sharing one name, and the alternative was a second
property answering the first. That worked for a boolean, where `isOpen`
reads well; there is no such word for a value or an active item, so all
four of these mixins now have this shape instead of two shapes.

**Not reflected, and that is required rather than tidy.** Reflection
writes the resolved state back as an attribute, and writing the attribute
is how a consumer says they own it. So an uncontrolled element that
opened itself would put `open` on its own host and, from the next thing
that read it, be indistinguishable from one the consumer controls:
cloned, serialised for hydration, or diffed by a framework, it would come
back controlled and stop responding. `data-open` carries the resolved
state for stylesheets, which is what it has always been for. */
  open?: HelixBaseSelect["open"];
  /** Initial open state for uncontrolled use, where nothing declared one. */
  "default-open"?: HelixBaseSelect["defaultOpen"];
  /** Initial open state for uncontrolled use, where nothing declared one. */
  defaultOpen?: HelixBaseSelect["defaultOpen"];
  /** The value the markup declared, which is where a reset returns to. */
  "default-value"?: HelixBaseSelect["defaultValue"];
  /** The value the markup declared, which is where a reset returns to. */
  defaultValue?: HelixBaseSelect["defaultValue"];
  /** What the control holds now, and what its form submits.

One property, not two. Reading gives the real value whichever mode the
control is in, so `input.value` answers the question anyone asking it
meant. Writing hands ownership to the consumer, which is what
`<helix-input value="x">` says too, and matches what a controlled input
means in React: the value is theirs and the control waits to be told.
`default-value` is how markup seeds one it does not want to own.

The same shape as the other three mixins, which is the point of them
being four of a kind rather than four of three kinds. */
  value?: HelixBaseSelect["value"];
  /** Help under the control, shown while there is nothing wrong. */
  hint?: HelixBaseSelect["hint"];
  /** What is wrong, in the reader's words rather than the browser's. */
  feedback?: HelixBaseSelect["feedback"];
  /** The accessible name, and the fallback for the `label` slot. */
  label?: HelixBaseSelect["label"];
  /** Whether the form refuses to submit without it. */
  required?: HelixBaseSelect["required"];
  /** Whether the control is non-interactive.

Reflected, because the styled tier selects on it, and mirrored to
`aria-disabled` rather than removing the element from the accessibility
tree, so a screen reader can still announce that the control exists. */
  disabled?: HelixBaseSelect["disabled"];
  /** Name submitted with the form.

**Reflected, and it is the exception to "reflect only what CSS selects
on".** The platform builds a form's entry list from the `name` *content
attribute*, not from the property, so a control named through the property
submitted under no name at all and was silently dropped. Measured: two
inputs in one form, one named by attribute and one by property, and the
form carried a single entry.

Safe for a React consumer, which is what the rule is protecting: React
renders a custom element's props as attributes on the server, so the name
is already in the markup being hydrated and reflecting it writes what is
there. It is only a change to the markup when a consumer assigns it
imperatively later, and nothing is hydrating by then.

Here rather than on each control, where it was declared eight times and
reflected none of them. */
  name?: HelixBaseSelect["name"];
  /** The consumer's callback, invoked after the state is applied.

Not an attribute: it is a function. And not reachable from React's JSX,
which reserves every `on[A-Z]` prop for its own event system and drops
what it does not recognize; the generated wrapper listens for the events
instead. */
  onOpenChange?: HelixBaseSelect["onOpenChange"];
  /** The consumer's callback, invoked after the value is applied.

Not an attribute: it is a function. `onValueChange` and not `onChange`,
because React reserves the latter for its own synthetic system and wires
it to the native `change`, so a Helix event named `Change` would never
fire at all. */
  onValueChange?: HelixBaseSelect["onValueChange"];

  /** Relayed from the listbox when the answer changes. */
  "onhelix-change"?: (e: HelixBaseSelectHelixChangeElementEvent) => void;
  /** Fired when the list opens. */
  "onhelix-open"?: (e: HelixBaseSelectHelixOpenElementEvent) => void;
  /** Fired when it closes. */
  "onhelix-close"?: (e: HelixBaseSelectHelixCloseElementEvent) => void;
};

export type HelixBaseSelectSolidJsProps = {
  /** Whether the list can be narrowed by typing.

Passed to the listbox rather than acted on here, because the listbox owns
the filtering, the empty state and the keyboard. This property existed and
was never read: it reflected, it type-checked, and nothing anywhere
rendered a field. API that does nothing is worse than API that is missing,
because a consumer sets it and believes it. */
  "prop:filterable"?: HelixBaseSelect["filterable"];
  /** Whether more than one option can be the answer. */
  "prop:multiple"?: HelixBaseSelect["multiple"];
  /** Shown on the trigger while nothing is chosen. */
  "prop:placeholder"?: HelixBaseSelect["placeholder"];
  /** Whether the element is open.

One property, not two. Reading gives the real state whichever mode the
element is in, so `dialog.open` answers the question anyone asking it
meant. Writing hands ownership to the consumer, which is what the
attribute in `<helix-dialog open>` does as well: from then on the element
announces changes and applies none of them.

It reads as an accessor pair rather than a field because those are two
different questions sharing one name, and the alternative was a second
property answering the first. That worked for a boolean, where `isOpen`
reads well; there is no such word for a value or an active item, so all
four of these mixins now have this shape instead of two shapes.

**Not reflected, and that is required rather than tidy.** Reflection
writes the resolved state back as an attribute, and writing the attribute
is how a consumer says they own it. So an uncontrolled element that
opened itself would put `open` on its own host and, from the next thing
that read it, be indistinguishable from one the consumer controls:
cloned, serialised for hydration, or diffed by a framework, it would come
back controlled and stop responding. `data-open` carries the resolved
state for stylesheets, which is what it has always been for. */
  "prop:open"?: HelixBaseSelect["open"];
  /** Initial open state for uncontrolled use, where nothing declared one. */
  "bool:default-open"?: HelixBaseSelect["defaultOpen"];
  /** Initial open state for uncontrolled use, where nothing declared one. */
  "prop:defaultOpen"?: HelixBaseSelect["defaultOpen"];
  /** The value the markup declared, which is where a reset returns to. */
  "attr:default-value"?: HelixBaseSelect["defaultValue"];
  /** The value the markup declared, which is where a reset returns to. */
  "prop:defaultValue"?: HelixBaseSelect["defaultValue"];
  /** What the control holds now, and what its form submits.

One property, not two. Reading gives the real value whichever mode the
control is in, so `input.value` answers the question anyone asking it
meant. Writing hands ownership to the consumer, which is what
`<helix-input value="x">` says too, and matches what a controlled input
means in React: the value is theirs and the control waits to be told.
`default-value` is how markup seeds one it does not want to own.

The same shape as the other three mixins, which is the point of them
being four of a kind rather than four of three kinds. */
  "prop:value"?: HelixBaseSelect["value"];
  /** Help under the control, shown while there is nothing wrong. */
  "prop:hint"?: HelixBaseSelect["hint"];
  /** What is wrong, in the reader's words rather than the browser's. */
  "prop:feedback"?: HelixBaseSelect["feedback"];
  /** The accessible name, and the fallback for the `label` slot. */
  "prop:label"?: HelixBaseSelect["label"];
  /** Whether the form refuses to submit without it. */
  "prop:required"?: HelixBaseSelect["required"];
  /** Whether the control is non-interactive.

Reflected, because the styled tier selects on it, and mirrored to
`aria-disabled` rather than removing the element from the accessibility
tree, so a screen reader can still announce that the control exists. */
  "prop:disabled"?: HelixBaseSelect["disabled"];
  /** Name submitted with the form.

**Reflected, and it is the exception to "reflect only what CSS selects
on".** The platform builds a form's entry list from the `name` *content
attribute*, not from the property, so a control named through the property
submitted under no name at all and was silently dropped. Measured: two
inputs in one form, one named by attribute and one by property, and the
form carried a single entry.

Safe for a React consumer, which is what the rule is protecting: React
renders a custom element's props as attributes on the server, so the name
is already in the markup being hydrated and reflecting it writes what is
there. It is only a change to the markup when a consumer assigns it
imperatively later, and nothing is hydrating by then.

Here rather than on each control, where it was declared eight times and
reflected none of them. */
  "prop:name"?: HelixBaseSelect["name"];
  /** The consumer's callback, invoked after the state is applied.

Not an attribute: it is a function. And not reachable from React's JSX,
which reserves every `on[A-Z]` prop for its own event system and drops
what it does not recognize; the generated wrapper listens for the events
instead. */
  "prop:onOpenChange"?: HelixBaseSelect["onOpenChange"];
  /** The consumer's callback, invoked after the value is applied.

Not an attribute: it is a function. `onValueChange` and not `onChange`,
because React reserves the latter for its own synthetic system and wires
it to the native `change`, so a Helix event named `Change` would never
fire at all. */
  "prop:onValueChange"?: HelixBaseSelect["onValueChange"];
  /** Relayed from the listbox when the answer changes. */
  "on:helix-change"?: (e: HelixBaseSelectHelixChangeElementEvent) => void;
  /** Fired when the list opens. */
  "on:helix-open"?: (e: HelixBaseSelectHelixOpenElementEvent) => void;
  /** Fired when it closes. */
  "on:helix-close"?: (e: HelixBaseSelectHelixCloseElementEvent) => void;

  /** Set the innerHTML of the element */
  innerHTML?: string;
  /** Set the textContent of the element */
  textContent?: string | number;
};

export type HelixBaseSkeletonProps = {};

export type HelixBaseSkeletonSolidJsProps = {
  /** Set the innerHTML of the element */
  innerHTML?: string;
  /** Set the textContent of the element */
  textContent?: string | number;
};

/** `HelixBaseSlider` component event */
export type HelixBaseSliderElementEvent<E = Event> = TypedEvent<
  HelixBaseSlider,
  E
>;
/** `helix-change` event type */
export type HelixBaseSliderHelixChangeElementEvent =
  HelixBaseSliderElementEvent<HelixChangeEvent>;

export type HelixBaseSliderProps = {
  /** The largest value the reader can choose. */
  max?: HelixBaseSlider["max"];
  /** The smallest value the reader can choose. */
  min?: HelixBaseSlider["min"];
  /** Whether the chosen value is shown beside the track. */
  "show-value"?: HelixBaseSlider["showValue"];
  /** Whether the chosen value is shown beside the track. */
  showValue?: HelixBaseSlider["showValue"];
  /** How many marks to draw along the track, evenly spaced, ends included.

`0` or `1` draws none: one mark on a track says nothing about a range.
They are decoration, so they are `aria-hidden`; what a reader can land on
is `step`, which the input enforces regardless.

**Each one is snapped to a step before it is placed.** Evenly spaced and
on a step are two different things, and asking for four marks across a
hundred in twenty-fives wants them at 0, 33.3, 66.7 and 100: two of those
are places the thumb cannot go. A mark the thumb can never sit on is the
one thing a mark must not be, so the spacing gives way rather than the
step, and marks may come out unevenly spaced when the two disagree. That
is the honest picture of the range being offered. */
  markers?: HelixBaseSlider["markers"];
  /** Mirrors "there are marks" for the stylesheet.

The whole marker layout hung off `:host([markers])` and `markers` does not
reflect, so `slider.markers = 5` drew nothing at all: only the attribute
written in the markup ever worked, and the property that is the documented
API silently did not.

Reflecting the count instead would put `markers="0"` on every slider, an
attribute the server's markup does not have and one that selector would
match, drawing the layout for no marks. So the boolean fact is mirrored to
a `data-` name, which is the rule this library already follows for state:
the stylesheet wants to know whether there are marks, not how many. How
many is what `markerValues` answers, and `< 2` is where it already draws
the line.

/** Whether each mark says which value it stands at. */
  "marker-labels"?: HelixBaseSlider["markerLabels"];
  /** Mirrors "there are marks" for the stylesheet.

The whole marker layout hung off `:host([markers])` and `markers` does not
reflect, so `slider.markers = 5` drew nothing at all: only the attribute
written in the markup ever worked, and the property that is the documented
API silently did not.

Reflecting the count instead would put `markers="0"` on every slider, an
attribute the server's markup does not have and one that selector would
match, drawing the layout for no marks. So the boolean fact is mirrored to
a `data-` name, which is the rule this library already follows for state:
the stylesheet wants to know whether there are marks, not how many. How
many is what `markerValues` answers, and `< 2` is where it already draws
the line.

/** Whether each mark says which value it stands at. */
  markerLabels?: HelixBaseSlider["markerLabels"];
  /** How far one press of an arrow key moves it. */
  step?: HelixBaseSlider["step"];
  /** The value the markup declared, which is where a reset returns to. */
  "default-value"?: HelixBaseSlider["defaultValue"];
  /** The value the markup declared, which is where a reset returns to. */
  defaultValue?: HelixBaseSlider["defaultValue"];
  /** What the control holds now, and what its form submits.

One property, not two. Reading gives the real value whichever mode the
control is in, so `input.value` answers the question anyone asking it
meant. Writing hands ownership to the consumer, which is what
`<helix-input value="x">` says too, and matches what a controlled input
means in React: the value is theirs and the control waits to be told.
`default-value` is how markup seeds one it does not want to own.

The same shape as the other three mixins, which is the point of them
being four of a kind rather than four of three kinds. */
  value?: HelixBaseSlider["value"];
  /** Help under the control, shown while there is nothing wrong. */
  hint?: HelixBaseSlider["hint"];
  /** What is wrong, in the reader's words rather than the browser's. */
  feedback?: HelixBaseSlider["feedback"];
  /** The accessible name, and the fallback for the `label` slot. */
  label?: HelixBaseSlider["label"];
  /** Whether the form refuses to submit without it. */
  required?: HelixBaseSlider["required"];
  /** Whether the control is non-interactive.

Reflected, because the styled tier selects on it, and mirrored to
`aria-disabled` rather than removing the element from the accessibility
tree, so a screen reader can still announce that the control exists. */
  disabled?: HelixBaseSlider["disabled"];
  /** Name submitted with the form.

**Reflected, and it is the exception to "reflect only what CSS selects
on".** The platform builds a form's entry list from the `name` *content
attribute*, not from the property, so a control named through the property
submitted under no name at all and was silently dropped. Measured: two
inputs in one form, one named by attribute and one by property, and the
form carried a single entry.

Safe for a React consumer, which is what the rule is protecting: React
renders a custom element's props as attributes on the server, so the name
is already in the markup being hydrated and reflecting it writes what is
there. It is only a change to the markup when a consumer assigns it
imperatively later, and nothing is hydrating by then.

Here rather than on each control, where it was declared eight times and
reflected none of them. */
  name?: HelixBaseSlider["name"];
  /** The consumer's callback, invoked after the value is applied.

Not an attribute: it is a function. `onValueChange` and not `onChange`,
because React reserves the latter for its own synthetic system and wires
it to the native `change`, so a Helix event named `Change` would never
fire at all. */
  onValueChange?: HelixBaseSlider["onValueChange"];

  /** Fired as the value changes, and cancelable. */
  "onhelix-change"?: (e: HelixBaseSliderHelixChangeElementEvent) => void;
  /** Relayed once the reader has let go. */
  onchange?: (e: HelixBaseSliderElementEvent) => void;
};

export type HelixBaseSliderSolidJsProps = {
  /** The largest value the reader can choose. */
  "prop:max"?: HelixBaseSlider["max"];
  /** The smallest value the reader can choose. */
  "prop:min"?: HelixBaseSlider["min"];
  /** Whether the chosen value is shown beside the track. */
  "bool:show-value"?: HelixBaseSlider["showValue"];
  /** Whether the chosen value is shown beside the track. */
  "prop:showValue"?: HelixBaseSlider["showValue"];
  /** How many marks to draw along the track, evenly spaced, ends included.

`0` or `1` draws none: one mark on a track says nothing about a range.
They are decoration, so they are `aria-hidden`; what a reader can land on
is `step`, which the input enforces regardless.

**Each one is snapped to a step before it is placed.** Evenly spaced and
on a step are two different things, and asking for four marks across a
hundred in twenty-fives wants them at 0, 33.3, 66.7 and 100: two of those
are places the thumb cannot go. A mark the thumb can never sit on is the
one thing a mark must not be, so the spacing gives way rather than the
step, and marks may come out unevenly spaced when the two disagree. That
is the honest picture of the range being offered. */
  "prop:markers"?: HelixBaseSlider["markers"];
  /** Mirrors "there are marks" for the stylesheet.

The whole marker layout hung off `:host([markers])` and `markers` does not
reflect, so `slider.markers = 5` drew nothing at all: only the attribute
written in the markup ever worked, and the property that is the documented
API silently did not.

Reflecting the count instead would put `markers="0"` on every slider, an
attribute the server's markup does not have and one that selector would
match, drawing the layout for no marks. So the boolean fact is mirrored to
a `data-` name, which is the rule this library already follows for state:
the stylesheet wants to know whether there are marks, not how many. How
many is what `markerValues` answers, and `< 2` is where it already draws
the line.

/** Whether each mark says which value it stands at. */
  "bool:marker-labels"?: HelixBaseSlider["markerLabels"];
  /** Mirrors "there are marks" for the stylesheet.

The whole marker layout hung off `:host([markers])` and `markers` does not
reflect, so `slider.markers = 5` drew nothing at all: only the attribute
written in the markup ever worked, and the property that is the documented
API silently did not.

Reflecting the count instead would put `markers="0"` on every slider, an
attribute the server's markup does not have and one that selector would
match, drawing the layout for no marks. So the boolean fact is mirrored to
a `data-` name, which is the rule this library already follows for state:
the stylesheet wants to know whether there are marks, not how many. How
many is what `markerValues` answers, and `< 2` is where it already draws
the line.

/** Whether each mark says which value it stands at. */
  "prop:markerLabels"?: HelixBaseSlider["markerLabels"];
  /** How far one press of an arrow key moves it. */
  "prop:step"?: HelixBaseSlider["step"];
  /** The value the markup declared, which is where a reset returns to. */
  "attr:default-value"?: HelixBaseSlider["defaultValue"];
  /** The value the markup declared, which is where a reset returns to. */
  "prop:defaultValue"?: HelixBaseSlider["defaultValue"];
  /** What the control holds now, and what its form submits.

One property, not two. Reading gives the real value whichever mode the
control is in, so `input.value` answers the question anyone asking it
meant. Writing hands ownership to the consumer, which is what
`<helix-input value="x">` says too, and matches what a controlled input
means in React: the value is theirs and the control waits to be told.
`default-value` is how markup seeds one it does not want to own.

The same shape as the other three mixins, which is the point of them
being four of a kind rather than four of three kinds. */
  "prop:value"?: HelixBaseSlider["value"];
  /** Help under the control, shown while there is nothing wrong. */
  "prop:hint"?: HelixBaseSlider["hint"];
  /** What is wrong, in the reader's words rather than the browser's. */
  "prop:feedback"?: HelixBaseSlider["feedback"];
  /** The accessible name, and the fallback for the `label` slot. */
  "prop:label"?: HelixBaseSlider["label"];
  /** Whether the form refuses to submit without it. */
  "prop:required"?: HelixBaseSlider["required"];
  /** Whether the control is non-interactive.

Reflected, because the styled tier selects on it, and mirrored to
`aria-disabled` rather than removing the element from the accessibility
tree, so a screen reader can still announce that the control exists. */
  "prop:disabled"?: HelixBaseSlider["disabled"];
  /** Name submitted with the form.

**Reflected, and it is the exception to "reflect only what CSS selects
on".** The platform builds a form's entry list from the `name` *content
attribute*, not from the property, so a control named through the property
submitted under no name at all and was silently dropped. Measured: two
inputs in one form, one named by attribute and one by property, and the
form carried a single entry.

Safe for a React consumer, which is what the rule is protecting: React
renders a custom element's props as attributes on the server, so the name
is already in the markup being hydrated and reflecting it writes what is
there. It is only a change to the markup when a consumer assigns it
imperatively later, and nothing is hydrating by then.

Here rather than on each control, where it was declared eight times and
reflected none of them. */
  "prop:name"?: HelixBaseSlider["name"];
  /** The consumer's callback, invoked after the value is applied.

Not an attribute: it is a function. `onValueChange` and not `onChange`,
because React reserves the latter for its own synthetic system and wires
it to the native `change`, so a Helix event named `Change` would never
fire at all. */
  "prop:onValueChange"?: HelixBaseSlider["onValueChange"];
  /** Fired as the value changes, and cancelable. */
  "on:helix-change"?: (e: HelixBaseSliderHelixChangeElementEvent) => void;
  /** Relayed once the reader has let go. */
  "on:change"?: (e: HelixBaseSliderElementEvent) => void;

  /** Set the innerHTML of the element */
  innerHTML?: string;
  /** Set the textContent of the element */
  textContent?: string | number;
};

export type HelixBaseSpinnerProps = {
  /** Accessible name, announced while the work is outstanding. */
  label?: HelixBaseSpinner["label"];
};

export type HelixBaseSpinnerSolidJsProps = {
  /** Accessible name, announced while the work is outstanding. */
  "prop:label"?: HelixBaseSpinner["label"];

  /** Set the innerHTML of the element */
  innerHTML?: string;
  /** Set the textContent of the element */
  textContent?: string | number;
};

export type HelixBaseStatGroupProps = {
  /** Accessible name for the set. */
  label?: HelixBaseStatGroup["label"];
};

export type HelixBaseStatGroupSolidJsProps = {
  /** Accessible name for the set. */
  "prop:label"?: HelixBaseStatGroup["label"];

  /** Set the innerHTML of the element */
  innerHTML?: string;
  /** Set the textContent of the element */
  textContent?: string | number;
};

export type HelixBaseStatProps = {};

export type HelixBaseStatSolidJsProps = {
  /** Set the innerHTML of the element */
  innerHTML?: string;
  /** Set the textContent of the element */
  textContent?: string | number;
};

/** `HelixBaseSwitch` component event */
export type HelixBaseSwitchElementEvent<E = Event> = TypedEvent<
  HelixBaseSwitch,
  E
>;
/** `helix-change` event type */
export type HelixBaseSwitchHelixChangeElementEvent =
  HelixBaseSwitchElementEvent<HelixChangeEvent>;

export type HelixBaseSwitchProps = {
  /** Value submitted when the switch is on. */
  value?: HelixBaseSwitch["value"];
  /** Whether the control is checked.

One property rather than two. Reading gives the real state whichever
mode the control is in; writing hands ownership to the consumer, which
is what the attribute in `<helix-checkbox checked>` does as well. The
same shape all four of these mixins have, for the reason given on
`MixinControllerOpen.open`.

Not reflected: the attribute is the consumer's input and stays as they
wrote it, and `data-checked` carries the resolved state for stylesheets. */
  checked?: HelixBaseSwitch["checked"];
  /** Initial checked state for uncontrolled use, where nothing declared one. */
  "default-checked"?: HelixBaseSwitch["defaultChecked"];
  /** Initial checked state for uncontrolled use, where nothing declared one. */
  defaultChecked?: HelixBaseSwitch["defaultChecked"];
  /** Help under the control, shown while there is nothing wrong. */
  hint?: HelixBaseSwitch["hint"];
  /** What is wrong, in the reader's words rather than the browser's. */
  feedback?: HelixBaseSwitch["feedback"];
  /** The accessible name, and the fallback for the `label` slot. */
  label?: HelixBaseSwitch["label"];
  /** Whether the form refuses to submit without it. */
  required?: HelixBaseSwitch["required"];
  /** Whether the control is non-interactive.

Reflected, because the styled tier selects on it, and mirrored to
`aria-disabled` rather than removing the element from the accessibility
tree, so a screen reader can still announce that the control exists. */
  disabled?: HelixBaseSwitch["disabled"];
  /** Name submitted with the form.

**Reflected, and it is the exception to "reflect only what CSS selects
on".** The platform builds a form's entry list from the `name` *content
attribute*, not from the property, so a control named through the property
submitted under no name at all and was silently dropped. Measured: two
inputs in one form, one named by attribute and one by property, and the
form carried a single entry.

Safe for a React consumer, which is what the rule is protecting: React
renders a custom element's props as attributes on the server, so the name
is already in the markup being hydrated and reflecting it writes what is
there. It is only a change to the markup when a consumer assigns it
imperatively later, and nothing is hydrating by then.

Here rather than on each control, where it was declared eight times and
reflected none of them. */
  name?: HelixBaseSwitch["name"];
  /** The consumer's callback, invoked after the state is applied.

Not an attribute: it is a function. And not reachable from React's JSX,
which reserves every `on[A-Z]` prop for its own event system and drops
what it does not recognize; the generated wrapper listens for the event
instead. */
  onCheckedChange?: HelixBaseSwitch["onCheckedChange"];

  /** Fired before the state changes, and cancelable. */
  "onhelix-change"?: (e: HelixBaseSwitchHelixChangeElementEvent) => void;
  /** Relayed from the input once the state has changed. */
  onchange?: (e: HelixBaseSwitchElementEvent) => void;
};

export type HelixBaseSwitchSolidJsProps = {
  /** Value submitted when the switch is on. */
  "prop:value"?: HelixBaseSwitch["value"];
  /** Whether the control is checked.

One property rather than two. Reading gives the real state whichever
mode the control is in; writing hands ownership to the consumer, which
is what the attribute in `<helix-checkbox checked>` does as well. The
same shape all four of these mixins have, for the reason given on
`MixinControllerOpen.open`.

Not reflected: the attribute is the consumer's input and stays as they
wrote it, and `data-checked` carries the resolved state for stylesheets. */
  "prop:checked"?: HelixBaseSwitch["checked"];
  /** Initial checked state for uncontrolled use, where nothing declared one. */
  "bool:default-checked"?: HelixBaseSwitch["defaultChecked"];
  /** Initial checked state for uncontrolled use, where nothing declared one. */
  "prop:defaultChecked"?: HelixBaseSwitch["defaultChecked"];
  /** Help under the control, shown while there is nothing wrong. */
  "prop:hint"?: HelixBaseSwitch["hint"];
  /** What is wrong, in the reader's words rather than the browser's. */
  "prop:feedback"?: HelixBaseSwitch["feedback"];
  /** The accessible name, and the fallback for the `label` slot. */
  "prop:label"?: HelixBaseSwitch["label"];
  /** Whether the form refuses to submit without it. */
  "prop:required"?: HelixBaseSwitch["required"];
  /** Whether the control is non-interactive.

Reflected, because the styled tier selects on it, and mirrored to
`aria-disabled` rather than removing the element from the accessibility
tree, so a screen reader can still announce that the control exists. */
  "prop:disabled"?: HelixBaseSwitch["disabled"];
  /** Name submitted with the form.

**Reflected, and it is the exception to "reflect only what CSS selects
on".** The platform builds a form's entry list from the `name` *content
attribute*, not from the property, so a control named through the property
submitted under no name at all and was silently dropped. Measured: two
inputs in one form, one named by attribute and one by property, and the
form carried a single entry.

Safe for a React consumer, which is what the rule is protecting: React
renders a custom element's props as attributes on the server, so the name
is already in the markup being hydrated and reflecting it writes what is
there. It is only a change to the markup when a consumer assigns it
imperatively later, and nothing is hydrating by then.

Here rather than on each control, where it was declared eight times and
reflected none of them. */
  "prop:name"?: HelixBaseSwitch["name"];
  /** The consumer's callback, invoked after the state is applied.

Not an attribute: it is a function. And not reachable from React's JSX,
which reserves every `on[A-Z]` prop for its own event system and drops
what it does not recognize; the generated wrapper listens for the event
instead. */
  "prop:onCheckedChange"?: HelixBaseSwitch["onCheckedChange"];
  /** Fired before the state changes, and cancelable. */
  "on:helix-change"?: (e: HelixBaseSwitchHelixChangeElementEvent) => void;
  /** Relayed from the input once the state has changed. */
  "on:change"?: (e: HelixBaseSwitchElementEvent) => void;

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

export type HelixBaseTableColumnProps = {
  /** The track this column takes, as CSS.

A single track value, so anything valid in `grid-template-columns` works:
`16rem`, `auto`, `minmax(0, 2fr)`. Left unset the column shares what is
left over equally, which is `minmax(0, 1fr)` rather than `1fr`: a bare
`1fr` track keeps an automatic minimum and refuses to shrink under a long
cell, so one unbreakable value pushes the table past its container. */
  width?: HelixBaseTableColumn["width"];
};

export type HelixBaseTableColumnSolidJsProps = {
  /** The track this column takes, as CSS.

A single track value, so anything valid in `grid-template-columns` works:
`16rem`, `auto`, `minmax(0, 2fr)`. Left unset the column shares what is
left over equally, which is `minmax(0, 1fr)` rather than `1fr`: a bare
`1fr` track keeps an automatic minimum and refuses to shrink under a long
cell, so one unbreakable value pushes the table past its container. */
  "prop:width"?: HelixBaseTableColumn["width"];

  /** Set the innerHTML of the element */
  innerHTML?: string;
  /** Set the textContent of the element */
  textContent?: string | number;
};

export type HelixBaseTableProps = {
  /** Column track list, as CSS. Deprecated: declare columns instead.

Kept for a table that has no `helix-table-column` children, and ignored the
moment it has one. A raw track list is the right shape for the value and
the wrong place for it: the headings and the widths were two halves of one
fact held in two places, and nothing checked that they agreed. Worse, the
value is CSS, so handing it headings by mistake produced an invalid track
list, which a grid ignores in silence: the table collapsed to one column
and said nothing. Columns carry both halves now. */
  columns?: HelixBaseTable["columns"];
  /** Accessible name for the table. */
  label?: HelixBaseTable["label"];
};

export type HelixBaseTableSolidJsProps = {
  /** Column track list, as CSS. Deprecated: declare columns instead.

Kept for a table that has no `helix-table-column` children, and ignored the
moment it has one. A raw track list is the right shape for the value and
the wrong place for it: the headings and the widths were two halves of one
fact held in two places, and nothing checked that they agreed. Worse, the
value is CSS, so handing it headings by mistake produced an invalid track
list, which a grid ignores in silence: the table collapsed to one column
and said nothing. Columns carry both halves now. */
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

export type HelixBaseTabsPanelProps = {
  /** Pairs the panel with the tab of the same value. */
  value?: HelixBaseTabsPanel["value"];
  /** Whether this panel is the visible one. */
  selected?: HelixBaseTabsPanel["selected"];
  /** The name of the panel, which is the text of the tab that opens it.

Set by the root, which is the only thing that sees both. No attribute,
because it is coordination between elements rather than anything a consumer
writes: the tab already says it.

A string where the markup wanted a reference. `aria-labelledby` named
`tab-${value}`, an id inside the *tab's* own shadow root, and an IDREF
resolves only in the tree it is written in, so the panel had no accessible
name at all. An element reference cannot reach there either, a sibling
shadow tree being neither the same tree nor an ancestor of it. A name is
the one form that crosses, and `aria-label` on a `tabpanel` is how the
pattern names one anyway. */
  label?: HelixBaseTabsPanel["label"];
};

export type HelixBaseTabsPanelSolidJsProps = {
  /** Pairs the panel with the tab of the same value. */
  "prop:value"?: HelixBaseTabsPanel["value"];
  /** Whether this panel is the visible one. */
  "prop:selected"?: HelixBaseTabsPanel["selected"];
  /** The name of the panel, which is the text of the tab that opens it.

Set by the root, which is the only thing that sees both. No attribute,
because it is coordination between elements rather than anything a consumer
writes: the tab already says it.

A string where the markup wanted a reference. `aria-labelledby` named
`tab-${value}`, an id inside the *tab's* own shadow root, and an IDREF
resolves only in the tree it is written in, so the panel had no accessible
name at all. An element reference cannot reach there either, a sibling
shadow tree being neither the same tree nor an ancestor of it. A name is
the one form that crosses, and `aria-label` on a `tabpanel` is how the
pattern names one anyway. */
  "prop:label"?: HelixBaseTabsPanel["label"];

  /** Set the innerHTML of the element */
  innerHTML?: string;
  /** Set the textContent of the element */
  textContent?: string | number;
};

/** `HelixBaseTabs` component event */
export type HelixBaseTabsElementEvent<E = Event> = TypedEvent<HelixBaseTabs, E>;
/** `helix-change` event type */
export type HelixBaseTabsHelixChangeElementEvent =
  HelixBaseTabsElementEvent<HelixChangeEvent>;
/** `helix-select` event type */
export type HelixBaseTabsHelixSelectElementEvent =
  HelixBaseTabsElementEvent<HelixSelectEvent>;

export type HelixBaseTabsProps = {
  /** How the row reads.

Unset is a raised pill on the selected tab with nothing behind the row,
which is what a set sitting inside other chrome wants. `underline` is a
rule under the row and a thicker one under the selected tab, for a set that
heads a page. `toggle` puts the pill in a framed, sunken track, which reads
as one control rather than as a row.

Reflected and left unset by default, so the host carries nothing a
consumer's server markup does not already have. */
  appearance?: HelixBaseTabs["appearance"];
  /** Accessible name for the tab list. */
  label?: HelixBaseTabs["label"];
  /** Whether arrowing to a tab also selects it.

Automatic is the default because showing a panel is usually cheap. Set this
where it is not, so a reader arrowing past four tabs does not load four
panels on the way. */
  manual?: HelixBaseTabs["manual"];
  /** Which item is current, by its `value`.

Called `active`, which is what this mixin is named for and what it was
not: it declared `value`, so the one mixin whose whole subject is which
item is active had no such property, and `active` meant something else
entirely elsewhere in the library. It still does, and only there now:
`option.active` is the option the keyboard is on, which is a different
question from which one is chosen.

An accessor pair, the same shape as the other three. Reading gives the
real item; writing hands ownership to the consumer, so `<helix-tabs
active="one">` is a set that stays on that tab and `default-active` is
how markup says where to start. */
  active?: HelixBaseTabs["active"];
  /** Initial item for uncontrolled use. Ignored once `active` is written. */
  "default-active"?: HelixBaseTabs["defaultActive"];
  /** Initial item for uncontrolled use. Ignored once `active` is written. */
  defaultActive?: HelixBaseTabs["defaultActive"];
  /** The consumer's callback, invoked after the change is applied. */
  onActiveChange?: HelixBaseTabs["onActiveChange"];

  /** Fired before the current tab moves, and cancelable. The only way to refuse one. */
  "onhelix-change"?: (e: HelixBaseTabsHelixChangeElementEvent) => void;
  /** Fired when a tab is chosen. Dispatched by the tab and listened for here, because the root is what a consumer holds. */
  "onhelix-select"?: (e: HelixBaseTabsHelixSelectElementEvent) => void;
};

export type HelixBaseTabsSolidJsProps = {
  /** How the row reads.

Unset is a raised pill on the selected tab with nothing behind the row,
which is what a set sitting inside other chrome wants. `underline` is a
rule under the row and a thicker one under the selected tab, for a set that
heads a page. `toggle` puts the pill in a framed, sunken track, which reads
as one control rather than as a row.

Reflected and left unset by default, so the host carries nothing a
consumer's server markup does not already have. */
  "prop:appearance"?: HelixBaseTabs["appearance"];
  /** Accessible name for the tab list. */
  "prop:label"?: HelixBaseTabs["label"];
  /** Whether arrowing to a tab also selects it.

Automatic is the default because showing a panel is usually cheap. Set this
where it is not, so a reader arrowing past four tabs does not load four
panels on the way. */
  "prop:manual"?: HelixBaseTabs["manual"];
  /** Which item is current, by its `value`.

Called `active`, which is what this mixin is named for and what it was
not: it declared `value`, so the one mixin whose whole subject is which
item is active had no such property, and `active` meant something else
entirely elsewhere in the library. It still does, and only there now:
`option.active` is the option the keyboard is on, which is a different
question from which one is chosen.

An accessor pair, the same shape as the other three. Reading gives the
real item; writing hands ownership to the consumer, so `<helix-tabs
active="one">` is a set that stays on that tab and `default-active` is
how markup says where to start. */
  "prop:active"?: HelixBaseTabs["active"];
  /** Initial item for uncontrolled use. Ignored once `active` is written. */
  "attr:default-active"?: HelixBaseTabs["defaultActive"];
  /** Initial item for uncontrolled use. Ignored once `active` is written. */
  "prop:defaultActive"?: HelixBaseTabs["defaultActive"];
  /** The consumer's callback, invoked after the change is applied. */
  "prop:onActiveChange"?: HelixBaseTabs["onActiveChange"];
  /** Fired before the current tab moves, and cancelable. The only way to refuse one. */
  "on:helix-change"?: (e: HelixBaseTabsHelixChangeElementEvent) => void;
  /** Fired when a tab is chosen. Dispatched by the tab and listened for here, because the root is what a consumer holds. */
  "on:helix-select"?: (e: HelixBaseTabsHelixSelectElementEvent) => void;

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
/** `helix-select` event type */
export type HelixBaseTabsTabHelixSelectElementEvent =
  HelixBaseTabsTabElementEvent<HelixSelectEvent>;

export type HelixBaseTabsTabProps = {
  /** Identifies the tab, and pairs it with the panel of the same value. */
  value?: HelixBaseTabsTab["value"];
  /** Whether this tab is the current one. */
  selected?: HelixBaseTabsTab["selected"];
  /** Whether the tab can be chosen. */
  disabled?: HelixBaseTabsTab["disabled"];

  /** Fired when the tab is chosen. */
  "onhelix-select"?: (e: HelixBaseTabsTabHelixSelectElementEvent) => void;
};

export type HelixBaseTabsTabSolidJsProps = {
  /** Identifies the tab, and pairs it with the panel of the same value. */
  "prop:value"?: HelixBaseTabsTab["value"];
  /** Whether this tab is the current one. */
  "prop:selected"?: HelixBaseTabsTab["selected"];
  /** Whether the tab can be chosen. */
  "prop:disabled"?: HelixBaseTabsTab["disabled"];
  /** Fired when the tab is chosen. */
  "on:helix-select"?: (e: HelixBaseTabsTabHelixSelectElementEvent) => void;

  /** Set the innerHTML of the element */
  innerHTML?: string;
  /** Set the textContent of the element */
  textContent?: string | number;
};

/** `HelixBaseTag` component event */
export type HelixBaseTagElementEvent<E = Event> = TypedEvent<HelixBaseTag, E>;
/** `helix-dismiss` event type */
export type HelixBaseTagHelixDismissElementEvent =
  HelixBaseTagElementEvent<HelixDismissEvent>;

export type HelixBaseTagProps = {
  /** Whether it offers a control to take it away. */
  dismissible?: HelixBaseTag["dismissible"];
  /** Accessible name for that control.

`attribute` is spelled out because Lit lowercases a property name to
derive one rather than dash-casing it, so this would otherwise be
reachable only as `dismisslabel`, which nobody would guess and no linter
would catch. */
  "dismiss-label"?: HelixBaseTag["dismissLabel"];
  /** Accessible name for that control.

`attribute` is spelled out because Lit lowercases a property name to
derive one rather than dash-casing it, so this would otherwise be
reachable only as `dismisslabel`, which nobody would guess and no linter
would catch. */
  dismissLabel?: HelixBaseTag["dismissLabel"];

  /** Fired when the reader asks to remove the tag. */
  "onhelix-dismiss"?: (e: HelixBaseTagHelixDismissElementEvent) => void;
};

export type HelixBaseTagSolidJsProps = {
  /** Whether it offers a control to take it away. */
  "prop:dismissible"?: HelixBaseTag["dismissible"];
  /** Accessible name for that control.

`attribute` is spelled out because Lit lowercases a property name to
derive one rather than dash-casing it, so this would otherwise be
reachable only as `dismisslabel`, which nobody would guess and no linter
would catch. */
  "attr:dismiss-label"?: HelixBaseTag["dismissLabel"];
  /** Accessible name for that control.

`attribute` is spelled out because Lit lowercases a property name to
derive one rather than dash-casing it, so this would otherwise be
reachable only as `dismisslabel`, which nobody would guess and no linter
would catch. */
  "prop:dismissLabel"?: HelixBaseTag["dismissLabel"];
  /** Fired when the reader asks to remove the tag. */
  "on:helix-dismiss"?: (e: HelixBaseTagHelixDismissElementEvent) => void;

  /** Set the innerHTML of the element */
  innerHTML?: string;
  /** Set the textContent of the element */
  textContent?: string | number;
};

/** `HelixBaseTextarea` component event */
export type HelixBaseTextareaElementEvent<E = Event> = TypedEvent<
  HelixBaseTextarea,
  E
>;
/** `helix-change` event type */
export type HelixBaseTextareaHelixChangeElementEvent =
  HelixBaseTextareaElementEvent<HelixChangeEvent>;

export type HelixBaseTextareaProps = {
  /** Whether the box follows its own content rather than scrolling. */
  "auto-grow"?: HelixBaseTextarea["autoGrow"];
  /** Whether the box follows its own content rather than scrolling. */
  autoGrow?: HelixBaseTextarea["autoGrow"];
  /** Shown while the field is empty. Not a label: it goes when typing starts. */
  placeholder?: HelixBaseTextarea["placeholder"];
  /** Whether the field refuses input while still submitting its value. */
  "read-only"?: HelixBaseTextarea["readOnly"];
  /** Whether the field refuses input while still submitting its value. */
  readOnly?: HelixBaseTextarea["readOnly"];
  /** How many lines the box is before anything is typed. */
  rows?: HelixBaseTextarea["rows"];
  /** Fewest characters the value may have.

Forwarded to the real `<textarea>` rather than checked here, which is what
makes the message the browser's and therefore the reader's own language.
No `pattern`: the platform does not give a textarea one, and inventing it
would be this library guessing where the point is to stop guessing. */
  minlength?: HelixBaseTextarea["minLength"];
  /** Fewest characters the value may have.

Forwarded to the real `<textarea>` rather than checked here, which is what
makes the message the browser's and therefore the reader's own language.
No `pattern`: the platform does not give a textarea one, and inventing it
would be this library guessing where the point is to stop guessing. */
  minLength?: HelixBaseTextarea["minLength"];
  /** Most characters the value may have. */
  maxlength?: HelixBaseTextarea["maxLength"];
  /** Most characters the value may have. */
  maxLength?: HelixBaseTextarea["maxLength"];
  /** The value the markup declared, which is where a reset returns to. */
  "default-value"?: HelixBaseTextarea["defaultValue"];
  /** The value the markup declared, which is where a reset returns to. */
  defaultValue?: HelixBaseTextarea["defaultValue"];
  /** What the control holds now, and what its form submits.

One property, not two. Reading gives the real value whichever mode the
control is in, so `input.value` answers the question anyone asking it
meant. Writing hands ownership to the consumer, which is what
`<helix-input value="x">` says too, and matches what a controlled input
means in React: the value is theirs and the control waits to be told.
`default-value` is how markup seeds one it does not want to own.

The same shape as the other three mixins, which is the point of them
being four of a kind rather than four of three kinds. */
  value?: HelixBaseTextarea["value"];
  /** Help under the control, shown while there is nothing wrong. */
  hint?: HelixBaseTextarea["hint"];
  /** What is wrong, in the reader's words rather than the browser's. */
  feedback?: HelixBaseTextarea["feedback"];
  /** The accessible name, and the fallback for the `label` slot. */
  label?: HelixBaseTextarea["label"];
  /** Whether the form refuses to submit without it. */
  required?: HelixBaseTextarea["required"];
  /** Whether the control is non-interactive.

Reflected, because the styled tier selects on it, and mirrored to
`aria-disabled` rather than removing the element from the accessibility
tree, so a screen reader can still announce that the control exists. */
  disabled?: HelixBaseTextarea["disabled"];
  /** Name submitted with the form.

**Reflected, and it is the exception to "reflect only what CSS selects
on".** The platform builds a form's entry list from the `name` *content
attribute*, not from the property, so a control named through the property
submitted under no name at all and was silently dropped. Measured: two
inputs in one form, one named by attribute and one by property, and the
form carried a single entry.

Safe for a React consumer, which is what the rule is protecting: React
renders a custom element's props as attributes on the server, so the name
is already in the markup being hydrated and reflecting it writes what is
there. It is only a change to the markup when a consumer assigns it
imperatively later, and nothing is hydrating by then.

Here rather than on each control, where it was declared eight times and
reflected none of them. */
  name?: HelixBaseTextarea["name"];
  /** The consumer's callback, invoked after the value is applied.

Not an attribute: it is a function. `onValueChange` and not `onChange`,
because React reserves the latter for its own synthetic system and wires
it to the native `change`, so a Helix event named `Change` would never
fire at all. */
  onValueChange?: HelixBaseTextarea["onValueChange"];

  /** Fired as the text changes, and cancelable. */
  "onhelix-change"?: (e: HelixBaseTextareaHelixChangeElementEvent) => void;
  /** Relayed from the textarea once the reader has finished. */
  onchange?: (e: HelixBaseTextareaElementEvent) => void;
};

export type HelixBaseTextareaSolidJsProps = {
  /** Whether the box follows its own content rather than scrolling. */
  "bool:auto-grow"?: HelixBaseTextarea["autoGrow"];
  /** Whether the box follows its own content rather than scrolling. */
  "prop:autoGrow"?: HelixBaseTextarea["autoGrow"];
  /** Shown while the field is empty. Not a label: it goes when typing starts. */
  "prop:placeholder"?: HelixBaseTextarea["placeholder"];
  /** Whether the field refuses input while still submitting its value. */
  "bool:read-only"?: HelixBaseTextarea["readOnly"];
  /** Whether the field refuses input while still submitting its value. */
  "prop:readOnly"?: HelixBaseTextarea["readOnly"];
  /** How many lines the box is before anything is typed. */
  "prop:rows"?: HelixBaseTextarea["rows"];
  /** Fewest characters the value may have.

Forwarded to the real `<textarea>` rather than checked here, which is what
makes the message the browser's and therefore the reader's own language.
No `pattern`: the platform does not give a textarea one, and inventing it
would be this library guessing where the point is to stop guessing. */
  "attr:minlength"?: HelixBaseTextarea["minLength"];
  /** Fewest characters the value may have.

Forwarded to the real `<textarea>` rather than checked here, which is what
makes the message the browser's and therefore the reader's own language.
No `pattern`: the platform does not give a textarea one, and inventing it
would be this library guessing where the point is to stop guessing. */
  "prop:minLength"?: HelixBaseTextarea["minLength"];
  /** Most characters the value may have. */
  "attr:maxlength"?: HelixBaseTextarea["maxLength"];
  /** Most characters the value may have. */
  "prop:maxLength"?: HelixBaseTextarea["maxLength"];
  /** The value the markup declared, which is where a reset returns to. */
  "attr:default-value"?: HelixBaseTextarea["defaultValue"];
  /** The value the markup declared, which is where a reset returns to. */
  "prop:defaultValue"?: HelixBaseTextarea["defaultValue"];
  /** What the control holds now, and what its form submits.

One property, not two. Reading gives the real value whichever mode the
control is in, so `input.value` answers the question anyone asking it
meant. Writing hands ownership to the consumer, which is what
`<helix-input value="x">` says too, and matches what a controlled input
means in React: the value is theirs and the control waits to be told.
`default-value` is how markup seeds one it does not want to own.

The same shape as the other three mixins, which is the point of them
being four of a kind rather than four of three kinds. */
  "prop:value"?: HelixBaseTextarea["value"];
  /** Help under the control, shown while there is nothing wrong. */
  "prop:hint"?: HelixBaseTextarea["hint"];
  /** What is wrong, in the reader's words rather than the browser's. */
  "prop:feedback"?: HelixBaseTextarea["feedback"];
  /** The accessible name, and the fallback for the `label` slot. */
  "prop:label"?: HelixBaseTextarea["label"];
  /** Whether the form refuses to submit without it. */
  "prop:required"?: HelixBaseTextarea["required"];
  /** Whether the control is non-interactive.

Reflected, because the styled tier selects on it, and mirrored to
`aria-disabled` rather than removing the element from the accessibility
tree, so a screen reader can still announce that the control exists. */
  "prop:disabled"?: HelixBaseTextarea["disabled"];
  /** Name submitted with the form.

**Reflected, and it is the exception to "reflect only what CSS selects
on".** The platform builds a form's entry list from the `name` *content
attribute*, not from the property, so a control named through the property
submitted under no name at all and was silently dropped. Measured: two
inputs in one form, one named by attribute and one by property, and the
form carried a single entry.

Safe for a React consumer, which is what the rule is protecting: React
renders a custom element's props as attributes on the server, so the name
is already in the markup being hydrated and reflecting it writes what is
there. It is only a change to the markup when a consumer assigns it
imperatively later, and nothing is hydrating by then.

Here rather than on each control, where it was declared eight times and
reflected none of them. */
  "prop:name"?: HelixBaseTextarea["name"];
  /** The consumer's callback, invoked after the value is applied.

Not an attribute: it is a function. `onValueChange` and not `onChange`,
because React reserves the latter for its own synthetic system and wires
it to the native `change`, so a Helix event named `Change` would never
fire at all. */
  "prop:onValueChange"?: HelixBaseTextarea["onValueChange"];
  /** Fired as the text changes, and cancelable. */
  "on:helix-change"?: (e: HelixBaseTextareaHelixChangeElementEvent) => void;
  /** Relayed from the textarea once the reader has finished. */
  "on:change"?: (e: HelixBaseTextareaElementEvent) => void;

  /** Set the innerHTML of the element */
  innerHTML?: string;
  /** Set the textContent of the element */
  textContent?: string | number;
};

/** `HelixBaseToastItem` component event */
export type HelixBaseToastItemElementEvent<E = Event> = TypedEvent<
  HelixBaseToastItem,
  E
>;
/** `helix-dismiss` event type */
export type HelixBaseToastItemHelixDismissElementEvent =
  HelixBaseToastItemElementEvent<HelixDismissEvent>;

export type HelixBaseToastItemProps = {
  /** How long it stays, in milliseconds. Absent means until it is dismissed.

Read once when the item is first rendered. Changing it afterwards does not
restart a message the reader is already partway through. */
  duration?: HelixBaseToastItem["duration"];
  /** What kind of message it is, which picks the mark and its name. */
  severity?: HelixBaseToastItem["severity"];
  /** Whether the message is still showing.

The same decide-once contract every other stateful thing here carries, and
it was the one exception: this waited to be told in every case, so
`duration` did nothing at all without consumer script and the dismiss
control looked broken to anyone who pressed it. `Dialog` closes itself,
`Accordion` closes itself, and there was no reason a message should not.

Declared by the markup and it is the consumer's: the item announces and
waits. Not declared and it is the item's: it goes when it is asked to, and
the consumer still hears `helix-dismiss` and takes it out of their own
list. Read once, at the first update.

**No `default-open`, unlike the four mixins.** A `default-` seed exists so
markup can choose a starting state without claiming ownership, and there is
only one starting state that makes sense: a message that has been rendered
is showing. An attribute whose only legal value is the default is an
attribute nobody can use. */
  open?: HelixBaseToastItem["open"];
  /** Whether it offers a control to take it away. */
  dismissible?: HelixBaseToastItem["dismissible"];
  /** Accessible name for that control.

`attribute` is spelled out because Lit lowercases a property name to
derive one rather than dash-casing it, so this would otherwise be
reachable only as `dismisslabel`, which nobody would guess and no linter
would catch. */
  "dismiss-label"?: HelixBaseToastItem["dismissLabel"];
  /** Accessible name for that control.

`attribute` is spelled out because Lit lowercases a property name to
derive one rather than dash-casing it, so this would otherwise be
reachable only as `dismisslabel`, which nobody would guess and no linter
would catch. */
  dismissLabel?: HelixBaseToastItem["dismissLabel"];

  /** Fired when it asks to go, whether by the control or by its timer. */
  "onhelix-dismiss"?: (e: HelixBaseToastItemHelixDismissElementEvent) => void;
};

export type HelixBaseToastItemSolidJsProps = {
  /** How long it stays, in milliseconds. Absent means until it is dismissed.

Read once when the item is first rendered. Changing it afterwards does not
restart a message the reader is already partway through. */
  "prop:duration"?: HelixBaseToastItem["duration"];
  /** What kind of message it is, which picks the mark and its name. */
  "prop:severity"?: HelixBaseToastItem["severity"];
  /** Whether the message is still showing.

The same decide-once contract every other stateful thing here carries, and
it was the one exception: this waited to be told in every case, so
`duration` did nothing at all without consumer script and the dismiss
control looked broken to anyone who pressed it. `Dialog` closes itself,
`Accordion` closes itself, and there was no reason a message should not.

Declared by the markup and it is the consumer's: the item announces and
waits. Not declared and it is the item's: it goes when it is asked to, and
the consumer still hears `helix-dismiss` and takes it out of their own
list. Read once, at the first update.

**No `default-open`, unlike the four mixins.** A `default-` seed exists so
markup can choose a starting state without claiming ownership, and there is
only one starting state that makes sense: a message that has been rendered
is showing. An attribute whose only legal value is the default is an
attribute nobody can use. */
  "prop:open"?: HelixBaseToastItem["open"];
  /** Whether it offers a control to take it away. */
  "prop:dismissible"?: HelixBaseToastItem["dismissible"];
  /** Accessible name for that control.

`attribute` is spelled out because Lit lowercases a property name to
derive one rather than dash-casing it, so this would otherwise be
reachable only as `dismisslabel`, which nobody would guess and no linter
would catch. */
  "attr:dismiss-label"?: HelixBaseToastItem["dismissLabel"];
  /** Accessible name for that control.

`attribute` is spelled out because Lit lowercases a property name to
derive one rather than dash-casing it, so this would otherwise be
reachable only as `dismisslabel`, which nobody would guess and no linter
would catch. */
  "prop:dismissLabel"?: HelixBaseToastItem["dismissLabel"];
  /** Fired when it asks to go, whether by the control or by its timer. */
  "on:helix-dismiss"?: (e: HelixBaseToastItemHelixDismissElementEvent) => void;

  /** Set the innerHTML of the element */
  innerHTML?: string;
  /** Set the textContent of the element */
  textContent?: string | number;
};

export type HelixBaseToastProps = {
  /** Accessible name for the region, such as "Notifications". */
  label?: HelixBaseToast["label"];
  /** Which corner or edge the stack sits at.

Named here rather than on each message, because where a page puts its
toasts is a fact about the page: a stack whose members disagreed about
where they were would not be a stack. */
  placement?: HelixBaseToast["placement"];
};

export type HelixBaseToastSolidJsProps = {
  /** Accessible name for the region, such as "Notifications". */
  "prop:label"?: HelixBaseToast["label"];
  /** Which corner or edge the stack sits at.

Named here rather than on each message, because where a page puts its
toasts is a fact about the page: a stack whose members disagreed about
where they were would not be a stack. */
  "prop:placement"?: HelixBaseToast["placement"];

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
/** `helix-change` event type */
export type HelixBaseToggleGroupHelixChangeElementEvent =
  HelixBaseToggleGroupElementEvent<HelixChangeEvent>;
/** `helix-select` event type */
export type HelixBaseToggleGroupHelixSelectElementEvent =
  HelixBaseToggleGroupElementEvent<HelixSelectEvent>;

export type HelixBaseToggleGroupProps = {
  /** The value the markup declared, which is where a reset returns to. */
  "default-value"?: HelixBaseToggleGroup["defaultValue"];
  /** The value the markup declared, which is where a reset returns to. */
  defaultValue?: HelixBaseToggleGroup["defaultValue"];
  /** What the control holds now, and what its form submits.

One property, not two. Reading gives the real value whichever mode the
control is in, so `input.value` answers the question anyone asking it
meant. Writing hands ownership to the consumer, which is what
`<helix-input value="x">` says too, and matches what a controlled input
means in React: the value is theirs and the control waits to be told.
`default-value` is how markup seeds one it does not want to own.

The same shape as the other three mixins, which is the point of them
being four of a kind rather than four of three kinds. */
  value?: HelixBaseToggleGroup["value"];
  /** Help under the control, shown while there is nothing wrong. */
  hint?: HelixBaseToggleGroup["hint"];
  /** What is wrong, in the reader's words rather than the browser's. */
  feedback?: HelixBaseToggleGroup["feedback"];
  /** The accessible name, and the fallback for the `label` slot. */
  label?: HelixBaseToggleGroup["label"];
  /** Whether the form refuses to submit without it. */
  required?: HelixBaseToggleGroup["required"];
  /** Whether the control is non-interactive.

Reflected, because the styled tier selects on it, and mirrored to
`aria-disabled` rather than removing the element from the accessibility
tree, so a screen reader can still announce that the control exists. */
  disabled?: HelixBaseToggleGroup["disabled"];
  /** Name submitted with the form.

**Reflected, and it is the exception to "reflect only what CSS selects
on".** The platform builds a form's entry list from the `name` *content
attribute*, not from the property, so a control named through the property
submitted under no name at all and was silently dropped. Measured: two
inputs in one form, one named by attribute and one by property, and the
form carried a single entry.

Safe for a React consumer, which is what the rule is protecting: React
renders a custom element's props as attributes on the server, so the name
is already in the markup being hydrated and reflecting it writes what is
there. It is only a change to the markup when a consumer assigns it
imperatively later, and nothing is hydrating by then.

Here rather than on each control, where it was declared eight times and
reflected none of them. */
  name?: HelixBaseToggleGroup["name"];
  /** The consumer's callback, invoked after the value is applied.

Not an attribute: it is a function. `onValueChange` and not `onChange`,
because React reserves the latter for its own synthetic system and wires
it to the native `change`, so a Helix event named `Change` would never
fire at all. */
  onValueChange?: HelixBaseToggleGroup["onValueChange"];

  /** Fired before the answer moves, and cancelable. The only way to refuse one. */
  "onhelix-change"?: (e: HelixBaseToggleGroupHelixChangeElementEvent) => void;
  /** Fired when an item is chosen. Dispatched by the item and listened for here. */
  "onhelix-select"?: (e: HelixBaseToggleGroupHelixSelectElementEvent) => void;
};

export type HelixBaseToggleGroupSolidJsProps = {
  /** The value the markup declared, which is where a reset returns to. */
  "attr:default-value"?: HelixBaseToggleGroup["defaultValue"];
  /** The value the markup declared, which is where a reset returns to. */
  "prop:defaultValue"?: HelixBaseToggleGroup["defaultValue"];
  /** What the control holds now, and what its form submits.

One property, not two. Reading gives the real value whichever mode the
control is in, so `input.value` answers the question anyone asking it
meant. Writing hands ownership to the consumer, which is what
`<helix-input value="x">` says too, and matches what a controlled input
means in React: the value is theirs and the control waits to be told.
`default-value` is how markup seeds one it does not want to own.

The same shape as the other three mixins, which is the point of them
being four of a kind rather than four of three kinds. */
  "prop:value"?: HelixBaseToggleGroup["value"];
  /** Help under the control, shown while there is nothing wrong. */
  "prop:hint"?: HelixBaseToggleGroup["hint"];
  /** What is wrong, in the reader's words rather than the browser's. */
  "prop:feedback"?: HelixBaseToggleGroup["feedback"];
  /** The accessible name, and the fallback for the `label` slot. */
  "prop:label"?: HelixBaseToggleGroup["label"];
  /** Whether the form refuses to submit without it. */
  "prop:required"?: HelixBaseToggleGroup["required"];
  /** Whether the control is non-interactive.

Reflected, because the styled tier selects on it, and mirrored to
`aria-disabled` rather than removing the element from the accessibility
tree, so a screen reader can still announce that the control exists. */
  "prop:disabled"?: HelixBaseToggleGroup["disabled"];
  /** Name submitted with the form.

**Reflected, and it is the exception to "reflect only what CSS selects
on".** The platform builds a form's entry list from the `name` *content
attribute*, not from the property, so a control named through the property
submitted under no name at all and was silently dropped. Measured: two
inputs in one form, one named by attribute and one by property, and the
form carried a single entry.

Safe for a React consumer, which is what the rule is protecting: React
renders a custom element's props as attributes on the server, so the name
is already in the markup being hydrated and reflecting it writes what is
there. It is only a change to the markup when a consumer assigns it
imperatively later, and nothing is hydrating by then.

Here rather than on each control, where it was declared eight times and
reflected none of them. */
  "prop:name"?: HelixBaseToggleGroup["name"];
  /** The consumer's callback, invoked after the value is applied.

Not an attribute: it is a function. `onValueChange` and not `onChange`,
because React reserves the latter for its own synthetic system and wires
it to the native `change`, so a Helix event named `Change` would never
fire at all. */
  "prop:onValueChange"?: HelixBaseToggleGroup["onValueChange"];
  /** Fired before the answer moves, and cancelable. The only way to refuse one. */
  "on:helix-change"?: (e: HelixBaseToggleGroupHelixChangeElementEvent) => void;
  /** Fired when an item is chosen. Dispatched by the item and listened for here. */
  "on:helix-select"?: (e: HelixBaseToggleGroupHelixSelectElementEvent) => void;

  /** Set the innerHTML of the element */
  innerHTML?: string;
  /** Set the textContent of the element */
  textContent?: string | number;
};

/** `HelixBaseToggle` component event */
export type HelixBaseToggleElementEvent<E = Event> = TypedEvent<
  HelixBaseToggle,
  E
>;
/** `helix-select` event type */
export type HelixBaseToggleHelixSelectElementEvent =
  HelixBaseToggleElementEvent<HelixSelectEvent>;

export type HelixBaseToggleProps = {
  /** Identifies the item to the group. */
  value?: HelixBaseToggle["value"];
  /** Whether this item is the current one. */
  selected?: HelixBaseToggle["selected"];
  /** Whether the item can be chosen. */
  disabled?: HelixBaseToggle["disabled"];
  /** Whether this item holds the group's tab stop while nothing is chosen.

The stop normally rides on the selection, and an unanswered group has no
selection, so it had no stop and the keyboard could not reach it. Written
by the group, with no attribute: it is coordination between elements, and
`tabindex` on a host the consumer rendered is the change a React consumer's
hydration reports and does not patch up. */
  focusable?: HelixBaseToggle["focusable"];

  /** Fired when the item is chosen. */
  "onhelix-select"?: (e: HelixBaseToggleHelixSelectElementEvent) => void;
};

export type HelixBaseToggleSolidJsProps = {
  /** Identifies the item to the group. */
  "prop:value"?: HelixBaseToggle["value"];
  /** Whether this item is the current one. */
  "prop:selected"?: HelixBaseToggle["selected"];
  /** Whether the item can be chosen. */
  "prop:disabled"?: HelixBaseToggle["disabled"];
  /** Whether this item holds the group's tab stop while nothing is chosen.

The stop normally rides on the selection, and an unanswered group has no
selection, so it had no stop and the keyboard could not reach it. Written
by the group, with no attribute: it is coordination between elements, and
`tabindex` on a host the consumer rendered is the change a React consumer's
hydration reports and does not patch up. */
  "prop:focusable"?: HelixBaseToggle["focusable"];
  /** Fired when the item is chosen. */
  "on:helix-select"?: (e: HelixBaseToggleHelixSelectElementEvent) => void;

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

/** `HelixBaseTooltip` component event */
export type HelixBaseTooltipElementEvent<E = Event> = TypedEvent<
  HelixBaseTooltip,
  E
>;
/** `helix-open` event type */
export type HelixBaseTooltipHelixOpenElementEvent =
  HelixBaseTooltipElementEvent<HelixOpenEvent>;
/** `helix-close` event type */
export type HelixBaseTooltipHelixCloseElementEvent =
  HelixBaseTooltipElementEvent<HelixCloseEvent>;

export type HelixBaseTooltipProps = {
  /** The text shown in the bubble.

The common case, and the fallback for the `content` slot: slot something
there and it replaces this. Both cannot show at once, which is the point
of using fallback content rather than rendering whichever is present. */
  content?: HelixBaseTooltip["content"];
  /** Preferred side. It moves if that side does not fit. */
  placement?: HelixBaseTooltip["placement"];
  /** Space between the trigger and the bubble, in pixels.

Eight, which is not arbitrary: it is the size of the arrow the styled tier
draws, so the point reaches the trigger and the bubble does not. A consumer
changing this and keeping the arrow gets a point that falls short or one
that overlaps what it is pointing at, which is worth knowing before
changing it rather than after. */
  offset?: HelixBaseTooltip["offset"];
  /** Whether the tooltip never shows. */
  disabled?: HelixBaseTooltip["disabled"];
  /** How long the pointer must rest before the bubble appears, in milliseconds.

Without one, sweeping across a row of controls flashes a tooltip for each
of them, which is noise rather than help. Focus opens with no delay: a
keyboard reader arriving on a control has already committed to it. */
  delay?: HelixBaseTooltip["delay"];
  /** How long the bubble stays after the pointer leaves, in milliseconds. */
  "delay-out"?: HelixBaseTooltip["delayOut"];
  /** How long the bubble stays after the pointer leaves, in milliseconds. */
  delayOut?: HelixBaseTooltip["delayOut"];
  /** Whether the element is open.

One property, not two. Reading gives the real state whichever mode the
element is in, so `dialog.open` answers the question anyone asking it
meant. Writing hands ownership to the consumer, which is what the
attribute in `<helix-dialog open>` does as well: from then on the element
announces changes and applies none of them.

It reads as an accessor pair rather than a field because those are two
different questions sharing one name, and the alternative was a second
property answering the first. That worked for a boolean, where `isOpen`
reads well; there is no such word for a value or an active item, so all
four of these mixins now have this shape instead of two shapes.

**Not reflected, and that is required rather than tidy.** Reflection
writes the resolved state back as an attribute, and writing the attribute
is how a consumer says they own it. So an uncontrolled element that
opened itself would put `open` on its own host and, from the next thing
that read it, be indistinguishable from one the consumer controls:
cloned, serialised for hydration, or diffed by a framework, it would come
back controlled and stop responding. `data-open` carries the resolved
state for stylesheets, which is what it has always been for. */
  open?: HelixBaseTooltip["open"];
  /** Initial open state for uncontrolled use, where nothing declared one. */
  "default-open"?: HelixBaseTooltip["defaultOpen"];
  /** Initial open state for uncontrolled use, where nothing declared one. */
  defaultOpen?: HelixBaseTooltip["defaultOpen"];
  /** The consumer's callback, invoked after the state is applied.

Not an attribute: it is a function. And not reachable from React's JSX,
which reserves every `on[A-Z]` prop for its own event system and drops
what it does not recognize; the generated wrapper listens for the events
instead. */
  onOpenChange?: HelixBaseTooltip["onOpenChange"];

  /** Fired before the bubble shows, and cancelable. */
  "onhelix-open"?: (e: HelixBaseTooltipHelixOpenElementEvent) => void;
  /** Fired before it hides, and cancelable. */
  "onhelix-close"?: (e: HelixBaseTooltipHelixCloseElementEvent) => void;
};

export type HelixBaseTooltipSolidJsProps = {
  /** The text shown in the bubble.

The common case, and the fallback for the `content` slot: slot something
there and it replaces this. Both cannot show at once, which is the point
of using fallback content rather than rendering whichever is present. */
  "prop:content"?: HelixBaseTooltip["content"];
  /** Preferred side. It moves if that side does not fit. */
  "prop:placement"?: HelixBaseTooltip["placement"];
  /** Space between the trigger and the bubble, in pixels.

Eight, which is not arbitrary: it is the size of the arrow the styled tier
draws, so the point reaches the trigger and the bubble does not. A consumer
changing this and keeping the arrow gets a point that falls short or one
that overlaps what it is pointing at, which is worth knowing before
changing it rather than after. */
  "prop:offset"?: HelixBaseTooltip["offset"];
  /** Whether the tooltip never shows. */
  "prop:disabled"?: HelixBaseTooltip["disabled"];
  /** How long the pointer must rest before the bubble appears, in milliseconds.

Without one, sweeping across a row of controls flashes a tooltip for each
of them, which is noise rather than help. Focus opens with no delay: a
keyboard reader arriving on a control has already committed to it. */
  "prop:delay"?: HelixBaseTooltip["delay"];
  /** How long the bubble stays after the pointer leaves, in milliseconds. */
  "attr:delay-out"?: HelixBaseTooltip["delayOut"];
  /** How long the bubble stays after the pointer leaves, in milliseconds. */
  "prop:delayOut"?: HelixBaseTooltip["delayOut"];
  /** Whether the element is open.

One property, not two. Reading gives the real state whichever mode the
element is in, so `dialog.open` answers the question anyone asking it
meant. Writing hands ownership to the consumer, which is what the
attribute in `<helix-dialog open>` does as well: from then on the element
announces changes and applies none of them.

It reads as an accessor pair rather than a field because those are two
different questions sharing one name, and the alternative was a second
property answering the first. That worked for a boolean, where `isOpen`
reads well; there is no such word for a value or an active item, so all
four of these mixins now have this shape instead of two shapes.

**Not reflected, and that is required rather than tidy.** Reflection
writes the resolved state back as an attribute, and writing the attribute
is how a consumer says they own it. So an uncontrolled element that
opened itself would put `open` on its own host and, from the next thing
that read it, be indistinguishable from one the consumer controls:
cloned, serialised for hydration, or diffed by a framework, it would come
back controlled and stop responding. `data-open` carries the resolved
state for stylesheets, which is what it has always been for. */
  "prop:open"?: HelixBaseTooltip["open"];
  /** Initial open state for uncontrolled use, where nothing declared one. */
  "bool:default-open"?: HelixBaseTooltip["defaultOpen"];
  /** Initial open state for uncontrolled use, where nothing declared one. */
  "prop:defaultOpen"?: HelixBaseTooltip["defaultOpen"];
  /** The consumer's callback, invoked after the state is applied.

Not an attribute: it is a function. And not reachable from React's JSX,
which reserves every `on[A-Z]` prop for its own event system and drops
what it does not recognize; the generated wrapper listens for the events
instead. */
  "prop:onOpenChange"?: HelixBaseTooltip["onOpenChange"];
  /** Fired before the bubble shows, and cancelable. */
  "on:helix-open"?: (e: HelixBaseTooltipHelixOpenElementEvent) => void;
  /** Fired before it hides, and cancelable. */
  "on:helix-close"?: (e: HelixBaseTooltipHelixCloseElementEvent) => void;

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
/** `helix-select` event type */
export type HelixBaseTreeItemHelixSelectElementEvent =
  HelixBaseTreeItemElementEvent<HelixSelectEvent>;
/** `helix-open` event type */
export type HelixBaseTreeItemHelixOpenElementEvent =
  HelixBaseTreeItemElementEvent<HelixOpenEvent>;
/** `helix-close` event type */
export type HelixBaseTreeItemHelixCloseElementEvent =
  HelixBaseTreeItemElementEvent<HelixCloseEvent>;

export type HelixBaseTreeItemProps = {
  /** Identifies the item to the consumer, carried in `helix-select`. */
  value?: HelixBaseTreeItem["value"];
  /** Whether this item is the current one.

Not reflected, for the reason `level` below gives in full: the tree assigns
this after it upgrades, so the attribute would be a change to markup the
consumer rendered and hydration would report it. It reflected, one line
from the paragraph saying why it must not.

The stylesheet reads it from the row inside this shadow root, which is the
answer `level` gives one paragraph down: the indent it drives is written
onto the row rather than onto the host, because the row is not part of the
tree React hydrates. Mirroring to `data-selected` on the host instead was
the same fault with a different name, and React said so. */
  selected?: HelixBaseTreeItem["selected"];
  /** Depth from the root, set by the tree so indentation needs no CSS nesting.

Not reflected. The tree assigns this after it upgrades, so an attribute
here would be a change to markup the consumer rendered and hydration would
report it. The indent it drives is written onto the row instead, inside the
shadow root, which is not part of the tree React hydrates. */
  level?: HelixBaseTreeItem["level"];
  /** Whether the element is open.

One property, not two. Reading gives the real state whichever mode the
element is in, so `dialog.open` answers the question anyone asking it
meant. Writing hands ownership to the consumer, which is what the
attribute in `<helix-dialog open>` does as well: from then on the element
announces changes and applies none of them.

It reads as an accessor pair rather than a field because those are two
different questions sharing one name, and the alternative was a second
property answering the first. That worked for a boolean, where `isOpen`
reads well; there is no such word for a value or an active item, so all
four of these mixins now have this shape instead of two shapes.

**Not reflected, and that is required rather than tidy.** Reflection
writes the resolved state back as an attribute, and writing the attribute
is how a consumer says they own it. So an uncontrolled element that
opened itself would put `open` on its own host and, from the next thing
that read it, be indistinguishable from one the consumer controls:
cloned, serialised for hydration, or diffed by a framework, it would come
back controlled and stop responding. `data-open` carries the resolved
state for stylesheets, which is what it has always been for. */
  open?: HelixBaseTreeItem["open"];
  /** Initial open state for uncontrolled use, where nothing declared one. */
  "default-open"?: HelixBaseTreeItem["defaultOpen"];
  /** Initial open state for uncontrolled use, where nothing declared one. */
  defaultOpen?: HelixBaseTreeItem["defaultOpen"];
  /** Whether this item holds the tree's single tab stop. */
  focusable?: HelixBaseTreeItem["focusable"];
  /** The consumer's callback, invoked after the state is applied.

Not an attribute: it is a function. And not reachable from React's JSX,
which reserves every `on[A-Z]` prop for its own event system and drops
what it does not recognize; the generated wrapper listens for the events
instead. */
  onOpenChange?: HelixBaseTreeItem["onOpenChange"];

  /** Fired when the item is chosen. */
  "onhelix-select"?: (e: HelixBaseTreeItemHelixSelectElementEvent) => void;
  /** Fired before a branch opens, and cancelable. */
  "onhelix-open"?: (e: HelixBaseTreeItemHelixOpenElementEvent) => void;
  /** Fired before a branch closes, and cancelable. */
  "onhelix-close"?: (e: HelixBaseTreeItemHelixCloseElementEvent) => void;
};

export type HelixBaseTreeItemSolidJsProps = {
  /** Identifies the item to the consumer, carried in `helix-select`. */
  "prop:value"?: HelixBaseTreeItem["value"];
  /** Whether this item is the current one.

Not reflected, for the reason `level` below gives in full: the tree assigns
this after it upgrades, so the attribute would be a change to markup the
consumer rendered and hydration would report it. It reflected, one line
from the paragraph saying why it must not.

The stylesheet reads it from the row inside this shadow root, which is the
answer `level` gives one paragraph down: the indent it drives is written
onto the row rather than onto the host, because the row is not part of the
tree React hydrates. Mirroring to `data-selected` on the host instead was
the same fault with a different name, and React said so. */
  "prop:selected"?: HelixBaseTreeItem["selected"];
  /** Depth from the root, set by the tree so indentation needs no CSS nesting.

Not reflected. The tree assigns this after it upgrades, so an attribute
here would be a change to markup the consumer rendered and hydration would
report it. The indent it drives is written onto the row instead, inside the
shadow root, which is not part of the tree React hydrates. */
  "prop:level"?: HelixBaseTreeItem["level"];
  /** Whether the element is open.

One property, not two. Reading gives the real state whichever mode the
element is in, so `dialog.open` answers the question anyone asking it
meant. Writing hands ownership to the consumer, which is what the
attribute in `<helix-dialog open>` does as well: from then on the element
announces changes and applies none of them.

It reads as an accessor pair rather than a field because those are two
different questions sharing one name, and the alternative was a second
property answering the first. That worked for a boolean, where `isOpen`
reads well; there is no such word for a value or an active item, so all
four of these mixins now have this shape instead of two shapes.

**Not reflected, and that is required rather than tidy.** Reflection
writes the resolved state back as an attribute, and writing the attribute
is how a consumer says they own it. So an uncontrolled element that
opened itself would put `open` on its own host and, from the next thing
that read it, be indistinguishable from one the consumer controls:
cloned, serialised for hydration, or diffed by a framework, it would come
back controlled and stop responding. `data-open` carries the resolved
state for stylesheets, which is what it has always been for. */
  "prop:open"?: HelixBaseTreeItem["open"];
  /** Initial open state for uncontrolled use, where nothing declared one. */
  "bool:default-open"?: HelixBaseTreeItem["defaultOpen"];
  /** Initial open state for uncontrolled use, where nothing declared one. */
  "prop:defaultOpen"?: HelixBaseTreeItem["defaultOpen"];
  /** Whether this item holds the tree's single tab stop. */
  "prop:focusable"?: HelixBaseTreeItem["focusable"];
  /** The consumer's callback, invoked after the state is applied.

Not an attribute: it is a function. And not reachable from React's JSX,
which reserves every `on[A-Z]` prop for its own event system and drops
what it does not recognize; the generated wrapper listens for the events
instead. */
  "prop:onOpenChange"?: HelixBaseTreeItem["onOpenChange"];
  /** Fired when the item is chosen. */
  "on:helix-select"?: (e: HelixBaseTreeItemHelixSelectElementEvent) => void;
  /** Fired before a branch opens, and cancelable. */
  "on:helix-open"?: (e: HelixBaseTreeItemHelixOpenElementEvent) => void;
  /** Fired before a branch closes, and cancelable. */
  "on:helix-close"?: (e: HelixBaseTreeItemHelixCloseElementEvent) => void;

  /** Set the innerHTML of the element */
  innerHTML?: string;
  /** Set the textContent of the element */
  textContent?: string | number;
};

/** `HelixBaseTree` component event */
export type HelixBaseTreeElementEvent<E = Event> = TypedEvent<HelixBaseTree, E>;
/** `helix-change` event type */
export type HelixBaseTreeHelixChangeElementEvent =
  HelixBaseTreeElementEvent<HelixChangeEvent>;
/** `helix-select` event type */
export type HelixBaseTreeHelixSelectElementEvent =
  HelixBaseTreeElementEvent<HelixSelectEvent>;

export type HelixBaseTreeProps = {
  /** Which end of a row the chevron sits at.

Unset is the start, which is what a tree of folders looks like. `end` puts
it at the far side, where it reads as a control belonging to the row rather
than as part of the name, and it lets every label start at one place
without a row that has no chevron reserving space for one.

On the tree rather than on each item, because a row whose chevron sat
somewhere different from its siblings' would be a mistake, not a choice. */
  chevron?: HelixBaseTree["chevron"];
  /** Accessible name for the tree. */
  label?: HelixBaseTree["label"];
  /** Which item is current, by its `value`.

Called `active`, which is what this mixin is named for and what it was
not: it declared `value`, so the one mixin whose whole subject is which
item is active had no such property, and `active` meant something else
entirely elsewhere in the library. It still does, and only there now:
`option.active` is the option the keyboard is on, which is a different
question from which one is chosen.

An accessor pair, the same shape as the other three. Reading gives the
real item; writing hands ownership to the consumer, so `<helix-tabs
active="one">` is a set that stays on that tab and `default-active` is
how markup says where to start. */
  active?: HelixBaseTree["active"];
  /** Initial item for uncontrolled use. Ignored once `active` is written. */
  "default-active"?: HelixBaseTree["defaultActive"];
  /** Initial item for uncontrolled use. Ignored once `active` is written. */
  defaultActive?: HelixBaseTree["defaultActive"];
  /** The consumer's callback, invoked after the change is applied. */
  onActiveChange?: HelixBaseTree["onActiveChange"];

  /** Fired before the current node moves, and cancelable. The only way to refuse one. */
  "onhelix-change"?: (e: HelixBaseTreeHelixChangeElementEvent) => void;
  /** Fired when an item is chosen. Dispatched by the item and listened for here, because the tree is what a consumer holds a reference to. */
  "onhelix-select"?: (e: HelixBaseTreeHelixSelectElementEvent) => void;
};

export type HelixBaseTreeSolidJsProps = {
  /** Which end of a row the chevron sits at.

Unset is the start, which is what a tree of folders looks like. `end` puts
it at the far side, where it reads as a control belonging to the row rather
than as part of the name, and it lets every label start at one place
without a row that has no chevron reserving space for one.

On the tree rather than on each item, because a row whose chevron sat
somewhere different from its siblings' would be a mistake, not a choice. */
  "prop:chevron"?: HelixBaseTree["chevron"];
  /** Accessible name for the tree. */
  "prop:label"?: HelixBaseTree["label"];
  /** Which item is current, by its `value`.

Called `active`, which is what this mixin is named for and what it was
not: it declared `value`, so the one mixin whose whole subject is which
item is active had no such property, and `active` meant something else
entirely elsewhere in the library. It still does, and only there now:
`option.active` is the option the keyboard is on, which is a different
question from which one is chosen.

An accessor pair, the same shape as the other three. Reading gives the
real item; writing hands ownership to the consumer, so `<helix-tabs
active="one">` is a set that stays on that tab and `default-active` is
how markup says where to start. */
  "prop:active"?: HelixBaseTree["active"];
  /** Initial item for uncontrolled use. Ignored once `active` is written. */
  "attr:default-active"?: HelixBaseTree["defaultActive"];
  /** Initial item for uncontrolled use. Ignored once `active` is written. */
  "prop:defaultActive"?: HelixBaseTree["defaultActive"];
  /** The consumer's callback, invoked after the change is applied. */
  "prop:onActiveChange"?: HelixBaseTree["onActiveChange"];
  /** Fired before the current node moves, and cancelable. The only way to refuse one. */
  "on:helix-change"?: (e: HelixBaseTreeHelixChangeElementEvent) => void;
  /** Fired when an item is chosen. Dispatched by the item and listened for here, because the tree is what a consumer holds a reference to. */
  "on:helix-select"?: (e: HelixBaseTreeHelixSelectElementEvent) => void;

  /** Set the innerHTML of the element */
  innerHTML?: string;
  /** Set the textContent of the element */
  textContent?: string | number;
};

export type CustomElements = {
  /**
   * Carries its own open state, which is why it is an element rather than a slot.
   * Used alone, outside an accordion, it is a disclosure.
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
   * - `open`: Whether the element is open.
   *
   * One property, not two. Reading gives the real state whichever mode the
   * element is in, so `dialog.open` answers the question anyone asking it
   * meant. Writing hands ownership to the consumer, which is what the
   * attribute in `<helix-dialog open>` does as well: from then on the element
   * announces changes and applies none of them.
   *
   * It reads as an accessor pair rather than a field because those are two
   * different questions sharing one name, and the alternative was a second
   * property answering the first. That worked for a boolean, where `isOpen`
   * reads well; there is no such word for a value or an active item, so all
   * four of these mixins now have this shape instead of two shapes.
   *
   * **Not reflected, and that is required rather than tidy.** Reflection
   * writes the resolved state back as an attribute, and writing the attribute
   * is how a consumer says they own it. So an uncontrolled element that
   * opened itself would put `open` on its own host and, from the next thing
   * that read it, be indistinguishable from one the consumer controls:
   * cloned, serialised for hydration, or diffed by a framework, it would come
   * back controlled and stop responding. `data-open` carries the resolved
   * state for stylesheets, which is what it has always been for.
   * - `default-open`/`defaultOpen`: Initial open state for uncontrolled use, where nothing declared one.
   * - `onOpenChange`: The consumer's callback, invoked after the state is applied.
   *
   * Not an attribute: it is a function. And not reachable from React's JSX,
   * which reserves every `on[A-Z]` prop for its own event system and drops
   * what it does not recognize; the generated wrapper listens for the events
   * instead. (property only)
   *
   * ## Events
   *
   * Events that will be emitted by the component.
   *
   * - `helix-close`: Fired before the section closes, and cancelable.
   * - `helix-open`: Fired when the item opens or closes.
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
   * - `requestOpen(next: boolean) => boolean`: Requests an open-state change, and reports whether it was applied.
   *
   * Announces before it acts, so `preventDefault()` on the `helix-open` or
   * `helix-close` is a refusal and nothing moves. In uncontrolled mode the
   * element then updates itself; in controlled mode it applies nothing and
   * waits for the consumer to pass a new `open`, which is what "controlled"
   * means.
   * - `toggleOpen() => boolean`: Requests the opposite of the current state.
   *
   * ## CSS Parts
   *
   * Custom selectors for styling elements within the component.
   *
   * - `container`: The outer wrapper.
   * - `trigger`: The clickable summary row.
   * - `chevron`: The open and close indicator.
   * - `content`: The revealed region.
   * - `content-inner`: The clipping box inside the animated region.
   */
  "helix-base-accordion-item": Partial<
    HelixBaseAccordionItemProps & BaseProps<HelixBaseAccordionItem> & BaseEvents
  >;

  /**
   * Holds the mode and nothing else. The item that was clicked is what
   * coordinates: it walks up to the nearest accordion, reads the mode off it, and
   * closes its peers itself.
   *
   * Coordination is structural, not a subscription. `helix-open` does not bubble
   * and is not composed, because overlays nest and an inner one's lifecycle must
   * never read as the outer one's, so an accordion cannot learn that a child
   * opened by listening for it.
   *
   * Membership resolves on demand, so there is no registry to keep in step: an
   * item added a second after render coordinates on its first click.
   *
   * Items are matched with `instanceof HelixBaseAccordionItem`, never by tag
   * name. Matching `helix-accordion-item` would tie this tier to the styled one.
   *
   * Every listener is attached on connect, so none of it runs on the server,
   * where there is no tree to walk and no events to hear.
   *
   * ## Attributes & Properties
   *
   * Component attributes and properties that can be applied to the element or by using JavaScript.
   *
   * - `mode`: How many sections may be open at once.
   *
   * Absent is `multiple`, so nothing closes unexpectedly and the default costs
   * no attribute on the host. `single` keeps exactly one open and refuses to
   * close the last; `single-collapsible` keeps at most one and lets it close.
   *
   * A union rather than a mode plus a `collapsible` boolean, which would make
   * `collapsible` alongside `multiple` expressible and meaningless.
   * - `items`: Direct items, in light-DOM order. Client only: the server has no tree. (property only) (readonly)
   *
   * ## Slots
   *
   * Areas where markup can be added to the component.
   *
   * - `(default)`: The accordion's items.
   */
  "helix-base-accordion": Partial<
    HelixBaseAccordionProps & BaseProps<HelixBaseAccordion> & BaseEvents
  >;

  /**
   * Chrome rather than content. An announcement sits above the header and speaks
   * for the whole page: a trial ending, a service degraded, a change of terms. A
   * passage that interrupts a document to set itself apart is a `Callout`, which
   * is read where it sits and cannot be dismissed. Neither is a variant of the
   * other.
   *
   * **Always a polite live region.** `role="alert"` is assertive and interrupts
   * whatever is being read, which is right for something that appears mid-session
   * and wrong for something that was in the served HTML: an assertive
   * announcement would cut across a screen-reader user on every page load, before
   * they had read anything. Politeness costs a moment and is never wrong; the severity
   * does not change that, because an error that was always there is still not an
   * interruption.
   *
   * Dismissing is a request. The announcement does not remove itself, because the
   * consumer owns the markup and taking the node out from under them would put
   * their state and the document out of step. `preventDefault()` on the
   * `helix-dismiss` is a refusal.
   *
   * ## Attributes & Properties
   *
   * Component attributes and properties that can be applied to the element or by using JavaScript.
   *
   * - `severity`: What kind of attention the message needs.
   * - `dismissible`: Whether it offers a control to take it away.
   * - `dismiss-label`/`dismissLabel`: Accessible name for that control.
   *
   * `attribute` is spelled out because Lit lowercases a property name to
   * derive one rather than dash-casing it, so this would otherwise be
   * reachable only as `dismisslabel`, which nobody would guess and no linter
   * would catch.
   *
   * ## Events
   *
   * Events that will be emitted by the component.
   *
   * - `helix-dismiss`: Fired when the reader asks to close it.
   *
   * ## Slots
   *
   * Areas where markup can be added to the component.
   *
   * - `(default)`: The message.
   * - `actions`: What to do about it, usually a link or a button.
   * - `icon`: Replaces the glyph inside the dismiss control.
   *
   * ## Methods
   *
   * Methods that can be called to access component functionality.
   *
   * - `dismiss() => boolean`: Announces that it should go, and reports whether the request stood.
   *
   * ## CSS Parts
   *
   * Custom selectors for styling elements within the component.
   *
   * - `content`: The message region.
   * - `actions`: The trailing action region.
   * - `dismiss`: The control that asks to close.
   */
  "helix-base-announcement": Partial<
    HelixBaseAnnouncementProps & BaseProps<HelixBaseAnnouncement> & BaseEvents
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
   * Three regions, each in its own wrapper, because the row is a grid and a grid
   * needs three items to put the middle one in the middle. A bare slot is
   * `display: contents`, so its assigned elements become grid items themselves:
   * two actions would take two tracks and push the navigation off center. These
   * wrappers earn their boxes, which is the test; they carry no inset or fill of
   * their own, so an empty one still paints nothing.
   *
   * The host is the banner and spans the viewport; the row inside it is what gets
   * centered. A banner that is itself narrowed leaves its background stopping
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
   * Centered by default, which reads as the site's spine when the navigation is
   * the primary thing in the header rather than an afterthought beside a logo.
   * Centered against the banner rather than against whatever space the brand
   * left over, so the middle of the nav is the middle of the window whatever
   * the wordmark and the actions happen to measure.
   *
   * `start` is the opt-out, for a header whose navigation trails the brand.
   *
   * ## Slots
   *
   * Areas where markup can be added to the component.
   *
   * - `start`: Leading content, usually a wordmark.
   * - `(default)`: The middle region, usually a `Navigation`.
   * - `end`: Trailing content.
   *
   * ## CSS Parts
   *
   * Custom selectors for styling elements within the component.
   *
   * - `row`: The centered row inside the banner.
   * - `start`: The leading region.
   * - `content`: The middle region.
   * - `end`: The trailing region.
   */
  "helix-base-app-header": Partial<
    HelixBaseAppHeaderProps & BaseProps<HelixBaseAppHeader> & BaseEvents
  >;

  /**
   * A part of `Avatar` rather than a family of its own: it arranges avatars and
   * is about nothing else, and its member is a complete `Avatar` the group did
   * not have to explain.
   *
   * **The overflow count is the group's, not a slot.** Which avatars are hidden
   * is a fact the group works out from `max` and how many it was given, so a
   * consumer writing the "+3" themselves would be writing a number that has to
   * agree with a list they do not control.
   *
   * **Hidden, not removed.** Past `max`, the extra avatars stay in the DOM and
   * stop being shown, so nothing re-renders when `max` changes and the accessible
   * name can still be built from all of them. The count is what a sighted reader
   * gets; the group's own name is what everyone else gets, and "Seven people" is
   * more useful than seven names read in a row.
   *
   * **It is a list.** A row of faces is a set of separate people, and a group
   * with no role announces as one run of text. `role="list"` needs its children
   * to be `listitem`, which they cannot be told to become without writing an
   * attribute onto a consumer's element, so the group carries `role="group"` and
   * its name instead: one announcement, correct, and nothing written to anyone
   * else's markup.
   *
   * ## Attributes & Properties
   *
   * Component attributes and properties that can be applied to the element or by using JavaScript.
   *
   * - `label`: Accessible name for the set, such as "Reviewers".
   * - `max`: How many avatars are shown before the rest become a count.
   *
   * Zero or less shows all of them, which is what an unset limit means and is
   * more useful than refusing to render.
   * - `avatars`: The avatars, in light-DOM order. Empty on the server, which has no tree. (property only) (readonly)
   * - `overflow`: How many avatars are past the limit, and so not shown.
   *
   * Not `hidden`, which is `HTMLElement`'s own boolean: a getter of that name
   * returning a number is a type error, and had it been assignable it would
   * have been worse, because a group with three extra members would have set
   * the attribute that hides the whole group. (property only) (readonly)
   *
   * ## Slots
   *
   * Areas where markup can be added to the component.
   *
   * - `(default)`: The avatars, in the order they should be read.
   *
   * ## CSS Parts
   *
   * Custom selectors for styling elements within the component.
   *
   * - `overflow`: The count of avatars past `max`.
   */
  "helix-base-avatar-group": Partial<
    HelixBaseAvatarGroupProps & BaseProps<HelixBaseAvatarGroup> & BaseEvents
  >;

  /**
   * Shows `src` until it fails to load. Without an image, or after a failure,
   * the default slot is shown; its own fallback is the initials.
   *
   * The host carries the accessible name, taken from `name`, so the `<img>` has an
   * empty `alt` and the initials are hidden from assistive technology. Announcing
   * either would repeat the name. An `aria-label` on the host overrides `name`,
   * for an avatar standing for something a person's name does not describe.
   *
   * `load` and `error` are relayed from the host. They are not composed, so they
   * stop at the shadow boundary otherwise.
   *
   * ## Attributes & Properties
   *
   * Component attributes and properties that can be applied to the element or by using JavaScript.
   *
   * - `src`: Image to show. Falls back to the slot, or to initials, if it fails.
   * - `name`: Name of the person or entity. Used for the label and the initials.
   *
   * ## Events
   *
   * Events that will be emitted by the component.
   *
   * - `load`: Relayed from the image once it has loaded.
   * - `error`: Relayed from the image when it fails.
   *
   * ## Slots
   *
   * Areas where markup can be added to the component.
   *
   * - `(default)`: Shown when there is no usable image, in place of the initials.
   *
   * ## CSS Parts
   *
   * Custom selectors for styling elements within the component.
   *
   * - `image`: The image, when one is loading or loaded.
   * - `initials`: The initials shown when there is no usable image.
   */
  "helix-base-avatar": Partial<
    HelixBaseAvatarProps & BaseProps<HelixBaseAvatar> & BaseEvents
  >;

  /**
   * Wraps whatever it decorates and pins the indicator to its corner, so the
   * thing being counted stays the thing in the layout: a badge is an annotation,
   * not a container that happens to hold an icon.
   *
   * The indicator says how many, and none is none. A `value` that reads as zero
   * shows no mark at all, an absent one shows a bare dot, and any other value
   * shows the value. `max` caps the top: past it the indicator reads `{max}+`
   * rather than growing to fit, since a corner mark that widens with its value
   * pushes the layout around.
   *
   * **A dot needs a label.** Without one it is a colored circle that announces
   * nothing, which tells a sighted reader there is something new and tells
   * everyone else there is not. The label is required in that form, and the
   * indicator is hidden from assistive technology when a number already says it.
   *
   * ## Attributes & Properties
   *
   * Component attributes and properties that can be applied to the element or by using JavaScript.
   *
   * - `value`: The count or short text to show. Absent shows a dot, zero shows nothing.
   * - `max`: Cap for a numeric value. Past it the indicator reads `{max}+`.
   * - `label`: Accessible name. Required for a dot, which has no text to read.
   *
   * ## Slots
   *
   * Areas where markup can be added to the component.
   *
   * - `(default)`: The element being decorated.
   *
   * ## CSS Parts
   *
   * Custom selectors for styling elements within the component.
   *
   * - `indicator`: The count, or the dot when there is no value.
   */
  "helix-base-badge": Partial<
    HelixBaseBadgeProps & BaseProps<HelixBaseBadge> & BaseEvents
  >;

  /**
   * Renders a real `<blockquote>` with a `<footer>` for the attribution, which is
   * the structure the HTML spec describes for exactly this: the attribution is
   * about the quotation rather than part of it, and putting it inside the quoted
   * text claims the source said their own name.
   *
   * A quotation run inside a sentence is a `Quote`, which is a different element
   * because it is a different job.
   *
   * ## Attributes & Properties
   *
   * Component attributes and properties that can be applied to the element or by using JavaScript.
   *
   * - `cite`: URL identifying where the passage came from.
   *
   * ## Slots
   *
   * Areas where markup can be added to the component.
   *
   * - `(default)`: The quoted passage.
   * - `attribution`: Who said it, and where.
   *
   * ## CSS Parts
   *
   * Custom selectors for styling elements within the component.
   *
   * - `blockquote`: The quotation.
   * - `attribution`: The footer carrying the source.
   */
  "helix-base-blockquote": Partial<
    HelixBaseBlockquoteProps & BaseProps<HelixBaseBlockquote> & BaseEvents
  >;

  /**
   * Contributes the separator and the list-item role. The link is the consumer's
   * own, slotted in, because an anchor rendered into this element's shadow root
   * is unreachable to the framework that owns the route: a router renders its own
   * `<a>`, and one written here would be a full page load instead.
   *
   * Each item renders its own separator and hides it with `:host(:first-child)`,
   * so the trail needs no index and no coordination from the parent. `:host()`
   * takes a structural pseudo-class, unlike `:has()`, which it rejects.
   *
   * The current page is text, not a link. Linking a page to itself is a known
   * screen-reader annoyance, and `aria-current="page"` on the host is what
   * conveys position.
   *
   * ## Attributes & Properties
   *
   * Component attributes and properties that can be applied to the element or by using JavaScript.
   *
   * - `current`: Whether this item is the page the reader is on.
   *
   * ## Slots
   *
   * Areas where markup can be added to the component.
   *
   * - `(default)`: The step: a link, or the text of the current page. A link is styled with `data-link="quiet"`, since a slotted anchor belongs to the outer tree and cannot be reached from this component's styles.
   * - `separator`: Replaces the chevron shown before this item.
   *
   * ## CSS Parts
   *
   * Custom selectors for styling elements within the component.
   *
   * - `separator`: The separator preceding the item.
   */
  "helix-base-breadcrumb": Partial<
    HelixBaseBreadcrumbProps & BaseProps<HelixBaseBreadcrumb> & BaseEvents
  >;

  /**
   * The host is the landmark, so `aria-label` on it names the trail directly and
   * there is no property mirroring one. A page may hold more than one navigation,
   * and landmarks are how a screen-reader user chooses between them.
   *
   * `role="list"` is set explicitly on the `<ol>` even though it is already a
   * list: removing the markers with `list-style: none` strips list semantics in
   * Safari, and a breadcrumb trail always removes its markers.
   *
   * Items are slotted rather than wrapped, so they are `<ol>` children in the flat
   * tree and each carries `role="listitem"` itself.
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
   * - `list`: The ordered list.
   */
  "helix-base-breadcrumbs": Partial<
    HelixBaseBreadcrumbsProps & BaseProps<HelixBaseBreadcrumbs> & BaseEvents
  >;

  /**
   * The host is the group, so `role="group"` sits on it through internals and
   * `label` names it. A group of buttons with no name is announced as a run of
   * separate controls, which is what the grouping exists to say it is not.
   *
   * It manages no focus. A group is not a toolbar: the APG toolbar pattern asks
   * for one tab stop with arrow keys inside it, and that is what Toolbar is for.
   * Here every button keeps its own tab stop, which is what a reader expects from
   * buttons sitting side by side.
   *
   * Buttons are slotted rather than wrapped, so they stay the consumer's own
   * elements and keep whatever appearance and size they were given.
   *
   * ## Attributes & Properties
   *
   * Component attributes and properties that can be applied to the element or by using JavaScript.
   *
   * - `label`: Accessible name for the group.
   *
   * On the host through internals, so an author's `aria-label` still overrides
   * it and nothing lands on the host that a consumer's markup did not have.
   *
   * ## Slots
   *
   * Areas where markup can be added to the component.
   *
   * - `(default)`: The buttons in the group.
   */
  "helix-base-button-group": Partial<
    HelixBaseButtonGroupProps & BaseProps<HelixBaseButtonGroup> & BaseEvents
  >;

  /**
   * Renders a real `<button>`, so activation, focus, and the browser's own
   * affordances come from the platform rather than from key handlers.
   *
   * **It never renders an anchor.** A router has to render its own `<a>` to
   * intercept a click and cannot render one inside this shadow root, so a button
   * that could also be a link forced every such navigation to be a full page
   * load. A link that looks like a button is styling rather than behavior, so it
   * is a recipe in the base layer: `<Link data-button="primary">` is the same
   * control, and the consumer keeps their anchor.
   *
   * `delegatesFocus` puts focus on the inner control, and it serializes into the
   * server's markup, so the button is keyboard reachable before any JavaScript
   * loads.
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
   * - `label`: Accessible name, for a button whose content is not text.
   *
   * Lives here rather than only on `IconButton` so the two share one render.
   * An icon-only button without it is a control a screen reader announces as
   * "button" and nothing else.
   * - `command`: What to send when the button is activated, and what to send it to.
   *
   * The platform's invoker attributes, forwarded onto the inner `<button>`
   * rather than left on the host: only a real button is recognized as an
   * invoker, so `commandfor` written on a custom element resolves nothing and
   * the trigger silently does nothing at all. A wrapper has to hand them down,
   * the same way `label` becomes `aria-label` in there.
   *
   * ```html
   * <helix-button commandfor="confirm" command="--show">Delete…</helix-button>
   * ```
   *
   * `commandFor` spells its attribute out, because Lit lowercases a property
   * name to derive one rather than dash-casing it, and what a consumer writes
   * is the platform's `commandfor`.
   * - `commandfor`/`commandFor`: The id of the element the command is sent to.
   * - `disabled`: Whether the control is non-interactive.
   *
   * Reflected, because the styled tier selects on it, and mirrored to
   * `aria-disabled` rather than removing the element from the accessibility
   * tree, so a screen reader can still announce that the control exists.
   * - `name`: Name submitted with the form.
   *
   * **Reflected, and it is the exception to "reflect only what CSS selects
   * on".** The platform builds a form's entry list from the `name` *content
   * attribute*, not from the property, so a control named through the property
   * submitted under no name at all and was silently dropped. Measured: two
   * inputs in one form, one named by attribute and one by property, and the
   * form carried a single entry.
   *
   * Safe for a React consumer, which is what the rule is protecting: React
   * renders a custom element's props as attributes on the server, so the name
   * is already in the markup being hydrated and reflecting it writes what is
   * there. It is only a change to the markup when a consumer assigns it
   * imperatively later, and nothing is hydrating by then.
   *
   * Here rather than on each control, where it was declared eight times and
   * reflected none of them.
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
   * - `isDisabled`: Whether the control is off, by its own attribute or by an ancestor.
   *
   * What a component should bind to rather than `disabled`, which is only the
   * half of it the consumer wrote. (property only) (readonly)
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
   * ## Methods
   *
   * Methods that can be called to access component functionality.
   *
   * - `formDisabledCallback(disabled: boolean) => void`: The platform's notice that an ancestor fieldset changed.
   *
   * ## CSS Parts
   *
   * Custom selectors for styling elements within the component.
   *
   * - `button`: The inner control.
   */
  "helix-base-button": Partial<
    HelixBaseButtonProps & BaseProps<HelixBaseButton> & BaseEvents
  >;

  /**
   * A grid of days, per the APG date grid: the whole grid is one tab stop, arrows
   * move by day and week, `PageUp` and `PageDown` move by month, and `Home` and
   * `End` go to the ends of the week. Only the focused cell is in the tab
   * sequence.
   *
   * Roving `tabindex` is written on the cells, which is free here because they
   * are rendered into this shadow root rather than being markup a consumer wrote.
   *
   * Dates are `YYYY-MM-DD` strings and every calculation is in UTC. A local-time
   * `Date` shifts across a timezone or a daylight-saving boundary, so the string
   * is what the component holds and the arithmetic never leaves UTC.
   *
   * `month` is what the grid shows, separately from `value`, so paging through
   * months does not select anything and a consumer can drive the view. Left
   * unset, it follows the first selected date, and then the current month.
   *
   * `mode` decides how many dates are held. Absent takes one. `range` takes two
   * and marks everything between them, starting over on the third click rather
   * than replacing an end at random. `multiple` toggles, so clicking a chosen
   * date takes it out. All three read and write the same comma-separated
   * `value`.
   *
   * `locale` is worth setting where the output is compared across environments.
   * Left unset, month and day names come from the runtime's own locale, and a
   * server and a browser need not agree on what that is.
   *
   * ## Attributes & Properties
   *
   * Component attributes and properties that can be applied to the element or by using JavaScript.
   *
   * - `mode`: How many dates can be held at once.
   * - `months`: How many months to show, side by side.
   * - `locale`: Locale for month and day names. Absent uses the runtime's own.
   * - `disable-dates`/`disableDates`: Dates that cannot be chosen, comma separated, as `YYYY-MM-DD`.
   * - `disable-days`/`disableDays`: Days of the week that cannot be chosen, comma separated, `0` to `6`.
   * - `invalid`: Whether the current selection fails validation.
   * - `month`: The month on show, as `YYYY-MM`. Follows `value`, then the current month.
   *
   * Separate from `value` on purpose, so paging selects nothing and a consumer
   * can drive the view. It said that and could not do it: the calendar wrote
   * this when the reader paged, so a consumer holding it was overwritten and
   * never told. Reading gives the month on show; writing declares it theirs,
   * and `default-month` seeds one the calendar owns.
   * - `previous-label`/`previousLabel`: Accessible name for the control that pages back.
   *
   * A property because this is the one component in the library that takes a
   * `locale`, and it carried two hardcoded English names with no way to change
   * them: a calendar rendering its own month names in Japanese still announced
   * its controls in English. `attribute:` spelled out, since Lit lowercases a
   * camelCase name rather than dash-casing it.
   * - `next-label`/`nextLabel`: Accessible name for the control that pages forward.
   * - `default-month`/`defaultMonth`: Month to open on, where nothing declared one.
   * - `min`: Earliest selectable date, as `YYYY-MM-DD`.
   * - `max`: Latest selectable date, as `YYYY-MM-DD`.
   * - `label`: Accessible name for the grid.
   * - `first-day-of-week`/`firstDayOfWeek`: First column of the week, `0` for Sunday through `6` for Saturday.
   * - `default-value`/`defaultValue`: The value the markup declared, which is where a reset returns to.
   * - `value`: What the control holds now, and what its form submits.
   *
   * One property, not two. Reading gives the real value whichever mode the
   * control is in, so `input.value` answers the question anyone asking it
   * meant. Writing hands ownership to the consumer, which is what
   * `<helix-input value="x">` says too, and matches what a controlled input
   * means in React: the value is theirs and the control waits to be told.
   * `default-value` is how markup seeds one it does not want to own.
   *
   * The same shape as the other three mixins, which is the point of them
   * being four of a kind rather than four of three kinds.
   * - `disabled`: Whether the control is non-interactive.
   *
   * Reflected, because the styled tier selects on it, and mirrored to
   * `aria-disabled` rather than removing the element from the accessibility
   * tree, so a screen reader can still announce that the control exists.
   * - `name`: Name submitted with the form.
   *
   * **Reflected, and it is the exception to "reflect only what CSS selects
   * on".** The platform builds a form's entry list from the `name` *content
   * attribute*, not from the property, so a control named through the property
   * submitted under no name at all and was silently dropped. Measured: two
   * inputs in one form, one named by attribute and one by property, and the
   * form carried a single entry.
   *
   * Safe for a React consumer, which is what the rule is protecting: React
   * renders a custom element's props as attributes on the server, so the name
   * is already in the markup being hydrated and reflecting it writes what is
   * there. It is only a change to the markup when a consumer assigns it
   * imperatively later, and nothing is hydrating by then.
   *
   * Here rather than on each control, where it was declared eight times and
   * reflected none of them.
   * - `onValueChange`: The consumer's callback, invoked after the value is applied.
   *
   * Not an attribute: it is a function. `onValueChange` and not `onChange`,
   * because React reserves the latter for its own synthetic system and wires
   * it to the native `change`, so a Helix event named `Change` would never
   * fire at all. (property only)
   * - `isDisabled`: Whether the control is off, by its own attribute or by an ancestor.
   *
   * What a component should bind to rather than `disabled`, which is only the
   * half of it the consumer wrote. (property only) (readonly)
   * - `form`: The form this control belongs to, if any. (property only) (readonly)
   * - `labels`: Labels associated with this control. (property only) (readonly)
   *
   * ## Events
   *
   * Events that will be emitted by the component.
   *
   * - `helix-change`: Fired before the dates change, and cancelable.
   * - `helix-navigate`: Fired before the month on show changes, and cancelable.
   *
   * ## Methods
   *
   * Methods that can be called to access component functionality.
   *
   * - `requestValue(next: string) => boolean`: Requests a new value, and reports whether the request stood.
   *
   * Announces before it acts, so `preventDefault()` on the `helix-change` is
   * a refusal and nothing moves. In uncontrolled mode the control then
   * updates itself; in controlled mode it applies nothing and waits for the
   * consumer to pass a new `value`, which is what controlled means.
   * - `formResetCallback() => void`: Returns the control to the value its markup declared.
   *
   * Both halves are dropped, the consumer's and the control's, because a
   * reset means the form is as it was served. Clearing only the internal one
   * would leave a control that had been written to stuck at that value.
   * - `formStateRestoreCallback(state: string | null) => void`: Restores the value when the browser brings a form back.
   *
   * Falling back to `defaultValue` rather than to empty, because a restore
   * with no state is a form the browser has nothing recorded for, which is
   * the same situation as a fresh one.
   * - `formDisabledCallback(disabled: boolean) => void`: The platform's notice that an ancestor fieldset changed.
   *
   * ## CSS Parts
   *
   * Custom selectors for styling elements within the component.
   *
   * - `months`: The run of months.
   * - `month`: One month, its header and its grid.
   * - `header`: The month name and its controls.
   * - `previous`: The control that moves to the previous month.
   * - `next`: The control that moves to the next month.
   * - `heading`: The month and year being shown.
   * - `grid`: The grid of days.
   * - `weekday`: A column header naming a day of the week.
   * - `week`: One row of days.
   * - `cell`: One column of a row, which is what a range paints.
   * - `day`: The shape inside a cell, which is what a single date paints.
   */
  "helix-base-calendar": Partial<
    HelixBaseCalendarProps & BaseProps<HelixBaseCalendar> & BaseEvents
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
   * Not an `Announcement`, which is the other thing this could be mistaken for.
   * A callout interrupts a document to set a passage apart and is read where it
   * sits; an announcement is page-level chrome above the masthead, announces
   * itself as a live region, and can be dismissed. Neither is a variant of the
   * other.
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
   * - `title`: A heading above the content.
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
   * The track is a scroller with scroll snapping, so a drag, a trackpad swipe,
   * and the browser's own momentum all work without being reimplemented. The
   * controls scroll it; they do not drive a transform.
   *
   * Slides are the consumer's own elements. Each is given
   * `aria-roledescription="slide"` and a name reading its position in the set,
   * which is what a screen-reader user needs to know where they are. Where a
   * slide carries its own `aria-label`, that one is left alone.
   *
   * **Rotation stops on focus and on hover, and once stopped it stays stopped.**
   * The APG is explicit: rotation must not resume unless the reader asks for it,
   * so hovering away does not start it again. The control names the action it
   * performs, and it is first in the tab order.
   *
   * ## Attributes & Properties
   *
   * Component attributes and properties that can be applied to the element or by using JavaScript.
   *
   * - `label`: Accessible name for the carousel.
   * - `index`: The slide in view, counted from zero.
   *
   * Reading gives the real slide, in either mode. Writing sets it, the way a
   * script assigning to a native control does. Which mode the carousel is in is
   * read once, at the first update, from whether anything had declared an
   * `index` by then: declared, and the consumer owns it and the carousel only
   * announces where it would have gone; not declared, and the carousel owns it
   * and `default-index` says where it starts.
   *
   * The same contract the four mixins carry, written out here rather than
   * extracted, because a slide is addressed by position and every one of those
   * mixins is keyed by a name. One consumer is not a mixin: if a second numeric
   * state turns up, this is what it is extracted from.
   * - `default-index`/`defaultIndex`: Slide to start on, where nothing declared one.
   * - `loop`: Whether moving past either end wraps to the other.
   * - `autoplay`: Whether the carousel advances on its own.
   * - `interval`: How long each slide is held, in milliseconds.
   * - `slides`: The slides, in light-DOM order. Empty on the server, which has no tree. (property only) (readonly)
   *
   * ## Events
   *
   * Events that will be emitted by the component.
   *
   * - `helix-select`: Fired when the slide in view changes, with its index.
   *
   * ## Slots
   *
   * Areas where markup can be added to the component.
   *
   * - `(default)`: The slides.
   *
   * ## Methods
   *
   * Methods that can be called to access component functionality.
   *
   * - `goTo(index: number) => void`: Moves to a slide, wrapping only where `loop` says to.
   *
   * ## CSS Parts
   *
   * Custom selectors for styling elements within the component.
   *
   * - `controls`: The row of controls.
   * - `rotation`: The control that stops and starts rotation.
   * - `previous`: The control that moves to the previous slide.
   * - `next`: The control that moves to the next slide.
   * - `track`: The scroller the slides sit in.
   * - `indicators`: The row of controls saying where the reader is.
   * - `indicator`: One of them, and a way to reach that slide.
   */
  "helix-base-carousel": Partial<
    HelixBaseCarouselProps & BaseProps<HelixBaseCarousel> & BaseEvents
  >;

  /**
   * The host is the group, so `role="group"` sits on it through internals and
   * `label` names it. A run of checkboxes with no name is announced as separate
   * controls, which is what the grouping exists to say it is not.
   *
   * **Each checkbox still submits itself.** They are form-associated already and
   * a native group is several inputs sharing a name, so this adds no form value
   * of its own: it would submit the same answers twice. What it adds is the
   * grouping, a shared `name` so it is written once, and one place to read and
   * write the whole set.
   *
   * `value` is the checked values, comma separated, in the order the boxes are
   * written. Setting it ticks exactly those and unticks the rest.
   *
   * ## Attributes & Properties
   *
   * Component attributes and properties that can be applied to the element or by using JavaScript.
   *
   * - `disabled`: Whether the whole set is out of play.
   *
   * Its own property rather than an inherited one, because this group is not
   * form-associated and `disabled` arrives with `HelixFormElement`. The boxes
   * are each form-associated and have their own, which is exactly why the two
   * have to be reconciled rather than simply written over.
   * - `name`: Name submitted with the form, given to every box that has none.
   * - `value`: The checked values, comma separated.
   * - `hint`: Help under the control, shown while there is nothing wrong.
   * - `feedback`: What is wrong, in the reader's words rather than the browser's.
   * - `label`: The accessible name, and the fallback for the `label` slot.
   * - `required`: Whether the form refuses to submit without it.
   * - `boxes`: The boxes, in light-DOM order. Client only: the server has no tree. (property only) (readonly)
   * - `resolvedFeedback`: The message actually shown: the consumer's, or the platform's, or none. (property only) (readonly)
   * - `describedBy`: Id of the description node, for `aria-describedby` on the control.
   *
   * One at a time, because only one of the two is ever rendered. Naming both
   * would point a screen reader at an id that resolves to nothing, which it
   * reads as a description it cannot find. (property only) (readonly)
   *
   * ## Events
   *
   * Events that will be emitted by the component.
   *
   * - `helix-change`: Fired when any box changes, with the whole set.
   *
   * ## Slots
   *
   * Areas where markup can be added to the component.
   *
   * - `(default)`: The checkboxes.
   * - `label`: Richer than a string, where the label is more than one.
   * - `hint`: Richer than a string.
   *
   * ## CSS Parts
   *
   * Custom selectors for styling elements within the component.
   *
   * - `label`: The group's name, over the set.
   * - `items`: The list itself, which is what `orientation` lays out.
   * - `hint`: Help under the set.
   * - `feedback`: What is wrong with it.
   */
  "helix-base-checkbox-group": Partial<
    HelixBaseCheckboxGroupProps & BaseProps<HelixBaseCheckboxGroup> & BaseEvents
  >;

  /**
   * Renders a real `<input type="checkbox">`, so the space key, the focus ring,
   * and the indeterminate glyph come from the platform. `delegatesFocus` puts
   * focus on it, and it serializes into the server's markup, so the control is
   * reachable before any script loads.
   *
   * **The input inside a shadow root submits nothing**, because the form is on
   * the other side of the boundary. The host is form-associated instead and
   * reports its own value through `ElementInternals`, which is also what carries
   * validity and what answers a form reset.
   *
   * A checked box submits its `value`, and an unchecked one submits nothing at
   * all. That is what a native checkbox does, and a form built around one reads
   * the absence rather than a `false`.
   *
   * `indeterminate` is presentation and nothing else. It is neither checked nor
   * unchecked to a reader, it never submits, and the first click resolves it: a
   * third state that survives interaction is a control nobody can finish.
   *
   * ## Attributes & Properties
   *
   * Component attributes and properties that can be applied to the element or by using JavaScript.
   *
   * - `value`: Value submitted when the box is checked.
   * - `indeterminate`: Whether the box shows as neither checked nor unchecked.
   *
   * Presentation only. It never submits, and the first change resolves it.
   * - `checked`: Whether the control is checked.
   *
   * One property rather than two. Reading gives the real state whichever
   * mode the control is in; writing hands ownership to the consumer, which
   * is what the attribute in `<helix-checkbox checked>` does as well. The
   * same shape all four of these mixins have, for the reason given on
   * `MixinControllerOpen.open`.
   *
   * Not reflected: the attribute is the consumer's input and stays as they
   * wrote it, and `data-checked` carries the resolved state for stylesheets.
   * - `default-checked`/`defaultChecked`: Initial checked state for uncontrolled use, where nothing declared one.
   * - `hint`: Help under the control, shown while there is nothing wrong.
   * - `feedback`: What is wrong, in the reader's words rather than the browser's.
   * - `label`: The accessible name, and the fallback for the `label` slot.
   * - `required`: Whether the form refuses to submit without it.
   * - `disabled`: Whether the control is non-interactive.
   *
   * Reflected, because the styled tier selects on it, and mirrored to
   * `aria-disabled` rather than removing the element from the accessibility
   * tree, so a screen reader can still announce that the control exists.
   * - `name`: Name submitted with the form.
   *
   * **Reflected, and it is the exception to "reflect only what CSS selects
   * on".** The platform builds a form's entry list from the `name` *content
   * attribute*, not from the property, so a control named through the property
   * submitted under no name at all and was silently dropped. Measured: two
   * inputs in one form, one named by attribute and one by property, and the
   * form carried a single entry.
   *
   * Safe for a React consumer, which is what the rule is protecting: React
   * renders a custom element's props as attributes on the server, so the name
   * is already in the markup being hydrated and reflecting it writes what is
   * there. It is only a change to the markup when a consumer assigns it
   * imperatively later, and nothing is hydrating by then.
   *
   * Here rather than on each control, where it was declared eight times and
   * reflected none of them.
   * - `onCheckedChange`: The consumer's callback, invoked after the state is applied.
   *
   * Not an attribute: it is a function. And not reachable from React's JSX,
   * which reserves every `on[A-Z]` prop for its own event system and drops
   * what it does not recognize; the generated wrapper listens for the event
   * instead. (property only)
   * - `resolvedFeedback`: The message actually shown: the consumer's, or the platform's, or none. (property only) (readonly)
   * - `describedBy`: Id of the description node, for `aria-describedby` on the control.
   *
   * One at a time, because only one of the two is ever rendered. Naming both
   * would point a screen reader at an id that resolves to nothing, which it
   * reads as a description it cannot find. (property only) (readonly)
   * - `isDisabled`: Whether the control is off, by its own attribute or by an ancestor.
   *
   * What a component should bind to rather than `disabled`, which is only the
   * half of it the consumer wrote. (property only) (readonly)
   * - `form`: The form this control belongs to, if any. (property only) (readonly)
   * - `labels`: Labels associated with this control. (property only) (readonly)
   *
   * ## Events
   *
   * Events that will be emitted by the component.
   *
   * - `helix-change`: Fired before the state changes, and cancelable.
   * - `change`: Relayed from the input once the state has changed.
   *
   * ## Slots
   *
   * Areas where markup can be added to the component.
   *
   * - `(default)`: The label.
   *
   * ## Methods
   *
   * Methods that can be called to access component functionality.
   *
   * - `formResetCallback() => void`: Returns the box to the state its markup declared.
   * - `formStateRestoreCallback(state: string | null) => void`: Restores the box when the browser brings a form back.
   * - `requestChecked(next: boolean) => boolean`: Requests a checked change, and reports whether it was applied.
   *
   * Announces before it acts, so `preventDefault()` on the
   * `helix-change` is a refusal and nothing moves. In uncontrolled mode
   * the element then updates itself; in controlled mode it applies nothing
   * and waits for the consumer to pass a new `checked`, which is what
   * "controlled" means.
   * - `toggleChecked() => boolean`: Requests the opposite of the current state.
   * - `resetChecked() => void`: Drops the uncontrolled state, so the control reads `defaultChecked`
   * again.
   *
   * A form reset has to return a control to what its markup declared, and
   * clearing `checked` alone only leaves controlled mode. The value the
   * element has been keeping lives here, so this is where it is dropped.
   * - `formDisabledCallback(disabled: boolean) => void`: The platform's notice that an ancestor fieldset changed.
   *
   * ## CSS Parts
   *
   * Custom selectors for styling elements within the component.
   *
   * - `field`: The row the box and its label share, and the surface the card appearance draws.
   * - `box`: The frame the input is painted as, and the mark sits over.
   * - `control`: The input.
   * - `label`: The label beside it.
   * - `mark`: The tick, or the dash when the box is indeterminate.
   */
  "helix-base-checkbox": Partial<
    HelixBaseCheckboxProps & BaseProps<HelixBaseCheckbox> & BaseEvents
  >;

  /**
   * A real `<dialog>` opened with `showModal()`, not a div with a role and a
   * hand-built trap. The platform gives four things that are each a day's work to
   * reimplement and easy to get subtly wrong: the top layer, so the dialog is
   * above everything regardless of what `z-index` anyone else wrote; a real
   * backdrop; Escape; and inert-behind, so the page underneath is not reachable
   * by pointer, keyboard, or a screen reader's virtual cursor.
   *
   * **`open` drives `showModal()`, and every way it can close comes back through
   * `requestOpen`.** A native dialog can close from three directions: the
   * property, Escape, and a `<form method="dialog">` submit inside it. Left
   * alone, two of those would shut the dialog while the consumer's state still
   * said open, which is the bug that makes a modal impossible to reopen. Escape
   * is intercepted and routed through the request, so `preventDefault()` on the
   * `helix-close` refuses it; a close that happens anyway is reflected back.
   *
   * **Nothing here traps focus.** `showModal()` does it, and better: `inert` on
   * the rest of the document is something no JavaScript trap can achieve.
   * `FocusTrapController` stays for the surfaces that are not modal.
   *
   * The regions are bare slots rather than wrappers, for the reason the card's
   * are: an unassigned `<slot>` is `display: contents` and generates no box, so a
   * dialog with no footer has no empty band where one would be.
   *
   * ## Attributes & Properties
   *
   * Component attributes and properties that can be applied to the element or by using JavaScript.
   *
   * - `label`: Accessible name for the dialog.
   * - `persistent`: Whether Escape and the backdrop can close it.
   *
   * Off for a dialog that must be answered. It does not disable the close
   * control a consumer slots in: refusing to be dismissed is not the same as
   * refusing to be closed, and a dialog with no way out at all is a trap.
   * - `open`: Whether the element is open.
   *
   * One property, not two. Reading gives the real state whichever mode the
   * element is in, so `dialog.open` answers the question anyone asking it
   * meant. Writing hands ownership to the consumer, which is what the
   * attribute in `<helix-dialog open>` does as well: from then on the element
   * announces changes and applies none of them.
   *
   * It reads as an accessor pair rather than a field because those are two
   * different questions sharing one name, and the alternative was a second
   * property answering the first. That worked for a boolean, where `isOpen`
   * reads well; there is no such word for a value or an active item, so all
   * four of these mixins now have this shape instead of two shapes.
   *
   * **Not reflected, and that is required rather than tidy.** Reflection
   * writes the resolved state back as an attribute, and writing the attribute
   * is how a consumer says they own it. So an uncontrolled element that
   * opened itself would put `open` on its own host and, from the next thing
   * that read it, be indistinguishable from one the consumer controls:
   * cloned, serialised for hydration, or diffed by a framework, it would come
   * back controlled and stop responding. `data-open` carries the resolved
   * state for stylesheets, which is what it has always been for.
   * - `default-open`/`defaultOpen`: Initial open state for uncontrolled use, where nothing declared one.
   * - `onOpenChange`: The consumer's callback, invoked after the state is applied.
   *
   * Not an attribute: it is a function. And not reachable from React's JSX,
   * which reserves every `on[A-Z]` prop for its own event system and drops
   * what it does not recognize; the generated wrapper listens for the events
   * instead. (property only)
   *
   * ## Events
   *
   * Events that will be emitted by the component.
   *
   * - `helix-open`: Fired before it opens, and cancelable.
   * - `helix-close`: Fired before it closes, and cancelable.
   *
   * ## Slots
   *
   * Areas where markup can be added to the component.
   *
   * - `(default)`: The dialog's content.
   * - `header`: The title, and anything beside it.
   * - `footer`: The actions.
   *
   * ## Methods
   *
   * Methods that can be called to access component functionality.
   *
   * - `show() => void`: Moves focus into the dialog and makes the rest of the page inert.
   * - `close() => void`: Asks to close, which a consumer may refuse.
   * - `requestOpen(next: boolean) => boolean`: Requests an open-state change, and reports whether it was applied.
   *
   * Announces before it acts, so `preventDefault()` on the `helix-open` or
   * `helix-close` is a refusal and nothing moves. In uncontrolled mode the
   * element then updates itself; in controlled mode it applies nothing and
   * waits for the consumer to pass a new `open`, which is what "controlled"
   * means.
   * - `toggleOpen() => boolean`: Requests the opposite of the current state.
   *
   * ## CSS Parts
   *
   * Custom selectors for styling elements within the component.
   *
   * - `dialog`: The native dialog element.
   */
  "helix-base-dialog": Partial<
    HelixBaseDialogProps & BaseProps<HelixBaseDialog> & BaseEvents
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
   * - `announced`: Whether the rule is announced as a separator.
   *
   * Off by default, and out of the accessibility tree. Most rules on a page
   * separate nothing: they underline a heading or close a section that space
   * had already closed, and announcing every one as a separator is noise a
   * screen-reader user has to walk past.
   *
   * An opt-in, not a `decorative` opt-out, because a boolean attribute cannot
   * be turned off: `decorative="false"` parses as `true`, which would put the
   * quiet default out of reach from HTML and leave it settable only as a
   * property. An opt-in is absent by default, which every reflected property
   * here has to be.
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
   * Takes `MixinControllerOpen`, so `open`, `defaultOpen`, and `OpenChange` behave exactly
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
   * - `open`: Whether the element is open.
   *
   * One property, not two. Reading gives the real state whichever mode the
   * element is in, so `dialog.open` answers the question anyone asking it
   * meant. Writing hands ownership to the consumer, which is what the
   * attribute in `<helix-dialog open>` does as well: from then on the element
   * announces changes and applies none of them.
   *
   * It reads as an accessor pair rather than a field because those are two
   * different questions sharing one name, and the alternative was a second
   * property answering the first. That worked for a boolean, where `isOpen`
   * reads well; there is no such word for a value or an active item, so all
   * four of these mixins now have this shape instead of two shapes.
   *
   * **Not reflected, and that is required rather than tidy.** Reflection
   * writes the resolved state back as an attribute, and writing the attribute
   * is how a consumer says they own it. So an uncontrolled element that
   * opened itself would put `open` on its own host and, from the next thing
   * that read it, be indistinguishable from one the consumer controls:
   * cloned, serialised for hydration, or diffed by a framework, it would come
   * back controlled and stop responding. `data-open` carries the resolved
   * state for stylesheets, which is what it has always been for.
   * - `default-open`/`defaultOpen`: Initial open state for uncontrolled use, where nothing declared one.
   * - `onOpenChange`: The consumer's callback, invoked after the state is applied.
   *
   * Not an attribute: it is a function. And not reachable from React's JSX,
   * which reserves every `on[A-Z]` prop for its own event system and drops
   * what it does not recognize; the generated wrapper listens for the events
   * instead. (property only)
   *
   * ## Events
   *
   * Events that will be emitted by the component.
   *
   * - `helix-close`: Fired before the panel closes, and cancelable.
   * - `helix-open`: Fired when the drawer opens or closes.
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
   * - `requestOpen(next: boolean) => boolean`: Requests an open-state change, and reports whether it was applied.
   *
   * Announces before it acts, so `preventDefault()` on the `helix-open` or
   * `helix-close` is a refusal and nothing moves. In uncontrolled mode the
   * element then updates itself; in controlled mode it applies nothing and
   * waits for the consumer to pass a new `open`, which is what "controlled"
   * means.
   * - `toggleOpen() => boolean`: Requests the opposite of the current state.
   *
   * ## CSS Parts
   *
   * Custom selectors for styling elements within the component.
   *
   * - `panel`: The sliding panel.
   * - `header`: The header region.
   * - `content`: The scrolling content region.
   */
  "helix-base-drawer": Partial<
    HelixBaseDrawerProps & BaseProps<HelixBaseDrawer> & BaseEvents
  >;

  /**
   * A row that opens a page *contains* that page: its rows are this row's own
   * children, assigned to the `page` slot. The tree is the structure, so there
   * are no ids to wire and a consumer who moves a row has moved its page with it.
   *
   * **It renders one of three things**, and which one is the stack's business
   * rather than its own. On the page showing, it is a row. Showing its own page,
   * it contributes that page's rows and nothing else, because its row belongs to
   * the page above. On neither, it renders nothing at all: the rows are in the
   * light DOM and come back untouched, so there is no state to keep and nothing
   * to hide with an attribute this element would have to write onto itself.
   *
   * Choosing is announced, never applied. The row dispatches and the stack
   * decides whether that means drilling in or choosing a command.
   *
   * ## Attributes & Properties
   *
   * Component attributes and properties that can be applied to the element or by using JavaScript.
   *
   * - `disabled`: Whether the row can be reached at all.
   * - `value`: Identifies the row to whatever is listening.
   * - `isDrilldownItem`: Marks this as a row a stack should count. Cheaper than an instanceof. (property only) (readonly)
   * - `onPage`: Whether the page showing is the one this row is on. Written by the stack. (property only)
   * - `showingPage`: Whether this row's own page is the one showing. Written by the stack. (property only)
   * - `focusable`: Whether this row holds the region's tab stop. Written by the stack.
   *
   * A drill-down keeps one stop and moves within it on the arrows, so every
   * other row is at `-1`. Every row was, including the first, which left
   * nothing in the region tab-reachable at all: the keyboard could not get in
   * without first clicking something with a pointer.
   *
   * No attribute, the same as `Button`'s: this is coordination between
   * elements, and writing `tabindex` onto a host the consumer rendered is a
   * change a React consumer's hydration reports and does not patch up. The stop
   * lands inside this shadow root instead. (property only)
   *
   * ## Events
   *
   * Events that will be emitted by the component.
   *
   * - `helix-select`: Fired when the row is chosen.
   *
   * ## Slots
   *
   * Areas where markup can be added to the component.
   *
   * - `(default)`: The words naming this row.
   * - `page`: The rows of the page this one opens.
   * - `start`: Before the words, usually an icon.
   * - `end`: After the words, usually a mark or a count.
   *
   * ## Methods
   *
   * Methods that can be called to access component functionality.
   *
   * - `focusItem() => void`: Moves focus onto the row itself.
   * - `select() => void`: Announces that this row was chosen.
   *
   * ## CSS Parts
   *
   * Custom selectors for styling elements within the component.
   *
   * - `item`: The row itself.
   * - `label`: The words.
   */
  "helix-base-drilldown-item": Partial<
    HelixBaseDrilldownItemProps & BaseProps<HelixBaseDrilldownItem> & BaseEvents
  >;

  /**
   * One panel that changes rather than panels opening beside each other. That is
   * the right shape wherever there is no room for a second column: a phone has
   * none, and a touch screen has no hover to open one with.
   *
   * **Not a `Menu`, and the difference is what it is for rather than how it
   * looks.** A menu is a thing that opens from a trigger and closes when it is
   * done; this is a region that sits where it is put, inside a drawer or a
   * sidebar or a settings panel. `Menu` drills too, through the same controller,
   * because a menu deep enough to need pages wants exactly this behavior without
   * being this component.
   *
   * **Navigation, never a value.** Rows are places to go and commands to run, so
   * nothing here is form-associated and nothing is submitted. A drill-down that
   * reported a value would be a `Listbox` whose options happen to nest, and that
   * is the component to reach for instead.
   *
   * **The tree is the state.** A row that opens a page contains that page, so the
   * stack holds one reference and reads the rest from the DOM. See
   * `DrilldownController`, which is where this behavior lives and which `Menu`
   * shares.
   *
   * ## Attributes & Properties
   *
   * Component attributes and properties that can be applied to the element or by using JavaScript.
   *
   * - `label`: Accessible name for the region.
   * - `back-label`/`backLabel`: What the control returning from a page reads.
   *
   * ## Events
   *
   * Events that will be emitted by the component.
   *
   * - `helix-select`: Fired when a row with no page is chosen.
   *
   * ## Slots
   *
   * Areas where markup can be added to the component.
   *
   * - `(default)`: The rows of the top page.
   *
   * ## Methods
   *
   * Methods that can be called to access component functionality.
   *
   * - `back() => boolean`: Returns one page, and reports whether there was one to return to.
   *
   * Focus lands on the row that opened the page being left, which is why the
   * row is read before going back rather than after: a reader who drills in and
   * comes straight out should be on the row they pressed, not at the top of a
   * list they have already read.
   *
   * ## CSS Parts
   *
   * Custom selectors for styling elements within the component.
   *
   * - `header`: The bar above a page, holding the way back and its name.
   * - `back`: The control that returns one page.
   * - `title`: The name of the page showing.
   * - `page`: The region the rows are in.
   */
  "helix-base-drilldown": Partial<
    HelixBaseDrilldownProps & BaseProps<HelixBaseDrilldown> & BaseEvents
  >;

  /**
   * An empty region with no explanation is indistinguishable from one that failed
   * to load, so this exists to tell the difference: what would be here, and the
   * one action that would put something here.
   *
   * `role="status"` on a polite live region, because an empty view usually
   * arrives in place of content that was being fetched. Announcing it is the only
   * way a screen-reader user learns the search returned nothing, rather than
   * being left waiting.
   *
   * Every region is a bare slot. The reference ships an `empty-state-heading` and
   * an `empty-state-actions` whose only job is to assign themselves a slot on
   * connect, which is a component for something the consumer can write.
   *
   * ## Attributes & Properties
   *
   * Component attributes and properties that can be applied to the element or by using JavaScript.
   *
   * - `no-announce`/`noAnnounce`: Whether the state is announced when it appears.
   *
   * On by default: an empty view almost always replaces something that was
   * loading. Turn it off for one that was on the page from the start, which
   * has nothing to announce because nothing changed.
   *
   * ## Slots
   *
   * Areas where markup can be added to the component.
   *
   * - `icon`: A mark above the heading.
   * - `heading`: What is missing.
   * - `(default)`: Why, and what to do about it.
   * - `actions`: The way out.
   */
  "helix-base-empty": Partial<
    HelixBaseEmptyProps & BaseProps<HelixBaseEmpty> & BaseEvents
  >;

  /**
   * Everything a button does, with one thing added and it is the reason this is
   * an element rather than a note on `Button`: **an icon-only control has no
   * accessible name unless it is given one.** A button whose content is a glyph
   * announces as "button" and nothing else, which is the single most common way a
   * toolbar becomes unusable without sight. `label` is not optional in practice,
   * and having a component that says so is what makes it reviewable.
   *
   * **Registered, so it can be rendered and not only subclassed.** The styled
   * icon button extended `HelixBaseButton` directly, which left no
   * `helix-base-icon-button` for anything to use: a headless consumer wanting an
   * icon button had a button and a naming convention. Anything in this tier that
   * needs one, such as an announcement's dismiss control, can now render it
   * without reaching into the styled tier for a tag that would never upgrade.
   *
   * Top-level rather than `Button.Icon`, because a namespace means composition
   * and an icon-only button is not part of a button. It is a button with
   * different content and a different shape, which makes it its own component.
   *
   * ## Attributes & Properties
   *
   * Component attributes and properties that can be applied to the element or by using JavaScript.
   *
   * - `type`: What activating the button does to its form.
   * - `label`: Accessible name, for a button whose content is not text.
   *
   * Lives here rather than only on `IconButton` so the two share one render.
   * An icon-only button without it is a control a screen reader announces as
   * "button" and nothing else.
   * - `command`: What to send when the button is activated, and what to send it to.
   *
   * The platform's invoker attributes, forwarded onto the inner `<button>`
   * rather than left on the host: only a real button is recognized as an
   * invoker, so `commandfor` written on a custom element resolves nothing and
   * the trigger silently does nothing at all. A wrapper has to hand them down,
   * the same way `label` becomes `aria-label` in there.
   *
   * ```html
   * <helix-button commandfor="confirm" command="--show">Delete…</helix-button>
   * ```
   *
   * `commandFor` spells its attribute out, because Lit lowercases a property
   * name to derive one rather than dash-casing it, and what a consumer writes
   * is the platform's `commandfor`.
   * - `commandfor`/`commandFor`: The id of the element the command is sent to.
   * - `disabled`: Whether the control is non-interactive.
   *
   * Reflected, because the styled tier selects on it, and mirrored to
   * `aria-disabled` rather than removing the element from the accessibility
   * tree, so a screen reader can still announce that the control exists.
   * - `name`: Name submitted with the form.
   *
   * **Reflected, and it is the exception to "reflect only what CSS selects
   * on".** The platform builds a form's entry list from the `name` *content
   * attribute*, not from the property, so a control named through the property
   * submitted under no name at all and was silently dropped. Measured: two
   * inputs in one form, one named by attribute and one by property, and the
   * form carried a single entry.
   *
   * Safe for a React consumer, which is what the rule is protecting: React
   * renders a custom element's props as attributes on the server, so the name
   * is already in the markup being hydrated and reflecting it writes what is
   * there. It is only a change to the markup when a consumer assigns it
   * imperatively later, and nothing is hydrating by then.
   *
   * Here rather than on each control, where it was declared eight times and
   * reflected none of them.
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
   * - `isDisabled`: Whether the control is off, by its own attribute or by an ancestor.
   *
   * What a component should bind to rather than `disabled`, which is only the
   * half of it the consumer wrote. (property only) (readonly)
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
   * ## Methods
   *
   * Methods that can be called to access component functionality.
   *
   * - `formDisabledCallback(disabled: boolean) => void`: The platform's notice that an ancestor fieldset changed.
   *
   * ## CSS Parts
   *
   * Custom selectors for styling elements within the component.
   *
   * - `button`: The inner button or anchor.
   */
  "helix-base-icon-button": Partial<
    HelixBaseIconButtonProps & BaseProps<HelixBaseIconButton> & BaseEvents
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
   * The `<svg>` carries `fill="currentColor"` because the generator keeps only
   * the inner markup and discards the source's own root tag, and that tag is
   * where Phosphor puts its fill. Without it, every solid glyph in the set, 65 of
   * them, falls back to the SVG default of black and disappears on a dark page.
   * Shapes that set their own `fill` or `stroke` are unaffected, which is why the
   * outline icons looked fine and hid this.
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
   * Renders a real `<input>`, so the caret, selection, autofill, spellcheck, the
   * password manager, and the on-screen keyboard a phone chooses all come from the
   * platform. `delegatesFocus` puts focus on it, and it serializes into the
   * server's markup, so the field is usable before any script loads.
   *
   * **The input inside a shadow root submits nothing**, because the form is on the
   * other side of the boundary. The host is form-associated instead and reports
   * its own value through `ElementInternals`, which is also what carries validity
   * and what answers a form reset.
   *
   * `value` and `defaultValue` are separate for the reason `checked` and
   * `defaultChecked` are: `value` is what is in the field now and
   * `defaultValue` is what the markup asked for, which is where a reset returns
   * to and is gone the moment anyone types.
   *
   * **Validity is the platform's.** The `type` and `required` are set on the real
   * input and its `validity` is copied onto the host, so an email field rejects
   * what the browser says is not an email rather than what a regular expression
   * here guesses. What this adds is the anchor, so `reportValidity` points the
   * bubble at the input rather than at the host.
   *
   * `pattern`, `minlength` and `maxlength` are forwarded with them. They were
   * promised by this paragraph and did not exist, so a consumer following the
   * sentence wrote an attribute on the host that reached no input and constrained
   * nothing: the field looked as though it were checked and was not.
   *
   * ## Attributes & Properties
   *
   * Component attributes and properties that can be applied to the element or by using JavaScript.
   *
   * - `placeholder`: Shown while the field is empty. Not a label: it goes when typing starts.
   * - `read-only`/`readOnly`: Whether the field refuses input while still submitting its value.
   * - `type`: What the field accepts, which decides the keyboard and the validation.
   * - `pattern`: A regular expression the value has to match, as the platform reads it.
   *
   * The class documentation promised `pattern` and `minlength` "and the rest"
   * were set on the real input, and no such properties existed: a consumer
   * following that sentence wrote an attribute on the host, it reached no input,
   * and the field constrained nothing while looking as though it did.
   *
   * Forwarded rather than checked here, which is the whole reason validity is
   * the platform's: the browser knows what a `pattern` means, anchors it at both
   * ends, and produces the message in the reader's own language.
   * - `minlength`/`minLength`: Fewest characters the value may have.
   * - `maxlength`/`maxLength`: Most characters the value may have.
   * - `default-value`/`defaultValue`: The value the markup declared, which is where a reset returns to.
   * - `value`: What the control holds now, and what its form submits.
   *
   * One property, not two. Reading gives the real value whichever mode the
   * control is in, so `input.value` answers the question anyone asking it
   * meant. Writing hands ownership to the consumer, which is what
   * `<helix-input value="x">` says too, and matches what a controlled input
   * means in React: the value is theirs and the control waits to be told.
   * `default-value` is how markup seeds one it does not want to own.
   *
   * The same shape as the other three mixins, which is the point of them
   * being four of a kind rather than four of three kinds.
   * - `hint`: Help under the control, shown while there is nothing wrong.
   * - `feedback`: What is wrong, in the reader's words rather than the browser's.
   * - `label`: The accessible name, and the fallback for the `label` slot.
   * - `required`: Whether the form refuses to submit without it.
   * - `disabled`: Whether the control is non-interactive.
   *
   * Reflected, because the styled tier selects on it, and mirrored to
   * `aria-disabled` rather than removing the element from the accessibility
   * tree, so a screen reader can still announce that the control exists.
   * - `name`: Name submitted with the form.
   *
   * **Reflected, and it is the exception to "reflect only what CSS selects
   * on".** The platform builds a form's entry list from the `name` *content
   * attribute*, not from the property, so a control named through the property
   * submitted under no name at all and was silently dropped. Measured: two
   * inputs in one form, one named by attribute and one by property, and the
   * form carried a single entry.
   *
   * Safe for a React consumer, which is what the rule is protecting: React
   * renders a custom element's props as attributes on the server, so the name
   * is already in the markup being hydrated and reflecting it writes what is
   * there. It is only a change to the markup when a consumer assigns it
   * imperatively later, and nothing is hydrating by then.
   *
   * Here rather than on each control, where it was declared eight times and
   * reflected none of them.
   * - `onValueChange`: The consumer's callback, invoked after the value is applied.
   *
   * Not an attribute: it is a function. `onValueChange` and not `onChange`,
   * because React reserves the latter for its own synthetic system and wires
   * it to the native `change`, so a Helix event named `Change` would never
   * fire at all. (property only)
   * - `resolvedFeedback`: The message actually shown: the consumer's, or the platform's, or none. (property only) (readonly)
   * - `describedBy`: Id of the description node, for `aria-describedby` on the control.
   *
   * One at a time, because only one of the two is ever rendered. Naming both
   * would point a screen reader at an id that resolves to nothing, which it
   * reads as a description it cannot find. (property only) (readonly)
   * - `isDisabled`: Whether the control is off, by its own attribute or by an ancestor.
   *
   * What a component should bind to rather than `disabled`, which is only the
   * half of it the consumer wrote. (property only) (readonly)
   * - `form`: The form this control belongs to, if any. (property only) (readonly)
   * - `labels`: Labels associated with this control. (property only) (readonly)
   *
   * ## Events
   *
   * Events that will be emitted by the component.
   *
   * - `helix-change`: Fired as the text changes, and cancelable.
   * - `change`: Relayed from the input once the reader has finished.
   *
   * ## Slots
   *
   * Areas where markup can be added to the component.
   *
   * - `start`: Before the text, for an icon or a prefix.
   * - `end`: After the text, for an icon, a unit, or a clear button.
   *
   * ## Methods
   *
   * Methods that can be called to access component functionality.
   *
   * - `focus(options?: FocusOptions) => void`: Puts the caret in the field, the way a label pointing at one would.
   * - `select() => void`: Selects everything in the field.
   * - `requestValue(next: string) => boolean`: Requests a new value, and reports whether the request stood.
   *
   * Announces before it acts, so `preventDefault()` on the `helix-change` is
   * a refusal and nothing moves. In uncontrolled mode the control then
   * updates itself; in controlled mode it applies nothing and waits for the
   * consumer to pass a new `value`, which is what controlled means.
   * - `formResetCallback() => void`: Returns the control to the value its markup declared.
   *
   * Both halves are dropped, the consumer's and the control's, because a
   * reset means the form is as it was served. Clearing only the internal one
   * would leave a control that had been written to stuck at that value.
   * - `formStateRestoreCallback(state: string | null) => void`: Restores the value when the browser brings a form back.
   *
   * Falling back to `defaultValue` rather than to empty, because a restore
   * with no state is a form the browser has nothing recorded for, which is
   * the same situation as a fresh one.
   * - `formDisabledCallback(disabled: boolean) => void`: The platform's notice that an ancestor fieldset changed.
   *
   * ## CSS Parts
   *
   * Custom selectors for styling elements within the component.
   *
   * - `field`: The box holding everything.
   * - `control`: The input itself.
   */
  "helix-base-input": Partial<
    HelixBaseInputProps & BaseProps<HelixBaseInput> & BaseEvents
  >;

  /**
   * Renders a real `<kbd>`, so the passage still means "press this" to anything
   * reading the markup rather than only to a reader looking at it.
   *
   * One key per element. A chord is several of these with the separator written
   * between them as ordinary text, because that separator is prose: it is "then"
   * in a sequence and "plus" in a simultaneous press, and a component that
   * inserted one would have to guess which.
   *
   * ## Slots
   *
   * Areas where markup can be added to the component.
   *
   * - `(default)`: The key's label.
   *
   * ## CSS Parts
   *
   * Custom selectors for styling elements within the component.
   *
   * - `kbd`: The key.
   */
  "helix-base-kbd": Partial<
    HelixBaseKbdProps & BaseProps<HelixBaseKbd> & BaseEvents
  >;

  /**
   * Layout and semantics, and deliberately not a target.
   *
   * **It does not become a link.** The reference renders an `<a>` when given an
   * `href`, which is the thing Button and Toggle both stopped doing: a router
   * renders its own anchor and cannot render it inside this shadow root, so a row
   * that navigates would force a full page load. A row whose label is a
   * destination slots the consumer's own link as that label, and the link is the
   * target rather than the row around it.
   *
   * That is a real constraint rather than an oversight: a whole-row target needs
   * the anchor to wrap the layout, and the layout is what this component is. When
   * something needs it, it wants a `data-list-item` recipe styling the consumer's
   * anchor, the way `data-button` and `data-navigation-item` do.
   *
   * ## Slots
   *
   * Areas where markup can be added to the component.
   *
   * - `start`: Leading content, usually an icon or an avatar.
   * - `(default)`: The label.
   * - `supporting`: Secondary text under the label.
   * - `end`: Trailing content.
   *
   * ## CSS Parts
   *
   * Custom selectors for styling elements within the component.
   *
   * - `row`: The layout, held off the host so the host can carry a marker.
   */
  "helix-base-list-item": Partial<
    HelixBaseListItemProps & BaseProps<HelixBaseListItem> & BaseEvents
  >;

  /**
   * `role="list"` on the host, so the rows are counted and announced as "1 of 7"
   * rather than as seven unrelated passages. That count is the whole reason to
   * use a list rather than a stack of divs.
   *
   * ## Attributes & Properties
   *
   * Component attributes and properties that can be applied to the element or by using JavaScript.
   *
   * - `label`: Accessible name for the set.
   * - `kind`: What kind of list this is, which is a fact about the content.
   *
   * On the headless tier because it is meaning rather than decoration, the same
   * argument `severity` makes on `Callout`. A numbered list is numbered because
   * the order carries information; a bulleted one is bulleted because the items
   * are a set and the order does not. That distinction is the reader's, and it
   * has to survive with the stylesheet turned off.
   *
   * - `default` is a run of rows and takes no marker. It is what a list of
   *   settings or files is: neither ordered nor a set to be counted.
   * - `ordered` numbers them, for steps.
   * - `unordered` bullets them, for a set.
   * - `description` pairs each row's label with its supporting text as a term
   *   and what the term means.
   *
   * **`description` reuses the row's existing slots rather than inventing a
   *   second kind of row.** A term and its description is exactly the label and
   *   the supporting text `List.Item` already has, so the kind changes how the
   *   pair is drawn and nothing about what a consumer writes. A separate
   *   `List.Term` element would be a second row shape for one attribute's sake.
   *
   * ## Slots
   *
   * Areas where markup can be added to the component.
   *
   * - `(default)`: The rows.
   */
  "helix-base-list": Partial<
    HelixBaseListProps & BaseProps<HelixBaseList> & BaseEvents
  >;

  /**
   * **The listbox is the control and the options are its vocabulary.** A Select
   * is this with a trigger in front of it, a Combobox is this with a text input,
   * and a command palette is this again: they differ in what opens the list and
   * what filters it, not in what the list is. Building it as its own family is
   * what stops each of those reimplementing the keyboard and the filtering.
   *
   * **`value` is comma separated when `multiple` is set**, the way
   * `Checkbox.Group`'s is. It stays a string because that is what a form submits
   * and what `MixinControllerValue` holds; an array property would be a second
   * shape for the same fact, and the two would disagree the first time one was
   * set without the other.
   *
   * **Chosen and active are two different things.** Chosen is the answer; active
   * is where the keyboard is. In a single-select list they move together, which
   * is the radio group pattern and is what a reader expects from arrow keys. With
   * `multiple` they come apart: the arrows move without choosing and Space
   * chooses, because a reader passing over four options on the way to the fifth
   * did not mean to pick all five.
   *
   * That is also why this does not use `KeyboardNavigationController`, which
   * moves and chooses in one act by design. Half of this component needs that and
   * half needs the opposite, and a flag on the controller would be this paragraph
   * written twice.
   *
   * **Filtering hides rather than removes.** An option the filter has hidden is
   * still the consumer's element in the consumer's order, so a filter that clears
   * puts the list back exactly as it was with nothing re-rendered. What counts as
   * a match is a plain case-insensitive substring, and a consumer wanting more
   * hides options itself: `filter` is a convenience over the same `hidden` the
   * component uses.
   *
   * ## Attributes & Properties
   *
   * Component attributes and properties that can be applied to the element or by using JavaScript.
   *
   * - `filter`: What the list is narrowed to, if anything.
   *
   * Filtering hides rather than removes, so nothing about the value changes and
   * the list is still the consumer's own elements in their own order. Reading
   * gives what is being filtered on; writing declares it theirs, and
   * `default-filter` seeds one the list owns.
   * - `default-filter`/`defaultFilter`: What to start narrowed to, where nothing declared it.
   * - `filterable`: Whether the list renders a field for narrowing itself.
   *
   * The field lives here rather than in whatever frames the list, because the
   * filtering already does: `filter`, the empty state and the keyboard are all
   * this component's. A select that drew its own search box above a listbox
   * would be writing the same field again, and so would a combobox, and so
   * would a command palette, which is the fault the three-family split exists
   * to prevent.
   * - `filter-label`/`filterLabel`: Placeholder for the field that narrows the list.
   * - `multiple`: Whether more than one option can be the answer.
   * - `empty-text`/`emptyText`: What is shown when a filter has hidden every option.
   * - `default-value`/`defaultValue`: The value the markup declared, which is where a reset returns to.
   * - `value`: What the control holds now, and what its form submits.
   *
   * One property, not two. Reading gives the real value whichever mode the
   * control is in, so `input.value` answers the question anyone asking it
   * meant. Writing hands ownership to the consumer, which is what
   * `<helix-input value="x">` says too, and matches what a controlled input
   * means in React: the value is theirs and the control waits to be told.
   * `default-value` is how markup seeds one it does not want to own.
   *
   * The same shape as the other three mixins, which is the point of them
   * being four of a kind rather than four of three kinds.
   * - `hint`: Help under the control, shown while there is nothing wrong.
   * - `feedback`: What is wrong, in the reader's words rather than the browser's.
   * - `label`: The accessible name, and the fallback for the `label` slot.
   * - `required`: Whether the form refuses to submit without it.
   * - `disabled`: Whether the control is non-interactive.
   *
   * Reflected, because the styled tier selects on it, and mirrored to
   * `aria-disabled` rather than removing the element from the accessibility
   * tree, so a screen reader can still announce that the control exists.
   * - `name`: Name submitted with the form.
   *
   * **Reflected, and it is the exception to "reflect only what CSS selects
   * on".** The platform builds a form's entry list from the `name` *content
   * attribute*, not from the property, so a control named through the property
   * submitted under no name at all and was silently dropped. Measured: two
   * inputs in one form, one named by attribute and one by property, and the
   * form carried a single entry.
   *
   * Safe for a React consumer, which is what the rule is protecting: React
   * renders a custom element's props as attributes on the server, so the name
   * is already in the markup being hydrated and reflecting it writes what is
   * there. It is only a change to the markup when a consumer assigns it
   * imperatively later, and nothing is hydrating by then.
   *
   * Here rather than on each control, where it was declared eight times and
   * reflected none of them.
   * - `options`: Every option, in the order a reader meets them.
   *
   * Descendants rather than children, because a group puts a level between the
   * list and its options and the keyboard has to move through a grouped list
   * exactly as it moves through a flat one. (property only) (readonly)
   * - `values`: The chosen values, which is a list whether or not `multiple` is set. (property only) (readonly)
   * - `onValueChange`: The consumer's callback, invoked after the value is applied.
   *
   * Not an attribute: it is a function. `onValueChange` and not `onChange`,
   * because React reserves the latter for its own synthetic system and wires
   * it to the native `change`, so a Helix event named `Change` would never
   * fire at all. (property only)
   * - `resolvedFeedback`: The message actually shown: the consumer's, or the platform's, or none. (property only) (readonly)
   * - `describedBy`: Id of the description node, for `aria-describedby` on the control.
   *
   * One at a time, because only one of the two is ever rendered. Naming both
   * would point a screen reader at an id that resolves to nothing, which it
   * reads as a description it cannot find. (property only) (readonly)
   * - `isDisabled`: Whether the control is off, by its own attribute or by an ancestor.
   *
   * What a component should bind to rather than `disabled`, which is only the
   * half of it the consumer wrote. (property only) (readonly)
   * - `form`: The form this control belongs to, if any. (property only) (readonly)
   * - `labels`: Labels associated with this control. (property only) (readonly)
   *
   * ## Events
   *
   * Events that will be emitted by the component.
   *
   * - `helix-change`: Fired when the answer changes, and cancelable.
   * - `helix-filter`: Fired before the list narrows, and cancelable.
   *
   * ## Slots
   *
   * Areas where markup can be added to the component.
   *
   * - `(default)`: The options, and any groups of them.
   * - `label`: Richer than a string.
   * - `hint`: Richer than a string.
   *
   * ## Methods
   *
   * Methods that can be called to access component functionality.
   *
   * - `requestFilter(next: string) => boolean`: Requests a narrowing, and reports whether the request stood.
   * - `requestValue(next: string) => boolean`: Requests a new value, and reports whether the request stood.
   *
   * Announces before it acts, so `preventDefault()` on the `helix-change` is
   * a refusal and nothing moves. In uncontrolled mode the control then
   * updates itself; in controlled mode it applies nothing and waits for the
   * consumer to pass a new `value`, which is what controlled means.
   * - `formResetCallback() => void`: Returns the control to the value its markup declared.
   *
   * Both halves are dropped, the consumer's and the control's, because a
   * reset means the form is as it was served. Clearing only the internal one
   * would leave a control that had been written to stuck at that value.
   * - `formStateRestoreCallback(state: string | null) => void`: Restores the value when the browser brings a form back.
   *
   * Falling back to `defaultValue` rather than to empty, because a restore
   * with no state is a form the browser has nothing recorded for, which is
   * the same situation as a fresh one.
   * - `formDisabledCallback(disabled: boolean) => void`: The platform's notice that an ancestor fieldset changed.
   *
   * ## CSS Parts
   *
   * Custom selectors for styling elements within the component.
   *
   * - `label`: The question, over the list.
   * - `items`: The list itself.
   * - `empty`: Shown when a filter has hidden everything.
   * - `search`: The region holding the field that narrows the list.
   * - `search-field`: The field itself.
   * - `hint`: Help under the list.
   * - `feedback`: What is wrong with it.
   */
  "helix-base-listbox": Partial<
    HelixBaseListboxProps & BaseProps<HelixBaseListbox> & BaseEvents
  >;

  /**
   * Three shapes, one element, because a reader moving down a menu with the
   * arrow keys does not care which kind each row is and neither should the
   * markup. What it is follows from what it was given: something slotted into
   * `submenu` makes it a way in, `checked` makes it a choice, and neither makes
   * it a command.
   *
   * **The role follows the shape.** A row that can be ticked is
   * `menuitemcheckbox` and carries `aria-checked`, because a reader is told "one
   * of these is on" rather than "here is a button". A row that opens a page keeps
   * `menuitem` and says `aria-haspopup`, since the page it opens is a menu.
   *
   * Whether it is on the page showing is set by the menu as a property, never as
   * an attribute: an attribute written onto a consumer's element after it
   * upgrades is a hydration mismatch waiting to happen.
   *
   * ## Attributes & Properties
   *
   * Component attributes and properties that can be applied to the element or by using JavaScript.
   *
   * - `value`: What this row stands for, carried in the event when it is chosen.
   * - `checkable`: Whether the row is one of a set of choices.
   *
   * Separate from `checked`, and it has to be. A row that is off is still a
   * choice, and `checked` alone cannot say so: an unticked row and a row that
   * was never tickable look identical from here. Announcing only the ticked one
   * as a checkbox tells a reader its siblings are commands, which is the one
   * thing they are not.
   *
   * `checked` implies it, so a row that is on never has to say both.
   * - `checked`: Whether the row is ticked.
   * - `disabled`: Whether the row can be chosen.
   * - `onPage`: Whether this row is on the page currently showing.
   *
   * Set by the menu, and a property rather than an attribute for that reason.
   * Public because the menu has to reach it, and not something a consumer
   * writes: which page is open is the menu's business. (property only)
   * - `showingSubmenu`: Whether this row's submenu is the page showing.
   *
   * Separate from `onPage`, and it has to be. A row that opened a page is not
   * itself on that page, so both are false for it, and rendering nothing on
   * that basis takes its `slot[name="submenu"]` with it: the rows inside have
   * nowhere to be assigned and are never laid out. The element that holds the
   * page has to keep the slot even when it shows no row of its own. (property only)
   * - `isMenuItem`: Marks this as a row a menu should count. Cheaper than an instanceof. (property only) (readonly)
   * - `hasSubmenu`: Whether anything was slotted into `submenu`.
   *
   * Client only, and the `?? []` is what makes that true rather than merely
   * documented. Lit's element shim carries attributes but not a tree, so
   * `children` is undefined on the server, and this getter is read during
   * `render`: spreading it threw, and a menu row could not be served at all.
   * Found by writing this component's SSR spec, which is the only place it
   * could have been found, because every other path runs in a browser.
   *
   * False on the server is also the right answer rather than a safe one: the
   * server cannot know whether a submenu was slotted, and a row that served a
   * `aria-haspopup` it might not have would be a promise made to a screen
   * reader on the strength of a guess. (property only) (readonly)
   *
   * ## Events
   *
   * Events that will be emitted by the component.
   *
   * - `helix-select`: Fired when the row is chosen.
   *
   * ## Slots
   *
   * Areas where markup can be added to the component.
   *
   * - `(default)`: The label.
   * - `submenu`: Rows this one opens, which makes it a way in.
   *
   * ## Methods
   *
   * Methods that can be called to access component functionality.
   *
   * - `focus() => void`: Moves focus onto the row itself.
   *
   * The host is not focusable: what takes focus is the row inside this shadow
   * root, and a menu moving between rows with the arrow keys has to reach it.
   *
   * ## CSS Parts
   *
   * Custom selectors for styling elements within the component.
   *
   * - `item`: The row.
   * - `mark`: The trailing mark: a tick when checked, a caret when it opens a page. One column, because a row is never both.
   */
  "helix-base-menu-item": Partial<
    HelixBaseMenuItemProps & BaseProps<HelixBaseMenuItem> & BaseEvents
  >;

  /**
   * The trigger is slotted and stays the consumer's own element, the same way the
   * tooltip takes one. The surface is rendered here, in the top layer through the
   * popover API, so it clears any ancestor with `overflow: hidden` without a
   * `z-index` anywhere.
   *
   * **It drills down rather than flying out.** A submenu replaces what is on
   * screen and a back row returns, instead of opening a second panel beside the
   * first. Panels beside panels need a diagonal path a pointer has to travel
   * without straying, they run off the edge of a narrow window, and on a touch
   * screen there is no hover to open them with at all. One panel that changes
   * what it holds has none of those problems and reads the same on a phone.
   *
   * The open page is held here rather than in each item, because only one page
   * shows at a time and something has to know which. Items are told by property,
   * not by attribute: an attribute written onto a consumer's element after it
   * upgrades is a hydration mismatch waiting to happen.
   *
   * ## Attributes & Properties
   *
   * Component attributes and properties that can be applied to the element or by using JavaScript.
   *
   * - `placement`: Preferred side. It moves if that side does not fit.
   * - `offset`: Space between the trigger and the surface, in pixels.
   * - `label`: Accessible name for the surface.
   * - `back-label`/`backLabel`: What the row returning from a submenu reads.
   * - `open`: Whether the element is open.
   *
   * One property, not two. Reading gives the real state whichever mode the
   * element is in, so `dialog.open` answers the question anyone asking it
   * meant. Writing hands ownership to the consumer, which is what the
   * attribute in `<helix-dialog open>` does as well: from then on the element
   * announces changes and applies none of them.
   *
   * It reads as an accessor pair rather than a field because those are two
   * different questions sharing one name, and the alternative was a second
   * property answering the first. That worked for a boolean, where `isOpen`
   * reads well; there is no such word for a value or an active item, so all
   * four of these mixins now have this shape instead of two shapes.
   *
   * **Not reflected, and that is required rather than tidy.** Reflection
   * writes the resolved state back as an attribute, and writing the attribute
   * is how a consumer says they own it. So an uncontrolled element that
   * opened itself would put `open` on its own host and, from the next thing
   * that read it, be indistinguishable from one the consumer controls:
   * cloned, serialised for hydration, or diffed by a framework, it would come
   * back controlled and stop responding. `data-open` carries the resolved
   * state for stylesheets, which is what it has always been for.
   * - `default-open`/`defaultOpen`: Initial open state for uncontrolled use, where nothing declared one.
   * - `onOpenChange`: The consumer's callback, invoked after the state is applied.
   *
   * Not an attribute: it is a function. And not reachable from React's JSX,
   * which reserves every `on[A-Z]` prop for its own event system and drops
   * what it does not recognize; the generated wrapper listens for the events
   * instead. (property only)
   *
   * ## Events
   *
   * Events that will be emitted by the component.
   *
   * - `helix-open`: Fired before it opens, and cancelable.
   * - `helix-close`: Fired before it closes, and cancelable.
   * - `helix-select`: Fired when an item is chosen.
   *
   * ## Slots
   *
   * Areas where markup can be added to the component.
   *
   * - `(default)`: The items.
   * - `trigger`: What opens it.
   *
   * ## Methods
   *
   * Methods that can be called to access component functionality.
   *
   * - `show() => void`: Opens the menu.
   * - `hide() => void`: Closes the menu, and forgets which page was showing.
   * - `requestOpen(next: boolean) => boolean`: Requests an open-state change, and reports whether it was applied.
   *
   * Announces before it acts, so `preventDefault()` on the `helix-open` or
   * `helix-close` is a refusal and nothing moves. In uncontrolled mode the
   * element then updates itself; in controlled mode it applies nothing and
   * waits for the consumer to pass a new `open`, which is what "controlled"
   * means.
   * - `toggleOpen() => boolean`: Requests the opposite of the current state.
   *
   * ## CSS Parts
   *
   * Custom selectors for styling elements within the component.
   *
   * - `surface`: The floating panel the menu is drawn on.
   * - `menu`: The surface.
   * - `header`: The bar above a submenu, holding the way back and its name.
   * - `back`: The control that returns from a submenu.
   * - `title`: The name of the submenu that is showing.
   */
  "helix-base-menu": Partial<
    HelixBaseMenuProps & BaseProps<HelixBaseMenu> & BaseEvents
  >;

  /**
   * Renders a real `<nav>`, which is the landmark a screen-reader user jumps to.
   * It exists as its own component rather than as a region of `AppHeader` because
   * a header is not inherently navigation, and navigation is not only ever in a
   * header: a footer and a sidebar hold the same thing.
   *
   * **It renders no links.** The consumer brings them, marked with
   * `aria-current="page"` and styled by the `data-navigation-item` recipe, for the same
   * reason nothing else here renders an anchor: a router renders its own, and
   * cannot render it inside this shadow root.
   *
   * What this owns is the marker that travels between them, and that is the whole
   * reason it is a component. A marker that moves needs something that knows
   * where every item is, and reading `aria-current` is how it knows which: the
   * thing that makes the page announce correctly is the same thing that puts the
   * marker in the right place.
   *
   * ## Attributes & Properties
   *
   * Component attributes and properties that can be applied to the element or by using JavaScript.
   *
   * - `label`: Accessible name for the landmark.
   *
   * ## Slots
   *
   * Areas where markup can be added to the component.
   *
   * - `(default)`: The destinations, as the consumer's own links.
   *
   * ## CSS Parts
   *
   * Custom selectors for styling elements within the component.
   *
   * - `nav`: The navigation landmark.
   * - `indicator`: The marker that travels to the current destination.
   */
  "helix-base-navigation": Partial<
    HelixBaseNavigationProps & BaseProps<HelixBaseNavigation> & BaseEvents
  >;

  /**
   * A heading over a set, and nothing else: it holds no selection and no value,
   * because grouping is presentation over a list whose owner is the listbox. Its
   * options are still the listbox's options, which is what keeps the keyboard
   * moving through a grouped list exactly as it moves through a flat one.
   *
   * `role="group"` named by the heading, so a screen reader announces which run
   * an option is in without the heading becoming something to land on.
   *
   * ## Attributes & Properties
   *
   * Component attributes and properties that can be applied to the element or by using JavaScript.
   *
   * - `label`: The heading over the run.
   *
   * ## Slots
   *
   * Areas where markup can be added to the component.
   *
   * - `(default)`: The options in this run.
   * - `label`: Richer than a string.
   *
   * ## CSS Parts
   *
   * Custom selectors for styling elements within the component.
   *
   * - `label`: The heading.
   * - `items`: The run itself.
   */
  "helix-base-option-group": Partial<
    HelixBaseOptionGroupProps & BaseProps<HelixBaseOptionGroup> & BaseEvents
  >;

  /**
   * **Its own family rather than a part of Select, and the reason is what it
   * belongs to.** `role="option"` requires an owning `role="listbox"`, which is
   * the ARIA contract: an option cannot stand alone. But a Select is *a listbox
   * with a trigger*, a Combobox is *a listbox with a text input*, and a command
   * palette is the same listbox again. The thing an option belongs to is the
   * listbox, not any one control that happens to contain one.
   *
   * That is the difference from `Radio`, which is a part of its group: a radio
   * has exactly one kind of owner, and an option has several.
   *
   * Selection is announced rather than applied, the way a radio's is. The option
   * says it was chosen, the listbox decides whether that stands, and the listbox
   * writes `selected` back. An option that selected itself would be a second
   * answer to which one is chosen.
   *
   * **Nothing here knows about filtering.** A hidden option is hidden by whatever
   * owns it, through `hidden`, because what counts as a match is the listbox's
   * question and differs between a select and a command palette.
   *
   * ## Attributes & Properties
   *
   * Component attributes and properties that can be applied to the element or by using JavaScript.
   *
   * - `disabled`: Whether this choice can be made.
   * - `data-active`/`active`: Whether this is the option the keyboard is on. Written by the listbox.
   * - `selected`: Whether this choice is currently chosen. Written by the listbox.
   * - `value`: Identifies this choice, and is what a form submits.
   * - `text`: The words, for a listbox that has to match text against them.
   *
   * Read from the rendered content rather than required as a property, because
   * the content is where a consumer naturally puts it and asking for both is
   * asking for two things to disagree. (property only) (readonly)
   *
   * ## Events
   *
   * Events that will be emitted by the component.
   *
   * - `helix-select`: Fired when this choice is made.
   *
   * ## Slots
   *
   * Areas where markup can be added to the component.
   *
   * - `(default)`: The words naming this choice.
   * - `start`: Before the words, for an icon or an avatar.
   * - `end`: After them, for a shortcut or a count.
   *
   * ## Methods
   *
   * Methods that can be called to access component functionality.
   *
   * - `select() => void`: Makes this choice and announces it.
   *
   * ## CSS Parts
   *
   * Custom selectors for styling elements within the component.
   *
   * - `item`: The row.
   * - `label`: The words.
   */
  "helix-base-option": Partial<
    HelixBaseOptionProps & BaseProps<HelixBaseOption> & BaseEvents
  >;

  /**
   * A table of contents, named for the job. Three of the obvious names are taken
   * by things that are not this: `Outline` is a CSS property and the focus ring's
   * whole vocabulary, `Contents` is `display: contents` and the `content` part
   * half this library renders, and `TableOfContents` would sit beside `Table` and
   * `TableColumn` and read as a third part of that family. `Outline` sits beside
   * `Navigation`, which is the same job at the other scale: one navigates a site, the
   * other navigates a document.
   *
   * **The links are the consumer's own anchors**, the same as `Navigation`. A router
   * renders its own `<a>` and cannot render one inside this shadow root, and the
   * hrefs are fragments the page already knows.
   *
   * **What is current is decided by position, not by intersection.** The obvious
   * build is an `IntersectionObserver` with a thin band near the top of the
   * window, and it fails in both directions: with headings far apart nothing is
   * in the band and the marker goes out entirely, and with headings close
   * together several are and it flickers between them. So the observer is only
   * the *trigger*, and the answer is computed from where the headings actually
   * are: the current section is the last one whose top has passed the reading
   * line, or the first heading before any of them has.
   *
   * That rule is what a reader means. Two headings on screen at once are not
   * ambiguous to a person: they are reading under the upper one.
   *
   * **`aria-current="location"`, and it is written onto the consumer's anchor.**
   * This library does not normally write to light-DOM children, because an
   * attribute added after upgrade is one a server's markup never had. It is right
   * here for the reason `Carousel` names its slides: what is current is derived
   * from scroll position, so no server could have rendered it and there is
   * nothing for hydration to disagree with. `location` rather than `page`, which
   * is what `Navigation` uses: `page` means this is the page, and every one of these
   * is the same page.
   *
   * ## Attributes & Properties
   *
   * Component attributes and properties that can be applied to the element or by using JavaScript.
   *
   * - `label`: Accessible name for the navigation.
   * - `offset`: How far below the top of the window a heading counts as reached, in pixels.
   *
   * The reading line. A page with a sticky masthead sets this to its height, or
   * a little more: without it the current section changes as a heading slides
   * under the chrome rather than as it reaches the top of what can be seen.
   * - `current`: The id of the section being read, or empty before anything is measured.
   *
   * Read-only, and a getter rather than a property for that reason: it is
   * derived from where the page is scrolled to, so a consumer setting it would
   * be overwritten by the next thing that crossed the reading line. Every other
   * writable property in this library that a component also writes is state a
   * consumer can own; this one cannot be, and saying so with the type is better
   * than saying it in a sentence nobody reads. (property only) (readonly)
   *
   * ## Slots
   *
   * Areas where markup can be added to the component.
   *
   * - `(default)`: The links, as anchors with fragment hrefs.
   *
   * ## CSS Parts
   *
   * Custom selectors for styling elements within the component.
   *
   * - `nav`: The navigation landmark.
   * - `indicator`: The mark that travels to the section being read.
   */
  "helix-base-outline": Partial<
    HelixBaseOutlineProps & BaseProps<HelixBaseOutline> & BaseEvents
  >;

  /**
   * The general case the specific overlays are versions of. `Menu` holds
   * commands, `Select` holds options, `Tooltip` holds a description; this holds
   * whatever the consumer puts in it, which is why it has no keyboard of its own
   * and no opinion about what is inside.
   *
   * **The trigger is slotted and stays the consumer's own element.** Nothing is
   * written onto it: no `aria-expanded`, no `id`, no `tabindex`. A component that
   * decorates a consumer's markup after upgrading is a component whose output a
   * React consumer's hydration disagrees with, and the attribute they would care
   * about most is the one that changes on every open.
   *
   * **The panel is in the top layer**, through the popover API, so it clears any
   * ancestor with `overflow: hidden` without a `z-index` fight. `position: fixed`
   * does not do that: it is still clipped by `overflow`, and re-anchored entirely
   * by an ancestor carrying `transform`, `filter` or `contain`.
   *
   * **It opens on click, and from a command.** `command="--show"` and its
   * siblings work here the way they do on `Dialog` and `Drawer`, so a trigger
   * elsewhere on the page can open it without a line of script and without being
   * slotted into it.
   *
   * ## Attributes & Properties
   *
   * Component attributes and properties that can be applied to the element or by using JavaScript.
   *
   * - `label`: Accessible name for the panel.
   * - `offset`: Space between the trigger and the panel, in pixels.
   * - `placement`: Preferred side. It moves if that side does not fit.
   * - `open`: Whether the element is open.
   *
   * One property, not two. Reading gives the real state whichever mode the
   * element is in, so `dialog.open` answers the question anyone asking it
   * meant. Writing hands ownership to the consumer, which is what the
   * attribute in `<helix-dialog open>` does as well: from then on the element
   * announces changes and applies none of them.
   *
   * It reads as an accessor pair rather than a field because those are two
   * different questions sharing one name, and the alternative was a second
   * property answering the first. That worked for a boolean, where `isOpen`
   * reads well; there is no such word for a value or an active item, so all
   * four of these mixins now have this shape instead of two shapes.
   *
   * **Not reflected, and that is required rather than tidy.** Reflection
   * writes the resolved state back as an attribute, and writing the attribute
   * is how a consumer says they own it. So an uncontrolled element that
   * opened itself would put `open` on its own host and, from the next thing
   * that read it, be indistinguishable from one the consumer controls:
   * cloned, serialised for hydration, or diffed by a framework, it would come
   * back controlled and stop responding. `data-open` carries the resolved
   * state for stylesheets, which is what it has always been for.
   * - `default-open`/`defaultOpen`: Initial open state for uncontrolled use, where nothing declared one.
   * - `onOpenChange`: The consumer's callback, invoked after the state is applied.
   *
   * Not an attribute: it is a function. And not reachable from React's JSX,
   * which reserves every `on[A-Z]` prop for its own event system and drops
   * what it does not recognize; the generated wrapper listens for the events
   * instead. (property only)
   *
   * ## Events
   *
   * Events that will be emitted by the component.
   *
   * - `helix-open`: Fired before it opens, and cancelable.
   * - `helix-close`: Fired before it closes, and cancelable.
   *
   * ## Slots
   *
   * Areas where markup can be added to the component.
   *
   * - `trigger`: What opens it.
   * - `(default)`: The contents of the panel.
   *
   * ## Methods
   *
   * Methods that can be called to access component functionality.
   *
   * - `show() => void`: Opens the panel.
   * - `hide() => void`: Closes the panel and puts focus back on the trigger.
   * - `requestOpen(next: boolean) => boolean`: Requests an open-state change, and reports whether it was applied.
   *
   * Announces before it acts, so `preventDefault()` on the `helix-open` or
   * `helix-close` is a refusal and nothing moves. In uncontrolled mode the
   * element then updates itself; in controlled mode it applies nothing and
   * waits for the consumer to pass a new `open`, which is what "controlled"
   * means.
   * - `toggleOpen() => boolean`: Requests the opposite of the current state.
   *
   * ## CSS Parts
   *
   * Custom selectors for styling elements within the component.
   *
   * - `content`: The scrolling region inside the panel.
   * - `popover`: The panel.
   */
  "helix-base-popover": Partial<
    HelixBasePopoverProps & BaseProps<HelixBasePopover> & BaseEvents
  >;

  /**
   * Determinate by default, and `indeterminate` for a task whose total is not
   * known yet. `Spinner` is still the right answer where the wait is short or has
   * no place of its own on the page; a bar earns its width where the work is the
   * subject of the region it sits in.
   *
   * A bar that fills at a made-up rate would be a bar that lies, so the
   * indeterminate one does not fill: it runs a segment across the track, which
   * says work is happening and claims no proportion at all. `aria-valuenow` is
   * omitted with it, which is the platform's own signal for the same thing.
   *
   * **The fill is a percentage of the track, written as a custom property.** It
   * is derived from `value` and `max` rather than measured, so it renders on a
   * server with no layout and needs nothing after upgrade. That is what keeps it
   * out of the class of geometry this library writes only on the client.
   *
   * **`value` is clamped, and out-of-range input is not an error.** A count that
   * runs past its own total is ordinary in real applications, and a bar that
   * overflows its track or reports `aria-valuenow` above `aria-valuemax` is worse
   * than one that reads as finished.
   *
   * Semantics are on the host through `ElementInternals`, the same as everywhere
   * else: a `role` in the shadow root announces correctly and leaves the host
   * anonymous to anything walking the light DOM, and a `role` written onto the
   * host as an attribute is one a server's markup never had.
   *
   * ## Attributes & Properties
   *
   * Component attributes and properties that can be applied to the element or by using JavaScript.
   *
   * - `label`: Accessible name for what is in progress.
   * - `indeterminate`: Whether the work has a knowable end.
   *
   * On the headless tier rather than as an `appearance`, because it is
   * semantics before it is a picture: a progressbar with no `aria-valuenow` is
   * how the platform says "running, and nobody knows how far", and a reader on
   * a screen reader is told that rather than being read a number that means
   * nothing. `value` and `max` are ignored while it is set.
   *
   * Not `Spinner`, which is the other thing this could be. A spinner says the
   * page is busy; a bar says a named piece of work is running, and keeps its
   * place in the layout when the answer arrives and it becomes determinate.
   * - `max`: The total the work is measured against.
   * - `value`: What has been done so far, in the same units as `max`.
   *
   * Clamped between zero and `max` for both the fill and the announcement, so
   * the two can never disagree about what is on screen.
   * - `value-text`/`valueText`: A reading for the value, where the number alone does not say enough.
   *
   * "3 of 8 files" rather than "37". Announced instead of the percentage, and
   * never instead of the value itself: `aria-valuenow` still carries the
   * number, because assistive technology that ignores the text still has to
   * report progress.
   * - `fraction`: What is done, as a fraction of the whole, between 0 and 1. (property only) (readonly)
   *
   * ## CSS Parts
   *
   * Custom selectors for styling elements within the component.
   *
   * - `track`: The full length the work is measured against.
   * - `indicator`: The part of it that is done.
   */
  "helix-base-progress": Partial<
    HelixBaseProgressProps & BaseProps<HelixBaseProgress> & BaseEvents
  >;

  /**
   * Renders a real `<q>`, which is what supplies the quotation marks: the browser
   * inserts the right ones for the document's language, and nests them correctly
   * when one quotation sits inside another. Typing the marks into the content
   * instead gets both of those wrong in every language but one.
   *
   * A passage set off from the prose rather than run inside it is a blockquote,
   * which is a different element for a different job.
   *
   * ## Attributes & Properties
   *
   * Component attributes and properties that can be applied to the element or by using JavaScript.
   *
   * - `cite`: URL identifying where the quotation came from.
   *
   * ## Slots
   *
   * Areas where markup can be added to the component.
   *
   * - `(default)`: The quoted text.
   *
   * ## CSS Parts
   *
   * Custom selectors for styling elements within the component.
   *
   * - `quote`: The quotation.
   */
  "helix-base-quote": Partial<
    HelixBaseQuoteProps & BaseProps<HelixBaseQuote> & BaseEvents
  >;

  /**
   * **The group is the control, and the radios are its options.** This is the
   * asymmetry with checkboxes and it comes from what a form submits: a set of
   * checkboxes is several answers and each box submits its own, while a set of
   * radios is one answer, so the group owns the `name`, the `value` and the
   * validity, and a lone radio outside a group is not a control at all.
   *
   * Which is also why `MixinField` lands here and not on `Radio`: the label, the
   * hint and the message are about the question, and the question is the set.
   *
   * Selection travels up and state travels down. An item announces that it was
   * chosen, the group decides whether that stands, and the group writes
   * `selected` onto every item. Nothing sets itself, so there is one answer to
   * "which one is on" rather than one per item.
   *
   * `value` and `defaultValue` are separate for the reason `checked` and
   * `defaultChecked` are: `value` is the answer now, `defaultValue` is what the
   * markup asked for, which is where a reset returns and is gone the moment
   * anything is chosen.
   *
   * ## Attributes & Properties
   *
   * Component attributes and properties that can be applied to the element or by using JavaScript.
   *
   * - `orientation`: Which way the choices run. A column reads one line per answer.
   * - `default-value`/`defaultValue`: The value the markup declared, which is where a reset returns to.
   * - `value`: What the control holds now, and what its form submits.
   *
   * One property, not two. Reading gives the real value whichever mode the
   * control is in, so `input.value` answers the question anyone asking it
   * meant. Writing hands ownership to the consumer, which is what
   * `<helix-input value="x">` says too, and matches what a controlled input
   * means in React: the value is theirs and the control waits to be told.
   * `default-value` is how markup seeds one it does not want to own.
   *
   * The same shape as the other three mixins, which is the point of them
   * being four of a kind rather than four of three kinds.
   * - `hint`: Help under the control, shown while there is nothing wrong.
   * - `feedback`: What is wrong, in the reader's words rather than the browser's.
   * - `label`: The accessible name, and the fallback for the `label` slot.
   * - `required`: Whether the form refuses to submit without it.
   * - `disabled`: Whether the control is non-interactive.
   *
   * Reflected, because the styled tier selects on it, and mirrored to
   * `aria-disabled` rather than removing the element from the accessibility
   * tree, so a screen reader can still announce that the control exists.
   * - `name`: Name submitted with the form.
   *
   * **Reflected, and it is the exception to "reflect only what CSS selects
   * on".** The platform builds a form's entry list from the `name` *content
   * attribute*, not from the property, so a control named through the property
   * submitted under no name at all and was silently dropped. Measured: two
   * inputs in one form, one named by attribute and one by property, and the
   * form carried a single entry.
   *
   * Safe for a React consumer, which is what the rule is protecting: React
   * renders a custom element's props as attributes on the server, so the name
   * is already in the markup being hydrated and reflecting it writes what is
   * there. It is only a change to the markup when a consumer assigns it
   * imperatively later, and nothing is hydrating by then.
   *
   * Here rather than on each control, where it was declared eight times and
   * reflected none of them.
   * - `items`: The radios, in light-DOM order. Client only: the server has no tree. (property only) (readonly)
   * - `onValueChange`: The consumer's callback, invoked after the value is applied.
   *
   * Not an attribute: it is a function. `onValueChange` and not `onChange`,
   * because React reserves the latter for its own synthetic system and wires
   * it to the native `change`, so a Helix event named `Change` would never
   * fire at all. (property only)
   * - `resolvedFeedback`: The message actually shown: the consumer's, or the platform's, or none. (property only) (readonly)
   * - `describedBy`: Id of the description node, for `aria-describedby` on the control.
   *
   * One at a time, because only one of the two is ever rendered. Naming both
   * would point a screen reader at an id that resolves to nothing, which it
   * reads as a description it cannot find. (property only) (readonly)
   * - `isDisabled`: Whether the control is off, by its own attribute or by an ancestor.
   *
   * What a component should bind to rather than `disabled`, which is only the
   * half of it the consumer wrote. (property only) (readonly)
   * - `form`: The form this control belongs to, if any. (property only) (readonly)
   * - `labels`: Labels associated with this control. (property only) (readonly)
   *
   * ## Events
   *
   * Events that will be emitted by the component.
   *
   * - `helix-change`: Fired when the answer changes, and cancelable.
   *
   * ## Slots
   *
   * Areas where markup can be added to the component.
   *
   * - `(default)`: The radios.
   * - `label`: Richer than a string, where the question is more than one.
   * - `hint`: Richer than a string.
   *
   * ## Methods
   *
   * Methods that can be called to access component functionality.
   *
   * - `requestValue(next: string) => boolean`: Requests a new value, and reports whether the request stood.
   *
   * Announces before it acts, so `preventDefault()` on the `helix-change` is
   * a refusal and nothing moves. In uncontrolled mode the control then
   * updates itself; in controlled mode it applies nothing and waits for the
   * consumer to pass a new `value`, which is what controlled means.
   * - `formResetCallback() => void`: Returns the control to the value its markup declared.
   *
   * Both halves are dropped, the consumer's and the control's, because a
   * reset means the form is as it was served. Clearing only the internal one
   * would leave a control that had been written to stuck at that value.
   * - `formStateRestoreCallback(state: string | null) => void`: Restores the value when the browser brings a form back.
   *
   * Falling back to `defaultValue` rather than to empty, because a restore
   * with no state is a form the browser has nothing recorded for, which is
   * the same situation as a fresh one.
   * - `formDisabledCallback(disabled: boolean) => void`: The platform's notice that an ancestor fieldset changed.
   *
   * ## CSS Parts
   *
   * Custom selectors for styling elements within the component.
   *
   * - `label`: The question, over the set.
   * - `items`: The choices, which is what `orientation` lays out.
   * - `hint`: Help under the set.
   * - `feedback`: What is wrong with it.
   */
  "helix-base-radio-group": Partial<
    HelixBaseRadioGroupProps & BaseProps<HelixBaseRadioGroup> & BaseEvents
  >;

  /**
   * Renders a `<button role="radio">`, not an `<input type="radio">`, and the
   * reason is the shadow boundary rather than preference: native radios group by
   * sharing a `name` within a form, and a radio inside a shadow root cannot join
   * a group on the other side of it. The group is the form control here, so the
   * option only has to say what it is and announce when it is chosen.
   *
   * **It carries no label of its own.** A radio is named by the words beside it,
   * which is its own content, and the label, hint and message of the *set* belong
   * to the group. This is the one control in the family that takes nothing from
   * `MixinField`, because a lone radio is not a control: it is an answer to one.
   *
   * Selection is announced rather than applied. The item dispatches, the group
   * decides, and the group writes `selected` back. An item that set itself would
   * be a second source of truth for which one is on.
   *
   * ## Attributes & Properties
   *
   * Component attributes and properties that can be applied to the element or by using JavaScript.
   *
   * - `disabled`: Whether this choice can be made.
   * - `selected`: Whether this is the current choice. Written by the group.
   * - `value`: Identifies this choice to the group, and is what the form submits.
   *
   * ## Events
   *
   * Events that will be emitted by the component.
   *
   * - `helix-select`: Fired when this choice is made.
   *
   * ## Slots
   *
   * Areas where markup can be added to the component.
   *
   * - `(default)`: The words naming this choice.
   *
   * ## Methods
   *
   * Methods that can be called to access component functionality.
   *
   * - `focusItem() => void`: Moves focus to this choice, for the group's arrow keys.
   * - `select() => void`: Makes this choice and announces it.
   *
   * ## CSS Parts
   *
   * Custom selectors for styling elements within the component.
   *
   * - `item`: The button, which is the whole row.
   * - `box`: The circle.
   * - `mark`: The dot inside it.
   * - `label`: The words beside it.
   */
  "helix-base-radio": Partial<
    HelixBaseRadioProps & BaseProps<HelixBaseRadio> & BaseEvents
  >;

  /**
   * **A trigger and a `Listbox`, not a listbox reimplemented behind a button.**
   * The list this opens is the same element a consumer can use on its own, with
   * the same keyboard, the same filtering and the same multi-select rules. What
   * Select adds is the closing: a trigger that says what is chosen, a surface
   * that floats, and somewhere for focus to go back to.
   *
   * The options are the consumer's, in the consumer's light DOM, slotted through
   * into the listbox. That is why the listbox walks through slots to find them:
   * from its point of view the options belong to something else.
   *
   * **What it does not do is duplicate the value.** `Select` owns it, hands it
   * down, and takes changes back; the listbox is the thing being operated and not
   * a second place the answer lives.
   *
   * ## Attributes & Properties
   *
   * Component attributes and properties that can be applied to the element or by using JavaScript.
   *
   * - `filterable`: Whether the list can be narrowed by typing.
   *
   * Passed to the listbox rather than acted on here, because the listbox owns
   * the filtering, the empty state and the keyboard. This property existed and
   * was never read: it reflected, it type-checked, and nothing anywhere
   * rendered a field. API that does nothing is worse than API that is missing,
   * because a consumer sets it and believes it.
   * - `multiple`: Whether more than one option can be the answer.
   * - `placeholder`: Shown on the trigger while nothing is chosen.
   * - `open`: Whether the element is open.
   *
   * One property, not two. Reading gives the real state whichever mode the
   * element is in, so `dialog.open` answers the question anyone asking it
   * meant. Writing hands ownership to the consumer, which is what the
   * attribute in `<helix-dialog open>` does as well: from then on the element
   * announces changes and applies none of them.
   *
   * It reads as an accessor pair rather than a field because those are two
   * different questions sharing one name, and the alternative was a second
   * property answering the first. That worked for a boolean, where `isOpen`
   * reads well; there is no such word for a value or an active item, so all
   * four of these mixins now have this shape instead of two shapes.
   *
   * **Not reflected, and that is required rather than tidy.** Reflection
   * writes the resolved state back as an attribute, and writing the attribute
   * is how a consumer says they own it. So an uncontrolled element that
   * opened itself would put `open` on its own host and, from the next thing
   * that read it, be indistinguishable from one the consumer controls:
   * cloned, serialised for hydration, or diffed by a framework, it would come
   * back controlled and stop responding. `data-open` carries the resolved
   * state for stylesheets, which is what it has always been for.
   * - `default-open`/`defaultOpen`: Initial open state for uncontrolled use, where nothing declared one.
   * - `default-value`/`defaultValue`: The value the markup declared, which is where a reset returns to.
   * - `value`: What the control holds now, and what its form submits.
   *
   * One property, not two. Reading gives the real value whichever mode the
   * control is in, so `input.value` answers the question anyone asking it
   * meant. Writing hands ownership to the consumer, which is what
   * `<helix-input value="x">` says too, and matches what a controlled input
   * means in React: the value is theirs and the control waits to be told.
   * `default-value` is how markup seeds one it does not want to own.
   *
   * The same shape as the other three mixins, which is the point of them
   * being four of a kind rather than four of three kinds.
   * - `hint`: Help under the control, shown while there is nothing wrong.
   * - `feedback`: What is wrong, in the reader's words rather than the browser's.
   * - `label`: The accessible name, and the fallback for the `label` slot.
   * - `required`: Whether the form refuses to submit without it.
   * - `disabled`: Whether the control is non-interactive.
   *
   * Reflected, because the styled tier selects on it, and mirrored to
   * `aria-disabled` rather than removing the element from the accessibility
   * tree, so a screen reader can still announce that the control exists.
   * - `name`: Name submitted with the form.
   *
   * **Reflected, and it is the exception to "reflect only what CSS selects
   * on".** The platform builds a form's entry list from the `name` *content
   * attribute*, not from the property, so a control named through the property
   * submitted under no name at all and was silently dropped. Measured: two
   * inputs in one form, one named by attribute and one by property, and the
   * form carried a single entry.
   *
   * Safe for a React consumer, which is what the rule is protecting: React
   * renders a custom element's props as attributes on the server, so the name
   * is already in the markup being hydrated and reflecting it writes what is
   * there. It is only a change to the markup when a consumer assigns it
   * imperatively later, and nothing is hydrating by then.
   *
   * Here rather than on each control, where it was declared eight times and
   * reflected none of them.
   * - `onOpenChange`: The consumer's callback, invoked after the state is applied.
   *
   * Not an attribute: it is a function. And not reachable from React's JSX,
   * which reserves every `on[A-Z]` prop for its own event system and drops
   * what it does not recognize; the generated wrapper listens for the events
   * instead. (property only)
   * - `onValueChange`: The consumer's callback, invoked after the value is applied.
   *
   * Not an attribute: it is a function. `onValueChange` and not `onChange`,
   * because React reserves the latter for its own synthetic system and wires
   * it to the native `change`, so a Helix event named `Change` would never
   * fire at all. (property only)
   * - `resolvedFeedback`: The message actually shown: the consumer's, or the platform's, or none. (property only) (readonly)
   * - `describedBy`: Id of the description node, for `aria-describedby` on the control.
   *
   * One at a time, because only one of the two is ever rendered. Naming both
   * would point a screen reader at an id that resolves to nothing, which it
   * reads as a description it cannot find. (property only) (readonly)
   * - `isDisabled`: Whether the control is off, by its own attribute or by an ancestor.
   *
   * What a component should bind to rather than `disabled`, which is only the
   * half of it the consumer wrote. (property only) (readonly)
   * - `form`: The form this control belongs to, if any. (property only) (readonly)
   * - `labels`: Labels associated with this control. (property only) (readonly)
   *
   * ## Events
   *
   * Events that will be emitted by the component.
   *
   * - `helix-change`: Relayed from the listbox when the answer changes.
   * - `helix-open`: Fired when the list opens.
   * - `helix-close`: Fired when it closes.
   *
   * ## Slots
   *
   * Areas where markup can be added to the component.
   *
   * - `(default)`: The options, and any groups of them.
   * - `indicator`: The mark on the trigger saying this opens, usually a caret.
   * - `label`: Richer than a string.
   * - `hint`: Richer than a string.
   *
   * ## Methods
   *
   * Methods that can be called to access component functionality.
   *
   * - `requestOpen(next: boolean) => boolean`: Requests an open-state change, and reports whether it was applied.
   *
   * Announces before it acts, so `preventDefault()` on the `helix-open` or
   * `helix-close` is a refusal and nothing moves. In uncontrolled mode the
   * element then updates itself; in controlled mode it applies nothing and
   * waits for the consumer to pass a new `open`, which is what "controlled"
   * means.
   * - `toggleOpen() => boolean`: Requests the opposite of the current state.
   * - `requestValue(next: string) => boolean`: Requests a new value, and reports whether the request stood.
   *
   * Announces before it acts, so `preventDefault()` on the `helix-change` is
   * a refusal and nothing moves. In uncontrolled mode the control then
   * updates itself; in controlled mode it applies nothing and waits for the
   * consumer to pass a new `value`, which is what controlled means.
   * - `formResetCallback() => void`: Returns the control to the value its markup declared.
   *
   * Both halves are dropped, the consumer's and the control's, because a
   * reset means the form is as it was served. Clearing only the internal one
   * would leave a control that had been written to stuck at that value.
   * - `formStateRestoreCallback(state: string | null) => void`: Restores the value when the browser brings a form back.
   *
   * Falling back to `defaultValue` rather than to empty, because a restore
   * with no state is a form the browser has nothing recorded for, which is
   * the same situation as a fresh one.
   * - `formDisabledCallback(disabled: boolean) => void`: The platform's notice that an ancestor fieldset changed.
   *
   * ## CSS Parts
   *
   * Custom selectors for styling elements within the component.
   *
   * - `label`: The question, over the trigger.
   * - `value`: The chosen option's text inside the trigger.
   * - `trigger`: The closed control, which says what is chosen.
   * - `surface`: The floating panel.
   * - `listbox`: The list inside it.
   * - `hint`: Help under the trigger.
   * - `feedback`: What is wrong with it.
   */
  "helix-base-select": Partial<
    HelixBaseSelectProps & BaseProps<HelixBaseSelect> & BaseEvents
  >;

  /**
   * Carries `aria-busy` and a polite live region, so a reader using a screen
   * reader is told the region is filling rather than told nothing and left to
   * wonder. Both go through `ElementInternals`, which writes no attribute.
   *
   * Holds no `shape`. Whether a placeholder is a line, a block or a circle is
   * presentation, and putting it here would give the headless tier an appearance
   * property, which is the one thing that tier is for not having.
   *
   * ## CSS Parts
   *
   * Custom selectors for styling elements within the component.
   *
   * - `skeleton`: The placeholder surface.
   */
  "helix-base-skeleton": Partial<
    HelixBaseSkeletonProps & BaseProps<HelixBaseSkeleton> & BaseEvents
  >;

  /**
   * A real `<input type="range">`, so the drag, the arrow keys, Home and End, the
   * page keys and the touch target are all the platform's. Every one of those is
   * a thing a hand-built slider gets wrong, and the last is the one nobody
   * notices: a native range has a hit area larger than its thumb, sized by the
   * platform for a finger.
   *
   * **The value is a string, like every other form control's.** A range submits
   * text and `MixinControllerValue` holds text, so the number is a reading of the
   * value rather than the value itself. `valueAsNumber` is there for anything
   * doing arithmetic on it.
   *
   * **Marks are drawn rather than left to `<datalist>`**, which was the first
   * answer and is the wrong one. A datalist's ticks cannot be styled at all, and
   * Firefox does not render them for a range at all, so the platform's version is
   * a mark that looks like someone else's design where it appears and no mark
   * where it does not. Drawing them costs the semantics nothing, because a mark
   * is decoration: what a reader can actually land on is `step`, which the input
   * enforces whether or not anything is drawn.
   *
   * `markers` is a count rather than a flag tied to `step`. A flag reads well
   * until a slider from zero to a hundred stepping by one asks for a hundred and
   * one ticks, and then it is either noise or a silent refusal to draw. A number
   * is what the reader sees, so it cannot surprise anyone.
   *
   * ## Attributes & Properties
   *
   * Component attributes and properties that can be applied to the element or by using JavaScript.
   *
   * - `max`: The largest value the reader can choose.
   * - `min`: The smallest value the reader can choose.
   * - `show-value`/`showValue`: Whether the chosen value is shown beside the track.
   * - `markers`: How many marks to draw along the track, evenly spaced, ends included.
   *
   * `0` or `1` draws none: one mark on a track says nothing about a range.
   * They are decoration, so they are `aria-hidden`; what a reader can land on
   * is `step`, which the input enforces regardless.
   *
   * **Each one is snapped to a step before it is placed.** Evenly spaced and
   * on a step are two different things, and asking for four marks across a
   * hundred in twenty-fives wants them at 0, 33.3, 66.7 and 100: two of those
   * are places the thumb cannot go. A mark the thumb can never sit on is the
   * one thing a mark must not be, so the spacing gives way rather than the
   * step, and marks may come out unevenly spaced when the two disagree. That
   * is the honest picture of the range being offered.
   * - `marker-labels`/`markerLabels`: Mirrors "there are marks" for the stylesheet.
   *
   * The whole marker layout hung off `:host([markers])` and `markers` does not
   * reflect, so `slider.markers = 5` drew nothing at all: only the attribute
   * written in the markup ever worked, and the property that is the documented
   * API silently did not.
   *
   * Reflecting the count instead would put `markers="0"` on every slider, an
   * attribute the server's markup does not have and one that selector would
   * match, drawing the layout for no marks. So the boolean fact is mirrored to
   * a `data-` name, which is the rule this library already follows for state:
   * the stylesheet wants to know whether there are marks, not how many. How
   * many is what `markerValues` answers, and `< 2` is where it already draws
   * the line.
   *
   * /** Whether each mark says which value it stands at.
   * - `step`: How far one press of an arrow key moves it.
   * - `default-value`/`defaultValue`: The value the markup declared, which is where a reset returns to.
   * - `value`: What the control holds now, and what its form submits.
   *
   * One property, not two. Reading gives the real value whichever mode the
   * control is in, so `input.value` answers the question anyone asking it
   * meant. Writing hands ownership to the consumer, which is what
   * `<helix-input value="x">` says too, and matches what a controlled input
   * means in React: the value is theirs and the control waits to be told.
   * `default-value` is how markup seeds one it does not want to own.
   *
   * The same shape as the other three mixins, which is the point of them
   * being four of a kind rather than four of three kinds.
   * - `hint`: Help under the control, shown while there is nothing wrong.
   * - `feedback`: What is wrong, in the reader's words rather than the browser's.
   * - `label`: The accessible name, and the fallback for the `label` slot.
   * - `required`: Whether the form refuses to submit without it.
   * - `disabled`: Whether the control is non-interactive.
   *
   * Reflected, because the styled tier selects on it, and mirrored to
   * `aria-disabled` rather than removing the element from the accessibility
   * tree, so a screen reader can still announce that the control exists.
   * - `name`: Name submitted with the form.
   *
   * **Reflected, and it is the exception to "reflect only what CSS selects
   * on".** The platform builds a form's entry list from the `name` *content
   * attribute*, not from the property, so a control named through the property
   * submitted under no name at all and was silently dropped. Measured: two
   * inputs in one form, one named by attribute and one by property, and the
   * form carried a single entry.
   *
   * Safe for a React consumer, which is what the rule is protecting: React
   * renders a custom element's props as attributes on the server, so the name
   * is already in the markup being hydrated and reflecting it writes what is
   * there. It is only a change to the markup when a consumer assigns it
   * imperatively later, and nothing is hydrating by then.
   *
   * Here rather than on each control, where it was declared eight times and
   * reflected none of them.
   * - `valueAsNumber`: The chosen value as a number, for anything doing arithmetic on it. (property only) (readonly)
   * - `onValueChange`: The consumer's callback, invoked after the value is applied.
   *
   * Not an attribute: it is a function. `onValueChange` and not `onChange`,
   * because React reserves the latter for its own synthetic system and wires
   * it to the native `change`, so a Helix event named `Change` would never
   * fire at all. (property only)
   * - `resolvedFeedback`: The message actually shown: the consumer's, or the platform's, or none. (property only) (readonly)
   * - `describedBy`: Id of the description node, for `aria-describedby` on the control.
   *
   * One at a time, because only one of the two is ever rendered. Naming both
   * would point a screen reader at an id that resolves to nothing, which it
   * reads as a description it cannot find. (property only) (readonly)
   * - `isDisabled`: Whether the control is off, by its own attribute or by an ancestor.
   *
   * What a component should bind to rather than `disabled`, which is only the
   * half of it the consumer wrote. (property only) (readonly)
   * - `form`: The form this control belongs to, if any. (property only) (readonly)
   * - `labels`: Labels associated with this control. (property only) (readonly)
   *
   * ## Events
   *
   * Events that will be emitted by the component.
   *
   * - `helix-change`: Fired as the value changes, and cancelable.
   * - `change`: Relayed once the reader has let go.
   *
   * ## Methods
   *
   * Methods that can be called to access component functionality.
   *
   * - `requestValue(next: string) => boolean`: Requests a new value, and reports whether the request stood.
   *
   * Announces before it acts, so `preventDefault()` on the `helix-change` is
   * a refusal and nothing moves. In uncontrolled mode the control then
   * updates itself; in controlled mode it applies nothing and waits for the
   * consumer to pass a new `value`, which is what controlled means.
   * - `formResetCallback() => void`: Returns the control to the value its markup declared.
   *
   * Both halves are dropped, the consumer's and the control's, because a
   * reset means the form is as it was served. Clearing only the internal one
   * would leave a control that had been written to stuck at that value.
   * - `formStateRestoreCallback(state: string | null) => void`: Restores the value when the browser brings a form back.
   *
   * Falling back to `defaultValue` rather than to empty, because a restore
   * with no state is a form the browser has nothing recorded for, which is
   * the same situation as a fresh one.
   * - `formDisabledCallback(disabled: boolean) => void`: The platform's notice that an ancestor fieldset changed.
   *
   * ## CSS Parts
   *
   * Custom selectors for styling elements within the component.
   *
   * - `field`: The row: the control and its readout.
   * - `control`: The range input.
   * - `markers`: The row of marks along the track.
   * - `marker`: One mark.
   * - `marker-label`: The value a mark stands at, when `marker-labels` is set.
   * - `output`: The current value, shown beside it.
   */
  "helix-base-slider": Partial<
    HelixBaseSliderProps & BaseProps<HelixBaseSlider> & BaseEvents
  >;

  /**
   * Two concentric circles rather than one arc: the track is what makes the
   * moving part read as a proportion of a whole rather than as a shape drifting
   * on its own, and it costs one element.
   *
   * **The center is a slot and is empty by default.** A spinner with a mark in
   * the middle is a brand's spinner, and this library does not know whose. The
   * slot is the capability; the logo is the application's, put in once wherever
   * the app wraps it. Nothing is rendered when nothing is slotted, so an
   * unbranded spinner is still two circles and no extra box.
   *
   * What is slotted does not turn. Only the arc moves, because a mark rotating
   * with it stops reading as a mark and becomes part of the animation, and a
   * wordmark upside down twice a second is worse than no wordmark.
   *
   * The semantics are on the host through `ElementInternals`, not on an inner
   * span. A `role` written into the shadow root announces correctly but leaves
   * the host itself anonymous to anything walking the light DOM, and a `role`
   * written onto the host as an attribute is one a React consumer's server markup
   * never had.
   *
   * ## Attributes & Properties
   *
   * Component attributes and properties that can be applied to the element or by using JavaScript.
   *
   * - `label`: Accessible name, announced while the work is outstanding.
   *
   * ## Slots
   *
   * Areas where markup can be added to the component.
   *
   * - `(default)`: A mark to sit still at the center, usually a logo. Empty by default.
   *
   * ## CSS Parts
   *
   * Custom selectors for styling elements within the component.
   *
   * - `svg`: The rotating circle pair.
   * - `mark`: The region holding what was slotted at the center.
   * - `track`: The full circle behind the indicator.
   * - `indicator`: The arc that turns.
   */
  "helix-base-spinner": Partial<
    HelixBaseSpinnerProps & BaseProps<HelixBaseSpinner> & BaseEvents
  >;

  /**
   * A group rather than a list, because the figures are read together and their
   * order carries no meaning: a list would announce "1 of 4" for a set where the
   * position is not information.
   *
   * ## Attributes & Properties
   *
   * Component attributes and properties that can be applied to the element or by using JavaScript.
   *
   * - `label`: Accessible name for the set.
   *
   * ## Slots
   *
   * Areas where markup can be added to the component.
   *
   * - `(default)`: The stats.
   */
  "helix-base-stat-group": Partial<
    HelixBaseStatGroupProps & BaseProps<HelixBaseStatGroup> & BaseEvents
  >;

  /**
   * Value first in the markup and label after it, because that is the reading
   * order a figure wants: the number is what the eye lands on and the label is
   * what tells it what it landed on.
   *
   * Both are bare slots. An element whose only job is to assign itself a slot on
   * connect gives its own host an attribute after upgrade, which a React
   * consumer's server markup never had.
   *
   * ## Slots
   *
   * Areas where markup can be added to the component.
   *
   * - `(default)`: The value.
   * - `label`: What the value measures.
   * - `unit`: The unit, set beside the value.
   * - `detail`: A change, comparison, or note under the label.
   */
  "helix-base-stat": Partial<
    HelixBaseStatProps & BaseProps<HelixBaseStat> & BaseEvents
  >;

  /**
   * **A switch is not a checkbox with a different shape.** A checkbox is an
   * answer to a question the form asks when it is submitted; a switch is a thing
   * happening now. That is why `role="switch"` exists and why a switch belongs
   * outside a form as often as in one: it says "on" and "off" rather than
   * "ticked" and "unticked", and a reader expects the effect immediately rather
   * than on Save.
   *
   * Rendered as a real `<input type="checkbox">` carrying `role="switch"`, which
   * is the pairing ARIA describes: the input is what a form submits and what a
   * label forwards a press to, and the role is what a screen reader announces.
   * Neither half can be got from the other.
   *
   * The label sits beside it, inside the `<label>` that forwards the press, the
   * way a checkbox's does. The hint and the message go under the row, because
   * there is no above: the switch and the words naming it are one line.
   *
   * ## Attributes & Properties
   *
   * Component attributes and properties that can be applied to the element or by using JavaScript.
   *
   * - `value`: Value submitted when the switch is on.
   * - `checked`: Whether the control is checked.
   *
   * One property rather than two. Reading gives the real state whichever
   * mode the control is in; writing hands ownership to the consumer, which
   * is what the attribute in `<helix-checkbox checked>` does as well. The
   * same shape all four of these mixins have, for the reason given on
   * `MixinControllerOpen.open`.
   *
   * Not reflected: the attribute is the consumer's input and stays as they
   * wrote it, and `data-checked` carries the resolved state for stylesheets.
   * - `default-checked`/`defaultChecked`: Initial checked state for uncontrolled use, where nothing declared one.
   * - `hint`: Help under the control, shown while there is nothing wrong.
   * - `feedback`: What is wrong, in the reader's words rather than the browser's.
   * - `label`: The accessible name, and the fallback for the `label` slot.
   * - `required`: Whether the form refuses to submit without it.
   * - `disabled`: Whether the control is non-interactive.
   *
   * Reflected, because the styled tier selects on it, and mirrored to
   * `aria-disabled` rather than removing the element from the accessibility
   * tree, so a screen reader can still announce that the control exists.
   * - `name`: Name submitted with the form.
   *
   * **Reflected, and it is the exception to "reflect only what CSS selects
   * on".** The platform builds a form's entry list from the `name` *content
   * attribute*, not from the property, so a control named through the property
   * submitted under no name at all and was silently dropped. Measured: two
   * inputs in one form, one named by attribute and one by property, and the
   * form carried a single entry.
   *
   * Safe for a React consumer, which is what the rule is protecting: React
   * renders a custom element's props as attributes on the server, so the name
   * is already in the markup being hydrated and reflecting it writes what is
   * there. It is only a change to the markup when a consumer assigns it
   * imperatively later, and nothing is hydrating by then.
   *
   * Here rather than on each control, where it was declared eight times and
   * reflected none of them.
   * - `onCheckedChange`: The consumer's callback, invoked after the state is applied.
   *
   * Not an attribute: it is a function. And not reachable from React's JSX,
   * which reserves every `on[A-Z]` prop for its own event system and drops
   * what it does not recognize; the generated wrapper listens for the event
   * instead. (property only)
   * - `resolvedFeedback`: The message actually shown: the consumer's, or the platform's, or none. (property only) (readonly)
   * - `describedBy`: Id of the description node, for `aria-describedby` on the control.
   *
   * One at a time, because only one of the two is ever rendered. Naming both
   * would point a screen reader at an id that resolves to nothing, which it
   * reads as a description it cannot find. (property only) (readonly)
   * - `isDisabled`: Whether the control is off, by its own attribute or by an ancestor.
   *
   * What a component should bind to rather than `disabled`, which is only the
   * half of it the consumer wrote. (property only) (readonly)
   * - `form`: The form this control belongs to, if any. (property only) (readonly)
   * - `labels`: Labels associated with this control. (property only) (readonly)
   *
   * ## Events
   *
   * Events that will be emitted by the component.
   *
   * - `helix-change`: Fired before the state changes, and cancelable.
   * - `change`: Relayed from the input once the state has changed.
   *
   * ## Slots
   *
   * Areas where markup can be added to the component.
   *
   * - `(default)`: The words naming what this turns on.
   *
   * ## Methods
   *
   * Methods that can be called to access component functionality.
   *
   * - `formResetCallback() => void`: Returns the switch to the state its markup declared.
   * - `requestChecked(next: boolean) => boolean`: Requests a checked change, and reports whether it was applied.
   *
   * Announces before it acts, so `preventDefault()` on the
   * `helix-change` is a refusal and nothing moves. In uncontrolled mode
   * the element then updates itself; in controlled mode it applies nothing
   * and waits for the consumer to pass a new `checked`, which is what
   * "controlled" means.
   * - `toggleChecked() => boolean`: Requests the opposite of the current state.
   * - `resetChecked() => void`: Drops the uncontrolled state, so the control reads `defaultChecked`
   * again.
   *
   * A form reset has to return a control to what its markup declared, and
   * clearing `checked` alone only leaves controlled mode. The value the
   * element has been keeping lives here, so this is where it is dropped.
   * - `formDisabledCallback(disabled: boolean) => void`: The platform's notice that an ancestor fieldset changed.
   *
   * ## CSS Parts
   *
   * Custom selectors for styling elements within the component.
   *
   * - `field`: The row: the track and its label.
   * - `track`: The groove the thumb travels in.
   * - `control`: The input.
   * - `thumb`: The part that moves.
   * - `label`: The words beside it.
   */
  "helix-base-switch": Partial<
    HelixBaseSwitchProps & BaseProps<HelixBaseSwitch> & BaseEvents
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
   * A column is a heading and a width, declared together, because they are two
   * facts about one thing and keeping them apart is what went wrong before.
   *
   * **This replaces a `columns` string on the table.** That property took a CSS
   * track list, so the headings lived in a row of cells and the widths lived in
   * an attribute, and nothing tied the two together: a table with three headings
   * and a two-track list rendered without complaint. Worse, handing it the
   * headings instead of a track list produced invalid CSS, which the grid
   * silently ignored, so the whole table collapsed into one column and every cell
   * stacked. That happened, in this library's own example, and the failure said
   * nothing at all.
   *
   * Now the column is the source of both. Add one and the table has another
   * track; remove one and it does not.
   *
   * **It generates no box of its own**, the same as a row: the heading is a grid
   * item of the table, so it lines up with the cells under it rather than sitting
   * in a wrapper that has to be kept the same width.
   *
   * ## Attributes & Properties
   *
   * Component attributes and properties that can be applied to the element or by using JavaScript.
   *
   * - `width`: The track this column takes, as CSS.
   *
   * A single track value, so anything valid in `grid-template-columns` works:
   * `16rem`, `auto`, `minmax(0, 2fr)`. Left unset the column shares what is
   * left over equally, which is `minmax(0, 1fr)` rather than `1fr`: a bare
   * `1fr` track keeps an automatic minimum and refuses to shrink under a long
   * cell, so one unbreakable value pushes the table past its container.
   * - `isTableColumn`: Marks this as a column a table should count. Cheaper than an instanceof. (property only) (readonly)
   * - `track`: The track this column contributes, resolved. (property only) (readonly)
   *
   * ## Slots
   *
   * Areas where markup can be added to the component.
   *
   * - `(default)`: The heading.
   *
   * ## CSS Parts
   *
   * Custom selectors for styling elements within the component.
   *
   * - `column`: The heading cell.
   */
  "helix-base-table-column": Partial<
    HelixBaseTableColumnProps & BaseProps<HelixBaseTableColumn> & BaseEvents
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
   * - `columns`: Column track list, as CSS. Deprecated: declare columns instead.
   *
   * Kept for a table that has no `helix-table-column` children, and ignored the
   * moment it has one. A raw track list is the right shape for the value and
   * the wrong place for it: the headings and the widths were two halves of one
   * fact held in two places, and nothing checked that they agreed. Worse, the
   * value is CSS, so handing it headings by mistake produced an invalid track
   * list, which a grid ignores in silence: the table collapsed to one column
   * and said nothing. Columns carry both halves now.
   * - `label`: Accessible name for the table.
   * - `tableColumns`: The columns declared as children, in the order they are written. (property only) (readonly)
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
   * - `head`: The row the column headings sit in. `display: contents`, so it takes no space.
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
   * - `label`: The name of the panel, which is the text of the tab that opens it.
   *
   * Set by the root, which is the only thing that sees both. No attribute,
   * because it is coordination between elements rather than anything a consumer
   * writes: the tab already says it.
   *
   * A string where the markup wanted a reference. `aria-labelledby` named
   * `tab-${value}`, an id inside the *tab's* own shadow root, and an IDREF
   * resolves only in the tree it is written in, so the panel had no accessible
   * name at all. An element reference cannot reach there either, a sibling
   * shadow tree being neither the same tree nor an ancestor of it. A name is
   * the one form that crosses, and `aria-label` on a `tabpanel` is how the
   * pattern names one anyway. (property only)
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
   * - `appearance`: How the row reads.
   *
   * Unset is a raised pill on the selected tab with nothing behind the row,
   * which is what a set sitting inside other chrome wants. `underline` is a
   * rule under the row and a thicker one under the selected tab, for a set that
   * heads a page. `toggle` puts the pill in a framed, sunken track, which reads
   * as one control rather than as a row.
   *
   * Reflected and left unset by default, so the host carries nothing a
   * consumer's server markup does not already have.
   * - `label`: Accessible name for the tab list.
   * - `manual`: Whether arrowing to a tab also selects it.
   *
   * Automatic is the default because showing a panel is usually cheap. Set this
   * where it is not, so a reader arrowing past four tabs does not load four
   * panels on the way.
   * - `active`: Which item is current, by its `value`.
   *
   * Called `active`, which is what this mixin is named for and what it was
   * not: it declared `value`, so the one mixin whose whole subject is which
   * item is active had no such property, and `active` meant something else
   * entirely elsewhere in the library. It still does, and only there now:
   * `option.active` is the option the keyboard is on, which is a different
   * question from which one is chosen.
   *
   * An accessor pair, the same shape as the other three. Reading gives the
   * real item; writing hands ownership to the consumer, so `<helix-tabs
   * active="one">` is a set that stays on that tab and `default-active` is
   * how markup says where to start.
   * - `default-active`/`defaultActive`: Initial item for uncontrolled use. Ignored once `active` is written.
   * - `onActiveChange`: The consumer's callback, invoked after the change is applied. (property only)
   *
   * ## Events
   *
   * Events that will be emitted by the component.
   *
   * - `helix-change`: Fired before the current tab moves, and cancelable. The only way to refuse one.
   * - `helix-select`: Fired when a tab is chosen. Dispatched by the tab and listened for here, because the root is what a consumer holds.
   *
   * ## Slots
   *
   * Areas where markup can be added to the component.
   *
   * - `(default)`: The tabs.
   * - `panels`: The panels.
   *
   * ## Methods
   *
   * Methods that can be called to access component functionality.
   *
   * - `requestActive(next: string) => boolean`: Requests a new current item, and reports whether the request stood.
   *
   * Announces before it acts, so `preventDefault()` on the `helix-change` is
   * a refusal and nothing moves. Unlike a native control, nothing has moved
   * by the time this runs, so refusing is simply not writing: there is
   * nothing to put back.
   *
   * ## CSS Parts
   *
   * Custom selectors for styling elements within the component.
   *
   * - `indicator`: The mark that travels to the selected tab.
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
   * - `helix-select`: Fired when the tab is chosen.
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
   * A tag is a label, and optionally a label the reader can take off.
   * `dismissible` is what separates it from a badge: a badge reports a state the
   * reader cannot change, a tag names something they can.
   *
   * Dismissing is a request. The tag does not remove itself, because the consumer
   * owns the list it sits in and taking the node out from under them would put
   * their state and the document out of step. Cancelling `helix-dismiss` is a
   * refusal.
   *
   * ## Attributes & Properties
   *
   * Component attributes and properties that can be applied to the element or by using JavaScript.
   *
   * - `dismissible`: Whether it offers a control to take it away.
   * - `dismiss-label`/`dismissLabel`: Accessible name for that control.
   *
   * `attribute` is spelled out because Lit lowercases a property name to
   * derive one rather than dash-casing it, so this would otherwise be
   * reachable only as `dismisslabel`, which nobody would guess and no linter
   * would catch.
   *
   * ## Events
   *
   * Events that will be emitted by the component.
   *
   * - `helix-dismiss`: Fired when the reader asks to remove the tag.
   *
   * ## Slots
   *
   * Areas where markup can be added to the component.
   *
   * - `(default)`: The tag's label.
   *
   * ## Methods
   *
   * Methods that can be called to access component functionality.
   *
   * - `dismiss() => boolean`: Announces that it should go, and reports whether the request stood.
   *
   * ## CSS Parts
   *
   * Custom selectors for styling elements within the component.
   *
   * - `dismiss`: The control that asks to remove the tag.
   */
  "helix-base-tag": Partial<
    HelixBaseTagProps & BaseProps<HelixBaseTag> & BaseEvents
  >;

  /**
   * A real `<textarea>`, so the caret, the selection, spellcheck, the resize
   * handle and the keyboard a phone chooses are all the platform's, and it
   * serializes into the server's markup so the field is usable before any script
   * loads.
   *
   * **Not an Input with a taller box.** The difference is the Enter key: in a
   * single-line field it submits the form, and here it inserts a line. That is a
   * behavioral difference the platform owns and cannot be styled into existence,
   * which is why this is its own element rather than `Input` with a property.
   *
   * `rows` sets the height it starts at, and `auto-grow` lets it follow its own
   * content. They are not alternatives: `rows` is where an empty field begins and
   * `auto-grow` is what happens after, so a field that grows still has to start
   * somewhere.
   *
   * ## Attributes & Properties
   *
   * Component attributes and properties that can be applied to the element or by using JavaScript.
   *
   * - `auto-grow`/`autoGrow`: Whether the box follows its own content rather than scrolling.
   * - `placeholder`: Shown while the field is empty. Not a label: it goes when typing starts.
   * - `read-only`/`readOnly`: Whether the field refuses input while still submitting its value.
   * - `rows`: How many lines the box is before anything is typed.
   * - `minlength`/`minLength`: Fewest characters the value may have.
   *
   * Forwarded to the real `<textarea>` rather than checked here, which is what
   * makes the message the browser's and therefore the reader's own language.
   * No `pattern`: the platform does not give a textarea one, and inventing it
   * would be this library guessing where the point is to stop guessing.
   * - `maxlength`/`maxLength`: Most characters the value may have.
   * - `default-value`/`defaultValue`: The value the markup declared, which is where a reset returns to.
   * - `value`: What the control holds now, and what its form submits.
   *
   * One property, not two. Reading gives the real value whichever mode the
   * control is in, so `input.value` answers the question anyone asking it
   * meant. Writing hands ownership to the consumer, which is what
   * `<helix-input value="x">` says too, and matches what a controlled input
   * means in React: the value is theirs and the control waits to be told.
   * `default-value` is how markup seeds one it does not want to own.
   *
   * The same shape as the other three mixins, which is the point of them
   * being four of a kind rather than four of three kinds.
   * - `hint`: Help under the control, shown while there is nothing wrong.
   * - `feedback`: What is wrong, in the reader's words rather than the browser's.
   * - `label`: The accessible name, and the fallback for the `label` slot.
   * - `required`: Whether the form refuses to submit without it.
   * - `disabled`: Whether the control is non-interactive.
   *
   * Reflected, because the styled tier selects on it, and mirrored to
   * `aria-disabled` rather than removing the element from the accessibility
   * tree, so a screen reader can still announce that the control exists.
   * - `name`: Name submitted with the form.
   *
   * **Reflected, and it is the exception to "reflect only what CSS selects
   * on".** The platform builds a form's entry list from the `name` *content
   * attribute*, not from the property, so a control named through the property
   * submitted under no name at all and was silently dropped. Measured: two
   * inputs in one form, one named by attribute and one by property, and the
   * form carried a single entry.
   *
   * Safe for a React consumer, which is what the rule is protecting: React
   * renders a custom element's props as attributes on the server, so the name
   * is already in the markup being hydrated and reflecting it writes what is
   * there. It is only a change to the markup when a consumer assigns it
   * imperatively later, and nothing is hydrating by then.
   *
   * Here rather than on each control, where it was declared eight times and
   * reflected none of them.
   * - `onValueChange`: The consumer's callback, invoked after the value is applied.
   *
   * Not an attribute: it is a function. `onValueChange` and not `onChange`,
   * because React reserves the latter for its own synthetic system and wires
   * it to the native `change`, so a Helix event named `Change` would never
   * fire at all. (property only)
   * - `resolvedFeedback`: The message actually shown: the consumer's, or the platform's, or none. (property only) (readonly)
   * - `describedBy`: Id of the description node, for `aria-describedby` on the control.
   *
   * One at a time, because only one of the two is ever rendered. Naming both
   * would point a screen reader at an id that resolves to nothing, which it
   * reads as a description it cannot find. (property only) (readonly)
   * - `isDisabled`: Whether the control is off, by its own attribute or by an ancestor.
   *
   * What a component should bind to rather than `disabled`, which is only the
   * half of it the consumer wrote. (property only) (readonly)
   * - `form`: The form this control belongs to, if any. (property only) (readonly)
   * - `labels`: Labels associated with this control. (property only) (readonly)
   *
   * ## Events
   *
   * Events that will be emitted by the component.
   *
   * - `helix-change`: Fired as the text changes, and cancelable.
   * - `change`: Relayed from the textarea once the reader has finished.
   *
   * ## Methods
   *
   * Methods that can be called to access component functionality.
   *
   * - `focus(options?: FocusOptions) => void`: Puts the caret in the field, the way a label pointing at one would.
   * - `requestValue(next: string) => boolean`: Requests a new value, and reports whether the request stood.
   *
   * Announces before it acts, so `preventDefault()` on the `helix-change` is
   * a refusal and nothing moves. In uncontrolled mode the control then
   * updates itself; in controlled mode it applies nothing and waits for the
   * consumer to pass a new `value`, which is what controlled means.
   * - `formResetCallback() => void`: Returns the control to the value its markup declared.
   *
   * Both halves are dropped, the consumer's and the control's, because a
   * reset means the form is as it was served. Clearing only the internal one
   * would leave a control that had been written to stuck at that value.
   * - `formStateRestoreCallback(state: string | null) => void`: Restores the value when the browser brings a form back.
   *
   * Falling back to `defaultValue` rather than to empty, because a restore
   * with no state is a form the browser has nothing recorded for, which is
   * the same situation as a fresh one.
   * - `formDisabledCallback(disabled: boolean) => void`: The platform's notice that an ancestor fieldset changed.
   *
   * ## CSS Parts
   *
   * Custom selectors for styling elements within the component.
   *
   * - `field`: The box holding the control.
   * - `control`: The textarea itself.
   */
  "helix-base-textarea": Partial<
    HelixBaseTextareaProps & BaseProps<HelixBaseTextarea> & BaseEvents
  >;

  /**
   * An element rather than a slot, because it carries a timeout, a severity, a
   * dismiss control and a lifetime that pauses: behavior, state and API, which
   * is the test for whether a region becomes an element in this library.
   *
   * **The timer is the item's own.** Held by the region, one message arriving
   * would restart another's, so a stack of three would go from three seconds each
   * to nine for the last one. Each message is on its own clock from the moment it
   * is rendered.
   *
   * **A message is the opposite of the page it is over.** Inverted by default,
   * because a thing arriving in a corner has to be told apart from the page in
   * the moment before it is read, and inverting does that without spending a
   * color that means something. It is a flip of `color-scheme` rather than a
   * named inverse surface: every token in the subtree re-resolves, so a `Retry`
   * a consumer slots in comes out right without knowing where it is. `Tooltip`
   * can name the inverse surface directly because it holds no controls; this
   * cannot. Set `data-color-mode` on the region to take the page's mode instead.
   *
   * **No duration means it stays.** That is the safe default rather than the
   * common one: anything carrying an action has to still be there when the reader
   * decides to take it, and a component cannot tell from the outside whether the
   * message it was given is disposable.
   *
   * **The clock stops while it is being read.** Hover pauses it, and so does
   * focus landing anywhere inside, which is the case that matters more: a
   * keyboard reader tabbing towards the action in a toast is exactly the person a
   * timer must not race. Both resume where they left off rather than starting
   * again, so a message half-read does not get a full second life every time a
   * pointer crosses it.
   *
   * **Going away is a request, never an act.** It dispatches a cancelable
   * `helix-dismiss` and does nothing else: the consumer owns the list, so the
   * item removing itself would leave the two disagreeing. Auto-dismiss and the
   * dismiss control raise the same event, so a consumer handles one path and not
   * two.
   *
   * ## Attributes & Properties
   *
   * Component attributes and properties that can be applied to the element or by using JavaScript.
   *
   * - `duration`: How long it stays, in milliseconds. Absent means until it is dismissed.
   *
   * Read once when the item is first rendered. Changing it afterwards does not
   * restart a message the reader is already partway through.
   * - `severity`: What kind of message it is, which picks the mark and its name.
   * - `open`: Whether the message is still showing.
   *
   * The same decide-once contract every other stateful thing here carries, and
   * it was the one exception: this waited to be told in every case, so
   * `duration` did nothing at all without consumer script and the dismiss
   * control looked broken to anyone who pressed it. `Dialog` closes itself,
   * `Accordion` closes itself, and there was no reason a message should not.
   *
   * Declared by the markup and it is the consumer's: the item announces and
   * waits. Not declared and it is the item's: it goes when it is asked to, and
   * the consumer still hears `helix-dismiss` and takes it out of their own
   * list. Read once, at the first update.
   *
   * **No `default-open`, unlike the four mixins.** A `default-` seed exists so
   * markup can choose a starting state without claiming ownership, and there is
   * only one starting state that makes sense: a message that has been rendered
   * is showing. An attribute whose only legal value is the default is an
   * attribute nobody can use.
   * - `dismissible`: Whether it offers a control to take it away.
   * - `dismiss-label`/`dismissLabel`: Accessible name for that control.
   *
   * `attribute` is spelled out because Lit lowercases a property name to
   * derive one rather than dash-casing it, so this would otherwise be
   * reachable only as `dismisslabel`, which nobody would guess and no linter
   * would catch.
   *
   * ## Events
   *
   * Events that will be emitted by the component.
   *
   * - `helix-dismiss`: Fired when it asks to go, whether by the control or by its timer.
   *
   * ## Slots
   *
   * Areas where markup can be added to the component.
   *
   * - `(default)`: The message.
   * - `actions`: What to do about it, usually a button or a link.
   * - `icon`: Replaces the severity mark. Matches `Callout`, which is why the dismiss control's own glyph is `dismiss-icon` rather than this: two slots cannot share a name, assignment goes to whichever comes first in the tree, and the severity mark is the one a consumer reaches for.
   * - `dismiss-icon`: Replaces the glyph inside the dismiss control.
   *
   * ## Methods
   *
   * Methods that can be called to access component functionality.
   *
   * - `dismiss() => boolean`: Asks to be taken away, and reports whether the request stood.
   *
   * Announced before anything happens, so `preventDefault()` is a refusal and
   * the message stays. The event still carries the label, because a consumer
   * removing this from their own state has to know which one went, and that is
   * true whether or not the item hid itself first.
   * - `pause() => void`: Stops the clock, leaving whatever is left of it.
   * - `resume() => void`: Starts it again from where it stopped.
   *
   * ## CSS Parts
   *
   * Custom selectors for styling elements within the component.
   *
   * - `item`: The message's own surface.
   * - `icon`: The severity mark, where the message has one.
   * - `content`: The message.
   * - `actions`: The region holding what to do about it.
   * - `dismiss`: The control that asks to close.
   * - `timer`: The bar showing how long is left, where a duration was given.
   */
  "helix-base-toast-item": Partial<
    HelixBaseToastItemProps & BaseProps<HelixBaseToastItem> & BaseEvents
  >;

  /**
   * **The region is why this is one family rather than two.** A live region has
   * to be in the document *before* a message is put into it: assistive technology
   * subscribes to the region, and a region that arrives already holding its
   * message is frequently not announced at all. So the container is a part of the
   * family and not an arranger of complete things, which is the same reasoning
   * that puts `Radio.Group` inside its own family.
   *
   * **Polite, never assertive.** `role="alert"` interrupts whatever a reader is
   * being told, and almost nothing that arrives in a corner of the screen has
   * earned that. Something that genuinely cannot wait is a `Dialog`, which stops
   * the page for everyone rather than only for the people who cannot see it.
   *
   * **It never creates or destroys anything.** The consumer renders items and
   * removes them; asking to go is a cancelable `helix-dismiss` from the item.
   * That is still exactly true of the region: an item that has gone hides itself
   * and stays in the tree, so a consumer whose state still lists it does not have
   * their framework fighting a node this component took away. What changed is
   * that the item no longer waits to be told before hiding, unless the consumer
   * declared `open` and said the state is theirs.
   * There is no `toast.show()`, because an imperative queue inside a component is
   * a second copy of the application's state that nothing can render from: an app
   * that wants a `toast()` function writes a thin one over the state it already
   * has, and keeps the ability to render the same messages on the server, in a
   * test, or twice.
   *
   * ## Attributes & Properties
   *
   * Component attributes and properties that can be applied to the element or by using JavaScript.
   *
   * - `label`: Accessible name for the region, such as "Notifications".
   * - `placement`: Which corner or edge the stack sits at.
   *
   * Named here rather than on each message, because where a page puts its
   * toasts is a fact about the page: a stack whose members disagreed about
   * where they were would not be a stack.
   *
   * ## Slots
   *
   * Areas where markup can be added to the component.
   *
   * - `(default)`: The messages, as `helix-toast-item` elements.
   *
   * ## CSS Parts
   *
   * Custom selectors for styling elements within the component.
   *
   * - `region`: The stack the messages are in.
   */
  "helix-base-toast": Partial<
    HelixBaseToastProps & BaseProps<HelixBaseToast> & BaseEvents
  >;

  /**
   * The indicator is one element that travels, not a background that appears on
   * whichever item is current. That difference is the whole point: a fill that
   * swaps is two things changing at once and reads as a flicker, while one that
   * moves is a single object the eye follows, and it says where the selection
   * came from as well as where it went.
   *
   * Its whole box is measured from the selected item and written onto
   * the indicator as custom properties, because labels are different lengths and
   * no proportion of the group is the right answer. Measurement is client-side by
   * necessity, so the server renders the indicator hidden and it fades in once it
   * has somewhere to be, which is the harmless direction: it appears rather than
   * jumping from a wrong place.
   *
   * A radio group, and only that. Navigation is links marked with `aria-current`
   * and styled by the `data-navigation-item` recipe: radio semantics would announce a
   * set of destinations as a set of choices. A tab controls a panel.
   *
   * Being a radio group, it is a form control, and it says so through
   * `HelixFormElement`: it reports its value under a `name`, comes back to the
   * markup's choice on reset, and restores the one a reader made when the browser
   * brings a form back.
   *
   * The semantics were already right: the host has carried `role="radiogroup"`
   * and the items `role="radio"` from the start. What none of it did was reach a
   * form. A button in a shadow root submits nothing whatever its role, so the
   * value has to be reported by the host, which is the only thing a form can
   * see.
   *
   * ## Attributes & Properties
   *
   * Component attributes and properties that can be applied to the element or by using JavaScript.
   *
   * - `default-value`/`defaultValue`: The value the markup declared, which is where a reset returns to.
   * - `value`: What the control holds now, and what its form submits.
   *
   * One property, not two. Reading gives the real value whichever mode the
   * control is in, so `input.value` answers the question anyone asking it
   * meant. Writing hands ownership to the consumer, which is what
   * `<helix-input value="x">` says too, and matches what a controlled input
   * means in React: the value is theirs and the control waits to be told.
   * `default-value` is how markup seeds one it does not want to own.
   *
   * The same shape as the other three mixins, which is the point of them
   * being four of a kind rather than four of three kinds.
   * - `hint`: Help under the control, shown while there is nothing wrong.
   * - `feedback`: What is wrong, in the reader's words rather than the browser's.
   * - `label`: The accessible name, and the fallback for the `label` slot.
   * - `required`: Whether the form refuses to submit without it.
   * - `disabled`: Whether the control is non-interactive.
   *
   * Reflected, because the styled tier selects on it, and mirrored to
   * `aria-disabled` rather than removing the element from the accessibility
   * tree, so a screen reader can still announce that the control exists.
   * - `name`: Name submitted with the form.
   *
   * **Reflected, and it is the exception to "reflect only what CSS selects
   * on".** The platform builds a form's entry list from the `name` *content
   * attribute*, not from the property, so a control named through the property
   * submitted under no name at all and was silently dropped. Measured: two
   * inputs in one form, one named by attribute and one by property, and the
   * form carried a single entry.
   *
   * Safe for a React consumer, which is what the rule is protecting: React
   * renders a custom element's props as attributes on the server, so the name
   * is already in the markup being hydrated and reflecting it writes what is
   * there. It is only a change to the markup when a consumer assigns it
   * imperatively later, and nothing is hydrating by then.
   *
   * Here rather than on each control, where it was declared eight times and
   * reflected none of them.
   * - `onValueChange`: The consumer's callback, invoked after the value is applied.
   *
   * Not an attribute: it is a function. `onValueChange` and not `onChange`,
   * because React reserves the latter for its own synthetic system and wires
   * it to the native `change`, so a Helix event named `Change` would never
   * fire at all. (property only)
   * - `resolvedFeedback`: The message actually shown: the consumer's, or the platform's, or none. (property only) (readonly)
   * - `describedBy`: Id of the description node, for `aria-describedby` on the control.
   *
   * One at a time, because only one of the two is ever rendered. Naming both
   * would point a screen reader at an id that resolves to nothing, which it
   * reads as a description it cannot find. (property only) (readonly)
   * - `isDisabled`: Whether the control is off, by its own attribute or by an ancestor.
   *
   * What a component should bind to rather than `disabled`, which is only the
   * half of it the consumer wrote. (property only) (readonly)
   * - `form`: The form this control belongs to, if any. (property only) (readonly)
   * - `labels`: Labels associated with this control. (property only) (readonly)
   *
   * ## Events
   *
   * Events that will be emitted by the component.
   *
   * - `helix-change`: Fired before the answer moves, and cancelable. The only way to refuse one.
   * - `helix-select`: Fired when an item is chosen. Dispatched by the item and listened for here.
   *
   * ## Slots
   *
   * Areas where markup can be added to the component.
   *
   * - `(default)`: The group's items.
   *
   * ## Methods
   *
   * Methods that can be called to access component functionality.
   *
   * - `requestValue(next: string) => boolean`: Requests a new value, and reports whether the request stood.
   *
   * Announces before it acts, so `preventDefault()` on the `helix-change` is
   * a refusal and nothing moves. In uncontrolled mode the control then
   * updates itself; in controlled mode it applies nothing and waits for the
   * consumer to pass a new `value`, which is what controlled means.
   * - `formResetCallback() => void`: Returns the control to the value its markup declared.
   *
   * Both halves are dropped, the consumer's and the control's, because a
   * reset means the form is as it was served. Clearing only the internal one
   * would leave a control that had been written to stuck at that value.
   * - `formStateRestoreCallback(state: string | null) => void`: Restores the value when the browser brings a form back.
   *
   * Falling back to `defaultValue` rather than to empty, because a restore
   * with no state is a form the browser has nothing recorded for, which is
   * the same situation as a fresh one.
   * - `formDisabledCallback(disabled: boolean) => void`: The platform's notice that an ancestor fieldset changed.
   *
   * ## CSS Parts
   *
   * Custom selectors for styling elements within the component.
   *
   * - `track`: The bar the items sit in.
   * - `indicator`: The moving marker behind the selected item.
   */
  "helix-base-toggle-group": Partial<
    HelixBaseToggleGroupProps & BaseProps<HelixBaseToggleGroup> & BaseEvents
  >;

  /**
   * Renders a `<button role="radio">`. This is a form control and nothing else.
   *
   * Navigation is not this. It is links marked with `aria-current` and styled by
   * the `data-navigation-item` recipe in the base layer, which carries the same look
   * without radio semantics announcing destinations as choices.
   *
   * ## Attributes & Properties
   *
   * Component attributes and properties that can be applied to the element or by using JavaScript.
   *
   * - `value`: Identifies the item to the group.
   * - `selected`: Whether this item is the current one.
   * - `disabled`: Whether the item can be chosen.
   * - `focusable`: Whether this item holds the group's tab stop while nothing is chosen.
   *
   * The stop normally rides on the selection, and an unanswered group has no
   * selection, so it had no stop and the keyboard could not reach it. Written
   * by the group, with no attribute: it is coordination between elements, and
   * `tabindex` on a host the consumer rendered is the change a React consumer's
   * hydration reports and does not patch up. (property only)
   *
   * ## Events
   *
   * Events that will be emitted by the component.
   *
   * - `helix-select`: Fired when the item is chosen.
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
   * - `item`: The radio button.
   */
  "helix-base-toggle": Partial<
    HelixBaseToggleProps & BaseProps<HelixBaseToggle> & BaseEvents
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

  /**
   * The trigger is slotted and stays the consumer's own element. The bubble is
   * rendered here, in the top layer through the popover API, so it clears any
   * ancestor with `overflow: hidden` without a `z-index` anywhere.
   *
   * Position comes from `FloatingController`, which flips to another side when
   * the preferred one does not fit and slides along it to stay in view.
   *
   * **The description is linked by element reference, not by id.** An IDREF
   * cannot cross a shadow boundary, so `aria-describedby` on a slotted trigger
   * pointing at a bubble in here resolves to nothing.
   * `ElementInternals.ariaDescribedByElements` takes the element itself, which
   * does cross.
   *
   * It shows on hover and on focus, and hides on leave, on blur, and on Escape.
   * A tooltip that answers only the pointer is one a keyboard reader never sees.
   *
   * The pointer waits out `delay` first, or sweeping a row of controls flashes a
   * tooltip for each of them. Focus does not wait: a keyboard reader landing on a
   * control has already committed to it.
   *
   * Open state comes from `MixinControllerOpen`, so it announces `helix-open` and
   * `helix-close` like every other overlay here, and a consumer can drive it with
   * `open` where they need to.
   *
   * ## Attributes & Properties
   *
   * Component attributes and properties that can be applied to the element or by using JavaScript.
   *
   * - `content`: The text shown in the bubble.
   *
   * The common case, and the fallback for the `content` slot: slot something
   * there and it replaces this. Both cannot show at once, which is the point
   * of using fallback content rather than rendering whichever is present.
   * - `placement`: Preferred side. It moves if that side does not fit.
   * - `offset`: Space between the trigger and the bubble, in pixels.
   *
   * Eight, which is not arbitrary: it is the size of the arrow the styled tier
   * draws, so the point reaches the trigger and the bubble does not. A consumer
   * changing this and keeping the arrow gets a point that falls short or one
   * that overlaps what it is pointing at, which is worth knowing before
   * changing it rather than after.
   * - `disabled`: Whether the tooltip never shows.
   * - `delay`: How long the pointer must rest before the bubble appears, in milliseconds.
   *
   * Without one, sweeping across a row of controls flashes a tooltip for each
   * of them, which is noise rather than help. Focus opens with no delay: a
   * keyboard reader arriving on a control has already committed to it.
   * - `delay-out`/`delayOut`: How long the bubble stays after the pointer leaves, in milliseconds.
   * - `open`: Whether the element is open.
   *
   * One property, not two. Reading gives the real state whichever mode the
   * element is in, so `dialog.open` answers the question anyone asking it
   * meant. Writing hands ownership to the consumer, which is what the
   * attribute in `<helix-dialog open>` does as well: from then on the element
   * announces changes and applies none of them.
   *
   * It reads as an accessor pair rather than a field because those are two
   * different questions sharing one name, and the alternative was a second
   * property answering the first. That worked for a boolean, where `isOpen`
   * reads well; there is no such word for a value or an active item, so all
   * four of these mixins now have this shape instead of two shapes.
   *
   * **Not reflected, and that is required rather than tidy.** Reflection
   * writes the resolved state back as an attribute, and writing the attribute
   * is how a consumer says they own it. So an uncontrolled element that
   * opened itself would put `open` on its own host and, from the next thing
   * that read it, be indistinguishable from one the consumer controls:
   * cloned, serialised for hydration, or diffed by a framework, it would come
   * back controlled and stop responding. `data-open` carries the resolved
   * state for stylesheets, which is what it has always been for.
   * - `default-open`/`defaultOpen`: Initial open state for uncontrolled use, where nothing declared one.
   * - `onOpenChange`: The consumer's callback, invoked after the state is applied.
   *
   * Not an attribute: it is a function. And not reachable from React's JSX,
   * which reserves every `on[A-Z]` prop for its own event system and drops
   * what it does not recognize; the generated wrapper listens for the events
   * instead. (property only)
   *
   * ## Events
   *
   * Events that will be emitted by the component.
   *
   * - `helix-open`: Fired before the bubble shows, and cancelable.
   * - `helix-close`: Fired before it hides, and cancelable.
   *
   * ## Slots
   *
   * Areas where markup can be added to the component.
   *
   * - `(default)`: The trigger.
   * - `content`: The bubble's content, when `content` is not enough. Anything slotted here replaces the property, which is this slot's fallback.
   *
   * ## Methods
   *
   * Methods that can be called to access component functionality.
   *
   * - `show() => void`: Shows the bubble, unless there is nothing to show.
   * - `hide() => void`: Hides the bubble.
   * - `requestOpen(next: boolean) => boolean`: Requests an open-state change, and reports whether it was applied.
   *
   * Announces before it acts, so `preventDefault()` on the `helix-open` or
   * `helix-close` is a refusal and nothing moves. In uncontrolled mode the
   * element then updates itself; in controlled mode it applies nothing and
   * waits for the consumer to pass a new `open`, which is what "controlled"
   * means.
   * - `toggleOpen() => boolean`: Requests the opposite of the current state.
   *
   * ## CSS Parts
   *
   * Custom selectors for styling elements within the component.
   *
   * - `tooltip`: The bubble.
   * - `arrow`: The point aimed at the trigger.
   */
  "helix-base-tooltip": Partial<
    HelixBaseTooltipProps & BaseProps<HelixBaseTooltip> & BaseEvents
  >;

  /**
   * **`open`, on `MixinControllerOpen`, where it was a bare `expanded` boolean.**
   * A branch showing its children is the same state a disclosure holds, and
   * `AccordionItem` has been on that mixin all along. Written here by hand it had
   * neither half of what the mixin gives: `this.expanded = !this.expanded`
   * announced nothing, so a consumer could not know a branch had opened, and
   * could not own the state either. `aria-expanded` is still what the row
   * renders, because that is the attribute a tree uses; the property is what
   * changed, not the semantics.
   *
   * An element rather than a slot because it owns state: whether it is open,
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
   * - `value`: Identifies the item to the consumer, carried in `helix-select`.
   * - `selected`: Whether this item is the current one.
   *
   * Not reflected, for the reason `level` below gives in full: the tree assigns
   * this after it upgrades, so the attribute would be a change to markup the
   * consumer rendered and hydration would report it. It reflected, one line
   * from the paragraph saying why it must not.
   *
   * The stylesheet reads it from the row inside this shadow root, which is the
   * answer `level` gives one paragraph down: the indent it drives is written
   * onto the row rather than onto the host, because the row is not part of the
   * tree React hydrates. Mirroring to `data-selected` on the host instead was
   * the same fault with a different name, and React said so.
   * - `level`: Depth from the root, set by the tree so indentation needs no CSS nesting.
   *
   * Not reflected. The tree assigns this after it upgrades, so an attribute
   * here would be a change to markup the consumer rendered and hydration would
   * report it. The indent it drives is written onto the row instead, inside the
   * shadow root, which is not part of the tree React hydrates.
   * - `open`: Whether the element is open.
   *
   * One property, not two. Reading gives the real state whichever mode the
   * element is in, so `dialog.open` answers the question anyone asking it
   * meant. Writing hands ownership to the consumer, which is what the
   * attribute in `<helix-dialog open>` does as well: from then on the element
   * announces changes and applies none of them.
   *
   * It reads as an accessor pair rather than a field because those are two
   * different questions sharing one name, and the alternative was a second
   * property answering the first. That worked for a boolean, where `isOpen`
   * reads well; there is no such word for a value or an active item, so all
   * four of these mixins now have this shape instead of two shapes.
   *
   * **Not reflected, and that is required rather than tidy.** Reflection
   * writes the resolved state back as an attribute, and writing the attribute
   * is how a consumer says they own it. So an uncontrolled element that
   * opened itself would put `open` on its own host and, from the next thing
   * that read it, be indistinguishable from one the consumer controls:
   * cloned, serialised for hydration, or diffed by a framework, it would come
   * back controlled and stop responding. `data-open` carries the resolved
   * state for stylesheets, which is what it has always been for.
   * - `default-open`/`defaultOpen`: Initial open state for uncontrolled use, where nothing declared one.
   * - `focusable`: Whether this item holds the tree's single tab stop. (property only)
   * - `isBranch`: Whether this node has children. (property only) (readonly)
   * - `onOpenChange`: The consumer's callback, invoked after the state is applied.
   *
   * Not an attribute: it is a function. And not reachable from React's JSX,
   * which reserves every `on[A-Z]` prop for its own event system and drops
   * what it does not recognize; the generated wrapper listens for the events
   * instead. (property only)
   *
   * ## Events
   *
   * Events that will be emitted by the component.
   *
   * - `helix-select`: Fired when the item is chosen.
   * - `helix-open`: Fired before a branch opens, and cancelable.
   * - `helix-close`: Fired before a branch closes, and cancelable.
   *
   * ## Slots
   *
   * Areas where markup can be added to the component.
   *
   * - `(default)`: The item's label.
   * - `children`: Nested items, which make this a branch.
   * - `start`: Before the label, after the chevron. A mark about the item.
   * - `end`: After the label, at the row's far side. A count, or a state.
   *
   * ## Methods
   *
   * Methods that can be called to access component functionality.
   *
   * - `focusItem() => void`: Moves focus to this node.
   * - `select() => void`: Selects this node and announces it.
   * - `requestOpen(next: boolean) => boolean`: Requests an open-state change, and reports whether it was applied.
   *
   * Announces before it acts, so `preventDefault()` on the `helix-open` or
   * `helix-close` is a refusal and nothing moves. In uncontrolled mode the
   * element then updates itself; in controlled mode it applies nothing and
   * waits for the consumer to pass a new `open`, which is what "controlled"
   * means.
   * - `toggleOpen() => boolean`: Requests the opposite of the current state.
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
   * - `chevron`: Which end of a row the chevron sits at.
   *
   * Unset is the start, which is what a tree of folders looks like. `end` puts
   * it at the far side, where it reads as a control belonging to the row rather
   * than as part of the name, and it lets every label start at one place
   * without a row that has no chevron reserving space for one.
   *
   * On the tree rather than on each item, because a row whose chevron sat
   * somewhere different from its siblings' would be a mistake, not a choice.
   * - `label`: Accessible name for the tree.
   * - `active`: Which item is current, by its `value`.
   *
   * Called `active`, which is what this mixin is named for and what it was
   * not: it declared `value`, so the one mixin whose whole subject is which
   * item is active had no such property, and `active` meant something else
   * entirely elsewhere in the library. It still does, and only there now:
   * `option.active` is the option the keyboard is on, which is a different
   * question from which one is chosen.
   *
   * An accessor pair, the same shape as the other three. Reading gives the
   * real item; writing hands ownership to the consumer, so `<helix-tabs
   * active="one">` is a set that stays on that tab and `default-active` is
   * how markup says where to start.
   * - `default-active`/`defaultActive`: Initial item for uncontrolled use. Ignored once `active` is written.
   * - `onActiveChange`: The consumer's callback, invoked after the change is applied. (property only)
   *
   * ## Events
   *
   * Events that will be emitted by the component.
   *
   * - `helix-change`: Fired before the current node moves, and cancelable. The only way to refuse one.
   * - `helix-select`: Fired when an item is chosen. Dispatched by the item and listened for here, because the tree is what a consumer holds a reference to.
   *
   * ## Slots
   *
   * Areas where markup can be added to the component.
   *
   * - `(default)`: The tree's items.
   *
   * ## Methods
   *
   * Methods that can be called to access component functionality.
   *
   * - `requestActive(next: string) => boolean`: Requests a new current item, and reports whether the request stood.
   *
   * Announces before it acts, so `preventDefault()` on the `helix-change` is
   * a refusal and nothing moves. Unlike a native control, nothing has moved
   * by the time this runs, so refusing is simply not writing: there is
   * nothing to put back.
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
};

export type CustomElementsSolidJs = {
  /**
   * Carries its own open state, which is why it is an element rather than a slot.
   * Used alone, outside an accordion, it is a disclosure.
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
   * - `open`: Whether the element is open.
   *
   * One property, not two. Reading gives the real state whichever mode the
   * element is in, so `dialog.open` answers the question anyone asking it
   * meant. Writing hands ownership to the consumer, which is what the
   * attribute in `<helix-dialog open>` does as well: from then on the element
   * announces changes and applies none of them.
   *
   * It reads as an accessor pair rather than a field because those are two
   * different questions sharing one name, and the alternative was a second
   * property answering the first. That worked for a boolean, where `isOpen`
   * reads well; there is no such word for a value or an active item, so all
   * four of these mixins now have this shape instead of two shapes.
   *
   * **Not reflected, and that is required rather than tidy.** Reflection
   * writes the resolved state back as an attribute, and writing the attribute
   * is how a consumer says they own it. So an uncontrolled element that
   * opened itself would put `open` on its own host and, from the next thing
   * that read it, be indistinguishable from one the consumer controls:
   * cloned, serialised for hydration, or diffed by a framework, it would come
   * back controlled and stop responding. `data-open` carries the resolved
   * state for stylesheets, which is what it has always been for.
   * - `default-open`/`defaultOpen`: Initial open state for uncontrolled use, where nothing declared one.
   * - `onOpenChange`: The consumer's callback, invoked after the state is applied.
   *
   * Not an attribute: it is a function. And not reachable from React's JSX,
   * which reserves every `on[A-Z]` prop for its own event system and drops
   * what it does not recognize; the generated wrapper listens for the events
   * instead. (property only)
   *
   * ## Events
   *
   * Events that will be emitted by the component.
   *
   * - `helix-close`: Fired before the section closes, and cancelable.
   * - `helix-open`: Fired when the item opens or closes.
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
   * - `requestOpen(next: boolean) => boolean`: Requests an open-state change, and reports whether it was applied.
   *
   * Announces before it acts, so `preventDefault()` on the `helix-open` or
   * `helix-close` is a refusal and nothing moves. In uncontrolled mode the
   * element then updates itself; in controlled mode it applies nothing and
   * waits for the consumer to pass a new `open`, which is what "controlled"
   * means.
   * - `toggleOpen() => boolean`: Requests the opposite of the current state.
   *
   * ## CSS Parts
   *
   * Custom selectors for styling elements within the component.
   *
   * - `container`: The outer wrapper.
   * - `trigger`: The clickable summary row.
   * - `chevron`: The open and close indicator.
   * - `content`: The revealed region.
   * - `content-inner`: The clipping box inside the animated region.
   */
  "helix-base-accordion-item": Partial<
    HelixBaseAccordionItemProps &
      HelixBaseAccordionItemSolidJsProps &
      BaseProps<HelixBaseAccordionItem> &
      BaseEvents
  >;

  /**
   * Holds the mode and nothing else. The item that was clicked is what
   * coordinates: it walks up to the nearest accordion, reads the mode off it, and
   * closes its peers itself.
   *
   * Coordination is structural, not a subscription. `helix-open` does not bubble
   * and is not composed, because overlays nest and an inner one's lifecycle must
   * never read as the outer one's, so an accordion cannot learn that a child
   * opened by listening for it.
   *
   * Membership resolves on demand, so there is no registry to keep in step: an
   * item added a second after render coordinates on its first click.
   *
   * Items are matched with `instanceof HelixBaseAccordionItem`, never by tag
   * name. Matching `helix-accordion-item` would tie this tier to the styled one.
   *
   * Every listener is attached on connect, so none of it runs on the server,
   * where there is no tree to walk and no events to hear.
   *
   * ## Attributes & Properties
   *
   * Component attributes and properties that can be applied to the element or by using JavaScript.
   *
   * - `mode`: How many sections may be open at once.
   *
   * Absent is `multiple`, so nothing closes unexpectedly and the default costs
   * no attribute on the host. `single` keeps exactly one open and refuses to
   * close the last; `single-collapsible` keeps at most one and lets it close.
   *
   * A union rather than a mode plus a `collapsible` boolean, which would make
   * `collapsible` alongside `multiple` expressible and meaningless.
   * - `items`: Direct items, in light-DOM order. Client only: the server has no tree. (property only) (readonly)
   *
   * ## Slots
   *
   * Areas where markup can be added to the component.
   *
   * - `(default)`: The accordion's items.
   */
  "helix-base-accordion": Partial<
    HelixBaseAccordionProps &
      HelixBaseAccordionSolidJsProps &
      BaseProps<HelixBaseAccordion> &
      BaseEvents
  >;

  /**
   * Chrome rather than content. An announcement sits above the header and speaks
   * for the whole page: a trial ending, a service degraded, a change of terms. A
   * passage that interrupts a document to set itself apart is a `Callout`, which
   * is read where it sits and cannot be dismissed. Neither is a variant of the
   * other.
   *
   * **Always a polite live region.** `role="alert"` is assertive and interrupts
   * whatever is being read, which is right for something that appears mid-session
   * and wrong for something that was in the served HTML: an assertive
   * announcement would cut across a screen-reader user on every page load, before
   * they had read anything. Politeness costs a moment and is never wrong; the severity
   * does not change that, because an error that was always there is still not an
   * interruption.
   *
   * Dismissing is a request. The announcement does not remove itself, because the
   * consumer owns the markup and taking the node out from under them would put
   * their state and the document out of step. `preventDefault()` on the
   * `helix-dismiss` is a refusal.
   *
   * ## Attributes & Properties
   *
   * Component attributes and properties that can be applied to the element or by using JavaScript.
   *
   * - `severity`: What kind of attention the message needs.
   * - `dismissible`: Whether it offers a control to take it away.
   * - `dismiss-label`/`dismissLabel`: Accessible name for that control.
   *
   * `attribute` is spelled out because Lit lowercases a property name to
   * derive one rather than dash-casing it, so this would otherwise be
   * reachable only as `dismisslabel`, which nobody would guess and no linter
   * would catch.
   *
   * ## Events
   *
   * Events that will be emitted by the component.
   *
   * - `helix-dismiss`: Fired when the reader asks to close it.
   *
   * ## Slots
   *
   * Areas where markup can be added to the component.
   *
   * - `(default)`: The message.
   * - `actions`: What to do about it, usually a link or a button.
   * - `icon`: Replaces the glyph inside the dismiss control.
   *
   * ## Methods
   *
   * Methods that can be called to access component functionality.
   *
   * - `dismiss() => boolean`: Announces that it should go, and reports whether the request stood.
   *
   * ## CSS Parts
   *
   * Custom selectors for styling elements within the component.
   *
   * - `content`: The message region.
   * - `actions`: The trailing action region.
   * - `dismiss`: The control that asks to close.
   */
  "helix-base-announcement": Partial<
    HelixBaseAnnouncementProps &
      HelixBaseAnnouncementSolidJsProps &
      BaseProps<HelixBaseAnnouncement> &
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
   * Three regions, each in its own wrapper, because the row is a grid and a grid
   * needs three items to put the middle one in the middle. A bare slot is
   * `display: contents`, so its assigned elements become grid items themselves:
   * two actions would take two tracks and push the navigation off center. These
   * wrappers earn their boxes, which is the test; they carry no inset or fill of
   * their own, so an empty one still paints nothing.
   *
   * The host is the banner and spans the viewport; the row inside it is what gets
   * centered. A banner that is itself narrowed leaves its background stopping
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
   * Centered by default, which reads as the site's spine when the navigation is
   * the primary thing in the header rather than an afterthought beside a logo.
   * Centered against the banner rather than against whatever space the brand
   * left over, so the middle of the nav is the middle of the window whatever
   * the wordmark and the actions happen to measure.
   *
   * `start` is the opt-out, for a header whose navigation trails the brand.
   *
   * ## Slots
   *
   * Areas where markup can be added to the component.
   *
   * - `start`: Leading content, usually a wordmark.
   * - `(default)`: The middle region, usually a `Navigation`.
   * - `end`: Trailing content.
   *
   * ## CSS Parts
   *
   * Custom selectors for styling elements within the component.
   *
   * - `row`: The centered row inside the banner.
   * - `start`: The leading region.
   * - `content`: The middle region.
   * - `end`: The trailing region.
   */
  "helix-base-app-header": Partial<
    HelixBaseAppHeaderProps &
      HelixBaseAppHeaderSolidJsProps &
      BaseProps<HelixBaseAppHeader> &
      BaseEvents
  >;

  /**
   * A part of `Avatar` rather than a family of its own: it arranges avatars and
   * is about nothing else, and its member is a complete `Avatar` the group did
   * not have to explain.
   *
   * **The overflow count is the group's, not a slot.** Which avatars are hidden
   * is a fact the group works out from `max` and how many it was given, so a
   * consumer writing the "+3" themselves would be writing a number that has to
   * agree with a list they do not control.
   *
   * **Hidden, not removed.** Past `max`, the extra avatars stay in the DOM and
   * stop being shown, so nothing re-renders when `max` changes and the accessible
   * name can still be built from all of them. The count is what a sighted reader
   * gets; the group's own name is what everyone else gets, and "Seven people" is
   * more useful than seven names read in a row.
   *
   * **It is a list.** A row of faces is a set of separate people, and a group
   * with no role announces as one run of text. `role="list"` needs its children
   * to be `listitem`, which they cannot be told to become without writing an
   * attribute onto a consumer's element, so the group carries `role="group"` and
   * its name instead: one announcement, correct, and nothing written to anyone
   * else's markup.
   *
   * ## Attributes & Properties
   *
   * Component attributes and properties that can be applied to the element or by using JavaScript.
   *
   * - `label`: Accessible name for the set, such as "Reviewers".
   * - `max`: How many avatars are shown before the rest become a count.
   *
   * Zero or less shows all of them, which is what an unset limit means and is
   * more useful than refusing to render.
   * - `avatars`: The avatars, in light-DOM order. Empty on the server, which has no tree. (property only) (readonly)
   * - `overflow`: How many avatars are past the limit, and so not shown.
   *
   * Not `hidden`, which is `HTMLElement`'s own boolean: a getter of that name
   * returning a number is a type error, and had it been assignable it would
   * have been worse, because a group with three extra members would have set
   * the attribute that hides the whole group. (property only) (readonly)
   *
   * ## Slots
   *
   * Areas where markup can be added to the component.
   *
   * - `(default)`: The avatars, in the order they should be read.
   *
   * ## CSS Parts
   *
   * Custom selectors for styling elements within the component.
   *
   * - `overflow`: The count of avatars past `max`.
   */
  "helix-base-avatar-group": Partial<
    HelixBaseAvatarGroupProps &
      HelixBaseAvatarGroupSolidJsProps &
      BaseProps<HelixBaseAvatarGroup> &
      BaseEvents
  >;

  /**
   * Shows `src` until it fails to load. Without an image, or after a failure,
   * the default slot is shown; its own fallback is the initials.
   *
   * The host carries the accessible name, taken from `name`, so the `<img>` has an
   * empty `alt` and the initials are hidden from assistive technology. Announcing
   * either would repeat the name. An `aria-label` on the host overrides `name`,
   * for an avatar standing for something a person's name does not describe.
   *
   * `load` and `error` are relayed from the host. They are not composed, so they
   * stop at the shadow boundary otherwise.
   *
   * ## Attributes & Properties
   *
   * Component attributes and properties that can be applied to the element or by using JavaScript.
   *
   * - `src`: Image to show. Falls back to the slot, or to initials, if it fails.
   * - `name`: Name of the person or entity. Used for the label and the initials.
   *
   * ## Events
   *
   * Events that will be emitted by the component.
   *
   * - `load`: Relayed from the image once it has loaded.
   * - `error`: Relayed from the image when it fails.
   *
   * ## Slots
   *
   * Areas where markup can be added to the component.
   *
   * - `(default)`: Shown when there is no usable image, in place of the initials.
   *
   * ## CSS Parts
   *
   * Custom selectors for styling elements within the component.
   *
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
   * Wraps whatever it decorates and pins the indicator to its corner, so the
   * thing being counted stays the thing in the layout: a badge is an annotation,
   * not a container that happens to hold an icon.
   *
   * The indicator says how many, and none is none. A `value` that reads as zero
   * shows no mark at all, an absent one shows a bare dot, and any other value
   * shows the value. `max` caps the top: past it the indicator reads `{max}+`
   * rather than growing to fit, since a corner mark that widens with its value
   * pushes the layout around.
   *
   * **A dot needs a label.** Without one it is a colored circle that announces
   * nothing, which tells a sighted reader there is something new and tells
   * everyone else there is not. The label is required in that form, and the
   * indicator is hidden from assistive technology when a number already says it.
   *
   * ## Attributes & Properties
   *
   * Component attributes and properties that can be applied to the element or by using JavaScript.
   *
   * - `value`: The count or short text to show. Absent shows a dot, zero shows nothing.
   * - `max`: Cap for a numeric value. Past it the indicator reads `{max}+`.
   * - `label`: Accessible name. Required for a dot, which has no text to read.
   *
   * ## Slots
   *
   * Areas where markup can be added to the component.
   *
   * - `(default)`: The element being decorated.
   *
   * ## CSS Parts
   *
   * Custom selectors for styling elements within the component.
   *
   * - `indicator`: The count, or the dot when there is no value.
   */
  "helix-base-badge": Partial<
    HelixBaseBadgeProps &
      HelixBaseBadgeSolidJsProps &
      BaseProps<HelixBaseBadge> &
      BaseEvents
  >;

  /**
   * Renders a real `<blockquote>` with a `<footer>` for the attribution, which is
   * the structure the HTML spec describes for exactly this: the attribution is
   * about the quotation rather than part of it, and putting it inside the quoted
   * text claims the source said their own name.
   *
   * A quotation run inside a sentence is a `Quote`, which is a different element
   * because it is a different job.
   *
   * ## Attributes & Properties
   *
   * Component attributes and properties that can be applied to the element or by using JavaScript.
   *
   * - `cite`: URL identifying where the passage came from.
   *
   * ## Slots
   *
   * Areas where markup can be added to the component.
   *
   * - `(default)`: The quoted passage.
   * - `attribution`: Who said it, and where.
   *
   * ## CSS Parts
   *
   * Custom selectors for styling elements within the component.
   *
   * - `blockquote`: The quotation.
   * - `attribution`: The footer carrying the source.
   */
  "helix-base-blockquote": Partial<
    HelixBaseBlockquoteProps &
      HelixBaseBlockquoteSolidJsProps &
      BaseProps<HelixBaseBlockquote> &
      BaseEvents
  >;

  /**
   * Contributes the separator and the list-item role. The link is the consumer's
   * own, slotted in, because an anchor rendered into this element's shadow root
   * is unreachable to the framework that owns the route: a router renders its own
   * `<a>`, and one written here would be a full page load instead.
   *
   * Each item renders its own separator and hides it with `:host(:first-child)`,
   * so the trail needs no index and no coordination from the parent. `:host()`
   * takes a structural pseudo-class, unlike `:has()`, which it rejects.
   *
   * The current page is text, not a link. Linking a page to itself is a known
   * screen-reader annoyance, and `aria-current="page"` on the host is what
   * conveys position.
   *
   * ## Attributes & Properties
   *
   * Component attributes and properties that can be applied to the element or by using JavaScript.
   *
   * - `current`: Whether this item is the page the reader is on.
   *
   * ## Slots
   *
   * Areas where markup can be added to the component.
   *
   * - `(default)`: The step: a link, or the text of the current page. A link is styled with `data-link="quiet"`, since a slotted anchor belongs to the outer tree and cannot be reached from this component's styles.
   * - `separator`: Replaces the chevron shown before this item.
   *
   * ## CSS Parts
   *
   * Custom selectors for styling elements within the component.
   *
   * - `separator`: The separator preceding the item.
   */
  "helix-base-breadcrumb": Partial<
    HelixBaseBreadcrumbProps &
      HelixBaseBreadcrumbSolidJsProps &
      BaseProps<HelixBaseBreadcrumb> &
      BaseEvents
  >;

  /**
   * The host is the landmark, so `aria-label` on it names the trail directly and
   * there is no property mirroring one. A page may hold more than one navigation,
   * and landmarks are how a screen-reader user chooses between them.
   *
   * `role="list"` is set explicitly on the `<ol>` even though it is already a
   * list: removing the markers with `list-style: none` strips list semantics in
   * Safari, and a breadcrumb trail always removes its markers.
   *
   * Items are slotted rather than wrapped, so they are `<ol>` children in the flat
   * tree and each carries `role="listitem"` itself.
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
   * - `list`: The ordered list.
   */
  "helix-base-breadcrumbs": Partial<
    HelixBaseBreadcrumbsProps &
      HelixBaseBreadcrumbsSolidJsProps &
      BaseProps<HelixBaseBreadcrumbs> &
      BaseEvents
  >;

  /**
   * The host is the group, so `role="group"` sits on it through internals and
   * `label` names it. A group of buttons with no name is announced as a run of
   * separate controls, which is what the grouping exists to say it is not.
   *
   * It manages no focus. A group is not a toolbar: the APG toolbar pattern asks
   * for one tab stop with arrow keys inside it, and that is what Toolbar is for.
   * Here every button keeps its own tab stop, which is what a reader expects from
   * buttons sitting side by side.
   *
   * Buttons are slotted rather than wrapped, so they stay the consumer's own
   * elements and keep whatever appearance and size they were given.
   *
   * ## Attributes & Properties
   *
   * Component attributes and properties that can be applied to the element or by using JavaScript.
   *
   * - `label`: Accessible name for the group.
   *
   * On the host through internals, so an author's `aria-label` still overrides
   * it and nothing lands on the host that a consumer's markup did not have.
   *
   * ## Slots
   *
   * Areas where markup can be added to the component.
   *
   * - `(default)`: The buttons in the group.
   */
  "helix-base-button-group": Partial<
    HelixBaseButtonGroupProps &
      HelixBaseButtonGroupSolidJsProps &
      BaseProps<HelixBaseButtonGroup> &
      BaseEvents
  >;

  /**
   * Renders a real `<button>`, so activation, focus, and the browser's own
   * affordances come from the platform rather than from key handlers.
   *
   * **It never renders an anchor.** A router has to render its own `<a>` to
   * intercept a click and cannot render one inside this shadow root, so a button
   * that could also be a link forced every such navigation to be a full page
   * load. A link that looks like a button is styling rather than behavior, so it
   * is a recipe in the base layer: `<Link data-button="primary">` is the same
   * control, and the consumer keeps their anchor.
   *
   * `delegatesFocus` puts focus on the inner control, and it serializes into the
   * server's markup, so the button is keyboard reachable before any JavaScript
   * loads.
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
   * - `label`: Accessible name, for a button whose content is not text.
   *
   * Lives here rather than only on `IconButton` so the two share one render.
   * An icon-only button without it is a control a screen reader announces as
   * "button" and nothing else.
   * - `command`: What to send when the button is activated, and what to send it to.
   *
   * The platform's invoker attributes, forwarded onto the inner `<button>`
   * rather than left on the host: only a real button is recognized as an
   * invoker, so `commandfor` written on a custom element resolves nothing and
   * the trigger silently does nothing at all. A wrapper has to hand them down,
   * the same way `label` becomes `aria-label` in there.
   *
   * ```html
   * <helix-button commandfor="confirm" command="--show">Delete…</helix-button>
   * ```
   *
   * `commandFor` spells its attribute out, because Lit lowercases a property
   * name to derive one rather than dash-casing it, and what a consumer writes
   * is the platform's `commandfor`.
   * - `commandfor`/`commandFor`: The id of the element the command is sent to.
   * - `disabled`: Whether the control is non-interactive.
   *
   * Reflected, because the styled tier selects on it, and mirrored to
   * `aria-disabled` rather than removing the element from the accessibility
   * tree, so a screen reader can still announce that the control exists.
   * - `name`: Name submitted with the form.
   *
   * **Reflected, and it is the exception to "reflect only what CSS selects
   * on".** The platform builds a form's entry list from the `name` *content
   * attribute*, not from the property, so a control named through the property
   * submitted under no name at all and was silently dropped. Measured: two
   * inputs in one form, one named by attribute and one by property, and the
   * form carried a single entry.
   *
   * Safe for a React consumer, which is what the rule is protecting: React
   * renders a custom element's props as attributes on the server, so the name
   * is already in the markup being hydrated and reflecting it writes what is
   * there. It is only a change to the markup when a consumer assigns it
   * imperatively later, and nothing is hydrating by then.
   *
   * Here rather than on each control, where it was declared eight times and
   * reflected none of them.
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
   * - `isDisabled`: Whether the control is off, by its own attribute or by an ancestor.
   *
   * What a component should bind to rather than `disabled`, which is only the
   * half of it the consumer wrote. (property only) (readonly)
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
   * ## Methods
   *
   * Methods that can be called to access component functionality.
   *
   * - `formDisabledCallback(disabled: boolean) => void`: The platform's notice that an ancestor fieldset changed.
   *
   * ## CSS Parts
   *
   * Custom selectors for styling elements within the component.
   *
   * - `button`: The inner control.
   */
  "helix-base-button": Partial<
    HelixBaseButtonProps &
      HelixBaseButtonSolidJsProps &
      BaseProps<HelixBaseButton> &
      BaseEvents
  >;

  /**
   * A grid of days, per the APG date grid: the whole grid is one tab stop, arrows
   * move by day and week, `PageUp` and `PageDown` move by month, and `Home` and
   * `End` go to the ends of the week. Only the focused cell is in the tab
   * sequence.
   *
   * Roving `tabindex` is written on the cells, which is free here because they
   * are rendered into this shadow root rather than being markup a consumer wrote.
   *
   * Dates are `YYYY-MM-DD` strings and every calculation is in UTC. A local-time
   * `Date` shifts across a timezone or a daylight-saving boundary, so the string
   * is what the component holds and the arithmetic never leaves UTC.
   *
   * `month` is what the grid shows, separately from `value`, so paging through
   * months does not select anything and a consumer can drive the view. Left
   * unset, it follows the first selected date, and then the current month.
   *
   * `mode` decides how many dates are held. Absent takes one. `range` takes two
   * and marks everything between them, starting over on the third click rather
   * than replacing an end at random. `multiple` toggles, so clicking a chosen
   * date takes it out. All three read and write the same comma-separated
   * `value`.
   *
   * `locale` is worth setting where the output is compared across environments.
   * Left unset, month and day names come from the runtime's own locale, and a
   * server and a browser need not agree on what that is.
   *
   * ## Attributes & Properties
   *
   * Component attributes and properties that can be applied to the element or by using JavaScript.
   *
   * - `mode`: How many dates can be held at once.
   * - `months`: How many months to show, side by side.
   * - `locale`: Locale for month and day names. Absent uses the runtime's own.
   * - `disable-dates`/`disableDates`: Dates that cannot be chosen, comma separated, as `YYYY-MM-DD`.
   * - `disable-days`/`disableDays`: Days of the week that cannot be chosen, comma separated, `0` to `6`.
   * - `invalid`: Whether the current selection fails validation.
   * - `month`: The month on show, as `YYYY-MM`. Follows `value`, then the current month.
   *
   * Separate from `value` on purpose, so paging selects nothing and a consumer
   * can drive the view. It said that and could not do it: the calendar wrote
   * this when the reader paged, so a consumer holding it was overwritten and
   * never told. Reading gives the month on show; writing declares it theirs,
   * and `default-month` seeds one the calendar owns.
   * - `previous-label`/`previousLabel`: Accessible name for the control that pages back.
   *
   * A property because this is the one component in the library that takes a
   * `locale`, and it carried two hardcoded English names with no way to change
   * them: a calendar rendering its own month names in Japanese still announced
   * its controls in English. `attribute:` spelled out, since Lit lowercases a
   * camelCase name rather than dash-casing it.
   * - `next-label`/`nextLabel`: Accessible name for the control that pages forward.
   * - `default-month`/`defaultMonth`: Month to open on, where nothing declared one.
   * - `min`: Earliest selectable date, as `YYYY-MM-DD`.
   * - `max`: Latest selectable date, as `YYYY-MM-DD`.
   * - `label`: Accessible name for the grid.
   * - `first-day-of-week`/`firstDayOfWeek`: First column of the week, `0` for Sunday through `6` for Saturday.
   * - `default-value`/`defaultValue`: The value the markup declared, which is where a reset returns to.
   * - `value`: What the control holds now, and what its form submits.
   *
   * One property, not two. Reading gives the real value whichever mode the
   * control is in, so `input.value` answers the question anyone asking it
   * meant. Writing hands ownership to the consumer, which is what
   * `<helix-input value="x">` says too, and matches what a controlled input
   * means in React: the value is theirs and the control waits to be told.
   * `default-value` is how markup seeds one it does not want to own.
   *
   * The same shape as the other three mixins, which is the point of them
   * being four of a kind rather than four of three kinds.
   * - `disabled`: Whether the control is non-interactive.
   *
   * Reflected, because the styled tier selects on it, and mirrored to
   * `aria-disabled` rather than removing the element from the accessibility
   * tree, so a screen reader can still announce that the control exists.
   * - `name`: Name submitted with the form.
   *
   * **Reflected, and it is the exception to "reflect only what CSS selects
   * on".** The platform builds a form's entry list from the `name` *content
   * attribute*, not from the property, so a control named through the property
   * submitted under no name at all and was silently dropped. Measured: two
   * inputs in one form, one named by attribute and one by property, and the
   * form carried a single entry.
   *
   * Safe for a React consumer, which is what the rule is protecting: React
   * renders a custom element's props as attributes on the server, so the name
   * is already in the markup being hydrated and reflecting it writes what is
   * there. It is only a change to the markup when a consumer assigns it
   * imperatively later, and nothing is hydrating by then.
   *
   * Here rather than on each control, where it was declared eight times and
   * reflected none of them.
   * - `onValueChange`: The consumer's callback, invoked after the value is applied.
   *
   * Not an attribute: it is a function. `onValueChange` and not `onChange`,
   * because React reserves the latter for its own synthetic system and wires
   * it to the native `change`, so a Helix event named `Change` would never
   * fire at all. (property only)
   * - `isDisabled`: Whether the control is off, by its own attribute or by an ancestor.
   *
   * What a component should bind to rather than `disabled`, which is only the
   * half of it the consumer wrote. (property only) (readonly)
   * - `form`: The form this control belongs to, if any. (property only) (readonly)
   * - `labels`: Labels associated with this control. (property only) (readonly)
   *
   * ## Events
   *
   * Events that will be emitted by the component.
   *
   * - `helix-change`: Fired before the dates change, and cancelable.
   * - `helix-navigate`: Fired before the month on show changes, and cancelable.
   *
   * ## Methods
   *
   * Methods that can be called to access component functionality.
   *
   * - `requestValue(next: string) => boolean`: Requests a new value, and reports whether the request stood.
   *
   * Announces before it acts, so `preventDefault()` on the `helix-change` is
   * a refusal and nothing moves. In uncontrolled mode the control then
   * updates itself; in controlled mode it applies nothing and waits for the
   * consumer to pass a new `value`, which is what controlled means.
   * - `formResetCallback() => void`: Returns the control to the value its markup declared.
   *
   * Both halves are dropped, the consumer's and the control's, because a
   * reset means the form is as it was served. Clearing only the internal one
   * would leave a control that had been written to stuck at that value.
   * - `formStateRestoreCallback(state: string | null) => void`: Restores the value when the browser brings a form back.
   *
   * Falling back to `defaultValue` rather than to empty, because a restore
   * with no state is a form the browser has nothing recorded for, which is
   * the same situation as a fresh one.
   * - `formDisabledCallback(disabled: boolean) => void`: The platform's notice that an ancestor fieldset changed.
   *
   * ## CSS Parts
   *
   * Custom selectors for styling elements within the component.
   *
   * - `months`: The run of months.
   * - `month`: One month, its header and its grid.
   * - `header`: The month name and its controls.
   * - `previous`: The control that moves to the previous month.
   * - `next`: The control that moves to the next month.
   * - `heading`: The month and year being shown.
   * - `grid`: The grid of days.
   * - `weekday`: A column header naming a day of the week.
   * - `week`: One row of days.
   * - `cell`: One column of a row, which is what a range paints.
   * - `day`: The shape inside a cell, which is what a single date paints.
   */
  "helix-base-calendar": Partial<
    HelixBaseCalendarProps &
      HelixBaseCalendarSolidJsProps &
      BaseProps<HelixBaseCalendar> &
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
   * Not an `Announcement`, which is the other thing this could be mistaken for.
   * A callout interrupts a document to set a passage apart and is read where it
   * sits; an announcement is page-level chrome above the masthead, announces
   * itself as a live region, and can be dismissed. Neither is a variant of the
   * other.
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
   * - `title`: A heading above the content.
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
   * The track is a scroller with scroll snapping, so a drag, a trackpad swipe,
   * and the browser's own momentum all work without being reimplemented. The
   * controls scroll it; they do not drive a transform.
   *
   * Slides are the consumer's own elements. Each is given
   * `aria-roledescription="slide"` and a name reading its position in the set,
   * which is what a screen-reader user needs to know where they are. Where a
   * slide carries its own `aria-label`, that one is left alone.
   *
   * **Rotation stops on focus and on hover, and once stopped it stays stopped.**
   * The APG is explicit: rotation must not resume unless the reader asks for it,
   * so hovering away does not start it again. The control names the action it
   * performs, and it is first in the tab order.
   *
   * ## Attributes & Properties
   *
   * Component attributes and properties that can be applied to the element or by using JavaScript.
   *
   * - `label`: Accessible name for the carousel.
   * - `index`: The slide in view, counted from zero.
   *
   * Reading gives the real slide, in either mode. Writing sets it, the way a
   * script assigning to a native control does. Which mode the carousel is in is
   * read once, at the first update, from whether anything had declared an
   * `index` by then: declared, and the consumer owns it and the carousel only
   * announces where it would have gone; not declared, and the carousel owns it
   * and `default-index` says where it starts.
   *
   * The same contract the four mixins carry, written out here rather than
   * extracted, because a slide is addressed by position and every one of those
   * mixins is keyed by a name. One consumer is not a mixin: if a second numeric
   * state turns up, this is what it is extracted from.
   * - `default-index`/`defaultIndex`: Slide to start on, where nothing declared one.
   * - `loop`: Whether moving past either end wraps to the other.
   * - `autoplay`: Whether the carousel advances on its own.
   * - `interval`: How long each slide is held, in milliseconds.
   * - `slides`: The slides, in light-DOM order. Empty on the server, which has no tree. (property only) (readonly)
   *
   * ## Events
   *
   * Events that will be emitted by the component.
   *
   * - `helix-select`: Fired when the slide in view changes, with its index.
   *
   * ## Slots
   *
   * Areas where markup can be added to the component.
   *
   * - `(default)`: The slides.
   *
   * ## Methods
   *
   * Methods that can be called to access component functionality.
   *
   * - `goTo(index: number) => void`: Moves to a slide, wrapping only where `loop` says to.
   *
   * ## CSS Parts
   *
   * Custom selectors for styling elements within the component.
   *
   * - `controls`: The row of controls.
   * - `rotation`: The control that stops and starts rotation.
   * - `previous`: The control that moves to the previous slide.
   * - `next`: The control that moves to the next slide.
   * - `track`: The scroller the slides sit in.
   * - `indicators`: The row of controls saying where the reader is.
   * - `indicator`: One of them, and a way to reach that slide.
   */
  "helix-base-carousel": Partial<
    HelixBaseCarouselProps &
      HelixBaseCarouselSolidJsProps &
      BaseProps<HelixBaseCarousel> &
      BaseEvents
  >;

  /**
   * The host is the group, so `role="group"` sits on it through internals and
   * `label` names it. A run of checkboxes with no name is announced as separate
   * controls, which is what the grouping exists to say it is not.
   *
   * **Each checkbox still submits itself.** They are form-associated already and
   * a native group is several inputs sharing a name, so this adds no form value
   * of its own: it would submit the same answers twice. What it adds is the
   * grouping, a shared `name` so it is written once, and one place to read and
   * write the whole set.
   *
   * `value` is the checked values, comma separated, in the order the boxes are
   * written. Setting it ticks exactly those and unticks the rest.
   *
   * ## Attributes & Properties
   *
   * Component attributes and properties that can be applied to the element or by using JavaScript.
   *
   * - `disabled`: Whether the whole set is out of play.
   *
   * Its own property rather than an inherited one, because this group is not
   * form-associated and `disabled` arrives with `HelixFormElement`. The boxes
   * are each form-associated and have their own, which is exactly why the two
   * have to be reconciled rather than simply written over.
   * - `name`: Name submitted with the form, given to every box that has none.
   * - `value`: The checked values, comma separated.
   * - `hint`: Help under the control, shown while there is nothing wrong.
   * - `feedback`: What is wrong, in the reader's words rather than the browser's.
   * - `label`: The accessible name, and the fallback for the `label` slot.
   * - `required`: Whether the form refuses to submit without it.
   * - `boxes`: The boxes, in light-DOM order. Client only: the server has no tree. (property only) (readonly)
   * - `resolvedFeedback`: The message actually shown: the consumer's, or the platform's, or none. (property only) (readonly)
   * - `describedBy`: Id of the description node, for `aria-describedby` on the control.
   *
   * One at a time, because only one of the two is ever rendered. Naming both
   * would point a screen reader at an id that resolves to nothing, which it
   * reads as a description it cannot find. (property only) (readonly)
   *
   * ## Events
   *
   * Events that will be emitted by the component.
   *
   * - `helix-change`: Fired when any box changes, with the whole set.
   *
   * ## Slots
   *
   * Areas where markup can be added to the component.
   *
   * - `(default)`: The checkboxes.
   * - `label`: Richer than a string, where the label is more than one.
   * - `hint`: Richer than a string.
   *
   * ## CSS Parts
   *
   * Custom selectors for styling elements within the component.
   *
   * - `label`: The group's name, over the set.
   * - `items`: The list itself, which is what `orientation` lays out.
   * - `hint`: Help under the set.
   * - `feedback`: What is wrong with it.
   */
  "helix-base-checkbox-group": Partial<
    HelixBaseCheckboxGroupProps &
      HelixBaseCheckboxGroupSolidJsProps &
      BaseProps<HelixBaseCheckboxGroup> &
      BaseEvents
  >;

  /**
   * Renders a real `<input type="checkbox">`, so the space key, the focus ring,
   * and the indeterminate glyph come from the platform. `delegatesFocus` puts
   * focus on it, and it serializes into the server's markup, so the control is
   * reachable before any script loads.
   *
   * **The input inside a shadow root submits nothing**, because the form is on
   * the other side of the boundary. The host is form-associated instead and
   * reports its own value through `ElementInternals`, which is also what carries
   * validity and what answers a form reset.
   *
   * A checked box submits its `value`, and an unchecked one submits nothing at
   * all. That is what a native checkbox does, and a form built around one reads
   * the absence rather than a `false`.
   *
   * `indeterminate` is presentation and nothing else. It is neither checked nor
   * unchecked to a reader, it never submits, and the first click resolves it: a
   * third state that survives interaction is a control nobody can finish.
   *
   * ## Attributes & Properties
   *
   * Component attributes and properties that can be applied to the element or by using JavaScript.
   *
   * - `value`: Value submitted when the box is checked.
   * - `indeterminate`: Whether the box shows as neither checked nor unchecked.
   *
   * Presentation only. It never submits, and the first change resolves it.
   * - `checked`: Whether the control is checked.
   *
   * One property rather than two. Reading gives the real state whichever
   * mode the control is in; writing hands ownership to the consumer, which
   * is what the attribute in `<helix-checkbox checked>` does as well. The
   * same shape all four of these mixins have, for the reason given on
   * `MixinControllerOpen.open`.
   *
   * Not reflected: the attribute is the consumer's input and stays as they
   * wrote it, and `data-checked` carries the resolved state for stylesheets.
   * - `default-checked`/`defaultChecked`: Initial checked state for uncontrolled use, where nothing declared one.
   * - `hint`: Help under the control, shown while there is nothing wrong.
   * - `feedback`: What is wrong, in the reader's words rather than the browser's.
   * - `label`: The accessible name, and the fallback for the `label` slot.
   * - `required`: Whether the form refuses to submit without it.
   * - `disabled`: Whether the control is non-interactive.
   *
   * Reflected, because the styled tier selects on it, and mirrored to
   * `aria-disabled` rather than removing the element from the accessibility
   * tree, so a screen reader can still announce that the control exists.
   * - `name`: Name submitted with the form.
   *
   * **Reflected, and it is the exception to "reflect only what CSS selects
   * on".** The platform builds a form's entry list from the `name` *content
   * attribute*, not from the property, so a control named through the property
   * submitted under no name at all and was silently dropped. Measured: two
   * inputs in one form, one named by attribute and one by property, and the
   * form carried a single entry.
   *
   * Safe for a React consumer, which is what the rule is protecting: React
   * renders a custom element's props as attributes on the server, so the name
   * is already in the markup being hydrated and reflecting it writes what is
   * there. It is only a change to the markup when a consumer assigns it
   * imperatively later, and nothing is hydrating by then.
   *
   * Here rather than on each control, where it was declared eight times and
   * reflected none of them.
   * - `onCheckedChange`: The consumer's callback, invoked after the state is applied.
   *
   * Not an attribute: it is a function. And not reachable from React's JSX,
   * which reserves every `on[A-Z]` prop for its own event system and drops
   * what it does not recognize; the generated wrapper listens for the event
   * instead. (property only)
   * - `resolvedFeedback`: The message actually shown: the consumer's, or the platform's, or none. (property only) (readonly)
   * - `describedBy`: Id of the description node, for `aria-describedby` on the control.
   *
   * One at a time, because only one of the two is ever rendered. Naming both
   * would point a screen reader at an id that resolves to nothing, which it
   * reads as a description it cannot find. (property only) (readonly)
   * - `isDisabled`: Whether the control is off, by its own attribute or by an ancestor.
   *
   * What a component should bind to rather than `disabled`, which is only the
   * half of it the consumer wrote. (property only) (readonly)
   * - `form`: The form this control belongs to, if any. (property only) (readonly)
   * - `labels`: Labels associated with this control. (property only) (readonly)
   *
   * ## Events
   *
   * Events that will be emitted by the component.
   *
   * - `helix-change`: Fired before the state changes, and cancelable.
   * - `change`: Relayed from the input once the state has changed.
   *
   * ## Slots
   *
   * Areas where markup can be added to the component.
   *
   * - `(default)`: The label.
   *
   * ## Methods
   *
   * Methods that can be called to access component functionality.
   *
   * - `formResetCallback() => void`: Returns the box to the state its markup declared.
   * - `formStateRestoreCallback(state: string | null) => void`: Restores the box when the browser brings a form back.
   * - `requestChecked(next: boolean) => boolean`: Requests a checked change, and reports whether it was applied.
   *
   * Announces before it acts, so `preventDefault()` on the
   * `helix-change` is a refusal and nothing moves. In uncontrolled mode
   * the element then updates itself; in controlled mode it applies nothing
   * and waits for the consumer to pass a new `checked`, which is what
   * "controlled" means.
   * - `toggleChecked() => boolean`: Requests the opposite of the current state.
   * - `resetChecked() => void`: Drops the uncontrolled state, so the control reads `defaultChecked`
   * again.
   *
   * A form reset has to return a control to what its markup declared, and
   * clearing `checked` alone only leaves controlled mode. The value the
   * element has been keeping lives here, so this is where it is dropped.
   * - `formDisabledCallback(disabled: boolean) => void`: The platform's notice that an ancestor fieldset changed.
   *
   * ## CSS Parts
   *
   * Custom selectors for styling elements within the component.
   *
   * - `field`: The row the box and its label share, and the surface the card appearance draws.
   * - `box`: The frame the input is painted as, and the mark sits over.
   * - `control`: The input.
   * - `label`: The label beside it.
   * - `mark`: The tick, or the dash when the box is indeterminate.
   */
  "helix-base-checkbox": Partial<
    HelixBaseCheckboxProps &
      HelixBaseCheckboxSolidJsProps &
      BaseProps<HelixBaseCheckbox> &
      BaseEvents
  >;

  /**
   * A real `<dialog>` opened with `showModal()`, not a div with a role and a
   * hand-built trap. The platform gives four things that are each a day's work to
   * reimplement and easy to get subtly wrong: the top layer, so the dialog is
   * above everything regardless of what `z-index` anyone else wrote; a real
   * backdrop; Escape; and inert-behind, so the page underneath is not reachable
   * by pointer, keyboard, or a screen reader's virtual cursor.
   *
   * **`open` drives `showModal()`, and every way it can close comes back through
   * `requestOpen`.** A native dialog can close from three directions: the
   * property, Escape, and a `<form method="dialog">` submit inside it. Left
   * alone, two of those would shut the dialog while the consumer's state still
   * said open, which is the bug that makes a modal impossible to reopen. Escape
   * is intercepted and routed through the request, so `preventDefault()` on the
   * `helix-close` refuses it; a close that happens anyway is reflected back.
   *
   * **Nothing here traps focus.** `showModal()` does it, and better: `inert` on
   * the rest of the document is something no JavaScript trap can achieve.
   * `FocusTrapController` stays for the surfaces that are not modal.
   *
   * The regions are bare slots rather than wrappers, for the reason the card's
   * are: an unassigned `<slot>` is `display: contents` and generates no box, so a
   * dialog with no footer has no empty band where one would be.
   *
   * ## Attributes & Properties
   *
   * Component attributes and properties that can be applied to the element or by using JavaScript.
   *
   * - `label`: Accessible name for the dialog.
   * - `persistent`: Whether Escape and the backdrop can close it.
   *
   * Off for a dialog that must be answered. It does not disable the close
   * control a consumer slots in: refusing to be dismissed is not the same as
   * refusing to be closed, and a dialog with no way out at all is a trap.
   * - `open`: Whether the element is open.
   *
   * One property, not two. Reading gives the real state whichever mode the
   * element is in, so `dialog.open` answers the question anyone asking it
   * meant. Writing hands ownership to the consumer, which is what the
   * attribute in `<helix-dialog open>` does as well: from then on the element
   * announces changes and applies none of them.
   *
   * It reads as an accessor pair rather than a field because those are two
   * different questions sharing one name, and the alternative was a second
   * property answering the first. That worked for a boolean, where `isOpen`
   * reads well; there is no such word for a value or an active item, so all
   * four of these mixins now have this shape instead of two shapes.
   *
   * **Not reflected, and that is required rather than tidy.** Reflection
   * writes the resolved state back as an attribute, and writing the attribute
   * is how a consumer says they own it. So an uncontrolled element that
   * opened itself would put `open` on its own host and, from the next thing
   * that read it, be indistinguishable from one the consumer controls:
   * cloned, serialised for hydration, or diffed by a framework, it would come
   * back controlled and stop responding. `data-open` carries the resolved
   * state for stylesheets, which is what it has always been for.
   * - `default-open`/`defaultOpen`: Initial open state for uncontrolled use, where nothing declared one.
   * - `onOpenChange`: The consumer's callback, invoked after the state is applied.
   *
   * Not an attribute: it is a function. And not reachable from React's JSX,
   * which reserves every `on[A-Z]` prop for its own event system and drops
   * what it does not recognize; the generated wrapper listens for the events
   * instead. (property only)
   *
   * ## Events
   *
   * Events that will be emitted by the component.
   *
   * - `helix-open`: Fired before it opens, and cancelable.
   * - `helix-close`: Fired before it closes, and cancelable.
   *
   * ## Slots
   *
   * Areas where markup can be added to the component.
   *
   * - `(default)`: The dialog's content.
   * - `header`: The title, and anything beside it.
   * - `footer`: The actions.
   *
   * ## Methods
   *
   * Methods that can be called to access component functionality.
   *
   * - `show() => void`: Moves focus into the dialog and makes the rest of the page inert.
   * - `close() => void`: Asks to close, which a consumer may refuse.
   * - `requestOpen(next: boolean) => boolean`: Requests an open-state change, and reports whether it was applied.
   *
   * Announces before it acts, so `preventDefault()` on the `helix-open` or
   * `helix-close` is a refusal and nothing moves. In uncontrolled mode the
   * element then updates itself; in controlled mode it applies nothing and
   * waits for the consumer to pass a new `open`, which is what "controlled"
   * means.
   * - `toggleOpen() => boolean`: Requests the opposite of the current state.
   *
   * ## CSS Parts
   *
   * Custom selectors for styling elements within the component.
   *
   * - `dialog`: The native dialog element.
   */
  "helix-base-dialog": Partial<
    HelixBaseDialogProps &
      HelixBaseDialogSolidJsProps &
      BaseProps<HelixBaseDialog> &
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
   * - `announced`: Whether the rule is announced as a separator.
   *
   * Off by default, and out of the accessibility tree. Most rules on a page
   * separate nothing: they underline a heading or close a section that space
   * had already closed, and announcing every one as a separator is noise a
   * screen-reader user has to walk past.
   *
   * An opt-in, not a `decorative` opt-out, because a boolean attribute cannot
   * be turned off: `decorative="false"` parses as `true`, which would put the
   * quiet default out of reach from HTML and leave it settable only as a
   * property. An opt-in is absent by default, which every reflected property
   * here has to be.
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
   * Takes `MixinControllerOpen`, so `open`, `defaultOpen`, and `OpenChange` behave exactly
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
   * - `open`: Whether the element is open.
   *
   * One property, not two. Reading gives the real state whichever mode the
   * element is in, so `dialog.open` answers the question anyone asking it
   * meant. Writing hands ownership to the consumer, which is what the
   * attribute in `<helix-dialog open>` does as well: from then on the element
   * announces changes and applies none of them.
   *
   * It reads as an accessor pair rather than a field because those are two
   * different questions sharing one name, and the alternative was a second
   * property answering the first. That worked for a boolean, where `isOpen`
   * reads well; there is no such word for a value or an active item, so all
   * four of these mixins now have this shape instead of two shapes.
   *
   * **Not reflected, and that is required rather than tidy.** Reflection
   * writes the resolved state back as an attribute, and writing the attribute
   * is how a consumer says they own it. So an uncontrolled element that
   * opened itself would put `open` on its own host and, from the next thing
   * that read it, be indistinguishable from one the consumer controls:
   * cloned, serialised for hydration, or diffed by a framework, it would come
   * back controlled and stop responding. `data-open` carries the resolved
   * state for stylesheets, which is what it has always been for.
   * - `default-open`/`defaultOpen`: Initial open state for uncontrolled use, where nothing declared one.
   * - `onOpenChange`: The consumer's callback, invoked after the state is applied.
   *
   * Not an attribute: it is a function. And not reachable from React's JSX,
   * which reserves every `on[A-Z]` prop for its own event system and drops
   * what it does not recognize; the generated wrapper listens for the events
   * instead. (property only)
   *
   * ## Events
   *
   * Events that will be emitted by the component.
   *
   * - `helix-close`: Fired before the panel closes, and cancelable.
   * - `helix-open`: Fired when the drawer opens or closes.
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
   * - `requestOpen(next: boolean) => boolean`: Requests an open-state change, and reports whether it was applied.
   *
   * Announces before it acts, so `preventDefault()` on the `helix-open` or
   * `helix-close` is a refusal and nothing moves. In uncontrolled mode the
   * element then updates itself; in controlled mode it applies nothing and
   * waits for the consumer to pass a new `open`, which is what "controlled"
   * means.
   * - `toggleOpen() => boolean`: Requests the opposite of the current state.
   *
   * ## CSS Parts
   *
   * Custom selectors for styling elements within the component.
   *
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
   * A row that opens a page *contains* that page: its rows are this row's own
   * children, assigned to the `page` slot. The tree is the structure, so there
   * are no ids to wire and a consumer who moves a row has moved its page with it.
   *
   * **It renders one of three things**, and which one is the stack's business
   * rather than its own. On the page showing, it is a row. Showing its own page,
   * it contributes that page's rows and nothing else, because its row belongs to
   * the page above. On neither, it renders nothing at all: the rows are in the
   * light DOM and come back untouched, so there is no state to keep and nothing
   * to hide with an attribute this element would have to write onto itself.
   *
   * Choosing is announced, never applied. The row dispatches and the stack
   * decides whether that means drilling in or choosing a command.
   *
   * ## Attributes & Properties
   *
   * Component attributes and properties that can be applied to the element or by using JavaScript.
   *
   * - `disabled`: Whether the row can be reached at all.
   * - `value`: Identifies the row to whatever is listening.
   * - `isDrilldownItem`: Marks this as a row a stack should count. Cheaper than an instanceof. (property only) (readonly)
   * - `onPage`: Whether the page showing is the one this row is on. Written by the stack. (property only)
   * - `showingPage`: Whether this row's own page is the one showing. Written by the stack. (property only)
   * - `focusable`: Whether this row holds the region's tab stop. Written by the stack.
   *
   * A drill-down keeps one stop and moves within it on the arrows, so every
   * other row is at `-1`. Every row was, including the first, which left
   * nothing in the region tab-reachable at all: the keyboard could not get in
   * without first clicking something with a pointer.
   *
   * No attribute, the same as `Button`'s: this is coordination between
   * elements, and writing `tabindex` onto a host the consumer rendered is a
   * change a React consumer's hydration reports and does not patch up. The stop
   * lands inside this shadow root instead. (property only)
   *
   * ## Events
   *
   * Events that will be emitted by the component.
   *
   * - `helix-select`: Fired when the row is chosen.
   *
   * ## Slots
   *
   * Areas where markup can be added to the component.
   *
   * - `(default)`: The words naming this row.
   * - `page`: The rows of the page this one opens.
   * - `start`: Before the words, usually an icon.
   * - `end`: After the words, usually a mark or a count.
   *
   * ## Methods
   *
   * Methods that can be called to access component functionality.
   *
   * - `focusItem() => void`: Moves focus onto the row itself.
   * - `select() => void`: Announces that this row was chosen.
   *
   * ## CSS Parts
   *
   * Custom selectors for styling elements within the component.
   *
   * - `item`: The row itself.
   * - `label`: The words.
   */
  "helix-base-drilldown-item": Partial<
    HelixBaseDrilldownItemProps &
      HelixBaseDrilldownItemSolidJsProps &
      BaseProps<HelixBaseDrilldownItem> &
      BaseEvents
  >;

  /**
   * One panel that changes rather than panels opening beside each other. That is
   * the right shape wherever there is no room for a second column: a phone has
   * none, and a touch screen has no hover to open one with.
   *
   * **Not a `Menu`, and the difference is what it is for rather than how it
   * looks.** A menu is a thing that opens from a trigger and closes when it is
   * done; this is a region that sits where it is put, inside a drawer or a
   * sidebar or a settings panel. `Menu` drills too, through the same controller,
   * because a menu deep enough to need pages wants exactly this behavior without
   * being this component.
   *
   * **Navigation, never a value.** Rows are places to go and commands to run, so
   * nothing here is form-associated and nothing is submitted. A drill-down that
   * reported a value would be a `Listbox` whose options happen to nest, and that
   * is the component to reach for instead.
   *
   * **The tree is the state.** A row that opens a page contains that page, so the
   * stack holds one reference and reads the rest from the DOM. See
   * `DrilldownController`, which is where this behavior lives and which `Menu`
   * shares.
   *
   * ## Attributes & Properties
   *
   * Component attributes and properties that can be applied to the element or by using JavaScript.
   *
   * - `label`: Accessible name for the region.
   * - `back-label`/`backLabel`: What the control returning from a page reads.
   *
   * ## Events
   *
   * Events that will be emitted by the component.
   *
   * - `helix-select`: Fired when a row with no page is chosen.
   *
   * ## Slots
   *
   * Areas where markup can be added to the component.
   *
   * - `(default)`: The rows of the top page.
   *
   * ## Methods
   *
   * Methods that can be called to access component functionality.
   *
   * - `back() => boolean`: Returns one page, and reports whether there was one to return to.
   *
   * Focus lands on the row that opened the page being left, which is why the
   * row is read before going back rather than after: a reader who drills in and
   * comes straight out should be on the row they pressed, not at the top of a
   * list they have already read.
   *
   * ## CSS Parts
   *
   * Custom selectors for styling elements within the component.
   *
   * - `header`: The bar above a page, holding the way back and its name.
   * - `back`: The control that returns one page.
   * - `title`: The name of the page showing.
   * - `page`: The region the rows are in.
   */
  "helix-base-drilldown": Partial<
    HelixBaseDrilldownProps &
      HelixBaseDrilldownSolidJsProps &
      BaseProps<HelixBaseDrilldown> &
      BaseEvents
  >;

  /**
   * An empty region with no explanation is indistinguishable from one that failed
   * to load, so this exists to tell the difference: what would be here, and the
   * one action that would put something here.
   *
   * `role="status"` on a polite live region, because an empty view usually
   * arrives in place of content that was being fetched. Announcing it is the only
   * way a screen-reader user learns the search returned nothing, rather than
   * being left waiting.
   *
   * Every region is a bare slot. The reference ships an `empty-state-heading` and
   * an `empty-state-actions` whose only job is to assign themselves a slot on
   * connect, which is a component for something the consumer can write.
   *
   * ## Attributes & Properties
   *
   * Component attributes and properties that can be applied to the element or by using JavaScript.
   *
   * - `no-announce`/`noAnnounce`: Whether the state is announced when it appears.
   *
   * On by default: an empty view almost always replaces something that was
   * loading. Turn it off for one that was on the page from the start, which
   * has nothing to announce because nothing changed.
   *
   * ## Slots
   *
   * Areas where markup can be added to the component.
   *
   * - `icon`: A mark above the heading.
   * - `heading`: What is missing.
   * - `(default)`: Why, and what to do about it.
   * - `actions`: The way out.
   */
  "helix-base-empty": Partial<
    HelixBaseEmptyProps &
      HelixBaseEmptySolidJsProps &
      BaseProps<HelixBaseEmpty> &
      BaseEvents
  >;

  /**
   * Everything a button does, with one thing added and it is the reason this is
   * an element rather than a note on `Button`: **an icon-only control has no
   * accessible name unless it is given one.** A button whose content is a glyph
   * announces as "button" and nothing else, which is the single most common way a
   * toolbar becomes unusable without sight. `label` is not optional in practice,
   * and having a component that says so is what makes it reviewable.
   *
   * **Registered, so it can be rendered and not only subclassed.** The styled
   * icon button extended `HelixBaseButton` directly, which left no
   * `helix-base-icon-button` for anything to use: a headless consumer wanting an
   * icon button had a button and a naming convention. Anything in this tier that
   * needs one, such as an announcement's dismiss control, can now render it
   * without reaching into the styled tier for a tag that would never upgrade.
   *
   * Top-level rather than `Button.Icon`, because a namespace means composition
   * and an icon-only button is not part of a button. It is a button with
   * different content and a different shape, which makes it its own component.
   *
   * ## Attributes & Properties
   *
   * Component attributes and properties that can be applied to the element or by using JavaScript.
   *
   * - `type`: What activating the button does to its form.
   * - `label`: Accessible name, for a button whose content is not text.
   *
   * Lives here rather than only on `IconButton` so the two share one render.
   * An icon-only button without it is a control a screen reader announces as
   * "button" and nothing else.
   * - `command`: What to send when the button is activated, and what to send it to.
   *
   * The platform's invoker attributes, forwarded onto the inner `<button>`
   * rather than left on the host: only a real button is recognized as an
   * invoker, so `commandfor` written on a custom element resolves nothing and
   * the trigger silently does nothing at all. A wrapper has to hand them down,
   * the same way `label` becomes `aria-label` in there.
   *
   * ```html
   * <helix-button commandfor="confirm" command="--show">Delete…</helix-button>
   * ```
   *
   * `commandFor` spells its attribute out, because Lit lowercases a property
   * name to derive one rather than dash-casing it, and what a consumer writes
   * is the platform's `commandfor`.
   * - `commandfor`/`commandFor`: The id of the element the command is sent to.
   * - `disabled`: Whether the control is non-interactive.
   *
   * Reflected, because the styled tier selects on it, and mirrored to
   * `aria-disabled` rather than removing the element from the accessibility
   * tree, so a screen reader can still announce that the control exists.
   * - `name`: Name submitted with the form.
   *
   * **Reflected, and it is the exception to "reflect only what CSS selects
   * on".** The platform builds a form's entry list from the `name` *content
   * attribute*, not from the property, so a control named through the property
   * submitted under no name at all and was silently dropped. Measured: two
   * inputs in one form, one named by attribute and one by property, and the
   * form carried a single entry.
   *
   * Safe for a React consumer, which is what the rule is protecting: React
   * renders a custom element's props as attributes on the server, so the name
   * is already in the markup being hydrated and reflecting it writes what is
   * there. It is only a change to the markup when a consumer assigns it
   * imperatively later, and nothing is hydrating by then.
   *
   * Here rather than on each control, where it was declared eight times and
   * reflected none of them.
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
   * - `isDisabled`: Whether the control is off, by its own attribute or by an ancestor.
   *
   * What a component should bind to rather than `disabled`, which is only the
   * half of it the consumer wrote. (property only) (readonly)
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
   * ## Methods
   *
   * Methods that can be called to access component functionality.
   *
   * - `formDisabledCallback(disabled: boolean) => void`: The platform's notice that an ancestor fieldset changed.
   *
   * ## CSS Parts
   *
   * Custom selectors for styling elements within the component.
   *
   * - `button`: The inner button or anchor.
   */
  "helix-base-icon-button": Partial<
    HelixBaseIconButtonProps &
      HelixBaseIconButtonSolidJsProps &
      BaseProps<HelixBaseIconButton> &
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
   * The `<svg>` carries `fill="currentColor"` because the generator keeps only
   * the inner markup and discards the source's own root tag, and that tag is
   * where Phosphor puts its fill. Without it, every solid glyph in the set, 65 of
   * them, falls back to the SVG default of black and disappears on a dark page.
   * Shapes that set their own `fill` or `stroke` are unaffected, which is why the
   * outline icons looked fine and hid this.
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
   * Renders a real `<input>`, so the caret, selection, autofill, spellcheck, the
   * password manager, and the on-screen keyboard a phone chooses all come from the
   * platform. `delegatesFocus` puts focus on it, and it serializes into the
   * server's markup, so the field is usable before any script loads.
   *
   * **The input inside a shadow root submits nothing**, because the form is on the
   * other side of the boundary. The host is form-associated instead and reports
   * its own value through `ElementInternals`, which is also what carries validity
   * and what answers a form reset.
   *
   * `value` and `defaultValue` are separate for the reason `checked` and
   * `defaultChecked` are: `value` is what is in the field now and
   * `defaultValue` is what the markup asked for, which is where a reset returns
   * to and is gone the moment anyone types.
   *
   * **Validity is the platform's.** The `type` and `required` are set on the real
   * input and its `validity` is copied onto the host, so an email field rejects
   * what the browser says is not an email rather than what a regular expression
   * here guesses. What this adds is the anchor, so `reportValidity` points the
   * bubble at the input rather than at the host.
   *
   * `pattern`, `minlength` and `maxlength` are forwarded with them. They were
   * promised by this paragraph and did not exist, so a consumer following the
   * sentence wrote an attribute on the host that reached no input and constrained
   * nothing: the field looked as though it were checked and was not.
   *
   * ## Attributes & Properties
   *
   * Component attributes and properties that can be applied to the element or by using JavaScript.
   *
   * - `placeholder`: Shown while the field is empty. Not a label: it goes when typing starts.
   * - `read-only`/`readOnly`: Whether the field refuses input while still submitting its value.
   * - `type`: What the field accepts, which decides the keyboard and the validation.
   * - `pattern`: A regular expression the value has to match, as the platform reads it.
   *
   * The class documentation promised `pattern` and `minlength` "and the rest"
   * were set on the real input, and no such properties existed: a consumer
   * following that sentence wrote an attribute on the host, it reached no input,
   * and the field constrained nothing while looking as though it did.
   *
   * Forwarded rather than checked here, which is the whole reason validity is
   * the platform's: the browser knows what a `pattern` means, anchors it at both
   * ends, and produces the message in the reader's own language.
   * - `minlength`/`minLength`: Fewest characters the value may have.
   * - `maxlength`/`maxLength`: Most characters the value may have.
   * - `default-value`/`defaultValue`: The value the markup declared, which is where a reset returns to.
   * - `value`: What the control holds now, and what its form submits.
   *
   * One property, not two. Reading gives the real value whichever mode the
   * control is in, so `input.value` answers the question anyone asking it
   * meant. Writing hands ownership to the consumer, which is what
   * `<helix-input value="x">` says too, and matches what a controlled input
   * means in React: the value is theirs and the control waits to be told.
   * `default-value` is how markup seeds one it does not want to own.
   *
   * The same shape as the other three mixins, which is the point of them
   * being four of a kind rather than four of three kinds.
   * - `hint`: Help under the control, shown while there is nothing wrong.
   * - `feedback`: What is wrong, in the reader's words rather than the browser's.
   * - `label`: The accessible name, and the fallback for the `label` slot.
   * - `required`: Whether the form refuses to submit without it.
   * - `disabled`: Whether the control is non-interactive.
   *
   * Reflected, because the styled tier selects on it, and mirrored to
   * `aria-disabled` rather than removing the element from the accessibility
   * tree, so a screen reader can still announce that the control exists.
   * - `name`: Name submitted with the form.
   *
   * **Reflected, and it is the exception to "reflect only what CSS selects
   * on".** The platform builds a form's entry list from the `name` *content
   * attribute*, not from the property, so a control named through the property
   * submitted under no name at all and was silently dropped. Measured: two
   * inputs in one form, one named by attribute and one by property, and the
   * form carried a single entry.
   *
   * Safe for a React consumer, which is what the rule is protecting: React
   * renders a custom element's props as attributes on the server, so the name
   * is already in the markup being hydrated and reflecting it writes what is
   * there. It is only a change to the markup when a consumer assigns it
   * imperatively later, and nothing is hydrating by then.
   *
   * Here rather than on each control, where it was declared eight times and
   * reflected none of them.
   * - `onValueChange`: The consumer's callback, invoked after the value is applied.
   *
   * Not an attribute: it is a function. `onValueChange` and not `onChange`,
   * because React reserves the latter for its own synthetic system and wires
   * it to the native `change`, so a Helix event named `Change` would never
   * fire at all. (property only)
   * - `resolvedFeedback`: The message actually shown: the consumer's, or the platform's, or none. (property only) (readonly)
   * - `describedBy`: Id of the description node, for `aria-describedby` on the control.
   *
   * One at a time, because only one of the two is ever rendered. Naming both
   * would point a screen reader at an id that resolves to nothing, which it
   * reads as a description it cannot find. (property only) (readonly)
   * - `isDisabled`: Whether the control is off, by its own attribute or by an ancestor.
   *
   * What a component should bind to rather than `disabled`, which is only the
   * half of it the consumer wrote. (property only) (readonly)
   * - `form`: The form this control belongs to, if any. (property only) (readonly)
   * - `labels`: Labels associated with this control. (property only) (readonly)
   *
   * ## Events
   *
   * Events that will be emitted by the component.
   *
   * - `helix-change`: Fired as the text changes, and cancelable.
   * - `change`: Relayed from the input once the reader has finished.
   *
   * ## Slots
   *
   * Areas where markup can be added to the component.
   *
   * - `start`: Before the text, for an icon or a prefix.
   * - `end`: After the text, for an icon, a unit, or a clear button.
   *
   * ## Methods
   *
   * Methods that can be called to access component functionality.
   *
   * - `focus(options?: FocusOptions) => void`: Puts the caret in the field, the way a label pointing at one would.
   * - `select() => void`: Selects everything in the field.
   * - `requestValue(next: string) => boolean`: Requests a new value, and reports whether the request stood.
   *
   * Announces before it acts, so `preventDefault()` on the `helix-change` is
   * a refusal and nothing moves. In uncontrolled mode the control then
   * updates itself; in controlled mode it applies nothing and waits for the
   * consumer to pass a new `value`, which is what controlled means.
   * - `formResetCallback() => void`: Returns the control to the value its markup declared.
   *
   * Both halves are dropped, the consumer's and the control's, because a
   * reset means the form is as it was served. Clearing only the internal one
   * would leave a control that had been written to stuck at that value.
   * - `formStateRestoreCallback(state: string | null) => void`: Restores the value when the browser brings a form back.
   *
   * Falling back to `defaultValue` rather than to empty, because a restore
   * with no state is a form the browser has nothing recorded for, which is
   * the same situation as a fresh one.
   * - `formDisabledCallback(disabled: boolean) => void`: The platform's notice that an ancestor fieldset changed.
   *
   * ## CSS Parts
   *
   * Custom selectors for styling elements within the component.
   *
   * - `field`: The box holding everything.
   * - `control`: The input itself.
   */
  "helix-base-input": Partial<
    HelixBaseInputProps &
      HelixBaseInputSolidJsProps &
      BaseProps<HelixBaseInput> &
      BaseEvents
  >;

  /**
   * Renders a real `<kbd>`, so the passage still means "press this" to anything
   * reading the markup rather than only to a reader looking at it.
   *
   * One key per element. A chord is several of these with the separator written
   * between them as ordinary text, because that separator is prose: it is "then"
   * in a sequence and "plus" in a simultaneous press, and a component that
   * inserted one would have to guess which.
   *
   * ## Slots
   *
   * Areas where markup can be added to the component.
   *
   * - `(default)`: The key's label.
   *
   * ## CSS Parts
   *
   * Custom selectors for styling elements within the component.
   *
   * - `kbd`: The key.
   */
  "helix-base-kbd": Partial<
    HelixBaseKbdProps &
      HelixBaseKbdSolidJsProps &
      BaseProps<HelixBaseKbd> &
      BaseEvents
  >;

  /**
   * Layout and semantics, and deliberately not a target.
   *
   * **It does not become a link.** The reference renders an `<a>` when given an
   * `href`, which is the thing Button and Toggle both stopped doing: a router
   * renders its own anchor and cannot render it inside this shadow root, so a row
   * that navigates would force a full page load. A row whose label is a
   * destination slots the consumer's own link as that label, and the link is the
   * target rather than the row around it.
   *
   * That is a real constraint rather than an oversight: a whole-row target needs
   * the anchor to wrap the layout, and the layout is what this component is. When
   * something needs it, it wants a `data-list-item` recipe styling the consumer's
   * anchor, the way `data-button` and `data-navigation-item` do.
   *
   * ## Slots
   *
   * Areas where markup can be added to the component.
   *
   * - `start`: Leading content, usually an icon or an avatar.
   * - `(default)`: The label.
   * - `supporting`: Secondary text under the label.
   * - `end`: Trailing content.
   *
   * ## CSS Parts
   *
   * Custom selectors for styling elements within the component.
   *
   * - `row`: The layout, held off the host so the host can carry a marker.
   */
  "helix-base-list-item": Partial<
    HelixBaseListItemProps &
      HelixBaseListItemSolidJsProps &
      BaseProps<HelixBaseListItem> &
      BaseEvents
  >;

  /**
   * `role="list"` on the host, so the rows are counted and announced as "1 of 7"
   * rather than as seven unrelated passages. That count is the whole reason to
   * use a list rather than a stack of divs.
   *
   * ## Attributes & Properties
   *
   * Component attributes and properties that can be applied to the element or by using JavaScript.
   *
   * - `label`: Accessible name for the set.
   * - `kind`: What kind of list this is, which is a fact about the content.
   *
   * On the headless tier because it is meaning rather than decoration, the same
   * argument `severity` makes on `Callout`. A numbered list is numbered because
   * the order carries information; a bulleted one is bulleted because the items
   * are a set and the order does not. That distinction is the reader's, and it
   * has to survive with the stylesheet turned off.
   *
   * - `default` is a run of rows and takes no marker. It is what a list of
   *   settings or files is: neither ordered nor a set to be counted.
   * - `ordered` numbers them, for steps.
   * - `unordered` bullets them, for a set.
   * - `description` pairs each row's label with its supporting text as a term
   *   and what the term means.
   *
   * **`description` reuses the row's existing slots rather than inventing a
   *   second kind of row.** A term and its description is exactly the label and
   *   the supporting text `List.Item` already has, so the kind changes how the
   *   pair is drawn and nothing about what a consumer writes. A separate
   *   `List.Term` element would be a second row shape for one attribute's sake.
   *
   * ## Slots
   *
   * Areas where markup can be added to the component.
   *
   * - `(default)`: The rows.
   */
  "helix-base-list": Partial<
    HelixBaseListProps &
      HelixBaseListSolidJsProps &
      BaseProps<HelixBaseList> &
      BaseEvents
  >;

  /**
   * **The listbox is the control and the options are its vocabulary.** A Select
   * is this with a trigger in front of it, a Combobox is this with a text input,
   * and a command palette is this again: they differ in what opens the list and
   * what filters it, not in what the list is. Building it as its own family is
   * what stops each of those reimplementing the keyboard and the filtering.
   *
   * **`value` is comma separated when `multiple` is set**, the way
   * `Checkbox.Group`'s is. It stays a string because that is what a form submits
   * and what `MixinControllerValue` holds; an array property would be a second
   * shape for the same fact, and the two would disagree the first time one was
   * set without the other.
   *
   * **Chosen and active are two different things.** Chosen is the answer; active
   * is where the keyboard is. In a single-select list they move together, which
   * is the radio group pattern and is what a reader expects from arrow keys. With
   * `multiple` they come apart: the arrows move without choosing and Space
   * chooses, because a reader passing over four options on the way to the fifth
   * did not mean to pick all five.
   *
   * That is also why this does not use `KeyboardNavigationController`, which
   * moves and chooses in one act by design. Half of this component needs that and
   * half needs the opposite, and a flag on the controller would be this paragraph
   * written twice.
   *
   * **Filtering hides rather than removes.** An option the filter has hidden is
   * still the consumer's element in the consumer's order, so a filter that clears
   * puts the list back exactly as it was with nothing re-rendered. What counts as
   * a match is a plain case-insensitive substring, and a consumer wanting more
   * hides options itself: `filter` is a convenience over the same `hidden` the
   * component uses.
   *
   * ## Attributes & Properties
   *
   * Component attributes and properties that can be applied to the element or by using JavaScript.
   *
   * - `filter`: What the list is narrowed to, if anything.
   *
   * Filtering hides rather than removes, so nothing about the value changes and
   * the list is still the consumer's own elements in their own order. Reading
   * gives what is being filtered on; writing declares it theirs, and
   * `default-filter` seeds one the list owns.
   * - `default-filter`/`defaultFilter`: What to start narrowed to, where nothing declared it.
   * - `filterable`: Whether the list renders a field for narrowing itself.
   *
   * The field lives here rather than in whatever frames the list, because the
   * filtering already does: `filter`, the empty state and the keyboard are all
   * this component's. A select that drew its own search box above a listbox
   * would be writing the same field again, and so would a combobox, and so
   * would a command palette, which is the fault the three-family split exists
   * to prevent.
   * - `filter-label`/`filterLabel`: Placeholder for the field that narrows the list.
   * - `multiple`: Whether more than one option can be the answer.
   * - `empty-text`/`emptyText`: What is shown when a filter has hidden every option.
   * - `default-value`/`defaultValue`: The value the markup declared, which is where a reset returns to.
   * - `value`: What the control holds now, and what its form submits.
   *
   * One property, not two. Reading gives the real value whichever mode the
   * control is in, so `input.value` answers the question anyone asking it
   * meant. Writing hands ownership to the consumer, which is what
   * `<helix-input value="x">` says too, and matches what a controlled input
   * means in React: the value is theirs and the control waits to be told.
   * `default-value` is how markup seeds one it does not want to own.
   *
   * The same shape as the other three mixins, which is the point of them
   * being four of a kind rather than four of three kinds.
   * - `hint`: Help under the control, shown while there is nothing wrong.
   * - `feedback`: What is wrong, in the reader's words rather than the browser's.
   * - `label`: The accessible name, and the fallback for the `label` slot.
   * - `required`: Whether the form refuses to submit without it.
   * - `disabled`: Whether the control is non-interactive.
   *
   * Reflected, because the styled tier selects on it, and mirrored to
   * `aria-disabled` rather than removing the element from the accessibility
   * tree, so a screen reader can still announce that the control exists.
   * - `name`: Name submitted with the form.
   *
   * **Reflected, and it is the exception to "reflect only what CSS selects
   * on".** The platform builds a form's entry list from the `name` *content
   * attribute*, not from the property, so a control named through the property
   * submitted under no name at all and was silently dropped. Measured: two
   * inputs in one form, one named by attribute and one by property, and the
   * form carried a single entry.
   *
   * Safe for a React consumer, which is what the rule is protecting: React
   * renders a custom element's props as attributes on the server, so the name
   * is already in the markup being hydrated and reflecting it writes what is
   * there. It is only a change to the markup when a consumer assigns it
   * imperatively later, and nothing is hydrating by then.
   *
   * Here rather than on each control, where it was declared eight times and
   * reflected none of them.
   * - `options`: Every option, in the order a reader meets them.
   *
   * Descendants rather than children, because a group puts a level between the
   * list and its options and the keyboard has to move through a grouped list
   * exactly as it moves through a flat one. (property only) (readonly)
   * - `values`: The chosen values, which is a list whether or not `multiple` is set. (property only) (readonly)
   * - `onValueChange`: The consumer's callback, invoked after the value is applied.
   *
   * Not an attribute: it is a function. `onValueChange` and not `onChange`,
   * because React reserves the latter for its own synthetic system and wires
   * it to the native `change`, so a Helix event named `Change` would never
   * fire at all. (property only)
   * - `resolvedFeedback`: The message actually shown: the consumer's, or the platform's, or none. (property only) (readonly)
   * - `describedBy`: Id of the description node, for `aria-describedby` on the control.
   *
   * One at a time, because only one of the two is ever rendered. Naming both
   * would point a screen reader at an id that resolves to nothing, which it
   * reads as a description it cannot find. (property only) (readonly)
   * - `isDisabled`: Whether the control is off, by its own attribute or by an ancestor.
   *
   * What a component should bind to rather than `disabled`, which is only the
   * half of it the consumer wrote. (property only) (readonly)
   * - `form`: The form this control belongs to, if any. (property only) (readonly)
   * - `labels`: Labels associated with this control. (property only) (readonly)
   *
   * ## Events
   *
   * Events that will be emitted by the component.
   *
   * - `helix-change`: Fired when the answer changes, and cancelable.
   * - `helix-filter`: Fired before the list narrows, and cancelable.
   *
   * ## Slots
   *
   * Areas where markup can be added to the component.
   *
   * - `(default)`: The options, and any groups of them.
   * - `label`: Richer than a string.
   * - `hint`: Richer than a string.
   *
   * ## Methods
   *
   * Methods that can be called to access component functionality.
   *
   * - `requestFilter(next: string) => boolean`: Requests a narrowing, and reports whether the request stood.
   * - `requestValue(next: string) => boolean`: Requests a new value, and reports whether the request stood.
   *
   * Announces before it acts, so `preventDefault()` on the `helix-change` is
   * a refusal and nothing moves. In uncontrolled mode the control then
   * updates itself; in controlled mode it applies nothing and waits for the
   * consumer to pass a new `value`, which is what controlled means.
   * - `formResetCallback() => void`: Returns the control to the value its markup declared.
   *
   * Both halves are dropped, the consumer's and the control's, because a
   * reset means the form is as it was served. Clearing only the internal one
   * would leave a control that had been written to stuck at that value.
   * - `formStateRestoreCallback(state: string | null) => void`: Restores the value when the browser brings a form back.
   *
   * Falling back to `defaultValue` rather than to empty, because a restore
   * with no state is a form the browser has nothing recorded for, which is
   * the same situation as a fresh one.
   * - `formDisabledCallback(disabled: boolean) => void`: The platform's notice that an ancestor fieldset changed.
   *
   * ## CSS Parts
   *
   * Custom selectors for styling elements within the component.
   *
   * - `label`: The question, over the list.
   * - `items`: The list itself.
   * - `empty`: Shown when a filter has hidden everything.
   * - `search`: The region holding the field that narrows the list.
   * - `search-field`: The field itself.
   * - `hint`: Help under the list.
   * - `feedback`: What is wrong with it.
   */
  "helix-base-listbox": Partial<
    HelixBaseListboxProps &
      HelixBaseListboxSolidJsProps &
      BaseProps<HelixBaseListbox> &
      BaseEvents
  >;

  /**
   * Three shapes, one element, because a reader moving down a menu with the
   * arrow keys does not care which kind each row is and neither should the
   * markup. What it is follows from what it was given: something slotted into
   * `submenu` makes it a way in, `checked` makes it a choice, and neither makes
   * it a command.
   *
   * **The role follows the shape.** A row that can be ticked is
   * `menuitemcheckbox` and carries `aria-checked`, because a reader is told "one
   * of these is on" rather than "here is a button". A row that opens a page keeps
   * `menuitem` and says `aria-haspopup`, since the page it opens is a menu.
   *
   * Whether it is on the page showing is set by the menu as a property, never as
   * an attribute: an attribute written onto a consumer's element after it
   * upgrades is a hydration mismatch waiting to happen.
   *
   * ## Attributes & Properties
   *
   * Component attributes and properties that can be applied to the element or by using JavaScript.
   *
   * - `value`: What this row stands for, carried in the event when it is chosen.
   * - `checkable`: Whether the row is one of a set of choices.
   *
   * Separate from `checked`, and it has to be. A row that is off is still a
   * choice, and `checked` alone cannot say so: an unticked row and a row that
   * was never tickable look identical from here. Announcing only the ticked one
   * as a checkbox tells a reader its siblings are commands, which is the one
   * thing they are not.
   *
   * `checked` implies it, so a row that is on never has to say both.
   * - `checked`: Whether the row is ticked.
   * - `disabled`: Whether the row can be chosen.
   * - `onPage`: Whether this row is on the page currently showing.
   *
   * Set by the menu, and a property rather than an attribute for that reason.
   * Public because the menu has to reach it, and not something a consumer
   * writes: which page is open is the menu's business. (property only)
   * - `showingSubmenu`: Whether this row's submenu is the page showing.
   *
   * Separate from `onPage`, and it has to be. A row that opened a page is not
   * itself on that page, so both are false for it, and rendering nothing on
   * that basis takes its `slot[name="submenu"]` with it: the rows inside have
   * nowhere to be assigned and are never laid out. The element that holds the
   * page has to keep the slot even when it shows no row of its own. (property only)
   * - `isMenuItem`: Marks this as a row a menu should count. Cheaper than an instanceof. (property only) (readonly)
   * - `hasSubmenu`: Whether anything was slotted into `submenu`.
   *
   * Client only, and the `?? []` is what makes that true rather than merely
   * documented. Lit's element shim carries attributes but not a tree, so
   * `children` is undefined on the server, and this getter is read during
   * `render`: spreading it threw, and a menu row could not be served at all.
   * Found by writing this component's SSR spec, which is the only place it
   * could have been found, because every other path runs in a browser.
   *
   * False on the server is also the right answer rather than a safe one: the
   * server cannot know whether a submenu was slotted, and a row that served a
   * `aria-haspopup` it might not have would be a promise made to a screen
   * reader on the strength of a guess. (property only) (readonly)
   *
   * ## Events
   *
   * Events that will be emitted by the component.
   *
   * - `helix-select`: Fired when the row is chosen.
   *
   * ## Slots
   *
   * Areas where markup can be added to the component.
   *
   * - `(default)`: The label.
   * - `submenu`: Rows this one opens, which makes it a way in.
   *
   * ## Methods
   *
   * Methods that can be called to access component functionality.
   *
   * - `focus() => void`: Moves focus onto the row itself.
   *
   * The host is not focusable: what takes focus is the row inside this shadow
   * root, and a menu moving between rows with the arrow keys has to reach it.
   *
   * ## CSS Parts
   *
   * Custom selectors for styling elements within the component.
   *
   * - `item`: The row.
   * - `mark`: The trailing mark: a tick when checked, a caret when it opens a page. One column, because a row is never both.
   */
  "helix-base-menu-item": Partial<
    HelixBaseMenuItemProps &
      HelixBaseMenuItemSolidJsProps &
      BaseProps<HelixBaseMenuItem> &
      BaseEvents
  >;

  /**
   * The trigger is slotted and stays the consumer's own element, the same way the
   * tooltip takes one. The surface is rendered here, in the top layer through the
   * popover API, so it clears any ancestor with `overflow: hidden` without a
   * `z-index` anywhere.
   *
   * **It drills down rather than flying out.** A submenu replaces what is on
   * screen and a back row returns, instead of opening a second panel beside the
   * first. Panels beside panels need a diagonal path a pointer has to travel
   * without straying, they run off the edge of a narrow window, and on a touch
   * screen there is no hover to open them with at all. One panel that changes
   * what it holds has none of those problems and reads the same on a phone.
   *
   * The open page is held here rather than in each item, because only one page
   * shows at a time and something has to know which. Items are told by property,
   * not by attribute: an attribute written onto a consumer's element after it
   * upgrades is a hydration mismatch waiting to happen.
   *
   * ## Attributes & Properties
   *
   * Component attributes and properties that can be applied to the element or by using JavaScript.
   *
   * - `placement`: Preferred side. It moves if that side does not fit.
   * - `offset`: Space between the trigger and the surface, in pixels.
   * - `label`: Accessible name for the surface.
   * - `back-label`/`backLabel`: What the row returning from a submenu reads.
   * - `open`: Whether the element is open.
   *
   * One property, not two. Reading gives the real state whichever mode the
   * element is in, so `dialog.open` answers the question anyone asking it
   * meant. Writing hands ownership to the consumer, which is what the
   * attribute in `<helix-dialog open>` does as well: from then on the element
   * announces changes and applies none of them.
   *
   * It reads as an accessor pair rather than a field because those are two
   * different questions sharing one name, and the alternative was a second
   * property answering the first. That worked for a boolean, where `isOpen`
   * reads well; there is no such word for a value or an active item, so all
   * four of these mixins now have this shape instead of two shapes.
   *
   * **Not reflected, and that is required rather than tidy.** Reflection
   * writes the resolved state back as an attribute, and writing the attribute
   * is how a consumer says they own it. So an uncontrolled element that
   * opened itself would put `open` on its own host and, from the next thing
   * that read it, be indistinguishable from one the consumer controls:
   * cloned, serialised for hydration, or diffed by a framework, it would come
   * back controlled and stop responding. `data-open` carries the resolved
   * state for stylesheets, which is what it has always been for.
   * - `default-open`/`defaultOpen`: Initial open state for uncontrolled use, where nothing declared one.
   * - `onOpenChange`: The consumer's callback, invoked after the state is applied.
   *
   * Not an attribute: it is a function. And not reachable from React's JSX,
   * which reserves every `on[A-Z]` prop for its own event system and drops
   * what it does not recognize; the generated wrapper listens for the events
   * instead. (property only)
   *
   * ## Events
   *
   * Events that will be emitted by the component.
   *
   * - `helix-open`: Fired before it opens, and cancelable.
   * - `helix-close`: Fired before it closes, and cancelable.
   * - `helix-select`: Fired when an item is chosen.
   *
   * ## Slots
   *
   * Areas where markup can be added to the component.
   *
   * - `(default)`: The items.
   * - `trigger`: What opens it.
   *
   * ## Methods
   *
   * Methods that can be called to access component functionality.
   *
   * - `show() => void`: Opens the menu.
   * - `hide() => void`: Closes the menu, and forgets which page was showing.
   * - `requestOpen(next: boolean) => boolean`: Requests an open-state change, and reports whether it was applied.
   *
   * Announces before it acts, so `preventDefault()` on the `helix-open` or
   * `helix-close` is a refusal and nothing moves. In uncontrolled mode the
   * element then updates itself; in controlled mode it applies nothing and
   * waits for the consumer to pass a new `open`, which is what "controlled"
   * means.
   * - `toggleOpen() => boolean`: Requests the opposite of the current state.
   *
   * ## CSS Parts
   *
   * Custom selectors for styling elements within the component.
   *
   * - `surface`: The floating panel the menu is drawn on.
   * - `menu`: The surface.
   * - `header`: The bar above a submenu, holding the way back and its name.
   * - `back`: The control that returns from a submenu.
   * - `title`: The name of the submenu that is showing.
   */
  "helix-base-menu": Partial<
    HelixBaseMenuProps &
      HelixBaseMenuSolidJsProps &
      BaseProps<HelixBaseMenu> &
      BaseEvents
  >;

  /**
   * Renders a real `<nav>`, which is the landmark a screen-reader user jumps to.
   * It exists as its own component rather than as a region of `AppHeader` because
   * a header is not inherently navigation, and navigation is not only ever in a
   * header: a footer and a sidebar hold the same thing.
   *
   * **It renders no links.** The consumer brings them, marked with
   * `aria-current="page"` and styled by the `data-navigation-item` recipe, for the same
   * reason nothing else here renders an anchor: a router renders its own, and
   * cannot render it inside this shadow root.
   *
   * What this owns is the marker that travels between them, and that is the whole
   * reason it is a component. A marker that moves needs something that knows
   * where every item is, and reading `aria-current` is how it knows which: the
   * thing that makes the page announce correctly is the same thing that puts the
   * marker in the right place.
   *
   * ## Attributes & Properties
   *
   * Component attributes and properties that can be applied to the element or by using JavaScript.
   *
   * - `label`: Accessible name for the landmark.
   *
   * ## Slots
   *
   * Areas where markup can be added to the component.
   *
   * - `(default)`: The destinations, as the consumer's own links.
   *
   * ## CSS Parts
   *
   * Custom selectors for styling elements within the component.
   *
   * - `nav`: The navigation landmark.
   * - `indicator`: The marker that travels to the current destination.
   */
  "helix-base-navigation": Partial<
    HelixBaseNavigationProps &
      HelixBaseNavigationSolidJsProps &
      BaseProps<HelixBaseNavigation> &
      BaseEvents
  >;

  /**
   * A heading over a set, and nothing else: it holds no selection and no value,
   * because grouping is presentation over a list whose owner is the listbox. Its
   * options are still the listbox's options, which is what keeps the keyboard
   * moving through a grouped list exactly as it moves through a flat one.
   *
   * `role="group"` named by the heading, so a screen reader announces which run
   * an option is in without the heading becoming something to land on.
   *
   * ## Attributes & Properties
   *
   * Component attributes and properties that can be applied to the element or by using JavaScript.
   *
   * - `label`: The heading over the run.
   *
   * ## Slots
   *
   * Areas where markup can be added to the component.
   *
   * - `(default)`: The options in this run.
   * - `label`: Richer than a string.
   *
   * ## CSS Parts
   *
   * Custom selectors for styling elements within the component.
   *
   * - `label`: The heading.
   * - `items`: The run itself.
   */
  "helix-base-option-group": Partial<
    HelixBaseOptionGroupProps &
      HelixBaseOptionGroupSolidJsProps &
      BaseProps<HelixBaseOptionGroup> &
      BaseEvents
  >;

  /**
   * **Its own family rather than a part of Select, and the reason is what it
   * belongs to.** `role="option"` requires an owning `role="listbox"`, which is
   * the ARIA contract: an option cannot stand alone. But a Select is *a listbox
   * with a trigger*, a Combobox is *a listbox with a text input*, and a command
   * palette is the same listbox again. The thing an option belongs to is the
   * listbox, not any one control that happens to contain one.
   *
   * That is the difference from `Radio`, which is a part of its group: a radio
   * has exactly one kind of owner, and an option has several.
   *
   * Selection is announced rather than applied, the way a radio's is. The option
   * says it was chosen, the listbox decides whether that stands, and the listbox
   * writes `selected` back. An option that selected itself would be a second
   * answer to which one is chosen.
   *
   * **Nothing here knows about filtering.** A hidden option is hidden by whatever
   * owns it, through `hidden`, because what counts as a match is the listbox's
   * question and differs between a select and a command palette.
   *
   * ## Attributes & Properties
   *
   * Component attributes and properties that can be applied to the element or by using JavaScript.
   *
   * - `disabled`: Whether this choice can be made.
   * - `data-active`/`active`: Whether this is the option the keyboard is on. Written by the listbox.
   * - `selected`: Whether this choice is currently chosen. Written by the listbox.
   * - `value`: Identifies this choice, and is what a form submits.
   * - `text`: The words, for a listbox that has to match text against them.
   *
   * Read from the rendered content rather than required as a property, because
   * the content is where a consumer naturally puts it and asking for both is
   * asking for two things to disagree. (property only) (readonly)
   *
   * ## Events
   *
   * Events that will be emitted by the component.
   *
   * - `helix-select`: Fired when this choice is made.
   *
   * ## Slots
   *
   * Areas where markup can be added to the component.
   *
   * - `(default)`: The words naming this choice.
   * - `start`: Before the words, for an icon or an avatar.
   * - `end`: After them, for a shortcut or a count.
   *
   * ## Methods
   *
   * Methods that can be called to access component functionality.
   *
   * - `select() => void`: Makes this choice and announces it.
   *
   * ## CSS Parts
   *
   * Custom selectors for styling elements within the component.
   *
   * - `item`: The row.
   * - `label`: The words.
   */
  "helix-base-option": Partial<
    HelixBaseOptionProps &
      HelixBaseOptionSolidJsProps &
      BaseProps<HelixBaseOption> &
      BaseEvents
  >;

  /**
   * A table of contents, named for the job. Three of the obvious names are taken
   * by things that are not this: `Outline` is a CSS property and the focus ring's
   * whole vocabulary, `Contents` is `display: contents` and the `content` part
   * half this library renders, and `TableOfContents` would sit beside `Table` and
   * `TableColumn` and read as a third part of that family. `Outline` sits beside
   * `Navigation`, which is the same job at the other scale: one navigates a site, the
   * other navigates a document.
   *
   * **The links are the consumer's own anchors**, the same as `Navigation`. A router
   * renders its own `<a>` and cannot render one inside this shadow root, and the
   * hrefs are fragments the page already knows.
   *
   * **What is current is decided by position, not by intersection.** The obvious
   * build is an `IntersectionObserver` with a thin band near the top of the
   * window, and it fails in both directions: with headings far apart nothing is
   * in the band and the marker goes out entirely, and with headings close
   * together several are and it flickers between them. So the observer is only
   * the *trigger*, and the answer is computed from where the headings actually
   * are: the current section is the last one whose top has passed the reading
   * line, or the first heading before any of them has.
   *
   * That rule is what a reader means. Two headings on screen at once are not
   * ambiguous to a person: they are reading under the upper one.
   *
   * **`aria-current="location"`, and it is written onto the consumer's anchor.**
   * This library does not normally write to light-DOM children, because an
   * attribute added after upgrade is one a server's markup never had. It is right
   * here for the reason `Carousel` names its slides: what is current is derived
   * from scroll position, so no server could have rendered it and there is
   * nothing for hydration to disagree with. `location` rather than `page`, which
   * is what `Navigation` uses: `page` means this is the page, and every one of these
   * is the same page.
   *
   * ## Attributes & Properties
   *
   * Component attributes and properties that can be applied to the element or by using JavaScript.
   *
   * - `label`: Accessible name for the navigation.
   * - `offset`: How far below the top of the window a heading counts as reached, in pixels.
   *
   * The reading line. A page with a sticky masthead sets this to its height, or
   * a little more: without it the current section changes as a heading slides
   * under the chrome rather than as it reaches the top of what can be seen.
   * - `current`: The id of the section being read, or empty before anything is measured.
   *
   * Read-only, and a getter rather than a property for that reason: it is
   * derived from where the page is scrolled to, so a consumer setting it would
   * be overwritten by the next thing that crossed the reading line. Every other
   * writable property in this library that a component also writes is state a
   * consumer can own; this one cannot be, and saying so with the type is better
   * than saying it in a sentence nobody reads. (property only) (readonly)
   *
   * ## Slots
   *
   * Areas where markup can be added to the component.
   *
   * - `(default)`: The links, as anchors with fragment hrefs.
   *
   * ## CSS Parts
   *
   * Custom selectors for styling elements within the component.
   *
   * - `nav`: The navigation landmark.
   * - `indicator`: The mark that travels to the section being read.
   */
  "helix-base-outline": Partial<
    HelixBaseOutlineProps &
      HelixBaseOutlineSolidJsProps &
      BaseProps<HelixBaseOutline> &
      BaseEvents
  >;

  /**
   * The general case the specific overlays are versions of. `Menu` holds
   * commands, `Select` holds options, `Tooltip` holds a description; this holds
   * whatever the consumer puts in it, which is why it has no keyboard of its own
   * and no opinion about what is inside.
   *
   * **The trigger is slotted and stays the consumer's own element.** Nothing is
   * written onto it: no `aria-expanded`, no `id`, no `tabindex`. A component that
   * decorates a consumer's markup after upgrading is a component whose output a
   * React consumer's hydration disagrees with, and the attribute they would care
   * about most is the one that changes on every open.
   *
   * **The panel is in the top layer**, through the popover API, so it clears any
   * ancestor with `overflow: hidden` without a `z-index` fight. `position: fixed`
   * does not do that: it is still clipped by `overflow`, and re-anchored entirely
   * by an ancestor carrying `transform`, `filter` or `contain`.
   *
   * **It opens on click, and from a command.** `command="--show"` and its
   * siblings work here the way they do on `Dialog` and `Drawer`, so a trigger
   * elsewhere on the page can open it without a line of script and without being
   * slotted into it.
   *
   * ## Attributes & Properties
   *
   * Component attributes and properties that can be applied to the element or by using JavaScript.
   *
   * - `label`: Accessible name for the panel.
   * - `offset`: Space between the trigger and the panel, in pixels.
   * - `placement`: Preferred side. It moves if that side does not fit.
   * - `open`: Whether the element is open.
   *
   * One property, not two. Reading gives the real state whichever mode the
   * element is in, so `dialog.open` answers the question anyone asking it
   * meant. Writing hands ownership to the consumer, which is what the
   * attribute in `<helix-dialog open>` does as well: from then on the element
   * announces changes and applies none of them.
   *
   * It reads as an accessor pair rather than a field because those are two
   * different questions sharing one name, and the alternative was a second
   * property answering the first. That worked for a boolean, where `isOpen`
   * reads well; there is no such word for a value or an active item, so all
   * four of these mixins now have this shape instead of two shapes.
   *
   * **Not reflected, and that is required rather than tidy.** Reflection
   * writes the resolved state back as an attribute, and writing the attribute
   * is how a consumer says they own it. So an uncontrolled element that
   * opened itself would put `open` on its own host and, from the next thing
   * that read it, be indistinguishable from one the consumer controls:
   * cloned, serialised for hydration, or diffed by a framework, it would come
   * back controlled and stop responding. `data-open` carries the resolved
   * state for stylesheets, which is what it has always been for.
   * - `default-open`/`defaultOpen`: Initial open state for uncontrolled use, where nothing declared one.
   * - `onOpenChange`: The consumer's callback, invoked after the state is applied.
   *
   * Not an attribute: it is a function. And not reachable from React's JSX,
   * which reserves every `on[A-Z]` prop for its own event system and drops
   * what it does not recognize; the generated wrapper listens for the events
   * instead. (property only)
   *
   * ## Events
   *
   * Events that will be emitted by the component.
   *
   * - `helix-open`: Fired before it opens, and cancelable.
   * - `helix-close`: Fired before it closes, and cancelable.
   *
   * ## Slots
   *
   * Areas where markup can be added to the component.
   *
   * - `trigger`: What opens it.
   * - `(default)`: The contents of the panel.
   *
   * ## Methods
   *
   * Methods that can be called to access component functionality.
   *
   * - `show() => void`: Opens the panel.
   * - `hide() => void`: Closes the panel and puts focus back on the trigger.
   * - `requestOpen(next: boolean) => boolean`: Requests an open-state change, and reports whether it was applied.
   *
   * Announces before it acts, so `preventDefault()` on the `helix-open` or
   * `helix-close` is a refusal and nothing moves. In uncontrolled mode the
   * element then updates itself; in controlled mode it applies nothing and
   * waits for the consumer to pass a new `open`, which is what "controlled"
   * means.
   * - `toggleOpen() => boolean`: Requests the opposite of the current state.
   *
   * ## CSS Parts
   *
   * Custom selectors for styling elements within the component.
   *
   * - `content`: The scrolling region inside the panel.
   * - `popover`: The panel.
   */
  "helix-base-popover": Partial<
    HelixBasePopoverProps &
      HelixBasePopoverSolidJsProps &
      BaseProps<HelixBasePopover> &
      BaseEvents
  >;

  /**
   * Determinate by default, and `indeterminate` for a task whose total is not
   * known yet. `Spinner` is still the right answer where the wait is short or has
   * no place of its own on the page; a bar earns its width where the work is the
   * subject of the region it sits in.
   *
   * A bar that fills at a made-up rate would be a bar that lies, so the
   * indeterminate one does not fill: it runs a segment across the track, which
   * says work is happening and claims no proportion at all. `aria-valuenow` is
   * omitted with it, which is the platform's own signal for the same thing.
   *
   * **The fill is a percentage of the track, written as a custom property.** It
   * is derived from `value` and `max` rather than measured, so it renders on a
   * server with no layout and needs nothing after upgrade. That is what keeps it
   * out of the class of geometry this library writes only on the client.
   *
   * **`value` is clamped, and out-of-range input is not an error.** A count that
   * runs past its own total is ordinary in real applications, and a bar that
   * overflows its track or reports `aria-valuenow` above `aria-valuemax` is worse
   * than one that reads as finished.
   *
   * Semantics are on the host through `ElementInternals`, the same as everywhere
   * else: a `role` in the shadow root announces correctly and leaves the host
   * anonymous to anything walking the light DOM, and a `role` written onto the
   * host as an attribute is one a server's markup never had.
   *
   * ## Attributes & Properties
   *
   * Component attributes and properties that can be applied to the element or by using JavaScript.
   *
   * - `label`: Accessible name for what is in progress.
   * - `indeterminate`: Whether the work has a knowable end.
   *
   * On the headless tier rather than as an `appearance`, because it is
   * semantics before it is a picture: a progressbar with no `aria-valuenow` is
   * how the platform says "running, and nobody knows how far", and a reader on
   * a screen reader is told that rather than being read a number that means
   * nothing. `value` and `max` are ignored while it is set.
   *
   * Not `Spinner`, which is the other thing this could be. A spinner says the
   * page is busy; a bar says a named piece of work is running, and keeps its
   * place in the layout when the answer arrives and it becomes determinate.
   * - `max`: The total the work is measured against.
   * - `value`: What has been done so far, in the same units as `max`.
   *
   * Clamped between zero and `max` for both the fill and the announcement, so
   * the two can never disagree about what is on screen.
   * - `value-text`/`valueText`: A reading for the value, where the number alone does not say enough.
   *
   * "3 of 8 files" rather than "37". Announced instead of the percentage, and
   * never instead of the value itself: `aria-valuenow` still carries the
   * number, because assistive technology that ignores the text still has to
   * report progress.
   * - `fraction`: What is done, as a fraction of the whole, between 0 and 1. (property only) (readonly)
   *
   * ## CSS Parts
   *
   * Custom selectors for styling elements within the component.
   *
   * - `track`: The full length the work is measured against.
   * - `indicator`: The part of it that is done.
   */
  "helix-base-progress": Partial<
    HelixBaseProgressProps &
      HelixBaseProgressSolidJsProps &
      BaseProps<HelixBaseProgress> &
      BaseEvents
  >;

  /**
   * Renders a real `<q>`, which is what supplies the quotation marks: the browser
   * inserts the right ones for the document's language, and nests them correctly
   * when one quotation sits inside another. Typing the marks into the content
   * instead gets both of those wrong in every language but one.
   *
   * A passage set off from the prose rather than run inside it is a blockquote,
   * which is a different element for a different job.
   *
   * ## Attributes & Properties
   *
   * Component attributes and properties that can be applied to the element or by using JavaScript.
   *
   * - `cite`: URL identifying where the quotation came from.
   *
   * ## Slots
   *
   * Areas where markup can be added to the component.
   *
   * - `(default)`: The quoted text.
   *
   * ## CSS Parts
   *
   * Custom selectors for styling elements within the component.
   *
   * - `quote`: The quotation.
   */
  "helix-base-quote": Partial<
    HelixBaseQuoteProps &
      HelixBaseQuoteSolidJsProps &
      BaseProps<HelixBaseQuote> &
      BaseEvents
  >;

  /**
   * **The group is the control, and the radios are its options.** This is the
   * asymmetry with checkboxes and it comes from what a form submits: a set of
   * checkboxes is several answers and each box submits its own, while a set of
   * radios is one answer, so the group owns the `name`, the `value` and the
   * validity, and a lone radio outside a group is not a control at all.
   *
   * Which is also why `MixinField` lands here and not on `Radio`: the label, the
   * hint and the message are about the question, and the question is the set.
   *
   * Selection travels up and state travels down. An item announces that it was
   * chosen, the group decides whether that stands, and the group writes
   * `selected` onto every item. Nothing sets itself, so there is one answer to
   * "which one is on" rather than one per item.
   *
   * `value` and `defaultValue` are separate for the reason `checked` and
   * `defaultChecked` are: `value` is the answer now, `defaultValue` is what the
   * markup asked for, which is where a reset returns and is gone the moment
   * anything is chosen.
   *
   * ## Attributes & Properties
   *
   * Component attributes and properties that can be applied to the element or by using JavaScript.
   *
   * - `orientation`: Which way the choices run. A column reads one line per answer.
   * - `default-value`/`defaultValue`: The value the markup declared, which is where a reset returns to.
   * - `value`: What the control holds now, and what its form submits.
   *
   * One property, not two. Reading gives the real value whichever mode the
   * control is in, so `input.value` answers the question anyone asking it
   * meant. Writing hands ownership to the consumer, which is what
   * `<helix-input value="x">` says too, and matches what a controlled input
   * means in React: the value is theirs and the control waits to be told.
   * `default-value` is how markup seeds one it does not want to own.
   *
   * The same shape as the other three mixins, which is the point of them
   * being four of a kind rather than four of three kinds.
   * - `hint`: Help under the control, shown while there is nothing wrong.
   * - `feedback`: What is wrong, in the reader's words rather than the browser's.
   * - `label`: The accessible name, and the fallback for the `label` slot.
   * - `required`: Whether the form refuses to submit without it.
   * - `disabled`: Whether the control is non-interactive.
   *
   * Reflected, because the styled tier selects on it, and mirrored to
   * `aria-disabled` rather than removing the element from the accessibility
   * tree, so a screen reader can still announce that the control exists.
   * - `name`: Name submitted with the form.
   *
   * **Reflected, and it is the exception to "reflect only what CSS selects
   * on".** The platform builds a form's entry list from the `name` *content
   * attribute*, not from the property, so a control named through the property
   * submitted under no name at all and was silently dropped. Measured: two
   * inputs in one form, one named by attribute and one by property, and the
   * form carried a single entry.
   *
   * Safe for a React consumer, which is what the rule is protecting: React
   * renders a custom element's props as attributes on the server, so the name
   * is already in the markup being hydrated and reflecting it writes what is
   * there. It is only a change to the markup when a consumer assigns it
   * imperatively later, and nothing is hydrating by then.
   *
   * Here rather than on each control, where it was declared eight times and
   * reflected none of them.
   * - `items`: The radios, in light-DOM order. Client only: the server has no tree. (property only) (readonly)
   * - `onValueChange`: The consumer's callback, invoked after the value is applied.
   *
   * Not an attribute: it is a function. `onValueChange` and not `onChange`,
   * because React reserves the latter for its own synthetic system and wires
   * it to the native `change`, so a Helix event named `Change` would never
   * fire at all. (property only)
   * - `resolvedFeedback`: The message actually shown: the consumer's, or the platform's, or none. (property only) (readonly)
   * - `describedBy`: Id of the description node, for `aria-describedby` on the control.
   *
   * One at a time, because only one of the two is ever rendered. Naming both
   * would point a screen reader at an id that resolves to nothing, which it
   * reads as a description it cannot find. (property only) (readonly)
   * - `isDisabled`: Whether the control is off, by its own attribute or by an ancestor.
   *
   * What a component should bind to rather than `disabled`, which is only the
   * half of it the consumer wrote. (property only) (readonly)
   * - `form`: The form this control belongs to, if any. (property only) (readonly)
   * - `labels`: Labels associated with this control. (property only) (readonly)
   *
   * ## Events
   *
   * Events that will be emitted by the component.
   *
   * - `helix-change`: Fired when the answer changes, and cancelable.
   *
   * ## Slots
   *
   * Areas where markup can be added to the component.
   *
   * - `(default)`: The radios.
   * - `label`: Richer than a string, where the question is more than one.
   * - `hint`: Richer than a string.
   *
   * ## Methods
   *
   * Methods that can be called to access component functionality.
   *
   * - `requestValue(next: string) => boolean`: Requests a new value, and reports whether the request stood.
   *
   * Announces before it acts, so `preventDefault()` on the `helix-change` is
   * a refusal and nothing moves. In uncontrolled mode the control then
   * updates itself; in controlled mode it applies nothing and waits for the
   * consumer to pass a new `value`, which is what controlled means.
   * - `formResetCallback() => void`: Returns the control to the value its markup declared.
   *
   * Both halves are dropped, the consumer's and the control's, because a
   * reset means the form is as it was served. Clearing only the internal one
   * would leave a control that had been written to stuck at that value.
   * - `formStateRestoreCallback(state: string | null) => void`: Restores the value when the browser brings a form back.
   *
   * Falling back to `defaultValue` rather than to empty, because a restore
   * with no state is a form the browser has nothing recorded for, which is
   * the same situation as a fresh one.
   * - `formDisabledCallback(disabled: boolean) => void`: The platform's notice that an ancestor fieldset changed.
   *
   * ## CSS Parts
   *
   * Custom selectors for styling elements within the component.
   *
   * - `label`: The question, over the set.
   * - `items`: The choices, which is what `orientation` lays out.
   * - `hint`: Help under the set.
   * - `feedback`: What is wrong with it.
   */
  "helix-base-radio-group": Partial<
    HelixBaseRadioGroupProps &
      HelixBaseRadioGroupSolidJsProps &
      BaseProps<HelixBaseRadioGroup> &
      BaseEvents
  >;

  /**
   * Renders a `<button role="radio">`, not an `<input type="radio">`, and the
   * reason is the shadow boundary rather than preference: native radios group by
   * sharing a `name` within a form, and a radio inside a shadow root cannot join
   * a group on the other side of it. The group is the form control here, so the
   * option only has to say what it is and announce when it is chosen.
   *
   * **It carries no label of its own.** A radio is named by the words beside it,
   * which is its own content, and the label, hint and message of the *set* belong
   * to the group. This is the one control in the family that takes nothing from
   * `MixinField`, because a lone radio is not a control: it is an answer to one.
   *
   * Selection is announced rather than applied. The item dispatches, the group
   * decides, and the group writes `selected` back. An item that set itself would
   * be a second source of truth for which one is on.
   *
   * ## Attributes & Properties
   *
   * Component attributes and properties that can be applied to the element or by using JavaScript.
   *
   * - `disabled`: Whether this choice can be made.
   * - `selected`: Whether this is the current choice. Written by the group.
   * - `value`: Identifies this choice to the group, and is what the form submits.
   *
   * ## Events
   *
   * Events that will be emitted by the component.
   *
   * - `helix-select`: Fired when this choice is made.
   *
   * ## Slots
   *
   * Areas where markup can be added to the component.
   *
   * - `(default)`: The words naming this choice.
   *
   * ## Methods
   *
   * Methods that can be called to access component functionality.
   *
   * - `focusItem() => void`: Moves focus to this choice, for the group's arrow keys.
   * - `select() => void`: Makes this choice and announces it.
   *
   * ## CSS Parts
   *
   * Custom selectors for styling elements within the component.
   *
   * - `item`: The button, which is the whole row.
   * - `box`: The circle.
   * - `mark`: The dot inside it.
   * - `label`: The words beside it.
   */
  "helix-base-radio": Partial<
    HelixBaseRadioProps &
      HelixBaseRadioSolidJsProps &
      BaseProps<HelixBaseRadio> &
      BaseEvents
  >;

  /**
   * **A trigger and a `Listbox`, not a listbox reimplemented behind a button.**
   * The list this opens is the same element a consumer can use on its own, with
   * the same keyboard, the same filtering and the same multi-select rules. What
   * Select adds is the closing: a trigger that says what is chosen, a surface
   * that floats, and somewhere for focus to go back to.
   *
   * The options are the consumer's, in the consumer's light DOM, slotted through
   * into the listbox. That is why the listbox walks through slots to find them:
   * from its point of view the options belong to something else.
   *
   * **What it does not do is duplicate the value.** `Select` owns it, hands it
   * down, and takes changes back; the listbox is the thing being operated and not
   * a second place the answer lives.
   *
   * ## Attributes & Properties
   *
   * Component attributes and properties that can be applied to the element or by using JavaScript.
   *
   * - `filterable`: Whether the list can be narrowed by typing.
   *
   * Passed to the listbox rather than acted on here, because the listbox owns
   * the filtering, the empty state and the keyboard. This property existed and
   * was never read: it reflected, it type-checked, and nothing anywhere
   * rendered a field. API that does nothing is worse than API that is missing,
   * because a consumer sets it and believes it.
   * - `multiple`: Whether more than one option can be the answer.
   * - `placeholder`: Shown on the trigger while nothing is chosen.
   * - `open`: Whether the element is open.
   *
   * One property, not two. Reading gives the real state whichever mode the
   * element is in, so `dialog.open` answers the question anyone asking it
   * meant. Writing hands ownership to the consumer, which is what the
   * attribute in `<helix-dialog open>` does as well: from then on the element
   * announces changes and applies none of them.
   *
   * It reads as an accessor pair rather than a field because those are two
   * different questions sharing one name, and the alternative was a second
   * property answering the first. That worked for a boolean, where `isOpen`
   * reads well; there is no such word for a value or an active item, so all
   * four of these mixins now have this shape instead of two shapes.
   *
   * **Not reflected, and that is required rather than tidy.** Reflection
   * writes the resolved state back as an attribute, and writing the attribute
   * is how a consumer says they own it. So an uncontrolled element that
   * opened itself would put `open` on its own host and, from the next thing
   * that read it, be indistinguishable from one the consumer controls:
   * cloned, serialised for hydration, or diffed by a framework, it would come
   * back controlled and stop responding. `data-open` carries the resolved
   * state for stylesheets, which is what it has always been for.
   * - `default-open`/`defaultOpen`: Initial open state for uncontrolled use, where nothing declared one.
   * - `default-value`/`defaultValue`: The value the markup declared, which is where a reset returns to.
   * - `value`: What the control holds now, and what its form submits.
   *
   * One property, not two. Reading gives the real value whichever mode the
   * control is in, so `input.value` answers the question anyone asking it
   * meant. Writing hands ownership to the consumer, which is what
   * `<helix-input value="x">` says too, and matches what a controlled input
   * means in React: the value is theirs and the control waits to be told.
   * `default-value` is how markup seeds one it does not want to own.
   *
   * The same shape as the other three mixins, which is the point of them
   * being four of a kind rather than four of three kinds.
   * - `hint`: Help under the control, shown while there is nothing wrong.
   * - `feedback`: What is wrong, in the reader's words rather than the browser's.
   * - `label`: The accessible name, and the fallback for the `label` slot.
   * - `required`: Whether the form refuses to submit without it.
   * - `disabled`: Whether the control is non-interactive.
   *
   * Reflected, because the styled tier selects on it, and mirrored to
   * `aria-disabled` rather than removing the element from the accessibility
   * tree, so a screen reader can still announce that the control exists.
   * - `name`: Name submitted with the form.
   *
   * **Reflected, and it is the exception to "reflect only what CSS selects
   * on".** The platform builds a form's entry list from the `name` *content
   * attribute*, not from the property, so a control named through the property
   * submitted under no name at all and was silently dropped. Measured: two
   * inputs in one form, one named by attribute and one by property, and the
   * form carried a single entry.
   *
   * Safe for a React consumer, which is what the rule is protecting: React
   * renders a custom element's props as attributes on the server, so the name
   * is already in the markup being hydrated and reflecting it writes what is
   * there. It is only a change to the markup when a consumer assigns it
   * imperatively later, and nothing is hydrating by then.
   *
   * Here rather than on each control, where it was declared eight times and
   * reflected none of them.
   * - `onOpenChange`: The consumer's callback, invoked after the state is applied.
   *
   * Not an attribute: it is a function. And not reachable from React's JSX,
   * which reserves every `on[A-Z]` prop for its own event system and drops
   * what it does not recognize; the generated wrapper listens for the events
   * instead. (property only)
   * - `onValueChange`: The consumer's callback, invoked after the value is applied.
   *
   * Not an attribute: it is a function. `onValueChange` and not `onChange`,
   * because React reserves the latter for its own synthetic system and wires
   * it to the native `change`, so a Helix event named `Change` would never
   * fire at all. (property only)
   * - `resolvedFeedback`: The message actually shown: the consumer's, or the platform's, or none. (property only) (readonly)
   * - `describedBy`: Id of the description node, for `aria-describedby` on the control.
   *
   * One at a time, because only one of the two is ever rendered. Naming both
   * would point a screen reader at an id that resolves to nothing, which it
   * reads as a description it cannot find. (property only) (readonly)
   * - `isDisabled`: Whether the control is off, by its own attribute or by an ancestor.
   *
   * What a component should bind to rather than `disabled`, which is only the
   * half of it the consumer wrote. (property only) (readonly)
   * - `form`: The form this control belongs to, if any. (property only) (readonly)
   * - `labels`: Labels associated with this control. (property only) (readonly)
   *
   * ## Events
   *
   * Events that will be emitted by the component.
   *
   * - `helix-change`: Relayed from the listbox when the answer changes.
   * - `helix-open`: Fired when the list opens.
   * - `helix-close`: Fired when it closes.
   *
   * ## Slots
   *
   * Areas where markup can be added to the component.
   *
   * - `(default)`: The options, and any groups of them.
   * - `indicator`: The mark on the trigger saying this opens, usually a caret.
   * - `label`: Richer than a string.
   * - `hint`: Richer than a string.
   *
   * ## Methods
   *
   * Methods that can be called to access component functionality.
   *
   * - `requestOpen(next: boolean) => boolean`: Requests an open-state change, and reports whether it was applied.
   *
   * Announces before it acts, so `preventDefault()` on the `helix-open` or
   * `helix-close` is a refusal and nothing moves. In uncontrolled mode the
   * element then updates itself; in controlled mode it applies nothing and
   * waits for the consumer to pass a new `open`, which is what "controlled"
   * means.
   * - `toggleOpen() => boolean`: Requests the opposite of the current state.
   * - `requestValue(next: string) => boolean`: Requests a new value, and reports whether the request stood.
   *
   * Announces before it acts, so `preventDefault()` on the `helix-change` is
   * a refusal and nothing moves. In uncontrolled mode the control then
   * updates itself; in controlled mode it applies nothing and waits for the
   * consumer to pass a new `value`, which is what controlled means.
   * - `formResetCallback() => void`: Returns the control to the value its markup declared.
   *
   * Both halves are dropped, the consumer's and the control's, because a
   * reset means the form is as it was served. Clearing only the internal one
   * would leave a control that had been written to stuck at that value.
   * - `formStateRestoreCallback(state: string | null) => void`: Restores the value when the browser brings a form back.
   *
   * Falling back to `defaultValue` rather than to empty, because a restore
   * with no state is a form the browser has nothing recorded for, which is
   * the same situation as a fresh one.
   * - `formDisabledCallback(disabled: boolean) => void`: The platform's notice that an ancestor fieldset changed.
   *
   * ## CSS Parts
   *
   * Custom selectors for styling elements within the component.
   *
   * - `label`: The question, over the trigger.
   * - `value`: The chosen option's text inside the trigger.
   * - `trigger`: The closed control, which says what is chosen.
   * - `surface`: The floating panel.
   * - `listbox`: The list inside it.
   * - `hint`: Help under the trigger.
   * - `feedback`: What is wrong with it.
   */
  "helix-base-select": Partial<
    HelixBaseSelectProps &
      HelixBaseSelectSolidJsProps &
      BaseProps<HelixBaseSelect> &
      BaseEvents
  >;

  /**
   * Carries `aria-busy` and a polite live region, so a reader using a screen
   * reader is told the region is filling rather than told nothing and left to
   * wonder. Both go through `ElementInternals`, which writes no attribute.
   *
   * Holds no `shape`. Whether a placeholder is a line, a block or a circle is
   * presentation, and putting it here would give the headless tier an appearance
   * property, which is the one thing that tier is for not having.
   *
   * ## CSS Parts
   *
   * Custom selectors for styling elements within the component.
   *
   * - `skeleton`: The placeholder surface.
   */
  "helix-base-skeleton": Partial<
    HelixBaseSkeletonProps &
      HelixBaseSkeletonSolidJsProps &
      BaseProps<HelixBaseSkeleton> &
      BaseEvents
  >;

  /**
   * A real `<input type="range">`, so the drag, the arrow keys, Home and End, the
   * page keys and the touch target are all the platform's. Every one of those is
   * a thing a hand-built slider gets wrong, and the last is the one nobody
   * notices: a native range has a hit area larger than its thumb, sized by the
   * platform for a finger.
   *
   * **The value is a string, like every other form control's.** A range submits
   * text and `MixinControllerValue` holds text, so the number is a reading of the
   * value rather than the value itself. `valueAsNumber` is there for anything
   * doing arithmetic on it.
   *
   * **Marks are drawn rather than left to `<datalist>`**, which was the first
   * answer and is the wrong one. A datalist's ticks cannot be styled at all, and
   * Firefox does not render them for a range at all, so the platform's version is
   * a mark that looks like someone else's design where it appears and no mark
   * where it does not. Drawing them costs the semantics nothing, because a mark
   * is decoration: what a reader can actually land on is `step`, which the input
   * enforces whether or not anything is drawn.
   *
   * `markers` is a count rather than a flag tied to `step`. A flag reads well
   * until a slider from zero to a hundred stepping by one asks for a hundred and
   * one ticks, and then it is either noise or a silent refusal to draw. A number
   * is what the reader sees, so it cannot surprise anyone.
   *
   * ## Attributes & Properties
   *
   * Component attributes and properties that can be applied to the element or by using JavaScript.
   *
   * - `max`: The largest value the reader can choose.
   * - `min`: The smallest value the reader can choose.
   * - `show-value`/`showValue`: Whether the chosen value is shown beside the track.
   * - `markers`: How many marks to draw along the track, evenly spaced, ends included.
   *
   * `0` or `1` draws none: one mark on a track says nothing about a range.
   * They are decoration, so they are `aria-hidden`; what a reader can land on
   * is `step`, which the input enforces regardless.
   *
   * **Each one is snapped to a step before it is placed.** Evenly spaced and
   * on a step are two different things, and asking for four marks across a
   * hundred in twenty-fives wants them at 0, 33.3, 66.7 and 100: two of those
   * are places the thumb cannot go. A mark the thumb can never sit on is the
   * one thing a mark must not be, so the spacing gives way rather than the
   * step, and marks may come out unevenly spaced when the two disagree. That
   * is the honest picture of the range being offered.
   * - `marker-labels`/`markerLabels`: Mirrors "there are marks" for the stylesheet.
   *
   * The whole marker layout hung off `:host([markers])` and `markers` does not
   * reflect, so `slider.markers = 5` drew nothing at all: only the attribute
   * written in the markup ever worked, and the property that is the documented
   * API silently did not.
   *
   * Reflecting the count instead would put `markers="0"` on every slider, an
   * attribute the server's markup does not have and one that selector would
   * match, drawing the layout for no marks. So the boolean fact is mirrored to
   * a `data-` name, which is the rule this library already follows for state:
   * the stylesheet wants to know whether there are marks, not how many. How
   * many is what `markerValues` answers, and `< 2` is where it already draws
   * the line.
   *
   * /** Whether each mark says which value it stands at.
   * - `step`: How far one press of an arrow key moves it.
   * - `default-value`/`defaultValue`: The value the markup declared, which is where a reset returns to.
   * - `value`: What the control holds now, and what its form submits.
   *
   * One property, not two. Reading gives the real value whichever mode the
   * control is in, so `input.value` answers the question anyone asking it
   * meant. Writing hands ownership to the consumer, which is what
   * `<helix-input value="x">` says too, and matches what a controlled input
   * means in React: the value is theirs and the control waits to be told.
   * `default-value` is how markup seeds one it does not want to own.
   *
   * The same shape as the other three mixins, which is the point of them
   * being four of a kind rather than four of three kinds.
   * - `hint`: Help under the control, shown while there is nothing wrong.
   * - `feedback`: What is wrong, in the reader's words rather than the browser's.
   * - `label`: The accessible name, and the fallback for the `label` slot.
   * - `required`: Whether the form refuses to submit without it.
   * - `disabled`: Whether the control is non-interactive.
   *
   * Reflected, because the styled tier selects on it, and mirrored to
   * `aria-disabled` rather than removing the element from the accessibility
   * tree, so a screen reader can still announce that the control exists.
   * - `name`: Name submitted with the form.
   *
   * **Reflected, and it is the exception to "reflect only what CSS selects
   * on".** The platform builds a form's entry list from the `name` *content
   * attribute*, not from the property, so a control named through the property
   * submitted under no name at all and was silently dropped. Measured: two
   * inputs in one form, one named by attribute and one by property, and the
   * form carried a single entry.
   *
   * Safe for a React consumer, which is what the rule is protecting: React
   * renders a custom element's props as attributes on the server, so the name
   * is already in the markup being hydrated and reflecting it writes what is
   * there. It is only a change to the markup when a consumer assigns it
   * imperatively later, and nothing is hydrating by then.
   *
   * Here rather than on each control, where it was declared eight times and
   * reflected none of them.
   * - `valueAsNumber`: The chosen value as a number, for anything doing arithmetic on it. (property only) (readonly)
   * - `onValueChange`: The consumer's callback, invoked after the value is applied.
   *
   * Not an attribute: it is a function. `onValueChange` and not `onChange`,
   * because React reserves the latter for its own synthetic system and wires
   * it to the native `change`, so a Helix event named `Change` would never
   * fire at all. (property only)
   * - `resolvedFeedback`: The message actually shown: the consumer's, or the platform's, or none. (property only) (readonly)
   * - `describedBy`: Id of the description node, for `aria-describedby` on the control.
   *
   * One at a time, because only one of the two is ever rendered. Naming both
   * would point a screen reader at an id that resolves to nothing, which it
   * reads as a description it cannot find. (property only) (readonly)
   * - `isDisabled`: Whether the control is off, by its own attribute or by an ancestor.
   *
   * What a component should bind to rather than `disabled`, which is only the
   * half of it the consumer wrote. (property only) (readonly)
   * - `form`: The form this control belongs to, if any. (property only) (readonly)
   * - `labels`: Labels associated with this control. (property only) (readonly)
   *
   * ## Events
   *
   * Events that will be emitted by the component.
   *
   * - `helix-change`: Fired as the value changes, and cancelable.
   * - `change`: Relayed once the reader has let go.
   *
   * ## Methods
   *
   * Methods that can be called to access component functionality.
   *
   * - `requestValue(next: string) => boolean`: Requests a new value, and reports whether the request stood.
   *
   * Announces before it acts, so `preventDefault()` on the `helix-change` is
   * a refusal and nothing moves. In uncontrolled mode the control then
   * updates itself; in controlled mode it applies nothing and waits for the
   * consumer to pass a new `value`, which is what controlled means.
   * - `formResetCallback() => void`: Returns the control to the value its markup declared.
   *
   * Both halves are dropped, the consumer's and the control's, because a
   * reset means the form is as it was served. Clearing only the internal one
   * would leave a control that had been written to stuck at that value.
   * - `formStateRestoreCallback(state: string | null) => void`: Restores the value when the browser brings a form back.
   *
   * Falling back to `defaultValue` rather than to empty, because a restore
   * with no state is a form the browser has nothing recorded for, which is
   * the same situation as a fresh one.
   * - `formDisabledCallback(disabled: boolean) => void`: The platform's notice that an ancestor fieldset changed.
   *
   * ## CSS Parts
   *
   * Custom selectors for styling elements within the component.
   *
   * - `field`: The row: the control and its readout.
   * - `control`: The range input.
   * - `markers`: The row of marks along the track.
   * - `marker`: One mark.
   * - `marker-label`: The value a mark stands at, when `marker-labels` is set.
   * - `output`: The current value, shown beside it.
   */
  "helix-base-slider": Partial<
    HelixBaseSliderProps &
      HelixBaseSliderSolidJsProps &
      BaseProps<HelixBaseSlider> &
      BaseEvents
  >;

  /**
   * Two concentric circles rather than one arc: the track is what makes the
   * moving part read as a proportion of a whole rather than as a shape drifting
   * on its own, and it costs one element.
   *
   * **The center is a slot and is empty by default.** A spinner with a mark in
   * the middle is a brand's spinner, and this library does not know whose. The
   * slot is the capability; the logo is the application's, put in once wherever
   * the app wraps it. Nothing is rendered when nothing is slotted, so an
   * unbranded spinner is still two circles and no extra box.
   *
   * What is slotted does not turn. Only the arc moves, because a mark rotating
   * with it stops reading as a mark and becomes part of the animation, and a
   * wordmark upside down twice a second is worse than no wordmark.
   *
   * The semantics are on the host through `ElementInternals`, not on an inner
   * span. A `role` written into the shadow root announces correctly but leaves
   * the host itself anonymous to anything walking the light DOM, and a `role`
   * written onto the host as an attribute is one a React consumer's server markup
   * never had.
   *
   * ## Attributes & Properties
   *
   * Component attributes and properties that can be applied to the element or by using JavaScript.
   *
   * - `label`: Accessible name, announced while the work is outstanding.
   *
   * ## Slots
   *
   * Areas where markup can be added to the component.
   *
   * - `(default)`: A mark to sit still at the center, usually a logo. Empty by default.
   *
   * ## CSS Parts
   *
   * Custom selectors for styling elements within the component.
   *
   * - `svg`: The rotating circle pair.
   * - `mark`: The region holding what was slotted at the center.
   * - `track`: The full circle behind the indicator.
   * - `indicator`: The arc that turns.
   */
  "helix-base-spinner": Partial<
    HelixBaseSpinnerProps &
      HelixBaseSpinnerSolidJsProps &
      BaseProps<HelixBaseSpinner> &
      BaseEvents
  >;

  /**
   * A group rather than a list, because the figures are read together and their
   * order carries no meaning: a list would announce "1 of 4" for a set where the
   * position is not information.
   *
   * ## Attributes & Properties
   *
   * Component attributes and properties that can be applied to the element or by using JavaScript.
   *
   * - `label`: Accessible name for the set.
   *
   * ## Slots
   *
   * Areas where markup can be added to the component.
   *
   * - `(default)`: The stats.
   */
  "helix-base-stat-group": Partial<
    HelixBaseStatGroupProps &
      HelixBaseStatGroupSolidJsProps &
      BaseProps<HelixBaseStatGroup> &
      BaseEvents
  >;

  /**
   * Value first in the markup and label after it, because that is the reading
   * order a figure wants: the number is what the eye lands on and the label is
   * what tells it what it landed on.
   *
   * Both are bare slots. An element whose only job is to assign itself a slot on
   * connect gives its own host an attribute after upgrade, which a React
   * consumer's server markup never had.
   *
   * ## Slots
   *
   * Areas where markup can be added to the component.
   *
   * - `(default)`: The value.
   * - `label`: What the value measures.
   * - `unit`: The unit, set beside the value.
   * - `detail`: A change, comparison, or note under the label.
   */
  "helix-base-stat": Partial<
    HelixBaseStatProps &
      HelixBaseStatSolidJsProps &
      BaseProps<HelixBaseStat> &
      BaseEvents
  >;

  /**
   * **A switch is not a checkbox with a different shape.** A checkbox is an
   * answer to a question the form asks when it is submitted; a switch is a thing
   * happening now. That is why `role="switch"` exists and why a switch belongs
   * outside a form as often as in one: it says "on" and "off" rather than
   * "ticked" and "unticked", and a reader expects the effect immediately rather
   * than on Save.
   *
   * Rendered as a real `<input type="checkbox">` carrying `role="switch"`, which
   * is the pairing ARIA describes: the input is what a form submits and what a
   * label forwards a press to, and the role is what a screen reader announces.
   * Neither half can be got from the other.
   *
   * The label sits beside it, inside the `<label>` that forwards the press, the
   * way a checkbox's does. The hint and the message go under the row, because
   * there is no above: the switch and the words naming it are one line.
   *
   * ## Attributes & Properties
   *
   * Component attributes and properties that can be applied to the element or by using JavaScript.
   *
   * - `value`: Value submitted when the switch is on.
   * - `checked`: Whether the control is checked.
   *
   * One property rather than two. Reading gives the real state whichever
   * mode the control is in; writing hands ownership to the consumer, which
   * is what the attribute in `<helix-checkbox checked>` does as well. The
   * same shape all four of these mixins have, for the reason given on
   * `MixinControllerOpen.open`.
   *
   * Not reflected: the attribute is the consumer's input and stays as they
   * wrote it, and `data-checked` carries the resolved state for stylesheets.
   * - `default-checked`/`defaultChecked`: Initial checked state for uncontrolled use, where nothing declared one.
   * - `hint`: Help under the control, shown while there is nothing wrong.
   * - `feedback`: What is wrong, in the reader's words rather than the browser's.
   * - `label`: The accessible name, and the fallback for the `label` slot.
   * - `required`: Whether the form refuses to submit without it.
   * - `disabled`: Whether the control is non-interactive.
   *
   * Reflected, because the styled tier selects on it, and mirrored to
   * `aria-disabled` rather than removing the element from the accessibility
   * tree, so a screen reader can still announce that the control exists.
   * - `name`: Name submitted with the form.
   *
   * **Reflected, and it is the exception to "reflect only what CSS selects
   * on".** The platform builds a form's entry list from the `name` *content
   * attribute*, not from the property, so a control named through the property
   * submitted under no name at all and was silently dropped. Measured: two
   * inputs in one form, one named by attribute and one by property, and the
   * form carried a single entry.
   *
   * Safe for a React consumer, which is what the rule is protecting: React
   * renders a custom element's props as attributes on the server, so the name
   * is already in the markup being hydrated and reflecting it writes what is
   * there. It is only a change to the markup when a consumer assigns it
   * imperatively later, and nothing is hydrating by then.
   *
   * Here rather than on each control, where it was declared eight times and
   * reflected none of them.
   * - `onCheckedChange`: The consumer's callback, invoked after the state is applied.
   *
   * Not an attribute: it is a function. And not reachable from React's JSX,
   * which reserves every `on[A-Z]` prop for its own event system and drops
   * what it does not recognize; the generated wrapper listens for the event
   * instead. (property only)
   * - `resolvedFeedback`: The message actually shown: the consumer's, or the platform's, or none. (property only) (readonly)
   * - `describedBy`: Id of the description node, for `aria-describedby` on the control.
   *
   * One at a time, because only one of the two is ever rendered. Naming both
   * would point a screen reader at an id that resolves to nothing, which it
   * reads as a description it cannot find. (property only) (readonly)
   * - `isDisabled`: Whether the control is off, by its own attribute or by an ancestor.
   *
   * What a component should bind to rather than `disabled`, which is only the
   * half of it the consumer wrote. (property only) (readonly)
   * - `form`: The form this control belongs to, if any. (property only) (readonly)
   * - `labels`: Labels associated with this control. (property only) (readonly)
   *
   * ## Events
   *
   * Events that will be emitted by the component.
   *
   * - `helix-change`: Fired before the state changes, and cancelable.
   * - `change`: Relayed from the input once the state has changed.
   *
   * ## Slots
   *
   * Areas where markup can be added to the component.
   *
   * - `(default)`: The words naming what this turns on.
   *
   * ## Methods
   *
   * Methods that can be called to access component functionality.
   *
   * - `formResetCallback() => void`: Returns the switch to the state its markup declared.
   * - `requestChecked(next: boolean) => boolean`: Requests a checked change, and reports whether it was applied.
   *
   * Announces before it acts, so `preventDefault()` on the
   * `helix-change` is a refusal and nothing moves. In uncontrolled mode
   * the element then updates itself; in controlled mode it applies nothing
   * and waits for the consumer to pass a new `checked`, which is what
   * "controlled" means.
   * - `toggleChecked() => boolean`: Requests the opposite of the current state.
   * - `resetChecked() => void`: Drops the uncontrolled state, so the control reads `defaultChecked`
   * again.
   *
   * A form reset has to return a control to what its markup declared, and
   * clearing `checked` alone only leaves controlled mode. The value the
   * element has been keeping lives here, so this is where it is dropped.
   * - `formDisabledCallback(disabled: boolean) => void`: The platform's notice that an ancestor fieldset changed.
   *
   * ## CSS Parts
   *
   * Custom selectors for styling elements within the component.
   *
   * - `field`: The row: the track and its label.
   * - `track`: The groove the thumb travels in.
   * - `control`: The input.
   * - `thumb`: The part that moves.
   * - `label`: The words beside it.
   */
  "helix-base-switch": Partial<
    HelixBaseSwitchProps &
      HelixBaseSwitchSolidJsProps &
      BaseProps<HelixBaseSwitch> &
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
   * A column is a heading and a width, declared together, because they are two
   * facts about one thing and keeping them apart is what went wrong before.
   *
   * **This replaces a `columns` string on the table.** That property took a CSS
   * track list, so the headings lived in a row of cells and the widths lived in
   * an attribute, and nothing tied the two together: a table with three headings
   * and a two-track list rendered without complaint. Worse, handing it the
   * headings instead of a track list produced invalid CSS, which the grid
   * silently ignored, so the whole table collapsed into one column and every cell
   * stacked. That happened, in this library's own example, and the failure said
   * nothing at all.
   *
   * Now the column is the source of both. Add one and the table has another
   * track; remove one and it does not.
   *
   * **It generates no box of its own**, the same as a row: the heading is a grid
   * item of the table, so it lines up with the cells under it rather than sitting
   * in a wrapper that has to be kept the same width.
   *
   * ## Attributes & Properties
   *
   * Component attributes and properties that can be applied to the element or by using JavaScript.
   *
   * - `width`: The track this column takes, as CSS.
   *
   * A single track value, so anything valid in `grid-template-columns` works:
   * `16rem`, `auto`, `minmax(0, 2fr)`. Left unset the column shares what is
   * left over equally, which is `minmax(0, 1fr)` rather than `1fr`: a bare
   * `1fr` track keeps an automatic minimum and refuses to shrink under a long
   * cell, so one unbreakable value pushes the table past its container.
   * - `isTableColumn`: Marks this as a column a table should count. Cheaper than an instanceof. (property only) (readonly)
   * - `track`: The track this column contributes, resolved. (property only) (readonly)
   *
   * ## Slots
   *
   * Areas where markup can be added to the component.
   *
   * - `(default)`: The heading.
   *
   * ## CSS Parts
   *
   * Custom selectors for styling elements within the component.
   *
   * - `column`: The heading cell.
   */
  "helix-base-table-column": Partial<
    HelixBaseTableColumnProps &
      HelixBaseTableColumnSolidJsProps &
      BaseProps<HelixBaseTableColumn> &
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
   * - `columns`: Column track list, as CSS. Deprecated: declare columns instead.
   *
   * Kept for a table that has no `helix-table-column` children, and ignored the
   * moment it has one. A raw track list is the right shape for the value and
   * the wrong place for it: the headings and the widths were two halves of one
   * fact held in two places, and nothing checked that they agreed. Worse, the
   * value is CSS, so handing it headings by mistake produced an invalid track
   * list, which a grid ignores in silence: the table collapsed to one column
   * and said nothing. Columns carry both halves now.
   * - `label`: Accessible name for the table.
   * - `tableColumns`: The columns declared as children, in the order they are written. (property only) (readonly)
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
   * - `head`: The row the column headings sit in. `display: contents`, so it takes no space.
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
   * - `label`: The name of the panel, which is the text of the tab that opens it.
   *
   * Set by the root, which is the only thing that sees both. No attribute,
   * because it is coordination between elements rather than anything a consumer
   * writes: the tab already says it.
   *
   * A string where the markup wanted a reference. `aria-labelledby` named
   * `tab-${value}`, an id inside the *tab's* own shadow root, and an IDREF
   * resolves only in the tree it is written in, so the panel had no accessible
   * name at all. An element reference cannot reach there either, a sibling
   * shadow tree being neither the same tree nor an ancestor of it. A name is
   * the one form that crosses, and `aria-label` on a `tabpanel` is how the
   * pattern names one anyway. (property only)
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
   * - `appearance`: How the row reads.
   *
   * Unset is a raised pill on the selected tab with nothing behind the row,
   * which is what a set sitting inside other chrome wants. `underline` is a
   * rule under the row and a thicker one under the selected tab, for a set that
   * heads a page. `toggle` puts the pill in a framed, sunken track, which reads
   * as one control rather than as a row.
   *
   * Reflected and left unset by default, so the host carries nothing a
   * consumer's server markup does not already have.
   * - `label`: Accessible name for the tab list.
   * - `manual`: Whether arrowing to a tab also selects it.
   *
   * Automatic is the default because showing a panel is usually cheap. Set this
   * where it is not, so a reader arrowing past four tabs does not load four
   * panels on the way.
   * - `active`: Which item is current, by its `value`.
   *
   * Called `active`, which is what this mixin is named for and what it was
   * not: it declared `value`, so the one mixin whose whole subject is which
   * item is active had no such property, and `active` meant something else
   * entirely elsewhere in the library. It still does, and only there now:
   * `option.active` is the option the keyboard is on, which is a different
   * question from which one is chosen.
   *
   * An accessor pair, the same shape as the other three. Reading gives the
   * real item; writing hands ownership to the consumer, so `<helix-tabs
   * active="one">` is a set that stays on that tab and `default-active` is
   * how markup says where to start.
   * - `default-active`/`defaultActive`: Initial item for uncontrolled use. Ignored once `active` is written.
   * - `onActiveChange`: The consumer's callback, invoked after the change is applied. (property only)
   *
   * ## Events
   *
   * Events that will be emitted by the component.
   *
   * - `helix-change`: Fired before the current tab moves, and cancelable. The only way to refuse one.
   * - `helix-select`: Fired when a tab is chosen. Dispatched by the tab and listened for here, because the root is what a consumer holds.
   *
   * ## Slots
   *
   * Areas where markup can be added to the component.
   *
   * - `(default)`: The tabs.
   * - `panels`: The panels.
   *
   * ## Methods
   *
   * Methods that can be called to access component functionality.
   *
   * - `requestActive(next: string) => boolean`: Requests a new current item, and reports whether the request stood.
   *
   * Announces before it acts, so `preventDefault()` on the `helix-change` is
   * a refusal and nothing moves. Unlike a native control, nothing has moved
   * by the time this runs, so refusing is simply not writing: there is
   * nothing to put back.
   *
   * ## CSS Parts
   *
   * Custom selectors for styling elements within the component.
   *
   * - `indicator`: The mark that travels to the selected tab.
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
   * - `helix-select`: Fired when the tab is chosen.
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
   * A tag is a label, and optionally a label the reader can take off.
   * `dismissible` is what separates it from a badge: a badge reports a state the
   * reader cannot change, a tag names something they can.
   *
   * Dismissing is a request. The tag does not remove itself, because the consumer
   * owns the list it sits in and taking the node out from under them would put
   * their state and the document out of step. Cancelling `helix-dismiss` is a
   * refusal.
   *
   * ## Attributes & Properties
   *
   * Component attributes and properties that can be applied to the element or by using JavaScript.
   *
   * - `dismissible`: Whether it offers a control to take it away.
   * - `dismiss-label`/`dismissLabel`: Accessible name for that control.
   *
   * `attribute` is spelled out because Lit lowercases a property name to
   * derive one rather than dash-casing it, so this would otherwise be
   * reachable only as `dismisslabel`, which nobody would guess and no linter
   * would catch.
   *
   * ## Events
   *
   * Events that will be emitted by the component.
   *
   * - `helix-dismiss`: Fired when the reader asks to remove the tag.
   *
   * ## Slots
   *
   * Areas where markup can be added to the component.
   *
   * - `(default)`: The tag's label.
   *
   * ## Methods
   *
   * Methods that can be called to access component functionality.
   *
   * - `dismiss() => boolean`: Announces that it should go, and reports whether the request stood.
   *
   * ## CSS Parts
   *
   * Custom selectors for styling elements within the component.
   *
   * - `dismiss`: The control that asks to remove the tag.
   */
  "helix-base-tag": Partial<
    HelixBaseTagProps &
      HelixBaseTagSolidJsProps &
      BaseProps<HelixBaseTag> &
      BaseEvents
  >;

  /**
   * A real `<textarea>`, so the caret, the selection, spellcheck, the resize
   * handle and the keyboard a phone chooses are all the platform's, and it
   * serializes into the server's markup so the field is usable before any script
   * loads.
   *
   * **Not an Input with a taller box.** The difference is the Enter key: in a
   * single-line field it submits the form, and here it inserts a line. That is a
   * behavioral difference the platform owns and cannot be styled into existence,
   * which is why this is its own element rather than `Input` with a property.
   *
   * `rows` sets the height it starts at, and `auto-grow` lets it follow its own
   * content. They are not alternatives: `rows` is where an empty field begins and
   * `auto-grow` is what happens after, so a field that grows still has to start
   * somewhere.
   *
   * ## Attributes & Properties
   *
   * Component attributes and properties that can be applied to the element or by using JavaScript.
   *
   * - `auto-grow`/`autoGrow`: Whether the box follows its own content rather than scrolling.
   * - `placeholder`: Shown while the field is empty. Not a label: it goes when typing starts.
   * - `read-only`/`readOnly`: Whether the field refuses input while still submitting its value.
   * - `rows`: How many lines the box is before anything is typed.
   * - `minlength`/`minLength`: Fewest characters the value may have.
   *
   * Forwarded to the real `<textarea>` rather than checked here, which is what
   * makes the message the browser's and therefore the reader's own language.
   * No `pattern`: the platform does not give a textarea one, and inventing it
   * would be this library guessing where the point is to stop guessing.
   * - `maxlength`/`maxLength`: Most characters the value may have.
   * - `default-value`/`defaultValue`: The value the markup declared, which is where a reset returns to.
   * - `value`: What the control holds now, and what its form submits.
   *
   * One property, not two. Reading gives the real value whichever mode the
   * control is in, so `input.value` answers the question anyone asking it
   * meant. Writing hands ownership to the consumer, which is what
   * `<helix-input value="x">` says too, and matches what a controlled input
   * means in React: the value is theirs and the control waits to be told.
   * `default-value` is how markup seeds one it does not want to own.
   *
   * The same shape as the other three mixins, which is the point of them
   * being four of a kind rather than four of three kinds.
   * - `hint`: Help under the control, shown while there is nothing wrong.
   * - `feedback`: What is wrong, in the reader's words rather than the browser's.
   * - `label`: The accessible name, and the fallback for the `label` slot.
   * - `required`: Whether the form refuses to submit without it.
   * - `disabled`: Whether the control is non-interactive.
   *
   * Reflected, because the styled tier selects on it, and mirrored to
   * `aria-disabled` rather than removing the element from the accessibility
   * tree, so a screen reader can still announce that the control exists.
   * - `name`: Name submitted with the form.
   *
   * **Reflected, and it is the exception to "reflect only what CSS selects
   * on".** The platform builds a form's entry list from the `name` *content
   * attribute*, not from the property, so a control named through the property
   * submitted under no name at all and was silently dropped. Measured: two
   * inputs in one form, one named by attribute and one by property, and the
   * form carried a single entry.
   *
   * Safe for a React consumer, which is what the rule is protecting: React
   * renders a custom element's props as attributes on the server, so the name
   * is already in the markup being hydrated and reflecting it writes what is
   * there. It is only a change to the markup when a consumer assigns it
   * imperatively later, and nothing is hydrating by then.
   *
   * Here rather than on each control, where it was declared eight times and
   * reflected none of them.
   * - `onValueChange`: The consumer's callback, invoked after the value is applied.
   *
   * Not an attribute: it is a function. `onValueChange` and not `onChange`,
   * because React reserves the latter for its own synthetic system and wires
   * it to the native `change`, so a Helix event named `Change` would never
   * fire at all. (property only)
   * - `resolvedFeedback`: The message actually shown: the consumer's, or the platform's, or none. (property only) (readonly)
   * - `describedBy`: Id of the description node, for `aria-describedby` on the control.
   *
   * One at a time, because only one of the two is ever rendered. Naming both
   * would point a screen reader at an id that resolves to nothing, which it
   * reads as a description it cannot find. (property only) (readonly)
   * - `isDisabled`: Whether the control is off, by its own attribute or by an ancestor.
   *
   * What a component should bind to rather than `disabled`, which is only the
   * half of it the consumer wrote. (property only) (readonly)
   * - `form`: The form this control belongs to, if any. (property only) (readonly)
   * - `labels`: Labels associated with this control. (property only) (readonly)
   *
   * ## Events
   *
   * Events that will be emitted by the component.
   *
   * - `helix-change`: Fired as the text changes, and cancelable.
   * - `change`: Relayed from the textarea once the reader has finished.
   *
   * ## Methods
   *
   * Methods that can be called to access component functionality.
   *
   * - `focus(options?: FocusOptions) => void`: Puts the caret in the field, the way a label pointing at one would.
   * - `requestValue(next: string) => boolean`: Requests a new value, and reports whether the request stood.
   *
   * Announces before it acts, so `preventDefault()` on the `helix-change` is
   * a refusal and nothing moves. In uncontrolled mode the control then
   * updates itself; in controlled mode it applies nothing and waits for the
   * consumer to pass a new `value`, which is what controlled means.
   * - `formResetCallback() => void`: Returns the control to the value its markup declared.
   *
   * Both halves are dropped, the consumer's and the control's, because a
   * reset means the form is as it was served. Clearing only the internal one
   * would leave a control that had been written to stuck at that value.
   * - `formStateRestoreCallback(state: string | null) => void`: Restores the value when the browser brings a form back.
   *
   * Falling back to `defaultValue` rather than to empty, because a restore
   * with no state is a form the browser has nothing recorded for, which is
   * the same situation as a fresh one.
   * - `formDisabledCallback(disabled: boolean) => void`: The platform's notice that an ancestor fieldset changed.
   *
   * ## CSS Parts
   *
   * Custom selectors for styling elements within the component.
   *
   * - `field`: The box holding the control.
   * - `control`: The textarea itself.
   */
  "helix-base-textarea": Partial<
    HelixBaseTextareaProps &
      HelixBaseTextareaSolidJsProps &
      BaseProps<HelixBaseTextarea> &
      BaseEvents
  >;

  /**
   * An element rather than a slot, because it carries a timeout, a severity, a
   * dismiss control and a lifetime that pauses: behavior, state and API, which
   * is the test for whether a region becomes an element in this library.
   *
   * **The timer is the item's own.** Held by the region, one message arriving
   * would restart another's, so a stack of three would go from three seconds each
   * to nine for the last one. Each message is on its own clock from the moment it
   * is rendered.
   *
   * **A message is the opposite of the page it is over.** Inverted by default,
   * because a thing arriving in a corner has to be told apart from the page in
   * the moment before it is read, and inverting does that without spending a
   * color that means something. It is a flip of `color-scheme` rather than a
   * named inverse surface: every token in the subtree re-resolves, so a `Retry`
   * a consumer slots in comes out right without knowing where it is. `Tooltip`
   * can name the inverse surface directly because it holds no controls; this
   * cannot. Set `data-color-mode` on the region to take the page's mode instead.
   *
   * **No duration means it stays.** That is the safe default rather than the
   * common one: anything carrying an action has to still be there when the reader
   * decides to take it, and a component cannot tell from the outside whether the
   * message it was given is disposable.
   *
   * **The clock stops while it is being read.** Hover pauses it, and so does
   * focus landing anywhere inside, which is the case that matters more: a
   * keyboard reader tabbing towards the action in a toast is exactly the person a
   * timer must not race. Both resume where they left off rather than starting
   * again, so a message half-read does not get a full second life every time a
   * pointer crosses it.
   *
   * **Going away is a request, never an act.** It dispatches a cancelable
   * `helix-dismiss` and does nothing else: the consumer owns the list, so the
   * item removing itself would leave the two disagreeing. Auto-dismiss and the
   * dismiss control raise the same event, so a consumer handles one path and not
   * two.
   *
   * ## Attributes & Properties
   *
   * Component attributes and properties that can be applied to the element or by using JavaScript.
   *
   * - `duration`: How long it stays, in milliseconds. Absent means until it is dismissed.
   *
   * Read once when the item is first rendered. Changing it afterwards does not
   * restart a message the reader is already partway through.
   * - `severity`: What kind of message it is, which picks the mark and its name.
   * - `open`: Whether the message is still showing.
   *
   * The same decide-once contract every other stateful thing here carries, and
   * it was the one exception: this waited to be told in every case, so
   * `duration` did nothing at all without consumer script and the dismiss
   * control looked broken to anyone who pressed it. `Dialog` closes itself,
   * `Accordion` closes itself, and there was no reason a message should not.
   *
   * Declared by the markup and it is the consumer's: the item announces and
   * waits. Not declared and it is the item's: it goes when it is asked to, and
   * the consumer still hears `helix-dismiss` and takes it out of their own
   * list. Read once, at the first update.
   *
   * **No `default-open`, unlike the four mixins.** A `default-` seed exists so
   * markup can choose a starting state without claiming ownership, and there is
   * only one starting state that makes sense: a message that has been rendered
   * is showing. An attribute whose only legal value is the default is an
   * attribute nobody can use.
   * - `dismissible`: Whether it offers a control to take it away.
   * - `dismiss-label`/`dismissLabel`: Accessible name for that control.
   *
   * `attribute` is spelled out because Lit lowercases a property name to
   * derive one rather than dash-casing it, so this would otherwise be
   * reachable only as `dismisslabel`, which nobody would guess and no linter
   * would catch.
   *
   * ## Events
   *
   * Events that will be emitted by the component.
   *
   * - `helix-dismiss`: Fired when it asks to go, whether by the control or by its timer.
   *
   * ## Slots
   *
   * Areas where markup can be added to the component.
   *
   * - `(default)`: The message.
   * - `actions`: What to do about it, usually a button or a link.
   * - `icon`: Replaces the severity mark. Matches `Callout`, which is why the dismiss control's own glyph is `dismiss-icon` rather than this: two slots cannot share a name, assignment goes to whichever comes first in the tree, and the severity mark is the one a consumer reaches for.
   * - `dismiss-icon`: Replaces the glyph inside the dismiss control.
   *
   * ## Methods
   *
   * Methods that can be called to access component functionality.
   *
   * - `dismiss() => boolean`: Asks to be taken away, and reports whether the request stood.
   *
   * Announced before anything happens, so `preventDefault()` is a refusal and
   * the message stays. The event still carries the label, because a consumer
   * removing this from their own state has to know which one went, and that is
   * true whether or not the item hid itself first.
   * - `pause() => void`: Stops the clock, leaving whatever is left of it.
   * - `resume() => void`: Starts it again from where it stopped.
   *
   * ## CSS Parts
   *
   * Custom selectors for styling elements within the component.
   *
   * - `item`: The message's own surface.
   * - `icon`: The severity mark, where the message has one.
   * - `content`: The message.
   * - `actions`: The region holding what to do about it.
   * - `dismiss`: The control that asks to close.
   * - `timer`: The bar showing how long is left, where a duration was given.
   */
  "helix-base-toast-item": Partial<
    HelixBaseToastItemProps &
      HelixBaseToastItemSolidJsProps &
      BaseProps<HelixBaseToastItem> &
      BaseEvents
  >;

  /**
   * **The region is why this is one family rather than two.** A live region has
   * to be in the document *before* a message is put into it: assistive technology
   * subscribes to the region, and a region that arrives already holding its
   * message is frequently not announced at all. So the container is a part of the
   * family and not an arranger of complete things, which is the same reasoning
   * that puts `Radio.Group` inside its own family.
   *
   * **Polite, never assertive.** `role="alert"` interrupts whatever a reader is
   * being told, and almost nothing that arrives in a corner of the screen has
   * earned that. Something that genuinely cannot wait is a `Dialog`, which stops
   * the page for everyone rather than only for the people who cannot see it.
   *
   * **It never creates or destroys anything.** The consumer renders items and
   * removes them; asking to go is a cancelable `helix-dismiss` from the item.
   * That is still exactly true of the region: an item that has gone hides itself
   * and stays in the tree, so a consumer whose state still lists it does not have
   * their framework fighting a node this component took away. What changed is
   * that the item no longer waits to be told before hiding, unless the consumer
   * declared `open` and said the state is theirs.
   * There is no `toast.show()`, because an imperative queue inside a component is
   * a second copy of the application's state that nothing can render from: an app
   * that wants a `toast()` function writes a thin one over the state it already
   * has, and keeps the ability to render the same messages on the server, in a
   * test, or twice.
   *
   * ## Attributes & Properties
   *
   * Component attributes and properties that can be applied to the element or by using JavaScript.
   *
   * - `label`: Accessible name for the region, such as "Notifications".
   * - `placement`: Which corner or edge the stack sits at.
   *
   * Named here rather than on each message, because where a page puts its
   * toasts is a fact about the page: a stack whose members disagreed about
   * where they were would not be a stack.
   *
   * ## Slots
   *
   * Areas where markup can be added to the component.
   *
   * - `(default)`: The messages, as `helix-toast-item` elements.
   *
   * ## CSS Parts
   *
   * Custom selectors for styling elements within the component.
   *
   * - `region`: The stack the messages are in.
   */
  "helix-base-toast": Partial<
    HelixBaseToastProps &
      HelixBaseToastSolidJsProps &
      BaseProps<HelixBaseToast> &
      BaseEvents
  >;

  /**
   * The indicator is one element that travels, not a background that appears on
   * whichever item is current. That difference is the whole point: a fill that
   * swaps is two things changing at once and reads as a flicker, while one that
   * moves is a single object the eye follows, and it says where the selection
   * came from as well as where it went.
   *
   * Its whole box is measured from the selected item and written onto
   * the indicator as custom properties, because labels are different lengths and
   * no proportion of the group is the right answer. Measurement is client-side by
   * necessity, so the server renders the indicator hidden and it fades in once it
   * has somewhere to be, which is the harmless direction: it appears rather than
   * jumping from a wrong place.
   *
   * A radio group, and only that. Navigation is links marked with `aria-current`
   * and styled by the `data-navigation-item` recipe: radio semantics would announce a
   * set of destinations as a set of choices. A tab controls a panel.
   *
   * Being a radio group, it is a form control, and it says so through
   * `HelixFormElement`: it reports its value under a `name`, comes back to the
   * markup's choice on reset, and restores the one a reader made when the browser
   * brings a form back.
   *
   * The semantics were already right: the host has carried `role="radiogroup"`
   * and the items `role="radio"` from the start. What none of it did was reach a
   * form. A button in a shadow root submits nothing whatever its role, so the
   * value has to be reported by the host, which is the only thing a form can
   * see.
   *
   * ## Attributes & Properties
   *
   * Component attributes and properties that can be applied to the element or by using JavaScript.
   *
   * - `default-value`/`defaultValue`: The value the markup declared, which is where a reset returns to.
   * - `value`: What the control holds now, and what its form submits.
   *
   * One property, not two. Reading gives the real value whichever mode the
   * control is in, so `input.value` answers the question anyone asking it
   * meant. Writing hands ownership to the consumer, which is what
   * `<helix-input value="x">` says too, and matches what a controlled input
   * means in React: the value is theirs and the control waits to be told.
   * `default-value` is how markup seeds one it does not want to own.
   *
   * The same shape as the other three mixins, which is the point of them
   * being four of a kind rather than four of three kinds.
   * - `hint`: Help under the control, shown while there is nothing wrong.
   * - `feedback`: What is wrong, in the reader's words rather than the browser's.
   * - `label`: The accessible name, and the fallback for the `label` slot.
   * - `required`: Whether the form refuses to submit without it.
   * - `disabled`: Whether the control is non-interactive.
   *
   * Reflected, because the styled tier selects on it, and mirrored to
   * `aria-disabled` rather than removing the element from the accessibility
   * tree, so a screen reader can still announce that the control exists.
   * - `name`: Name submitted with the form.
   *
   * **Reflected, and it is the exception to "reflect only what CSS selects
   * on".** The platform builds a form's entry list from the `name` *content
   * attribute*, not from the property, so a control named through the property
   * submitted under no name at all and was silently dropped. Measured: two
   * inputs in one form, one named by attribute and one by property, and the
   * form carried a single entry.
   *
   * Safe for a React consumer, which is what the rule is protecting: React
   * renders a custom element's props as attributes on the server, so the name
   * is already in the markup being hydrated and reflecting it writes what is
   * there. It is only a change to the markup when a consumer assigns it
   * imperatively later, and nothing is hydrating by then.
   *
   * Here rather than on each control, where it was declared eight times and
   * reflected none of them.
   * - `onValueChange`: The consumer's callback, invoked after the value is applied.
   *
   * Not an attribute: it is a function. `onValueChange` and not `onChange`,
   * because React reserves the latter for its own synthetic system and wires
   * it to the native `change`, so a Helix event named `Change` would never
   * fire at all. (property only)
   * - `resolvedFeedback`: The message actually shown: the consumer's, or the platform's, or none. (property only) (readonly)
   * - `describedBy`: Id of the description node, for `aria-describedby` on the control.
   *
   * One at a time, because only one of the two is ever rendered. Naming both
   * would point a screen reader at an id that resolves to nothing, which it
   * reads as a description it cannot find. (property only) (readonly)
   * - `isDisabled`: Whether the control is off, by its own attribute or by an ancestor.
   *
   * What a component should bind to rather than `disabled`, which is only the
   * half of it the consumer wrote. (property only) (readonly)
   * - `form`: The form this control belongs to, if any. (property only) (readonly)
   * - `labels`: Labels associated with this control. (property only) (readonly)
   *
   * ## Events
   *
   * Events that will be emitted by the component.
   *
   * - `helix-change`: Fired before the answer moves, and cancelable. The only way to refuse one.
   * - `helix-select`: Fired when an item is chosen. Dispatched by the item and listened for here.
   *
   * ## Slots
   *
   * Areas where markup can be added to the component.
   *
   * - `(default)`: The group's items.
   *
   * ## Methods
   *
   * Methods that can be called to access component functionality.
   *
   * - `requestValue(next: string) => boolean`: Requests a new value, and reports whether the request stood.
   *
   * Announces before it acts, so `preventDefault()` on the `helix-change` is
   * a refusal and nothing moves. In uncontrolled mode the control then
   * updates itself; in controlled mode it applies nothing and waits for the
   * consumer to pass a new `value`, which is what controlled means.
   * - `formResetCallback() => void`: Returns the control to the value its markup declared.
   *
   * Both halves are dropped, the consumer's and the control's, because a
   * reset means the form is as it was served. Clearing only the internal one
   * would leave a control that had been written to stuck at that value.
   * - `formStateRestoreCallback(state: string | null) => void`: Restores the value when the browser brings a form back.
   *
   * Falling back to `defaultValue` rather than to empty, because a restore
   * with no state is a form the browser has nothing recorded for, which is
   * the same situation as a fresh one.
   * - `formDisabledCallback(disabled: boolean) => void`: The platform's notice that an ancestor fieldset changed.
   *
   * ## CSS Parts
   *
   * Custom selectors for styling elements within the component.
   *
   * - `track`: The bar the items sit in.
   * - `indicator`: The moving marker behind the selected item.
   */
  "helix-base-toggle-group": Partial<
    HelixBaseToggleGroupProps &
      HelixBaseToggleGroupSolidJsProps &
      BaseProps<HelixBaseToggleGroup> &
      BaseEvents
  >;

  /**
   * Renders a `<button role="radio">`. This is a form control and nothing else.
   *
   * Navigation is not this. It is links marked with `aria-current` and styled by
   * the `data-navigation-item` recipe in the base layer, which carries the same look
   * without radio semantics announcing destinations as choices.
   *
   * ## Attributes & Properties
   *
   * Component attributes and properties that can be applied to the element or by using JavaScript.
   *
   * - `value`: Identifies the item to the group.
   * - `selected`: Whether this item is the current one.
   * - `disabled`: Whether the item can be chosen.
   * - `focusable`: Whether this item holds the group's tab stop while nothing is chosen.
   *
   * The stop normally rides on the selection, and an unanswered group has no
   * selection, so it had no stop and the keyboard could not reach it. Written
   * by the group, with no attribute: it is coordination between elements, and
   * `tabindex` on a host the consumer rendered is the change a React consumer's
   * hydration reports and does not patch up. (property only)
   *
   * ## Events
   *
   * Events that will be emitted by the component.
   *
   * - `helix-select`: Fired when the item is chosen.
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
   * - `item`: The radio button.
   */
  "helix-base-toggle": Partial<
    HelixBaseToggleProps &
      HelixBaseToggleSolidJsProps &
      BaseProps<HelixBaseToggle> &
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

  /**
   * The trigger is slotted and stays the consumer's own element. The bubble is
   * rendered here, in the top layer through the popover API, so it clears any
   * ancestor with `overflow: hidden` without a `z-index` anywhere.
   *
   * Position comes from `FloatingController`, which flips to another side when
   * the preferred one does not fit and slides along it to stay in view.
   *
   * **The description is linked by element reference, not by id.** An IDREF
   * cannot cross a shadow boundary, so `aria-describedby` on a slotted trigger
   * pointing at a bubble in here resolves to nothing.
   * `ElementInternals.ariaDescribedByElements` takes the element itself, which
   * does cross.
   *
   * It shows on hover and on focus, and hides on leave, on blur, and on Escape.
   * A tooltip that answers only the pointer is one a keyboard reader never sees.
   *
   * The pointer waits out `delay` first, or sweeping a row of controls flashes a
   * tooltip for each of them. Focus does not wait: a keyboard reader landing on a
   * control has already committed to it.
   *
   * Open state comes from `MixinControllerOpen`, so it announces `helix-open` and
   * `helix-close` like every other overlay here, and a consumer can drive it with
   * `open` where they need to.
   *
   * ## Attributes & Properties
   *
   * Component attributes and properties that can be applied to the element or by using JavaScript.
   *
   * - `content`: The text shown in the bubble.
   *
   * The common case, and the fallback for the `content` slot: slot something
   * there and it replaces this. Both cannot show at once, which is the point
   * of using fallback content rather than rendering whichever is present.
   * - `placement`: Preferred side. It moves if that side does not fit.
   * - `offset`: Space between the trigger and the bubble, in pixels.
   *
   * Eight, which is not arbitrary: it is the size of the arrow the styled tier
   * draws, so the point reaches the trigger and the bubble does not. A consumer
   * changing this and keeping the arrow gets a point that falls short or one
   * that overlaps what it is pointing at, which is worth knowing before
   * changing it rather than after.
   * - `disabled`: Whether the tooltip never shows.
   * - `delay`: How long the pointer must rest before the bubble appears, in milliseconds.
   *
   * Without one, sweeping across a row of controls flashes a tooltip for each
   * of them, which is noise rather than help. Focus opens with no delay: a
   * keyboard reader arriving on a control has already committed to it.
   * - `delay-out`/`delayOut`: How long the bubble stays after the pointer leaves, in milliseconds.
   * - `open`: Whether the element is open.
   *
   * One property, not two. Reading gives the real state whichever mode the
   * element is in, so `dialog.open` answers the question anyone asking it
   * meant. Writing hands ownership to the consumer, which is what the
   * attribute in `<helix-dialog open>` does as well: from then on the element
   * announces changes and applies none of them.
   *
   * It reads as an accessor pair rather than a field because those are two
   * different questions sharing one name, and the alternative was a second
   * property answering the first. That worked for a boolean, where `isOpen`
   * reads well; there is no such word for a value or an active item, so all
   * four of these mixins now have this shape instead of two shapes.
   *
   * **Not reflected, and that is required rather than tidy.** Reflection
   * writes the resolved state back as an attribute, and writing the attribute
   * is how a consumer says they own it. So an uncontrolled element that
   * opened itself would put `open` on its own host and, from the next thing
   * that read it, be indistinguishable from one the consumer controls:
   * cloned, serialised for hydration, or diffed by a framework, it would come
   * back controlled and stop responding. `data-open` carries the resolved
   * state for stylesheets, which is what it has always been for.
   * - `default-open`/`defaultOpen`: Initial open state for uncontrolled use, where nothing declared one.
   * - `onOpenChange`: The consumer's callback, invoked after the state is applied.
   *
   * Not an attribute: it is a function. And not reachable from React's JSX,
   * which reserves every `on[A-Z]` prop for its own event system and drops
   * what it does not recognize; the generated wrapper listens for the events
   * instead. (property only)
   *
   * ## Events
   *
   * Events that will be emitted by the component.
   *
   * - `helix-open`: Fired before the bubble shows, and cancelable.
   * - `helix-close`: Fired before it hides, and cancelable.
   *
   * ## Slots
   *
   * Areas where markup can be added to the component.
   *
   * - `(default)`: The trigger.
   * - `content`: The bubble's content, when `content` is not enough. Anything slotted here replaces the property, which is this slot's fallback.
   *
   * ## Methods
   *
   * Methods that can be called to access component functionality.
   *
   * - `show() => void`: Shows the bubble, unless there is nothing to show.
   * - `hide() => void`: Hides the bubble.
   * - `requestOpen(next: boolean) => boolean`: Requests an open-state change, and reports whether it was applied.
   *
   * Announces before it acts, so `preventDefault()` on the `helix-open` or
   * `helix-close` is a refusal and nothing moves. In uncontrolled mode the
   * element then updates itself; in controlled mode it applies nothing and
   * waits for the consumer to pass a new `open`, which is what "controlled"
   * means.
   * - `toggleOpen() => boolean`: Requests the opposite of the current state.
   *
   * ## CSS Parts
   *
   * Custom selectors for styling elements within the component.
   *
   * - `tooltip`: The bubble.
   * - `arrow`: The point aimed at the trigger.
   */
  "helix-base-tooltip": Partial<
    HelixBaseTooltipProps &
      HelixBaseTooltipSolidJsProps &
      BaseProps<HelixBaseTooltip> &
      BaseEvents
  >;

  /**
   * **`open`, on `MixinControllerOpen`, where it was a bare `expanded` boolean.**
   * A branch showing its children is the same state a disclosure holds, and
   * `AccordionItem` has been on that mixin all along. Written here by hand it had
   * neither half of what the mixin gives: `this.expanded = !this.expanded`
   * announced nothing, so a consumer could not know a branch had opened, and
   * could not own the state either. `aria-expanded` is still what the row
   * renders, because that is the attribute a tree uses; the property is what
   * changed, not the semantics.
   *
   * An element rather than a slot because it owns state: whether it is open,
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
   * - `value`: Identifies the item to the consumer, carried in `helix-select`.
   * - `selected`: Whether this item is the current one.
   *
   * Not reflected, for the reason `level` below gives in full: the tree assigns
   * this after it upgrades, so the attribute would be a change to markup the
   * consumer rendered and hydration would report it. It reflected, one line
   * from the paragraph saying why it must not.
   *
   * The stylesheet reads it from the row inside this shadow root, which is the
   * answer `level` gives one paragraph down: the indent it drives is written
   * onto the row rather than onto the host, because the row is not part of the
   * tree React hydrates. Mirroring to `data-selected` on the host instead was
   * the same fault with a different name, and React said so.
   * - `level`: Depth from the root, set by the tree so indentation needs no CSS nesting.
   *
   * Not reflected. The tree assigns this after it upgrades, so an attribute
   * here would be a change to markup the consumer rendered and hydration would
   * report it. The indent it drives is written onto the row instead, inside the
   * shadow root, which is not part of the tree React hydrates.
   * - `open`: Whether the element is open.
   *
   * One property, not two. Reading gives the real state whichever mode the
   * element is in, so `dialog.open` answers the question anyone asking it
   * meant. Writing hands ownership to the consumer, which is what the
   * attribute in `<helix-dialog open>` does as well: from then on the element
   * announces changes and applies none of them.
   *
   * It reads as an accessor pair rather than a field because those are two
   * different questions sharing one name, and the alternative was a second
   * property answering the first. That worked for a boolean, where `isOpen`
   * reads well; there is no such word for a value or an active item, so all
   * four of these mixins now have this shape instead of two shapes.
   *
   * **Not reflected, and that is required rather than tidy.** Reflection
   * writes the resolved state back as an attribute, and writing the attribute
   * is how a consumer says they own it. So an uncontrolled element that
   * opened itself would put `open` on its own host and, from the next thing
   * that read it, be indistinguishable from one the consumer controls:
   * cloned, serialised for hydration, or diffed by a framework, it would come
   * back controlled and stop responding. `data-open` carries the resolved
   * state for stylesheets, which is what it has always been for.
   * - `default-open`/`defaultOpen`: Initial open state for uncontrolled use, where nothing declared one.
   * - `focusable`: Whether this item holds the tree's single tab stop. (property only)
   * - `isBranch`: Whether this node has children. (property only) (readonly)
   * - `onOpenChange`: The consumer's callback, invoked after the state is applied.
   *
   * Not an attribute: it is a function. And not reachable from React's JSX,
   * which reserves every `on[A-Z]` prop for its own event system and drops
   * what it does not recognize; the generated wrapper listens for the events
   * instead. (property only)
   *
   * ## Events
   *
   * Events that will be emitted by the component.
   *
   * - `helix-select`: Fired when the item is chosen.
   * - `helix-open`: Fired before a branch opens, and cancelable.
   * - `helix-close`: Fired before a branch closes, and cancelable.
   *
   * ## Slots
   *
   * Areas where markup can be added to the component.
   *
   * - `(default)`: The item's label.
   * - `children`: Nested items, which make this a branch.
   * - `start`: Before the label, after the chevron. A mark about the item.
   * - `end`: After the label, at the row's far side. A count, or a state.
   *
   * ## Methods
   *
   * Methods that can be called to access component functionality.
   *
   * - `focusItem() => void`: Moves focus to this node.
   * - `select() => void`: Selects this node and announces it.
   * - `requestOpen(next: boolean) => boolean`: Requests an open-state change, and reports whether it was applied.
   *
   * Announces before it acts, so `preventDefault()` on the `helix-open` or
   * `helix-close` is a refusal and nothing moves. In uncontrolled mode the
   * element then updates itself; in controlled mode it applies nothing and
   * waits for the consumer to pass a new `open`, which is what "controlled"
   * means.
   * - `toggleOpen() => boolean`: Requests the opposite of the current state.
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
   * - `chevron`: Which end of a row the chevron sits at.
   *
   * Unset is the start, which is what a tree of folders looks like. `end` puts
   * it at the far side, where it reads as a control belonging to the row rather
   * than as part of the name, and it lets every label start at one place
   * without a row that has no chevron reserving space for one.
   *
   * On the tree rather than on each item, because a row whose chevron sat
   * somewhere different from its siblings' would be a mistake, not a choice.
   * - `label`: Accessible name for the tree.
   * - `active`: Which item is current, by its `value`.
   *
   * Called `active`, which is what this mixin is named for and what it was
   * not: it declared `value`, so the one mixin whose whole subject is which
   * item is active had no such property, and `active` meant something else
   * entirely elsewhere in the library. It still does, and only there now:
   * `option.active` is the option the keyboard is on, which is a different
   * question from which one is chosen.
   *
   * An accessor pair, the same shape as the other three. Reading gives the
   * real item; writing hands ownership to the consumer, so `<helix-tabs
   * active="one">` is a set that stays on that tab and `default-active` is
   * how markup says where to start.
   * - `default-active`/`defaultActive`: Initial item for uncontrolled use. Ignored once `active` is written.
   * - `onActiveChange`: The consumer's callback, invoked after the change is applied. (property only)
   *
   * ## Events
   *
   * Events that will be emitted by the component.
   *
   * - `helix-change`: Fired before the current node moves, and cancelable. The only way to refuse one.
   * - `helix-select`: Fired when an item is chosen. Dispatched by the item and listened for here, because the tree is what a consumer holds a reference to.
   *
   * ## Slots
   *
   * Areas where markup can be added to the component.
   *
   * - `(default)`: The tree's items.
   *
   * ## Methods
   *
   * Methods that can be called to access component functionality.
   *
   * - `requestActive(next: string) => boolean`: Requests a new current item, and reports whether the request stood.
   *
   * Announces before it acts, so `preventDefault()` on the `helix-change` is
   * a refusal and nothing moves. Unlike a native control, nothing has moved
   * by the time this runs, so refusing is simply not writing: there is
   * nothing to put back.
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
