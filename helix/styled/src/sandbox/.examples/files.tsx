import './files.css'

export function Example() {
  return (
    <div className="stage">
      <helix-sandbox>
        <helix-sandbox-source
          label="index.html"
          name="html"
          slot="source"
          value='<p class="lead">Edited here, drawn beside it.</p>'
        ></helix-sandbox-source>
        <helix-sandbox-source
          label="styles.css"
          name="css"
          slot="source"
          value=".lead { font: inherit; font-weight: 600 }"
        ></helix-sandbox-source>
        <helix-sandbox-source
          label="main.js"
          name="js"
          slot="source"
          value="console.log('Rendered')"
        ></helix-sandbox-source>

        <helix-sandbox-preview
          controls
          label="Live preview"
          slot="preview"
          src="/sandbox/frame.html"
        ></helix-sandbox-preview>
      </helix-sandbox>
    </div>
  )
}
