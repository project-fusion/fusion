/**
 * What ProseMirror needs from a stylesheet to edit correctly, and what it
 * draws beside the text, in your tokens: the node a reader selected, the
 * cursor between two blocks where no text can stand, the line where a drop
 * lands, the words in an empty document, and the find bar's matches.
 *
 * **In the page and not in the frame's shadow root**, because the document
 * is the page's own element, which the frame's sheet reaches only at its
 * outer edge. Each rule is `:where()`, so any rule of the page's own wins over
 * it, and the page needs no stylesheet from ProseMirror.
 */
export const EDITOR_CSS = `
:where(.ProseMirror) {
  font-feature-settings: "liga" 0;
  font-variant-ligatures: none;
  overflow-wrap: break-word;
  position: relative;
  white-space: pre-wrap;
  white-space: break-spaces;
}

:where(.ProseMirror pre) {
  white-space: pre-wrap;
}

:where(.ProseMirror li) {
  position: relative;
}

:where(.ProseMirror-hideselection *)::selection {
  background: transparent;
}

:where(.ProseMirror-hideselection) {
  caret-color: transparent;
}

:where(.ProseMirror [draggable][contenteditable="false"]) {
  user-select: text;
}

:where(.ProseMirror-selectednode) {
  outline: var(--helix-size-focus-ring, 2px) solid var(--editor-selected-color, var(--helix-color-focus-ring, Highlight));
  outline-offset: var(--helix-size-focus-offset, 2px);
}

:where(li.ProseMirror-selectednode) {
  outline: none;
}

:where(li.ProseMirror-selectednode)::after {
  border: var(--helix-size-focus-ring, 2px) solid var(--editor-selected-color, var(--helix-color-focus-ring, Highlight));
  content: "";
  inset-block: calc(var(--helix-size-focus-ring, 2px) * -1);
  inset-inline: calc(var(--helix-space-lg, 1.5rem) * -1) calc(var(--helix-size-focus-ring, 2px) * -1);
  pointer-events: none;
  position: absolute;
}

img.ProseMirror-separator {
  border: none !important;
  display: inline !important;
  margin: 0 !important;
}

:where(.ProseMirror-gapcursor) {
  display: none;
  pointer-events: none;
  position: absolute;
}

:where(.ProseMirror-gapcursor)::after {
  animation: helix-editor-blink 1.1s steps(2, start) infinite;
  border-block-start: var(--helix-border-thin, 1px) solid currentColor;
  content: "";
  display: block;
  inline-size: var(--helix-space-lg, 1.5rem);
  inset-block-start: -2px;
  position: absolute;
}

:where(.ProseMirror-focused .ProseMirror-gapcursor) {
  display: block;
}

@keyframes helix-editor-blink {
  to {
    visibility: hidden;
  }
}

@media (prefers-reduced-motion: reduce) {
  :where(.ProseMirror-gapcursor)::after {
    animation: none;
  }
}

:where(.helix-editor-drop-cursor) {
  background-color: var(--helix-color-primary, Highlight);
}

:where(.helix-find-match) {
  background-color: light-dark(
    oklch(from var(--helix-color-warning, oklch(0.52 0.11 75)) 0.93 0.07 h),
    color-mix(in oklab, var(--helix-color-warning, oklch(0.82 0.185 75)) 32%, transparent)
  );
}

:where(.helix-find-current) {
  background-color: oklch(from var(--helix-color-warning, oklch(0.52 0.11 75)) 0.8 0.16 h);
  color: oklch(from var(--helix-color-warning, oklch(0.52 0.11 75)) 0.25 0.04 h);
}

:where(.helix-editor-placeholder)::before {
  block-size: 0;
  color: var(--editor-placeholder-color, var(--helix-color-foreground-subtle, GrayText));
  content: attr(data-placeholder);
  float: inline-start;
  pointer-events: none;
}
`

/** The one sheet every document on the page shares, made the first time one is connected. */
let sheet: CSSStyleSheet | undefined

/**
 * Adds the editor's rules to the document or shadow root a view is drawn in,
 * once. They stay there after the view goes, matching nothing.
 */
export const adoptEditorSheet = (root: Document | ShadowRoot): void => {
  if (typeof CSSStyleSheet === 'undefined' || !('adoptedStyleSheets' in root)) {
    return
  }
  if (!sheet) {
    sheet = new CSSStyleSheet()
    sheet.replaceSync(EDITOR_CSS)
  }
  if (!root.adoptedStyleSheets.includes(sheet)) {
    root.adoptedStyleSheets = [...root.adoptedStyleSheets, sheet]
  }
}
