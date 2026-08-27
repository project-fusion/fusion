import './sized-panes.css'

export function Example() {
  return (
    <div className="stage">
      {' '}
      {/* `split` and `panel-size` are where the dividers are, and the sandbox
             writes both back as a reader drags them. `default-split` and
             `default-panel-size` beside them are a different question: where a double
             click puts them back to. */}{' '}
      <helix-sandbox default-panel-size="180" default-split="50" panel-size="240" split="35">
        {' '}
        <helix-tree label="Files" slot="panel">
          {' '}
          <helix-tree-item value="index">index.html</helix-tree-item>{' '}
          <helix-tree-item value="styles">styles.css</helix-tree-item>{' '}
        </helix-tree>{' '}
        <helix-sandbox-source
          name="html"
          slot="source"
          value="&lt;helix-button&gt;Save&lt;/helix-button&gt;"
        ></helix-sandbox-source>{' '}
        <div slot="preview">
          {' '}
          <helix-button emphasis="solid" tone="primary">
            Save
          </helix-button>{' '}
        </div>{' '}
      </helix-sandbox>{' '}
    </div>
  )
}
