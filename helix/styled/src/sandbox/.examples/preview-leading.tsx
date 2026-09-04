import './preview-leading.css'

export function Example() {
  return (
    <div className="stage">
      <helix-sandbox
        default-split={60}
        lead="preview"
        orientation="vertical"
      >
        <helix-sandbox-toolbar slot="toolbar">
          <helix-tag>card.html</helix-tag>
        </helix-sandbox-toolbar>

        {/* A plain element, not `Sandbox.Preview`. The preview renders an iframe
               and an example has no document to point one at. */}
        <div slot="preview">
          <helix-card>
            <h3>Quarterly review</h3>
            <p>Due on the ninth.</p>
          </helix-card>
        </div>

        <helix-sandbox-source
          field-label="Markup"
          name="html"
          slot="source"
          tab-indents
          value="&lt;helix-card&gt;&lt;h3&gt;Quarterly review&lt;/h3&gt;&lt;/helix-card&gt;"
        ></helix-sandbox-source>

        <helix-sandbox-status-bar
          column={18}
          language="HTML"
          line={1}
          slot="status"
        ></helix-sandbox-status-bar>
      </helix-sandbox>
    </div>
  )
}
