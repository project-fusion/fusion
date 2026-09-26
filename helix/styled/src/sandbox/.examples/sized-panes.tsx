import './sized-panes.css'

export function Example() {
  return (
    <div className="stage">
      {/* `split` and `panel-size` set where the dividers are, and they update
          as you drag. `default-split` and `default-panel-size` are where a
          double click puts them back. */}
      <helix-sandbox
        default-panel-size="180"
        default-split={50}
        panel-size="240"
        split={35}
      >
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
