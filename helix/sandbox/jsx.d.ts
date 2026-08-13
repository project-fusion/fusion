import type {
  HelixSandbox,
  HelixSandboxPreview,
  HelixSandboxSource,
  HelixSourceChangeEvent,
} from '@helix-io/sandbox';

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

export type HelixSandboxPreviewProps = {
  /** Markup to render. */
  source?: HelixSandboxPreview["source"];
  /** Stylesheet applied to the preview.

Scoped by being written into the preview's own subtree rather than the
document, so an example that restyles `helix-card` restyles the one being
previewed and not the sandbox around it. */
  styles?: HelixSandboxPreview["styles"];
};

export type HelixSandboxPreviewSolidJsProps = {
  /** Markup to render. */
  "prop:source"?: HelixSandboxPreview["source"];
  /** Stylesheet applied to the preview.

Scoped by being written into the preview's own subtree rather than the
document, so an example that restyles `helix-card` restyles the one being
previewed and not the sandbox around it. */
  "prop:styles"?: HelixSandboxPreview["styles"];

  /** Set the innerHTML of the element */
  innerHTML?: string;
  /** Set the textContent of the element */
  textContent?: string | number;
};

export type HelixSandboxProps = {
  /** Whether the panes sit side by side or stacked. */
  orientation?: HelixSandbox["orientation"];
  /** Percentage of the sandbox given to the source pane. */
  split?: HelixSandbox["split"];
  /** Accessible name for the divider. */
  "separator-label"?: HelixSandbox["separatorLabel"];
  /** Accessible name for the divider. */
  separatorLabel?: HelixSandbox["separatorLabel"];
};

export type HelixSandboxSolidJsProps = {
  /** Whether the panes sit side by side or stacked. */
  "prop:orientation"?: HelixSandbox["orientation"];
  /** Percentage of the sandbox given to the source pane. */
  "prop:split"?: HelixSandbox["split"];
  /** Accessible name for the divider. */
  "attr:separator-label"?: HelixSandbox["separatorLabel"];
  /** Accessible name for the divider. */
  "prop:separatorLabel"?: HelixSandbox["separatorLabel"];

  /** Set the innerHTML of the element */
  innerHTML?: string;
  /** Set the textContent of the element */
  textContent?: string | number;
};

/** `HelixSandboxSource` component event */
export type HelixSandboxSourceElementEvent<E = Event> = TypedEvent<
  HelixSandboxSource,
  E
>;
/** `SourceChange` event type */
export type HelixSandboxSourceSourceChangeElementEvent =
  HelixSandboxSourceElementEvent<HelixSourceChangeEvent>;

export type HelixSandboxSourceProps = {
  /** The source being edited. */
  value?: HelixSandboxSource["value"];
  /** Which source this pane holds, echoed in every `SourceChange`.

`html` and `css` are what the sandbox root routes on; any other name is
passed through untouched for a consumer wiring their own panes. */
  name?: HelixSandboxSource["name"];
  /** Accessible name for the editable region. */
  "field-label"?: HelixSandboxSource["fieldLabel"];
  /** Accessible name for the editable region. */
  fieldLabel?: HelixSandboxSource["fieldLabel"];
  /** Whether Tab indents rather than moving focus. */
  "tab-indents"?: HelixSandboxSource["tabIndents"];
  /** Whether Tab indents rather than moving focus. */
  tabIndents?: HelixSandboxSource["tabIndents"];

  /** Fired when the source is edited. */
  onSourceChange?: (e: HelixSandboxSourceSourceChangeElementEvent) => void;
};

export type HelixSandboxSourceSolidJsProps = {
  /** The source being edited. */
  "prop:value"?: HelixSandboxSource["value"];
  /** Which source this pane holds, echoed in every `SourceChange`.

`html` and `css` are what the sandbox root routes on; any other name is
passed through untouched for a consumer wiring their own panes. */
  "prop:name"?: HelixSandboxSource["name"];
  /** Accessible name for the editable region. */
  "attr:field-label"?: HelixSandboxSource["fieldLabel"];
  /** Accessible name for the editable region. */
  "prop:fieldLabel"?: HelixSandboxSource["fieldLabel"];
  /** Whether Tab indents rather than moving focus. */
  "bool:tab-indents"?: HelixSandboxSource["tabIndents"];
  /** Whether Tab indents rather than moving focus. */
  "prop:tabIndents"?: HelixSandboxSource["tabIndents"];
  /** Fired when the source is edited. */
  "on:SourceChange"?: (e: HelixSandboxSourceSourceChangeElementEvent) => void;

  /** Set the innerHTML of the element */
  innerHTML?: string;
  /** Set the textContent of the element */
  textContent?: string | number;
};

