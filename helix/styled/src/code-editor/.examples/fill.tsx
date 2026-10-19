import './fill.css'

const STYLES = `:root {
  --helix-color-primary: oklch(0.62 0.19 256);
  --helix-radii-md: 0.5rem;
}

.banner {
  padding: var(--helix-space-md);
}`

export function Example() {
  return (
    <div className="pane">
      {/* Preview frame: data-preview-editor has the frame connect CodeMirror; on your page, connectEditor does. */}
      <helix-code-editor
        data-preview-editor
        fill
        label="theme.css"
        language="css"
        line-numbers
        value={STYLES}
      ></helix-code-editor>
    </div>
  )
}
