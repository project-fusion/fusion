export function Example() {
  return (
    <helix-sandbox>
      <helix-sandbox-toolbar slot="toolbar">
        <helix-tag>index.html</helix-tag>
        <helix-button
          emphasis="ghost"
          slot="end"
        >
          Reset
        </helix-button>
      </helix-sandbox-toolbar>

      <helix-sandbox-source
        name="html"
        slot="source"
        value="&lt;helix-button emphasis=&quot;solid&quot; tone=&quot;primary&quot;&gt;Save&lt;/helix-button&gt;"
      ></helix-sandbox-source>

      {/* A plain element, not `Sandbox.Preview`. The preview renders an iframe and
             an example has no document to point one at, so what would show is an
             empty frame. */}
      <div slot="preview">
        <helix-button
          emphasis="solid"
          tone="primary"
        >
          Save
        </helix-button>
      </div>

      <helix-sandbox-status-bar slot="status">
        <helix-text variant="caption">HTML</helix-text>
      </helix-sandbox-status-bar>
    </helix-sandbox>
  )
}