export type CustomElements = {
  /**
   * Renders into the light DOM rather than a shadow root, which is the whole
   * reason this is an element and not a `<div>` someone sets `innerHTML` on.
   * Content inside a shadow root is cut off from the base layer, so a heading
   * would come out at the browser's default size and a link in the wrong colour,
   * and the preview would be a worse likeness the more the design system does.
   * In the light DOM it is styled exactly as it would be on a real page.
   *
   * **The source is trusted.** It is markup a developer typed into their own
   * sandbox, and it is rendered as markup. Never point this at input from anyone
   * else.
   *
   * ## Attributes & Properties
   *
   * Component attributes and properties that can be applied to the element or by using JavaScript.
   *
   * - `source`: Markup to render.
   * - `styles`: Stylesheet applied to the preview.
   *
   * Scoped by being written into the preview's own subtree rather than the
   * document, so an example that restyles `helix-card` restyles the one being
   * previewed and not the sandbox around it.
   */
  "helix-sandbox-preview": Partial<
    HelixSandboxPreviewProps & BaseProps<HelixSandboxPreview> & BaseEvents
  >;

  /**
   * Coordination is by event, the same way the accordion does it: a source pane
   * dispatches `SourceChange`, which bubbles, and the sandbox hands the value to
   * whatever preview is slotted into it. Neither child knows the other exists, so
   * either can be replaced or used alone.
   *
   * The event carries the pane's `name`, which is what lets one sandbox hold a
   * markup pane and a stylesheet pane without the root identifying senders by
   * reference. `css` becomes the preview's stylesheet; anything else is markup.
   *
   * The split is a real `role="separator"` with `aria-valuenow`, movable by
   * pointer and by arrow keys, because a divider that only responds to dragging
   * is unusable without a mouse. Home and End jump to the bounds.
   *
   * ## Attributes & Properties
   *
   * Component attributes and properties that can be applied to the element or by using JavaScript.
   *
   * - `orientation`: Whether the panes sit side by side or stacked.
   * - `split`: Percentage of the sandbox given to the source pane.
   * - `separator-label`/`separatorLabel`: Accessible name for the divider.
   *
   * ## Slots
   *
   * Areas where markup can be added to the component.
   *
   * - `source`: The editable source pane.
   * - `preview`: The live preview.
   *
   * ## CSS Custom Properties
   *
   * CSS variables available for styling the component.
   *
   * - `--sandbox-min-block-size`: Minimum height of the sandbox. (default: `undefined`)
   * - `--sandbox-separator-color`: Colour of the divider. (default: `undefined`)
   *
   * ## CSS Parts
   *
   * Custom selectors for styling elements within the component.
   *
   * - `container`: The split layout.
   * - `pane`: Either pane.
   * - `separator`: The draggable divider.
   */
  "helix-sandbox": Partial<
    HelixSandboxProps & BaseProps<HelixSandbox> & BaseEvents
  >;

  /**
   * A real `<textarea>`, not a contenteditable div with a syntax highlighter over
   * it. Undo, selection, spellcheck suppression, mobile keyboards, and screen
   * reader support all come from the platform, and every one of them is
   * expensive to rebuild and easy to get subtly wrong.
   *
   * Tab inserts two spaces rather than leaving the field, because a code pane
   * that cannot indent is not one. Escape then Tab still moves focus out, which
   * is the documented escape hatch for exactly this trade.
   *
   * ## Attributes & Properties
   *
   * Component attributes and properties that can be applied to the element or by using JavaScript.
   *
   * - `value`: The source being edited.
   * - `name`: Which source this pane holds, echoed in every `SourceChange`.
   *
   * `html` and `css` are what the sandbox root routes on; any other name is
   * passed through untouched for a consumer wiring their own panes.
   * - `field-label`/`fieldLabel`: Accessible name for the editable region.
   * - `tab-indents`/`tabIndents`: Whether Tab indents rather than moving focus.
   *
   * ## Events
   *
   * Events that will be emitted by the component.
   *
   * - `SourceChange`: Fired when the source is edited.
   *
   * ## CSS Custom Properties
   *
   * CSS variables available for styling the component.
   *
   * - `--sandbox-source-background`: Fill behind the source. (default: `undefined`)
   * - `--sandbox-source-min-block-size`: Minimum height of the pane. (default: `undefined`)
   *
   * ## CSS Parts
   *
   * Custom selectors for styling elements within the component.
   *
   * - `source`: The editable region.
   */
  "helix-sandbox-source": Partial<
    HelixSandboxSourceProps & BaseProps<HelixSandboxSource> & BaseEvents
  >;
};

