import type {
  HelixCaretEvent,
  HelixChangeEvent,
  HelixConsoleEvent,
  HelixSandbox,
  HelixSandboxEditor,
  HelixSandboxPreview,
  HelixSandboxSource,
  HelixSandboxStatusBar,
  HelixSandboxTerminal,
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

/** `HelixSandboxEditor` component event */
export type HelixSandboxEditorElementEvent<E = Event> = TypedEvent<
  HelixSandboxEditor,
  E
>;
/** `helix-change` event type */
export type HelixSandboxEditorHelixChangeElementEvent =
  HelixSandboxEditorElementEvent<HelixChangeEvent>;
/** `helix-caret` event type */
export type HelixSandboxEditorHelixCaretElementEvent =
  HelixSandboxEditorElementEvent<HelixCaretEvent>;

export type HelixSandboxEditorProps = {
  /** The source being edited. */
  value?: HelixSandboxEditor["value"];
  /** Which source this pane holds, echoed in every change. */
  name?: HelixSandboxEditor["name"];
  /** How to highlight it. */
  language?: HelixSandboxEditor["language"];
  /** Accessible name for the editable region. */
  "field-label"?: HelixSandboxEditor["fieldLabel"];
  /** Accessible name for the editable region. */
  fieldLabel?: HelixSandboxEditor["fieldLabel"];

  /** Fired when the source is edited. */
  "onhelix-change"?: (e: HelixSandboxEditorHelixChangeElementEvent) => void;
  /** Fired when the cursor moves, with its line and column. */
  "onhelix-caret"?: (e: HelixSandboxEditorHelixCaretElementEvent) => void;
};

export type HelixSandboxEditorSolidJsProps = {
  /** The source being edited. */
  "prop:value"?: HelixSandboxEditor["value"];
  /** Which source this pane holds, echoed in every change. */
  "prop:name"?: HelixSandboxEditor["name"];
  /** How to highlight it. */
  "prop:language"?: HelixSandboxEditor["language"];
  /** Accessible name for the editable region. */
  "attr:field-label"?: HelixSandboxEditor["fieldLabel"];
  /** Accessible name for the editable region. */
  "prop:fieldLabel"?: HelixSandboxEditor["fieldLabel"];
  /** Fired when the source is edited. */
  "on:helix-change"?: (e: HelixSandboxEditorHelixChangeElementEvent) => void;
  /** Fired when the cursor moves, with its line and column. */
  "on:helix-caret"?: (e: HelixSandboxEditorHelixCaretElementEvent) => void;

  /** Set the innerHTML of the element */
  innerHTML?: string;
  /** Set the textContent of the element */
  textContent?: string | number;
};

/** `HelixSandboxPreview` component event */
export type HelixSandboxPreviewElementEvent<E = Event> = TypedEvent<
  HelixSandboxPreview,
  E
>;
/** `helix-console` event type */
export type HelixSandboxPreviewHelixConsoleElementEvent =
  HelixSandboxPreviewElementEvent<HelixConsoleEvent>;

export type HelixSandboxPreviewProps = {
  /** Document the frame loads, which brings the styles and the elements. */
  src?: HelixSandboxPreview["src"];
  /** Markup to render. */
  source?: HelixSandboxPreview["source"];
  /** Stylesheet applied inside the frame, alongside the markup. */
  styles?: HelixSandboxPreview["styles"];
  /** Accessible name for the frame. */
  label?: HelixSandboxPreview["label"];
  /** Writing direction inside the frame. */
  direction?: HelixSandboxPreview["direction"];
  /** How the example is placed in the frame. */
  layout?: HelixSandboxPreview["layout"];

  /** Relayed from the frame, one per console call. */
  "onhelix-console"?: (e: HelixSandboxPreviewHelixConsoleElementEvent) => void;
};

export type HelixSandboxPreviewSolidJsProps = {
  /** Document the frame loads, which brings the styles and the elements. */
  "prop:src"?: HelixSandboxPreview["src"];
  /** Markup to render. */
  "prop:source"?: HelixSandboxPreview["source"];
  /** Stylesheet applied inside the frame, alongside the markup. */
  "prop:styles"?: HelixSandboxPreview["styles"];
  /** Accessible name for the frame. */
  "prop:label"?: HelixSandboxPreview["label"];
  /** Writing direction inside the frame. */
  "prop:direction"?: HelixSandboxPreview["direction"];
  /** How the example is placed in the frame. */
  "prop:layout"?: HelixSandboxPreview["layout"];
  /** Relayed from the frame, one per console call. */
  "on:helix-console"?: (e: HelixSandboxPreviewHelixConsoleElementEvent) => void;

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
/** `helix-change` event type */
export type HelixSandboxSourceHelixChangeElementEvent =
  HelixSandboxSourceElementEvent<HelixChangeEvent>;

export type HelixSandboxSourceProps = {
  /** The source being edited. */
  value?: HelixSandboxSource["value"];
  /** Which source this pane holds, echoed in every `SourceChange`.

`html` and `css` are what the sandbox root routes on; any other name is
passed through untouched for a consumer wiring their own panes.

Not reflected: nothing selects on it, so it keeps a real default instead. */
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
  "onhelix-change"?: (e: HelixSandboxSourceHelixChangeElementEvent) => void;
};

export type HelixSandboxSourceSolidJsProps = {
  /** The source being edited. */
  "prop:value"?: HelixSandboxSource["value"];
  /** Which source this pane holds, echoed in every `SourceChange`.

`html` and `css` are what the sandbox root routes on; any other name is
passed through untouched for a consumer wiring their own panes.

Not reflected: nothing selects on it, so it keeps a real default instead. */
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
  "on:helix-change"?: (e: HelixSandboxSourceHelixChangeElementEvent) => void;

  /** Set the innerHTML of the element */
  innerHTML?: string;
  /** Set the textContent of the element */
  textContent?: string | number;
};

export type HelixSandboxStatusBarProps = {
  /** One-based column of the cursor. Absent shows no readout. */
  column?: HelixSandboxStatusBar["column"];
  /** The language being edited, as a name or one the editor knows. */
  language?: HelixSandboxStatusBar["language"];
  /** One-based line of the cursor. Absent shows no readout. */
  line?: HelixSandboxStatusBar["line"];
};

export type HelixSandboxStatusBarSolidJsProps = {
  /** One-based column of the cursor. Absent shows no readout. */
  "prop:column"?: HelixSandboxStatusBar["column"];
  /** The language being edited, as a name or one the editor knows. */
  "prop:language"?: HelixSandboxStatusBar["language"];
  /** One-based line of the cursor. Absent shows no readout. */
  "prop:line"?: HelixSandboxStatusBar["line"];

  /** Set the innerHTML of the element */
  innerHTML?: string;
  /** Set the textContent of the element */
  textContent?: string | number;
};

export type HelixSandboxTerminalProps = {
  /** What to show before anything has been written. */
  "empty-label"?: HelixSandboxTerminal["emptyLabel"];
  /** What to show before anything has been written. */
  emptyLabel?: HelixSandboxTerminal["emptyLabel"];
  /** Accessible name for the log. */
  label?: HelixSandboxTerminal["label"];
};

export type HelixSandboxTerminalSolidJsProps = {
  /** What to show before anything has been written. */
  "attr:empty-label"?: HelixSandboxTerminal["emptyLabel"];
  /** What to show before anything has been written. */
  "prop:emptyLabel"?: HelixSandboxTerminal["emptyLabel"];
  /** Accessible name for the log. */
  "prop:label"?: HelixSandboxTerminal["label"];

  /** Set the innerHTML of the element */
  innerHTML?: string;
  /** Set the textContent of the element */
  textContent?: string | number;
};

export type CustomElements = {
  /**
   * CodeMirror, not a `<textarea>`. The textarea it replaces was the right call
   * while a sandbox only had to hold text: undo, selection, spellcheck
   * suppression, mobile keyboards, and screen-reader support all came from the
   * platform. What it could not do is highlight what it holds, number its lines,
   * or say where the cursor is, and a status bar reading line and column has to
   * ask something.
   *
   * **On its own path.** This is `@helix-io/sandbox/editor` rather than part of
   * the barrel, because CodeMirror is around 110 KB over the wire where the rest
   * of this package is a few. A sandbox with no editable pane should not pay for
   * one, and neither should a site that registers its elements once.
   *
   * The view is built once and reconfigured, not rebuilt. Replacing it on every
   * change would throw away the undo history, the scroll position, and the
   * selection, which is most of what an editor is.
   *
   * ## Attributes & Properties
   *
   * Component attributes and properties that can be applied to the element or by using JavaScript.
   *
   * - `value`: The source being edited.
   * - `name`: Which source this pane holds, echoed in every change.
   * - `language`: How to highlight it.
   * - `field-label`/`fieldLabel`: Accessible name for the editable region.
   * - `caret`: Where the cursor is, counted from one, as an editor reports it. (property only) (readonly)
   *
   * ## Events
   *
   * Events that will be emitted by the component.
   *
   * - `helix-change`: Fired when the source is edited.
   * - `helix-caret`: Fired when the cursor moves, with its line and column.
   *
   * ## Methods
   *
   * Methods that can be called to access component functionality.
   *
   * - `focus() => void`: Moves focus into the text, not onto the host.
   *
   * The host is not focusable: what a reader types into is CodeMirror's
   * contenteditable, several nodes down inside this shadow root. Without this,
   * `editor.focus()` from outside silently does nothing.
   *
   * ## CSS Parts
   *
   * Custom selectors for styling elements within the component.
   *
   * - `editor`: The element CodeMirror is mounted into.
   */
  "helix-sandbox-editor": Partial<
    HelixSandboxEditorProps & BaseProps<HelixSandboxEditor> & BaseEvents
  >;

  /**
   * A same-origin `<iframe>` pointed at `src`, which is a document the consumer
   * provides. That document imports whatever the examples need, listens for a
   * render message, and writes the markup into itself.
   *
   * **A frame rather than the page.** Rendering into the page meant an example
   * was styled by whatever surrounded it, which flatters the preview and lies
   * about it: an example that restyles `helix-card` restyled the sandbox too, a
   * script in an example ran against the real document, and a stray
   * `position: fixed` escaped the pane. It also left nothing to capture console
   * output from, and the terminal has to come from somewhere.
   *
   * The cost is that the frame starts empty. Styles and element definitions do
   * not cross into it, because a document has its own stylesheets and a window
   * has its own custom element registry, so `src` has to load them. That is the
   * consumer's document rather than something guessed at here.
   *
   * **The source is trusted.** It is markup a developer typed into their own
   * sandbox. Never point this at input from anyone else.
   *
   * ## Attributes & Properties
   *
   * Component attributes and properties that can be applied to the element or by using JavaScript.
   *
   * - `src`: Document the frame loads, which brings the styles and the elements.
   * - `source`: Markup to render.
   * - `styles`: Stylesheet applied inside the frame, alongside the markup.
   * - `label`: Accessible name for the frame.
   * - `direction`: Writing direction inside the frame.
   * - `layout`: How the example is placed in the frame.
   *
   * ## Events
   *
   * Events that will be emitted by the component.
   *
   * - `helix-console`: Relayed from the frame, one per console call.
   *
   * ## CSS Parts
   *
   * Custom selectors for styling elements within the component.
   *
   * - `frame`: The iframe.
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
   * - `panel`: A panel under both panes, usually a terminal.
   * - `status`: A status bar, spanning both panes at the bottom.
   *
   * ## CSS Custom Properties
   *
   * CSS variables available for styling the component.
   *
   * - `--sandbox-min-block-size`: Minimum height of the sandbox. (default: `undefined`)
   * - `--sandbox-separator-color`: Color of the divider. (default: `undefined`)
   *
   * ## CSS Parts
   *
   * Custom selectors for styling elements within the component.
   *
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
   *
   * Not reflected: nothing selects on it, so it keeps a real default instead.
   * - `field-label`/`fieldLabel`: Accessible name for the editable region.
   * - `tab-indents`/`tabIndents`: Whether Tab indents rather than moving focus.
   *
   * ## Events
   *
   * Events that will be emitted by the component.
   *
   * - `helix-change`: Fired when the source is edited.
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

  /**
   * Slotted into a sandbox, which feeds it: the editor dispatches `helix-caret`
   * on every keystroke and every arrow press, the sandbox hears it and writes the
   * position here. Nothing about that reaches the consumer's framework, which is
   * the point. A caret position routed through React state would re-render the
   * workbench on every cursor move, to update two numbers.
   *
   * **Not a live region.** The readout changes on every keystroke, so announcing
   * it would talk over the reader continuously while they type. It is text they
   * can navigate to, which is what a status bar is in every editor that has one.
   *
   * A readout with nothing to say is not rendered at all rather than rendered
   * empty, or the bar keeps a gap where a value is not.
   *
   * ## Attributes & Properties
   *
   * Component attributes and properties that can be applied to the element or by using JavaScript.
   *
   * - `column`: One-based column of the cursor. Absent shows no readout.
   * - `language`: The language being edited, as a name or one the editor knows.
   * - `line`: One-based line of the cursor. Absent shows no readout.
   *
   * ## Slots
   *
   * Areas where markup can be added to the component.
   *
   * - `(default)`: Items at the start of the bar.
   * - `end`: Items after the readouts, at the end of the bar.
   *
   * ## CSS Custom Properties
   *
   * CSS variables available for styling the component.
   *
   * - `--status-bar-color`: Color of the bar's text. (default: `undefined`)
   *
   * ## CSS Parts
   *
   * Custom selectors for styling elements within the component.
   *
   * - `caret`: The line and column readout.
   * - `language`: The language readout.
   */
  "helix-sandbox-status-bar": Partial<
    HelixSandboxStatusBarProps & BaseProps<HelixSandboxStatusBar> & BaseEvents
  >;

  /**
   * Fed by the sandbox, which hears `helix-console` from the preview and hands it
   * here. The preview is a separate document, so what arrives has already crossed
   * `postMessage`: text, not values.
   *
   * **Repeats collapse.** An example with a render loop can write the same
   * warning hundreds of times, and two hundred identical lines say nothing that
   * one line and a count does not. Only consecutive repeats collapse, so the
   * order of what happened survives.
   *
   * A `role="log"` rather than a live region by hand. It is the semantic for an
   * append-only stream, and it means a reader is told about new output without
   * the whole panel being re-announced each time.
   *
   * ## Attributes & Properties
   *
   * Component attributes and properties that can be applied to the element or by using JavaScript.
   *
   * - `empty-label`/`emptyLabel`: What to show before anything has been written.
   * - `label`: Accessible name for the log.
   *
   * ## Methods
   *
   * Methods that can be called to access component functionality.
   *
   * - `write(detail: ConsoleDetail) => void`: Adds a line, collapsing it into the one above when they are identical.
   *
   * `write` rather than `append`, which every element already has from
   * `ParentNode` and which takes nodes. Shadowing it would break
   * `terminal.append(node)` for anyone who reasonably expected the DOM method.
   * - `clear() => void`: Empties the log.
   *
   * ## CSS Custom Properties
   *
   * CSS variables available for styling the component.
   *
   * - `--terminal-size`: Height of the scrolling region. (default: `undefined`)
   *
   * ## CSS Parts
   *
   * Custom selectors for styling elements within the component.
   *
   * - `log`: The scrolling region.
   * - `entry`: One line.
   * - `level`: The level a line came in at.
   * - `message`: The text of a line.
   * - `count`: How many times a repeated line arrived.
   * - `empty`: Shown while nothing has been written.
   */
  "helix-sandbox-terminal": Partial<
    HelixSandboxTerminalProps & BaseProps<HelixSandboxTerminal> & BaseEvents
  >;
};

export type CustomElementsSolidJs = {
  /**
   * CodeMirror, not a `<textarea>`. The textarea it replaces was the right call
   * while a sandbox only had to hold text: undo, selection, spellcheck
   * suppression, mobile keyboards, and screen-reader support all came from the
   * platform. What it could not do is highlight what it holds, number its lines,
   * or say where the cursor is, and a status bar reading line and column has to
   * ask something.
   *
   * **On its own path.** This is `@helix-io/sandbox/editor` rather than part of
   * the barrel, because CodeMirror is around 110 KB over the wire where the rest
   * of this package is a few. A sandbox with no editable pane should not pay for
   * one, and neither should a site that registers its elements once.
   *
   * The view is built once and reconfigured, not rebuilt. Replacing it on every
   * change would throw away the undo history, the scroll position, and the
   * selection, which is most of what an editor is.
   *
   * ## Attributes & Properties
   *
   * Component attributes and properties that can be applied to the element or by using JavaScript.
   *
   * - `value`: The source being edited.
   * - `name`: Which source this pane holds, echoed in every change.
   * - `language`: How to highlight it.
   * - `field-label`/`fieldLabel`: Accessible name for the editable region.
   * - `caret`: Where the cursor is, counted from one, as an editor reports it. (property only) (readonly)
   *
   * ## Events
   *
   * Events that will be emitted by the component.
   *
   * - `helix-change`: Fired when the source is edited.
   * - `helix-caret`: Fired when the cursor moves, with its line and column.
   *
   * ## Methods
   *
   * Methods that can be called to access component functionality.
   *
   * - `focus() => void`: Moves focus into the text, not onto the host.
   *
   * The host is not focusable: what a reader types into is CodeMirror's
   * contenteditable, several nodes down inside this shadow root. Without this,
   * `editor.focus()` from outside silently does nothing.
   *
   * ## CSS Parts
   *
   * Custom selectors for styling elements within the component.
   *
   * - `editor`: The element CodeMirror is mounted into.
   */
  "helix-sandbox-editor": Partial<
    HelixSandboxEditorProps &
      HelixSandboxEditorSolidJsProps &
      BaseProps<HelixSandboxEditor> &
      BaseEvents
  >;

  /**
   * A same-origin `<iframe>` pointed at `src`, which is a document the consumer
   * provides. That document imports whatever the examples need, listens for a
   * render message, and writes the markup into itself.
   *
   * **A frame rather than the page.** Rendering into the page meant an example
   * was styled by whatever surrounded it, which flatters the preview and lies
   * about it: an example that restyles `helix-card` restyled the sandbox too, a
   * script in an example ran against the real document, and a stray
   * `position: fixed` escaped the pane. It also left nothing to capture console
   * output from, and the terminal has to come from somewhere.
   *
   * The cost is that the frame starts empty. Styles and element definitions do
   * not cross into it, because a document has its own stylesheets and a window
   * has its own custom element registry, so `src` has to load them. That is the
   * consumer's document rather than something guessed at here.
   *
   * **The source is trusted.** It is markup a developer typed into their own
   * sandbox. Never point this at input from anyone else.
   *
   * ## Attributes & Properties
   *
   * Component attributes and properties that can be applied to the element or by using JavaScript.
   *
   * - `src`: Document the frame loads, which brings the styles and the elements.
   * - `source`: Markup to render.
   * - `styles`: Stylesheet applied inside the frame, alongside the markup.
   * - `label`: Accessible name for the frame.
   * - `direction`: Writing direction inside the frame.
   * - `layout`: How the example is placed in the frame.
   *
   * ## Events
   *
   * Events that will be emitted by the component.
   *
   * - `helix-console`: Relayed from the frame, one per console call.
   *
   * ## CSS Parts
   *
   * Custom selectors for styling elements within the component.
   *
   * - `frame`: The iframe.
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
   * - `panel`: A panel under both panes, usually a terminal.
   * - `status`: A status bar, spanning both panes at the bottom.
   *
   * ## CSS Custom Properties
   *
   * CSS variables available for styling the component.
   *
   * - `--sandbox-min-block-size`: Minimum height of the sandbox. (default: `undefined`)
   * - `--sandbox-separator-color`: Color of the divider. (default: `undefined`)
   *
   * ## CSS Parts
   *
   * Custom selectors for styling elements within the component.
   *
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
   *
   * Not reflected: nothing selects on it, so it keeps a real default instead.
   * - `field-label`/`fieldLabel`: Accessible name for the editable region.
   * - `tab-indents`/`tabIndents`: Whether Tab indents rather than moving focus.
   *
   * ## Events
   *
   * Events that will be emitted by the component.
   *
   * - `helix-change`: Fired when the source is edited.
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

  /**
   * Slotted into a sandbox, which feeds it: the editor dispatches `helix-caret`
   * on every keystroke and every arrow press, the sandbox hears it and writes the
   * position here. Nothing about that reaches the consumer's framework, which is
   * the point. A caret position routed through React state would re-render the
   * workbench on every cursor move, to update two numbers.
   *
   * **Not a live region.** The readout changes on every keystroke, so announcing
   * it would talk over the reader continuously while they type. It is text they
   * can navigate to, which is what a status bar is in every editor that has one.
   *
   * A readout with nothing to say is not rendered at all rather than rendered
   * empty, or the bar keeps a gap where a value is not.
   *
   * ## Attributes & Properties
   *
   * Component attributes and properties that can be applied to the element or by using JavaScript.
   *
   * - `column`: One-based column of the cursor. Absent shows no readout.
   * - `language`: The language being edited, as a name or one the editor knows.
   * - `line`: One-based line of the cursor. Absent shows no readout.
   *
   * ## Slots
   *
   * Areas where markup can be added to the component.
   *
   * - `(default)`: Items at the start of the bar.
   * - `end`: Items after the readouts, at the end of the bar.
   *
   * ## CSS Custom Properties
   *
   * CSS variables available for styling the component.
   *
   * - `--status-bar-color`: Color of the bar's text. (default: `undefined`)
   *
   * ## CSS Parts
   *
   * Custom selectors for styling elements within the component.
   *
   * - `caret`: The line and column readout.
   * - `language`: The language readout.
   */
  "helix-sandbox-status-bar": Partial<
    HelixSandboxStatusBarProps &
      HelixSandboxStatusBarSolidJsProps &
      BaseProps<HelixSandboxStatusBar> &
      BaseEvents
  >;

  /**
   * Fed by the sandbox, which hears `helix-console` from the preview and hands it
   * here. The preview is a separate document, so what arrives has already crossed
   * `postMessage`: text, not values.
   *
   * **Repeats collapse.** An example with a render loop can write the same
   * warning hundreds of times, and two hundred identical lines say nothing that
   * one line and a count does not. Only consecutive repeats collapse, so the
   * order of what happened survives.
   *
   * A `role="log"` rather than a live region by hand. It is the semantic for an
   * append-only stream, and it means a reader is told about new output without
   * the whole panel being re-announced each time.
   *
   * ## Attributes & Properties
   *
   * Component attributes and properties that can be applied to the element or by using JavaScript.
   *
   * - `empty-label`/`emptyLabel`: What to show before anything has been written.
   * - `label`: Accessible name for the log.
   *
   * ## Methods
   *
   * Methods that can be called to access component functionality.
   *
   * - `write(detail: ConsoleDetail) => void`: Adds a line, collapsing it into the one above when they are identical.
   *
   * `write` rather than `append`, which every element already has from
   * `ParentNode` and which takes nodes. Shadowing it would break
   * `terminal.append(node)` for anyone who reasonably expected the DOM method.
   * - `clear() => void`: Empties the log.
   *
   * ## CSS Custom Properties
   *
   * CSS variables available for styling the component.
   *
   * - `--terminal-size`: Height of the scrolling region. (default: `undefined`)
   *
   * ## CSS Parts
   *
   * Custom selectors for styling elements within the component.
   *
   * - `log`: The scrolling region.
   * - `entry`: One line.
   * - `level`: The level a line came in at.
   * - `message`: The text of a line.
   * - `count`: How many times a repeated line arrived.
   * - `empty`: Shown while nothing has been written.
   */
  "helix-sandbox-terminal": Partial<
    HelixSandboxTerminalProps &
      HelixSandboxTerminalSolidJsProps &
      BaseProps<HelixSandboxTerminal> &
      BaseEvents
  >;
};

export type CustomCssProperties = {
  /** Minimum height of the sandbox. */
  "--sandbox-min-block-size"?: string;
  /** Color of the divider. */
  "--sandbox-separator-color"?: string;
  /** Fill behind the source. */
  "--sandbox-source-background"?: string;
  /** Minimum height of the pane. */
  "--sandbox-source-min-block-size"?: string;
  /** Color of the bar's text. */
  "--status-bar-color"?: string;
  /** Height of the scrolling region. */
  "--terminal-size"?: string;
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
