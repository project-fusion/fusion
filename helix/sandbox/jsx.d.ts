import type {
  HelixBeforeEditEvent,
  HelixCaretEvent,
  HelixSandboxEditor,
  HelixSandboxSpecs,
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
  /** Skips the hydration check for an element whose DOM is written by something other than React, which a custom element writing its own state attributes is. */
  suppressHydrationWarning?: boolean;
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

type BaseEvents<T = HTMLElement> = {
  // Mouse Events

  /** Triggered when the element is clicked by the user by mouse or keyboard. */
  onClick?: (event: MouseEvent & { currentTarget: T }) => void;
  /** Fired when the context menu is triggered, often by right-clicking. */
  onContextMenu?: (event: MouseEvent & { currentTarget: T }) => void;
  /** Fired when the element is double-clicked. */
  onDoubleClick?: (event: MouseEvent & { currentTarget: T }) => void;
  /** Fired repeatedly as the draggable element is being dragged. */
  onDrag?: (event: DragEvent & { currentTarget: T }) => void;
  /** Fired when the dragging of a draggable element is finished. */
  onDragEnd?: (event: DragEvent & { currentTarget: T }) => void;
  /** Fired when a dragged element or text selection enters a valid drop target. */
  onDragEnter?: (event: DragEvent & { currentTarget: T }) => void;
  /** Fired when a dragged element or text selection leaves a valid drop target. */
  onDragExit?: (event: DragEvent & { currentTarget: T }) => void;
  /** Fired when a dragged element or text selection leaves a valid drop target. */
  onDragLeave?: (event: DragEvent & { currentTarget: T }) => void;
  /** Fired when an element or text selection is being dragged over a valid drop target (every few hundred milliseconds). */
  onDragOver?: (event: DragEvent & { currentTarget: T }) => void;
  /** Fired when a draggable element starts being dragged. */
  onDragStart?: (event: DragEvent & { currentTarget: T }) => void;
  /** Fired when a dragged element is dropped onto a drop target. */
  onDrop?: (event: DragEvent & { currentTarget: T }) => void;
  /** Fired when a mouse button is pressed down on the element. */
  onMouseDown?: (event: MouseEvent & { currentTarget: T }) => void;
  /** Fired when the mouse cursor enters the element. */
  onMouseEnter?: (event: MouseEvent & { currentTarget: T }) => void;
  /** Triggered when the mouse cursor leaves the element. */
  onMouseLeave?: (event: MouseEvent & { currentTarget: T }) => void;
  /** Fired at an element when a pointing device (usually a mouse) is moved while the cursor's hotspot is inside it. */
  onMouseMove?: (event: MouseEvent & { currentTarget: T }) => void;
  /** Fired at an Element when a pointing device (usually a mouse) is used to move the cursor so that it is no longer contained within the element or one of its children. */
  onMouseOut?: (event: MouseEvent & { currentTarget: T }) => void;
  /** Fired at an Element when a pointing device (such as a mouse or trackpad) is used to move the cursor onto the element or one of its child elements. */
  onMouseOver?: (event: MouseEvent & { currentTarget: T }) => void;
  /** Fired when a mouse button is released on the element. */
  onMouseUp?: (event: MouseEvent & { currentTarget: T }) => void;

  // Keyboard Events

  /** Fired when a key is pressed down. */
  onKeyDown?: (event: KeyboardEvent & { currentTarget: T }) => void;
  /** Fired when a key is released.. */
  onKeyUp?: (event: KeyboardEvent & { currentTarget: T }) => void;
  /** Fired when a key is pressed down. */
  onKeyPressed?: (event: KeyboardEvent & { currentTarget: T }) => void;

  // Focus Events

  /** Fired when the element receives focus, often triggered by tab navigation. */
  onFocus?: (event: FocusEvent & { currentTarget: T }) => void;
  /** Fired when the element loses focus. */
  onBlur?: (event: FocusEvent & { currentTarget: T }) => void;

  // Form Events

  /** Fired when the value of an input element changes, such as with text inputs or select elements. */
  onChange?: (event: Event & { currentTarget: T }) => void;
  /** Fires when the value of an <input>, <select>, or <textarea> element has been changed. */
  onInput?: (event: Event & { currentTarget: T }) => void;
  /** Fired when a form is submitted, usually on pressing Enter in a text input. */
  onSubmit?: (event: Event & { currentTarget: T }) => void;
  /** Fired when a form is reset. */
  onReset?: (event: Event & { currentTarget: T }) => void;

  // UI Events

  /** Fired when the content of an element is scrolled. */
  onScroll?: (event: UIEvent & { currentTarget: T }) => void;

  // Wheel Events

  /** Fired when the mouse wheel is scrolled while the element is focused. */
  onWheel?: (event: WheelEvent & { currentTarget: T }) => void;

  // Animation Events

  /** Fired when a CSS animation starts. */
  onAnimationStart?: (event: AnimationEvent & { currentTarget: T }) => void;
  /** Fired when a CSS animation completes. */
  onAnimationEnd?: (event: AnimationEvent & { currentTarget: T }) => void;
  /** Fired when a CSS animation completes one iteration. */
  onAnimationIteration?: (event: AnimationEvent & { currentTarget: T }) => void;

  // Transition Events

  /** Fired when a CSS transition has completed. */
  onTransitionEnd?: (event: TransitionEvent & { currentTarget: T }) => void;

  // Media Events

  /** Fired when an element (usually an image) finishes loading */
  onLoad?: (event: Event & { currentTarget: T }) => void;
  /** Fired when an error occurs during the loading of an element, like an image not being found. */
  onError?: (event: Event & { currentTarget: T }) => void;

  // Clipboard Events

  /** Fires when the user initiates a copy action through the browser's user interface. */
  onCopy?: (event: ClipboardEvent & { currentTarget: T }) => void;
  /** Fired when the user has initiated a "cut" action through the browser's user interface. */
  onCut?: (event: ClipboardEvent & { currentTarget: T }) => void;
  /** Fired when the user has initiated a "paste" action through the browser's user interface. */
  onPaste?: (event: ClipboardEvent & { currentTarget: T }) => void;
};

/** `HelixSandboxEditor` component event */
export type HelixSandboxEditorElementEvent<E = Event> = TypedEvent<
  HelixSandboxEditor,
  E
>;
/** `helix-before-edit` event type */
export type HelixSandboxEditorHelixBeforeEditElementEvent =
  HelixSandboxEditorElementEvent<HelixBeforeEditEvent>;
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
  /** Whether the text can be changed.

`EditorState.readOnly` rather than removing the editor's focus or its
keymap: a reader still needs to select the text, scroll it, and put a
cursor in it to read a long line. What it stops is the typing. */
  "read-only"?: HelixSandboxEditor["readOnly"];
  /** Whether the text can be changed.

`EditorState.readOnly` rather than removing the editor's focus or its
keymap: a reader still needs to select the text, scroll it, and put a
cursor in it to read a long line. What it stops is the typing. */
  readOnly?: HelixSandboxEditor["readOnly"];

  /** Fired when the source is edited. */
  "onhelix-before-edit"?: (
    e: HelixSandboxEditorHelixBeforeEditElementEvent,
  ) => void;
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
  /** Whether the text can be changed.

`EditorState.readOnly` rather than removing the editor's focus or its
keymap: a reader still needs to select the text, scroll it, and put a
cursor in it to read a long line. What it stops is the typing. */
  "bool:read-only"?: HelixSandboxEditor["readOnly"];
  /** Whether the text can be changed.

`EditorState.readOnly` rather than removing the editor's focus or its
keymap: a reader still needs to select the text, scroll it, and put a
cursor in it to read a long line. What it stops is the typing. */
  "prop:readOnly"?: HelixSandboxEditor["readOnly"];
  /** Fired when the source is edited. */
  "on:helix-before-edit"?: (
    e: HelixSandboxEditorHelixBeforeEditElementEvent,
  ) => void;
  /** Fired when the cursor moves, with its line and column. */
  "on:helix-caret"?: (e: HelixSandboxEditorHelixCaretElementEvent) => void;

  /** Set the innerHTML of the element */
  innerHTML?: string;
  /** Set the textContent of the element */
  textContent?: string | number;
};