export type CustomElementsSolidJs = {
  /**
   * Renders into the light DOM rather than a shadow root, which is the whole
   * reason this is an element and not a `<div>` someone sets `innerHTML` on.
   * Content inside a shadow root is cut off from the base layer, so a heading
   * would come out at the browser's default size and a link in the wrong colour,
   * and the preview would be a worse likeness the more the design system does.
   * In the light DOM it is styled exactly as it would be on a real page.
   *
   * **The source is trusted.** It is markup a developer typed into their own
   * sandbox, and it is rendered as markup. Never point this at input from anyone
   * else.
   *
   * ## Attributes & Properties
   *
   * Component attributes and properties that can be applied to the element or by using JavaScript.
   *
   * - `source`: Markup to render.
   * - `styles`: Stylesheet applied to the preview.
   *
   * Scoped by being written into the preview's own subtree rather than the
   * document, so an example that restyles `helix-card` restyles the one being
   * previewed and not the sandbox around it.
   */
  "helix-sandbox-preview": Partial<
    HelixSandboxPreviewProps &
      HelixSandboxPreviewSolidJsProps &
      BaseProps<HelixSandboxPreview> &
      BaseEvents
  >;

  /**
   * Coordination is by event, the same way the accordion does it: a source pane
   * dispatches `SourceChange`, which bubbles, and the sandbox hands the value to
   * whatever preview is slotted into it. Neither child knows the other exists, so
   * either can be replaced or used alone.
   *
   * The event carries the pane's `name`, which is what lets one sandbox hold a
   * markup pane and a stylesheet pane without the root identifying senders by
   * reference. `css` becomes the preview's stylesheet; anything else is markup.
   *
   * The split is a real `role="separator"` with `aria-valuenow`, movable by
   * pointer and by arrow keys, because a divider that only responds to dragging
   * is unusable without a mouse. Home and End jump to the bounds.
   *
   * ## Attributes & Properties
   *
   * Component attributes and properties that can be applied to the element or by using JavaScript.
   *
   * - `orientation`: Whether the panes sit side by side or stacked.
   * - `split`: Percentage of the sandbox given to the source pane.
   * - `separator-label`/`separatorLabel`: Accessible name for the divider.
   *
   * ## Slots
   *
   * Areas where markup can be added to the component.
   *
   * - `source`: The editable source pane.
   * - `preview`: The live preview.
   *
   * ## CSS Custom Properties
   *
   * CSS variables available for styling the component.
   *
   * - `--sandbox-min-block-size`: Minimum height of the sandbox. (default: `undefined`)
   * - `--sandbox-separator-color`: Colour of the divider. (default: `undefined`)
   *
   * ## CSS Parts
   *
   * Custom selectors for styling elements within the component.
   *
   * - `container`: The split layout.
   * - `pane`: Either pane.
   * - `separator`: The draggable divider.
   */
  "helix-sandbox": Partial<
    HelixSandboxProps &
      HelixSandboxSolidJsProps &
      BaseProps<HelixSandbox> &
      BaseEvents
  >;

  /**
   * A real `<textarea>`, not a contenteditable div with a syntax highlighter over
   * it. Undo, selection, spellcheck suppression, mobile keyboards, and screen
   * reader support all come from the platform, and every one of them is
   * expensive to rebuild and easy to get subtly wrong.
   *
   * Tab inserts two spaces rather than leaving the field, because a code pane
   * that cannot indent is not one. Escape then Tab still moves focus out, which
   * is the documented escape hatch for exactly this trade.
   *
   * ## Attributes & Properties
   *
   * Component attributes and properties that can be applied to the element or by using JavaScript.
   *
   * - `value`: The source being edited.
   * - `name`: Which source this pane holds, echoed in every `SourceChange`.
   *
   * `html` and `css` are what the sandbox root routes on; any other name is
   * passed through untouched for a consumer wiring their own panes.
   * - `field-label`/`fieldLabel`: Accessible name for the editable region.
   * - `tab-indents`/`tabIndents`: Whether Tab indents rather than moving focus.
   *
   * ## Events
   *
   * Events that will be emitted by the component.
   *
   * - `SourceChange`: Fired when the source is edited.
   *
   * ## CSS Custom Properties
   *
   * CSS variables available for styling the component.
   *
   * - `--sandbox-source-background`: Fill behind the source. (default: `undefined`)
   * - `--sandbox-source-min-block-size`: Minimum height of the pane. (default: `undefined`)
   *
   * ## CSS Parts
   *
   * Custom selectors for styling elements within the component.
   *
   * - `source`: The editable region.
   */
  "helix-sandbox-source": Partial<
    HelixSandboxSourceProps &
      HelixSandboxSourceSolidJsProps &
      BaseProps<HelixSandboxSource> &
      BaseEvents
  >;
};

export type CustomCssProperties = {
  /** Minimum height of the sandbox. */
  "--sandbox-min-block-size"?: string;
  /** Colour of the divider. */
  "--sandbox-separator-color"?: string;
  /** Fill behind the source. */
  "--sandbox-source-background"?: string;
  /** Minimum height of the pane. */
  "--sandbox-source-min-block-size"?: string;
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
