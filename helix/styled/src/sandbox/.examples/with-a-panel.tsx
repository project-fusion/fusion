import './with-a-panel.css'

export function Example() {
  return (
    <div className="stage">
      <helix-sandbox
        corner-label="Resize both"
        default-panel-size="220"
        panel-collapsed-size="36"
        panel-label="Files"
        separator-label="Resize the source pane"
      >
        <helix-sandbox-toolbar slot="toolbar">
          <helix-tag>index.html</helix-tag>
        </helix-sandbox-toolbar>

        <helix-tree
          label="Files"
          slot="panel"
        >
          <helix-tree-item value="index">index.html</helix-tree-item>
          <helix-tree-item value="styles">styles.css</helix-tree-item>
        </helix-tree>

        <helix-sandbox-source
          name="html"
          slot="source"
          value="&lt;helix-button&gt;Save&lt;/helix-button&gt;"
        ></helix-sandbox-source>

        <div slot="preview">
          <helix-button
            emphasis="solid"
            tone="primary"
          >
            Save
          </helix-button>
        </div>
      </helix-sandbox>
    </div>
  )
}