export type HelixSandboxSpecsProps = {
  /** Which family's specs to run. Changing it runs them. */
  family?: HelixSandboxSpecs["family"];
  /** The document that runs them. Same origin, and it must stay that way. */
  src?: HelixSandboxSpecs["src"];
  /** Accessible name for the results. */
  label?: HelixSandboxSpecs["label"];
};

export type HelixSandboxSpecsSolidJsProps = {
  /** Which family's specs to run. Changing it runs them. */
  "prop:family"?: HelixSandboxSpecs["family"];
  /** The document that runs them. Same origin, and it must stay that way. */
  "prop:src"?: HelixSandboxSpecs["src"];
  /** Accessible name for the results. */
  "prop:label"?: HelixSandboxSpecs["label"];

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
   * - `read-only`/`readOnly`: Whether the text can be changed.
   *
   * `EditorState.readOnly` rather than removing the editor's focus or its
   * keymap: a reader still needs to select the text, scroll it, and put a
   * cursor in it to read a long line. What it stops is the typing.
   * - `caret`: Where the cursor is, counted from one, as an editor reports it. (property only) (readonly)
   * - `whenSettled`: Resolves a frame after the first update, when transitions are switched on.
   *
   * **Named `whenSettled` because `settled` was taken four times over.** Image
   * and Splitter each have a private `settle`, and both color controls carry a
   * `settled` of their own, all of them older than this and none of them about
   * transitions. A base class takes the name every subclass then cannot use, so
   * it takes the one nobody wanted.
   *
   * **The state it reports cannot be watched, which is why this exists.** A
   * `MutationObserver` could see `[data-settled]` arrive and there is no
   * equivalent for `ElementInternals.states`: a custom state is deliberately not
   * in the DOM, which is the whole reason it replaced the attribute. Anything
   * that used to wait on the attribute waits on this instead, and gets a better
   * signal for it, an awaited promise being what the callers wanted rather than
   * a mutation they had to interpret.
   *
   * Separate from `updateComplete`, which resolves in the microtask checkpoint
   * the suppression is still active in. That is the distinction `readyToMove`
   * in `@helix-io/testing` was written around and the reason two checkbox specs
   * were misread as a token fault for days.
   *
   * It never resolves where `requestAnimationFrame` never fires, which is a
   * server, a hidden tab, and happy-dom. Callers that must not hang race it
   * against a timeout; `readyToMove` does exactly that. (property only) (readonly)
   *
   * ## Events
   *
   * Events that will be emitted by the component.
   *
   * - `helix-before-edit`: Fired when the source is edited.
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
    HelixSandboxEditorProps & BaseProps<HelixSandboxEditor> & BaseEvents<HelixSandboxEditor>
  >;

  /**
   * The specs are not rewritten for this. The same `*.dom.spec.ts` files that run
   * in CI are bundled for the browser with `bun:test` and the DOM helpers pointed
   * at a browser harness, so a spec deleted in the morning stops being reported
   * in the afternoon and there is no second suite to keep in step.
   *
   * **A browser is the stricter environment, not the looser one.** The node
   * harness runs against happy-dom, which does not implement `attachInternals` at
   * all and has to be handed an inert stub, reports `:popover-open` as unmatched
   * for a popover that is open, and returns nothing from `assignedNodes({ flatten:
   * true })` where a browser returns the fallback. Each of those has already
   * produced a spec that passed while asserting the opposite of what ships. Here
   * they are the platform's own.
   *
   * They run in a frame of their own rather than the preview's, because `mount`
   * replaces the document body for every test and would take the example with it.
   *
   * **That frame is parked at the document root, not in this shadow root.** It is
   * a worker rather than anything to look at, and where it sits in the tree
   * decides whether it is laid out at all: inside the panel it was a descendant of
   * an inactive tab, so on any tab but this one it had `display: none` above it
   * and every rectangle inside it was zero. Specs that read geometry then passed
   * against nothing, which is the failure that looks most like success. Found by
   * putting a known misplacement back and watching the specs stay green.
   *
   * ## Attributes & Properties
   *
   * Component attributes and properties that can be applied to the element or by using JavaScript.
   *
   * - `family`: Which family's specs to run. Changing it runs them.
   * - `src`: The document that runs them. Same origin, and it must stay that way.
   * - `label`: Accessible name for the results.
   * - `whenSettled`: Resolves a frame after the first update, when transitions are switched on.
   *
   * **Named `whenSettled` because `settled` was taken four times over.** Image
   * and Splitter each have a private `settle`, and both color controls carry a
   * `settled` of their own, all of them older than this and none of them about
   * transitions. A base class takes the name every subclass then cannot use, so
   * it takes the one nobody wanted.
   *
   * **The state it reports cannot be watched, which is why this exists.** A
   * `MutationObserver` could see `[data-settled]` arrive and there is no
   * equivalent for `ElementInternals.states`: a custom state is deliberately not
   * in the DOM, which is the whole reason it replaced the attribute. Anything
   * that used to wait on the attribute waits on this instead, and gets a better
   * signal for it, an awaited promise being what the callers wanted rather than
   * a mutation they had to interpret.
   *
   * Separate from `updateComplete`, which resolves in the microtask checkpoint
   * the suppression is still active in. That is the distinction `readyToMove`
   * in `@helix-io/testing` was written around and the reason two checkbox specs
   * were misread as a token fault for days.
   *
   * It never resolves where `requestAnimationFrame` never fires, which is a
   * server, a hidden tab, and happy-dom. Callers that must not hang race it
   * against a timeout; `readyToMove` does exactly that. (property only) (readonly)
   *
   * ## Methods
   *
   * Methods that can be called to access component functionality.
   *
   * - `run() => void`: Runs the current family's specs.
   *
   * ## CSS Custom Properties
   *
   * CSS variables available for styling the component.
   *
   * - `--specs-pass-color`: Color of a passing test. (default: `undefined`)
   * - `--specs-fail-color`: Color of a failing one. (default: `undefined`)
   *
   * ## CSS Parts
   *
   * Custom selectors for styling elements within the component.
   *
   * - `summary`: The counts, and how long the run took.
   * - `results`: The scrolling list.
   * - `suite`: A describe block's heading.
   * - `result`: One test.
   * - `status`: Whether that test passed.
   * - `error`: Why it failed.
   * - `empty`: Shown when there is nothing to report.
   */
  "helix-sandbox-specs": Partial<
    HelixSandboxSpecsProps & BaseProps<HelixSandboxSpecs> & BaseEvents<HelixSandboxSpecs>
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
   * - `read-only`/`readOnly`: Whether the text can be changed.
   *
   * `EditorState.readOnly` rather than removing the editor's focus or its
   * keymap: a reader still needs to select the text, scroll it, and put a
   * cursor in it to read a long line. What it stops is the typing.
   * - `caret`: Where the cursor is, counted from one, as an editor reports it. (property only) (readonly)
   * - `whenSettled`: Resolves a frame after the first update, when transitions are switched on.
   *
   * **Named `whenSettled` because `settled` was taken four times over.** Image
   * and Splitter each have a private `settle`, and both color controls carry a
   * `settled` of their own, all of them older than this and none of them about
   * transitions. A base class takes the name every subclass then cannot use, so
   * it takes the one nobody wanted.
   *
   * **The state it reports cannot be watched, which is why this exists.** A
   * `MutationObserver` could see `[data-settled]` arrive and there is no
   * equivalent for `ElementInternals.states`: a custom state is deliberately not
   * in the DOM, which is the whole reason it replaced the attribute. Anything
   * that used to wait on the attribute waits on this instead, and gets a better
   * signal for it, an awaited promise being what the callers wanted rather than
   * a mutation they had to interpret.
   *
   * Separate from `updateComplete`, which resolves in the microtask checkpoint
   * the suppression is still active in. That is the distinction `readyToMove`
   * in `@helix-io/testing` was written around and the reason two checkbox specs
   * were misread as a token fault for days.
   *
   * It never resolves where `requestAnimationFrame` never fires, which is a
   * server, a hidden tab, and happy-dom. Callers that must not hang race it
   * against a timeout; `readyToMove` does exactly that. (property only) (readonly)
   *
   * ## Events
   *
   * Events that will be emitted by the component.
   *
   * - `helix-before-edit`: Fired when the source is edited.
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
      BaseEvents<HelixSandboxEditor>
  >;

  /**
   * The specs are not rewritten for this. The same `*.dom.spec.ts` files that run
   * in CI are bundled for the browser with `bun:test` and the DOM helpers pointed
   * at a browser harness, so a spec deleted in the morning stops being reported
   * in the afternoon and there is no second suite to keep in step.
   *
   * **A browser is the stricter environment, not the looser one.** The node
   * harness runs against happy-dom, which does not implement `attachInternals` at
   * all and has to be handed an inert stub, reports `:popover-open` as unmatched
   * for a popover that is open, and returns nothing from `assignedNodes({ flatten:
   * true })` where a browser returns the fallback. Each of those has already
   * produced a spec that passed while asserting the opposite of what ships. Here
   * they are the platform's own.
   *
   * They run in a frame of their own rather than the preview's, because `mount`
   * replaces the document body for every test and would take the example with it.
   *
   * **That frame is parked at the document root, not in this shadow root.** It is
   * a worker rather than anything to look at, and where it sits in the tree
   * decides whether it is laid out at all: inside the panel it was a descendant of
   * an inactive tab, so on any tab but this one it had `display: none` above it
   * and every rectangle inside it was zero. Specs that read geometry then passed
   * against nothing, which is the failure that looks most like success. Found by
   * putting a known misplacement back and watching the specs stay green.
   *
   * ## Attributes & Properties
   *
   * Component attributes and properties that can be applied to the element or by using JavaScript.
   *
   * - `family`: Which family's specs to run. Changing it runs them.
   * - `src`: The document that runs them. Same origin, and it must stay that way.
   * - `label`: Accessible name for the results.
   * - `whenSettled`: Resolves a frame after the first update, when transitions are switched on.
   *
   * **Named `whenSettled` because `settled` was taken four times over.** Image
   * and Splitter each have a private `settle`, and both color controls carry a
   * `settled` of their own, all of them older than this and none of them about
   * transitions. A base class takes the name every subclass then cannot use, so
   * it takes the one nobody wanted.
   *
   * **The state it reports cannot be watched, which is why this exists.** A
   * `MutationObserver` could see `[data-settled]` arrive and there is no
   * equivalent for `ElementInternals.states`: a custom state is deliberately not
   * in the DOM, which is the whole reason it replaced the attribute. Anything
   * that used to wait on the attribute waits on this instead, and gets a better
   * signal for it, an awaited promise being what the callers wanted rather than
   * a mutation they had to interpret.
   *
   * Separate from `updateComplete`, which resolves in the microtask checkpoint
   * the suppression is still active in. That is the distinction `readyToMove`
   * in `@helix-io/testing` was written around and the reason two checkbox specs
   * were misread as a token fault for days.
   *
   * It never resolves where `requestAnimationFrame` never fires, which is a
   * server, a hidden tab, and happy-dom. Callers that must not hang race it
   * against a timeout; `readyToMove` does exactly that. (property only) (readonly)
   *
   * ## Methods
   *
   * Methods that can be called to access component functionality.
   *
   * - `run() => void`: Runs the current family's specs.
   *
   * ## CSS Custom Properties
   *
   * CSS variables available for styling the component.
   *
   * - `--specs-pass-color`: Color of a passing test. (default: `undefined`)
   * - `--specs-fail-color`: Color of a failing one. (default: `undefined`)
   *
   * ## CSS Parts
   *
   * Custom selectors for styling elements within the component.
   *
   * - `summary`: The counts, and how long the run took.
   * - `results`: The scrolling list.
   * - `suite`: A describe block's heading.
   * - `result`: One test.
   * - `status`: Whether that test passed.
   * - `error`: Why it failed.
   * - `empty`: Shown when there is nothing to report.
   */
  "helix-sandbox-specs": Partial<
    HelixSandboxSpecsProps &
      HelixSandboxSpecsSolidJsProps &
      BaseProps<HelixSandboxSpecs> &
      BaseEvents<HelixSandboxSpecs>
  >;
};

export type CustomCssProperties = {
  /** Color of a passing test. */
  "--specs-pass-color"?: string;
  /** Color of a failing one. */
  "--specs-fail-color"?: string;
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
