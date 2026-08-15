import type {
  Helix,
  HelixBaseAccordion,
  HelixBaseAccordionItem,
  HelixBaseAppHeader,
  HelixBaseAvatar,
  HelixBaseBadge,
  HelixBaseBanner,
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
  HelixBaseDivider,
  HelixBaseDrawer,
  HelixBaseEmptyState,
  HelixBaseIcon,
  HelixBaseInput,
  HelixBaseKbd,
  HelixBaseList,
  HelixBaseListItem,
  HelixBaseMenu,
  HelixBaseMenuItem,
  HelixBaseNavBar,
  HelixBaseQuote,
  HelixBaseRadio,
  HelixBaseRadioGroup,
  HelixBaseSkeleton,
  HelixBaseSlider,
  HelixBaseSpinner,
  HelixBaseStat,
  HelixBaseStatGroup,
  HelixBaseSwitch,
  HelixBaseTable,
  HelixBaseTableCell,
  HelixBaseTableRow,
  HelixBaseTabs,
  HelixBaseTabsPanel,
  HelixBaseTabsTab,
  HelixBaseTag,
  HelixBaseTextarea,
  HelixBaseToggle,
  HelixBaseToggleGroup,
  HelixBaseToolbar,
  HelixBaseTooltip,
  HelixBaseTree,
  HelixBaseTreeItem,
  HelixChangeEvent,
  HelixCloseEvent,
  HelixDismissEvent,
  HelixFormElement,
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
  /** Whether the element is open. Setting this enters controlled mode. */
  open?: HelixBaseAccordionItem["open"];
  /** Initial open state for uncontrolled use. Ignored once `open` is set. */
  "default-open"?: HelixBaseAccordionItem["defaultOpen"];
  /** Initial open state for uncontrolled use. Ignored once `open` is set. */
  defaultOpen?: HelixBaseAccordionItem["defaultOpen"];
  /** The consumer's callback, invoked after the state is applied.

Not an attribute: it is a function. And not reachable from React's JSX,
which reserves every `on[A-Z]` prop for its own event system and drops
what it does not recognise; the generated wrapper listens for the events
instead. */
  onOpenChange?: HelixBaseAccordionItem["onOpenChange"];

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
  /** Whether the element is open. Setting this enters controlled mode. */
  "prop:open"?: HelixBaseAccordionItem["open"];
  /** Initial open state for uncontrolled use. Ignored once `open` is set. */
  "bool:default-open"?: HelixBaseAccordionItem["defaultOpen"];
  /** Initial open state for uncontrolled use. Ignored once `open` is set. */
  "prop:defaultOpen"?: HelixBaseAccordionItem["defaultOpen"];
  /** The consumer's callback, invoked after the state is applied.

Not an attribute: it is a function. And not reachable from React's JSX,
which reserves every `on[A-Z]` prop for its own event system and drops
what it does not recognise; the generated wrapper listens for the events
instead. */
  "prop:onOpenChange"?: HelixBaseAccordionItem["onOpenChange"];
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

/** `HelixBaseBanner` component event */
export type HelixBaseBannerElementEvent<E = Event> = TypedEvent<
  HelixBaseBanner,
  E
>;
/** `helix-dismiss` event type */
export type HelixBaseBannerHelixDismissElementEvent =
  HelixBaseBannerElementEvent<HelixDismissEvent>;

export type HelixBaseBannerProps = {
  /** What kind of attention the message needs. */
  severity?: HelixBaseBanner["severity"];
  /** Whether the reader can close it. */
  dismissible?: HelixBaseBanner["dismissible"];
  /** Accessible name for the dismiss control. */
  "dismiss-label"?: HelixBaseBanner["dismissLabel"];
  /** Accessible name for the dismiss control. */
  dismissLabel?: HelixBaseBanner["dismissLabel"];

  /** Fired when the reader asks to close it. */
  "onhelix-dismiss"?: (e: HelixBaseBannerHelixDismissElementEvent) => void;
};

export type HelixBaseBannerSolidJsProps = {
  /** What kind of attention the message needs. */
  "prop:severity"?: HelixBaseBanner["severity"];
  /** Whether the reader can close it. */
  "prop:dismissible"?: HelixBaseBanner["dismissible"];
  /** Accessible name for the dismiss control. */
  "attr:dismiss-label"?: HelixBaseBanner["dismissLabel"];
  /** Accessible name for the dismiss control. */
  "prop:dismissLabel"?: HelixBaseBanner["dismissLabel"];
  /** Fired when the reader asks to close it. */
  "on:helix-dismiss"?: (e: HelixBaseBannerHelixDismissElementEvent) => void;

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

/** `HelixBaseCalendar` component event */
export type HelixBaseCalendarElementEvent<E = Event> = TypedEvent<
  HelixBaseCalendar,
  E
>;
/** `helix-select` event type */
export type HelixBaseCalendarHelixSelectElementEvent =
  HelixBaseCalendarElementEvent<HelixSelectEvent>;

export type HelixBaseCalendarProps = {
  /** The selected dates, comma separated, as `YYYY-MM-DD`.

One date in `single`. Two in `range`, the earlier first. Any number in
`multiple`. One attribute across all three, so a consumer reads and writes
the same thing whatever the mode is. */
  value?: HelixBaseCalendar["value"];
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
  /** The month on show, as `YYYY-MM`. Follows `value`, then the current month. */
  month?: HelixBaseCalendar["month"];
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

  /** Fired when a date is chosen, with the ISO date. */
  "onhelix-select"?: (e: HelixBaseCalendarHelixSelectElementEvent) => void;
};

export type HelixBaseCalendarSolidJsProps = {
  /** The selected dates, comma separated, as `YYYY-MM-DD`.

One date in `single`. Two in `range`, the earlier first. Any number in
`multiple`. One attribute across all three, so a consumer reads and writes
the same thing whatever the mode is. */
  "prop:value"?: HelixBaseCalendar["value"];
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
  /** The month on show, as `YYYY-MM`. Follows `value`, then the current month. */
  "prop:month"?: HelixBaseCalendar["month"];
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
  /** Fired when a date is chosen, with the ISO date. */
  "on:helix-select"?: (e: HelixBaseCalendarHelixSelectElementEvent) => void;

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
  /** The slide in view, counted from zero. */
  index?: HelixBaseCarousel["index"];
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
  /** The slide in view, counted from zero. */
  "prop:index"?: HelixBaseCarousel["index"];
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
  /** Whether the label names the control without being shown. */
  "hide-label"?: HelixBaseCheckboxGroup["hideLabel"];
  /** Whether the label names the control without being shown. */
  hideLabel?: HelixBaseCheckboxGroup["hideLabel"];
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
  /** Whether the label names the control without being shown. */
  "bool:hide-label"?: HelixBaseCheckboxGroup["hideLabel"];
  /** Whether the label names the control without being shown. */
  "prop:hideLabel"?: HelixBaseCheckboxGroup["hideLabel"];
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
  /** Name submitted with the form. */
  name?: HelixBaseCheckbox["name"];
  /** Value submitted when the box is checked. */
  value?: HelixBaseCheckbox["value"];
  /** Whether the box shows as neither checked nor unchecked.

Presentation only. It never submits, and the first change resolves it. */
  indeterminate?: HelixBaseCheckbox["indeterminate"];
  /** Whether the control is checked. Setting this enters controlled mode. */
  checked?: HelixBaseCheckbox["checked"];
  /** Initial checked state for uncontrolled use. Ignored once `checked` is set. */
  "default-checked"?: HelixBaseCheckbox["defaultChecked"];
  /** Initial checked state for uncontrolled use. Ignored once `checked` is set. */
  defaultChecked?: HelixBaseCheckbox["defaultChecked"];
  /** Help under the control, shown while there is nothing wrong. */
  hint?: HelixBaseCheckbox["hint"];
  /** What is wrong, in the reader's words rather than the browser's. */
  feedback?: HelixBaseCheckbox["feedback"];
  /** Whether the label names the control without being shown. */
  "hide-label"?: HelixBaseCheckbox["hideLabel"];
  /** Whether the label names the control without being shown. */
  hideLabel?: HelixBaseCheckbox["hideLabel"];
  /** The accessible name, and the fallback for the `label` slot. */
  label?: HelixBaseCheckbox["label"];
  /** Whether the form refuses to submit without it. */
  required?: HelixBaseCheckbox["required"];
  /** Whether the control is non-interactive.

Reflected, because the styled tier selects on it, and mirrored to
`aria-disabled` rather than removing the element from the accessibility
tree, so a screen reader can still announce that the control exists. */
  disabled?: HelixBaseCheckbox["disabled"];
  /** The consumer's callback, invoked after the state is applied.

Not an attribute: it is a function. And not reachable from React's JSX,
which reserves every `on[A-Z]` prop for its own event system and drops
what it does not recognise; the generated wrapper listens for the event
instead. */
  onCheckedChange?: HelixBaseCheckbox["onCheckedChange"];

  /** Fired before the state changes, and cancelable. */
  "onhelix-change"?: (e: HelixBaseCheckboxHelixChangeElementEvent) => void;
  /** Relayed from the input once the state has changed. */
  onchange?: (e: HelixBaseCheckboxElementEvent) => void;
};

export type HelixBaseCheckboxSolidJsProps = {
  /** Name submitted with the form. */
  "prop:name"?: HelixBaseCheckbox["name"];
  /** Value submitted when the box is checked. */
  "prop:value"?: HelixBaseCheckbox["value"];
  /** Whether the box shows as neither checked nor unchecked.

Presentation only. It never submits, and the first change resolves it. */
  "prop:indeterminate"?: HelixBaseCheckbox["indeterminate"];
  /** Whether the control is checked. Setting this enters controlled mode. */
  "prop:checked"?: HelixBaseCheckbox["checked"];
  /** Initial checked state for uncontrolled use. Ignored once `checked` is set. */
  "bool:default-checked"?: HelixBaseCheckbox["defaultChecked"];
  /** Initial checked state for uncontrolled use. Ignored once `checked` is set. */
  "prop:defaultChecked"?: HelixBaseCheckbox["defaultChecked"];
  /** Help under the control, shown while there is nothing wrong. */
  "prop:hint"?: HelixBaseCheckbox["hint"];
  /** What is wrong, in the reader's words rather than the browser's. */
  "prop:feedback"?: HelixBaseCheckbox["feedback"];
  /** Whether the label names the control without being shown. */
  "bool:hide-label"?: HelixBaseCheckbox["hideLabel"];
  /** Whether the label names the control without being shown. */
  "prop:hideLabel"?: HelixBaseCheckbox["hideLabel"];
  /** The accessible name, and the fallback for the `label` slot. */
  "prop:label"?: HelixBaseCheckbox["label"];
  /** Whether the form refuses to submit without it. */
  "prop:required"?: HelixBaseCheckbox["required"];
  /** Whether the control is non-interactive.

Reflected, because the styled tier selects on it, and mirrored to
`aria-disabled` rather than removing the element from the accessibility
tree, so a screen reader can still announce that the control exists. */
  "prop:disabled"?: HelixBaseCheckbox["disabled"];
  /** The consumer's callback, invoked after the state is applied.

Not an attribute: it is a function. And not reachable from React's JSX,
which reserves every `on[A-Z]` prop for its own event system and drops
what it does not recognise; the generated wrapper listens for the event
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
  /** Whether the element is open. Setting this enters controlled mode. */
  open?: HelixBaseDrawer["open"];
  /** Initial open state for uncontrolled use. Ignored once `open` is set. */
  "default-open"?: HelixBaseDrawer["defaultOpen"];
  /** Initial open state for uncontrolled use. Ignored once `open` is set. */
  defaultOpen?: HelixBaseDrawer["defaultOpen"];
  /** The consumer's callback, invoked after the state is applied.

Not an attribute: it is a function. And not reachable from React's JSX,
which reserves every `on[A-Z]` prop for its own event system and drops
what it does not recognise; the generated wrapper listens for the events
instead. */
  onOpenChange?: HelixBaseDrawer["onOpenChange"];

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
  /** Whether the element is open. Setting this enters controlled mode. */
  "prop:open"?: HelixBaseDrawer["open"];
  /** Initial open state for uncontrolled use. Ignored once `open` is set. */
  "bool:default-open"?: HelixBaseDrawer["defaultOpen"];
  /** Initial open state for uncontrolled use. Ignored once `open` is set. */
  "prop:defaultOpen"?: HelixBaseDrawer["defaultOpen"];
  /** The consumer's callback, invoked after the state is applied.

Not an attribute: it is a function. And not reachable from React's JSX,
which reserves every `on[A-Z]` prop for its own event system and drops
what it does not recognise; the generated wrapper listens for the events
instead. */
  "prop:onOpenChange"?: HelixBaseDrawer["onOpenChange"];
  /** Fired when the drawer opens or closes. */
  "on:helix-open"?: (e: HelixBaseDrawerHelixOpenElementEvent) => void;

  /** Set the innerHTML of the element */
  innerHTML?: string;
  /** Set the textContent of the element */
  textContent?: string | number;
};

export type HelixBaseEmptyStateProps = {
  /** Whether the state is announced when it appears.

On by default: an empty state almost always replaces something that was
loading. Turn it off for one that was on the page from the start, which
has nothing to announce because nothing changed. */
  "no-announce"?: HelixBaseEmptyState["noAnnounce"];
  /** Whether the state is announced when it appears.

On by default: an empty state almost always replaces something that was
loading. Turn it off for one that was on the page from the start, which
has nothing to announce because nothing changed. */
  noAnnounce?: HelixBaseEmptyState["noAnnounce"];
};

export type HelixBaseEmptyStateSolidJsProps = {
  /** Whether the state is announced when it appears.

On by default: an empty state almost always replaces something that was
loading. Turn it off for one that was on the page from the start, which
has nothing to announce because nothing changed. */
  "bool:no-announce"?: HelixBaseEmptyState["noAnnounce"];
  /** Whether the state is announced when it appears.

On by default: an empty state almost always replaces something that was
loading. Turn it off for one that was on the page from the start, which
has nothing to announce because nothing changed. */
  "prop:noAnnounce"?: HelixBaseEmptyState["noAnnounce"];

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
  /** Name submitted with the form. */
  name?: HelixBaseInput["name"];
  /** Shown while the field is empty. Not a label: it goes when typing starts. */
  placeholder?: HelixBaseInput["placeholder"];
  /** Whether the field refuses input while still submitting its value. */
  "read-only"?: HelixBaseInput["readOnly"];
  /** Whether the field refuses input while still submitting its value. */
  readOnly?: HelixBaseInput["readOnly"];
  /** What the field accepts, which decides the keyboard and the validation. */
  type?: HelixBaseInput["type"];
  /** The value the markup declared, which is where a reset returns to. */
  "default-value"?: HelixBaseInput["defaultValue"];
  /** The value the markup declared, which is where a reset returns to. */
  defaultValue?: HelixBaseInput["defaultValue"];
  /** What the control holds now, and what its form submits. */
  value?: HelixBaseInput["value"];
  /** Help under the control, shown while there is nothing wrong. */
  hint?: HelixBaseInput["hint"];
  /** What is wrong, in the reader's words rather than the browser's. */
  feedback?: HelixBaseInput["feedback"];
  /** Whether the label names the control without being shown. */
  "hide-label"?: HelixBaseInput["hideLabel"];
  /** Whether the label names the control without being shown. */
  hideLabel?: HelixBaseInput["hideLabel"];
  /** The accessible name, and the fallback for the `label` slot. */
  label?: HelixBaseInput["label"];
  /** Whether the form refuses to submit without it. */
  required?: HelixBaseInput["required"];
  /** Whether the control is non-interactive.

Reflected, because the styled tier selects on it, and mirrored to
`aria-disabled` rather than removing the element from the accessibility
tree, so a screen reader can still announce that the control exists. */
  disabled?: HelixBaseInput["disabled"];

  /** Fired as the text changes, and cancelable. */
  "onhelix-change"?: (e: HelixBaseInputHelixChangeElementEvent) => void;
  /** Relayed from the input once the reader has finished. */
  onchange?: (e: HelixBaseInputElementEvent) => void;
};

export type HelixBaseInputSolidJsProps = {
  /** Name submitted with the form. */
  "prop:name"?: HelixBaseInput["name"];
  /** Shown while the field is empty. Not a label: it goes when typing starts. */
  "prop:placeholder"?: HelixBaseInput["placeholder"];
  /** Whether the field refuses input while still submitting its value. */
  "bool:read-only"?: HelixBaseInput["readOnly"];
  /** Whether the field refuses input while still submitting its value. */
  "prop:readOnly"?: HelixBaseInput["readOnly"];
  /** What the field accepts, which decides the keyboard and the validation. */
  "prop:type"?: HelixBaseInput["type"];
  /** The value the markup declared, which is where a reset returns to. */
  "attr:default-value"?: HelixBaseInput["defaultValue"];
  /** The value the markup declared, which is where a reset returns to. */
  "prop:defaultValue"?: HelixBaseInput["defaultValue"];
  /** What the control holds now, and what its form submits. */
  "prop:value"?: HelixBaseInput["value"];
  /** Help under the control, shown while there is nothing wrong. */
  "prop:hint"?: HelixBaseInput["hint"];
  /** What is wrong, in the reader's words rather than the browser's. */
  "prop:feedback"?: HelixBaseInput["feedback"];
  /** Whether the label names the control without being shown. */
  "bool:hide-label"?: HelixBaseInput["hideLabel"];
  /** Whether the label names the control without being shown. */
  "prop:hideLabel"?: HelixBaseInput["hideLabel"];
  /** The accessible name, and the fallback for the `label` slot. */
  "prop:label"?: HelixBaseInput["label"];
  /** Whether the form refuses to submit without it. */
  "prop:required"?: HelixBaseInput["required"];
  /** Whether the control is non-interactive.

Reflected, because the styled tier selects on it, and mirrored to
`aria-disabled` rather than removing the element from the accessibility
tree, so a screen reader can still announce that the control exists. */
  "prop:disabled"?: HelixBaseInput["disabled"];
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
};

export type HelixBaseListSolidJsProps = {
  /** Accessible name for the set. */
  "prop:label"?: HelixBaseList["label"];

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
  /** Whether the element is open. Setting this enters controlled mode. */
  open?: HelixBaseMenu["open"];
  /** Initial open state for uncontrolled use. Ignored once `open` is set. */
  "default-open"?: HelixBaseMenu["defaultOpen"];
  /** Initial open state for uncontrolled use. Ignored once `open` is set. */
  defaultOpen?: HelixBaseMenu["defaultOpen"];
  /** The consumer's callback, invoked after the state is applied.

Not an attribute: it is a function. And not reachable from React's JSX,
which reserves every `on[A-Z]` prop for its own event system and drops
what it does not recognise; the generated wrapper listens for the events
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
  /** Whether the element is open. Setting this enters controlled mode. */
  "prop:open"?: HelixBaseMenu["open"];
  /** Initial open state for uncontrolled use. Ignored once `open` is set. */
  "bool:default-open"?: HelixBaseMenu["defaultOpen"];
  /** Initial open state for uncontrolled use. Ignored once `open` is set. */
  "prop:defaultOpen"?: HelixBaseMenu["defaultOpen"];
  /** The consumer's callback, invoked after the state is applied.

Not an attribute: it is a function. And not reachable from React's JSX,
which reserves every `on[A-Z]` prop for its own event system and drops
what it does not recognise; the generated wrapper listens for the events
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

export type HelixBaseNavBarProps = {
  /** Accessible name for the landmark. */
  label?: HelixBaseNavBar["label"];
};

export type HelixBaseNavBarSolidJsProps = {
  /** Accessible name for the landmark. */
  "prop:label"?: HelixBaseNavBar["label"];

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
  /** Name the group reports under when its form is submitted. */
  name?: HelixBaseRadioGroup["name"];
  /** Which way the choices run. A column reads one line per answer. */
  orientation?: HelixBaseRadioGroup["orientation"];
  /** The value the markup declared, which is where a reset returns to. */
  "default-value"?: HelixBaseRadioGroup["defaultValue"];
  /** The value the markup declared, which is where a reset returns to. */
  defaultValue?: HelixBaseRadioGroup["defaultValue"];
  /** What the control holds now, and what its form submits. */
  value?: HelixBaseRadioGroup["value"];
  /** Help under the control, shown while there is nothing wrong. */
  hint?: HelixBaseRadioGroup["hint"];
  /** What is wrong, in the reader's words rather than the browser's. */
  feedback?: HelixBaseRadioGroup["feedback"];
  /** Whether the label names the control without being shown. */
  "hide-label"?: HelixBaseRadioGroup["hideLabel"];
  /** Whether the label names the control without being shown. */
  hideLabel?: HelixBaseRadioGroup["hideLabel"];
  /** The accessible name, and the fallback for the `label` slot. */
  label?: HelixBaseRadioGroup["label"];
  /** Whether the form refuses to submit without it. */
  required?: HelixBaseRadioGroup["required"];
  /** Whether the control is non-interactive.

Reflected, because the styled tier selects on it, and mirrored to
`aria-disabled` rather than removing the element from the accessibility
tree, so a screen reader can still announce that the control exists. */
  disabled?: HelixBaseRadioGroup["disabled"];

  /** Fired when the answer changes, and cancelable. */
  "onhelix-change"?: (e: HelixBaseRadioGroupHelixChangeElementEvent) => void;
};

export type HelixBaseRadioGroupSolidJsProps = {
  /** Name the group reports under when its form is submitted. */
  "prop:name"?: HelixBaseRadioGroup["name"];
  /** Which way the choices run. A column reads one line per answer. */
  "prop:orientation"?: HelixBaseRadioGroup["orientation"];
  /** The value the markup declared, which is where a reset returns to. */
  "attr:default-value"?: HelixBaseRadioGroup["defaultValue"];
  /** The value the markup declared, which is where a reset returns to. */
  "prop:defaultValue"?: HelixBaseRadioGroup["defaultValue"];
  /** What the control holds now, and what its form submits. */
  "prop:value"?: HelixBaseRadioGroup["value"];
  /** Help under the control, shown while there is nothing wrong. */
  "prop:hint"?: HelixBaseRadioGroup["hint"];
  /** What is wrong, in the reader's words rather than the browser's. */
  "prop:feedback"?: HelixBaseRadioGroup["feedback"];
  /** Whether the label names the control without being shown. */
  "bool:hide-label"?: HelixBaseRadioGroup["hideLabel"];
  /** Whether the label names the control without being shown. */
  "prop:hideLabel"?: HelixBaseRadioGroup["hideLabel"];
  /** The accessible name, and the fallback for the `label` slot. */
  "prop:label"?: HelixBaseRadioGroup["label"];
  /** Whether the form refuses to submit without it. */
  "prop:required"?: HelixBaseRadioGroup["required"];
  /** Whether the control is non-interactive.

Reflected, because the styled tier selects on it, and mirrored to
`aria-disabled` rather than removing the element from the accessibility
tree, so a screen reader can still announce that the control exists. */
  "prop:disabled"?: HelixBaseRadioGroup["disabled"];
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
  /** Name submitted with the form. */
  name?: HelixBaseSlider["name"];
  /** Whether the chosen value is shown beside the track. */
  "show-value"?: HelixBaseSlider["showValue"];
  /** Whether the chosen value is shown beside the track. */
  showValue?: HelixBaseSlider["showValue"];
  /** How many marks to draw along the track, evenly spaced, ends included.

`0` or `1` draws none: one mark on a track says nothing about a range.
They are decoration, so they are `aria-hidden`; what a reader can land on
is `step`, which the input enforces regardless. */
  markers?: HelixBaseSlider["markers"];
  /** How far one press of an arrow key moves it. */
  step?: HelixBaseSlider["step"];
  /** The value the markup declared, which is where a reset returns to. */
  "default-value"?: HelixBaseSlider["defaultValue"];
  /** The value the markup declared, which is where a reset returns to. */
  defaultValue?: HelixBaseSlider["defaultValue"];
  /** What the control holds now, and what its form submits. */
  value?: HelixBaseSlider["value"];
  /** Help under the control, shown while there is nothing wrong. */
  hint?: HelixBaseSlider["hint"];
  /** What is wrong, in the reader's words rather than the browser's. */
  feedback?: HelixBaseSlider["feedback"];
  /** Whether the label names the control without being shown. */
  "hide-label"?: HelixBaseSlider["hideLabel"];
  /** Whether the label names the control without being shown. */
  hideLabel?: HelixBaseSlider["hideLabel"];
  /** The accessible name, and the fallback for the `label` slot. */
  label?: HelixBaseSlider["label"];
  /** Whether the form refuses to submit without it. */
  required?: HelixBaseSlider["required"];
  /** Whether the control is non-interactive.

Reflected, because the styled tier selects on it, and mirrored to
`aria-disabled` rather than removing the element from the accessibility
tree, so a screen reader can still announce that the control exists. */
  disabled?: HelixBaseSlider["disabled"];

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
  /** Name submitted with the form. */
  "prop:name"?: HelixBaseSlider["name"];
  /** Whether the chosen value is shown beside the track. */
  "bool:show-value"?: HelixBaseSlider["showValue"];
  /** Whether the chosen value is shown beside the track. */
  "prop:showValue"?: HelixBaseSlider["showValue"];
  /** How many marks to draw along the track, evenly spaced, ends included.

`0` or `1` draws none: one mark on a track says nothing about a range.
They are decoration, so they are `aria-hidden`; what a reader can land on
is `step`, which the input enforces regardless. */
  "prop:markers"?: HelixBaseSlider["markers"];
  /** How far one press of an arrow key moves it. */
  "prop:step"?: HelixBaseSlider["step"];
  /** The value the markup declared, which is where a reset returns to. */
  "attr:default-value"?: HelixBaseSlider["defaultValue"];
  /** The value the markup declared, which is where a reset returns to. */
  "prop:defaultValue"?: HelixBaseSlider["defaultValue"];
  /** What the control holds now, and what its form submits. */
  "prop:value"?: HelixBaseSlider["value"];
  /** Help under the control, shown while there is nothing wrong. */
  "prop:hint"?: HelixBaseSlider["hint"];
  /** What is wrong, in the reader's words rather than the browser's. */
  "prop:feedback"?: HelixBaseSlider["feedback"];
  /** Whether the label names the control without being shown. */
  "bool:hide-label"?: HelixBaseSlider["hideLabel"];
  /** Whether the label names the control without being shown. */
  "prop:hideLabel"?: HelixBaseSlider["hideLabel"];
  /** The accessible name, and the fallback for the `label` slot. */
  "prop:label"?: HelixBaseSlider["label"];
  /** Whether the form refuses to submit without it. */
  "prop:required"?: HelixBaseSlider["required"];
  /** Whether the control is non-interactive.

Reflected, because the styled tier selects on it, and mirrored to
`aria-disabled` rather than removing the element from the accessibility
tree, so a screen reader can still announce that the control exists. */
  "prop:disabled"?: HelixBaseSlider["disabled"];
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
  /** Name submitted with the form. */
  name?: HelixBaseSwitch["name"];
  /** Value submitted when the switch is on. */
  value?: HelixBaseSwitch["value"];
  /** Whether the control is checked. Setting this enters controlled mode. */
  checked?: HelixBaseSwitch["checked"];
  /** Initial checked state for uncontrolled use. Ignored once `checked` is set. */
  "default-checked"?: HelixBaseSwitch["defaultChecked"];
  /** Initial checked state for uncontrolled use. Ignored once `checked` is set. */
  defaultChecked?: HelixBaseSwitch["defaultChecked"];
  /** Help under the control, shown while there is nothing wrong. */
  hint?: HelixBaseSwitch["hint"];
  /** What is wrong, in the reader's words rather than the browser's. */
  feedback?: HelixBaseSwitch["feedback"];
  /** Whether the label names the control without being shown. */
  "hide-label"?: HelixBaseSwitch["hideLabel"];
  /** Whether the label names the control without being shown. */
  hideLabel?: HelixBaseSwitch["hideLabel"];
  /** The accessible name, and the fallback for the `label` slot. */
  label?: HelixBaseSwitch["label"];
  /** Whether the form refuses to submit without it. */
  required?: HelixBaseSwitch["required"];
  /** Whether the control is non-interactive.

Reflected, because the styled tier selects on it, and mirrored to
`aria-disabled` rather than removing the element from the accessibility
tree, so a screen reader can still announce that the control exists. */
  disabled?: HelixBaseSwitch["disabled"];
  /** The consumer's callback, invoked after the state is applied.

Not an attribute: it is a function. And not reachable from React's JSX,
which reserves every `on[A-Z]` prop for its own event system and drops
what it does not recognise; the generated wrapper listens for the event
instead. */
  onCheckedChange?: HelixBaseSwitch["onCheckedChange"];

  /** Fired before the state changes, and cancelable. */
  "onhelix-change"?: (e: HelixBaseSwitchHelixChangeElementEvent) => void;
  /** Relayed from the input once the state has changed. */
  onchange?: (e: HelixBaseSwitchElementEvent) => void;
};

export type HelixBaseSwitchSolidJsProps = {
  /** Name submitted with the form. */
  "prop:name"?: HelixBaseSwitch["name"];
  /** Value submitted when the switch is on. */
  "prop:value"?: HelixBaseSwitch["value"];
  /** Whether the control is checked. Setting this enters controlled mode. */
  "prop:checked"?: HelixBaseSwitch["checked"];
  /** Initial checked state for uncontrolled use. Ignored once `checked` is set. */
  "bool:default-checked"?: HelixBaseSwitch["defaultChecked"];
  /** Initial checked state for uncontrolled use. Ignored once `checked` is set. */
  "prop:defaultChecked"?: HelixBaseSwitch["defaultChecked"];
  /** Help under the control, shown while there is nothing wrong. */
  "prop:hint"?: HelixBaseSwitch["hint"];
  /** What is wrong, in the reader's words rather than the browser's. */
  "prop:feedback"?: HelixBaseSwitch["feedback"];
  /** Whether the label names the control without being shown. */
  "bool:hide-label"?: HelixBaseSwitch["hideLabel"];
  /** Whether the label names the control without being shown. */
  "prop:hideLabel"?: HelixBaseSwitch["hideLabel"];
  /** The accessible name, and the fallback for the `label` slot. */
  "prop:label"?: HelixBaseSwitch["label"];
  /** Whether the form refuses to submit without it. */
  "prop:required"?: HelixBaseSwitch["required"];
  /** Whether the control is non-interactive.

Reflected, because the styled tier selects on it, and mirrored to
`aria-disabled` rather than removing the element from the accessibility
tree, so a screen reader can still announce that the control exists. */
  "prop:disabled"?: HelixBaseSwitch["disabled"];
  /** The consumer's callback, invoked after the state is applied.

Not an attribute: it is a function. And not reachable from React's JSX,
which reserves every `on[A-Z]` prop for its own event system and drops
what it does not recognise; the generated wrapper listens for the event
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

/** `HelixBaseTabs` component event */
export type HelixBaseTabsElementEvent<E = Event> = TypedEvent<HelixBaseTabs, E>;
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
  /** Which item is current, by its `value`. */
  value?: HelixBaseTabs["value"];
  /** The consumer's callback, invoked after the change is applied. */
  onActiveChange?: HelixBaseTabs["onActiveChange"];

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
  /** Which item is current, by its `value`. */
  "prop:value"?: HelixBaseTabs["value"];
  /** The consumer's callback, invoked after the change is applied. */
  "prop:onActiveChange"?: HelixBaseTabs["onActiveChange"];
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
  /** Whether the tag offers a control to remove itself. */
  dismissible?: HelixBaseTag["dismissible"];
  /** Accessible name for the dismiss control.

A property rather than text read from the tag, because naming the button
"Remove Draft" would mean reading `textContent` and the server has no tree
to read it from.

The attribute is named explicitly. Lit lowercases a property name to get an
attribute rather than dash-casing it, so this would otherwise be reachable
only as `removelabel`, which nobody would guess and no linter would catch. */
  "dismiss-label"?: HelixBaseTag["dismissLabel"];
  /** Accessible name for the dismiss control.

A property rather than text read from the tag, because naming the button
"Remove Draft" would mean reading `textContent` and the server has no tree
to read it from.

The attribute is named explicitly. Lit lowercases a property name to get an
attribute rather than dash-casing it, so this would otherwise be reachable
only as `removelabel`, which nobody would guess and no linter would catch. */
  dismissLabel?: HelixBaseTag["dismissLabel"];

  /** Fired when the reader asks to remove the tag. */
  "onhelix-dismiss"?: (e: HelixBaseTagHelixDismissElementEvent) => void;
};

export type HelixBaseTagSolidJsProps = {
  /** Whether the tag offers a control to remove itself. */
  "prop:dismissible"?: HelixBaseTag["dismissible"];
  /** Accessible name for the dismiss control.

A property rather than text read from the tag, because naming the button
"Remove Draft" would mean reading `textContent` and the server has no tree
to read it from.

The attribute is named explicitly. Lit lowercases a property name to get an
attribute rather than dash-casing it, so this would otherwise be reachable
only as `removelabel`, which nobody would guess and no linter would catch. */
  "attr:dismiss-label"?: HelixBaseTag["dismissLabel"];
  /** Accessible name for the dismiss control.

A property rather than text read from the tag, because naming the button
"Remove Draft" would mean reading `textContent` and the server has no tree
to read it from.

The attribute is named explicitly. Lit lowercases a property name to get an
attribute rather than dash-casing it, so this would otherwise be reachable
only as `removelabel`, which nobody would guess and no linter would catch. */
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
  /** Name submitted with the form. */
  name?: HelixBaseTextarea["name"];
  /** Shown while the field is empty. Not a label: it goes when typing starts. */
  placeholder?: HelixBaseTextarea["placeholder"];
  /** Whether the field refuses input while still submitting its value. */
  "read-only"?: HelixBaseTextarea["readOnly"];
  /** Whether the field refuses input while still submitting its value. */
  readOnly?: HelixBaseTextarea["readOnly"];
  /** How many lines the box is before anything is typed. */
  rows?: HelixBaseTextarea["rows"];
  /** The value the markup declared, which is where a reset returns to. */
  "default-value"?: HelixBaseTextarea["defaultValue"];
  /** The value the markup declared, which is where a reset returns to. */
  defaultValue?: HelixBaseTextarea["defaultValue"];
  /** What the control holds now, and what its form submits. */
  value?: HelixBaseTextarea["value"];
  /** Help under the control, shown while there is nothing wrong. */
  hint?: HelixBaseTextarea["hint"];
  /** What is wrong, in the reader's words rather than the browser's. */
  feedback?: HelixBaseTextarea["feedback"];
  /** Whether the label names the control without being shown. */
  "hide-label"?: HelixBaseTextarea["hideLabel"];
  /** Whether the label names the control without being shown. */
  hideLabel?: HelixBaseTextarea["hideLabel"];
  /** The accessible name, and the fallback for the `label` slot. */
  label?: HelixBaseTextarea["label"];
  /** Whether the form refuses to submit without it. */
  required?: HelixBaseTextarea["required"];
  /** Whether the control is non-interactive.

Reflected, because the styled tier selects on it, and mirrored to
`aria-disabled` rather than removing the element from the accessibility
tree, so a screen reader can still announce that the control exists. */
  disabled?: HelixBaseTextarea["disabled"];

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
  /** Name submitted with the form. */
  "prop:name"?: HelixBaseTextarea["name"];
  /** Shown while the field is empty. Not a label: it goes when typing starts. */
  "prop:placeholder"?: HelixBaseTextarea["placeholder"];
  /** Whether the field refuses input while still submitting its value. */
  "bool:read-only"?: HelixBaseTextarea["readOnly"];
  /** Whether the field refuses input while still submitting its value. */
  "prop:readOnly"?: HelixBaseTextarea["readOnly"];
  /** How many lines the box is before anything is typed. */
  "prop:rows"?: HelixBaseTextarea["rows"];
  /** The value the markup declared, which is where a reset returns to. */
  "attr:default-value"?: HelixBaseTextarea["defaultValue"];
  /** The value the markup declared, which is where a reset returns to. */
  "prop:defaultValue"?: HelixBaseTextarea["defaultValue"];
  /** What the control holds now, and what its form submits. */
  "prop:value"?: HelixBaseTextarea["value"];
  /** Help under the control, shown while there is nothing wrong. */
  "prop:hint"?: HelixBaseTextarea["hint"];
  /** What is wrong, in the reader's words rather than the browser's. */
  "prop:feedback"?: HelixBaseTextarea["feedback"];
  /** Whether the label names the control without being shown. */
  "bool:hide-label"?: HelixBaseTextarea["hideLabel"];
  /** Whether the label names the control without being shown. */
  "prop:hideLabel"?: HelixBaseTextarea["hideLabel"];
  /** The accessible name, and the fallback for the `label` slot. */
  "prop:label"?: HelixBaseTextarea["label"];
  /** Whether the form refuses to submit without it. */
  "prop:required"?: HelixBaseTextarea["required"];
  /** Whether the control is non-interactive.

Reflected, because the styled tier selects on it, and mirrored to
`aria-disabled` rather than removing the element from the accessibility
tree, so a screen reader can still announce that the control exists. */
  "prop:disabled"?: HelixBaseTextarea["disabled"];
  /** Fired as the text changes, and cancelable. */
  "on:helix-change"?: (e: HelixBaseTextareaHelixChangeElementEvent) => void;
  /** Relayed from the textarea once the reader has finished. */
  "on:change"?: (e: HelixBaseTextareaElementEvent) => void;

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
/** `helix-select` event type */
export type HelixBaseToggleGroupHelixSelectElementEvent =
  HelixBaseToggleGroupElementEvent<HelixSelectEvent>;

export type HelixBaseToggleGroupProps = {
  /** Name the group reports under when its form is submitted. */
  name?: HelixBaseToggleGroup["name"];
  /** The value the markup declared, which is where a reset returns to. */
  "default-value"?: HelixBaseToggleGroup["defaultValue"];
  /** The value the markup declared, which is where a reset returns to. */
  defaultValue?: HelixBaseToggleGroup["defaultValue"];
  /** What the control holds now, and what its form submits. */
  value?: HelixBaseToggleGroup["value"];
  /** Help under the control, shown while there is nothing wrong. */
  hint?: HelixBaseToggleGroup["hint"];
  /** What is wrong, in the reader's words rather than the browser's. */
  feedback?: HelixBaseToggleGroup["feedback"];
  /** Whether the label names the control without being shown. */
  "hide-label"?: HelixBaseToggleGroup["hideLabel"];
  /** Whether the label names the control without being shown. */
  hideLabel?: HelixBaseToggleGroup["hideLabel"];
  /** The accessible name, and the fallback for the `label` slot. */
  label?: HelixBaseToggleGroup["label"];
  /** Whether the form refuses to submit without it. */
  required?: HelixBaseToggleGroup["required"];
  /** Whether the control is non-interactive.

Reflected, because the styled tier selects on it, and mirrored to
`aria-disabled` rather than removing the element from the accessibility
tree, so a screen reader can still announce that the control exists. */
  disabled?: HelixBaseToggleGroup["disabled"];

  /** Fired when an item is chosen. Dispatched by the item and listened for here. */
  "onhelix-select"?: (e: HelixBaseToggleGroupHelixSelectElementEvent) => void;
};

export type HelixBaseToggleGroupSolidJsProps = {
  /** Name the group reports under when its form is submitted. */
  "prop:name"?: HelixBaseToggleGroup["name"];
  /** The value the markup declared, which is where a reset returns to. */
  "attr:default-value"?: HelixBaseToggleGroup["defaultValue"];
  /** The value the markup declared, which is where a reset returns to. */
  "prop:defaultValue"?: HelixBaseToggleGroup["defaultValue"];
  /** What the control holds now, and what its form submits. */
  "prop:value"?: HelixBaseToggleGroup["value"];
  /** Help under the control, shown while there is nothing wrong. */
  "prop:hint"?: HelixBaseToggleGroup["hint"];
  /** What is wrong, in the reader's words rather than the browser's. */
  "prop:feedback"?: HelixBaseToggleGroup["feedback"];
  /** Whether the label names the control without being shown. */
  "bool:hide-label"?: HelixBaseToggleGroup["hideLabel"];
  /** Whether the label names the control without being shown. */
  "prop:hideLabel"?: HelixBaseToggleGroup["hideLabel"];
  /** The accessible name, and the fallback for the `label` slot. */
  "prop:label"?: HelixBaseToggleGroup["label"];
  /** Whether the form refuses to submit without it. */
  "prop:required"?: HelixBaseToggleGroup["required"];
  /** Whether the control is non-interactive.

Reflected, because the styled tier selects on it, and mirrored to
`aria-disabled` rather than removing the element from the accessibility
tree, so a screen reader can still announce that the control exists. */
  "prop:disabled"?: HelixBaseToggleGroup["disabled"];
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
  /** Space between the trigger and the bubble, in pixels. */
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
  /** Whether the element is open. Setting this enters controlled mode. */
  open?: HelixBaseTooltip["open"];
  /** Initial open state for uncontrolled use. Ignored once `open` is set. */
  "default-open"?: HelixBaseTooltip["defaultOpen"];
  /** Initial open state for uncontrolled use. Ignored once `open` is set. */
  defaultOpen?: HelixBaseTooltip["defaultOpen"];
  /** The consumer's callback, invoked after the state is applied.

Not an attribute: it is a function. And not reachable from React's JSX,
which reserves every `on[A-Z]` prop for its own event system and drops
what it does not recognise; the generated wrapper listens for the events
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
  /** Space between the trigger and the bubble, in pixels. */
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
  /** Whether the element is open. Setting this enters controlled mode. */
  "prop:open"?: HelixBaseTooltip["open"];
  /** Initial open state for uncontrolled use. Ignored once `open` is set. */
  "bool:default-open"?: HelixBaseTooltip["defaultOpen"];
  /** Initial open state for uncontrolled use. Ignored once `open` is set. */
  "prop:defaultOpen"?: HelixBaseTooltip["defaultOpen"];
  /** The consumer's callback, invoked after the state is applied.

Not an attribute: it is a function. And not reachable from React's JSX,
which reserves every `on[A-Z]` prop for its own event system and drops
what it does not recognise; the generated wrapper listens for the events
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
  "onhelix-select"?: (e: HelixBaseTreeItemHelixSelectElementEvent) => void;
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
  "on:helix-select"?: (e: HelixBaseTreeItemHelixSelectElementEvent) => void;

  /** Set the innerHTML of the element */
  innerHTML?: string;
  /** Set the textContent of the element */
  textContent?: string | number;
};

/** `HelixBaseTree` component event */
export type HelixBaseTreeElementEvent<E = Event> = TypedEvent<HelixBaseTree, E>;
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
  /** Which item is current, by its `value`. */
  value?: HelixBaseTree["value"];
  /** The consumer's callback, invoked after the change is applied. */
  onActiveChange?: HelixBaseTree["onActiveChange"];

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
  /** Which item is current, by its `value`. */
  "prop:value"?: HelixBaseTree["value"];
  /** The consumer's callback, invoked after the change is applied. */
  "prop:onActiveChange"?: HelixBaseTree["onActiveChange"];
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
   * - `open`: Whether the element is open. Setting this enters controlled mode.
   * - `default-open`/`defaultOpen`: Initial open state for uncontrolled use. Ignored once `open` is set.
   * - `isOpen`: The resolved open state, whichever mode the element is in. (property only) (readonly)
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
   * - `(default)`: The middle region, usually a `NavBar`.
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
   * Chrome rather than content. A banner sits above the header and speaks for the
   * whole page: a trial ending, a service degraded, a change of terms. A passage
   * that interrupts a document to set itself apart is a `Callout`, which is read
   * where it sits and cannot be dismissed. Neither is a variant of the other.
   *
   * **Always a polite live region.** `role="alert"` is assertive and interrupts
   * whatever is being read, which is right for something that appears mid-session
   * and wrong for something that was in the served HTML: an assertive banner
   * would cut across a screen-reader user on every page load, before they had
   * read anything. Politeness costs a moment and is never wrong; the severity
   * does not change that, because an error that was always there is still not an
   * interruption.
   *
   * Dismissing is a request. The banner does not remove itself, because the
   * consumer owns the markup and taking the node out from under them would put
   * their state and the document out of step. `preventDefault()` on the
   * `helix-dismiss` is a refusal.
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
   * ## CSS Parts
   *
   * Custom selectors for styling elements within the component.
   *
   * - `content`: The message region.
   * - `actions`: The trailing action region.
   * - `dismiss`: The control that asks to close.
   */
  "helix-base-banner": Partial<
    HelixBaseBannerProps & BaseProps<HelixBaseBanner> & BaseEvents
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
   * - `value`: The selected dates, comma separated, as `YYYY-MM-DD`.
   *
   * One date in `single`. Two in `range`, the earlier first. Any number in
   * `multiple`. One attribute across all three, so a consumer reads and writes
   * the same thing whatever the mode is.
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
   *
   * ## Events
   *
   * Events that will be emitted by the component.
   *
   * - `helix-select`: Fired when a date is chosen, with the ISO date.
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
   * Not a `Banner`, which is the other thing this could be mistaken for. A
   * callout interrupts a document to set a passage apart and is read where it
   * sits; a banner is page-level chrome above the masthead, announces itself as a
   * live region, and can be dismissed. Neither is a variant of the other.
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
   * - `loop`: Whether moving past either end wraps to the other.
   * - `autoplay`: Whether the carousel advances on its own.
   * - `interval`: How long each slide is held, in milliseconds.
   * - `slides`: The slides, in light-DOM order. Client only: the server has no tree. (property only) (readonly)
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
   * - `hide-label`/`hideLabel`: Whether the label names the control without being shown.
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
   * - `name`: Name submitted with the form.
   * - `value`: Value submitted when the box is checked.
   * - `indeterminate`: Whether the box shows as neither checked nor unchecked.
   *
   * Presentation only. It never submits, and the first change resolves it.
   * - `checked`: Whether the control is checked. Setting this enters controlled mode.
   * - `default-checked`/`defaultChecked`: Initial checked state for uncontrolled use. Ignored once `checked` is set.
   * - `hint`: Help under the control, shown while there is nothing wrong.
   * - `feedback`: What is wrong, in the reader's words rather than the browser's.
   * - `hide-label`/`hideLabel`: Whether the label names the control without being shown.
   * - `label`: The accessible name, and the fallback for the `label` slot.
   * - `required`: Whether the form refuses to submit without it.
   * - `disabled`: Whether the control is non-interactive.
   *
   * Reflected, because the styled tier selects on it, and mirrored to
   * `aria-disabled` rather than removing the element from the accessibility
   * tree, so a screen reader can still announce that the control exists.
   * - `isChecked`: The resolved checked state, whichever mode the element is in. (property only) (readonly)
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
  "helix-base-checkbox": Partial<
    HelixBaseCheckboxProps & BaseProps<HelixBaseCheckbox> & BaseEvents
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
   * - `open`: Whether the element is open. Setting this enters controlled mode.
   * - `default-open`/`defaultOpen`: Initial open state for uncontrolled use. Ignored once `open` is set.
   * - `isOpen`: The resolved open state, whichever mode the element is in. (property only) (readonly)
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
   * An empty region with no explanation is indistinguishable from one that failed
   * to load, so this exists to tell the difference: what would be here, and the
   * one action that would put something here.
   *
   * `role="status"` on a polite live region, because an empty state usually
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
   * On by default: an empty state almost always replaces something that was
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
  "helix-base-empty-state": Partial<
    HelixBaseEmptyStateProps & BaseProps<HelixBaseEmptyState> & BaseEvents
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
   * **Validity is the platform's.** The type, `required`, `pattern`, `minlength`
   * and the rest are set on the real input and its `validity` is copied onto the
   * host, so an email field rejects what the browser says is not an email rather
   * than what a regular expression here guesses. What this adds is the anchor, so
   * `reportValidity` points the bubble at the input rather than at the host.
   *
   * ## Attributes & Properties
   *
   * Component attributes and properties that can be applied to the element or by using JavaScript.
   *
   * - `name`: Name submitted with the form.
   * - `placeholder`: Shown while the field is empty. Not a label: it goes when typing starts.
   * - `read-only`/`readOnly`: Whether the field refuses input while still submitting its value.
   * - `type`: What the field accepts, which decides the keyboard and the validation.
   * - `default-value`/`defaultValue`: The value the markup declared, which is where a reset returns to.
   * - `value`: What the control holds now, and what its form submits.
   * - `hint`: Help under the control, shown while there is nothing wrong.
   * - `feedback`: What is wrong, in the reader's words rather than the browser's.
   * - `hide-label`/`hideLabel`: Whether the label names the control without being shown.
   * - `label`: The accessible name, and the fallback for the `label` slot.
   * - `required`: Whether the form refuses to submit without it.
   * - `disabled`: Whether the control is non-interactive.
   *
   * Reflected, because the styled tier selects on it, and mirrored to
   * `aria-disabled` rather than removing the element from the accessibility
   * tree, so a screen reader can still announce that the control exists.
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
   * - `focus(options?: FocusOptions) => void`: Puts the caret in the field, the way a label pointing at one would.
   * - `select() => void`: Selects everything in the field.
   * - `formResetCallback() => void`: Returns the control to the value its markup declared.
   * - `formStateRestoreCallback(state: string | null) => void`: Restores the value when the browser brings a form back.
   *
   * Falling back to `defaultValue` rather than to empty, because a restore
   * with no state is a form the browser has nothing recorded for, which is
   * the same situation as a fresh one.
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
   * anchor, the way `data-button` and `data-nav-item` do.
   *
   * ## Slots
   *
   * Areas where markup can be added to the component.
   *
   * - `start`: Leading content, usually an icon or an avatar.
   * - `(default)`: The label.
   * - `supporting`: Secondary text under the label.
   * - `end`: Trailing content.
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
   * - `hasSubmenu`: Whether anything was slotted into `submenu`. Client only. (property only) (readonly)
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
   * - `open`: Whether the element is open. Setting this enters controlled mode.
   * - `default-open`/`defaultOpen`: Initial open state for uncontrolled use. Ignored once `open` is set.
   * - `isOpen`: The resolved open state, whichever mode the element is in. (property only) (readonly)
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
   * `aria-current="page"` and styled by the `data-nav-item` recipe, for the same
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
  "helix-base-nav-bar": Partial<
    HelixBaseNavBarProps & BaseProps<HelixBaseNavBar> & BaseEvents
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
   * - `name`: Name the group reports under when its form is submitted.
   * - `orientation`: Which way the choices run. A column reads one line per answer.
   * - `default-value`/`defaultValue`: The value the markup declared, which is where a reset returns to.
   * - `value`: What the control holds now, and what its form submits.
   * - `hint`: Help under the control, shown while there is nothing wrong.
   * - `feedback`: What is wrong, in the reader's words rather than the browser's.
   * - `hide-label`/`hideLabel`: Whether the label names the control without being shown.
   * - `label`: The accessible name, and the fallback for the `label` slot.
   * - `required`: Whether the form refuses to submit without it.
   * - `disabled`: Whether the control is non-interactive.
   *
   * Reflected, because the styled tier selects on it, and mirrored to
   * `aria-disabled` rather than removing the element from the accessibility
   * tree, so a screen reader can still announce that the control exists.
   * - `items`: The radios, in light-DOM order. Client only: the server has no tree. (property only) (readonly)
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
   * - `formResetCallback() => void`: Returns the control to the value its markup declared.
   * - `formStateRestoreCallback(state: string | null) => void`: Restores the value when the browser brings a form back.
   *
   * Falling back to `defaultValue` rather than to empty, because a restore
   * with no state is a form the browser has nothing recorded for, which is
   * the same situation as a fresh one.
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
   * - `name`: Name submitted with the form.
   * - `show-value`/`showValue`: Whether the chosen value is shown beside the track.
   * - `markers`: How many marks to draw along the track, evenly spaced, ends included.
   *
   * `0` or `1` draws none: one mark on a track says nothing about a range.
   * They are decoration, so they are `aria-hidden`; what a reader can land on
   * is `step`, which the input enforces regardless.
   * - `step`: How far one press of an arrow key moves it.
   * - `default-value`/`defaultValue`: The value the markup declared, which is where a reset returns to.
   * - `value`: What the control holds now, and what its form submits.
   * - `hint`: Help under the control, shown while there is nothing wrong.
   * - `feedback`: What is wrong, in the reader's words rather than the browser's.
   * - `hide-label`/`hideLabel`: Whether the label names the control without being shown.
   * - `label`: The accessible name, and the fallback for the `label` slot.
   * - `required`: Whether the form refuses to submit without it.
   * - `disabled`: Whether the control is non-interactive.
   *
   * Reflected, because the styled tier selects on it, and mirrored to
   * `aria-disabled` rather than removing the element from the accessibility
   * tree, so a screen reader can still announce that the control exists.
   * - `valueAsNumber`: The chosen value as a number, for anything doing arithmetic on it. (property only) (readonly)
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
   * - `helix-change`: Fired as the value changes, and cancelable.
   * - `change`: Relayed once the reader has let go.
   *
   * ## Methods
   *
   * Methods that can be called to access component functionality.
   *
   * - `formResetCallback() => void`: Returns the control to the value its markup declared.
   * - `formStateRestoreCallback(state: string | null) => void`: Restores the value when the browser brings a form back.
   *
   * Falling back to `defaultValue` rather than to empty, because a restore
   * with no state is a form the browser has nothing recorded for, which is
   * the same situation as a fresh one.
   *
   * ## CSS Parts
   *
   * Custom selectors for styling elements within the component.
   *
   * - `field`: The row: the control and its readout.
   * - `control`: The range input.
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
   * ## CSS Parts
   *
   * Custom selectors for styling elements within the component.
   *
   * - `svg`: The rotating circle pair.
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
   * - `name`: Name submitted with the form.
   * - `value`: Value submitted when the switch is on.
   * - `checked`: Whether the control is checked. Setting this enters controlled mode.
   * - `default-checked`/`defaultChecked`: Initial checked state for uncontrolled use. Ignored once `checked` is set.
   * - `hint`: Help under the control, shown while there is nothing wrong.
   * - `feedback`: What is wrong, in the reader's words rather than the browser's.
   * - `hide-label`/`hideLabel`: Whether the label names the control without being shown.
   * - `label`: The accessible name, and the fallback for the `label` slot.
   * - `required`: Whether the form refuses to submit without it.
   * - `disabled`: Whether the control is non-interactive.
   *
   * Reflected, because the styled tier selects on it, and mirrored to
   * `aria-disabled` rather than removing the element from the accessibility
   * tree, so a screen reader can still announce that the control exists.
   * - `isChecked`: The resolved checked state, whichever mode the element is in. (property only) (readonly)
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
   * - `value`: Which item is current, by its `value`.
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
   * behavioural difference the platform owns and cannot be styled into existence,
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
   * - `name`: Name submitted with the form.
   * - `placeholder`: Shown while the field is empty. Not a label: it goes when typing starts.
   * - `read-only`/`readOnly`: Whether the field refuses input while still submitting its value.
   * - `rows`: How many lines the box is before anything is typed.
   * - `default-value`/`defaultValue`: The value the markup declared, which is where a reset returns to.
   * - `value`: What the control holds now, and what its form submits.
   * - `hint`: Help under the control, shown while there is nothing wrong.
   * - `feedback`: What is wrong, in the reader's words rather than the browser's.
   * - `hide-label`/`hideLabel`: Whether the label names the control without being shown.
   * - `label`: The accessible name, and the fallback for the `label` slot.
   * - `required`: Whether the form refuses to submit without it.
   * - `disabled`: Whether the control is non-interactive.
   *
   * Reflected, because the styled tier selects on it, and mirrored to
   * `aria-disabled` rather than removing the element from the accessibility
   * tree, so a screen reader can still announce that the control exists.
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
   * - `focus(options?: FocusOptions) => void`: Puts the caret in the field, the way a label pointing at one would.
   * - `formResetCallback() => void`: Returns the control to the value its markup declared.
   * - `formStateRestoreCallback(state: string | null) => void`: Restores the value when the browser brings a form back.
   *
   * Falling back to `defaultValue` rather than to empty, because a restore
   * with no state is a form the browser has nothing recorded for, which is
   * the same situation as a fresh one.
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
   * and styled by the `data-nav-item` recipe: radio semantics would announce a
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
   * - `name`: Name the group reports under when its form is submitted.
   * - `default-value`/`defaultValue`: The value the markup declared, which is where a reset returns to.
   * - `value`: What the control holds now, and what its form submits.
   * - `hint`: Help under the control, shown while there is nothing wrong.
   * - `feedback`: What is wrong, in the reader's words rather than the browser's.
   * - `hide-label`/`hideLabel`: Whether the label names the control without being shown.
   * - `label`: The accessible name, and the fallback for the `label` slot.
   * - `required`: Whether the form refuses to submit without it.
   * - `disabled`: Whether the control is non-interactive.
   *
   * Reflected, because the styled tier selects on it, and mirrored to
   * `aria-disabled` rather than removing the element from the accessibility
   * tree, so a screen reader can still announce that the control exists.
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
   * - `formResetCallback() => void`: Returns the control to the value its markup declared.
   * - `formStateRestoreCallback(state: string | null) => void`: Restores the value when the browser brings a form back.
   *
   * Falling back to `defaultValue` rather than to empty, because a restore
   * with no state is a form the browser has nothing recorded for, which is
   * the same situation as a fresh one.
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
   * Renders a `<button role="radio">`. This is a form control and nothing else.
   *
   * Navigation is not this. It is links marked with `aria-current` and styled by
   * the `data-nav-item` recipe in the base layer, which carries the same look
   * without radio semantics announcing destinations as choices.
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
   * - `disabled`: Whether the tooltip never shows.
   * - `delay`: How long the pointer must rest before the bubble appears, in milliseconds.
   *
   * Without one, sweeping across a row of controls flashes a tooltip for each
   * of them, which is noise rather than help. Focus opens with no delay: a
   * keyboard reader arriving on a control has already committed to it.
   * - `delay-out`/`delayOut`: How long the bubble stays after the pointer leaves, in milliseconds.
   * - `open`: Whether the element is open. Setting this enters controlled mode.
   * - `default-open`/`defaultOpen`: Initial open state for uncontrolled use. Ignored once `open` is set.
   * - `isOpen`: The resolved open state, whichever mode the element is in. (property only) (readonly)
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
   * - `value`: Which item is current, by its `value`.
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
   * - `open`: Whether the element is open. Setting this enters controlled mode.
   * - `default-open`/`defaultOpen`: Initial open state for uncontrolled use. Ignored once `open` is set.
   * - `isOpen`: The resolved open state, whichever mode the element is in. (property only) (readonly)
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
   * - `(default)`: The middle region, usually a `NavBar`.
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
   * Chrome rather than content. A banner sits above the header and speaks for the
   * whole page: a trial ending, a service degraded, a change of terms. A passage
   * that interrupts a document to set itself apart is a `Callout`, which is read
   * where it sits and cannot be dismissed. Neither is a variant of the other.
   *
   * **Always a polite live region.** `role="alert"` is assertive and interrupts
   * whatever is being read, which is right for something that appears mid-session
   * and wrong for something that was in the served HTML: an assertive banner
   * would cut across a screen-reader user on every page load, before they had
   * read anything. Politeness costs a moment and is never wrong; the severity
   * does not change that, because an error that was always there is still not an
   * interruption.
   *
   * Dismissing is a request. The banner does not remove itself, because the
   * consumer owns the markup and taking the node out from under them would put
   * their state and the document out of step. `preventDefault()` on the
   * `helix-dismiss` is a refusal.
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
   * ## CSS Parts
   *
   * Custom selectors for styling elements within the component.
   *
   * - `content`: The message region.
   * - `actions`: The trailing action region.
   * - `dismiss`: The control that asks to close.
   */
  "helix-base-banner": Partial<
    HelixBaseBannerProps &
      HelixBaseBannerSolidJsProps &
      BaseProps<HelixBaseBanner> &
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
   * - `value`: The selected dates, comma separated, as `YYYY-MM-DD`.
   *
   * One date in `single`. Two in `range`, the earlier first. Any number in
   * `multiple`. One attribute across all three, so a consumer reads and writes
   * the same thing whatever the mode is.
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
   *
   * ## Events
   *
   * Events that will be emitted by the component.
   *
   * - `helix-select`: Fired when a date is chosen, with the ISO date.
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
   * Not a `Banner`, which is the other thing this could be mistaken for. A
   * callout interrupts a document to set a passage apart and is read where it
   * sits; a banner is page-level chrome above the masthead, announces itself as a
   * live region, and can be dismissed. Neither is a variant of the other.
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
   * - `loop`: Whether moving past either end wraps to the other.
   * - `autoplay`: Whether the carousel advances on its own.
   * - `interval`: How long each slide is held, in milliseconds.
   * - `slides`: The slides, in light-DOM order. Client only: the server has no tree. (property only) (readonly)
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
   * - `hide-label`/`hideLabel`: Whether the label names the control without being shown.
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
   * - `name`: Name submitted with the form.
   * - `value`: Value submitted when the box is checked.
   * - `indeterminate`: Whether the box shows as neither checked nor unchecked.
   *
   * Presentation only. It never submits, and the first change resolves it.
   * - `checked`: Whether the control is checked. Setting this enters controlled mode.
   * - `default-checked`/`defaultChecked`: Initial checked state for uncontrolled use. Ignored once `checked` is set.
   * - `hint`: Help under the control, shown while there is nothing wrong.
   * - `feedback`: What is wrong, in the reader's words rather than the browser's.
   * - `hide-label`/`hideLabel`: Whether the label names the control without being shown.
   * - `label`: The accessible name, and the fallback for the `label` slot.
   * - `required`: Whether the form refuses to submit without it.
   * - `disabled`: Whether the control is non-interactive.
   *
   * Reflected, because the styled tier selects on it, and mirrored to
   * `aria-disabled` rather than removing the element from the accessibility
   * tree, so a screen reader can still announce that the control exists.
   * - `isChecked`: The resolved checked state, whichever mode the element is in. (property only) (readonly)
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
  "helix-base-checkbox": Partial<
    HelixBaseCheckboxProps &
      HelixBaseCheckboxSolidJsProps &
      BaseProps<HelixBaseCheckbox> &
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
   * - `open`: Whether the element is open. Setting this enters controlled mode.
   * - `default-open`/`defaultOpen`: Initial open state for uncontrolled use. Ignored once `open` is set.
   * - `isOpen`: The resolved open state, whichever mode the element is in. (property only) (readonly)
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
   * An empty region with no explanation is indistinguishable from one that failed
   * to load, so this exists to tell the difference: what would be here, and the
   * one action that would put something here.
   *
   * `role="status"` on a polite live region, because an empty state usually
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
   * On by default: an empty state almost always replaces something that was
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
  "helix-base-empty-state": Partial<
    HelixBaseEmptyStateProps &
      HelixBaseEmptyStateSolidJsProps &
      BaseProps<HelixBaseEmptyState> &
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
   * **Validity is the platform's.** The type, `required`, `pattern`, `minlength`
   * and the rest are set on the real input and its `validity` is copied onto the
   * host, so an email field rejects what the browser says is not an email rather
   * than what a regular expression here guesses. What this adds is the anchor, so
   * `reportValidity` points the bubble at the input rather than at the host.
   *
   * ## Attributes & Properties
   *
   * Component attributes and properties that can be applied to the element or by using JavaScript.
   *
   * - `name`: Name submitted with the form.
   * - `placeholder`: Shown while the field is empty. Not a label: it goes when typing starts.
   * - `read-only`/`readOnly`: Whether the field refuses input while still submitting its value.
   * - `type`: What the field accepts, which decides the keyboard and the validation.
   * - `default-value`/`defaultValue`: The value the markup declared, which is where a reset returns to.
   * - `value`: What the control holds now, and what its form submits.
   * - `hint`: Help under the control, shown while there is nothing wrong.
   * - `feedback`: What is wrong, in the reader's words rather than the browser's.
   * - `hide-label`/`hideLabel`: Whether the label names the control without being shown.
   * - `label`: The accessible name, and the fallback for the `label` slot.
   * - `required`: Whether the form refuses to submit without it.
   * - `disabled`: Whether the control is non-interactive.
   *
   * Reflected, because the styled tier selects on it, and mirrored to
   * `aria-disabled` rather than removing the element from the accessibility
   * tree, so a screen reader can still announce that the control exists.
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
   * - `focus(options?: FocusOptions) => void`: Puts the caret in the field, the way a label pointing at one would.
   * - `select() => void`: Selects everything in the field.
   * - `formResetCallback() => void`: Returns the control to the value its markup declared.
   * - `formStateRestoreCallback(state: string | null) => void`: Restores the value when the browser brings a form back.
   *
   * Falling back to `defaultValue` rather than to empty, because a restore
   * with no state is a form the browser has nothing recorded for, which is
   * the same situation as a fresh one.
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
   * anchor, the way `data-button` and `data-nav-item` do.
   *
   * ## Slots
   *
   * Areas where markup can be added to the component.
   *
   * - `start`: Leading content, usually an icon or an avatar.
   * - `(default)`: The label.
   * - `supporting`: Secondary text under the label.
   * - `end`: Trailing content.
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
   * - `hasSubmenu`: Whether anything was slotted into `submenu`. Client only. (property only) (readonly)
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
   * - `open`: Whether the element is open. Setting this enters controlled mode.
   * - `default-open`/`defaultOpen`: Initial open state for uncontrolled use. Ignored once `open` is set.
   * - `isOpen`: The resolved open state, whichever mode the element is in. (property only) (readonly)
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
   * `aria-current="page"` and styled by the `data-nav-item` recipe, for the same
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
  "helix-base-nav-bar": Partial<
    HelixBaseNavBarProps &
      HelixBaseNavBarSolidJsProps &
      BaseProps<HelixBaseNavBar> &
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
   * - `name`: Name the group reports under when its form is submitted.
   * - `orientation`: Which way the choices run. A column reads one line per answer.
   * - `default-value`/`defaultValue`: The value the markup declared, which is where a reset returns to.
   * - `value`: What the control holds now, and what its form submits.
   * - `hint`: Help under the control, shown while there is nothing wrong.
   * - `feedback`: What is wrong, in the reader's words rather than the browser's.
   * - `hide-label`/`hideLabel`: Whether the label names the control without being shown.
   * - `label`: The accessible name, and the fallback for the `label` slot.
   * - `required`: Whether the form refuses to submit without it.
   * - `disabled`: Whether the control is non-interactive.
   *
   * Reflected, because the styled tier selects on it, and mirrored to
   * `aria-disabled` rather than removing the element from the accessibility
   * tree, so a screen reader can still announce that the control exists.
   * - `items`: The radios, in light-DOM order. Client only: the server has no tree. (property only) (readonly)
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
   * - `formResetCallback() => void`: Returns the control to the value its markup declared.
   * - `formStateRestoreCallback(state: string | null) => void`: Restores the value when the browser brings a form back.
   *
   * Falling back to `defaultValue` rather than to empty, because a restore
   * with no state is a form the browser has nothing recorded for, which is
   * the same situation as a fresh one.
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
   * - `name`: Name submitted with the form.
   * - `show-value`/`showValue`: Whether the chosen value is shown beside the track.
   * - `markers`: How many marks to draw along the track, evenly spaced, ends included.
   *
   * `0` or `1` draws none: one mark on a track says nothing about a range.
   * They are decoration, so they are `aria-hidden`; what a reader can land on
   * is `step`, which the input enforces regardless.
   * - `step`: How far one press of an arrow key moves it.
   * - `default-value`/`defaultValue`: The value the markup declared, which is where a reset returns to.
   * - `value`: What the control holds now, and what its form submits.
   * - `hint`: Help under the control, shown while there is nothing wrong.
   * - `feedback`: What is wrong, in the reader's words rather than the browser's.
   * - `hide-label`/`hideLabel`: Whether the label names the control without being shown.
   * - `label`: The accessible name, and the fallback for the `label` slot.
   * - `required`: Whether the form refuses to submit without it.
   * - `disabled`: Whether the control is non-interactive.
   *
   * Reflected, because the styled tier selects on it, and mirrored to
   * `aria-disabled` rather than removing the element from the accessibility
   * tree, so a screen reader can still announce that the control exists.
   * - `valueAsNumber`: The chosen value as a number, for anything doing arithmetic on it. (property only) (readonly)
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
   * - `helix-change`: Fired as the value changes, and cancelable.
   * - `change`: Relayed once the reader has let go.
   *
   * ## Methods
   *
   * Methods that can be called to access component functionality.
   *
   * - `formResetCallback() => void`: Returns the control to the value its markup declared.
   * - `formStateRestoreCallback(state: string | null) => void`: Restores the value when the browser brings a form back.
   *
   * Falling back to `defaultValue` rather than to empty, because a restore
   * with no state is a form the browser has nothing recorded for, which is
   * the same situation as a fresh one.
   *
   * ## CSS Parts
   *
   * Custom selectors for styling elements within the component.
   *
   * - `field`: The row: the control and its readout.
   * - `control`: The range input.
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
   * ## CSS Parts
   *
   * Custom selectors for styling elements within the component.
   *
   * - `svg`: The rotating circle pair.
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
   * - `name`: Name submitted with the form.
   * - `value`: Value submitted when the switch is on.
   * - `checked`: Whether the control is checked. Setting this enters controlled mode.
   * - `default-checked`/`defaultChecked`: Initial checked state for uncontrolled use. Ignored once `checked` is set.
   * - `hint`: Help under the control, shown while there is nothing wrong.
   * - `feedback`: What is wrong, in the reader's words rather than the browser's.
   * - `hide-label`/`hideLabel`: Whether the label names the control without being shown.
   * - `label`: The accessible name, and the fallback for the `label` slot.
   * - `required`: Whether the form refuses to submit without it.
   * - `disabled`: Whether the control is non-interactive.
   *
   * Reflected, because the styled tier selects on it, and mirrored to
   * `aria-disabled` rather than removing the element from the accessibility
   * tree, so a screen reader can still announce that the control exists.
   * - `isChecked`: The resolved checked state, whichever mode the element is in. (property only) (readonly)
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
   * - `value`: Which item is current, by its `value`.
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
   * behavioural difference the platform owns and cannot be styled into existence,
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
   * - `name`: Name submitted with the form.
   * - `placeholder`: Shown while the field is empty. Not a label: it goes when typing starts.
   * - `read-only`/`readOnly`: Whether the field refuses input while still submitting its value.
   * - `rows`: How many lines the box is before anything is typed.
   * - `default-value`/`defaultValue`: The value the markup declared, which is where a reset returns to.
   * - `value`: What the control holds now, and what its form submits.
   * - `hint`: Help under the control, shown while there is nothing wrong.
   * - `feedback`: What is wrong, in the reader's words rather than the browser's.
   * - `hide-label`/`hideLabel`: Whether the label names the control without being shown.
   * - `label`: The accessible name, and the fallback for the `label` slot.
   * - `required`: Whether the form refuses to submit without it.
   * - `disabled`: Whether the control is non-interactive.
   *
   * Reflected, because the styled tier selects on it, and mirrored to
   * `aria-disabled` rather than removing the element from the accessibility
   * tree, so a screen reader can still announce that the control exists.
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
   * - `focus(options?: FocusOptions) => void`: Puts the caret in the field, the way a label pointing at one would.
   * - `formResetCallback() => void`: Returns the control to the value its markup declared.
   * - `formStateRestoreCallback(state: string | null) => void`: Restores the value when the browser brings a form back.
   *
   * Falling back to `defaultValue` rather than to empty, because a restore
   * with no state is a form the browser has nothing recorded for, which is
   * the same situation as a fresh one.
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
   * and styled by the `data-nav-item` recipe: radio semantics would announce a
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
   * - `name`: Name the group reports under when its form is submitted.
   * - `default-value`/`defaultValue`: The value the markup declared, which is where a reset returns to.
   * - `value`: What the control holds now, and what its form submits.
   * - `hint`: Help under the control, shown while there is nothing wrong.
   * - `feedback`: What is wrong, in the reader's words rather than the browser's.
   * - `hide-label`/`hideLabel`: Whether the label names the control without being shown.
   * - `label`: The accessible name, and the fallback for the `label` slot.
   * - `required`: Whether the form refuses to submit without it.
   * - `disabled`: Whether the control is non-interactive.
   *
   * Reflected, because the styled tier selects on it, and mirrored to
   * `aria-disabled` rather than removing the element from the accessibility
   * tree, so a screen reader can still announce that the control exists.
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
   * - `formResetCallback() => void`: Returns the control to the value its markup declared.
   * - `formStateRestoreCallback(state: string | null) => void`: Restores the value when the browser brings a form back.
   *
   * Falling back to `defaultValue` rather than to empty, because a restore
   * with no state is a form the browser has nothing recorded for, which is
   * the same situation as a fresh one.
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
   * Renders a `<button role="radio">`. This is a form control and nothing else.
   *
   * Navigation is not this. It is links marked with `aria-current` and styled by
   * the `data-nav-item` recipe in the base layer, which carries the same look
   * without radio semantics announcing destinations as choices.
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
   * - `disabled`: Whether the tooltip never shows.
   * - `delay`: How long the pointer must rest before the bubble appears, in milliseconds.
   *
   * Without one, sweeping across a row of controls flashes a tooltip for each
   * of them, which is noise rather than help. Focus opens with no delay: a
   * keyboard reader arriving on a control has already committed to it.
   * - `delay-out`/`delayOut`: How long the bubble stays after the pointer leaves, in milliseconds.
   * - `open`: Whether the element is open. Setting this enters controlled mode.
   * - `default-open`/`defaultOpen`: Initial open state for uncontrolled use. Ignored once `open` is set.
   * - `isOpen`: The resolved open state, whichever mode the element is in. (property only) (readonly)
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
   * - `value`: Which item is current, by its `value`.
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
