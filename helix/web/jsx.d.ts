import type {
  Helix,
  HelixAccordion,
  HelixAccordionItem,
  HelixAnnouncement,
  HelixAppHeader,
  HelixAvatar,
  HelixAvatarGroup,
  HelixBadge,
  HelixBlockquote,
  HelixBreadcrumb,
  HelixBreadcrumbs,
  HelixButton,
  HelixButtonGroup,
  HelixCalendar,
  HelixCallout,
  HelixCard,
  HelixCarousel,
  HelixChangeEvent,
  HelixCheckbox,
  HelixCheckboxGroup,
  HelixCloseEvent,
  HelixDialog,
  HelixDismissEvent,
  HelixDivider,
  HelixDrawer,
  HelixDrilldown,
  HelixDrilldownItem,
  HelixEmpty,
  HelixFlex,
  HelixFormElement,
  HelixGrid,
  HelixIcon,
  HelixIconButton,
  HelixInput,
  HelixKbd,
  HelixList,
  HelixListItem,
  HelixListbox,
  HelixMenu,
  HelixMenuItem,
  HelixNavBar,
  HelixOpenEvent,
  HelixOption,
  HelixOptionGroup,
  HelixPageNav,
  HelixPopover,
  HelixProgress,
  HelixQuote,
  HelixRadio,
  HelixRadioGroup,
  HelixSelect,
  HelixSelectEvent,
  HelixSkeleton,
  HelixSlider,
  HelixSpinner,
  HelixStat,
  HelixStatGroup,
  HelixSwitch,
  HelixTable,
  HelixTableCell,
  HelixTableColumn,
  HelixTableRow,
  HelixTabs,
  HelixTabsPanel,
  HelixTabsTab,
  HelixTag,
  HelixText,
  HelixTextarea,
  HelixToast,
  HelixToastItem,
  HelixToggle,
  HelixToggleGroup,
  HelixToolbar,
  HelixTooltip,
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

/** `HelixAccordionItem` component event */
export type HelixAccordionItemElementEvent<E = Event> = TypedEvent<
  HelixAccordionItem,
  E
>;
/** `helix-open` event type */
export type HelixAccordionItemHelixOpenElementEvent =
  HelixAccordionItemElementEvent<HelixOpenEvent>;

export type HelixAccordionItemProps = {
  /** Tightens the trigger for dense layouts. */
  dense?: HelixAccordionItem["dense"];
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
  open?: HelixAccordionItem["open"];
  /** Initial open state for uncontrolled use, where nothing declared one. */
  "default-open"?: HelixAccordionItem["defaultOpen"];
  /** Initial open state for uncontrolled use, where nothing declared one. */
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
  /** The consumer's callback, invoked after the state is applied.

Not an attribute: it is a function. And not reachable from React's JSX,
which reserves every `on[A-Z]` prop for its own event system and drops
what it does not recognise; the generated wrapper listens for the events
instead. */
  onOpenChange?: HelixAccordionItem["onOpenChange"];

  /** Fired when the item opens or closes. */
  "onhelix-open"?: (e: HelixAccordionItemHelixOpenElementEvent) => void;
};

export type HelixAccordionItemSolidJsProps = {
  /** Tightens the trigger for dense layouts. */
  "prop:dense"?: HelixAccordionItem["dense"];
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
  "prop:open"?: HelixAccordionItem["open"];
  /** Initial open state for uncontrolled use, where nothing declared one. */
  "bool:default-open"?: HelixAccordionItem["defaultOpen"];
  /** Initial open state for uncontrolled use, where nothing declared one. */
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
  /** The consumer's callback, invoked after the state is applied.

Not an attribute: it is a function. And not reachable from React's JSX,
which reserves every `on[A-Z]` prop for its own event system and drops
what it does not recognise; the generated wrapper listens for the events
instead. */
  "prop:onOpenChange"?: HelixAccordionItem["onOpenChange"];
  /** Fired when the item opens or closes. */
  "on:helix-open"?: (e: HelixAccordionItemHelixOpenElementEvent) => void;

  /** Set the innerHTML of the element */
  innerHTML?: string;
  /** Set the textContent of the element */
  textContent?: string | number;
};

export type HelixAccordionProps = {
  /** Removes the surrounding surface, leaving only the separating rules. */
  appearance?: HelixAccordion["appearance"];
  /** How many sections may be open at once.

Absent is `multiple`, so nothing closes unexpectedly and the default costs
no attribute on the host. `single` keeps exactly one open and refuses to
close the last; `single-collapsible` keeps at most one and lets it close.

A union rather than a mode plus a `collapsible` boolean, which would make
`collapsible` alongside `multiple` expressible and meaningless. */
  mode?: HelixAccordion["mode"];
};

export type HelixAccordionSolidJsProps = {
  /** Removes the surrounding surface, leaving only the separating rules. */
  "prop:appearance"?: HelixAccordion["appearance"];
  /** How many sections may be open at once.

Absent is `multiple`, so nothing closes unexpectedly and the default costs
no attribute on the host. `single` keeps exactly one open and refuses to
close the last; `single-collapsible` keeps at most one and lets it close.

A union rather than a mode plus a `collapsible` boolean, which would make
`collapsible` alongside `multiple` expressible and meaningless. */
  "prop:mode"?: HelixAccordion["mode"];

  /** Set the innerHTML of the element */
  innerHTML?: string;
  /** Set the textContent of the element */
  textContent?: string | number;
};

/** `HelixAnnouncement` component event */
export type HelixAnnouncementElementEvent<E = Event> = TypedEvent<
  HelixAnnouncement,
  E
>;
/** `helix-dismiss` event type */
export type HelixAnnouncementHelixDismissElementEvent =
  HelixAnnouncementElementEvent<HelixDismissEvent>;

export type HelixAnnouncementProps = {
  /** What kind of attention the message needs. */
  severity?: HelixAnnouncement["severity"];
  /** Whether the reader can close it. */
  dismissible?: HelixAnnouncement["dismissible"];
  /** Accessible name for the dismiss control. */
  "dismiss-label"?: HelixAnnouncement["dismissLabel"];
  /** Accessible name for the dismiss control. */
  dismissLabel?: HelixAnnouncement["dismissLabel"];

  /** Fired when the reader asks to close it. */
  "onhelix-dismiss"?: (e: HelixAnnouncementHelixDismissElementEvent) => void;
};

export type HelixAnnouncementSolidJsProps = {
  /** What kind of attention the message needs. */
  "prop:severity"?: HelixAnnouncement["severity"];
  /** Whether the reader can close it. */
  "prop:dismissible"?: HelixAnnouncement["dismissible"];
  /** Accessible name for the dismiss control. */
  "attr:dismiss-label"?: HelixAnnouncement["dismissLabel"];
  /** Accessible name for the dismiss control. */
  "prop:dismissLabel"?: HelixAnnouncement["dismissLabel"];
  /** Fired when the reader asks to close it. */
  "on:helix-dismiss"?: (e: HelixAnnouncementHelixDismissElementEvent) => void;

  /** Set the innerHTML of the element */
  innerHTML?: string;
  /** Set the textContent of the element */
  textContent?: string | number;
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

Centered by default, which reads as the site's spine when the navigation is
the primary thing in the header rather than an afterthought beside a logo.
Centered against the banner rather than against whatever space the brand
left over, so the middle of the nav is the middle of the window whatever
the wordmark and the actions happen to measure.

`start` is the opt-out, for a header whose navigation trails the brand. */
  "nav-align"?: HelixAppHeader["navAlign"];
  /** Where the navigation sits in the bar.

Centered by default, which reads as the site's spine when the navigation is
the primary thing in the header rather than an afterthought beside a logo.
Centered against the banner rather than against whatever space the brand
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

Centered by default, which reads as the site's spine when the navigation is
the primary thing in the header rather than an afterthought beside a logo.
Centered against the banner rather than against whatever space the brand
left over, so the middle of the nav is the middle of the window whatever
the wordmark and the actions happen to measure.

`start` is the opt-out, for a header whose navigation trails the brand. */
  "attr:nav-align"?: HelixAppHeader["navAlign"];
  /** Where the navigation sits in the bar.

Centered by default, which reads as the site's spine when the navigation is
the primary thing in the header rather than an afterthought beside a logo.
Centered against the banner rather than against whatever space the brand
left over, so the middle of the nav is the middle of the window whatever
the wordmark and the actions happen to measure.

`start` is the opt-out, for a header whose navigation trails the brand. */
  "prop:navAlign"?: HelixAppHeader["navAlign"];

  /** Set the innerHTML of the element */
  innerHTML?: string;
  /** Set the textContent of the element */
  textContent?: string | number;
};

export type HelixAvatarGroupProps = {
  /** Accessible name for the set, such as "Reviewers". */
  label?: HelixAvatarGroup["label"];
  /** How many avatars are shown before the rest become a count.

Zero or less shows all of them, which is what an unset limit means and is
more useful than refusing to render. */
  max?: HelixAvatarGroup["max"];
};

export type HelixAvatarGroupSolidJsProps = {
  /** Accessible name for the set, such as "Reviewers". */
  "prop:label"?: HelixAvatarGroup["label"];
  /** How many avatars are shown before the rest become a count.

Zero or less shows all of them, which is what an unset limit means and is
more useful than refusing to render. */
  "prop:max"?: HelixAvatarGroup["max"];

  /** Set the innerHTML of the element */
  innerHTML?: string;
  /** Set the textContent of the element */
  textContent?: string | number;
};

/** `HelixAvatar` component event */
export type HelixAvatarElementEvent<E = Event> = TypedEvent<HelixAvatar, E>;

export type HelixAvatarProps = {
  /** Whether the avatar is a circle or a rounded square. */
  shape?: HelixAvatar["shape"];
  /** Edge length of the avatar. */
  size?: HelixAvatar["size"];
  /** Image to show. Falls back to the slot, or to initials, if it fails. */
  src?: HelixAvatar["src"];
  /** Name of the person or entity. Used for the label and the initials. */
  name?: HelixAvatar["name"];

  /** Relayed from the image once it has loaded. */
  onload?: (e: HelixAvatarElementEvent) => void;
  /** Relayed from the image when it fails. */
  onerror?: (e: HelixAvatarElementEvent) => void;
};

export type HelixAvatarSolidJsProps = {
  /** Whether the avatar is a circle or a rounded square. */
  "prop:shape"?: HelixAvatar["shape"];
  /** Edge length of the avatar. */
  "prop:size"?: HelixAvatar["size"];
  /** Image to show. Falls back to the slot, or to initials, if it fails. */
  "prop:src"?: HelixAvatar["src"];
  /** Name of the person or entity. Used for the label and the initials. */
  "prop:name"?: HelixAvatar["name"];
  /** Relayed from the image once it has loaded. */
  "on:load"?: (e: HelixAvatarElementEvent) => void;
  /** Relayed from the image when it fails. */
  "on:error"?: (e: HelixAvatarElementEvent) => void;

  /** Set the innerHTML of the element */
  innerHTML?: string;
  /** Set the textContent of the element */
  textContent?: string | number;
};

export type HelixBadgeProps = {
  /** How much attention the mark asks for. */
  appearance?: HelixBadge["appearance"];
  /** The count or short text to show. Absent shows a dot, zero shows nothing. */
  value?: HelixBadge["value"];
  /** Cap for a numeric value. Past it the indicator reads `{max}+`. */
  max?: HelixBadge["max"];
  /** Accessible name. Required for a dot, which has no text to read. */
  label?: HelixBadge["label"];
};

export type HelixBadgeSolidJsProps = {
  /** How much attention the mark asks for. */
  "prop:appearance"?: HelixBadge["appearance"];
  /** The count or short text to show. Absent shows a dot, zero shows nothing. */
  "prop:value"?: HelixBadge["value"];
  /** Cap for a numeric value. Past it the indicator reads `{max}+`. */
  "prop:max"?: HelixBadge["max"];
  /** Accessible name. Required for a dot, which has no text to read. */
  "prop:label"?: HelixBadge["label"];

  /** Set the innerHTML of the element */
  innerHTML?: string;
  /** Set the textContent of the element */
  textContent?: string | number;
};

export type HelixBlockquoteProps = {
  /** URL identifying where the passage came from. */
  cite?: HelixBlockquote["cite"];
};

export type HelixBlockquoteSolidJsProps = {
  /** URL identifying where the passage came from. */
  "prop:cite"?: HelixBlockquote["cite"];

  /** Set the innerHTML of the element */
  innerHTML?: string;
  /** Set the textContent of the element */
  textContent?: string | number;
};

export type HelixBreadcrumbProps = {
  /** Whether this item is the page the reader is on. */
  current?: HelixBreadcrumb["current"];
};

export type HelixBreadcrumbSolidJsProps = {
  /** Whether this item is the page the reader is on. */
  "prop:current"?: HelixBreadcrumb["current"];

  /** Set the innerHTML of the element */
  innerHTML?: string;
  /** Set the textContent of the element */
  textContent?: string | number;
};

export type HelixBreadcrumbsProps = {};

export type HelixBreadcrumbsSolidJsProps = {
  /** Set the innerHTML of the element */
  innerHTML?: string;
  /** Set the textContent of the element */
  textContent?: string | number;
};

export type HelixButtonGroupProps = {
  /** Whether the buttons are one bar or a spaced row. */
  appearance?: HelixButtonGroup["appearance"];
  /** Accessible name for the group.

On the host through internals, so an author's `aria-label` still overrides
it and nothing lands on the host that a consumer's markup did not have. */
  label?: HelixButtonGroup["label"];
};

export type HelixButtonGroupSolidJsProps = {
  /** Whether the buttons are one bar or a spaced row. */
  "prop:appearance"?: HelixButtonGroup["appearance"];
  /** Accessible name for the group.

On the host through internals, so an author's `aria-label` still overrides
it and nothing lands on the host that a consumer's markup did not have. */
  "prop:label"?: HelixButtonGroup["label"];

  /** Set the innerHTML of the element */
  innerHTML?: string;
  /** Set the textContent of the element */
  textContent?: string | number;
};

export type HelixButtonProps = {
  /** How much visual weight the button carries.

- `primary` is the one action a region is for, and there should be one. Two
  primary buttons are two things claiming to be the most important, and the
  reader has to work out which of you meant it.
- `secondary` is an action that is real but not the point, which is most
  buttons on most pages. A page whose every button is primary has said
  nothing about which one matters.
- `tertiary` is quiet enough to sit in a row of them without the row
  becoming loud: for actions that are available rather than suggested.
  Cancel, dismiss, the contents of a toolbar.
- `danger` says the action is destructive before the confirmation does. The
  shape of the control is what a reader recognises at a glance, where a red
  word inside a neutral button is something they have to read first.

This is also where emphasis comes from, rather than size: a filled primary
button says "this one matters" far louder than eight more pixels would. */
  appearance?: HelixButton["appearance"];
  /** What activating the button does to its form. */
  type?: HelixButton["type"];
  /** Accessible name, for a button whose content is not text.

Lives here rather than only on `IconButton` so the two share one render.
An icon-only button without it is a control a screen reader announces as
"button" and nothing else. */
  label?: HelixButton["label"];
  /** What to send when the button is activated, and what to send it to.

The platform's invoker attributes, forwarded onto the inner `<button>`
rather than left on the host: only a real button is recognised as an
invoker, so `commandfor` written on a custom element resolves nothing and
the trigger silently does nothing at all. A wrapper has to hand them down,
the same way `label` becomes `aria-label` in there.

```html
<helix-button commandfor="confirm" command="--show">Delete…</helix-button>
```

`commandFor` spells its attribute out, because Lit lowercases a property
name to derive one rather than dash-casing it, and what a consumer writes
is the platform's `commandfor`. */
  command?: HelixButton["command"];
  /** The id of the element the command is sent to. */
  commandfor?: HelixButton["commandFor"];
  /** The id of the element the command is sent to. */
  commandFor?: HelixButton["commandFor"];
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
  /** How much visual weight the button carries.

- `primary` is the one action a region is for, and there should be one. Two
  primary buttons are two things claiming to be the most important, and the
  reader has to work out which of you meant it.
- `secondary` is an action that is real but not the point, which is most
  buttons on most pages. A page whose every button is primary has said
  nothing about which one matters.
- `tertiary` is quiet enough to sit in a row of them without the row
  becoming loud: for actions that are available rather than suggested.
  Cancel, dismiss, the contents of a toolbar.
- `danger` says the action is destructive before the confirmation does. The
  shape of the control is what a reader recognises at a glance, where a red
  word inside a neutral button is something they have to read first.

This is also where emphasis comes from, rather than size: a filled primary
button says "this one matters" far louder than eight more pixels would. */
  "prop:appearance"?: HelixButton["appearance"];
  /** What activating the button does to its form. */
  "prop:type"?: HelixButton["type"];
  /** Accessible name, for a button whose content is not text.

Lives here rather than only on `IconButton` so the two share one render.
An icon-only button without it is a control a screen reader announces as
"button" and nothing else. */
  "prop:label"?: HelixButton["label"];
  /** What to send when the button is activated, and what to send it to.

The platform's invoker attributes, forwarded onto the inner `<button>`
rather than left on the host: only a real button is recognised as an
invoker, so `commandfor` written on a custom element resolves nothing and
the trigger silently does nothing at all. A wrapper has to hand them down,
the same way `label` becomes `aria-label` in there.

```html
<helix-button commandfor="confirm" command="--show">Delete…</helix-button>
```

`commandFor` spells its attribute out, because Lit lowercases a property
name to derive one rather than dash-casing it, and what a consumer writes
is the platform's `commandfor`. */
  "prop:command"?: HelixButton["command"];
  /** The id of the element the command is sent to. */
  "attr:commandfor"?: HelixButton["commandFor"];
  /** The id of the element the command is sent to. */
  "prop:commandFor"?: HelixButton["commandFor"];
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

/** `HelixCalendar` component event */
export type HelixCalendarElementEvent<E = Event> = TypedEvent<HelixCalendar, E>;
/** `helix-change` event type */
export type HelixCalendarHelixChangeElementEvent =
  HelixCalendarElementEvent<HelixChangeEvent>;

export type HelixCalendarProps = {
  /** The value the markup declared, which is where a reset returns to. */
  "default-value"?: HelixCalendar["defaultValue"];
  /** The value the markup declared, which is where a reset returns to. */
  defaultValue?: HelixCalendar["defaultValue"];
  /** What the control holds now, and what its form submits.

One property, not two. Reading gives the real value whichever mode the
control is in, so `input.value` answers the question anyone asking it
meant. Writing hands ownership to the consumer, which is what
`<helix-input value="x">` says too, and matches what a controlled input
means in React: the value is theirs and the control waits to be told.
`default-value` is how markup seeds one it does not want to own.

The same shape as the other three mixins, which is the point of them
being four of a kind rather than four of three kinds. */
  value?: HelixCalendar["value"];
  /** Name the calendar reports under when its form is submitted.

Absent means it submits nothing, which is what makes it safe to put one
inside something else. `DatePicker` will hold the name and the calendar in
its panel will stay quiet, the same way `Select` holds the name and the
`Listbox` inside it does not. */
  name?: HelixCalendar["name"];
  /** How many dates can be held at once. */
  mode?: HelixCalendar["mode"];
  /** How many months to show, side by side. */
  months?: HelixCalendar["months"];
  /** Locale for month and day names. Absent uses the runtime's own. */
  locale?: HelixCalendar["locale"];
  /** Dates that cannot be chosen, comma separated, as `YYYY-MM-DD`. */
  "disable-dates"?: HelixCalendar["disableDates"];
  /** Dates that cannot be chosen, comma separated, as `YYYY-MM-DD`. */
  disableDates?: HelixCalendar["disableDates"];
  /** Days of the week that cannot be chosen, comma separated, `0` to `6`. */
  "disable-days"?: HelixCalendar["disableDays"];
  /** Days of the week that cannot be chosen, comma separated, `0` to `6`. */
  disableDays?: HelixCalendar["disableDays"];
  /** Whether the current selection fails validation. */
  invalid?: HelixCalendar["invalid"];
  /** The month on show, as `YYYY-MM`. Follows `value`, then the current month. */
  month?: HelixCalendar["month"];
  /** Earliest selectable date, as `YYYY-MM-DD`. */
  min?: HelixCalendar["min"];
  /** Latest selectable date, as `YYYY-MM-DD`. */
  max?: HelixCalendar["max"];
  /** Accessible name for the grid. */
  label?: HelixCalendar["label"];
  /** First column of the week, `0` for Sunday through `6` for Saturday. */
  "first-day-of-week"?: HelixCalendar["firstDayOfWeek"];
  /** First column of the week, `0` for Sunday through `6` for Saturday. */
  firstDayOfWeek?: HelixCalendar["firstDayOfWeek"];
  /** Whether the control is non-interactive.

Reflected, because the styled tier selects on it, and mirrored to
`aria-disabled` rather than removing the element from the accessibility
tree, so a screen reader can still announce that the control exists. */
  disabled?: HelixCalendar["disabled"];
  /** The consumer's callback, invoked after the value is applied.

Not an attribute: it is a function. `onValueChange` and not `onChange`,
because React reserves the latter for its own synthetic system and wires
it to the native `change`, so a Helix event named `Change` would never
fire at all. */
  onValueChange?: HelixCalendar["onValueChange"];

  /** Fired before the dates change, and cancelable. It was `helix-select`, and it moved when the calendar became a form control. A control whose value changes dispatches `helix-change` here: `Input`, `Select`, `Listbox`, `Radio.Group` and `Toggle.Group` all do, and a calendar submitting a date is the same kind of thing. `helix-select` stays what it is elsewhere, which is a row or an item being chosen in something that reports no value at all, such as `Menu` or `Tree`. */
  "onhelix-change"?: (e: HelixCalendarHelixChangeElementEvent) => void;
};

export type HelixCalendarSolidJsProps = {
  /** The value the markup declared, which is where a reset returns to. */
  "attr:default-value"?: HelixCalendar["defaultValue"];
  /** The value the markup declared, which is where a reset returns to. */
  "prop:defaultValue"?: HelixCalendar["defaultValue"];
  /** What the control holds now, and what its form submits.

One property, not two. Reading gives the real value whichever mode the
control is in, so `input.value` answers the question anyone asking it
meant. Writing hands ownership to the consumer, which is what
`<helix-input value="x">` says too, and matches what a controlled input
means in React: the value is theirs and the control waits to be told.
`default-value` is how markup seeds one it does not want to own.

The same shape as the other three mixins, which is the point of them
being four of a kind rather than four of three kinds. */
  "prop:value"?: HelixCalendar["value"];
  /** Name the calendar reports under when its form is submitted.

Absent means it submits nothing, which is what makes it safe to put one
inside something else. `DatePicker` will hold the name and the calendar in
its panel will stay quiet, the same way `Select` holds the name and the
`Listbox` inside it does not. */
  "prop:name"?: HelixCalendar["name"];
  /** How many dates can be held at once. */
  "prop:mode"?: HelixCalendar["mode"];
  /** How many months to show, side by side. */
  "prop:months"?: HelixCalendar["months"];
  /** Locale for month and day names. Absent uses the runtime's own. */
  "prop:locale"?: HelixCalendar["locale"];
  /** Dates that cannot be chosen, comma separated, as `YYYY-MM-DD`. */
  "attr:disable-dates"?: HelixCalendar["disableDates"];
  /** Dates that cannot be chosen, comma separated, as `YYYY-MM-DD`. */
  "prop:disableDates"?: HelixCalendar["disableDates"];
  /** Days of the week that cannot be chosen, comma separated, `0` to `6`. */
  "attr:disable-days"?: HelixCalendar["disableDays"];
  /** Days of the week that cannot be chosen, comma separated, `0` to `6`. */
  "prop:disableDays"?: HelixCalendar["disableDays"];
  /** Whether the current selection fails validation. */
  "prop:invalid"?: HelixCalendar["invalid"];
  /** The month on show, as `YYYY-MM`. Follows `value`, then the current month. */
  "prop:month"?: HelixCalendar["month"];
  /** Earliest selectable date, as `YYYY-MM-DD`. */
  "prop:min"?: HelixCalendar["min"];
  /** Latest selectable date, as `YYYY-MM-DD`. */
  "prop:max"?: HelixCalendar["max"];
  /** Accessible name for the grid. */
  "prop:label"?: HelixCalendar["label"];
  /** First column of the week, `0` for Sunday through `6` for Saturday. */
  "attr:first-day-of-week"?: HelixCalendar["firstDayOfWeek"];
  /** First column of the week, `0` for Sunday through `6` for Saturday. */
  "prop:firstDayOfWeek"?: HelixCalendar["firstDayOfWeek"];
  /** Whether the control is non-interactive.

Reflected, because the styled tier selects on it, and mirrored to
`aria-disabled` rather than removing the element from the accessibility
tree, so a screen reader can still announce that the control exists. */
  "prop:disabled"?: HelixCalendar["disabled"];
  /** The consumer's callback, invoked after the value is applied.

Not an attribute: it is a function. `onValueChange` and not `onChange`,
because React reserves the latter for its own synthetic system and wires
it to the native `change`, so a Helix event named `Change` would never
fire at all. */
  "prop:onValueChange"?: HelixCalendar["onValueChange"];
  /** Fired before the dates change, and cancelable. It was `helix-select`, and it moved when the calendar became a form control. A control whose value changes dispatches `helix-change` here: `Input`, `Select`, `Listbox`, `Radio.Group` and `Toggle.Group` all do, and a calendar submitting a date is the same kind of thing. `helix-select` stays what it is elsewhere, which is a row or an item being chosen in something that reports no value at all, such as `Menu` or `Tree`. */
  "on:helix-change"?: (e: HelixCalendarHelixChangeElementEvent) => void;

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
  /** How the card separates itself from the page.

- `outlined` is the default, and a hairline is usually enough. It costs
  less attention than a shadow: a screen of shadowed cards reads as a stack
  of things floating, none of them settled.
- `elevated` is lifted off the page instead of framed, for a card on a
  coloured or busy background, where a line has to compete with whatever is
  behind it and a shadow does not.
- `plain` has no frame at all: the card is a layout and whatever it sits in
  is the surface. For a card inside something already bounded, where a
  second box adds a line and no meaning. */
  appearance?: HelixCard["appearance"];
  /** Tightens the inset for dense layouts. */
  dense?: HelixCard["dense"];
  /** Whether media sits above the content stack or beside it. */
  orientation?: HelixCard["orientation"];
};

export type HelixCardSolidJsProps = {
  /** How the card separates itself from the page.

- `outlined` is the default, and a hairline is usually enough. It costs
  less attention than a shadow: a screen of shadowed cards reads as a stack
  of things floating, none of them settled.
- `elevated` is lifted off the page instead of framed, for a card on a
  coloured or busy background, where a line has to compete with whatever is
  behind it and a shadow does not.
- `plain` has no frame at all: the card is a layout and whatever it sits in
  is the surface. For a card inside something already bounded, where a
  second box adds a line and no meaning. */
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

/** `HelixCarousel` component event */
export type HelixCarouselElementEvent<E = Event> = TypedEvent<HelixCarousel, E>;
/** `helix-select` event type */
export type HelixCarouselHelixSelectElementEvent =
  HelixCarouselElementEvent<HelixSelectEvent>;

export type HelixCarouselProps = {
  /** Whether the controls sit under the slides or on them. */
  appearance?: HelixCarousel["appearance"];
  /** How many slides are shown across the track at once. Absent shows one.

No default, because it reflects. A reflected property with a value writes
its attribute on upgrade, and the host then carries something a consumer's
server markup never had, which React reports as a mismatch. The one-across
case is the absent attribute, and the styles read it that way. */
  "per-view"?: HelixCarousel["perView"];
  /** How many slides are shown across the track at once. Absent shows one.

No default, because it reflects. A reflected property with a value writes
its attribute on upgrade, and the host then carries something a consumer's
server markup never had, which React reports as a mismatch. The one-across
case is the absent attribute, and the styles read it that way. */
  perView?: HelixCarousel["perView"];
  /** Accessible name for the carousel. */
  label?: HelixCarousel["label"];
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
  index?: HelixCarousel["index"];
  /** Slide to start on, where nothing declared one. */
  "default-index"?: HelixCarousel["defaultIndex"];
  /** Slide to start on, where nothing declared one. */
  defaultIndex?: HelixCarousel["defaultIndex"];
  /** Whether moving past either end wraps to the other. */
  loop?: HelixCarousel["loop"];
  /** Whether the carousel advances on its own. */
  autoplay?: HelixCarousel["autoplay"];
  /** How long each slide is held, in milliseconds. */
  interval?: HelixCarousel["interval"];

  /** Fired when the slide in view changes, with its index. */
  "onhelix-select"?: (e: HelixCarouselHelixSelectElementEvent) => void;
};

export type HelixCarouselSolidJsProps = {
  /** Whether the controls sit under the slides or on them. */
  "prop:appearance"?: HelixCarousel["appearance"];
  /** How many slides are shown across the track at once. Absent shows one.

No default, because it reflects. A reflected property with a value writes
its attribute on upgrade, and the host then carries something a consumer's
server markup never had, which React reports as a mismatch. The one-across
case is the absent attribute, and the styles read it that way. */
  "attr:per-view"?: HelixCarousel["perView"];
  /** How many slides are shown across the track at once. Absent shows one.

No default, because it reflects. A reflected property with a value writes
its attribute on upgrade, and the host then carries something a consumer's
server markup never had, which React reports as a mismatch. The one-across
case is the absent attribute, and the styles read it that way. */
  "prop:perView"?: HelixCarousel["perView"];
  /** Accessible name for the carousel. */
  "prop:label"?: HelixCarousel["label"];
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
  "prop:index"?: HelixCarousel["index"];
  /** Slide to start on, where nothing declared one. */
  "attr:default-index"?: HelixCarousel["defaultIndex"];
  /** Slide to start on, where nothing declared one. */
  "prop:defaultIndex"?: HelixCarousel["defaultIndex"];
  /** Whether moving past either end wraps to the other. */
  "prop:loop"?: HelixCarousel["loop"];
  /** Whether the carousel advances on its own. */
  "prop:autoplay"?: HelixCarousel["autoplay"];
  /** How long each slide is held, in milliseconds. */
  "prop:interval"?: HelixCarousel["interval"];
  /** Fired when the slide in view changes, with its index. */
  "on:helix-select"?: (e: HelixCarouselHelixSelectElementEvent) => void;

  /** Set the innerHTML of the element */
  innerHTML?: string;
  /** Set the textContent of the element */
  textContent?: string | number;
};

/** `HelixCheckboxGroup` component event */
export type HelixCheckboxGroupElementEvent<E = Event> = TypedEvent<
  HelixCheckboxGroup,
  E
>;
/** `helix-change` event type */
export type HelixCheckboxGroupHelixChangeElementEvent =
  HelixCheckboxGroupElementEvent<HelixChangeEvent>;

export type HelixCheckboxGroupProps = {
  /** Which way the boxes run. */
  orientation?: HelixCheckboxGroup["orientation"];
  /** Help under the control, shown while there is nothing wrong. */
  hint?: HelixCheckboxGroup["hint"];
  /** What is wrong, in the reader's words rather than the browser's. */
  feedback?: HelixCheckboxGroup["feedback"];
  /** The accessible name, and the fallback for the `label` slot. */
  label?: HelixCheckboxGroup["label"];
  /** Whether the form refuses to submit without it. */
  required?: HelixCheckboxGroup["required"];
  /** Whether the whole set is out of play.

Its own property rather than an inherited one, because this group is not
form-associated and `disabled` arrives with `HelixFormElement`. The boxes
are each form-associated and have their own, which is exactly why the two
have to be reconciled rather than simply written over. */
  disabled?: HelixCheckboxGroup["disabled"];
  /** Name submitted with the form, given to every box that has none. */
  name?: HelixCheckboxGroup["name"];
  /** The checked values, comma separated. */
  value?: HelixCheckboxGroup["value"];

  /** Fired when any box changes, with the whole set. */
  "onhelix-change"?: (e: HelixCheckboxGroupHelixChangeElementEvent) => void;
};

export type HelixCheckboxGroupSolidJsProps = {
  /** Which way the boxes run. */
  "prop:orientation"?: HelixCheckboxGroup["orientation"];
  /** Help under the control, shown while there is nothing wrong. */
  "prop:hint"?: HelixCheckboxGroup["hint"];
  /** What is wrong, in the reader's words rather than the browser's. */
  "prop:feedback"?: HelixCheckboxGroup["feedback"];
  /** The accessible name, and the fallback for the `label` slot. */
  "prop:label"?: HelixCheckboxGroup["label"];
  /** Whether the form refuses to submit without it. */
  "prop:required"?: HelixCheckboxGroup["required"];
  /** Whether the whole set is out of play.

Its own property rather than an inherited one, because this group is not
form-associated and `disabled` arrives with `HelixFormElement`. The boxes
are each form-associated and have their own, which is exactly why the two
have to be reconciled rather than simply written over. */
  "prop:disabled"?: HelixCheckboxGroup["disabled"];
  /** Name submitted with the form, given to every box that has none. */
  "prop:name"?: HelixCheckboxGroup["name"];
  /** The checked values, comma separated. */
  "prop:value"?: HelixCheckboxGroup["value"];
  /** Fired when any box changes, with the whole set. */
  "on:helix-change"?: (e: HelixCheckboxGroupHelixChangeElementEvent) => void;

  /** Set the innerHTML of the element */
  innerHTML?: string;
  /** Set the textContent of the element */
  textContent?: string | number;
};

/** `HelixCheckbox` component event */
export type HelixCheckboxElementEvent<E = Event> = TypedEvent<HelixCheckbox, E>;
/** `helix-change` event type */
export type HelixCheckboxHelixChangeElementEvent =
  HelixCheckboxElementEvent<HelixChangeEvent>;

export type HelixCheckboxProps = {
  /** Whether the control is checked.

One property rather than two. Reading gives the real state whichever
mode the control is in; writing hands ownership to the consumer, which
is what the attribute in `<helix-checkbox checked>` does as well. The
same shape all four of these mixins have, for the reason given on
`MixinControllerOpen.open`.

Not reflected: the attribute is the consumer's input and stays as they
wrote it, and `data-checked` carries the resolved state for stylesheets. */
  checked?: HelixCheckbox["checked"];
  /** Initial checked state for uncontrolled use, where nothing declared one. */
  "default-checked"?: HelixCheckbox["defaultChecked"];
  /** Initial checked state for uncontrolled use, where nothing declared one. */
  defaultChecked?: HelixCheckbox["defaultChecked"];
  /** Help under the control, shown while there is nothing wrong. */
  hint?: HelixCheckbox["hint"];
  /** What is wrong, in the reader's words rather than the browser's. */
  feedback?: HelixCheckbox["feedback"];
  /** The accessible name, and the fallback for the `label` slot. */
  label?: HelixCheckbox["label"];
  /** Whether the form refuses to submit without it. */
  required?: HelixCheckbox["required"];
  /** Name submitted with the form. */
  name?: HelixCheckbox["name"];
  /** Value submitted when the box is checked. */
  value?: HelixCheckbox["value"];
  /** Whether the box shows as neither checked nor unchecked.

Presentation only. It never submits, and the first change resolves it. */
  indeterminate?: HelixCheckbox["indeterminate"];
  /** Whether the control is non-interactive.

Reflected, because the styled tier selects on it, and mirrored to
`aria-disabled` rather than removing the element from the accessibility
tree, so a screen reader can still announce that the control exists. */
  disabled?: HelixCheckbox["disabled"];
  /** The consumer's callback, invoked after the state is applied.

Not an attribute: it is a function. And not reachable from React's JSX,
which reserves every `on[A-Z]` prop for its own event system and drops
what it does not recognise; the generated wrapper listens for the event
instead. */
  onCheckedChange?: HelixCheckbox["onCheckedChange"];

  /** Fired before the state changes, and cancelable. */
  "onhelix-change"?: (e: HelixCheckboxHelixChangeElementEvent) => void;
  /** Relayed from the input once the state has changed. */
  onchange?: (e: HelixCheckboxElementEvent) => void;
};

export type HelixCheckboxSolidJsProps = {
  /** Whether the control is checked.

One property rather than two. Reading gives the real state whichever
mode the control is in; writing hands ownership to the consumer, which
is what the attribute in `<helix-checkbox checked>` does as well. The
same shape all four of these mixins have, for the reason given on
`MixinControllerOpen.open`.

Not reflected: the attribute is the consumer's input and stays as they
wrote it, and `data-checked` carries the resolved state for stylesheets. */
  "prop:checked"?: HelixCheckbox["checked"];
  /** Initial checked state for uncontrolled use, where nothing declared one. */
  "bool:default-checked"?: HelixCheckbox["defaultChecked"];
  /** Initial checked state for uncontrolled use, where nothing declared one. */
  "prop:defaultChecked"?: HelixCheckbox["defaultChecked"];
  /** Help under the control, shown while there is nothing wrong. */
  "prop:hint"?: HelixCheckbox["hint"];
  /** What is wrong, in the reader's words rather than the browser's. */
  "prop:feedback"?: HelixCheckbox["feedback"];
  /** The accessible name, and the fallback for the `label` slot. */
  "prop:label"?: HelixCheckbox["label"];
  /** Whether the form refuses to submit without it. */
  "prop:required"?: HelixCheckbox["required"];
  /** Name submitted with the form. */
  "prop:name"?: HelixCheckbox["name"];
  /** Value submitted when the box is checked. */
  "prop:value"?: HelixCheckbox["value"];
  /** Whether the box shows as neither checked nor unchecked.

Presentation only. It never submits, and the first change resolves it. */
  "prop:indeterminate"?: HelixCheckbox["indeterminate"];
  /** Whether the control is non-interactive.

Reflected, because the styled tier selects on it, and mirrored to
`aria-disabled` rather than removing the element from the accessibility
tree, so a screen reader can still announce that the control exists. */
  "prop:disabled"?: HelixCheckbox["disabled"];
  /** The consumer's callback, invoked after the state is applied.

Not an attribute: it is a function. And not reachable from React's JSX,
which reserves every `on[A-Z]` prop for its own event system and drops
what it does not recognise; the generated wrapper listens for the event
instead. */
  "prop:onCheckedChange"?: HelixCheckbox["onCheckedChange"];
  /** Fired before the state changes, and cancelable. */
  "on:helix-change"?: (e: HelixCheckboxHelixChangeElementEvent) => void;
  /** Relayed from the input once the state has changed. */
  "on:change"?: (e: HelixCheckboxElementEvent) => void;

  /** Set the innerHTML of the element */
  innerHTML?: string;
  /** Set the textContent of the element */
  textContent?: string | number;
};

/** `HelixDialog` component event */
export type HelixDialogElementEvent<E = Event> = TypedEvent<HelixDialog, E>;
/** `helix-open` event type */
export type HelixDialogHelixOpenElementEvent =
  HelixDialogElementEvent<HelixOpenEvent>;
/** `helix-close` event type */
export type HelixDialogHelixCloseElementEvent =
  HelixDialogElementEvent<HelixCloseEvent>;

export type HelixDialogProps = {
  /** How wide the panel is allowed to be. */
  appearance?: HelixDialog["appearance"];
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
  open?: HelixDialog["open"];
  /** Initial open state for uncontrolled use, where nothing declared one. */
  "default-open"?: HelixDialog["defaultOpen"];
  /** Initial open state for uncontrolled use, where nothing declared one. */
  defaultOpen?: HelixDialog["defaultOpen"];
  /** Accessible name for the dialog. */
  label?: HelixDialog["label"];
  /** Whether Escape and the backdrop can close it.

Off for a dialog that must be answered. It does not disable the close
control a consumer slots in: refusing to be dismissed is not the same as
refusing to be closed, and a dialog with no way out at all is a trap. */
  persistent?: HelixDialog["persistent"];
  /** The consumer's callback, invoked after the state is applied.

Not an attribute: it is a function. And not reachable from React's JSX,
which reserves every `on[A-Z]` prop for its own event system and drops
what it does not recognise; the generated wrapper listens for the events
instead. */
  onOpenChange?: HelixDialog["onOpenChange"];

  /** Fired before it opens, and cancelable. */
  "onhelix-open"?: (e: HelixDialogHelixOpenElementEvent) => void;
  /** Fired before it closes, and cancelable. */
  "onhelix-close"?: (e: HelixDialogHelixCloseElementEvent) => void;
};

export type HelixDialogSolidJsProps = {
  /** How wide the panel is allowed to be. */
  "prop:appearance"?: HelixDialog["appearance"];
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
  "prop:open"?: HelixDialog["open"];
  /** Initial open state for uncontrolled use, where nothing declared one. */
  "bool:default-open"?: HelixDialog["defaultOpen"];
  /** Initial open state for uncontrolled use, where nothing declared one. */
  "prop:defaultOpen"?: HelixDialog["defaultOpen"];
  /** Accessible name for the dialog. */
  "prop:label"?: HelixDialog["label"];
  /** Whether Escape and the backdrop can close it.

Off for a dialog that must be answered. It does not disable the close
control a consumer slots in: refusing to be dismissed is not the same as
refusing to be closed, and a dialog with no way out at all is a trap. */
  "prop:persistent"?: HelixDialog["persistent"];
  /** The consumer's callback, invoked after the state is applied.

Not an attribute: it is a function. And not reachable from React's JSX,
which reserves every `on[A-Z]` prop for its own event system and drops
what it does not recognise; the generated wrapper listens for the events
instead. */
  "prop:onOpenChange"?: HelixDialog["onOpenChange"];
  /** Fired before it opens, and cancelable. */
  "on:helix-open"?: (e: HelixDialogHelixOpenElementEvent) => void;
  /** Fired before it closes, and cancelable. */
  "on:helix-close"?: (e: HelixDialogHelixCloseElementEvent) => void;

  /** Set the innerHTML of the element */
  innerHTML?: string;
  /** Set the textContent of the element */
  textContent?: string | number;
};

export type HelixDividerProps = {
  /** Which way the rule runs. */
  orientation?: HelixDivider["orientation"];
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
  announced?: HelixDivider["announced"];
};

export type HelixDividerSolidJsProps = {
  /** Which way the rule runs. */
  "prop:orientation"?: HelixDivider["orientation"];
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
  "prop:announced"?: HelixDivider["announced"];

  /** Set the innerHTML of the element */
  innerHTML?: string;
  /** Set the textContent of the element */
  textContent?: string | number;
};

/** `HelixDrawer` component event */
export type HelixDrawerElementEvent<E = Event> = TypedEvent<HelixDrawer, E>;
/** `helix-open` event type */
export type HelixDrawerHelixOpenElementEvent =
  HelixDrawerElementEvent<HelixOpenEvent>;

export type HelixDrawerProps = {
  /** Removes the panel's own surface, for a drawer inside another surface. */
  appearance?: HelixDrawer["appearance"];
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
  open?: HelixDrawer["open"];
  /** Initial open state for uncontrolled use, where nothing declared one. */
  "default-open"?: HelixDrawer["defaultOpen"];
  /** Initial open state for uncontrolled use, where nothing declared one. */
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
  /** The consumer's callback, invoked after the state is applied.

Not an attribute: it is a function. And not reachable from React's JSX,
which reserves every `on[A-Z]` prop for its own event system and drops
what it does not recognise; the generated wrapper listens for the events
instead. */
  onOpenChange?: HelixDrawer["onOpenChange"];

  /** Fired when the drawer opens or closes. */
  "onhelix-open"?: (e: HelixDrawerHelixOpenElementEvent) => void;
};

export type HelixDrawerSolidJsProps = {
  /** Removes the panel's own surface, for a drawer inside another surface. */
  "prop:appearance"?: HelixDrawer["appearance"];
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
  "prop:open"?: HelixDrawer["open"];
  /** Initial open state for uncontrolled use, where nothing declared one. */
  "bool:default-open"?: HelixDrawer["defaultOpen"];
  /** Initial open state for uncontrolled use, where nothing declared one. */
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
  /** The consumer's callback, invoked after the state is applied.

Not an attribute: it is a function. And not reachable from React's JSX,
which reserves every `on[A-Z]` prop for its own event system and drops
what it does not recognise; the generated wrapper listens for the events
instead. */
  "prop:onOpenChange"?: HelixDrawer["onOpenChange"];
  /** Fired when the drawer opens or closes. */
  "on:helix-open"?: (e: HelixDrawerHelixOpenElementEvent) => void;

  /** Set the innerHTML of the element */
  innerHTML?: string;
  /** Set the textContent of the element */
  textContent?: string | number;
};

/** `HelixDrilldownItem` component event */
export type HelixDrilldownItemElementEvent<E = Event> = TypedEvent<
  HelixDrilldownItem,
  E
>;
/** `helix-select` event type */
export type HelixDrilldownItemHelixSelectElementEvent =
  HelixDrilldownItemElementEvent<HelixSelectEvent>;

export type HelixDrilldownItemProps = {
  /** Whether the row can be reached at all. */
  disabled?: HelixDrilldownItem["disabled"];
  /** Identifies the row to whatever is listening. */
  value?: HelixDrilldownItem["value"];
  /** Whether the page showing is the one this row is on. Written by the stack. */
  onPage?: HelixDrilldownItem["onPage"];
  /** Whether this row's own page is the one showing. Written by the stack. */
  showingPage?: HelixDrilldownItem["showingPage"];

  /** Fired when the row is chosen. */
  "onhelix-select"?: (e: HelixDrilldownItemHelixSelectElementEvent) => void;
};

export type HelixDrilldownItemSolidJsProps = {
  /** Whether the row can be reached at all. */
  "prop:disabled"?: HelixDrilldownItem["disabled"];
  /** Identifies the row to whatever is listening. */
  "prop:value"?: HelixDrilldownItem["value"];
  /** Whether the page showing is the one this row is on. Written by the stack. */
  "prop:onPage"?: HelixDrilldownItem["onPage"];
  /** Whether this row's own page is the one showing. Written by the stack. */
  "prop:showingPage"?: HelixDrilldownItem["showingPage"];
  /** Fired when the row is chosen. */
  "on:helix-select"?: (e: HelixDrilldownItemHelixSelectElementEvent) => void;

  /** Set the innerHTML of the element */
  innerHTML?: string;
  /** Set the textContent of the element */
  textContent?: string | number;
};

/** `HelixDrilldown` component event */
export type HelixDrilldownElementEvent<E = Event> = TypedEvent<
  HelixDrilldown,
  E
>;
/** `helix-select` event type */
export type HelixDrilldownHelixSelectElementEvent =
  HelixDrilldownElementEvent<HelixSelectEvent>;

export type HelixDrilldownProps = {
  /** Accessible name for the region. */
  label?: HelixDrilldown["label"];
  /** What the control returning from a page reads. */
  "back-label"?: HelixDrilldown["backLabel"];
  /** What the control returning from a page reads. */
  backLabel?: HelixDrilldown["backLabel"];

  /** Fired when a row with no page is chosen. */
  "onhelix-select"?: (e: HelixDrilldownHelixSelectElementEvent) => void;
};

export type HelixDrilldownSolidJsProps = {
  /** Accessible name for the region. */
  "prop:label"?: HelixDrilldown["label"];
  /** What the control returning from a page reads. */
  "attr:back-label"?: HelixDrilldown["backLabel"];
  /** What the control returning from a page reads. */
  "prop:backLabel"?: HelixDrilldown["backLabel"];
  /** Fired when a row with no page is chosen. */
  "on:helix-select"?: (e: HelixDrilldownHelixSelectElementEvent) => void;

  /** Set the innerHTML of the element */
  innerHTML?: string;
  /** Set the textContent of the element */
  textContent?: string | number;
};

export type HelixEmptyProps = {
  /** Whether the state sits on a surface of its own. */
  appearance?: HelixEmpty["appearance"];
  /** Whether the state is announced when it appears.

On by default: an empty view almost always replaces something that was
loading. Turn it off for one that was on the page from the start, which
has nothing to announce because nothing changed. */
  "no-announce"?: HelixEmpty["noAnnounce"];
  /** Whether the state is announced when it appears.

On by default: an empty view almost always replaces something that was
loading. Turn it off for one that was on the page from the start, which
has nothing to announce because nothing changed. */
  noAnnounce?: HelixEmpty["noAnnounce"];
};

export type HelixEmptySolidJsProps = {
  /** Whether the state sits on a surface of its own. */
  "prop:appearance"?: HelixEmpty["appearance"];
  /** Whether the state is announced when it appears.

On by default: an empty view almost always replaces something that was
loading. Turn it off for one that was on the page from the start, which
has nothing to announce because nothing changed. */
  "bool:no-announce"?: HelixEmpty["noAnnounce"];
  /** Whether the state is announced when it appears.

On by default: an empty view almost always replaces something that was
loading. Turn it off for one that was on the page from the start, which
has nothing to announce because nothing changed. */
  "prop:noAnnounce"?: HelixEmpty["noAnnounce"];

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

export type HelixIconButtonProps = {
  /** How much visual weight the button carries. */
  appearance?: HelixIconButton["appearance"];
  /** What activating the button does to its form. */
  type?: HelixIconButton["type"];
  /** Accessible name, for a button whose content is not text.

Lives here rather than only on `IconButton` so the two share one render.
An icon-only button without it is a control a screen reader announces as
"button" and nothing else. */
  label?: HelixIconButton["label"];
  /** What to send when the button is activated, and what to send it to.

The platform's invoker attributes, forwarded onto the inner `<button>`
rather than left on the host: only a real button is recognised as an
invoker, so `commandfor` written on a custom element resolves nothing and
the trigger silently does nothing at all. A wrapper has to hand them down,
the same way `label` becomes `aria-label` in there.

```html
<helix-button commandfor="confirm" command="--show">Delete…</helix-button>
```

`commandFor` spells its attribute out, because Lit lowercases a property
name to derive one rather than dash-casing it, and what a consumer writes
is the platform's `commandfor`. */
  command?: HelixIconButton["command"];
  /** The id of the element the command is sent to. */
  commandfor?: HelixIconButton["commandFor"];
  /** The id of the element the command is sent to. */
  commandFor?: HelixIconButton["commandFor"];
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
  /** What activating the button does to its form. */
  "prop:type"?: HelixIconButton["type"];
  /** Accessible name, for a button whose content is not text.

Lives here rather than only on `IconButton` so the two share one render.
An icon-only button without it is a control a screen reader announces as
"button" and nothing else. */
  "prop:label"?: HelixIconButton["label"];
  /** What to send when the button is activated, and what to send it to.

The platform's invoker attributes, forwarded onto the inner `<button>`
rather than left on the host: only a real button is recognised as an
invoker, so `commandfor` written on a custom element resolves nothing and
the trigger silently does nothing at all. A wrapper has to hand them down,
the same way `label` becomes `aria-label` in there.

```html
<helix-button commandfor="confirm" command="--show">Delete…</helix-button>
```

`commandFor` spells its attribute out, because Lit lowercases a property
name to derive one rather than dash-casing it, and what a consumer writes
is the platform's `commandfor`. */
  "prop:command"?: HelixIconButton["command"];
  /** The id of the element the command is sent to. */
  "attr:commandfor"?: HelixIconButton["commandFor"];
  /** The id of the element the command is sent to. */
  "prop:commandFor"?: HelixIconButton["commandFor"];
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

/** `HelixInput` component event */
export type HelixInputElementEvent<E = Event> = TypedEvent<HelixInput, E>;
/** `helix-change` event type */
export type HelixInputHelixChangeElementEvent =
  HelixInputElementEvent<HelixChangeEvent>;

export type HelixInputProps = {
  /** The value the markup declared, which is where a reset returns to. */
  "default-value"?: HelixInput["defaultValue"];
  /** The value the markup declared, which is where a reset returns to. */
  defaultValue?: HelixInput["defaultValue"];
  /** What the control holds now, and what its form submits.

One property, not two. Reading gives the real value whichever mode the
control is in, so `input.value` answers the question anyone asking it
meant. Writing hands ownership to the consumer, which is what
`<helix-input value="x">` says too, and matches what a controlled input
means in React: the value is theirs and the control waits to be told.
`default-value` is how markup seeds one it does not want to own.

The same shape as the other three mixins, which is the point of them
being four of a kind rather than four of three kinds. */
  value?: HelixInput["value"];
  /** Help under the control, shown while there is nothing wrong. */
  hint?: HelixInput["hint"];
  /** What is wrong, in the reader's words rather than the browser's. */
  feedback?: HelixInput["feedback"];
  /** The accessible name, and the fallback for the `label` slot. */
  label?: HelixInput["label"];
  /** Whether the form refuses to submit without it. */
  required?: HelixInput["required"];
  /** Name submitted with the form. */
  name?: HelixInput["name"];
  /** Shown while the field is empty. Not a label: it goes when typing starts. */
  placeholder?: HelixInput["placeholder"];
  /** Whether the field refuses input while still submitting its value. */
  "read-only"?: HelixInput["readOnly"];
  /** Whether the field refuses input while still submitting its value. */
  readOnly?: HelixInput["readOnly"];
  /** What the field accepts, which decides the keyboard and the validation. */
  type?: HelixInput["type"];
  /** Whether the control is non-interactive.

Reflected, because the styled tier selects on it, and mirrored to
`aria-disabled` rather than removing the element from the accessibility
tree, so a screen reader can still announce that the control exists. */
  disabled?: HelixInput["disabled"];
  /** The consumer's callback, invoked after the value is applied.

Not an attribute: it is a function. `onValueChange` and not `onChange`,
because React reserves the latter for its own synthetic system and wires
it to the native `change`, so a Helix event named `Change` would never
fire at all. */
  onValueChange?: HelixInput["onValueChange"];

  /** Fired as the text changes, and cancelable. */
  "onhelix-change"?: (e: HelixInputHelixChangeElementEvent) => void;
  /** Relayed from the input once the reader has finished. */
  onchange?: (e: HelixInputElementEvent) => void;
};

export type HelixInputSolidJsProps = {
  /** The value the markup declared, which is where a reset returns to. */
  "attr:default-value"?: HelixInput["defaultValue"];
  /** The value the markup declared, which is where a reset returns to. */
  "prop:defaultValue"?: HelixInput["defaultValue"];
  /** What the control holds now, and what its form submits.

One property, not two. Reading gives the real value whichever mode the
control is in, so `input.value` answers the question anyone asking it
meant. Writing hands ownership to the consumer, which is what
`<helix-input value="x">` says too, and matches what a controlled input
means in React: the value is theirs and the control waits to be told.
`default-value` is how markup seeds one it does not want to own.

The same shape as the other three mixins, which is the point of them
being four of a kind rather than four of three kinds. */
  "prop:value"?: HelixInput["value"];
  /** Help under the control, shown while there is nothing wrong. */
  "prop:hint"?: HelixInput["hint"];
  /** What is wrong, in the reader's words rather than the browser's. */
  "prop:feedback"?: HelixInput["feedback"];
  /** The accessible name, and the fallback for the `label` slot. */
  "prop:label"?: HelixInput["label"];
  /** Whether the form refuses to submit without it. */
  "prop:required"?: HelixInput["required"];
  /** Name submitted with the form. */
  "prop:name"?: HelixInput["name"];
  /** Shown while the field is empty. Not a label: it goes when typing starts. */
  "prop:placeholder"?: HelixInput["placeholder"];
  /** Whether the field refuses input while still submitting its value. */
  "bool:read-only"?: HelixInput["readOnly"];
  /** Whether the field refuses input while still submitting its value. */
  "prop:readOnly"?: HelixInput["readOnly"];
  /** What the field accepts, which decides the keyboard and the validation. */
  "prop:type"?: HelixInput["type"];
  /** Whether the control is non-interactive.

Reflected, because the styled tier selects on it, and mirrored to
`aria-disabled` rather than removing the element from the accessibility
tree, so a screen reader can still announce that the control exists. */
  "prop:disabled"?: HelixInput["disabled"];
  /** The consumer's callback, invoked after the value is applied.

Not an attribute: it is a function. `onValueChange` and not `onChange`,
because React reserves the latter for its own synthetic system and wires
it to the native `change`, so a Helix event named `Change` would never
fire at all. */
  "prop:onValueChange"?: HelixInput["onValueChange"];
  /** Fired as the text changes, and cancelable. */
  "on:helix-change"?: (e: HelixInputHelixChangeElementEvent) => void;
  /** Relayed from the input once the reader has finished. */
  "on:change"?: (e: HelixInputElementEvent) => void;

  /** Set the innerHTML of the element */
  innerHTML?: string;
  /** Set the textContent of the element */
  textContent?: string | number;
};

export type HelixKbdProps = {};

export type HelixKbdSolidJsProps = {
  /** Set the innerHTML of the element */
  innerHTML?: string;
  /** Set the textContent of the element */
  textContent?: string | number;
};

export type HelixListItemProps = {};

export type HelixListItemSolidJsProps = {
  /** Set the innerHTML of the element */
  innerHTML?: string;
  /** Set the textContent of the element */
  textContent?: string | number;
};

export type HelixListProps = {
  /** Whether a rule sits between rows. */
  divided?: HelixList["divided"];
  /** Accessible name for the set. */
  label?: HelixList["label"];
};

export type HelixListSolidJsProps = {
  /** Whether a rule sits between rows. */
  "prop:divided"?: HelixList["divided"];
  /** Accessible name for the set. */
  "prop:label"?: HelixList["label"];

  /** Set the innerHTML of the element */
  innerHTML?: string;
  /** Set the textContent of the element */
  textContent?: string | number;
};

/** `HelixListbox` component event */
export type HelixListboxElementEvent<E = Event> = TypedEvent<HelixListbox, E>;
/** `helix-change` event type */
export type HelixListboxHelixChangeElementEvent =
  HelixListboxElementEvent<HelixChangeEvent>;

export type HelixListboxProps = {
  /** The value the markup declared, which is where a reset returns to. */
  "default-value"?: HelixListbox["defaultValue"];
  /** The value the markup declared, which is where a reset returns to. */
  defaultValue?: HelixListbox["defaultValue"];
  /** What the control holds now, and what its form submits.

One property, not two. Reading gives the real value whichever mode the
control is in, so `input.value` answers the question anyone asking it
meant. Writing hands ownership to the consumer, which is what
`<helix-input value="x">` says too, and matches what a controlled input
means in React: the value is theirs and the control waits to be told.
`default-value` is how markup seeds one it does not want to own.

The same shape as the other three mixins, which is the point of them
being four of a kind rather than four of three kinds. */
  value?: HelixListbox["value"];
  /** Help under the control, shown while there is nothing wrong. */
  hint?: HelixListbox["hint"];
  /** What is wrong, in the reader's words rather than the browser's. */
  feedback?: HelixListbox["feedback"];
  /** The accessible name, and the fallback for the `label` slot. */
  label?: HelixListbox["label"];
  /** Whether the form refuses to submit without it. */
  required?: HelixListbox["required"];
  /** Text the options are matched against. Empty shows them all. */
  filter?: HelixListbox["filter"];
  /** Whether the list renders a field for narrowing itself.

The field lives here rather than in whatever frames the list, because the
filtering already does: `filter`, the empty state and the keyboard are all
this component's. A select that drew its own search box above a listbox
would be writing the same field again, and so would a combobox, and so
would a command palette, which is the fault the three-family split exists
to prevent. */
  filterable?: HelixListbox["filterable"];
  /** Placeholder for the field that narrows the list. */
  "filter-label"?: HelixListbox["filterLabel"];
  /** Placeholder for the field that narrows the list. */
  filterLabel?: HelixListbox["filterLabel"];
  /** Whether more than one option can be the answer. */
  multiple?: HelixListbox["multiple"];
  /** Name the list reports under when its form is submitted. */
  name?: HelixListbox["name"];
  /** What is shown when a filter has hidden every option. */
  "empty-text"?: HelixListbox["emptyText"];
  /** What is shown when a filter has hidden every option. */
  emptyText?: HelixListbox["emptyText"];
  /** Whether the control is non-interactive.

Reflected, because the styled tier selects on it, and mirrored to
`aria-disabled` rather than removing the element from the accessibility
tree, so a screen reader can still announce that the control exists. */
  disabled?: HelixListbox["disabled"];
  /** The consumer's callback, invoked after the value is applied.

Not an attribute: it is a function. `onValueChange` and not `onChange`,
because React reserves the latter for its own synthetic system and wires
it to the native `change`, so a Helix event named `Change` would never
fire at all. */
  onValueChange?: HelixListbox["onValueChange"];

  /** Fired when the answer changes, and cancelable. */
  "onhelix-change"?: (e: HelixListboxHelixChangeElementEvent) => void;
};

export type HelixListboxSolidJsProps = {
  /** The value the markup declared, which is where a reset returns to. */
  "attr:default-value"?: HelixListbox["defaultValue"];
  /** The value the markup declared, which is where a reset returns to. */
  "prop:defaultValue"?: HelixListbox["defaultValue"];
  /** What the control holds now, and what its form submits.

One property, not two. Reading gives the real value whichever mode the
control is in, so `input.value` answers the question anyone asking it
meant. Writing hands ownership to the consumer, which is what
`<helix-input value="x">` says too, and matches what a controlled input
means in React: the value is theirs and the control waits to be told.
`default-value` is how markup seeds one it does not want to own.

The same shape as the other three mixins, which is the point of them
being four of a kind rather than four of three kinds. */
  "prop:value"?: HelixListbox["value"];
  /** Help under the control, shown while there is nothing wrong. */
  "prop:hint"?: HelixListbox["hint"];
  /** What is wrong, in the reader's words rather than the browser's. */
  "prop:feedback"?: HelixListbox["feedback"];
  /** The accessible name, and the fallback for the `label` slot. */
  "prop:label"?: HelixListbox["label"];
  /** Whether the form refuses to submit without it. */
  "prop:required"?: HelixListbox["required"];
  /** Text the options are matched against. Empty shows them all. */
  "prop:filter"?: HelixListbox["filter"];
  /** Whether the list renders a field for narrowing itself.

The field lives here rather than in whatever frames the list, because the
filtering already does: `filter`, the empty state and the keyboard are all
this component's. A select that drew its own search box above a listbox
would be writing the same field again, and so would a combobox, and so
would a command palette, which is the fault the three-family split exists
to prevent. */
  "prop:filterable"?: HelixListbox["filterable"];
  /** Placeholder for the field that narrows the list. */
  "attr:filter-label"?: HelixListbox["filterLabel"];
  /** Placeholder for the field that narrows the list. */
  "prop:filterLabel"?: HelixListbox["filterLabel"];
  /** Whether more than one option can be the answer. */
  "prop:multiple"?: HelixListbox["multiple"];
  /** Name the list reports under when its form is submitted. */
  "prop:name"?: HelixListbox["name"];
  /** What is shown when a filter has hidden every option. */
  "attr:empty-text"?: HelixListbox["emptyText"];
  /** What is shown when a filter has hidden every option. */
  "prop:emptyText"?: HelixListbox["emptyText"];
  /** Whether the control is non-interactive.

Reflected, because the styled tier selects on it, and mirrored to
`aria-disabled` rather than removing the element from the accessibility
tree, so a screen reader can still announce that the control exists. */
  "prop:disabled"?: HelixListbox["disabled"];
  /** The consumer's callback, invoked after the value is applied.

Not an attribute: it is a function. `onValueChange` and not `onChange`,
because React reserves the latter for its own synthetic system and wires
it to the native `change`, so a Helix event named `Change` would never
fire at all. */
  "prop:onValueChange"?: HelixListbox["onValueChange"];
  /** Fired when the answer changes, and cancelable. */
  "on:helix-change"?: (e: HelixListboxHelixChangeElementEvent) => void;

  /** Set the innerHTML of the element */
  innerHTML?: string;
  /** Set the textContent of the element */
  textContent?: string | number;
};

/** `HelixMenuItem` component event */
export type HelixMenuItemElementEvent<E = Event> = TypedEvent<HelixMenuItem, E>;
/** `helix-select` event type */
export type HelixMenuItemHelixSelectElementEvent =
  HelixMenuItemElementEvent<HelixSelectEvent>;

export type HelixMenuItemProps = {
  /** What this row stands for, carried in the event when it is chosen. */
  value?: HelixMenuItem["value"];
  /** Whether the row is one of a set of choices.

Separate from `checked`, and it has to be. A row that is off is still a
choice, and `checked` alone cannot say so: an unticked row and a row that
was never tickable look identical from here. Announcing only the ticked one
as a checkbox tells a reader its siblings are commands, which is the one
thing they are not.

`checked` implies it, so a row that is on never has to say both. */
  checkable?: HelixMenuItem["checkable"];
  /** Whether the row is ticked. */
  checked?: HelixMenuItem["checked"];
  /** Whether the row can be chosen. */
  disabled?: HelixMenuItem["disabled"];
  /** Whether this row is on the page currently showing.

Set by the menu, and a property rather than an attribute for that reason.
Public because the menu has to reach it, and not something a consumer
writes: which page is open is the menu's business. */
  onPage?: HelixMenuItem["onPage"];
  /** Whether this row's submenu is the page showing.

Separate from `onPage`, and it has to be. A row that opened a page is not
itself on that page, so both are false for it, and rendering nothing on
that basis takes its `slot[name="submenu"]` with it: the rows inside have
nowhere to be assigned and are never laid out. The element that holds the
page has to keep the slot even when it shows no row of its own. */
  showingSubmenu?: HelixMenuItem["showingSubmenu"];

  /** Fired when the row is chosen. */
  "onhelix-select"?: (e: HelixMenuItemHelixSelectElementEvent) => void;
};

export type HelixMenuItemSolidJsProps = {
  /** What this row stands for, carried in the event when it is chosen. */
  "prop:value"?: HelixMenuItem["value"];
  /** Whether the row is one of a set of choices.

Separate from `checked`, and it has to be. A row that is off is still a
choice, and `checked` alone cannot say so: an unticked row and a row that
was never tickable look identical from here. Announcing only the ticked one
as a checkbox tells a reader its siblings are commands, which is the one
thing they are not.

`checked` implies it, so a row that is on never has to say both. */
  "prop:checkable"?: HelixMenuItem["checkable"];
  /** Whether the row is ticked. */
  "prop:checked"?: HelixMenuItem["checked"];
  /** Whether the row can be chosen. */
  "prop:disabled"?: HelixMenuItem["disabled"];
  /** Whether this row is on the page currently showing.

Set by the menu, and a property rather than an attribute for that reason.
Public because the menu has to reach it, and not something a consumer
writes: which page is open is the menu's business. */
  "prop:onPage"?: HelixMenuItem["onPage"];
  /** Whether this row's submenu is the page showing.

Separate from `onPage`, and it has to be. A row that opened a page is not
itself on that page, so both are false for it, and rendering nothing on
that basis takes its `slot[name="submenu"]` with it: the rows inside have
nowhere to be assigned and are never laid out. The element that holds the
page has to keep the slot even when it shows no row of its own. */
  "prop:showingSubmenu"?: HelixMenuItem["showingSubmenu"];
  /** Fired when the row is chosen. */
  "on:helix-select"?: (e: HelixMenuItemHelixSelectElementEvent) => void;

  /** Set the innerHTML of the element */
  innerHTML?: string;
  /** Set the textContent of the element */
  textContent?: string | number;
};

/** `HelixMenu` component event */
export type HelixMenuElementEvent<E = Event> = TypedEvent<HelixMenu, E>;
/** `helix-open` event type */
export type HelixMenuHelixOpenElementEvent =
  HelixMenuElementEvent<HelixOpenEvent>;
/** `helix-close` event type */
export type HelixMenuHelixCloseElementEvent =
  HelixMenuElementEvent<HelixCloseEvent>;
/** `helix-select` event type */
export type HelixMenuHelixSelectElementEvent =
  HelixMenuElementEvent<HelixSelectEvent>;

export type HelixMenuProps = {
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
  open?: HelixMenu["open"];
  /** Initial open state for uncontrolled use, where nothing declared one. */
  "default-open"?: HelixMenu["defaultOpen"];
  /** Initial open state for uncontrolled use, where nothing declared one. */
  defaultOpen?: HelixMenu["defaultOpen"];
  /** Preferred side. It moves if that side does not fit. */
  placement?: HelixMenu["placement"];
  /** Space between the trigger and the surface, in pixels. */
  offset?: HelixMenu["offset"];
  /** Accessible name for the surface. */
  label?: HelixMenu["label"];
  /** What the row returning from a submenu reads. */
  "back-label"?: HelixMenu["backLabel"];
  /** What the row returning from a submenu reads. */
  backLabel?: HelixMenu["backLabel"];
  /** The consumer's callback, invoked after the state is applied.

Not an attribute: it is a function. And not reachable from React's JSX,
which reserves every `on[A-Z]` prop for its own event system and drops
what it does not recognise; the generated wrapper listens for the events
instead. */
  onOpenChange?: HelixMenu["onOpenChange"];

  /** Fired before it opens, and cancelable. */
  "onhelix-open"?: (e: HelixMenuHelixOpenElementEvent) => void;
  /** Fired before it closes, and cancelable. */
  "onhelix-close"?: (e: HelixMenuHelixCloseElementEvent) => void;
  /** Fired when an item is chosen. */
  "onhelix-select"?: (e: HelixMenuHelixSelectElementEvent) => void;
};

export type HelixMenuSolidJsProps = {
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
  "prop:open"?: HelixMenu["open"];
  /** Initial open state for uncontrolled use, where nothing declared one. */
  "bool:default-open"?: HelixMenu["defaultOpen"];
  /** Initial open state for uncontrolled use, where nothing declared one. */
  "prop:defaultOpen"?: HelixMenu["defaultOpen"];
  /** Preferred side. It moves if that side does not fit. */
  "prop:placement"?: HelixMenu["placement"];
  /** Space between the trigger and the surface, in pixels. */
  "prop:offset"?: HelixMenu["offset"];
  /** Accessible name for the surface. */
  "prop:label"?: HelixMenu["label"];
  /** What the row returning from a submenu reads. */
  "attr:back-label"?: HelixMenu["backLabel"];
  /** What the row returning from a submenu reads. */
  "prop:backLabel"?: HelixMenu["backLabel"];
  /** The consumer's callback, invoked after the state is applied.

Not an attribute: it is a function. And not reachable from React's JSX,
which reserves every `on[A-Z]` prop for its own event system and drops
what it does not recognise; the generated wrapper listens for the events
instead. */
  "prop:onOpenChange"?: HelixMenu["onOpenChange"];
  /** Fired before it opens, and cancelable. */
  "on:helix-open"?: (e: HelixMenuHelixOpenElementEvent) => void;
  /** Fired before it closes, and cancelable. */
  "on:helix-close"?: (e: HelixMenuHelixCloseElementEvent) => void;
  /** Fired when an item is chosen. */
  "on:helix-select"?: (e: HelixMenuHelixSelectElementEvent) => void;

  /** Set the innerHTML of the element */
  innerHTML?: string;
  /** Set the textContent of the element */
  textContent?: string | number;
};

export type HelixNavBarProps = {
  /** Accessible name for the landmark. */
  label?: HelixNavBar["label"];
};

export type HelixNavBarSolidJsProps = {
  /** Accessible name for the landmark. */
  "prop:label"?: HelixNavBar["label"];

  /** Set the innerHTML of the element */
  innerHTML?: string;
  /** Set the textContent of the element */
  textContent?: string | number;
};

export type HelixOptionGroupProps = {
  /** The heading over the run. */
  label?: HelixOptionGroup["label"];
};

export type HelixOptionGroupSolidJsProps = {
  /** The heading over the run. */
  "prop:label"?: HelixOptionGroup["label"];

  /** Set the innerHTML of the element */
  innerHTML?: string;
  /** Set the textContent of the element */
  textContent?: string | number;
};

/** `HelixOption` component event */
export type HelixOptionElementEvent<E = Event> = TypedEvent<HelixOption, E>;
/** `helix-select` event type */
export type HelixOptionHelixSelectElementEvent =
  HelixOptionElementEvent<HelixSelectEvent>;

export type HelixOptionProps = {
  /** Whether this choice can be made. */
  disabled?: HelixOption["disabled"];
  /** Whether this is the option the keyboard is on. Written by the listbox. */
  "data-active"?: HelixOption["active"];
  /** Whether this is the option the keyboard is on. Written by the listbox. */
  active?: HelixOption["active"];
  /** Whether this choice is currently chosen. Written by the listbox. */
  selected?: HelixOption["selected"];
  /** Identifies this choice, and is what a form submits. */
  value?: HelixOption["value"];

  /** Fired when this choice is made. */
  "onhelix-select"?: (e: HelixOptionHelixSelectElementEvent) => void;
};

export type HelixOptionSolidJsProps = {
  /** Whether this choice can be made. */
  "prop:disabled"?: HelixOption["disabled"];
  /** Whether this is the option the keyboard is on. Written by the listbox. */
  "bool:data-active"?: HelixOption["active"];
  /** Whether this is the option the keyboard is on. Written by the listbox. */
  "prop:active"?: HelixOption["active"];
  /** Whether this choice is currently chosen. Written by the listbox. */
  "prop:selected"?: HelixOption["selected"];
  /** Identifies this choice, and is what a form submits. */
  "prop:value"?: HelixOption["value"];
  /** Fired when this choice is made. */
  "on:helix-select"?: (e: HelixOptionHelixSelectElementEvent) => void;

  /** Set the innerHTML of the element */
  innerHTML?: string;
  /** Set the textContent of the element */
  textContent?: string | number;
};

export type HelixPageNavProps = {
  /** Accessible name for the navigation. */
  label?: HelixPageNav["label"];
  /** How far below the top of the window a heading counts as reached, in pixels.

The reading line. A page with a sticky masthead sets this to its height, or
a little more: without it the current section changes as a heading slides
under the chrome rather than as it reaches the top of what can be seen. */
  offset?: HelixPageNav["offset"];
};

export type HelixPageNavSolidJsProps = {
  /** Accessible name for the navigation. */
  "prop:label"?: HelixPageNav["label"];
  /** How far below the top of the window a heading counts as reached, in pixels.

The reading line. A page with a sticky masthead sets this to its height, or
a little more: without it the current section changes as a heading slides
under the chrome rather than as it reaches the top of what can be seen. */
  "prop:offset"?: HelixPageNav["offset"];

  /** Set the innerHTML of the element */
  innerHTML?: string;
  /** Set the textContent of the element */
  textContent?: string | number;
};

/** `HelixPopover` component event */
export type HelixPopoverElementEvent<E = Event> = TypedEvent<HelixPopover, E>;
/** `helix-open` event type */
export type HelixPopoverHelixOpenElementEvent =
  HelixPopoverElementEvent<HelixOpenEvent>;
/** `helix-close` event type */
export type HelixPopoverHelixCloseElementEvent =
  HelixPopoverElementEvent<HelixCloseEvent>;

export type HelixPopoverProps = {
  /** How the panel is framed.

Unset is a surface with an inset, which is what a panel of content wants.
`plain` removes both, for a panel holding something that brings its own,
such as a list whose rows run to the edges. */
  appearance?: HelixPopover["appearance"];
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
  open?: HelixPopover["open"];
  /** Initial open state for uncontrolled use, where nothing declared one. */
  "default-open"?: HelixPopover["defaultOpen"];
  /** Initial open state for uncontrolled use, where nothing declared one. */
  defaultOpen?: HelixPopover["defaultOpen"];
  /** Accessible name for the panel. */
  label?: HelixPopover["label"];
  /** Space between the trigger and the panel, in pixels. */
  offset?: HelixPopover["offset"];
  /** Preferred side. It moves if that side does not fit. */
  placement?: HelixPopover["placement"];
  /** The consumer's callback, invoked after the state is applied.

Not an attribute: it is a function. And not reachable from React's JSX,
which reserves every `on[A-Z]` prop for its own event system and drops
what it does not recognise; the generated wrapper listens for the events
instead. */
  onOpenChange?: HelixPopover["onOpenChange"];

  /** Fired before it opens, and cancelable. */
  "onhelix-open"?: (e: HelixPopoverHelixOpenElementEvent) => void;
  /** Fired before it closes, and cancelable. */
  "onhelix-close"?: (e: HelixPopoverHelixCloseElementEvent) => void;
};

export type HelixPopoverSolidJsProps = {
  /** How the panel is framed.

Unset is a surface with an inset, which is what a panel of content wants.
`plain` removes both, for a panel holding something that brings its own,
such as a list whose rows run to the edges. */
  "prop:appearance"?: HelixPopover["appearance"];
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
  "prop:open"?: HelixPopover["open"];
  /** Initial open state for uncontrolled use, where nothing declared one. */
  "bool:default-open"?: HelixPopover["defaultOpen"];
  /** Initial open state for uncontrolled use, where nothing declared one. */
  "prop:defaultOpen"?: HelixPopover["defaultOpen"];
  /** Accessible name for the panel. */
  "prop:label"?: HelixPopover["label"];
  /** Space between the trigger and the panel, in pixels. */
  "prop:offset"?: HelixPopover["offset"];
  /** Preferred side. It moves if that side does not fit. */
  "prop:placement"?: HelixPopover["placement"];
  /** The consumer's callback, invoked after the state is applied.

Not an attribute: it is a function. And not reachable from React's JSX,
which reserves every `on[A-Z]` prop for its own event system and drops
what it does not recognise; the generated wrapper listens for the events
instead. */
  "prop:onOpenChange"?: HelixPopover["onOpenChange"];
  /** Fired before it opens, and cancelable. */
  "on:helix-open"?: (e: HelixPopoverHelixOpenElementEvent) => void;
  /** Fired before it closes, and cancelable. */
  "on:helix-close"?: (e: HelixPopoverHelixCloseElementEvent) => void;

  /** Set the innerHTML of the element */
  innerHTML?: string;
  /** Set the textContent of the element */
  textContent?: string | number;
};

export type HelixProgressProps = {
  /** What the fill means.

Unset is the accent, which is what progress usually is. `success` is for a
bar that has arrived somewhere good and stays on screen to say so, and
`danger` for a quota being consumed rather than a task being finished:
both are the same geometry reading the opposite way. */
  tone?: HelixProgress["tone"];
  /** Accessible name for what is in progress. */
  label?: HelixProgress["label"];
  /** The total the work is measured against. */
  max?: HelixProgress["max"];
  /** What has been done so far, in the same units as `max`.

Clamped between zero and `max` for both the fill and the announcement, so
the two can never disagree about what is on screen. */
  value?: HelixProgress["value"];
  /** A reading for the value, where the number alone does not say enough.

"3 of 8 files" rather than "37". Announced instead of the percentage, and
never instead of the value itself: `aria-valuenow` still carries the
number, because assistive technology that ignores the text still has to
report progress. */
  "value-text"?: HelixProgress["valueText"];
  /** A reading for the value, where the number alone does not say enough.

"3 of 8 files" rather than "37". Announced instead of the percentage, and
never instead of the value itself: `aria-valuenow` still carries the
number, because assistive technology that ignores the text still has to
report progress. */
  valueText?: HelixProgress["valueText"];
};

export type HelixProgressSolidJsProps = {
  /** What the fill means.

Unset is the accent, which is what progress usually is. `success` is for a
bar that has arrived somewhere good and stays on screen to say so, and
`danger` for a quota being consumed rather than a task being finished:
both are the same geometry reading the opposite way. */
  "prop:tone"?: HelixProgress["tone"];
  /** Accessible name for what is in progress. */
  "prop:label"?: HelixProgress["label"];
  /** The total the work is measured against. */
  "prop:max"?: HelixProgress["max"];
  /** What has been done so far, in the same units as `max`.

Clamped between zero and `max` for both the fill and the announcement, so
the two can never disagree about what is on screen. */
  "prop:value"?: HelixProgress["value"];
  /** A reading for the value, where the number alone does not say enough.

"3 of 8 files" rather than "37". Announced instead of the percentage, and
never instead of the value itself: `aria-valuenow` still carries the
number, because assistive technology that ignores the text still has to
report progress. */
  "attr:value-text"?: HelixProgress["valueText"];
  /** A reading for the value, where the number alone does not say enough.

"3 of 8 files" rather than "37". Announced instead of the percentage, and
never instead of the value itself: `aria-valuenow` still carries the
number, because assistive technology that ignores the text still has to
report progress. */
  "prop:valueText"?: HelixProgress["valueText"];

  /** Set the innerHTML of the element */
  innerHTML?: string;
  /** Set the textContent of the element */
  textContent?: string | number;
};

export type HelixQuoteProps = {
  /** URL identifying where the quotation came from. */
  cite?: HelixQuote["cite"];
};

export type HelixQuoteSolidJsProps = {
  /** URL identifying where the quotation came from. */
  "prop:cite"?: HelixQuote["cite"];

  /** Set the innerHTML of the element */
  innerHTML?: string;
  /** Set the textContent of the element */
  textContent?: string | number;
};

/** `HelixRadioGroup` component event */
export type HelixRadioGroupElementEvent<E = Event> = TypedEvent<
  HelixRadioGroup,
  E
>;
/** `helix-change` event type */
export type HelixRadioGroupHelixChangeElementEvent =
  HelixRadioGroupElementEvent<HelixChangeEvent>;

export type HelixRadioGroupProps = {
  /** The value the markup declared, which is where a reset returns to. */
  "default-value"?: HelixRadioGroup["defaultValue"];
  /** The value the markup declared, which is where a reset returns to. */
  defaultValue?: HelixRadioGroup["defaultValue"];
  /** What the control holds now, and what its form submits.

One property, not two. Reading gives the real value whichever mode the
control is in, so `input.value` answers the question anyone asking it
meant. Writing hands ownership to the consumer, which is what
`<helix-input value="x">` says too, and matches what a controlled input
means in React: the value is theirs and the control waits to be told.
`default-value` is how markup seeds one it does not want to own.

The same shape as the other three mixins, which is the point of them
being four of a kind rather than four of three kinds. */
  value?: HelixRadioGroup["value"];
  /** Help under the control, shown while there is nothing wrong. */
  hint?: HelixRadioGroup["hint"];
  /** What is wrong, in the reader's words rather than the browser's. */
  feedback?: HelixRadioGroup["feedback"];
  /** The accessible name, and the fallback for the `label` slot. */
  label?: HelixRadioGroup["label"];
  /** Whether the form refuses to submit without it. */
  required?: HelixRadioGroup["required"];
  /** Name the group reports under when its form is submitted. */
  name?: HelixRadioGroup["name"];
  /** Which way the choices run. A column reads one line per answer. */
  orientation?: HelixRadioGroup["orientation"];
  /** Whether the control is non-interactive.

Reflected, because the styled tier selects on it, and mirrored to
`aria-disabled` rather than removing the element from the accessibility
tree, so a screen reader can still announce that the control exists. */
  disabled?: HelixRadioGroup["disabled"];
  /** The consumer's callback, invoked after the value is applied.

Not an attribute: it is a function. `onValueChange` and not `onChange`,
because React reserves the latter for its own synthetic system and wires
it to the native `change`, so a Helix event named `Change` would never
fire at all. */
  onValueChange?: HelixRadioGroup["onValueChange"];

  /** Fired when the answer changes, and cancelable. */
  "onhelix-change"?: (e: HelixRadioGroupHelixChangeElementEvent) => void;
};

export type HelixRadioGroupSolidJsProps = {
  /** The value the markup declared, which is where a reset returns to. */
  "attr:default-value"?: HelixRadioGroup["defaultValue"];
  /** The value the markup declared, which is where a reset returns to. */
  "prop:defaultValue"?: HelixRadioGroup["defaultValue"];
  /** What the control holds now, and what its form submits.

One property, not two. Reading gives the real value whichever mode the
control is in, so `input.value` answers the question anyone asking it
meant. Writing hands ownership to the consumer, which is what
`<helix-input value="x">` says too, and matches what a controlled input
means in React: the value is theirs and the control waits to be told.
`default-value` is how markup seeds one it does not want to own.

The same shape as the other three mixins, which is the point of them
being four of a kind rather than four of three kinds. */
  "prop:value"?: HelixRadioGroup["value"];
  /** Help under the control, shown while there is nothing wrong. */
  "prop:hint"?: HelixRadioGroup["hint"];
  /** What is wrong, in the reader's words rather than the browser's. */
  "prop:feedback"?: HelixRadioGroup["feedback"];
  /** The accessible name, and the fallback for the `label` slot. */
  "prop:label"?: HelixRadioGroup["label"];
  /** Whether the form refuses to submit without it. */
  "prop:required"?: HelixRadioGroup["required"];
  /** Name the group reports under when its form is submitted. */
  "prop:name"?: HelixRadioGroup["name"];
  /** Which way the choices run. A column reads one line per answer. */
  "prop:orientation"?: HelixRadioGroup["orientation"];
  /** Whether the control is non-interactive.

Reflected, because the styled tier selects on it, and mirrored to
`aria-disabled` rather than removing the element from the accessibility
tree, so a screen reader can still announce that the control exists. */
  "prop:disabled"?: HelixRadioGroup["disabled"];
  /** The consumer's callback, invoked after the value is applied.

Not an attribute: it is a function. `onValueChange` and not `onChange`,
because React reserves the latter for its own synthetic system and wires
it to the native `change`, so a Helix event named `Change` would never
fire at all. */
  "prop:onValueChange"?: HelixRadioGroup["onValueChange"];
  /** Fired when the answer changes, and cancelable. */
  "on:helix-change"?: (e: HelixRadioGroupHelixChangeElementEvent) => void;

  /** Set the innerHTML of the element */
  innerHTML?: string;
  /** Set the textContent of the element */
  textContent?: string | number;
};

/** `HelixRadio` component event */
export type HelixRadioElementEvent<E = Event> = TypedEvent<HelixRadio, E>;
/** `helix-select` event type */
export type HelixRadioHelixSelectElementEvent =
  HelixRadioElementEvent<HelixSelectEvent>;

export type HelixRadioProps = {
  /** Whether this choice can be made. */
  disabled?: HelixRadio["disabled"];
  /** Whether this is the current choice. Written by the group. */
  selected?: HelixRadio["selected"];
  /** Identifies this choice to the group, and is what the form submits. */
  value?: HelixRadio["value"];

  /** Fired when this choice is made. */
  "onhelix-select"?: (e: HelixRadioHelixSelectElementEvent) => void;
};

export type HelixRadioSolidJsProps = {
  /** Whether this choice can be made. */
  "prop:disabled"?: HelixRadio["disabled"];
  /** Whether this is the current choice. Written by the group. */
  "prop:selected"?: HelixRadio["selected"];
  /** Identifies this choice to the group, and is what the form submits. */
  "prop:value"?: HelixRadio["value"];
  /** Fired when this choice is made. */
  "on:helix-select"?: (e: HelixRadioHelixSelectElementEvent) => void;

  /** Set the innerHTML of the element */
  innerHTML?: string;
  /** Set the textContent of the element */
  textContent?: string | number;
};

/** `HelixSelect` component event */
export type HelixSelectElementEvent<E = Event> = TypedEvent<HelixSelect, E>;
/** `helix-change` event type */
export type HelixSelectHelixChangeElementEvent =
  HelixSelectElementEvent<HelixChangeEvent>;
/** `helix-open` event type */
export type HelixSelectHelixOpenElementEvent =
  HelixSelectElementEvent<HelixOpenEvent>;
/** `helix-close` event type */
export type HelixSelectHelixCloseElementEvent =
  HelixSelectElementEvent<HelixCloseEvent>;

export type HelixSelectProps = {
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
  open?: HelixSelect["open"];
  /** Initial open state for uncontrolled use, where nothing declared one. */
  "default-open"?: HelixSelect["defaultOpen"];
  /** Initial open state for uncontrolled use, where nothing declared one. */
  defaultOpen?: HelixSelect["defaultOpen"];
  /** The value the markup declared, which is where a reset returns to. */
  "default-value"?: HelixSelect["defaultValue"];
  /** The value the markup declared, which is where a reset returns to. */
  defaultValue?: HelixSelect["defaultValue"];
  /** What the control holds now, and what its form submits.

One property, not two. Reading gives the real value whichever mode the
control is in, so `input.value` answers the question anyone asking it
meant. Writing hands ownership to the consumer, which is what
`<helix-input value="x">` says too, and matches what a controlled input
means in React: the value is theirs and the control waits to be told.
`default-value` is how markup seeds one it does not want to own.

The same shape as the other three mixins, which is the point of them
being four of a kind rather than four of three kinds. */
  value?: HelixSelect["value"];
  /** Help under the control, shown while there is nothing wrong. */
  hint?: HelixSelect["hint"];
  /** What is wrong, in the reader's words rather than the browser's. */
  feedback?: HelixSelect["feedback"];
  /** The accessible name, and the fallback for the `label` slot. */
  label?: HelixSelect["label"];
  /** Whether the form refuses to submit without it. */
  required?: HelixSelect["required"];
  /** Whether the list can be narrowed by typing.

Passed to the listbox rather than acted on here, because the listbox owns
the filtering, the empty state and the keyboard. This property existed and
was never read: it reflected, it type-checked, and nothing anywhere
rendered a field. API that does nothing is worse than API that is missing,
because a consumer sets it and believes it. */
  filterable?: HelixSelect["filterable"];
  /** Whether more than one option can be the answer. */
  multiple?: HelixSelect["multiple"];
  /** Name the control reports under when its form is submitted. */
  name?: HelixSelect["name"];
  /** Shown on the trigger while nothing is chosen. */
  placeholder?: HelixSelect["placeholder"];
  /** Whether the control is non-interactive.

Reflected, because the styled tier selects on it, and mirrored to
`aria-disabled` rather than removing the element from the accessibility
tree, so a screen reader can still announce that the control exists. */
  disabled?: HelixSelect["disabled"];
  /** The consumer's callback, invoked after the state is applied.

Not an attribute: it is a function. And not reachable from React's JSX,
which reserves every `on[A-Z]` prop for its own event system and drops
what it does not recognise; the generated wrapper listens for the events
instead. */
  onOpenChange?: HelixSelect["onOpenChange"];
  /** The consumer's callback, invoked after the value is applied.

Not an attribute: it is a function. `onValueChange` and not `onChange`,
because React reserves the latter for its own synthetic system and wires
it to the native `change`, so a Helix event named `Change` would never
fire at all. */
  onValueChange?: HelixSelect["onValueChange"];

  /** Relayed from the listbox when the answer changes. */
  "onhelix-change"?: (e: HelixSelectHelixChangeElementEvent) => void;
  /** Fired when the list opens. */
  "onhelix-open"?: (e: HelixSelectHelixOpenElementEvent) => void;
  /** Fired when it closes. */
  "onhelix-close"?: (e: HelixSelectHelixCloseElementEvent) => void;
};

export type HelixSelectSolidJsProps = {
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
  "prop:open"?: HelixSelect["open"];
  /** Initial open state for uncontrolled use, where nothing declared one. */
  "bool:default-open"?: HelixSelect["defaultOpen"];
  /** Initial open state for uncontrolled use, where nothing declared one. */
  "prop:defaultOpen"?: HelixSelect["defaultOpen"];
  /** The value the markup declared, which is where a reset returns to. */
  "attr:default-value"?: HelixSelect["defaultValue"];
  /** The value the markup declared, which is where a reset returns to. */
  "prop:defaultValue"?: HelixSelect["defaultValue"];
  /** What the control holds now, and what its form submits.

One property, not two. Reading gives the real value whichever mode the
control is in, so `input.value` answers the question anyone asking it
meant. Writing hands ownership to the consumer, which is what
`<helix-input value="x">` says too, and matches what a controlled input
means in React: the value is theirs and the control waits to be told.
`default-value` is how markup seeds one it does not want to own.

The same shape as the other three mixins, which is the point of them
being four of a kind rather than four of three kinds. */
  "prop:value"?: HelixSelect["value"];
  /** Help under the control, shown while there is nothing wrong. */
  "prop:hint"?: HelixSelect["hint"];
  /** What is wrong, in the reader's words rather than the browser's. */
  "prop:feedback"?: HelixSelect["feedback"];
  /** The accessible name, and the fallback for the `label` slot. */
  "prop:label"?: HelixSelect["label"];
  /** Whether the form refuses to submit without it. */
  "prop:required"?: HelixSelect["required"];
  /** Whether the list can be narrowed by typing.

Passed to the listbox rather than acted on here, because the listbox owns
the filtering, the empty state and the keyboard. This property existed and
was never read: it reflected, it type-checked, and nothing anywhere
rendered a field. API that does nothing is worse than API that is missing,
because a consumer sets it and believes it. */
  "prop:filterable"?: HelixSelect["filterable"];
  /** Whether more than one option can be the answer. */
  "prop:multiple"?: HelixSelect["multiple"];
  /** Name the control reports under when its form is submitted. */
  "prop:name"?: HelixSelect["name"];
  /** Shown on the trigger while nothing is chosen. */
  "prop:placeholder"?: HelixSelect["placeholder"];
  /** Whether the control is non-interactive.

Reflected, because the styled tier selects on it, and mirrored to
`aria-disabled` rather than removing the element from the accessibility
tree, so a screen reader can still announce that the control exists. */
  "prop:disabled"?: HelixSelect["disabled"];
  /** The consumer's callback, invoked after the state is applied.

Not an attribute: it is a function. And not reachable from React's JSX,
which reserves every `on[A-Z]` prop for its own event system and drops
what it does not recognise; the generated wrapper listens for the events
instead. */
  "prop:onOpenChange"?: HelixSelect["onOpenChange"];
  /** The consumer's callback, invoked after the value is applied.

Not an attribute: it is a function. `onValueChange` and not `onChange`,
because React reserves the latter for its own synthetic system and wires
it to the native `change`, so a Helix event named `Change` would never
fire at all. */
  "prop:onValueChange"?: HelixSelect["onValueChange"];
  /** Relayed from the listbox when the answer changes. */
  "on:helix-change"?: (e: HelixSelectHelixChangeElementEvent) => void;
  /** Fired when the list opens. */
  "on:helix-open"?: (e: HelixSelectHelixOpenElementEvent) => void;
  /** Fired when it closes. */
  "on:helix-close"?: (e: HelixSelectHelixCloseElementEvent) => void;

  /** Set the innerHTML of the element */
  innerHTML?: string;
  /** Set the textContent of the element */
  textContent?: string | number;
};

export type HelixSkeletonProps = {
  /** What the missing content is shaped like.

Unset is a block, which is what most missing things are. */
  shape?: HelixSkeleton["shape"];
};

export type HelixSkeletonSolidJsProps = {
  /** What the missing content is shaped like.

Unset is a block, which is what most missing things are. */
  "prop:shape"?: HelixSkeleton["shape"];

  /** Set the innerHTML of the element */
  innerHTML?: string;
  /** Set the textContent of the element */
  textContent?: string | number;
};

/** `HelixSlider` component event */
export type HelixSliderElementEvent<E = Event> = TypedEvent<HelixSlider, E>;
/** `helix-change` event type */
export type HelixSliderHelixChangeElementEvent =
  HelixSliderElementEvent<HelixChangeEvent>;

export type HelixSliderProps = {
  /** The value the markup declared, which is where a reset returns to. */
  "default-value"?: HelixSlider["defaultValue"];
  /** The value the markup declared, which is where a reset returns to. */
  defaultValue?: HelixSlider["defaultValue"];
  /** What the control holds now, and what its form submits.

One property, not two. Reading gives the real value whichever mode the
control is in, so `input.value` answers the question anyone asking it
meant. Writing hands ownership to the consumer, which is what
`<helix-input value="x">` says too, and matches what a controlled input
means in React: the value is theirs and the control waits to be told.
`default-value` is how markup seeds one it does not want to own.

The same shape as the other three mixins, which is the point of them
being four of a kind rather than four of three kinds. */
  value?: HelixSlider["value"];
  /** Help under the control, shown while there is nothing wrong. */
  hint?: HelixSlider["hint"];
  /** What is wrong, in the reader's words rather than the browser's. */
  feedback?: HelixSlider["feedback"];
  /** The accessible name, and the fallback for the `label` slot. */
  label?: HelixSlider["label"];
  /** Whether the form refuses to submit without it. */
  required?: HelixSlider["required"];
  /** The largest value the reader can choose. */
  max?: HelixSlider["max"];
  /** The smallest value the reader can choose. */
  min?: HelixSlider["min"];
  /** Name submitted with the form. */
  name?: HelixSlider["name"];
  /** Whether the chosen value is shown beside the track. */
  "show-value"?: HelixSlider["showValue"];
  /** Whether the chosen value is shown beside the track. */
  showValue?: HelixSlider["showValue"];
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
  markers?: HelixSlider["markers"];
  /** Whether each mark says which value it stands at. */
  "marker-labels"?: HelixSlider["markerLabels"];
  /** Whether each mark says which value it stands at. */
  markerLabels?: HelixSlider["markerLabels"];
  /** How far one press of an arrow key moves it. */
  step?: HelixSlider["step"];
  /** Whether the control is non-interactive.

Reflected, because the styled tier selects on it, and mirrored to
`aria-disabled` rather than removing the element from the accessibility
tree, so a screen reader can still announce that the control exists. */
  disabled?: HelixSlider["disabled"];
  /** The consumer's callback, invoked after the value is applied.

Not an attribute: it is a function. `onValueChange` and not `onChange`,
because React reserves the latter for its own synthetic system and wires
it to the native `change`, so a Helix event named `Change` would never
fire at all. */
  onValueChange?: HelixSlider["onValueChange"];

  /** Fired as the value changes, and cancelable. */
  "onhelix-change"?: (e: HelixSliderHelixChangeElementEvent) => void;
  /** Relayed once the reader has let go. */
  onchange?: (e: HelixSliderElementEvent) => void;
};

export type HelixSliderSolidJsProps = {
  /** The value the markup declared, which is where a reset returns to. */
  "attr:default-value"?: HelixSlider["defaultValue"];
  /** The value the markup declared, which is where a reset returns to. */
  "prop:defaultValue"?: HelixSlider["defaultValue"];
  /** What the control holds now, and what its form submits.

One property, not two. Reading gives the real value whichever mode the
control is in, so `input.value` answers the question anyone asking it
meant. Writing hands ownership to the consumer, which is what
`<helix-input value="x">` says too, and matches what a controlled input
means in React: the value is theirs and the control waits to be told.
`default-value` is how markup seeds one it does not want to own.

The same shape as the other three mixins, which is the point of them
being four of a kind rather than four of three kinds. */
  "prop:value"?: HelixSlider["value"];
  /** Help under the control, shown while there is nothing wrong. */
  "prop:hint"?: HelixSlider["hint"];
  /** What is wrong, in the reader's words rather than the browser's. */
  "prop:feedback"?: HelixSlider["feedback"];
  /** The accessible name, and the fallback for the `label` slot. */
  "prop:label"?: HelixSlider["label"];
  /** Whether the form refuses to submit without it. */
  "prop:required"?: HelixSlider["required"];
  /** The largest value the reader can choose. */
  "prop:max"?: HelixSlider["max"];
  /** The smallest value the reader can choose. */
  "prop:min"?: HelixSlider["min"];
  /** Name submitted with the form. */
  "prop:name"?: HelixSlider["name"];
  /** Whether the chosen value is shown beside the track. */
  "bool:show-value"?: HelixSlider["showValue"];
  /** Whether the chosen value is shown beside the track. */
  "prop:showValue"?: HelixSlider["showValue"];
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
  "prop:markers"?: HelixSlider["markers"];
  /** Whether each mark says which value it stands at. */
  "bool:marker-labels"?: HelixSlider["markerLabels"];
  /** Whether each mark says which value it stands at. */
  "prop:markerLabels"?: HelixSlider["markerLabels"];
  /** How far one press of an arrow key moves it. */
  "prop:step"?: HelixSlider["step"];
  /** Whether the control is non-interactive.

Reflected, because the styled tier selects on it, and mirrored to
`aria-disabled` rather than removing the element from the accessibility
tree, so a screen reader can still announce that the control exists. */
  "prop:disabled"?: HelixSlider["disabled"];
  /** The consumer's callback, invoked after the value is applied.

Not an attribute: it is a function. `onValueChange` and not `onChange`,
because React reserves the latter for its own synthetic system and wires
it to the native `change`, so a Helix event named `Change` would never
fire at all. */
  "prop:onValueChange"?: HelixSlider["onValueChange"];
  /** Fired as the value changes, and cancelable. */
  "on:helix-change"?: (e: HelixSliderHelixChangeElementEvent) => void;
  /** Relayed once the reader has let go. */
  "on:change"?: (e: HelixSliderElementEvent) => void;

  /** Set the innerHTML of the element */
  innerHTML?: string;
  /** Set the textContent of the element */
  textContent?: string | number;
};

export type HelixSpinnerProps = {
  /** Diameter relative to the surrounding text. */
  size?: HelixSpinner["size"];
  /** Accessible name, announced while the work is outstanding. */
  label?: HelixSpinner["label"];
};

export type HelixSpinnerSolidJsProps = {
  /** Diameter relative to the surrounding text. */
  "prop:size"?: HelixSpinner["size"];
  /** Accessible name, announced while the work is outstanding. */
  "prop:label"?: HelixSpinner["label"];

  /** Set the innerHTML of the element */
  innerHTML?: string;
  /** Set the textContent of the element */
  textContent?: string | number;
};

export type HelixStatGroupProps = {
  /** Whether the figures are separated by a rule as well as by space. */
  divided?: HelixStatGroup["divided"];
  /** Accessible name for the set. */
  label?: HelixStatGroup["label"];
};

export type HelixStatGroupSolidJsProps = {
  /** Whether the figures are separated by a rule as well as by space. */
  "prop:divided"?: HelixStatGroup["divided"];
  /** Accessible name for the set. */
  "prop:label"?: HelixStatGroup["label"];

  /** Set the innerHTML of the element */
  innerHTML?: string;
  /** Set the textContent of the element */
  textContent?: string | number;
};

export type HelixStatProps = {};

export type HelixStatSolidJsProps = {
  /** Set the innerHTML of the element */
  innerHTML?: string;
  /** Set the textContent of the element */
  textContent?: string | number;
};

/** `HelixSwitch` component event */
export type HelixSwitchElementEvent<E = Event> = TypedEvent<HelixSwitch, E>;
/** `helix-change` event type */
export type HelixSwitchHelixChangeElementEvent =
  HelixSwitchElementEvent<HelixChangeEvent>;

export type HelixSwitchProps = {
  /** Whether the control is checked.

One property rather than two. Reading gives the real state whichever
mode the control is in; writing hands ownership to the consumer, which
is what the attribute in `<helix-checkbox checked>` does as well. The
same shape all four of these mixins have, for the reason given on
`MixinControllerOpen.open`.

Not reflected: the attribute is the consumer's input and stays as they
wrote it, and `data-checked` carries the resolved state for stylesheets. */
  checked?: HelixSwitch["checked"];
  /** Initial checked state for uncontrolled use, where nothing declared one. */
  "default-checked"?: HelixSwitch["defaultChecked"];
  /** Initial checked state for uncontrolled use, where nothing declared one. */
  defaultChecked?: HelixSwitch["defaultChecked"];
  /** Help under the control, shown while there is nothing wrong. */
  hint?: HelixSwitch["hint"];
  /** What is wrong, in the reader's words rather than the browser's. */
  feedback?: HelixSwitch["feedback"];
  /** The accessible name, and the fallback for the `label` slot. */
  label?: HelixSwitch["label"];
  /** Whether the form refuses to submit without it. */
  required?: HelixSwitch["required"];
  /** Name submitted with the form. */
  name?: HelixSwitch["name"];
  /** Value submitted when the switch is on. */
  value?: HelixSwitch["value"];
  /** Whether the control is non-interactive.

Reflected, because the styled tier selects on it, and mirrored to
`aria-disabled` rather than removing the element from the accessibility
tree, so a screen reader can still announce that the control exists. */
  disabled?: HelixSwitch["disabled"];
  /** The consumer's callback, invoked after the state is applied.

Not an attribute: it is a function. And not reachable from React's JSX,
which reserves every `on[A-Z]` prop for its own event system and drops
what it does not recognise; the generated wrapper listens for the event
instead. */
  onCheckedChange?: HelixSwitch["onCheckedChange"];

  /** Fired before the state changes, and cancelable. */
  "onhelix-change"?: (e: HelixSwitchHelixChangeElementEvent) => void;
  /** Relayed from the input once the state has changed. */
  onchange?: (e: HelixSwitchElementEvent) => void;
};

export type HelixSwitchSolidJsProps = {
  /** Whether the control is checked.

One property rather than two. Reading gives the real state whichever
mode the control is in; writing hands ownership to the consumer, which
is what the attribute in `<helix-checkbox checked>` does as well. The
same shape all four of these mixins have, for the reason given on
`MixinControllerOpen.open`.

Not reflected: the attribute is the consumer's input and stays as they
wrote it, and `data-checked` carries the resolved state for stylesheets. */
  "prop:checked"?: HelixSwitch["checked"];
  /** Initial checked state for uncontrolled use, where nothing declared one. */
  "bool:default-checked"?: HelixSwitch["defaultChecked"];
  /** Initial checked state for uncontrolled use, where nothing declared one. */
  "prop:defaultChecked"?: HelixSwitch["defaultChecked"];
  /** Help under the control, shown while there is nothing wrong. */
  "prop:hint"?: HelixSwitch["hint"];
  /** What is wrong, in the reader's words rather than the browser's. */
  "prop:feedback"?: HelixSwitch["feedback"];
  /** The accessible name, and the fallback for the `label` slot. */
  "prop:label"?: HelixSwitch["label"];
  /** Whether the form refuses to submit without it. */
  "prop:required"?: HelixSwitch["required"];
  /** Name submitted with the form. */
  "prop:name"?: HelixSwitch["name"];
  /** Value submitted when the switch is on. */
  "prop:value"?: HelixSwitch["value"];
  /** Whether the control is non-interactive.

Reflected, because the styled tier selects on it, and mirrored to
`aria-disabled` rather than removing the element from the accessibility
tree, so a screen reader can still announce that the control exists. */
  "prop:disabled"?: HelixSwitch["disabled"];
  /** The consumer's callback, invoked after the state is applied.

Not an attribute: it is a function. And not reachable from React's JSX,
which reserves every `on[A-Z]` prop for its own event system and drops
what it does not recognise; the generated wrapper listens for the event
instead. */
  "prop:onCheckedChange"?: HelixSwitch["onCheckedChange"];
  /** Fired before the state changes, and cancelable. */
  "on:helix-change"?: (e: HelixSwitchHelixChangeElementEvent) => void;
  /** Relayed from the input once the state has changed. */
  "on:change"?: (e: HelixSwitchElementEvent) => void;

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

export type HelixTableColumnProps = {
  /** The track this column takes, as CSS.

A single track value, so anything valid in `grid-template-columns` works:
`16rem`, `auto`, `minmax(0, 2fr)`. Left unset the column shares what is
left over equally, which is `minmax(0, 1fr)` rather than `1fr`: a bare
`1fr` track keeps an automatic minimum and refuses to shrink under a long
cell, so one unbreakable value pushes the table past its container. */
  width?: HelixTableColumn["width"];
};

export type HelixTableColumnSolidJsProps = {
  /** The track this column takes, as CSS.

A single track value, so anything valid in `grid-template-columns` works:
`16rem`, `auto`, `minmax(0, 2fr)`. Left unset the column shares what is
left over equally, which is `minmax(0, 1fr)` rather than `1fr`: a bare
`1fr` track keeps an automatic minimum and refuses to shrink under a long
cell, so one unbreakable value pushes the table past its container. */
  "prop:width"?: HelixTableColumn["width"];

  /** Set the innerHTML of the element */
  innerHTML?: string;
  /** Set the textContent of the element */
  textContent?: string | number;
};

export type HelixTableProps = {
  /** Column track list, as CSS. Deprecated: declare columns instead.

Kept for a table that has no `helix-table-column` children, and ignored the
moment it has one. A raw track list is the right shape for the value and
the wrong place for it: the headings and the widths were two halves of one
fact held in two places, and nothing checked that they agreed. Worse, the
value is CSS, so handing it headings by mistake produced an invalid track
list, which a grid ignores in silence: the table collapsed to one column
and said nothing. Columns carry both halves now. */
  columns?: HelixTable["columns"];
  /** Accessible name for the table. */
  label?: HelixTable["label"];
};

export type HelixTableSolidJsProps = {
  /** Column track list, as CSS. Deprecated: declare columns instead.

Kept for a table that has no `helix-table-column` children, and ignored the
moment it has one. A raw track list is the right shape for the value and
the wrong place for it: the headings and the widths were two halves of one
fact held in two places, and nothing checked that they agreed. Worse, the
value is CSS, so handing it headings by mistake produced an invalid track
list, which a grid ignores in silence: the table collapsed to one column
and said nothing. Columns carry both halves now. */
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

/** `HelixTabs` component event */
export type HelixTabsElementEvent<E = Event> = TypedEvent<HelixTabs, E>;
/** `helix-select` event type */
export type HelixTabsHelixSelectElementEvent =
  HelixTabsElementEvent<HelixSelectEvent>;

export type HelixTabsProps = {
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
  active?: HelixTabs["active"];
  /** Initial item for uncontrolled use. Ignored once `active` is written. */
  "default-active"?: HelixTabs["defaultActive"];
  /** Initial item for uncontrolled use. Ignored once `active` is written. */
  defaultActive?: HelixTabs["defaultActive"];
  /** How the row reads.

Unset is a raised pill on the selected tab with nothing behind the row,
which is what a set sitting inside other chrome wants. `underline` is a
rule under the row and a thicker one under the selected tab, for a set that
heads a page. `toggle` puts the pill in a framed, sunken track, which reads
as one control rather than as a row.

Reflected and left unset by default, so the host carries nothing a
consumer's server markup does not already have. */
  appearance?: HelixTabs["appearance"];
  /** Accessible name for the tab list. */
  label?: HelixTabs["label"];
  /** Whether arrowing to a tab also selects it.

Automatic is the default because showing a panel is usually cheap. Set this
where it is not, so a reader arrowing past four tabs does not load four
panels on the way. */
  manual?: HelixTabs["manual"];
  /** The consumer's callback, invoked after the change is applied. */
  onActiveChange?: HelixTabs["onActiveChange"];

  /** Fired when a tab is chosen. Dispatched by the tab and listened for here, because the root is what a consumer holds. */
  "onhelix-select"?: (e: HelixTabsHelixSelectElementEvent) => void;
};

export type HelixTabsSolidJsProps = {
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
  "prop:active"?: HelixTabs["active"];
  /** Initial item for uncontrolled use. Ignored once `active` is written. */
  "attr:default-active"?: HelixTabs["defaultActive"];
  /** Initial item for uncontrolled use. Ignored once `active` is written. */
  "prop:defaultActive"?: HelixTabs["defaultActive"];
  /** How the row reads.

Unset is a raised pill on the selected tab with nothing behind the row,
which is what a set sitting inside other chrome wants. `underline` is a
rule under the row and a thicker one under the selected tab, for a set that
heads a page. `toggle` puts the pill in a framed, sunken track, which reads
as one control rather than as a row.

Reflected and left unset by default, so the host carries nothing a
consumer's server markup does not already have. */
  "prop:appearance"?: HelixTabs["appearance"];
  /** Accessible name for the tab list. */
  "prop:label"?: HelixTabs["label"];
  /** Whether arrowing to a tab also selects it.

Automatic is the default because showing a panel is usually cheap. Set this
where it is not, so a reader arrowing past four tabs does not load four
panels on the way. */
  "prop:manual"?: HelixTabs["manual"];
  /** The consumer's callback, invoked after the change is applied. */
  "prop:onActiveChange"?: HelixTabs["onActiveChange"];
  /** Fired when a tab is chosen. Dispatched by the tab and listened for here, because the root is what a consumer holds. */
  "on:helix-select"?: (e: HelixTabsHelixSelectElementEvent) => void;

  /** Set the innerHTML of the element */
  innerHTML?: string;
  /** Set the textContent of the element */
  textContent?: string | number;
};

/** `HelixTabsTab` component event */
export type HelixTabsTabElementEvent<E = Event> = TypedEvent<HelixTabsTab, E>;
/** `helix-select` event type */
export type HelixTabsTabHelixSelectElementEvent =
  HelixTabsTabElementEvent<HelixSelectEvent>;

export type HelixTabsTabProps = {
  /** Identifies the tab, and pairs it with the panel of the same value. */
  value?: HelixTabsTab["value"];
  /** Whether this tab is the current one. */
  selected?: HelixTabsTab["selected"];
  /** Whether the tab can be chosen. */
  disabled?: HelixTabsTab["disabled"];

  /** Fired when the tab is chosen. */
  "onhelix-select"?: (e: HelixTabsTabHelixSelectElementEvent) => void;
};

export type HelixTabsTabSolidJsProps = {
  /** Identifies the tab, and pairs it with the panel of the same value. */
  "prop:value"?: HelixTabsTab["value"];
  /** Whether this tab is the current one. */
  "prop:selected"?: HelixTabsTab["selected"];
  /** Whether the tab can be chosen. */
  "prop:disabled"?: HelixTabsTab["disabled"];
  /** Fired when the tab is chosen. */
  "on:helix-select"?: (e: HelixTabsTabHelixSelectElementEvent) => void;

  /** Set the innerHTML of the element */
  innerHTML?: string;
  /** Set the textContent of the element */
  textContent?: string | number;
};

/** `HelixTag` component event */
export type HelixTagElementEvent<E = Event> = TypedEvent<HelixTag, E>;
/** `helix-dismiss` event type */
export type HelixTagHelixDismissElementEvent =
  HelixTagElementEvent<HelixDismissEvent>;

export type HelixTagProps = {
  /** Which status the tag reports. */
  appearance?: HelixTag["appearance"];
  /** Whether the tag offers a control to remove itself. */
  dismissible?: HelixTag["dismissible"];
  /** Accessible name for the dismiss control.

A property rather than text read from the tag, because naming the button
"Remove Draft" would mean reading `textContent` and the server has no tree
to read it from.

The attribute is named explicitly. Lit lowercases a property name to get an
attribute rather than dash-casing it, so this would otherwise be reachable
only as `removelabel`, which nobody would guess and no linter would catch. */
  "dismiss-label"?: HelixTag["dismissLabel"];
  /** Accessible name for the dismiss control.

A property rather than text read from the tag, because naming the button
"Remove Draft" would mean reading `textContent` and the server has no tree
to read it from.

The attribute is named explicitly. Lit lowercases a property name to get an
attribute rather than dash-casing it, so this would otherwise be reachable
only as `removelabel`, which nobody would guess and no linter would catch. */
  dismissLabel?: HelixTag["dismissLabel"];

  /** Fired when the reader asks to remove the tag. */
  "onhelix-dismiss"?: (e: HelixTagHelixDismissElementEvent) => void;
};

export type HelixTagSolidJsProps = {
  /** Which status the tag reports. */
  "prop:appearance"?: HelixTag["appearance"];
  /** Whether the tag offers a control to remove itself. */
  "prop:dismissible"?: HelixTag["dismissible"];
  /** Accessible name for the dismiss control.

A property rather than text read from the tag, because naming the button
"Remove Draft" would mean reading `textContent` and the server has no tree
to read it from.

The attribute is named explicitly. Lit lowercases a property name to get an
attribute rather than dash-casing it, so this would otherwise be reachable
only as `removelabel`, which nobody would guess and no linter would catch. */
  "attr:dismiss-label"?: HelixTag["dismissLabel"];
  /** Accessible name for the dismiss control.

A property rather than text read from the tag, because naming the button
"Remove Draft" would mean reading `textContent` and the server has no tree
to read it from.

The attribute is named explicitly. Lit lowercases a property name to get an
attribute rather than dash-casing it, so this would otherwise be reachable
only as `removelabel`, which nobody would guess and no linter would catch. */
  "prop:dismissLabel"?: HelixTag["dismissLabel"];
  /** Fired when the reader asks to remove the tag. */
  "on:helix-dismiss"?: (e: HelixTagHelixDismissElementEvent) => void;

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
  /** Color role. Separate from `appearance`, because color carries state. */
  tone?: HelixText["tone"];
};

export type HelixTextSolidJsProps = {
  /** Which element to render. Decides the outline and the semantics. */
  "prop:as"?: HelixText["as"];
  /** Type treatment. Defaults to the one that matches `as`. */
  "prop:appearance"?: HelixText["appearance"];
  /** Color role. Separate from `appearance`, because color carries state. */
  "prop:tone"?: HelixText["tone"];

  /** Set the innerHTML of the element */
  innerHTML?: string;
  /** Set the textContent of the element */
  textContent?: string | number;
};

/** `HelixTextarea` component event */
export type HelixTextareaElementEvent<E = Event> = TypedEvent<HelixTextarea, E>;
/** `helix-change` event type */
export type HelixTextareaHelixChangeElementEvent =
  HelixTextareaElementEvent<HelixChangeEvent>;

export type HelixTextareaProps = {
  /** The value the markup declared, which is where a reset returns to. */
  "default-value"?: HelixTextarea["defaultValue"];
  /** The value the markup declared, which is where a reset returns to. */
  defaultValue?: HelixTextarea["defaultValue"];
  /** What the control holds now, and what its form submits.

One property, not two. Reading gives the real value whichever mode the
control is in, so `input.value` answers the question anyone asking it
meant. Writing hands ownership to the consumer, which is what
`<helix-input value="x">` says too, and matches what a controlled input
means in React: the value is theirs and the control waits to be told.
`default-value` is how markup seeds one it does not want to own.

The same shape as the other three mixins, which is the point of them
being four of a kind rather than four of three kinds. */
  value?: HelixTextarea["value"];
  /** Help under the control, shown while there is nothing wrong. */
  hint?: HelixTextarea["hint"];
  /** What is wrong, in the reader's words rather than the browser's. */
  feedback?: HelixTextarea["feedback"];
  /** The accessible name, and the fallback for the `label` slot. */
  label?: HelixTextarea["label"];
  /** Whether the form refuses to submit without it. */
  required?: HelixTextarea["required"];
  /** Whether the box follows its own content rather than scrolling. */
  "auto-grow"?: HelixTextarea["autoGrow"];
  /** Whether the box follows its own content rather than scrolling. */
  autoGrow?: HelixTextarea["autoGrow"];
  /** Name submitted with the form. */
  name?: HelixTextarea["name"];
  /** Shown while the field is empty. Not a label: it goes when typing starts. */
  placeholder?: HelixTextarea["placeholder"];
  /** Whether the field refuses input while still submitting its value. */
  "read-only"?: HelixTextarea["readOnly"];
  /** Whether the field refuses input while still submitting its value. */
  readOnly?: HelixTextarea["readOnly"];
  /** How many lines the box is before anything is typed. */
  rows?: HelixTextarea["rows"];
  /** Whether the control is non-interactive.

Reflected, because the styled tier selects on it, and mirrored to
`aria-disabled` rather than removing the element from the accessibility
tree, so a screen reader can still announce that the control exists. */
  disabled?: HelixTextarea["disabled"];
  /** The consumer's callback, invoked after the value is applied.

Not an attribute: it is a function. `onValueChange` and not `onChange`,
because React reserves the latter for its own synthetic system and wires
it to the native `change`, so a Helix event named `Change` would never
fire at all. */
  onValueChange?: HelixTextarea["onValueChange"];

  /** Fired as the text changes, and cancelable. */
  "onhelix-change"?: (e: HelixTextareaHelixChangeElementEvent) => void;
  /** Relayed from the textarea once the reader has finished. */
  onchange?: (e: HelixTextareaElementEvent) => void;
};

export type HelixTextareaSolidJsProps = {
  /** The value the markup declared, which is where a reset returns to. */
  "attr:default-value"?: HelixTextarea["defaultValue"];
  /** The value the markup declared, which is where a reset returns to. */
  "prop:defaultValue"?: HelixTextarea["defaultValue"];
  /** What the control holds now, and what its form submits.

One property, not two. Reading gives the real value whichever mode the
control is in, so `input.value` answers the question anyone asking it
meant. Writing hands ownership to the consumer, which is what
`<helix-input value="x">` says too, and matches what a controlled input
means in React: the value is theirs and the control waits to be told.
`default-value` is how markup seeds one it does not want to own.

The same shape as the other three mixins, which is the point of them
being four of a kind rather than four of three kinds. */
  "prop:value"?: HelixTextarea["value"];
  /** Help under the control, shown while there is nothing wrong. */
  "prop:hint"?: HelixTextarea["hint"];
  /** What is wrong, in the reader's words rather than the browser's. */
  "prop:feedback"?: HelixTextarea["feedback"];
  /** The accessible name, and the fallback for the `label` slot. */
  "prop:label"?: HelixTextarea["label"];
  /** Whether the form refuses to submit without it. */
  "prop:required"?: HelixTextarea["required"];
  /** Whether the box follows its own content rather than scrolling. */
  "bool:auto-grow"?: HelixTextarea["autoGrow"];
  /** Whether the box follows its own content rather than scrolling. */
  "prop:autoGrow"?: HelixTextarea["autoGrow"];
  /** Name submitted with the form. */
  "prop:name"?: HelixTextarea["name"];
  /** Shown while the field is empty. Not a label: it goes when typing starts. */
  "prop:placeholder"?: HelixTextarea["placeholder"];
  /** Whether the field refuses input while still submitting its value. */
  "bool:read-only"?: HelixTextarea["readOnly"];
  /** Whether the field refuses input while still submitting its value. */
  "prop:readOnly"?: HelixTextarea["readOnly"];
  /** How many lines the box is before anything is typed. */
  "prop:rows"?: HelixTextarea["rows"];
  /** Whether the control is non-interactive.

Reflected, because the styled tier selects on it, and mirrored to
`aria-disabled` rather than removing the element from the accessibility
tree, so a screen reader can still announce that the control exists. */
  "prop:disabled"?: HelixTextarea["disabled"];
  /** The consumer's callback, invoked after the value is applied.

Not an attribute: it is a function. `onValueChange` and not `onChange`,
because React reserves the latter for its own synthetic system and wires
it to the native `change`, so a Helix event named `Change` would never
fire at all. */
  "prop:onValueChange"?: HelixTextarea["onValueChange"];
  /** Fired as the text changes, and cancelable. */
  "on:helix-change"?: (e: HelixTextareaHelixChangeElementEvent) => void;
  /** Relayed from the textarea once the reader has finished. */
  "on:change"?: (e: HelixTextareaElementEvent) => void;

  /** Set the innerHTML of the element */
  innerHTML?: string;
  /** Set the textContent of the element */
  textContent?: string | number;
};

/** `HelixToastItem` component event */
export type HelixToastItemElementEvent<E = Event> = TypedEvent<
  HelixToastItem,
  E
>;
/** `helix-dismiss` event type */
export type HelixToastItemHelixDismissElementEvent =
  HelixToastItemElementEvent<HelixDismissEvent>;

export type HelixToastItemProps = {
  /** Accessible name for the dismiss control. */
  "dismiss-label"?: HelixToastItem["dismissLabel"];
  /** Accessible name for the dismiss control. */
  dismissLabel?: HelixToastItem["dismissLabel"];
  /** Whether the reader can ask for it to go. */
  dismissible?: HelixToastItem["dismissible"];
  /** How long it stays, in milliseconds. Absent means until it is dismissed.

Read once when the item is first rendered. Changing it afterwards does not
restart a message the reader is already partway through. */
  duration?: HelixToastItem["duration"];
  /** What kind of message it is, which picks the mark and its name. */
  severity?: HelixToastItem["severity"];

  /** Fired when it asks to go, whether by the control or by its timer. */
  "onhelix-dismiss"?: (e: HelixToastItemHelixDismissElementEvent) => void;
};

export type HelixToastItemSolidJsProps = {
  /** Accessible name for the dismiss control. */
  "attr:dismiss-label"?: HelixToastItem["dismissLabel"];
  /** Accessible name for the dismiss control. */
  "prop:dismissLabel"?: HelixToastItem["dismissLabel"];
  /** Whether the reader can ask for it to go. */
  "prop:dismissible"?: HelixToastItem["dismissible"];
  /** How long it stays, in milliseconds. Absent means until it is dismissed.

Read once when the item is first rendered. Changing it afterwards does not
restart a message the reader is already partway through. */
  "prop:duration"?: HelixToastItem["duration"];
  /** What kind of message it is, which picks the mark and its name. */
  "prop:severity"?: HelixToastItem["severity"];
  /** Fired when it asks to go, whether by the control or by its timer. */
  "on:helix-dismiss"?: (e: HelixToastItemHelixDismissElementEvent) => void;

  /** Set the innerHTML of the element */
  innerHTML?: string;
  /** Set the textContent of the element */
  textContent?: string | number;
};

export type HelixToastProps = {
  /** Accessible name for the region, such as "Notifications". */
  label?: HelixToast["label"];
  /** Which corner or edge the stack sits at.

Named here rather than on each message, because where a page puts its
toasts is a fact about the page: a stack whose members disagreed about
where they were would not be a stack. */
  placement?: HelixToast["placement"];
};

export type HelixToastSolidJsProps = {
  /** Accessible name for the region, such as "Notifications". */
  "prop:label"?: HelixToast["label"];
  /** Which corner or edge the stack sits at.

Named here rather than on each message, because where a page puts its
toasts is a fact about the page: a stack whose members disagreed about
where they were would not be a stack. */
  "prop:placement"?: HelixToast["placement"];

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
/** `helix-select` event type */
export type HelixToggleGroupHelixSelectElementEvent =
  HelixToggleGroupElementEvent<HelixSelectEvent>;

export type HelixToggleGroupProps = {
  /** How much chrome the group carries around its items. */
  appearance?: HelixToggleGroup["appearance"];
  /** The value the markup declared, which is where a reset returns to. */
  "default-value"?: HelixToggleGroup["defaultValue"];
  /** The value the markup declared, which is where a reset returns to. */
  defaultValue?: HelixToggleGroup["defaultValue"];
  /** What the control holds now, and what its form submits.

One property, not two. Reading gives the real value whichever mode the
control is in, so `input.value` answers the question anyone asking it
meant. Writing hands ownership to the consumer, which is what
`<helix-input value="x">` says too, and matches what a controlled input
means in React: the value is theirs and the control waits to be told.
`default-value` is how markup seeds one it does not want to own.

The same shape as the other three mixins, which is the point of them
being four of a kind rather than four of three kinds. */
  value?: HelixToggleGroup["value"];
  /** Help under the control, shown while there is nothing wrong. */
  hint?: HelixToggleGroup["hint"];
  /** What is wrong, in the reader's words rather than the browser's. */
  feedback?: HelixToggleGroup["feedback"];
  /** The accessible name, and the fallback for the `label` slot. */
  label?: HelixToggleGroup["label"];
  /** Whether the form refuses to submit without it. */
  required?: HelixToggleGroup["required"];
  /** Name the group reports under when its form is submitted. */
  name?: HelixToggleGroup["name"];
  /** Whether the control is non-interactive.

Reflected, because the styled tier selects on it, and mirrored to
`aria-disabled` rather than removing the element from the accessibility
tree, so a screen reader can still announce that the control exists. */
  disabled?: HelixToggleGroup["disabled"];
  /** The consumer's callback, invoked after the value is applied.

Not an attribute: it is a function. `onValueChange` and not `onChange`,
because React reserves the latter for its own synthetic system and wires
it to the native `change`, so a Helix event named `Change` would never
fire at all. */
  onValueChange?: HelixToggleGroup["onValueChange"];

  /** Fired when an item is chosen. Dispatched by the item and listened for here. */
  "onhelix-select"?: (e: HelixToggleGroupHelixSelectElementEvent) => void;
};

export type HelixToggleGroupSolidJsProps = {
  /** How much chrome the group carries around its items. */
  "prop:appearance"?: HelixToggleGroup["appearance"];
  /** The value the markup declared, which is where a reset returns to. */
  "attr:default-value"?: HelixToggleGroup["defaultValue"];
  /** The value the markup declared, which is where a reset returns to. */
  "prop:defaultValue"?: HelixToggleGroup["defaultValue"];
  /** What the control holds now, and what its form submits.

One property, not two. Reading gives the real value whichever mode the
control is in, so `input.value` answers the question anyone asking it
meant. Writing hands ownership to the consumer, which is what
`<helix-input value="x">` says too, and matches what a controlled input
means in React: the value is theirs and the control waits to be told.
`default-value` is how markup seeds one it does not want to own.

The same shape as the other three mixins, which is the point of them
being four of a kind rather than four of three kinds. */
  "prop:value"?: HelixToggleGroup["value"];
  /** Help under the control, shown while there is nothing wrong. */
  "prop:hint"?: HelixToggleGroup["hint"];
  /** What is wrong, in the reader's words rather than the browser's. */
  "prop:feedback"?: HelixToggleGroup["feedback"];
  /** The accessible name, and the fallback for the `label` slot. */
  "prop:label"?: HelixToggleGroup["label"];
  /** Whether the form refuses to submit without it. */
  "prop:required"?: HelixToggleGroup["required"];
  /** Name the group reports under when its form is submitted. */
  "prop:name"?: HelixToggleGroup["name"];
  /** Whether the control is non-interactive.

Reflected, because the styled tier selects on it, and mirrored to
`aria-disabled` rather than removing the element from the accessibility
tree, so a screen reader can still announce that the control exists. */
  "prop:disabled"?: HelixToggleGroup["disabled"];
  /** The consumer's callback, invoked after the value is applied.

Not an attribute: it is a function. `onValueChange` and not `onChange`,
because React reserves the latter for its own synthetic system and wires
it to the native `change`, so a Helix event named `Change` would never
fire at all. */
  "prop:onValueChange"?: HelixToggleGroup["onValueChange"];
  /** Fired when an item is chosen. Dispatched by the item and listened for here. */
  "on:helix-select"?: (e: HelixToggleGroupHelixSelectElementEvent) => void;

  /** Set the innerHTML of the element */
  innerHTML?: string;
  /** Set the textContent of the element */
  textContent?: string | number;
};

/** `HelixToggle` component event */
export type HelixToggleElementEvent<E = Event> = TypedEvent<HelixToggle, E>;
/** `helix-select` event type */
export type HelixToggleHelixSelectElementEvent =
  HelixToggleElementEvent<HelixSelectEvent>;

export type HelixToggleProps = {
  /** Identifies the item to the group. */
  value?: HelixToggle["value"];
  /** Whether this item is the current one. */
  selected?: HelixToggle["selected"];
  /** Whether the item can be chosen. */
  disabled?: HelixToggle["disabled"];

  /** Fired when the item is chosen. */
  "onhelix-select"?: (e: HelixToggleHelixSelectElementEvent) => void;
};

export type HelixToggleSolidJsProps = {
  /** Identifies the item to the group. */
  "prop:value"?: HelixToggle["value"];
  /** Whether this item is the current one. */
  "prop:selected"?: HelixToggle["selected"];
  /** Whether the item can be chosen. */
  "prop:disabled"?: HelixToggle["disabled"];
  /** Fired when the item is chosen. */
  "on:helix-select"?: (e: HelixToggleHelixSelectElementEvent) => void;

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

/** `HelixTooltip` component event */
export type HelixTooltipElementEvent<E = Event> = TypedEvent<HelixTooltip, E>;
/** `helix-open` event type */
export type HelixTooltipHelixOpenElementEvent =
  HelixTooltipElementEvent<HelixOpenEvent>;
/** `helix-close` event type */
export type HelixTooltipHelixCloseElementEvent =
  HelixTooltipElementEvent<HelixCloseEvent>;

export type HelixTooltipProps = {
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
  open?: HelixTooltip["open"];
  /** Initial open state for uncontrolled use, where nothing declared one. */
  "default-open"?: HelixTooltip["defaultOpen"];
  /** Initial open state for uncontrolled use, where nothing declared one. */
  defaultOpen?: HelixTooltip["defaultOpen"];
  /** The text shown in the bubble.

The common case, and the fallback for the `content` slot: slot something
there and it replaces this. Both cannot show at once, which is the point
of using fallback content rather than rendering whichever is present. */
  content?: HelixTooltip["content"];
  /** Preferred side. It moves if that side does not fit. */
  placement?: HelixTooltip["placement"];
  /** Space between the trigger and the bubble, in pixels. */
  offset?: HelixTooltip["offset"];
  /** Whether the tooltip never shows. */
  disabled?: HelixTooltip["disabled"];
  /** How long the pointer must rest before the bubble appears, in milliseconds.

Without one, sweeping across a row of controls flashes a tooltip for each
of them, which is noise rather than help. Focus opens with no delay: a
keyboard reader arriving on a control has already committed to it. */
  delay?: HelixTooltip["delay"];
  /** How long the bubble stays after the pointer leaves, in milliseconds. */
  "delay-out"?: HelixTooltip["delayOut"];
  /** How long the bubble stays after the pointer leaves, in milliseconds. */
  delayOut?: HelixTooltip["delayOut"];
  /** The consumer's callback, invoked after the state is applied.

Not an attribute: it is a function. And not reachable from React's JSX,
which reserves every `on[A-Z]` prop for its own event system and drops
what it does not recognise; the generated wrapper listens for the events
instead. */
  onOpenChange?: HelixTooltip["onOpenChange"];

  /** Fired before the bubble shows, and cancelable. */
  "onhelix-open"?: (e: HelixTooltipHelixOpenElementEvent) => void;
  /** Fired before it hides, and cancelable. */
  "onhelix-close"?: (e: HelixTooltipHelixCloseElementEvent) => void;
};

export type HelixTooltipSolidJsProps = {
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
  "prop:open"?: HelixTooltip["open"];
  /** Initial open state for uncontrolled use, where nothing declared one. */
  "bool:default-open"?: HelixTooltip["defaultOpen"];
  /** Initial open state for uncontrolled use, where nothing declared one. */
  "prop:defaultOpen"?: HelixTooltip["defaultOpen"];
  /** The text shown in the bubble.

The common case, and the fallback for the `content` slot: slot something
there and it replaces this. Both cannot show at once, which is the point
of using fallback content rather than rendering whichever is present. */
  "prop:content"?: HelixTooltip["content"];
  /** Preferred side. It moves if that side does not fit. */
  "prop:placement"?: HelixTooltip["placement"];
  /** Space between the trigger and the bubble, in pixels. */
  "prop:offset"?: HelixTooltip["offset"];
  /** Whether the tooltip never shows. */
  "prop:disabled"?: HelixTooltip["disabled"];
  /** How long the pointer must rest before the bubble appears, in milliseconds.

Without one, sweeping across a row of controls flashes a tooltip for each
of them, which is noise rather than help. Focus opens with no delay: a
keyboard reader arriving on a control has already committed to it. */
  "prop:delay"?: HelixTooltip["delay"];
  /** How long the bubble stays after the pointer leaves, in milliseconds. */
  "attr:delay-out"?: HelixTooltip["delayOut"];
  /** How long the bubble stays after the pointer leaves, in milliseconds. */
  "prop:delayOut"?: HelixTooltip["delayOut"];
  /** The consumer's callback, invoked after the state is applied.

Not an attribute: it is a function. And not reachable from React's JSX,
which reserves every `on[A-Z]` prop for its own event system and drops
what it does not recognise; the generated wrapper listens for the events
instead. */
  "prop:onOpenChange"?: HelixTooltip["onOpenChange"];
  /** Fired before the bubble shows, and cancelable. */
  "on:helix-open"?: (e: HelixTooltipHelixOpenElementEvent) => void;
  /** Fired before it hides, and cancelable. */
  "on:helix-close"?: (e: HelixTooltipHelixCloseElementEvent) => void;

  /** Set the innerHTML of the element */
  innerHTML?: string;
  /** Set the textContent of the element */
  textContent?: string | number;
};

/** `HelixTreeItem` component event */
export type HelixTreeItemElementEvent<E = Event> = TypedEvent<HelixTreeItem, E>;
/** `helix-select` event type */
export type HelixTreeItemHelixSelectElementEvent =
  HelixTreeItemElementEvent<HelixSelectEvent>;

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
  "onhelix-select"?: (e: HelixTreeItemHelixSelectElementEvent) => void;
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
  "on:helix-select"?: (e: HelixTreeItemHelixSelectElementEvent) => void;

  /** Set the innerHTML of the element */
  innerHTML?: string;
  /** Set the textContent of the element */
  textContent?: string | number;
};

/** `HelixTree` component event */
export type HelixTreeElementEvent<E = Event> = TypedEvent<HelixTree, E>;
/** `helix-select` event type */
export type HelixTreeHelixSelectElementEvent =
  HelixTreeElementEvent<HelixSelectEvent>;

export type HelixTreeProps = {
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
  active?: HelixTree["active"];
  /** Initial item for uncontrolled use. Ignored once `active` is written. */
  "default-active"?: HelixTree["defaultActive"];
  /** Initial item for uncontrolled use. Ignored once `active` is written. */
  defaultActive?: HelixTree["defaultActive"];
  /** Which end of a row the chevron sits at.

Unset is the start, which is what a tree of folders looks like. `end` puts
it at the far side, where it reads as a control belonging to the row rather
than as part of the name, and it lets every label start at one place
without a row that has no chevron reserving space for one.

On the tree rather than on each item, because a row whose chevron sat
somewhere different from its siblings' would be a mistake, not a choice. */
  chevron?: HelixTree["chevron"];
  /** Accessible name for the tree. */
  label?: HelixTree["label"];
  /** The consumer's callback, invoked after the change is applied. */
  onActiveChange?: HelixTree["onActiveChange"];

  /** Fired when an item is chosen. Dispatched by the item and listened for here, because the tree is what a consumer holds a reference to. */
  "onhelix-select"?: (e: HelixTreeHelixSelectElementEvent) => void;
};

export type HelixTreeSolidJsProps = {
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
  "prop:active"?: HelixTree["active"];
  /** Initial item for uncontrolled use. Ignored once `active` is written. */
  "attr:default-active"?: HelixTree["defaultActive"];
  /** Initial item for uncontrolled use. Ignored once `active` is written. */
  "prop:defaultActive"?: HelixTree["defaultActive"];
  /** Which end of a row the chevron sits at.

Unset is the start, which is what a tree of folders looks like. `end` puts
it at the far side, where it reads as a control belonging to the row rather
than as part of the name, and it lets every label start at one place
without a row that has no chevron reserving space for one.

On the tree rather than on each item, because a row whose chevron sat
somewhere different from its siblings' would be a mistake, not a choice. */
  "prop:chevron"?: HelixTree["chevron"];
  /** Accessible name for the tree. */
  "prop:label"?: HelixTree["label"];
  /** The consumer's callback, invoked after the change is applied. */
  "prop:onActiveChange"?: HelixTree["onActiveChange"];
  /** Fired when an item is chosen. Dispatched by the item and listened for here, because the tree is what a consumer holds a reference to. */
  "on:helix-select"?: (e: HelixTreeHelixSelectElementEvent) => void;

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
   * - `chevron-placement`/`chevronPlacement`: Where the open indicator sits, or whether there is one.
   *
   * `auto` resolves to `end`, which is where a reader scanning a list of
   * summaries expects it: the label starts at the same x on every row, and the
   * indicator is found once at the edge rather than shifting with the text.
   * `start` is for a tree-like reading, where the indicator leads the label.
   * `none` is for a row that carries its own affordance and would otherwise
   * have two.
   * - `onOpenChange`: The consumer's callback, invoked after the state is applied.
   *
   * Not an attribute: it is a function. And not reachable from React's JSX,
   * which reserves every `on[A-Z]` prop for its own event system and drops
   * what it does not recognise; the generated wrapper listens for the events
   * instead. (property only)
   *
   * ## Events
   *
   * Events that will be emitted by the component.
   *
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
   * - `requestOpen(next: boolean) => boolean`: Requests an open-state change, and reports whether it was applied.
   *
   * Announces before it acts, so `preventDefault()` on the `helix-open` or
   * `helix-close` is a refusal and nothing moves. In uncontrolled mode the
   * element then updates itself; in controlled mode it applies nothing and
   * waits for the consumer to pass a new `open`, which is what "controlled"
   * means.
   * - `toggleOpen() => boolean`: Requests the opposite of the current state.
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
   * Full width and flat, with the severity carried by a tinted fill and a
   * hairline beneath rather than by a border on four sides: an announcement is a
   * band across the top of the page, not a box that happens to be wide.
   *
   * ## Attributes & Properties
   *
   * Component attributes and properties that can be applied to the element or by using JavaScript.
   *
   * - `severity`: What kind of attention the message needs.
   * - `dismissible`: Whether the reader can close it.
   * - `dismiss-label`/`dismissLabel`: Accessible name for the dismiss control.
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
   * ## CSS Custom Properties
   *
   * CSS variables available for styling the component.
   *
   * - `--announcement-inset`: Inline padding, matched to the page. (default: `undefined`)
   *
   * ## CSS Parts
   *
   * Custom selectors for styling elements within the component.
   *
   * - `content`: The message region.
   * - `actions`: The trailing action region.
   * - `dismiss`: The control that asks to close.
   */
  "helix-announcement": Partial<
    HelixAnnouncementProps & BaseProps<HelixAnnouncement> & BaseEvents
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
   * - `brand`: Wordmark or logo, at the inline start.
   * - `(default)`: Primary navigation.
   * - `actions`: Trailing actions, such as a call to action.
   * - `start`: Leading content, usually a wordmark.
   * - `end`: Trailing content.
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
   * - `content`: The centered row inside the banner.
   * - `nav`: The navigation region.
   * - `row`: The centered row inside the banner.
   * - `start`: The leading region.
   * - `end`: The trailing region.
   */
  "helix-app-header": Partial<
    HelixAppHeaderProps & BaseProps<HelixAppHeader> & BaseEvents
  >;

  /**
   * They overlap by a step of space, which is enough to read as a stack without
   * the faces occluding each other. Each carries a ring in the page's own
   * background colour, because a stack with no separation between its members
   * reads as one shape rather than several: the ring is what makes the edge of
   * each avatar visible against the one behind it.
   *
   * Each avatar is drawn over the one before it, which falls out of document
   * order and needs no `z-index`. The familiar trick for putting the *first*
   * avatar on top is `row-reverse`, and it also reverses the row: the person
   * written first appears last. A facepile whose reading order is the reverse of
   * its markup is the worse trade of the two.
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
   * ## CSS Custom Properties
   *
   * CSS variables available for styling the component.
   *
   * - `--avatar-group-overlap`: How far each avatar sits over the one before it. (default: `undefined`)
   * - `--avatar-group-ring-color`: The separation drawn between one avatar and the next. (default: `undefined`)
   *
   * ## CSS Parts
   *
   * Custom selectors for styling elements within the component.
   *
   * - `overflow`: The count of avatars past `max`.
   */
  "helix-avatar-group": Partial<
    HelixAvatarGroupProps & BaseProps<HelixAvatarGroup> & BaseEvents
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
   * The indicator carries a ring in the page's own background color, so it stays
   * legible where it overlaps the thing it is pinned to. Without it a dark badge
   * on a dark icon reads as a bite taken out of the icon.
   *
   * ## Attributes & Properties
   *
   * Component attributes and properties that can be applied to the element or by using JavaScript.
   *
   * - `appearance`: How much attention the mark asks for.
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
   * ## CSS Custom Properties
   *
   * CSS variables available for styling the component.
   *
   * - `--badge-background-color`: Fill of the indicator. (default: `undefined`)
   * - `--badge-offset`: Pulls the mark in from the corner, along both axes. (default: `undefined`)
   * - `--badge-ring-color`: The ring separating it from what is behind. (default: `undefined`)
   *
   * ## CSS Parts
   *
   * Custom selectors for styling elements within the component.
   *
   * - `indicator`: The count, or the dot when there is no value.
   */
  "helix-badge": Partial<HelixBadgeProps & BaseProps<HelixBadge> & BaseEvents>;

  /**
   * Set larger than body text on the display face, because a pulled quotation is
   * a change of voice and the type is what says so. No quotation marks are drawn:
   * the size and the space around it already set the passage apart, and marks on
   * top of that are the same thing said twice.
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
   * ## CSS Custom Properties
   *
   * CSS variables available for styling the component.
   *
   * - `--blockquote-size`: Size of the quoted passage. (default: `undefined`)
   *
   * ## CSS Parts
   *
   * Custom selectors for styling elements within the component.
   *
   * - `blockquote`: The quotation.
   * - `attribution`: The footer carrying the source.
   */
  "helix-blockquote": Partial<
    HelixBlockquoteProps & BaseProps<HelixBlockquote> & BaseEvents
  >;

  /**
   * The separator is hidden on the first item with `:host(:first-child)`, so no
   * item needs to know its own index and the parent needs no coordination.
   *
   * The link carries `data-link="quiet"`, the recipe navigation uses everywhere
   * else, which is what owns its color. Under the pointer it reads as a subtle
   * button. That part is styled from in here: the base layer sets color and
   * text-decoration on an anchor and nothing else, so the outer tree wins those
   * and leaves box and background to `::slotted`.
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
   * - `(default)`: The step: a link, or the text of the current page.
   * - `separator`: Replaces the chevron shown before this item.
   *
   * ## CSS Custom Properties
   *
   * CSS variables available for styling the component.
   *
   * - `--breadcrumbs-separator-color`: Color of the chevron. (default: `undefined`)
   * - `--breadcrumb-hover-color`: Fill behind a step under the pointer. (default: `undefined`)
   *
   * ## CSS Parts
   *
   * Custom selectors for styling elements within the component.
   *
   * - `separator`: The separator preceding the item.
   */
  "helix-breadcrumb": Partial<
    HelixBreadcrumbProps & BaseProps<HelixBreadcrumb> & BaseEvents
  >;

  /**
   * A single wrapping line by default. The trail wraps rather than scrolling,
   * because a truncated path tells the reader less than a two-line one.
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
   * The buttons are joined into a single shape: the outer corners keep their
   * radius, the inner ones lose it, and adjacent borders collapse into one line.
   *
   * That joining is in the base layer, paired with `data-button` the way the
   * button's own box is, because the corner belongs to the control inside each
   * button's shadow root and a rule in here cannot reach it. The same rule
   * therefore serves a consumer's own anchor styled as a button.
   *
   * ## Attributes & Properties
   *
   * Component attributes and properties that can be applied to the element or by using JavaScript.
   *
   * - `appearance`: Whether the buttons are one bar or a spaced row.
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
  "helix-button-group": Partial<
    HelixButtonGroupProps & BaseProps<HelixButtonGroup> & BaseEvents
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
   *
   * - `primary` is the one action a region is for, and there should be one. Two
   *   primary buttons are two things claiming to be the most important, and the
   *   reader has to work out which of you meant it.
   * - `secondary` is an action that is real but not the point, which is most
   *   buttons on most pages. A page whose every button is primary has said
   *   nothing about which one matters.
   * - `tertiary` is quiet enough to sit in a row of them without the row
   *   becoming loud: for actions that are available rather than suggested.
   *   Cancel, dismiss, the contents of a toolbar.
   * - `danger` says the action is destructive before the confirmation does. The
   *   shape of the control is what a reader recognises at a glance, where a red
   *   word inside a neutral button is something they have to read first.
   *
   * This is also where emphasis comes from, rather than size: a filled primary
   * button says "this one matters" far louder than eight more pixels would.
   * - `type`: What activating the button does to its form.
   * - `label`: Accessible name, for a button whose content is not text.
   *
   * Lives here rather than only on `IconButton` so the two share one render.
   * An icon-only button without it is a control a screen reader announces as
   * "button" and nothing else.
   * - `command`: What to send when the button is activated, and what to send it to.
   *
   * The platform's invoker attributes, forwarded onto the inner `<button>`
   * rather than left on the host: only a real button is recognised as an
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
   * - `button`: The inner control.
   */
  "helix-button": Partial<
    HelixButtonProps & BaseProps<HelixButton> & BaseEvents
  >;

  /**
   * Six week rows always, so the grid keeps one height and a month change does
   * not move whatever sits beneath it.
   *
   * The column track is wider than the day, and the day is centred in it. The
   * difference is the space between days, which belongs to the track rather than
   * to a `gap`, so a range can paint across the whole track and stay continuous.
   *
   * Days from the neighbouring months stay in place and stay selectable, marked
   * quieter rather than hidden, so the first and last weeks are whole and the
   * grid reads as a continuous run of dates.
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
   * - `name`: Name the calendar reports under when its form is submitted.
   *
   * Absent means it submits nothing, which is what makes it safe to put one
   * inside something else. `DatePicker` will hold the name and the calendar in
   * its panel will stay quiet, the same way `Select` holds the name and the
   * `Listbox` inside it does not.
   * - `mode`: How many dates can be held at once.
   * - `months`: How many months to show, side by side.
   * - `locale`: Locale for month and day names. Absent uses the runtime's own.
   * - `disable-dates`/`disableDates`: Dates that cannot be chosen, comma separated, as `YYYY-MM-DD`.
   * - `disable-days`/`disableDays`: Days of the week that cannot be chosen, comma separated, `0` to `6`.
   * - `invalid`: Whether the current selection fails validation.
   * - `month`: The month on show, as `YYYY-MM`. Follows `value`, then the current month.
   * - `min`: Earliest selectable date, as `YYYY-MM-DD`.
   * - `max`: Latest selectable date, as `YYYY-MM-DD`.
   * - `label`: Accessible name for the grid.
   * - `first-day-of-week`/`firstDayOfWeek`: First column of the week, `0` for Sunday through `6` for Saturday.
   * - `disabled`: Whether the control is non-interactive.
   *
   * Reflected, because the styled tier selects on it, and mirrored to
   * `aria-disabled` rather than removing the element from the accessibility
   * tree, so a screen reader can still announce that the control exists.
   * - `onValueChange`: The consumer's callback, invoked after the value is applied.
   *
   * Not an attribute: it is a function. `onValueChange` and not `onChange`,
   * because React reserves the latter for its own synthetic system and wires
   * it to the native `change`, so a Helix event named `Change` would never
   * fire at all. (property only)
   * - `form`: The form this control belongs to, if any. (property only) (readonly)
   * - `labels`: Labels associated with this control. (property only) (readonly)
   *
   * ## Events
   *
   * Events that will be emitted by the component.
   *
   * - `helix-change`: Fired before the dates change, and cancelable. It was `helix-select`, and it moved when the calendar became a form control. A control whose value changes dispatches `helix-change` here: `Input`, `Select`, `Listbox`, `Radio.Group` and `Toggle.Group` all do, and a calendar submitting a date is the same kind of thing. `helix-select` stays what it is elsewhere, which is a row or an item being chosen in something that reports no value at all, such as `Menu` or `Tree`.
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
   *
   * ## CSS Custom Properties
   *
   * CSS variables available for styling the component.
   *
   * - `--calendar-day-size`: Width and height of a day. (default: `undefined`)
   * - `--calendar-track-size`: Width of a column, which is what sets the space between days. (default: `undefined`)
   * - `--calendar-row-size`: Height of a week row. (default: `undefined`)
   * - `--calendar-selected-color`: Fill behind a selected day. (default: `undefined`)
   * - `--calendar-range-color`: Band behind the days in a range. (default: `undefined`)
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
  "helix-calendar": Partial<
    HelixCalendarProps & BaseProps<HelixCalendar> & BaseEvents
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
   * - `title`: A heading above the content.
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
   * element you slotted, not a wrapper around it.
   *
   * ## Attributes & Properties
   *
   * Component attributes and properties that can be applied to the element or by using JavaScript.
   *
   * - `appearance`: How the card separates itself from the page.
   *
   * - `outlined` is the default, and a hairline is usually enough. It costs
   *   less attention than a shadow: a screen of shadowed cards reads as a stack
   *   of things floating, none of them settled.
   * - `elevated` is lifted off the page instead of framed, for a card on a
   *   coloured or busy background, where a line has to compete with whatever is
   *   behind it and a shadow does not.
   * - `plain` has no frame at all: the card is a layout and whatever it sits in
   *   is the surface. For a card inside something already bounded, where a
   *   second box adds a line and no meaning.
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
   * The track scroll-snaps, so a drag and a trackpad swipe move it with the
   * browser's own momentum and the controls only have to scroll.
   *
   * Slides take the full track by default. `per-view` fits more than one across,
   * which is what a run of cards wants rather than a run of full-width panels.
   *
   * ## Attributes & Properties
   *
   * Component attributes and properties that can be applied to the element or by using JavaScript.
   *
   * - `appearance`: Whether the controls sit under the slides or on them.
   * - `per-view`/`perView`: How many slides are shown across the track at once. Absent shows one.
   *
   * No default, because it reflects. A reflected property with a value writes
   * its attribute on upgrade, and the host then carries something a consumer's
   * server markup never had, which React reports as a mismatch. The one-across
   * case is the absent attribute, and the styles read it that way.
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
   * ## CSS Custom Properties
   *
   * CSS variables available for styling the component.
   *
   * - `--carousel-gap`: Space between slides. (default: `undefined`)
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
  "helix-carousel": Partial<
    HelixCarouselProps & BaseProps<HelixCarousel> & BaseEvents
  >;

  /**
   * A column by default, which is what a list of choices wants: the eye scans one
   * line per answer rather than hunting along a row.
   *
   * ## Attributes & Properties
   *
   * Component attributes and properties that can be applied to the element or by using JavaScript.
   *
   * - `orientation`: Which way the boxes run.
   * - `hint`: Help under the control, shown while there is nothing wrong.
   * - `feedback`: What is wrong, in the reader's words rather than the browser's.
   * - `label`: The accessible name, and the fallback for the `label` slot.
   * - `required`: Whether the form refuses to submit without it.
   * - `disabled`: Whether the whole set is out of play.
   *
   * Its own property rather than an inherited one, because this group is not
   * form-associated and `disabled` arrives with `HelixFormElement`. The boxes
   * are each form-associated and have their own, which is exactly why the two
   * have to be reconciled rather than simply written over.
   * - `name`: Name submitted with the form, given to every box that has none.
   * - `value`: The checked values, comma separated.
   * - `resolvedFeedback`: The message actually shown: the consumer's, or the platform's, or none. (property only) (readonly)
   * - `describedBy`: Id of the description node, for `aria-describedby` on the control.
   *
   * One at a time, because only one of the two is ever rendered. Naming both
   * would point a screen reader at an id that resolves to nothing, which it
   * reads as a description it cannot find. (property only) (readonly)
   * - `boxes`: The boxes, in light-DOM order. Client only: the server has no tree. (property only) (readonly)
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
   * ## CSS Custom Properties
   *
   * CSS variables available for styling the component.
   *
   * - `--checkbox-group-gap`: Space between the boxes. (default: `undefined`)
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
  "helix-checkbox-group": Partial<
    HelixCheckboxGroupProps & BaseProps<HelixCheckboxGroup> & BaseEvents
  >;

  /**
   * The box is the native input, restyled rather than replaced, so the tick and
   * the indeterminate dash are the browser's own and the control stays a control
   * for anything reading the page.
   *
   * The label sits beside it and the whole thing is the click target, which is
   * what a native `<label>` wrapping a checkbox gives and what a reader expects.
   *
   * ## Attributes & Properties
   *
   * Component attributes and properties that can be applied to the element or by using JavaScript.
   *
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
   * - `name`: Name submitted with the form.
   * - `value`: Value submitted when the box is checked.
   * - `indeterminate`: Whether the box shows as neither checked nor unchecked.
   *
   * Presentation only. It never submits, and the first change resolves it.
   * - `disabled`: Whether the control is non-interactive.
   *
   * Reflected, because the styled tier selects on it, and mirrored to
   * `aria-disabled` rather than removing the element from the accessibility
   * tree, so a screen reader can still announce that the control exists.
   * - `onCheckedChange`: The consumer's callback, invoked after the state is applied.
   *
   * Not an attribute: it is a function. And not reachable from React's JSX,
   * which reserves every `on[A-Z]` prop for its own event system and drops
   * what it does not recognise; the generated wrapper listens for the event
   * instead. (property only)
   * - `resolvedFeedback`: The message actually shown: the consumer's, or the platform's, or none. (property only) (readonly)
   * - `describedBy`: Id of the description node, for `aria-describedby` on the control.
   *
   * One at a time, because only one of the two is ever rendered. Naming both
   * would point a screen reader at an id that resolves to nothing, which it
   * reads as a description it cannot find. (property only) (readonly)
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
   * - `formResetCallback() => void`: Returns the box to the state its markup declared.
   * - `formStateRestoreCallback(state: string | null) => void`: Restores the box when the browser brings a form back.
   *
   * ## CSS Custom Properties
   *
   * CSS variables available for styling the component.
   *
   * - `--checkbox-size`: Width and height of the box. (default: `undefined`)
   * - `--checkbox-checked-color`: Fill of a ticked box. (default: `undefined`)
   *
   * ## CSS Parts
   *
   * Custom selectors for styling elements within the component.
   *
   * - `box`: The frame the input is painted as, and the mark sits over.
   * - `control`: The input.
   * - `label`: The label beside it.
   * - `mark`: The tick, or the dash when the box is indeterminate.
   */
  "helix-checkbox": Partial<
    HelixCheckboxProps & BaseProps<HelixCheckbox> & BaseEvents
  >;

  /**
   * The panel is `surface-overlay` with a shadow, because that is what it is: a
   * thing over the page rather than on it. The scrim is drawn on `::backdrop`,
   * which is the platform's own element for it and sits in the top layer with the
   * dialog rather than being a div somebody positioned.
   *
   * ## Attributes & Properties
   *
   * Component attributes and properties that can be applied to the element or by using JavaScript.
   *
   * - `appearance`: How wide the panel is allowed to be.
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
   * - `label`: Accessible name for the dialog.
   * - `persistent`: Whether Escape and the backdrop can close it.
   *
   * Off for a dialog that must be answered. It does not disable the close
   * control a consumer slots in: refusing to be dismissed is not the same as
   * refusing to be closed, and a dialog with no way out at all is a trap.
   * - `onOpenChange`: The consumer's callback, invoked after the state is applied.
   *
   * Not an attribute: it is a function. And not reachable from React's JSX,
   * which reserves every `on[A-Z]` prop for its own event system and drops
   * what it does not recognise; the generated wrapper listens for the events
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
   * - `requestOpen(next: boolean) => boolean`: Requests an open-state change, and reports whether it was applied.
   *
   * Announces before it acts, so `preventDefault()` on the `helix-open` or
   * `helix-close` is a refusal and nothing moves. In uncontrolled mode the
   * element then updates itself; in controlled mode it applies nothing and
   * waits for the consumer to pass a new `open`, which is what "controlled"
   * means.
   * - `toggleOpen() => boolean`: Requests the opposite of the current state.
   * - `show() => void`: Moves focus into the dialog and makes the rest of the page inert.
   * - `close() => void`: Asks to close, which a consumer may refuse.
   *
   * ## CSS Custom Properties
   *
   * CSS variables available for styling the component.
   *
   * - `--dialog-inline-size`: Width of the panel. (default: `undefined`)
   * - `--dialog-inset`: Padding inside the panel. (default: `undefined`)
   *
   * ## CSS Parts
   *
   * Custom selectors for styling elements within the component.
   *
   * - `dialog`: The native dialog element.
   */
  "helix-dialog": Partial<
    HelixDialogProps & BaseProps<HelixDialog> & BaseEvents
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
   * The panel translates and the scrim fades, both on transform and opacity only,
   * which is the one place motion is allowed to carry the work: the surface at
   * rest is flat and the movement is what says something happened.
   *
   * ## Attributes & Properties
   *
   * Component attributes and properties that can be applied to the element or by using JavaScript.
   *
   * - `appearance`: Removes the panel's own surface, for a drawer inside another surface.
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
   * - `onOpenChange`: The consumer's callback, invoked after the state is applied.
   *
   * Not an attribute: it is a function. And not reachable from React's JSX,
   * which reserves every `on[A-Z]` prop for its own event system and drops
   * what it does not recognise; the generated wrapper listens for the events
   * instead. (property only)
   *
   * ## Events
   *
   * Events that will be emitted by the component.
   *
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
   * A row is a full-width band rather than an inset pill, for the reason the
   * select's options are: it reaches both edges of the panel, so a highlight
   * lines up with the edge the eye is already following down the list.
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
   * ## CSS Custom Properties
   *
   * CSS variables available for styling the component.
   *
   * - `--drilldown-item-hover-color`: Fill when a row is under the pointer. (default: `undefined`)
   *
   * ## CSS Parts
   *
   * Custom selectors for styling elements within the component.
   *
   * - `item`: The row itself.
   * - `label`: The words.
   */
  "helix-drilldown-item": Partial<
    HelixDrilldownItemProps & BaseProps<HelixDrilldownItem> & BaseEvents
  >;

  /**
   * **The pages slide, and the direction is the point.** Both moves replace one
   * page with another, so with no motion a reader cannot tell whether they went
   * deeper or came back: the panel simply holds different words. Sliding in the
   * direction of travel says which happened, and it is most of the reason this is
   * a component rather than a menu with its trigger removed.
   *
   * An animation rather than a transition, because there is nothing to transition
   * from: the page arriving was not in the DOM a frame ago. Under
   * `prefers-reduced-motion` it becomes the instant swap `Menu` does.
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
   * ## CSS Custom Properties
   *
   * CSS variables available for styling the component.
   *
   * - `--drilldown-background`: Fill behind the pages. (default: `undefined`)
   * - `--drilldown-inline-size`: Width of the region. (default: `undefined`)
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
  "helix-drilldown": Partial<
    HelixDrilldownProps & BaseProps<HelixDrilldown> & BaseEvents
  >;

  /**
   * Centered and given room, because an empty view is the only thing on screen
   * and crowding it against the top edge makes the region look broken rather than
   * empty.
   *
   * ## Attributes & Properties
   *
   * Component attributes and properties that can be applied to the element or by using JavaScript.
   *
   * - `appearance`: Whether the state sits on a surface of its own.
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
   *
   * ## CSS Custom Properties
   *
   * CSS variables available for styling the component.
   *
   * - `--empty-inset`: Space around the whole block. (default: `undefined`)
   */
  "helix-empty": Partial<HelixEmptyProps & BaseProps<HelixEmpty> & BaseEvents>;

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
   * - `type`: What activating the button does to its form.
   * - `label`: Accessible name, for a button whose content is not text.
   *
   * Lives here rather than only on `IconButton` so the two share one render.
   * An icon-only button without it is a control a screen reader announces as
   * "button" and nothing else.
   * - `command`: What to send when the button is activated, and what to send it to.
   *
   * The platform's invoker attributes, forwarded onto the inner `<button>`
   * rather than left on the host: only a real button is recognised as an
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
   * The frame is the field rather than the input, so anything slotted at either
   * end sits inside the same box as the text and the focus ring is drawn once,
   * around the whole control, instead of around a smaller box within it.
   *
   * The input itself is the native one, stripped rather than replaced, so the
   * caret, the selection, the autofill, and the keyboard a phone chooses are all
   * the platform's.
   *
   * Height comes from the region, like every other control: `data-density` on
   * whatever holds it, not a `size` here. Invalid styling waits for
   * `:user-invalid`, because a field is not wrong before anyone has filled it in.
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
   * - `name`: Name submitted with the form.
   * - `placeholder`: Shown while the field is empty. Not a label: it goes when typing starts.
   * - `read-only`/`readOnly`: Whether the field refuses input while still submitting its value.
   * - `type`: What the field accepts, which decides the keyboard and the validation.
   * - `disabled`: Whether the control is non-interactive.
   *
   * Reflected, because the styled tier selects on it, and mirrored to
   * `aria-disabled` rather than removing the element from the accessibility
   * tree, so a screen reader can still announce that the control exists.
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
   * - `focus(options?: FocusOptions) => void`: Puts the caret in the field, the way a label pointing at one would.
   * - `select() => void`: Selects everything in the field.
   *
   * ## CSS Custom Properties
   *
   * CSS variables available for styling the component.
   *
   * - `--input-size`: Height of the field. (default: `undefined`)
   * - `--input-background-color`: Fill behind the text. (default: `undefined`)
   *
   * ## CSS Parts
   *
   * Custom selectors for styling elements within the component.
   *
   * - `field`: The box holding everything.
   * - `control`: The input itself.
   */
  "helix-input": Partial<HelixInputProps & BaseProps<HelixInput> & BaseEvents>;

  /**
   * Drawn as a physical key: a hairline, a sunken fill, and one inset shadow
   * along the bottom edge that reads as depth without becoming a picture of a
   * key.
   *
   * Sized in `em`, so it stays proportional to whatever it is set inside rather
   * than holding one size and looking wrong in a heading.
   *
   * ## Slots
   *
   * Areas where markup can be added to the component.
   *
   * - `(default)`: The key's label.
   *
   * ## CSS Custom Properties
   *
   * CSS variables available for styling the component.
   *
   * - `--kbd-background-color`: Fill of the key. (default: `undefined`)
   * - `--kbd-border-color`: Color of the hairline and the edge. (default: `undefined`)
   *
   * ## CSS Parts
   *
   * Custom selectors for styling elements within the component.
   *
   * - `kbd`: The key.
   */
  "helix-kbd": Partial<HelixKbdProps & BaseProps<HelixKbd> & BaseEvents>;

  /**
   * A grid rather than a flex row, so the supporting text lines up under the
   * label rather than under the leading icon. The leading and trailing regions
   * hold their own width and the middle takes the rest.
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
   * ## CSS Custom Properties
   *
   * CSS variables available for styling the component.
   *
   * - `--list-item-inset`: Padding inside the row. (default: `undefined`)
   */
  "helix-list-item": Partial<
    HelixListItemProps & BaseProps<HelixListItem> & BaseEvents
  >;

  /**
   * Rules between rows rather than around each one, so a list reads as one object
   * with divisions instead of as a stack of cards. `divided` is off by default,
   * because space alone separates rows perfectly well and a rule at every seam is
   * decoration doing what emptiness already does.
   *
   * ## Attributes & Properties
   *
   * Component attributes and properties that can be applied to the element or by using JavaScript.
   *
   * - `divided`: Whether a rule sits between rows.
   * - `label`: Accessible name for the set.
   *
   * ## Slots
   *
   * Areas where markup can be added to the component.
   *
   * - `(default)`: The rows.
   *
   * ## CSS Custom Properties
   *
   * CSS variables available for styling the component.
   *
   * - `--list-gap`: Space between rows. (default: `undefined`)
   */
  "helix-list": Partial<HelixListProps & BaseProps<HelixList> & BaseEvents>;

  /**
   * A framed, scrolling list with the field's three parts around it. The frame is
   * the list rather than the host, so a filter that empties it leaves a box with
   * a message in it rather than a border collapsing to nothing.
   *
   * `--listbox-max-block-size` is what makes it scroll rather than run down the
   * page. The keyboard brings the active option into that box itself, so a long
   * list moves under the reader rather than the reader moving to find it.
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
   * - `filter`: Text the options are matched against. Empty shows them all.
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
   * - `name`: Name the list reports under when its form is submitted.
   * - `empty-text`/`emptyText`: What is shown when a filter has hidden every option.
   * - `disabled`: Whether the control is non-interactive.
   *
   * Reflected, because the styled tier selects on it, and mirrored to
   * `aria-disabled` rather than removing the element from the accessibility
   * tree, so a screen reader can still announce that the control exists.
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
   * - `options`: Every option, in the order a reader meets them.
   *
   * Descendants rather than children, because a group puts a level between the
   * list and its options and the keyboard has to move through a grouped list
   * exactly as it moves through a flat one. (property only) (readonly)
   * - `values`: The chosen values, which is a list whether or not `multiple` is set. (property only) (readonly)
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
   * - `(default)`: The options, and any groups of them.
   * - `label`: Richer than a string.
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
   *
   * ## CSS Custom Properties
   *
   * CSS variables available for styling the component.
   *
   * - `--listbox-max-block-size`: How tall it gets before it scrolls. (default: `undefined`)
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
  "helix-listbox": Partial<
    HelixListboxProps & BaseProps<HelixListbox> & BaseEvents
  >;

  /**
   * The tick and the arrow hold their space whether or not they are showing, so
   * the labels in a menu start at one place and the rows read as a column rather
   * than as a ragged list.
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
   * ## CSS Custom Properties
   *
   * CSS variables available for styling the component.
   *
   * - `--menu-item-hover-color`: Fill under the pointer. (default: `undefined`)
   *
   * ## CSS Parts
   *
   * Custom selectors for styling elements within the component.
   *
   * - `item`: The row.
   * - `mark`: The trailing mark: a tick when checked, a caret when it opens a page. One column, because a row is never both.
   */
  "helix-menu-item": Partial<
    HelixMenuItemProps & BaseProps<HelixMenuItem> & BaseEvents
  >;

  /**
   * The surface is in the top layer, so it needs no `z-index` and cannot be
   * clipped by whatever it sits inside.
   *
   * A submenu replaces the page rather than opening beside it, so the panel stays
   * one panel and reads the same on a phone as on a desk.
   *
   * ## Attributes & Properties
   *
   * Component attributes and properties that can be applied to the element or by using JavaScript.
   *
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
   * - `placement`: Preferred side. It moves if that side does not fit.
   * - `offset`: Space between the trigger and the surface, in pixels.
   * - `label`: Accessible name for the surface.
   * - `back-label`/`backLabel`: What the row returning from a submenu reads.
   * - `onOpenChange`: The consumer's callback, invoked after the state is applied.
   *
   * Not an attribute: it is a function. And not reachable from React's JSX,
   * which reserves every `on[A-Z]` prop for its own event system and drops
   * what it does not recognise; the generated wrapper listens for the events
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
   * - `requestOpen(next: boolean) => boolean`: Requests an open-state change, and reports whether it was applied.
   *
   * Announces before it acts, so `preventDefault()` on the `helix-open` or
   * `helix-close` is a refusal and nothing moves. In uncontrolled mode the
   * element then updates itself; in controlled mode it applies nothing and
   * waits for the consumer to pass a new `open`, which is what "controlled"
   * means.
   * - `toggleOpen() => boolean`: Requests the opposite of the current state.
   * - `show() => void`: Opens the menu.
   * - `hide() => void`: Closes the menu, and forgets which page was showing.
   *
   * ## CSS Custom Properties
   *
   * CSS variables available for styling the component.
   *
   * - `--menu-min-inline-size`: Narrowest the surface gets. (default: `undefined`)
   * - `--menu-background-color`: Fill of the surface. (default: `undefined`)
   *
   * ## CSS Parts
   *
   * Custom selectors for styling elements within the component.
   *
   * - `menu`: The surface.
   * - `header`: The bar above a submenu, holding the way back and its name.
   * - `back`: The control that returns from a submenu.
   * - `title`: The name of the submenu that is showing.
   */
  "helix-menu": Partial<HelixMenuProps & BaseProps<HelixMenu> & BaseEvents>;

  /**
   * One marker that travels, rather than a background that appears on whichever
   * destination is current. A fill that swaps is two things changing at once and
   * reads as a flicker; one that moves is a single object the eye follows, and it
   * says where the current page was as well as where it is.
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
   * ## CSS Custom Properties
   *
   * CSS variables available for styling the component.
   *
   * - `--nav-bar-indicator-color`: Fill of the traveling marker. (default: `undefined`)
   * - `--nav-bar-gap`: Space between destinations. (default: `undefined`)
   *
   * ## CSS Parts
   *
   * Custom selectors for styling elements within the component.
   *
   * - `nav`: The navigation landmark.
   * - `indicator`: The marker that travels to the current destination.
   */
  "helix-nav-bar": Partial<
    HelixNavBarProps & BaseProps<HelixNavBar> & BaseEvents
  >;

  /**
   * The heading is set small and quiet, because it is a divider that happens to
   * have words on it: a run of options is read as a list and the heading is what
   * tells you which list, not something to read on its own.
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
  "helix-option-group": Partial<
    HelixOptionGroupProps & BaseProps<HelixOptionGroup> & BaseEvents
  >;

  /**
   * Two states that look different on purpose: chosen, which is a fact about the
   * value, and active, which is where the keyboard is. A list that draws them the
   * same way leaves a reader arrowing through it unable to tell what they have
   * picked from what they are looking at.
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
   * ## CSS Custom Properties
   *
   * CSS variables available for styling the component.
   *
   * - `--option-active-color`: Wash behind the option the keyboard is on. (default: `undefined`)
   *
   * ## CSS Parts
   *
   * Custom selectors for styling elements within the component.
   *
   * - `item`: The row.
   * - `label`: The words.
   */
  "helix-option": Partial<
    HelixOptionProps & BaseProps<HelixOption> & BaseEvents
  >;

  /**
   * A rule down the leading edge with the current section lit along it, which is
   * the shape a table of contents has taken since printed marginalia: the line
   * says the list is one thing, and the lit segment says where in it you are.
   *
   * Nesting is the consumer's, expressed as `data-level` on a link. A page-nav
   * that read heading levels itself would have to look at the document, and the
   * document is not always where the headings are.
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
   * ## CSS Custom Properties
   *
   * CSS variables available for styling the component.
   *
   * - `--page-nav-indent`: How far each level is inset from the one above. (default: `undefined`)
   *
   * ## CSS Parts
   *
   * Custom selectors for styling elements within the component.
   *
   * - `nav`: The navigation landmark.
   */
  "helix-page-nav": Partial<
    HelixPageNavProps & BaseProps<HelixPageNav> & BaseEvents
  >;

  /**
   * A surface with an inset and a shadow, and nothing about what goes in it. The
   * inset is the panel's rather than the consumer's, which is the same call
   * `Dialog` and `Drawer` make and for the same reason: everyone was writing it,
   * and everyone was writing the same one.
   *
   * It arrives from the side it opened on. `data-placement` is written by the
   * positioning, so the panel knows which way it flipped and can animate from the
   * trigger rather than from a fixed direction that would be backwards half the
   * time.
   *
   * ## Attributes & Properties
   *
   * Component attributes and properties that can be applied to the element or by using JavaScript.
   *
   * - `appearance`: How the panel is framed.
   *
   * Unset is a surface with an inset, which is what a panel of content wants.
   * `plain` removes both, for a panel holding something that brings its own,
   * such as a list whose rows run to the edges.
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
   * - `label`: Accessible name for the panel.
   * - `offset`: Space between the trigger and the panel, in pixels.
   * - `placement`: Preferred side. It moves if that side does not fit.
   * - `onOpenChange`: The consumer's callback, invoked after the state is applied.
   *
   * Not an attribute: it is a function. And not reachable from React's JSX,
   * which reserves every `on[A-Z]` prop for its own event system and drops
   * what it does not recognise; the generated wrapper listens for the events
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
   * - `requestOpen(next: boolean) => boolean`: Requests an open-state change, and reports whether it was applied.
   *
   * Announces before it acts, so `preventDefault()` on the `helix-open` or
   * `helix-close` is a refusal and nothing moves. In uncontrolled mode the
   * element then updates itself; in controlled mode it applies nothing and
   * waits for the consumer to pass a new `open`, which is what "controlled"
   * means.
   * - `toggleOpen() => boolean`: Requests the opposite of the current state.
   * - `show() => void`: Opens the panel.
   * - `hide() => void`: Closes the panel and puts focus back on the trigger.
   *
   * ## CSS Custom Properties
   *
   * CSS variables available for styling the component.
   *
   * - `--popover-inset`: Space between the panel's edge and its contents. (default: `undefined`)
   * - `--popover-inline-size`: Width of the panel. (default: `undefined`)
   *
   * ## CSS Parts
   *
   * Custom selectors for styling elements within the component.
   *
   * - `popover`: The panel.
   */
  "helix-popover": Partial<
    HelixPopoverProps & BaseProps<HelixPopover> & BaseEvents
  >;

  /**
   * A track and the part of it that is done. The height comes from a token rather
   * than from a size property, for the reason the rest of the library gives about
   * controls: how heavy a bar is says something about the region it is in, and a
   * `--progress-size` on that region says it once.
   *
   * The fill transitions, which is worth more here than it looks. Progress
   * arrives in steps, often large ones, and a bar that jumps between them reads
   * as a series of unrelated states where one that travels reads as a single
   * thing advancing.
   *
   * ## Attributes & Properties
   *
   * Component attributes and properties that can be applied to the element or by using JavaScript.
   *
   * - `tone`: What the fill means.
   *
   * Unset is the accent, which is what progress usually is. `success` is for a
   * bar that has arrived somewhere good and stays on screen to say so, and
   * `danger` for a quota being consumed rather than a task being finished:
   * both are the same geometry reading the opposite way.
   * - `label`: Accessible name for what is in progress.
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
   * ## CSS Custom Properties
   *
   * CSS variables available for styling the component.
   *
   * - `--progress-size`: Thickness of the bar. (default: `undefined`)
   * - `--progress-color`: Fill of the part that is done. (default: `undefined`)
   * - `--progress-track-color`: Fill of the part that is not. (default: `undefined`)
   *
   * ## CSS Parts
   *
   * Custom selectors for styling elements within the component.
   *
   * - `track`: The full length the work is measured against.
   * - `indicator`: The part of it that is done.
   */
  "helix-progress": Partial<
    HelixProgressProps & BaseProps<HelixProgress> & BaseEvents
  >;

  /**
   * Takes the surrounding type rather than a size of its own, because a quotation
   * inside a paragraph is that paragraph's text with marks around it.
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
   * ## CSS Custom Properties
   *
   * CSS variables available for styling the component.
   *
   * - `--quote-color`: Color of the quoted text. (default: `undefined`)
   *
   * ## CSS Parts
   *
   * Custom selectors for styling elements within the component.
   *
   * - `quote`: The quotation.
   */
  "helix-quote": Partial<HelixQuoteProps & BaseProps<HelixQuote> & BaseEvents>;

  /**
   * The field's three parts, laid out the way every other field lays them out: a
   * question over the set, and one line under it that is help until something is
   * wrong. `orientation` lays out the choices and not the field, so a horizontal
   * group keeps its question above the row rather than beside the first choice.
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
   * - `name`: Name the group reports under when its form is submitted.
   * - `orientation`: Which way the choices run. A column reads one line per answer.
   * - `disabled`: Whether the control is non-interactive.
   *
   * Reflected, because the styled tier selects on it, and mirrored to
   * `aria-disabled` rather than removing the element from the accessibility
   * tree, so a screen reader can still announce that the control exists.
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
   * - `items`: The radios, in light-DOM order. Client only: the server has no tree. (property only) (readonly)
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
   *
   * ## CSS Custom Properties
   *
   * CSS variables available for styling the component.
   *
   * - `--radio-group-gap`: Space between the choices. (default: `undefined`)
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
  "helix-radio-group": Partial<
    HelixRadioGroupProps & BaseProps<HelixRadioGroup> & BaseEvents
  >;

  /**
   * A circle with a dot in it, drawn here rather than by the browser for the
   * reason the checkbox's box is: this is a `<button role="radio">`, so there was
   * never a native control to restyle, and the weight and the motion of the mark
   * are ours either way.
   *
   * The dot scales from nothing, like the checkbox's tick, so choosing shows
   * something happening. It has no colour, because colour is reserved for state
   * and being chosen is an answer rather than a state.
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
   * ## CSS Custom Properties
   *
   * CSS variables available for styling the component.
   *
   * - `--radio-size`: Diameter of the circle. (default: `undefined`)
   * - `--radio-mark-color`: Colour of the dot. (default: `undefined`)
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
  "helix-radio": Partial<HelixRadioProps & BaseProps<HelixRadio> & BaseEvents>;

  /**
   * The trigger wears the same frame as an `Input`, because in a form it stands
   * in a row with them and a control that looks like a button among fields reads
   * as an action rather than an answer.
   *
   * The panel is an overlay surface rather than a sunken one: it sits over the
   * page instead of on it, which is what its shadow says and what tells it apart
   * from the field it came out of.
   *
   * ## Attributes & Properties
   *
   * Component attributes and properties that can be applied to the element or by using JavaScript.
   *
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
   * - `filterable`: Whether the list can be narrowed by typing.
   *
   * Passed to the listbox rather than acted on here, because the listbox owns
   * the filtering, the empty state and the keyboard. This property existed and
   * was never read: it reflected, it type-checked, and nothing anywhere
   * rendered a field. API that does nothing is worse than API that is missing,
   * because a consumer sets it and believes it.
   * - `multiple`: Whether more than one option can be the answer.
   * - `name`: Name the control reports under when its form is submitted.
   * - `placeholder`: Shown on the trigger while nothing is chosen.
   * - `disabled`: Whether the control is non-interactive.
   *
   * Reflected, because the styled tier selects on it, and mirrored to
   * `aria-disabled` rather than removing the element from the accessibility
   * tree, so a screen reader can still announce that the control exists.
   * - `onOpenChange`: The consumer's callback, invoked after the state is applied.
   *
   * Not an attribute: it is a function. And not reachable from React's JSX,
   * which reserves every `on[A-Z]` prop for its own event system and drops
   * what it does not recognise; the generated wrapper listens for the events
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
   *
   * ## CSS Custom Properties
   *
   * CSS variables available for styling the component.
   *
   * - `--select-surface-max-block-size`: How tall the panel gets. (default: `undefined`)
   *
   * ## CSS Parts
   *
   * Custom selectors for styling elements within the component.
   *
   * - `label`: The question, over the trigger.
   * - `trigger`: The closed control, which says what is chosen.
   * - `surface`: The floating panel.
   * - `listbox`: The list inside it.
   * - `hint`: Help under the trigger.
   * - `feedback`: What is wrong with it.
   */
  "helix-select": Partial<
    HelixSelectProps & BaseProps<HelixSelect> & BaseEvents
  >;

  /**
   * A sweep rather than a pulse. A block fading in and out reads as something
   * broken; a highlight travelling across it reads as work in progress, and it is
   * the same one property animating either way.
   *
   * ## Attributes & Properties
   *
   * Component attributes and properties that can be applied to the element or by using JavaScript.
   *
   * - `shape`: What the missing content is shaped like.
   *
   * Unset is a block, which is what most missing things are.
   *
   * ## CSS Custom Properties
   *
   * CSS variables available for styling the component.
   *
   * - `--skeleton-size`: Diameter of the circle shape. (default: `undefined`)
   *
   * ## CSS Parts
   *
   * Custom selectors for styling elements within the component.
   *
   * - `skeleton`: The placeholder surface.
   */
  "helix-skeleton": Partial<
    HelixSkeletonProps & BaseProps<HelixSkeleton> & BaseEvents
  >;

  /**
   * The track and the thumb are the browser's own, restyled through the range
   * pseudo-elements rather than replaced. What that buys is everything a
   * hand-built slider has to reimplement and usually gets slightly wrong: the
   * drag, the keys, and a hit area sized by the platform for a finger.
   *
   * The filled part of the track is painted with a gradient driven by the
   * fraction the headless tier writes, rather than by a second element laid over
   * it. One element cannot be half one colour by any other means that survives
   * the thumb being dragged.
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
   * - `max`: The largest value the reader can choose.
   * - `min`: The smallest value the reader can choose.
   * - `name`: Name submitted with the form.
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
   * - `marker-labels`/`markerLabels`: Whether each mark says which value it stands at.
   * - `step`: How far one press of an arrow key moves it.
   * - `disabled`: Whether the control is non-interactive.
   *
   * Reflected, because the styled tier selects on it, and mirrored to
   * `aria-disabled` rather than removing the element from the accessibility
   * tree, so a screen reader can still announce that the control exists.
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
   * - `valueAsNumber`: The chosen value as a number, for anything doing arithmetic on it. (property only) (readonly)
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
   *
   * ## CSS Custom Properties
   *
   * CSS variables available for styling the component.
   *
   * - `--slider-thumb-color`: The handle. (default: `undefined`)
   * - `--slider-track-color`: The part not yet chosen. (default: `undefined`)
   * - `--slider-fill-color`: The part behind the thumb. (default: `undefined`)
   *
   * ## CSS Parts
   *
   * Custom selectors for styling elements within the component.
   *
   * - `field`: The row: the control and its readout.
   * - `control`: The range input.
   * - `output`: The current value, shown beside it.
   */
  "helix-slider": Partial<
    HelixSliderProps & BaseProps<HelixSlider> & BaseEvents
  >;

  /**
   * Sized in `em`, so it matches whatever text it sits beside without being told.
   * The color is `currentColor` for the same reason: a spinner inside a primary
   * button is on the accent, and one in body copy is not, and neither should have
   * to say so.
   *
   * ## Attributes & Properties
   *
   * Component attributes and properties that can be applied to the element or by using JavaScript.
   *
   * - `size`: Diameter relative to the surrounding text.
   * - `label`: Accessible name, announced while the work is outstanding.
   *
   * ## Slots
   *
   * Areas where markup can be added to the component.
   *
   * - `(default)`: A mark to sit still at the centre, usually a logo. Empty by default.
   *
   * ## CSS Custom Properties
   *
   * CSS variables available for styling the component.
   *
   * - `--spinner-size`: Diameter. Defaults to 1.5em. (default: `undefined`)
   * - `--spinner-color`: Color of the moving arc. (default: `undefined`)
   * - `--spinner-track-color`: Color of the circle behind it. (default: `undefined`)
   *
   * ## CSS Parts
   *
   * Custom selectors for styling elements within the component.
   *
   * - `svg`: The rotating circle pair.
   * - `mark`: The region holding what was slotted at the centre.
   * - `track`: The full circle behind the indicator.
   * - `indicator`: The arc that turns.
   */
  "helix-spinner": Partial<
    HelixSpinnerProps & BaseProps<HelixSpinner> & BaseEvents
  >;

  /**
   * Wraps rather than scrolls, and each figure keeps its own width instead of
   * every one taking an equal share: a set of figures is read by comparing them,
   * and equal columns make a four-digit number and a two-digit one look like the
   * same quantity.
   *
   * ## Attributes & Properties
   *
   * Component attributes and properties that can be applied to the element or by using JavaScript.
   *
   * - `divided`: Whether the figures are separated by a rule as well as by space.
   * - `label`: Accessible name for the set.
   *
   * ## Slots
   *
   * Areas where markup can be added to the component.
   *
   * - `(default)`: The stats.
   *
   * ## CSS Custom Properties
   *
   * CSS variables available for styling the component.
   *
   * - `--stat-group-gap`: Space between figures. (default: `undefined`)
   */
  "helix-stat-group": Partial<
    HelixStatGroupProps & BaseProps<HelixStatGroup> & BaseEvents
  >;

  /**
   * The value is set on the display face at a size the type scale does not reach,
   * because a figure is the one place on a page where the number is the design.
   * The label sits above it in the label ramp, quiet and wide-tracked, so the
   * pair reads as one object rather than as two lines of text.
   *
   * ## Slots
   *
   * Areas where markup can be added to the component.
   *
   * - `(default)`: The value.
   * - `label`: What the value measures.
   * - `unit`: The unit, set beside the value.
   * - `detail`: A change, comparison, or note under the label.
   *
   * ## CSS Custom Properties
   *
   * CSS variables available for styling the component.
   *
   * - `--stat-value-size`: Size of the figure. (default: `undefined`)
   */
  "helix-stat": Partial<HelixStatProps & BaseProps<HelixStat> & BaseEvents>;

  /**
   * A thumb travelling in a groove, which is the one place in the library colour
   * is used to say "on". A checkbox does not, because a tick is legible on its
   * own; a switch has no mark, so the fill is the whole of what distinguishes the
   * two states and there is nothing else for it to be.
   *
   * The input itself is the hit target and is drawn as the track, stretched over
   * it and invisible, so the press, the focus and the label forwarding are all
   * the platform's while the picture is ours.
   *
   * **Its height is `--helix-size-switch`, which is one step above the
   * checkbox's** at every density rather than the same as it. A checkbox is a box
   * with a mark in it; a switch is a track with a thumb inside it, and at the
   * checkbox's height the thumb has two pixels of groove around it and the whole
   * control reads as a small dash. The width follows the height, so setting
   * `--switch-height` widens it too and the proportion is not something a
   * consumer has to keep.
   *
   * ## Attributes & Properties
   *
   * Component attributes and properties that can be applied to the element or by using JavaScript.
   *
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
   * - `name`: Name submitted with the form.
   * - `value`: Value submitted when the switch is on.
   * - `disabled`: Whether the control is non-interactive.
   *
   * Reflected, because the styled tier selects on it, and mirrored to
   * `aria-disabled` rather than removing the element from the accessibility
   * tree, so a screen reader can still announce that the control exists.
   * - `onCheckedChange`: The consumer's callback, invoked after the state is applied.
   *
   * Not an attribute: it is a function. And not reachable from React's JSX,
   * which reserves every `on[A-Z]` prop for its own event system and drops
   * what it does not recognise; the generated wrapper listens for the event
   * instead. (property only)
   * - `resolvedFeedback`: The message actually shown: the consumer's, or the platform's, or none. (property only) (readonly)
   * - `describedBy`: Id of the description node, for `aria-describedby` on the control.
   *
   * One at a time, because only one of the two is ever rendered. Naming both
   * would point a screen reader at an id that resolves to nothing, which it
   * reads as a description it cannot find. (property only) (readonly)
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
   * - `formResetCallback() => void`: Returns the switch to the state its markup declared.
   *
   * ## CSS Custom Properties
   *
   * CSS variables available for styling the component.
   *
   * - `--switch-height`: Height of the track. The width follows it. (default: `undefined`)
   * - `--switch-width`: Length of the track, if not the derived one. (default: `undefined`)
   * - `--switch-on-color`: Fill when it is on. (default: `undefined`)
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
  "helix-switch": Partial<
    HelixSwitchProps & BaseProps<HelixSwitch> & BaseEvents
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
   * Styled as the header cell it is, and it carries the same rule and inset as
   * the cells beneath it so the heading and its column read as one line down the
   * table.
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
  "helix-table-column": Partial<
    HelixTableColumnProps & BaseProps<HelixTableColumn> & BaseEvents
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
   * - `onActiveChange`: The consumer's callback, invoked after the change is applied. (property only)
   *
   * ## Events
   *
   * Events that will be emitted by the component.
   *
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
   * - `tabs`: The tab list.
   * - `panels`: The panel container.
   */
  "helix-tabs": Partial<HelixTabsProps & BaseProps<HelixTabs> & BaseEvents>;

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
  "helix-tabs-tab": Partial<
    HelixTabsTabProps & BaseProps<HelixTabsTab> & BaseEvents
  >;

  /**
   * Five appearances. The fill is a tint of the status color, mixed with
   * `color-mix` rather than held as a token per status, so a theme that changes
   * the status colors gets the tints with them.
   *
   * ## Attributes & Properties
   *
   * Component attributes and properties that can be applied to the element or by using JavaScript.
   *
   * - `appearance`: Which status the tag reports.
   * - `dismissible`: Whether the tag offers a control to remove itself.
   * - `dismiss-label`/`dismissLabel`: Accessible name for the dismiss control.
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
   * - `helix-dismiss`: Fired when the reader asks to remove the tag.
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
   * - `dismiss`: The remove button, when `dismissible`.
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
   * `tone` stays separate, because color carries state rather than typography.
   * Folding it in would mean `caption-danger` and `label-primary` and the rest of
   * the cross product, which is the explosion `appearance` exists to prevent.
   *
   * ## Attributes & Properties
   *
   * Component attributes and properties that can be applied to the element or by using JavaScript.
   *
   * - `as`: Which element to render. Decides the outline and the semantics.
   * - `appearance`: Type treatment. Defaults to the one that matches `as`.
   * - `tone`: Color role. Separate from `appearance`, because color carries state.
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
   * The same frame an `Input` wears, so a form of mixed fields reads as one set
   * rather than as two kinds of box. What differs is the resize handle, which is
   * the platform's and is left alone on the block axis only: a field that can be
   * dragged wider than the form holding it is a field that breaks the layout.
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
   * - `auto-grow`/`autoGrow`: Whether the box follows its own content rather than scrolling.
   * - `name`: Name submitted with the form.
   * - `placeholder`: Shown while the field is empty. Not a label: it goes when typing starts.
   * - `read-only`/`readOnly`: Whether the field refuses input while still submitting its value.
   * - `rows`: How many lines the box is before anything is typed.
   * - `disabled`: Whether the control is non-interactive.
   *
   * Reflected, because the styled tier selects on it, and mirrored to
   * `aria-disabled` rather than removing the element from the accessibility
   * tree, so a screen reader can still announce that the control exists.
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
   * - `focus(options?: FocusOptions) => void`: Puts the caret in the field, the way a label pointing at one would.
   *
   * ## CSS Custom Properties
   *
   * CSS variables available for styling the component.
   *
   * - `--textarea-background-color`: Fill behind the text. (default: `undefined`)
   *
   * ## CSS Parts
   *
   * Custom selectors for styling elements within the component.
   *
   * - `field`: The box holding the control.
   * - `control`: The textarea itself.
   */
  "helix-textarea": Partial<
    HelixTextareaProps & BaseProps<HelixTextarea> & BaseEvents
  >;

  /**
   * A surface with a shadow, because a toast sits over whatever the reader was
   * looking at rather than in it. The severity is a bar down the leading edge and
   * not a fill: a message is text to be read, and a coloured panel behind it
   * costs contrast for something the mark already says.
   *
   * ## Attributes & Properties
   *
   * Component attributes and properties that can be applied to the element or by using JavaScript.
   *
   * - `dismiss-label`/`dismissLabel`: Accessible name for the dismiss control.
   * - `dismissible`: Whether the reader can ask for it to go.
   * - `duration`: How long it stays, in milliseconds. Absent means until it is dismissed.
   *
   * Read once when the item is first rendered. Changing it afterwards does not
   * restart a message the reader is already partway through.
   * - `severity`: What kind of message it is, which picks the mark and its name.
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
   * - `icon`: Replaces the glyph inside the dismiss control.
   *
   * ## Methods
   *
   * Methods that can be called to access component functionality.
   *
   * - `dismiss() => boolean`: Asks to be taken away, and reports whether the request stood.
   * - `pause() => void`: Stops the clock, leaving whatever is left of it.
   * - `resume() => void`: Starts it again from where it stopped.
   *
   * ## CSS Custom Properties
   *
   * CSS variables available for styling the component.
   *
   * - `--toast-item-inset`: Space between the message's edge and its contents. (default: `undefined`)
   *
   * ## CSS Parts
   *
   * Custom selectors for styling elements within the component.
   *
   * - `item`: The message's own surface.
   * - `content`: The message.
   * - `actions`: The region holding what to do about it.
   * - `dismiss`: The control that asks to close.
   */
  "helix-toast-item": Partial<
    HelixToastItemProps & BaseProps<HelixToastItem> & BaseEvents
  >;

  /**
   * Fixed to the window, and it catches nothing: the region spans a whole edge,
   * so a stack of one message in a corner would otherwise put an invisible bar
   * across everything beside it. The region is transparent to a pointer and the
   * messages take it back.
   *
   * **It belongs at the root of the application.** `position: fixed` is
   * positioned against the viewport only while no ancestor carries `transform`,
   * `filter`, `perspective` or `contain`, any of which makes that ancestor the
   * containing block instead, and it is still clipped by an ancestor with
   * `overflow: hidden`. That is a real constraint rather than a style note, and
   * it is the same fact that put every other floating surface in this library
   * into the top layer.
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
   * ## CSS Custom Properties
   *
   * CSS variables available for styling the component.
   *
   * - `--toast-inset`: Distance from the edges of the window. (default: `undefined`)
   * - `--toast-gap`: Space between one message and the next. (default: `undefined`)
   * - `--toast-inline-size`: Width of a message. (default: `undefined`)
   *
   * ## CSS Parts
   *
   * Custom selectors for styling elements within the component.
   *
   * - `region`: The stack the messages are in.
   */
  "helix-toast": Partial<HelixToastProps & BaseProps<HelixToast> & BaseEvents>;

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
   * - `name`: Name the group reports under when its form is submitted.
   * - `disabled`: Whether the control is non-interactive.
   *
   * Reflected, because the styled tier selects on it, and mirrored to
   * `aria-disabled` rather than removing the element from the accessibility
   * tree, so a screen reader can still announce that the control exists.
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
   * - `form`: The form this control belongs to, if any. (property only) (readonly)
   * - `labels`: Labels associated with this control. (property only) (readonly)
   *
   * ## Events
   *
   * Events that will be emitted by the component.
   *
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
   * Carries no background of its own. The selected look comes from the group's
   * indicator sitting behind it, which is what lets that marker travel instead of
   * one fill appearing as another disappears.
   *
   * ## Attributes & Properties
   *
   * Component attributes and properties that can be applied to the element or by using JavaScript.
   *
   * - `value`: Identifies the item to the group.
   * - `selected`: Whether this item is the current one.
   * - `disabled`: Whether the item can be chosen.
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
   * - `item`: The button or anchor.
   */
  "helix-toggle": Partial<
    HelixToggleProps & BaseProps<HelixToggle> & BaseEvents
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
   * The bubble is in the top layer, so it needs no `z-index` and cannot be
   * clipped by whatever it sits inside.
   *
   * The arrow is positioned by the same pass that positions the bubble, so it
   * still points at the trigger after the bubble has slid along to stay in view.
   *
   * ## Attributes & Properties
   *
   * Component attributes and properties that can be applied to the element or by using JavaScript.
   *
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
   * - `content`: The text shown in the bubble.
   *
   * The common case, and the fallback for the `content` slot: slot something
   * there and it replaces this. Both cannot show at once, which is the point
   * of using fallback content rather than rendering whichever is present.
   * - `placement`: Preferred side. It moves if that side does not fit.
   * - `offset`: Space between the trigger and the bubble, in pixels.
   * - `disabled`: Whether the tooltip never shows.
   * - `delay`: How long the pointer must rest before the bubble appears, in milliseconds.
   *
   * Without one, sweeping across a row of controls flashes a tooltip for each
   * of them, which is noise rather than help. Focus opens with no delay: a
   * keyboard reader arriving on a control has already committed to it.
   * - `delay-out`/`delayOut`: How long the bubble stays after the pointer leaves, in milliseconds.
   * - `onOpenChange`: The consumer's callback, invoked after the state is applied.
   *
   * Not an attribute: it is a function. And not reachable from React's JSX,
   * which reserves every `on[A-Z]` prop for its own event system and drops
   * what it does not recognise; the generated wrapper listens for the events
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
   * - `requestOpen(next: boolean) => boolean`: Requests an open-state change, and reports whether it was applied.
   *
   * Announces before it acts, so `preventDefault()` on the `helix-open` or
   * `helix-close` is a refusal and nothing moves. In uncontrolled mode the
   * element then updates itself; in controlled mode it applies nothing and
   * waits for the consumer to pass a new `open`, which is what "controlled"
   * means.
   * - `toggleOpen() => boolean`: Requests the opposite of the current state.
   * - `show() => void`: Shows the bubble, unless there is nothing to show.
   * - `hide() => void`: Hides the bubble.
   *
   * ## CSS Custom Properties
   *
   * CSS variables available for styling the component.
   *
   * - `--tooltip-background-color`: Fill of the bubble. (default: `undefined`)
   * - `--tooltip-max-inline-size`: Widest the bubble grows before wrapping. (default: `undefined`)
   *
   * ## CSS Parts
   *
   * Custom selectors for styling elements within the component.
   *
   * - `tooltip`: The bubble.
   * - `arrow`: The point aimed at the trigger.
   */
  "helix-tooltip": Partial<
    HelixTooltipProps & BaseProps<HelixTooltip> & BaseEvents
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
   * - `helix-select`: Fired when the item is chosen.
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
   *
   * ## CSS Custom Properties
   *
   * CSS variables available for styling the component.
   *
   * - `--tree-indent`: Indent added per level. (default: `undefined`)
   * - `--tree-chevron-size`: Size of the chevron, and the gutter a leaf reserves. (default: `undefined`)
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
   * - `onActiveChange`: The consumer's callback, invoked after the change is applied. (property only)
   *
   * ## Events
   *
   * Events that will be emitted by the component.
   *
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
   * ## CSS Custom Properties
   *
   * CSS variables available for styling the component.
   *
   * - `--tree-indent`: Indent added per level. (default: `undefined`)
   * - `--tree-chevron-size`: Size of the chevron, and the gutter a leaf reserves. (default: `undefined`)
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
   * - `chevron-placement`/`chevronPlacement`: Where the open indicator sits, or whether there is one.
   *
   * `auto` resolves to `end`, which is where a reader scanning a list of
   * summaries expects it: the label starts at the same x on every row, and the
   * indicator is found once at the edge rather than shifting with the text.
   * `start` is for a tree-like reading, where the indicator leads the label.
   * `none` is for a row that carries its own affordance and would otherwise
   * have two.
   * - `onOpenChange`: The consumer's callback, invoked after the state is applied.
   *
   * Not an attribute: it is a function. And not reachable from React's JSX,
   * which reserves every `on[A-Z]` prop for its own event system and drops
   * what it does not recognise; the generated wrapper listens for the events
   * instead. (property only)
   *
   * ## Events
   *
   * Events that will be emitted by the component.
   *
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
   * - `requestOpen(next: boolean) => boolean`: Requests an open-state change, and reports whether it was applied.
   *
   * Announces before it acts, so `preventDefault()` on the `helix-open` or
   * `helix-close` is a refusal and nothing moves. In uncontrolled mode the
   * element then updates itself; in controlled mode it applies nothing and
   * waits for the consumer to pass a new `open`, which is what "controlled"
   * means.
   * - `toggleOpen() => boolean`: Requests the opposite of the current state.
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
   * Full width and flat, with the severity carried by a tinted fill and a
   * hairline beneath rather than by a border on four sides: an announcement is a
   * band across the top of the page, not a box that happens to be wide.
   *
   * ## Attributes & Properties
   *
   * Component attributes and properties that can be applied to the element or by using JavaScript.
   *
   * - `severity`: What kind of attention the message needs.
   * - `dismissible`: Whether the reader can close it.
   * - `dismiss-label`/`dismissLabel`: Accessible name for the dismiss control.
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
   * ## CSS Custom Properties
   *
   * CSS variables available for styling the component.
   *
   * - `--announcement-inset`: Inline padding, matched to the page. (default: `undefined`)
   *
   * ## CSS Parts
   *
   * Custom selectors for styling elements within the component.
   *
   * - `content`: The message region.
   * - `actions`: The trailing action region.
   * - `dismiss`: The control that asks to close.
   */
  "helix-announcement": Partial<
    HelixAnnouncementProps &
      HelixAnnouncementSolidJsProps &
      BaseProps<HelixAnnouncement> &
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
   * - `brand`: Wordmark or logo, at the inline start.
   * - `(default)`: Primary navigation.
   * - `actions`: Trailing actions, such as a call to action.
   * - `start`: Leading content, usually a wordmark.
   * - `end`: Trailing content.
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
   * - `content`: The centered row inside the banner.
   * - `nav`: The navigation region.
   * - `row`: The centered row inside the banner.
   * - `start`: The leading region.
   * - `end`: The trailing region.
   */
  "helix-app-header": Partial<
    HelixAppHeaderProps &
      HelixAppHeaderSolidJsProps &
      BaseProps<HelixAppHeader> &
      BaseEvents
  >;

  /**
   * They overlap by a step of space, which is enough to read as a stack without
   * the faces occluding each other. Each carries a ring in the page's own
   * background colour, because a stack with no separation between its members
   * reads as one shape rather than several: the ring is what makes the edge of
   * each avatar visible against the one behind it.
   *
   * Each avatar is drawn over the one before it, which falls out of document
   * order and needs no `z-index`. The familiar trick for putting the *first*
   * avatar on top is `row-reverse`, and it also reverses the row: the person
   * written first appears last. A facepile whose reading order is the reverse of
   * its markup is the worse trade of the two.
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
   * ## CSS Custom Properties
   *
   * CSS variables available for styling the component.
   *
   * - `--avatar-group-overlap`: How far each avatar sits over the one before it. (default: `undefined`)
   * - `--avatar-group-ring-color`: The separation drawn between one avatar and the next. (default: `undefined`)
   *
   * ## CSS Parts
   *
   * Custom selectors for styling elements within the component.
   *
   * - `overflow`: The count of avatars past `max`.
   */
  "helix-avatar-group": Partial<
    HelixAvatarGroupProps &
      HelixAvatarGroupSolidJsProps &
      BaseProps<HelixAvatarGroup> &
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
   * The indicator carries a ring in the page's own background color, so it stays
   * legible where it overlaps the thing it is pinned to. Without it a dark badge
   * on a dark icon reads as a bite taken out of the icon.
   *
   * ## Attributes & Properties
   *
   * Component attributes and properties that can be applied to the element or by using JavaScript.
   *
   * - `appearance`: How much attention the mark asks for.
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
   * ## CSS Custom Properties
   *
   * CSS variables available for styling the component.
   *
   * - `--badge-background-color`: Fill of the indicator. (default: `undefined`)
   * - `--badge-offset`: Pulls the mark in from the corner, along both axes. (default: `undefined`)
   * - `--badge-ring-color`: The ring separating it from what is behind. (default: `undefined`)
   *
   * ## CSS Parts
   *
   * Custom selectors for styling elements within the component.
   *
   * - `indicator`: The count, or the dot when there is no value.
   */
  "helix-badge": Partial<
    HelixBadgeProps &
      HelixBadgeSolidJsProps &
      BaseProps<HelixBadge> &
      BaseEvents
  >;

  /**
   * Set larger than body text on the display face, because a pulled quotation is
   * a change of voice and the type is what says so. No quotation marks are drawn:
   * the size and the space around it already set the passage apart, and marks on
   * top of that are the same thing said twice.
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
   * ## CSS Custom Properties
   *
   * CSS variables available for styling the component.
   *
   * - `--blockquote-size`: Size of the quoted passage. (default: `undefined`)
   *
   * ## CSS Parts
   *
   * Custom selectors for styling elements within the component.
   *
   * - `blockquote`: The quotation.
   * - `attribution`: The footer carrying the source.
   */
  "helix-blockquote": Partial<
    HelixBlockquoteProps &
      HelixBlockquoteSolidJsProps &
      BaseProps<HelixBlockquote> &
      BaseEvents
  >;

  /**
   * The separator is hidden on the first item with `:host(:first-child)`, so no
   * item needs to know its own index and the parent needs no coordination.
   *
   * The link carries `data-link="quiet"`, the recipe navigation uses everywhere
   * else, which is what owns its color. Under the pointer it reads as a subtle
   * button. That part is styled from in here: the base layer sets color and
   * text-decoration on an anchor and nothing else, so the outer tree wins those
   * and leaves box and background to `::slotted`.
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
   * - `(default)`: The step: a link, or the text of the current page.
   * - `separator`: Replaces the chevron shown before this item.
   *
   * ## CSS Custom Properties
   *
   * CSS variables available for styling the component.
   *
   * - `--breadcrumbs-separator-color`: Color of the chevron. (default: `undefined`)
   * - `--breadcrumb-hover-color`: Fill behind a step under the pointer. (default: `undefined`)
   *
   * ## CSS Parts
   *
   * Custom selectors for styling elements within the component.
   *
   * - `separator`: The separator preceding the item.
   */
  "helix-breadcrumb": Partial<
    HelixBreadcrumbProps &
      HelixBreadcrumbSolidJsProps &
      BaseProps<HelixBreadcrumb> &
      BaseEvents
  >;

  /**
   * A single wrapping line by default. The trail wraps rather than scrolling,
   * because a truncated path tells the reader less than a two-line one.
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
   * The buttons are joined into a single shape: the outer corners keep their
   * radius, the inner ones lose it, and adjacent borders collapse into one line.
   *
   * That joining is in the base layer, paired with `data-button` the way the
   * button's own box is, because the corner belongs to the control inside each
   * button's shadow root and a rule in here cannot reach it. The same rule
   * therefore serves a consumer's own anchor styled as a button.
   *
   * ## Attributes & Properties
   *
   * Component attributes and properties that can be applied to the element or by using JavaScript.
   *
   * - `appearance`: Whether the buttons are one bar or a spaced row.
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
  "helix-button-group": Partial<
    HelixButtonGroupProps &
      HelixButtonGroupSolidJsProps &
      BaseProps<HelixButtonGroup> &
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
   *
   * - `primary` is the one action a region is for, and there should be one. Two
   *   primary buttons are two things claiming to be the most important, and the
   *   reader has to work out which of you meant it.
   * - `secondary` is an action that is real but not the point, which is most
   *   buttons on most pages. A page whose every button is primary has said
   *   nothing about which one matters.
   * - `tertiary` is quiet enough to sit in a row of them without the row
   *   becoming loud: for actions that are available rather than suggested.
   *   Cancel, dismiss, the contents of a toolbar.
   * - `danger` says the action is destructive before the confirmation does. The
   *   shape of the control is what a reader recognises at a glance, where a red
   *   word inside a neutral button is something they have to read first.
   *
   * This is also where emphasis comes from, rather than size: a filled primary
   * button says "this one matters" far louder than eight more pixels would.
   * - `type`: What activating the button does to its form.
   * - `label`: Accessible name, for a button whose content is not text.
   *
   * Lives here rather than only on `IconButton` so the two share one render.
   * An icon-only button without it is a control a screen reader announces as
   * "button" and nothing else.
   * - `command`: What to send when the button is activated, and what to send it to.
   *
   * The platform's invoker attributes, forwarded onto the inner `<button>`
   * rather than left on the host: only a real button is recognised as an
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
   * - `button`: The inner control.
   */
  "helix-button": Partial<
    HelixButtonProps &
      HelixButtonSolidJsProps &
      BaseProps<HelixButton> &
      BaseEvents
  >;

  /**
   * Six week rows always, so the grid keeps one height and a month change does
   * not move whatever sits beneath it.
   *
   * The column track is wider than the day, and the day is centred in it. The
   * difference is the space between days, which belongs to the track rather than
   * to a `gap`, so a range can paint across the whole track and stay continuous.
   *
   * Days from the neighbouring months stay in place and stay selectable, marked
   * quieter rather than hidden, so the first and last weeks are whole and the
   * grid reads as a continuous run of dates.
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
   * - `name`: Name the calendar reports under when its form is submitted.
   *
   * Absent means it submits nothing, which is what makes it safe to put one
   * inside something else. `DatePicker` will hold the name and the calendar in
   * its panel will stay quiet, the same way `Select` holds the name and the
   * `Listbox` inside it does not.
   * - `mode`: How many dates can be held at once.
   * - `months`: How many months to show, side by side.
   * - `locale`: Locale for month and day names. Absent uses the runtime's own.
   * - `disable-dates`/`disableDates`: Dates that cannot be chosen, comma separated, as `YYYY-MM-DD`.
   * - `disable-days`/`disableDays`: Days of the week that cannot be chosen, comma separated, `0` to `6`.
   * - `invalid`: Whether the current selection fails validation.
   * - `month`: The month on show, as `YYYY-MM`. Follows `value`, then the current month.
   * - `min`: Earliest selectable date, as `YYYY-MM-DD`.
   * - `max`: Latest selectable date, as `YYYY-MM-DD`.
   * - `label`: Accessible name for the grid.
   * - `first-day-of-week`/`firstDayOfWeek`: First column of the week, `0` for Sunday through `6` for Saturday.
   * - `disabled`: Whether the control is non-interactive.
   *
   * Reflected, because the styled tier selects on it, and mirrored to
   * `aria-disabled` rather than removing the element from the accessibility
   * tree, so a screen reader can still announce that the control exists.
   * - `onValueChange`: The consumer's callback, invoked after the value is applied.
   *
   * Not an attribute: it is a function. `onValueChange` and not `onChange`,
   * because React reserves the latter for its own synthetic system and wires
   * it to the native `change`, so a Helix event named `Change` would never
   * fire at all. (property only)
   * - `form`: The form this control belongs to, if any. (property only) (readonly)
   * - `labels`: Labels associated with this control. (property only) (readonly)
   *
   * ## Events
   *
   * Events that will be emitted by the component.
   *
   * - `helix-change`: Fired before the dates change, and cancelable. It was `helix-select`, and it moved when the calendar became a form control. A control whose value changes dispatches `helix-change` here: `Input`, `Select`, `Listbox`, `Radio.Group` and `Toggle.Group` all do, and a calendar submitting a date is the same kind of thing. `helix-select` stays what it is elsewhere, which is a row or an item being chosen in something that reports no value at all, such as `Menu` or `Tree`.
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
   *
   * ## CSS Custom Properties
   *
   * CSS variables available for styling the component.
   *
   * - `--calendar-day-size`: Width and height of a day. (default: `undefined`)
   * - `--calendar-track-size`: Width of a column, which is what sets the space between days. (default: `undefined`)
   * - `--calendar-row-size`: Height of a week row. (default: `undefined`)
   * - `--calendar-selected-color`: Fill behind a selected day. (default: `undefined`)
   * - `--calendar-range-color`: Band behind the days in a range. (default: `undefined`)
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
  "helix-calendar": Partial<
    HelixCalendarProps &
      HelixCalendarSolidJsProps &
      BaseProps<HelixCalendar> &
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
   * - `title`: A heading above the content.
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
   * element you slotted, not a wrapper around it.
   *
   * ## Attributes & Properties
   *
   * Component attributes and properties that can be applied to the element or by using JavaScript.
   *
   * - `appearance`: How the card separates itself from the page.
   *
   * - `outlined` is the default, and a hairline is usually enough. It costs
   *   less attention than a shadow: a screen of shadowed cards reads as a stack
   *   of things floating, none of them settled.
   * - `elevated` is lifted off the page instead of framed, for a card on a
   *   coloured or busy background, where a line has to compete with whatever is
   *   behind it and a shadow does not.
   * - `plain` has no frame at all: the card is a layout and whatever it sits in
   *   is the surface. For a card inside something already bounded, where a
   *   second box adds a line and no meaning.
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
   * The track scroll-snaps, so a drag and a trackpad swipe move it with the
   * browser's own momentum and the controls only have to scroll.
   *
   * Slides take the full track by default. `per-view` fits more than one across,
   * which is what a run of cards wants rather than a run of full-width panels.
   *
   * ## Attributes & Properties
   *
   * Component attributes and properties that can be applied to the element or by using JavaScript.
   *
   * - `appearance`: Whether the controls sit under the slides or on them.
   * - `per-view`/`perView`: How many slides are shown across the track at once. Absent shows one.
   *
   * No default, because it reflects. A reflected property with a value writes
   * its attribute on upgrade, and the host then carries something a consumer's
   * server markup never had, which React reports as a mismatch. The one-across
   * case is the absent attribute, and the styles read it that way.
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
   * ## CSS Custom Properties
   *
   * CSS variables available for styling the component.
   *
   * - `--carousel-gap`: Space between slides. (default: `undefined`)
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
  "helix-carousel": Partial<
    HelixCarouselProps &
      HelixCarouselSolidJsProps &
      BaseProps<HelixCarousel> &
      BaseEvents
  >;

  /**
   * A column by default, which is what a list of choices wants: the eye scans one
   * line per answer rather than hunting along a row.
   *
   * ## Attributes & Properties
   *
   * Component attributes and properties that can be applied to the element or by using JavaScript.
   *
   * - `orientation`: Which way the boxes run.
   * - `hint`: Help under the control, shown while there is nothing wrong.
   * - `feedback`: What is wrong, in the reader's words rather than the browser's.
   * - `label`: The accessible name, and the fallback for the `label` slot.
   * - `required`: Whether the form refuses to submit without it.
   * - `disabled`: Whether the whole set is out of play.
   *
   * Its own property rather than an inherited one, because this group is not
   * form-associated and `disabled` arrives with `HelixFormElement`. The boxes
   * are each form-associated and have their own, which is exactly why the two
   * have to be reconciled rather than simply written over.
   * - `name`: Name submitted with the form, given to every box that has none.
   * - `value`: The checked values, comma separated.
   * - `resolvedFeedback`: The message actually shown: the consumer's, or the platform's, or none. (property only) (readonly)
   * - `describedBy`: Id of the description node, for `aria-describedby` on the control.
   *
   * One at a time, because only one of the two is ever rendered. Naming both
   * would point a screen reader at an id that resolves to nothing, which it
   * reads as a description it cannot find. (property only) (readonly)
   * - `boxes`: The boxes, in light-DOM order. Client only: the server has no tree. (property only) (readonly)
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
   * ## CSS Custom Properties
   *
   * CSS variables available for styling the component.
   *
   * - `--checkbox-group-gap`: Space between the boxes. (default: `undefined`)
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
  "helix-checkbox-group": Partial<
    HelixCheckboxGroupProps &
      HelixCheckboxGroupSolidJsProps &
      BaseProps<HelixCheckboxGroup> &
      BaseEvents
  >;

  /**
   * The box is the native input, restyled rather than replaced, so the tick and
   * the indeterminate dash are the browser's own and the control stays a control
   * for anything reading the page.
   *
   * The label sits beside it and the whole thing is the click target, which is
   * what a native `<label>` wrapping a checkbox gives and what a reader expects.
   *
   * ## Attributes & Properties
   *
   * Component attributes and properties that can be applied to the element or by using JavaScript.
   *
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
   * - `name`: Name submitted with the form.
   * - `value`: Value submitted when the box is checked.
   * - `indeterminate`: Whether the box shows as neither checked nor unchecked.
   *
   * Presentation only. It never submits, and the first change resolves it.
   * - `disabled`: Whether the control is non-interactive.
   *
   * Reflected, because the styled tier selects on it, and mirrored to
   * `aria-disabled` rather than removing the element from the accessibility
   * tree, so a screen reader can still announce that the control exists.
   * - `onCheckedChange`: The consumer's callback, invoked after the state is applied.
   *
   * Not an attribute: it is a function. And not reachable from React's JSX,
   * which reserves every `on[A-Z]` prop for its own event system and drops
   * what it does not recognise; the generated wrapper listens for the event
   * instead. (property only)
   * - `resolvedFeedback`: The message actually shown: the consumer's, or the platform's, or none. (property only) (readonly)
   * - `describedBy`: Id of the description node, for `aria-describedby` on the control.
   *
   * One at a time, because only one of the two is ever rendered. Naming both
   * would point a screen reader at an id that resolves to nothing, which it
   * reads as a description it cannot find. (property only) (readonly)
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
   * - `formResetCallback() => void`: Returns the box to the state its markup declared.
   * - `formStateRestoreCallback(state: string | null) => void`: Restores the box when the browser brings a form back.
   *
   * ## CSS Custom Properties
   *
   * CSS variables available for styling the component.
   *
   * - `--checkbox-size`: Width and height of the box. (default: `undefined`)
   * - `--checkbox-checked-color`: Fill of a ticked box. (default: `undefined`)
   *
   * ## CSS Parts
   *
   * Custom selectors for styling elements within the component.
   *
   * - `box`: The frame the input is painted as, and the mark sits over.
   * - `control`: The input.
   * - `label`: The label beside it.
   * - `mark`: The tick, or the dash when the box is indeterminate.
   */
  "helix-checkbox": Partial<
    HelixCheckboxProps &
      HelixCheckboxSolidJsProps &
      BaseProps<HelixCheckbox> &
      BaseEvents
  >;

  /**
   * The panel is `surface-overlay` with a shadow, because that is what it is: a
   * thing over the page rather than on it. The scrim is drawn on `::backdrop`,
   * which is the platform's own element for it and sits in the top layer with the
   * dialog rather than being a div somebody positioned.
   *
   * ## Attributes & Properties
   *
   * Component attributes and properties that can be applied to the element or by using JavaScript.
   *
   * - `appearance`: How wide the panel is allowed to be.
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
   * - `label`: Accessible name for the dialog.
   * - `persistent`: Whether Escape and the backdrop can close it.
   *
   * Off for a dialog that must be answered. It does not disable the close
   * control a consumer slots in: refusing to be dismissed is not the same as
   * refusing to be closed, and a dialog with no way out at all is a trap.
   * - `onOpenChange`: The consumer's callback, invoked after the state is applied.
   *
   * Not an attribute: it is a function. And not reachable from React's JSX,
   * which reserves every `on[A-Z]` prop for its own event system and drops
   * what it does not recognise; the generated wrapper listens for the events
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
   * - `requestOpen(next: boolean) => boolean`: Requests an open-state change, and reports whether it was applied.
   *
   * Announces before it acts, so `preventDefault()` on the `helix-open` or
   * `helix-close` is a refusal and nothing moves. In uncontrolled mode the
   * element then updates itself; in controlled mode it applies nothing and
   * waits for the consumer to pass a new `open`, which is what "controlled"
   * means.
   * - `toggleOpen() => boolean`: Requests the opposite of the current state.
   * - `show() => void`: Moves focus into the dialog and makes the rest of the page inert.
   * - `close() => void`: Asks to close, which a consumer may refuse.
   *
   * ## CSS Custom Properties
   *
   * CSS variables available for styling the component.
   *
   * - `--dialog-inline-size`: Width of the panel. (default: `undefined`)
   * - `--dialog-inset`: Padding inside the panel. (default: `undefined`)
   *
   * ## CSS Parts
   *
   * Custom selectors for styling elements within the component.
   *
   * - `dialog`: The native dialog element.
   */
  "helix-dialog": Partial<
    HelixDialogProps &
      HelixDialogSolidJsProps &
      BaseProps<HelixDialog> &
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
   * The panel translates and the scrim fades, both on transform and opacity only,
   * which is the one place motion is allowed to carry the work: the surface at
   * rest is flat and the movement is what says something happened.
   *
   * ## Attributes & Properties
   *
   * Component attributes and properties that can be applied to the element or by using JavaScript.
   *
   * - `appearance`: Removes the panel's own surface, for a drawer inside another surface.
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
   * - `onOpenChange`: The consumer's callback, invoked after the state is applied.
   *
   * Not an attribute: it is a function. And not reachable from React's JSX,
   * which reserves every `on[A-Z]` prop for its own event system and drops
   * what it does not recognise; the generated wrapper listens for the events
   * instead. (property only)
   *
   * ## Events
   *
   * Events that will be emitted by the component.
   *
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
   * A row is a full-width band rather than an inset pill, for the reason the
   * select's options are: it reaches both edges of the panel, so a highlight
   * lines up with the edge the eye is already following down the list.
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
   * ## CSS Custom Properties
   *
   * CSS variables available for styling the component.
   *
   * - `--drilldown-item-hover-color`: Fill when a row is under the pointer. (default: `undefined`)
   *
   * ## CSS Parts
   *
   * Custom selectors for styling elements within the component.
   *
   * - `item`: The row itself.
   * - `label`: The words.
   */
  "helix-drilldown-item": Partial<
    HelixDrilldownItemProps &
      HelixDrilldownItemSolidJsProps &
      BaseProps<HelixDrilldownItem> &
      BaseEvents
  >;

  /**
   * **The pages slide, and the direction is the point.** Both moves replace one
   * page with another, so with no motion a reader cannot tell whether they went
   * deeper or came back: the panel simply holds different words. Sliding in the
   * direction of travel says which happened, and it is most of the reason this is
   * a component rather than a menu with its trigger removed.
   *
   * An animation rather than a transition, because there is nothing to transition
   * from: the page arriving was not in the DOM a frame ago. Under
   * `prefers-reduced-motion` it becomes the instant swap `Menu` does.
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
   * ## CSS Custom Properties
   *
   * CSS variables available for styling the component.
   *
   * - `--drilldown-background`: Fill behind the pages. (default: `undefined`)
   * - `--drilldown-inline-size`: Width of the region. (default: `undefined`)
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
  "helix-drilldown": Partial<
    HelixDrilldownProps &
      HelixDrilldownSolidJsProps &
      BaseProps<HelixDrilldown> &
      BaseEvents
  >;

  /**
   * Centered and given room, because an empty view is the only thing on screen
   * and crowding it against the top edge makes the region look broken rather than
   * empty.
   *
   * ## Attributes & Properties
   *
   * Component attributes and properties that can be applied to the element or by using JavaScript.
   *
   * - `appearance`: Whether the state sits on a surface of its own.
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
   *
   * ## CSS Custom Properties
   *
   * CSS variables available for styling the component.
   *
   * - `--empty-inset`: Space around the whole block. (default: `undefined`)
   */
  "helix-empty": Partial<
    HelixEmptyProps &
      HelixEmptySolidJsProps &
      BaseProps<HelixEmpty> &
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
   * - `type`: What activating the button does to its form.
   * - `label`: Accessible name, for a button whose content is not text.
   *
   * Lives here rather than only on `IconButton` so the two share one render.
   * An icon-only button without it is a control a screen reader announces as
   * "button" and nothing else.
   * - `command`: What to send when the button is activated, and what to send it to.
   *
   * The platform's invoker attributes, forwarded onto the inner `<button>`
   * rather than left on the host: only a real button is recognised as an
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
   * The frame is the field rather than the input, so anything slotted at either
   * end sits inside the same box as the text and the focus ring is drawn once,
   * around the whole control, instead of around a smaller box within it.
   *
   * The input itself is the native one, stripped rather than replaced, so the
   * caret, the selection, the autofill, and the keyboard a phone chooses are all
   * the platform's.
   *
   * Height comes from the region, like every other control: `data-density` on
   * whatever holds it, not a `size` here. Invalid styling waits for
   * `:user-invalid`, because a field is not wrong before anyone has filled it in.
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
   * - `name`: Name submitted with the form.
   * - `placeholder`: Shown while the field is empty. Not a label: it goes when typing starts.
   * - `read-only`/`readOnly`: Whether the field refuses input while still submitting its value.
   * - `type`: What the field accepts, which decides the keyboard and the validation.
   * - `disabled`: Whether the control is non-interactive.
   *
   * Reflected, because the styled tier selects on it, and mirrored to
   * `aria-disabled` rather than removing the element from the accessibility
   * tree, so a screen reader can still announce that the control exists.
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
   * - `focus(options?: FocusOptions) => void`: Puts the caret in the field, the way a label pointing at one would.
   * - `select() => void`: Selects everything in the field.
   *
   * ## CSS Custom Properties
   *
   * CSS variables available for styling the component.
   *
   * - `--input-size`: Height of the field. (default: `undefined`)
   * - `--input-background-color`: Fill behind the text. (default: `undefined`)
   *
   * ## CSS Parts
   *
   * Custom selectors for styling elements within the component.
   *
   * - `field`: The box holding everything.
   * - `control`: The input itself.
   */
  "helix-input": Partial<
    HelixInputProps &
      HelixInputSolidJsProps &
      BaseProps<HelixInput> &
      BaseEvents
  >;

  /**
   * Drawn as a physical key: a hairline, a sunken fill, and one inset shadow
   * along the bottom edge that reads as depth without becoming a picture of a
   * key.
   *
   * Sized in `em`, so it stays proportional to whatever it is set inside rather
   * than holding one size and looking wrong in a heading.
   *
   * ## Slots
   *
   * Areas where markup can be added to the component.
   *
   * - `(default)`: The key's label.
   *
   * ## CSS Custom Properties
   *
   * CSS variables available for styling the component.
   *
   * - `--kbd-background-color`: Fill of the key. (default: `undefined`)
   * - `--kbd-border-color`: Color of the hairline and the edge. (default: `undefined`)
   *
   * ## CSS Parts
   *
   * Custom selectors for styling elements within the component.
   *
   * - `kbd`: The key.
   */
  "helix-kbd": Partial<
    HelixKbdProps & HelixKbdSolidJsProps & BaseProps<HelixKbd> & BaseEvents
  >;

  /**
   * A grid rather than a flex row, so the supporting text lines up under the
   * label rather than under the leading icon. The leading and trailing regions
   * hold their own width and the middle takes the rest.
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
   * ## CSS Custom Properties
   *
   * CSS variables available for styling the component.
   *
   * - `--list-item-inset`: Padding inside the row. (default: `undefined`)
   */
  "helix-list-item": Partial<
    HelixListItemProps &
      HelixListItemSolidJsProps &
      BaseProps<HelixListItem> &
      BaseEvents
  >;

  /**
   * Rules between rows rather than around each one, so a list reads as one object
   * with divisions instead of as a stack of cards. `divided` is off by default,
   * because space alone separates rows perfectly well and a rule at every seam is
   * decoration doing what emptiness already does.
   *
   * ## Attributes & Properties
   *
   * Component attributes and properties that can be applied to the element or by using JavaScript.
   *
   * - `divided`: Whether a rule sits between rows.
   * - `label`: Accessible name for the set.
   *
   * ## Slots
   *
   * Areas where markup can be added to the component.
   *
   * - `(default)`: The rows.
   *
   * ## CSS Custom Properties
   *
   * CSS variables available for styling the component.
   *
   * - `--list-gap`: Space between rows. (default: `undefined`)
   */
  "helix-list": Partial<
    HelixListProps & HelixListSolidJsProps & BaseProps<HelixList> & BaseEvents
  >;

  /**
   * A framed, scrolling list with the field's three parts around it. The frame is
   * the list rather than the host, so a filter that empties it leaves a box with
   * a message in it rather than a border collapsing to nothing.
   *
   * `--listbox-max-block-size` is what makes it scroll rather than run down the
   * page. The keyboard brings the active option into that box itself, so a long
   * list moves under the reader rather than the reader moving to find it.
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
   * - `filter`: Text the options are matched against. Empty shows them all.
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
   * - `name`: Name the list reports under when its form is submitted.
   * - `empty-text`/`emptyText`: What is shown when a filter has hidden every option.
   * - `disabled`: Whether the control is non-interactive.
   *
   * Reflected, because the styled tier selects on it, and mirrored to
   * `aria-disabled` rather than removing the element from the accessibility
   * tree, so a screen reader can still announce that the control exists.
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
   * - `options`: Every option, in the order a reader meets them.
   *
   * Descendants rather than children, because a group puts a level between the
   * list and its options and the keyboard has to move through a grouped list
   * exactly as it moves through a flat one. (property only) (readonly)
   * - `values`: The chosen values, which is a list whether or not `multiple` is set. (property only) (readonly)
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
   * - `(default)`: The options, and any groups of them.
   * - `label`: Richer than a string.
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
   *
   * ## CSS Custom Properties
   *
   * CSS variables available for styling the component.
   *
   * - `--listbox-max-block-size`: How tall it gets before it scrolls. (default: `undefined`)
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
  "helix-listbox": Partial<
    HelixListboxProps &
      HelixListboxSolidJsProps &
      BaseProps<HelixListbox> &
      BaseEvents
  >;

  /**
   * The tick and the arrow hold their space whether or not they are showing, so
   * the labels in a menu start at one place and the rows read as a column rather
   * than as a ragged list.
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
   * ## CSS Custom Properties
   *
   * CSS variables available for styling the component.
   *
   * - `--menu-item-hover-color`: Fill under the pointer. (default: `undefined`)
   *
   * ## CSS Parts
   *
   * Custom selectors for styling elements within the component.
   *
   * - `item`: The row.
   * - `mark`: The trailing mark: a tick when checked, a caret when it opens a page. One column, because a row is never both.
   */
  "helix-menu-item": Partial<
    HelixMenuItemProps &
      HelixMenuItemSolidJsProps &
      BaseProps<HelixMenuItem> &
      BaseEvents
  >;

  /**
   * The surface is in the top layer, so it needs no `z-index` and cannot be
   * clipped by whatever it sits inside.
   *
   * A submenu replaces the page rather than opening beside it, so the panel stays
   * one panel and reads the same on a phone as on a desk.
   *
   * ## Attributes & Properties
   *
   * Component attributes and properties that can be applied to the element or by using JavaScript.
   *
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
   * - `placement`: Preferred side. It moves if that side does not fit.
   * - `offset`: Space between the trigger and the surface, in pixels.
   * - `label`: Accessible name for the surface.
   * - `back-label`/`backLabel`: What the row returning from a submenu reads.
   * - `onOpenChange`: The consumer's callback, invoked after the state is applied.
   *
   * Not an attribute: it is a function. And not reachable from React's JSX,
   * which reserves every `on[A-Z]` prop for its own event system and drops
   * what it does not recognise; the generated wrapper listens for the events
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
   * - `requestOpen(next: boolean) => boolean`: Requests an open-state change, and reports whether it was applied.
   *
   * Announces before it acts, so `preventDefault()` on the `helix-open` or
   * `helix-close` is a refusal and nothing moves. In uncontrolled mode the
   * element then updates itself; in controlled mode it applies nothing and
   * waits for the consumer to pass a new `open`, which is what "controlled"
   * means.
   * - `toggleOpen() => boolean`: Requests the opposite of the current state.
   * - `show() => void`: Opens the menu.
   * - `hide() => void`: Closes the menu, and forgets which page was showing.
   *
   * ## CSS Custom Properties
   *
   * CSS variables available for styling the component.
   *
   * - `--menu-min-inline-size`: Narrowest the surface gets. (default: `undefined`)
   * - `--menu-background-color`: Fill of the surface. (default: `undefined`)
   *
   * ## CSS Parts
   *
   * Custom selectors for styling elements within the component.
   *
   * - `menu`: The surface.
   * - `header`: The bar above a submenu, holding the way back and its name.
   * - `back`: The control that returns from a submenu.
   * - `title`: The name of the submenu that is showing.
   */
  "helix-menu": Partial<
    HelixMenuProps & HelixMenuSolidJsProps & BaseProps<HelixMenu> & BaseEvents
  >;

  /**
   * One marker that travels, rather than a background that appears on whichever
   * destination is current. A fill that swaps is two things changing at once and
   * reads as a flicker; one that moves is a single object the eye follows, and it
   * says where the current page was as well as where it is.
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
   * ## CSS Custom Properties
   *
   * CSS variables available for styling the component.
   *
   * - `--nav-bar-indicator-color`: Fill of the traveling marker. (default: `undefined`)
   * - `--nav-bar-gap`: Space between destinations. (default: `undefined`)
   *
   * ## CSS Parts
   *
   * Custom selectors for styling elements within the component.
   *
   * - `nav`: The navigation landmark.
   * - `indicator`: The marker that travels to the current destination.
   */
  "helix-nav-bar": Partial<
    HelixNavBarProps &
      HelixNavBarSolidJsProps &
      BaseProps<HelixNavBar> &
      BaseEvents
  >;

  /**
   * The heading is set small and quiet, because it is a divider that happens to
   * have words on it: a run of options is read as a list and the heading is what
   * tells you which list, not something to read on its own.
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
  "helix-option-group": Partial<
    HelixOptionGroupProps &
      HelixOptionGroupSolidJsProps &
      BaseProps<HelixOptionGroup> &
      BaseEvents
  >;

  /**
   * Two states that look different on purpose: chosen, which is a fact about the
   * value, and active, which is where the keyboard is. A list that draws them the
   * same way leaves a reader arrowing through it unable to tell what they have
   * picked from what they are looking at.
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
   * ## CSS Custom Properties
   *
   * CSS variables available for styling the component.
   *
   * - `--option-active-color`: Wash behind the option the keyboard is on. (default: `undefined`)
   *
   * ## CSS Parts
   *
   * Custom selectors for styling elements within the component.
   *
   * - `item`: The row.
   * - `label`: The words.
   */
  "helix-option": Partial<
    HelixOptionProps &
      HelixOptionSolidJsProps &
      BaseProps<HelixOption> &
      BaseEvents
  >;

  /**
   * A rule down the leading edge with the current section lit along it, which is
   * the shape a table of contents has taken since printed marginalia: the line
   * says the list is one thing, and the lit segment says where in it you are.
   *
   * Nesting is the consumer's, expressed as `data-level` on a link. A page-nav
   * that read heading levels itself would have to look at the document, and the
   * document is not always where the headings are.
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
   * ## CSS Custom Properties
   *
   * CSS variables available for styling the component.
   *
   * - `--page-nav-indent`: How far each level is inset from the one above. (default: `undefined`)
   *
   * ## CSS Parts
   *
   * Custom selectors for styling elements within the component.
   *
   * - `nav`: The navigation landmark.
   */
  "helix-page-nav": Partial<
    HelixPageNavProps &
      HelixPageNavSolidJsProps &
      BaseProps<HelixPageNav> &
      BaseEvents
  >;

  /**
   * A surface with an inset and a shadow, and nothing about what goes in it. The
   * inset is the panel's rather than the consumer's, which is the same call
   * `Dialog` and `Drawer` make and for the same reason: everyone was writing it,
   * and everyone was writing the same one.
   *
   * It arrives from the side it opened on. `data-placement` is written by the
   * positioning, so the panel knows which way it flipped and can animate from the
   * trigger rather than from a fixed direction that would be backwards half the
   * time.
   *
   * ## Attributes & Properties
   *
   * Component attributes and properties that can be applied to the element or by using JavaScript.
   *
   * - `appearance`: How the panel is framed.
   *
   * Unset is a surface with an inset, which is what a panel of content wants.
   * `plain` removes both, for a panel holding something that brings its own,
   * such as a list whose rows run to the edges.
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
   * - `label`: Accessible name for the panel.
   * - `offset`: Space between the trigger and the panel, in pixels.
   * - `placement`: Preferred side. It moves if that side does not fit.
   * - `onOpenChange`: The consumer's callback, invoked after the state is applied.
   *
   * Not an attribute: it is a function. And not reachable from React's JSX,
   * which reserves every `on[A-Z]` prop for its own event system and drops
   * what it does not recognise; the generated wrapper listens for the events
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
   * - `requestOpen(next: boolean) => boolean`: Requests an open-state change, and reports whether it was applied.
   *
   * Announces before it acts, so `preventDefault()` on the `helix-open` or
   * `helix-close` is a refusal and nothing moves. In uncontrolled mode the
   * element then updates itself; in controlled mode it applies nothing and
   * waits for the consumer to pass a new `open`, which is what "controlled"
   * means.
   * - `toggleOpen() => boolean`: Requests the opposite of the current state.
   * - `show() => void`: Opens the panel.
   * - `hide() => void`: Closes the panel and puts focus back on the trigger.
   *
   * ## CSS Custom Properties
   *
   * CSS variables available for styling the component.
   *
   * - `--popover-inset`: Space between the panel's edge and its contents. (default: `undefined`)
   * - `--popover-inline-size`: Width of the panel. (default: `undefined`)
   *
   * ## CSS Parts
   *
   * Custom selectors for styling elements within the component.
   *
   * - `popover`: The panel.
   */
  "helix-popover": Partial<
    HelixPopoverProps &
      HelixPopoverSolidJsProps &
      BaseProps<HelixPopover> &
      BaseEvents
  >;

  /**
   * A track and the part of it that is done. The height comes from a token rather
   * than from a size property, for the reason the rest of the library gives about
   * controls: how heavy a bar is says something about the region it is in, and a
   * `--progress-size` on that region says it once.
   *
   * The fill transitions, which is worth more here than it looks. Progress
   * arrives in steps, often large ones, and a bar that jumps between them reads
   * as a series of unrelated states where one that travels reads as a single
   * thing advancing.
   *
   * ## Attributes & Properties
   *
   * Component attributes and properties that can be applied to the element or by using JavaScript.
   *
   * - `tone`: What the fill means.
   *
   * Unset is the accent, which is what progress usually is. `success` is for a
   * bar that has arrived somewhere good and stays on screen to say so, and
   * `danger` for a quota being consumed rather than a task being finished:
   * both are the same geometry reading the opposite way.
   * - `label`: Accessible name for what is in progress.
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
   * ## CSS Custom Properties
   *
   * CSS variables available for styling the component.
   *
   * - `--progress-size`: Thickness of the bar. (default: `undefined`)
   * - `--progress-color`: Fill of the part that is done. (default: `undefined`)
   * - `--progress-track-color`: Fill of the part that is not. (default: `undefined`)
   *
   * ## CSS Parts
   *
   * Custom selectors for styling elements within the component.
   *
   * - `track`: The full length the work is measured against.
   * - `indicator`: The part of it that is done.
   */
  "helix-progress": Partial<
    HelixProgressProps &
      HelixProgressSolidJsProps &
      BaseProps<HelixProgress> &
      BaseEvents
  >;

  /**
   * Takes the surrounding type rather than a size of its own, because a quotation
   * inside a paragraph is that paragraph's text with marks around it.
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
   * ## CSS Custom Properties
   *
   * CSS variables available for styling the component.
   *
   * - `--quote-color`: Color of the quoted text. (default: `undefined`)
   *
   * ## CSS Parts
   *
   * Custom selectors for styling elements within the component.
   *
   * - `quote`: The quotation.
   */
  "helix-quote": Partial<
    HelixQuoteProps &
      HelixQuoteSolidJsProps &
      BaseProps<HelixQuote> &
      BaseEvents
  >;

  /**
   * The field's three parts, laid out the way every other field lays them out: a
   * question over the set, and one line under it that is help until something is
   * wrong. `orientation` lays out the choices and not the field, so a horizontal
   * group keeps its question above the row rather than beside the first choice.
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
   * - `name`: Name the group reports under when its form is submitted.
   * - `orientation`: Which way the choices run. A column reads one line per answer.
   * - `disabled`: Whether the control is non-interactive.
   *
   * Reflected, because the styled tier selects on it, and mirrored to
   * `aria-disabled` rather than removing the element from the accessibility
   * tree, so a screen reader can still announce that the control exists.
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
   * - `items`: The radios, in light-DOM order. Client only: the server has no tree. (property only) (readonly)
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
   *
   * ## CSS Custom Properties
   *
   * CSS variables available for styling the component.
   *
   * - `--radio-group-gap`: Space between the choices. (default: `undefined`)
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
  "helix-radio-group": Partial<
    HelixRadioGroupProps &
      HelixRadioGroupSolidJsProps &
      BaseProps<HelixRadioGroup> &
      BaseEvents
  >;

  /**
   * A circle with a dot in it, drawn here rather than by the browser for the
   * reason the checkbox's box is: this is a `<button role="radio">`, so there was
   * never a native control to restyle, and the weight and the motion of the mark
   * are ours either way.
   *
   * The dot scales from nothing, like the checkbox's tick, so choosing shows
   * something happening. It has no colour, because colour is reserved for state
   * and being chosen is an answer rather than a state.
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
   * ## CSS Custom Properties
   *
   * CSS variables available for styling the component.
   *
   * - `--radio-size`: Diameter of the circle. (default: `undefined`)
   * - `--radio-mark-color`: Colour of the dot. (default: `undefined`)
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
  "helix-radio": Partial<
    HelixRadioProps &
      HelixRadioSolidJsProps &
      BaseProps<HelixRadio> &
      BaseEvents
  >;

  /**
   * The trigger wears the same frame as an `Input`, because in a form it stands
   * in a row with them and a control that looks like a button among fields reads
   * as an action rather than an answer.
   *
   * The panel is an overlay surface rather than a sunken one: it sits over the
   * page instead of on it, which is what its shadow says and what tells it apart
   * from the field it came out of.
   *
   * ## Attributes & Properties
   *
   * Component attributes and properties that can be applied to the element or by using JavaScript.
   *
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
   * - `filterable`: Whether the list can be narrowed by typing.
   *
   * Passed to the listbox rather than acted on here, because the listbox owns
   * the filtering, the empty state and the keyboard. This property existed and
   * was never read: it reflected, it type-checked, and nothing anywhere
   * rendered a field. API that does nothing is worse than API that is missing,
   * because a consumer sets it and believes it.
   * - `multiple`: Whether more than one option can be the answer.
   * - `name`: Name the control reports under when its form is submitted.
   * - `placeholder`: Shown on the trigger while nothing is chosen.
   * - `disabled`: Whether the control is non-interactive.
   *
   * Reflected, because the styled tier selects on it, and mirrored to
   * `aria-disabled` rather than removing the element from the accessibility
   * tree, so a screen reader can still announce that the control exists.
   * - `onOpenChange`: The consumer's callback, invoked after the state is applied.
   *
   * Not an attribute: it is a function. And not reachable from React's JSX,
   * which reserves every `on[A-Z]` prop for its own event system and drops
   * what it does not recognise; the generated wrapper listens for the events
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
   *
   * ## CSS Custom Properties
   *
   * CSS variables available for styling the component.
   *
   * - `--select-surface-max-block-size`: How tall the panel gets. (default: `undefined`)
   *
   * ## CSS Parts
   *
   * Custom selectors for styling elements within the component.
   *
   * - `label`: The question, over the trigger.
   * - `trigger`: The closed control, which says what is chosen.
   * - `surface`: The floating panel.
   * - `listbox`: The list inside it.
   * - `hint`: Help under the trigger.
   * - `feedback`: What is wrong with it.
   */
  "helix-select": Partial<
    HelixSelectProps &
      HelixSelectSolidJsProps &
      BaseProps<HelixSelect> &
      BaseEvents
  >;

  /**
   * A sweep rather than a pulse. A block fading in and out reads as something
   * broken; a highlight travelling across it reads as work in progress, and it is
   * the same one property animating either way.
   *
   * ## Attributes & Properties
   *
   * Component attributes and properties that can be applied to the element or by using JavaScript.
   *
   * - `shape`: What the missing content is shaped like.
   *
   * Unset is a block, which is what most missing things are.
   *
   * ## CSS Custom Properties
   *
   * CSS variables available for styling the component.
   *
   * - `--skeleton-size`: Diameter of the circle shape. (default: `undefined`)
   *
   * ## CSS Parts
   *
   * Custom selectors for styling elements within the component.
   *
   * - `skeleton`: The placeholder surface.
   */
  "helix-skeleton": Partial<
    HelixSkeletonProps &
      HelixSkeletonSolidJsProps &
      BaseProps<HelixSkeleton> &
      BaseEvents
  >;

  /**
   * The track and the thumb are the browser's own, restyled through the range
   * pseudo-elements rather than replaced. What that buys is everything a
   * hand-built slider has to reimplement and usually gets slightly wrong: the
   * drag, the keys, and a hit area sized by the platform for a finger.
   *
   * The filled part of the track is painted with a gradient driven by the
   * fraction the headless tier writes, rather than by a second element laid over
   * it. One element cannot be half one colour by any other means that survives
   * the thumb being dragged.
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
   * - `max`: The largest value the reader can choose.
   * - `min`: The smallest value the reader can choose.
   * - `name`: Name submitted with the form.
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
   * - `marker-labels`/`markerLabels`: Whether each mark says which value it stands at.
   * - `step`: How far one press of an arrow key moves it.
   * - `disabled`: Whether the control is non-interactive.
   *
   * Reflected, because the styled tier selects on it, and mirrored to
   * `aria-disabled` rather than removing the element from the accessibility
   * tree, so a screen reader can still announce that the control exists.
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
   * - `valueAsNumber`: The chosen value as a number, for anything doing arithmetic on it. (property only) (readonly)
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
   *
   * ## CSS Custom Properties
   *
   * CSS variables available for styling the component.
   *
   * - `--slider-thumb-color`: The handle. (default: `undefined`)
   * - `--slider-track-color`: The part not yet chosen. (default: `undefined`)
   * - `--slider-fill-color`: The part behind the thumb. (default: `undefined`)
   *
   * ## CSS Parts
   *
   * Custom selectors for styling elements within the component.
   *
   * - `field`: The row: the control and its readout.
   * - `control`: The range input.
   * - `output`: The current value, shown beside it.
   */
  "helix-slider": Partial<
    HelixSliderProps &
      HelixSliderSolidJsProps &
      BaseProps<HelixSlider> &
      BaseEvents
  >;

  /**
   * Sized in `em`, so it matches whatever text it sits beside without being told.
   * The color is `currentColor` for the same reason: a spinner inside a primary
   * button is on the accent, and one in body copy is not, and neither should have
   * to say so.
   *
   * ## Attributes & Properties
   *
   * Component attributes and properties that can be applied to the element or by using JavaScript.
   *
   * - `size`: Diameter relative to the surrounding text.
   * - `label`: Accessible name, announced while the work is outstanding.
   *
   * ## Slots
   *
   * Areas where markup can be added to the component.
   *
   * - `(default)`: A mark to sit still at the centre, usually a logo. Empty by default.
   *
   * ## CSS Custom Properties
   *
   * CSS variables available for styling the component.
   *
   * - `--spinner-size`: Diameter. Defaults to 1.5em. (default: `undefined`)
   * - `--spinner-color`: Color of the moving arc. (default: `undefined`)
   * - `--spinner-track-color`: Color of the circle behind it. (default: `undefined`)
   *
   * ## CSS Parts
   *
   * Custom selectors for styling elements within the component.
   *
   * - `svg`: The rotating circle pair.
   * - `mark`: The region holding what was slotted at the centre.
   * - `track`: The full circle behind the indicator.
   * - `indicator`: The arc that turns.
   */
  "helix-spinner": Partial<
    HelixSpinnerProps &
      HelixSpinnerSolidJsProps &
      BaseProps<HelixSpinner> &
      BaseEvents
  >;

  /**
   * Wraps rather than scrolls, and each figure keeps its own width instead of
   * every one taking an equal share: a set of figures is read by comparing them,
   * and equal columns make a four-digit number and a two-digit one look like the
   * same quantity.
   *
   * ## Attributes & Properties
   *
   * Component attributes and properties that can be applied to the element or by using JavaScript.
   *
   * - `divided`: Whether the figures are separated by a rule as well as by space.
   * - `label`: Accessible name for the set.
   *
   * ## Slots
   *
   * Areas where markup can be added to the component.
   *
   * - `(default)`: The stats.
   *
   * ## CSS Custom Properties
   *
   * CSS variables available for styling the component.
   *
   * - `--stat-group-gap`: Space between figures. (default: `undefined`)
   */
  "helix-stat-group": Partial<
    HelixStatGroupProps &
      HelixStatGroupSolidJsProps &
      BaseProps<HelixStatGroup> &
      BaseEvents
  >;

  /**
   * The value is set on the display face at a size the type scale does not reach,
   * because a figure is the one place on a page where the number is the design.
   * The label sits above it in the label ramp, quiet and wide-tracked, so the
   * pair reads as one object rather than as two lines of text.
   *
   * ## Slots
   *
   * Areas where markup can be added to the component.
   *
   * - `(default)`: The value.
   * - `label`: What the value measures.
   * - `unit`: The unit, set beside the value.
   * - `detail`: A change, comparison, or note under the label.
   *
   * ## CSS Custom Properties
   *
   * CSS variables available for styling the component.
   *
   * - `--stat-value-size`: Size of the figure. (default: `undefined`)
   */
  "helix-stat": Partial<
    HelixStatProps & HelixStatSolidJsProps & BaseProps<HelixStat> & BaseEvents
  >;

  /**
   * A thumb travelling in a groove, which is the one place in the library colour
   * is used to say "on". A checkbox does not, because a tick is legible on its
   * own; a switch has no mark, so the fill is the whole of what distinguishes the
   * two states and there is nothing else for it to be.
   *
   * The input itself is the hit target and is drawn as the track, stretched over
   * it and invisible, so the press, the focus and the label forwarding are all
   * the platform's while the picture is ours.
   *
   * **Its height is `--helix-size-switch`, which is one step above the
   * checkbox's** at every density rather than the same as it. A checkbox is a box
   * with a mark in it; a switch is a track with a thumb inside it, and at the
   * checkbox's height the thumb has two pixels of groove around it and the whole
   * control reads as a small dash. The width follows the height, so setting
   * `--switch-height` widens it too and the proportion is not something a
   * consumer has to keep.
   *
   * ## Attributes & Properties
   *
   * Component attributes and properties that can be applied to the element or by using JavaScript.
   *
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
   * - `name`: Name submitted with the form.
   * - `value`: Value submitted when the switch is on.
   * - `disabled`: Whether the control is non-interactive.
   *
   * Reflected, because the styled tier selects on it, and mirrored to
   * `aria-disabled` rather than removing the element from the accessibility
   * tree, so a screen reader can still announce that the control exists.
   * - `onCheckedChange`: The consumer's callback, invoked after the state is applied.
   *
   * Not an attribute: it is a function. And not reachable from React's JSX,
   * which reserves every `on[A-Z]` prop for its own event system and drops
   * what it does not recognise; the generated wrapper listens for the event
   * instead. (property only)
   * - `resolvedFeedback`: The message actually shown: the consumer's, or the platform's, or none. (property only) (readonly)
   * - `describedBy`: Id of the description node, for `aria-describedby` on the control.
   *
   * One at a time, because only one of the two is ever rendered. Naming both
   * would point a screen reader at an id that resolves to nothing, which it
   * reads as a description it cannot find. (property only) (readonly)
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
   * - `formResetCallback() => void`: Returns the switch to the state its markup declared.
   *
   * ## CSS Custom Properties
   *
   * CSS variables available for styling the component.
   *
   * - `--switch-height`: Height of the track. The width follows it. (default: `undefined`)
   * - `--switch-width`: Length of the track, if not the derived one. (default: `undefined`)
   * - `--switch-on-color`: Fill when it is on. (default: `undefined`)
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
  "helix-switch": Partial<
    HelixSwitchProps &
      HelixSwitchSolidJsProps &
      BaseProps<HelixSwitch> &
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
   * Styled as the header cell it is, and it carries the same rule and inset as
   * the cells beneath it so the heading and its column read as one line down the
   * table.
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
  "helix-table-column": Partial<
    HelixTableColumnProps &
      HelixTableColumnSolidJsProps &
      BaseProps<HelixTableColumn> &
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
   * - `onActiveChange`: The consumer's callback, invoked after the change is applied. (property only)
   *
   * ## Events
   *
   * Events that will be emitted by the component.
   *
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
   * - `tabs`: The tab list.
   * - `panels`: The panel container.
   */
  "helix-tabs": Partial<
    HelixTabsProps & HelixTabsSolidJsProps & BaseProps<HelixTabs> & BaseEvents
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
  "helix-tabs-tab": Partial<
    HelixTabsTabProps &
      HelixTabsTabSolidJsProps &
      BaseProps<HelixTabsTab> &
      BaseEvents
  >;

  /**
   * Five appearances. The fill is a tint of the status color, mixed with
   * `color-mix` rather than held as a token per status, so a theme that changes
   * the status colors gets the tints with them.
   *
   * ## Attributes & Properties
   *
   * Component attributes and properties that can be applied to the element or by using JavaScript.
   *
   * - `appearance`: Which status the tag reports.
   * - `dismissible`: Whether the tag offers a control to remove itself.
   * - `dismiss-label`/`dismissLabel`: Accessible name for the dismiss control.
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
   * - `helix-dismiss`: Fired when the reader asks to remove the tag.
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
   * - `dismiss`: The remove button, when `dismissible`.
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
   * `tone` stays separate, because color carries state rather than typography.
   * Folding it in would mean `caption-danger` and `label-primary` and the rest of
   * the cross product, which is the explosion `appearance` exists to prevent.
   *
   * ## Attributes & Properties
   *
   * Component attributes and properties that can be applied to the element or by using JavaScript.
   *
   * - `as`: Which element to render. Decides the outline and the semantics.
   * - `appearance`: Type treatment. Defaults to the one that matches `as`.
   * - `tone`: Color role. Separate from `appearance`, because color carries state.
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
   * The same frame an `Input` wears, so a form of mixed fields reads as one set
   * rather than as two kinds of box. What differs is the resize handle, which is
   * the platform's and is left alone on the block axis only: a field that can be
   * dragged wider than the form holding it is a field that breaks the layout.
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
   * - `auto-grow`/`autoGrow`: Whether the box follows its own content rather than scrolling.
   * - `name`: Name submitted with the form.
   * - `placeholder`: Shown while the field is empty. Not a label: it goes when typing starts.
   * - `read-only`/`readOnly`: Whether the field refuses input while still submitting its value.
   * - `rows`: How many lines the box is before anything is typed.
   * - `disabled`: Whether the control is non-interactive.
   *
   * Reflected, because the styled tier selects on it, and mirrored to
   * `aria-disabled` rather than removing the element from the accessibility
   * tree, so a screen reader can still announce that the control exists.
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
   * - `focus(options?: FocusOptions) => void`: Puts the caret in the field, the way a label pointing at one would.
   *
   * ## CSS Custom Properties
   *
   * CSS variables available for styling the component.
   *
   * - `--textarea-background-color`: Fill behind the text. (default: `undefined`)
   *
   * ## CSS Parts
   *
   * Custom selectors for styling elements within the component.
   *
   * - `field`: The box holding the control.
   * - `control`: The textarea itself.
   */
  "helix-textarea": Partial<
    HelixTextareaProps &
      HelixTextareaSolidJsProps &
      BaseProps<HelixTextarea> &
      BaseEvents
  >;

  /**
   * A surface with a shadow, because a toast sits over whatever the reader was
   * looking at rather than in it. The severity is a bar down the leading edge and
   * not a fill: a message is text to be read, and a coloured panel behind it
   * costs contrast for something the mark already says.
   *
   * ## Attributes & Properties
   *
   * Component attributes and properties that can be applied to the element or by using JavaScript.
   *
   * - `dismiss-label`/`dismissLabel`: Accessible name for the dismiss control.
   * - `dismissible`: Whether the reader can ask for it to go.
   * - `duration`: How long it stays, in milliseconds. Absent means until it is dismissed.
   *
   * Read once when the item is first rendered. Changing it afterwards does not
   * restart a message the reader is already partway through.
   * - `severity`: What kind of message it is, which picks the mark and its name.
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
   * - `icon`: Replaces the glyph inside the dismiss control.
   *
   * ## Methods
   *
   * Methods that can be called to access component functionality.
   *
   * - `dismiss() => boolean`: Asks to be taken away, and reports whether the request stood.
   * - `pause() => void`: Stops the clock, leaving whatever is left of it.
   * - `resume() => void`: Starts it again from where it stopped.
   *
   * ## CSS Custom Properties
   *
   * CSS variables available for styling the component.
   *
   * - `--toast-item-inset`: Space between the message's edge and its contents. (default: `undefined`)
   *
   * ## CSS Parts
   *
   * Custom selectors for styling elements within the component.
   *
   * - `item`: The message's own surface.
   * - `content`: The message.
   * - `actions`: The region holding what to do about it.
   * - `dismiss`: The control that asks to close.
   */
  "helix-toast-item": Partial<
    HelixToastItemProps &
      HelixToastItemSolidJsProps &
      BaseProps<HelixToastItem> &
      BaseEvents
  >;

  /**
   * Fixed to the window, and it catches nothing: the region spans a whole edge,
   * so a stack of one message in a corner would otherwise put an invisible bar
   * across everything beside it. The region is transparent to a pointer and the
   * messages take it back.
   *
   * **It belongs at the root of the application.** `position: fixed` is
   * positioned against the viewport only while no ancestor carries `transform`,
   * `filter`, `perspective` or `contain`, any of which makes that ancestor the
   * containing block instead, and it is still clipped by an ancestor with
   * `overflow: hidden`. That is a real constraint rather than a style note, and
   * it is the same fact that put every other floating surface in this library
   * into the top layer.
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
   * ## CSS Custom Properties
   *
   * CSS variables available for styling the component.
   *
   * - `--toast-inset`: Distance from the edges of the window. (default: `undefined`)
   * - `--toast-gap`: Space between one message and the next. (default: `undefined`)
   * - `--toast-inline-size`: Width of a message. (default: `undefined`)
   *
   * ## CSS Parts
   *
   * Custom selectors for styling elements within the component.
   *
   * - `region`: The stack the messages are in.
   */
  "helix-toast": Partial<
    HelixToastProps &
      HelixToastSolidJsProps &
      BaseProps<HelixToast> &
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
   * - `name`: Name the group reports under when its form is submitted.
   * - `disabled`: Whether the control is non-interactive.
   *
   * Reflected, because the styled tier selects on it, and mirrored to
   * `aria-disabled` rather than removing the element from the accessibility
   * tree, so a screen reader can still announce that the control exists.
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
   * - `form`: The form this control belongs to, if any. (property only) (readonly)
   * - `labels`: Labels associated with this control. (property only) (readonly)
   *
   * ## Events
   *
   * Events that will be emitted by the component.
   *
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
   * Carries no background of its own. The selected look comes from the group's
   * indicator sitting behind it, which is what lets that marker travel instead of
   * one fill appearing as another disappears.
   *
   * ## Attributes & Properties
   *
   * Component attributes and properties that can be applied to the element or by using JavaScript.
   *
   * - `value`: Identifies the item to the group.
   * - `selected`: Whether this item is the current one.
   * - `disabled`: Whether the item can be chosen.
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
   * - `item`: The button or anchor.
   */
  "helix-toggle": Partial<
    HelixToggleProps &
      HelixToggleSolidJsProps &
      BaseProps<HelixToggle> &
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
   * The bubble is in the top layer, so it needs no `z-index` and cannot be
   * clipped by whatever it sits inside.
   *
   * The arrow is positioned by the same pass that positions the bubble, so it
   * still points at the trigger after the bubble has slid along to stay in view.
   *
   * ## Attributes & Properties
   *
   * Component attributes and properties that can be applied to the element or by using JavaScript.
   *
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
   * - `content`: The text shown in the bubble.
   *
   * The common case, and the fallback for the `content` slot: slot something
   * there and it replaces this. Both cannot show at once, which is the point
   * of using fallback content rather than rendering whichever is present.
   * - `placement`: Preferred side. It moves if that side does not fit.
   * - `offset`: Space between the trigger and the bubble, in pixels.
   * - `disabled`: Whether the tooltip never shows.
   * - `delay`: How long the pointer must rest before the bubble appears, in milliseconds.
   *
   * Without one, sweeping across a row of controls flashes a tooltip for each
   * of them, which is noise rather than help. Focus opens with no delay: a
   * keyboard reader arriving on a control has already committed to it.
   * - `delay-out`/`delayOut`: How long the bubble stays after the pointer leaves, in milliseconds.
   * - `onOpenChange`: The consumer's callback, invoked after the state is applied.
   *
   * Not an attribute: it is a function. And not reachable from React's JSX,
   * which reserves every `on[A-Z]` prop for its own event system and drops
   * what it does not recognise; the generated wrapper listens for the events
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
   * - `requestOpen(next: boolean) => boolean`: Requests an open-state change, and reports whether it was applied.
   *
   * Announces before it acts, so `preventDefault()` on the `helix-open` or
   * `helix-close` is a refusal and nothing moves. In uncontrolled mode the
   * element then updates itself; in controlled mode it applies nothing and
   * waits for the consumer to pass a new `open`, which is what "controlled"
   * means.
   * - `toggleOpen() => boolean`: Requests the opposite of the current state.
   * - `show() => void`: Shows the bubble, unless there is nothing to show.
   * - `hide() => void`: Hides the bubble.
   *
   * ## CSS Custom Properties
   *
   * CSS variables available for styling the component.
   *
   * - `--tooltip-background-color`: Fill of the bubble. (default: `undefined`)
   * - `--tooltip-max-inline-size`: Widest the bubble grows before wrapping. (default: `undefined`)
   *
   * ## CSS Parts
   *
   * Custom selectors for styling elements within the component.
   *
   * - `tooltip`: The bubble.
   * - `arrow`: The point aimed at the trigger.
   */
  "helix-tooltip": Partial<
    HelixTooltipProps &
      HelixTooltipSolidJsProps &
      BaseProps<HelixTooltip> &
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
   * - `helix-select`: Fired when the item is chosen.
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
   *
   * ## CSS Custom Properties
   *
   * CSS variables available for styling the component.
   *
   * - `--tree-indent`: Indent added per level. (default: `undefined`)
   * - `--tree-chevron-size`: Size of the chevron, and the gutter a leaf reserves. (default: `undefined`)
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
   * - `onActiveChange`: The consumer's callback, invoked after the change is applied. (property only)
   *
   * ## Events
   *
   * Events that will be emitted by the component.
   *
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
   * ## CSS Custom Properties
   *
   * CSS variables available for styling the component.
   *
   * - `--tree-indent`: Indent added per level. (default: `undefined`)
   * - `--tree-chevron-size`: Size of the chevron, and the gutter a leaf reserves. (default: `undefined`)
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
  /** Inset of the trigger and content. */
  "--accordion-item-padding"?: string;
  /** Color of the surrounding rule. */
  "--accordion-border-color"?: string;
  /** Corner radius of the stack. */
  "--accordion-radii"?: string;
  /** Inline padding, matched to the page. */
  "--announcement-inset"?: string;
  /** Fill behind the banner. */
  "--app-header-background"?: string;
  /** Height of the banner. */
  "--app-header-height"?: string;
  /** Inline padding of the banner. */
  "--app-header-inset"?: string;
  /** Width the content is centered in. */
  "--app-header-max-inline-size"?: string;
  /** How far each avatar sits over the one before it. */
  "--avatar-group-overlap"?: string;
  /** The separation drawn between one avatar and the next. */
  "--avatar-group-ring-color"?: string;
  /** Fill behind the initials. */
  "--avatar-background-color"?: string;
  /** Edge length of the avatar. */
  "--avatar-size"?: string;
  /** Fill of the indicator. */
  "--badge-background-color"?: string;
  /** Pulls the mark in from the corner, along both axes. */
  "--badge-offset"?: string;
  /** The ring separating it from what is behind. */
  "--badge-ring-color"?: string;
  /** Size of the quoted passage. */
  "--blockquote-size"?: string;
  /** Color of the chevron. */
  "--breadcrumbs-separator-color"?: string;
  /** Fill behind a step under the pointer. */
  "--breadcrumb-hover-color"?: string;
  /** Space between items and separators. */
  "--breadcrumbs-gap"?: string;
  /** Fill behind the button. */
  "--button-background-color"?: string;
  /** Label and icon color. */
  "--button-foreground-color"?: string;
  /** Corner radius of the control. */
  "--button-radii"?: string;
  /** Width and height of a day. */
  "--calendar-day-size"?: string;
  /** Width of a column, which is what sets the space between days. */
  "--calendar-track-size"?: string;
  /** Height of a week row. */
  "--calendar-row-size"?: string;
  /** Fill behind a selected day. */
  "--calendar-selected-color"?: string;
  /** Band behind the days in a range. */
  "--calendar-range-color"?: string;
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
  /** Space between slides. */
  "--carousel-gap"?: string;
  /** Space between the boxes. */
  "--checkbox-group-gap"?: string;
  /** Width and height of the box. */
  "--checkbox-size"?: string;
  /** Fill of a ticked box. */
  "--checkbox-checked-color"?: string;
  /** Width of the panel. */
  "--dialog-inline-size"?: string;
  /** Padding inside the panel. */
  "--dialog-inset"?: string;
  /** Color of the rule. */
  "--divider-color"?: string;
  /** Thickness of the rule. */
  "--divider-thickness"?: string;
  /** Width or height of the panel. */
  "--drawer-size"?: string;
  /** Fill when a row is under the pointer. */
  "--drilldown-item-hover-color"?: string;
  /** Fill behind the pages. */
  "--drilldown-background"?: string;
  /** Width of the region. */
  "--drilldown-inline-size"?: string;
  /** Space around the whole block. */
  "--empty-inset"?: string;
  /** Column width floor when `min` is set. */
  "--grid-min"?: string;
  /** Edge length of the control. */
  "--icon-button-size"?: string;
  /** Edge length of the icon's box. */
  "--icon-size"?: string;
  /** Height of the field. */
  "--input-size"?: string;
  /** Fill behind the text. */
  "--input-background-color"?: string;
  /** Fill of the key. */
  "--kbd-background-color"?: string;
  /** Color of the hairline and the edge. */
  "--kbd-border-color"?: string;
  /** Padding inside the row. */
  "--list-item-inset"?: string;
  /** Space between rows. */
  "--list-gap"?: string;
  /** How tall it gets before it scrolls. */
  "--listbox-max-block-size"?: string;
  /** Fill under the pointer. */
  "--menu-item-hover-color"?: string;
  /** Narrowest the surface gets. */
  "--menu-min-inline-size"?: string;
  /** Fill of the surface. */
  "--menu-background-color"?: string;
  /** Fill of the traveling marker. */
  "--nav-bar-indicator-color"?: string;
  /** Space between destinations. */
  "--nav-bar-gap"?: string;
  /** Wash behind the option the keyboard is on. */
  "--option-active-color"?: string;
  /** How far each level is inset from the one above. */
  "--page-nav-indent"?: string;
  /** Space between the panel's edge and its contents. */
  "--popover-inset"?: string;
  /** Width of the panel. */
  "--popover-inline-size"?: string;
  /** Thickness of the bar. */
  "--progress-size"?: string;
  /** Fill of the part that is done. */
  "--progress-color"?: string;
  /** Fill of the part that is not. */
  "--progress-track-color"?: string;
  /** Color of the quoted text. */
  "--quote-color"?: string;
  /** Space between the choices. */
  "--radio-group-gap"?: string;
  /** Diameter of the circle. */
  "--radio-size"?: string;
  /** Colour of the dot. */
  "--radio-mark-color"?: string;
  /** How tall the panel gets. */
  "--select-surface-max-block-size"?: string;
  /** Diameter of the circle shape. */
  "--skeleton-size"?: string;
  /** The handle. */
  "--slider-thumb-color"?: string;
  /** The part not yet chosen. */
  "--slider-track-color"?: string;
  /** The part behind the thumb. */
  "--slider-fill-color"?: string;
  /** Diameter. Defaults to 1.5em. */
  "--spinner-size"?: string;
  /** Color of the moving arc. */
  "--spinner-color"?: string;
  /** Color of the circle behind it. */
  "--spinner-track-color"?: string;
  /** Space between figures. */
  "--stat-group-gap"?: string;
  /** Size of the figure. */
  "--stat-value-size"?: string;
  /** Height of the track. The width follows it. */
  "--switch-height"?: string;
  /** Length of the track, if not the derived one. */
  "--switch-width"?: string;
  /** Fill when it is on. */
  "--switch-on-color"?: string;
  /** Track list for the columns. */
  "--table-columns"?: string;
  /** Fill behind the tag. */
  "--tag-background-color"?: string;
  /** Label color. */
  "--tag-foreground-color"?: string;
  /** Corner radius of the tag. */
  "--tag-radii"?: string;
  /** Fill behind the text. */
  "--textarea-background-color"?: string;
  /** Space between the message's edge and its contents. */
  "--toast-item-inset"?: string;
  /** Distance from the edges of the window. */
  "--toast-inset"?: string;
  /** Space between one message and the next. */
  "--toast-gap"?: string;
  /** Width of a message. */
  "--toast-inline-size"?: string;
  /** Fill of the moving marker. */
  "--toggle-group-indicator-color"?: string;
  /** Space between controls. */
  "--toolbar-gap"?: string;
  /** Fill of the bubble. */
  "--tooltip-background-color"?: string;
  /** Widest the bubble grows before wrapping. */
  "--tooltip-max-inline-size"?: string;
  /** Indent added per level. */
  "--tree-indent"?: string;
  /** Size of the chevron, and the gutter a leaf reserves. */
  "--tree-chevron-size"?: string;
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
