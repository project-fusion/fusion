import './nesting.css'

export function Example() {
  return (
    <div className="stack">
      <helix-headless-tree label="Repository">
        <helix-headless-tree-item
          default-open
          value="helix"
        >
          helix
          <helix-headless-tree-item
            slot="children"
            value="headless"
          >
            headless
          </helix-headless-tree-item>
          <helix-headless-tree-item
            slot="children"
            value="styled"
          >
            styled
          </helix-headless-tree-item>
        </helix-headless-tree-item>
        <helix-headless-tree-item value="readme">README.md</helix-headless-tree-item>
      </helix-headless-tree>

      <helix-headless-tree
        label="Documentation"
        nesting="subordinate"
      >
        <helix-headless-tree-item
          default-open
          value="components"
        >
          Components
          <helix-headless-tree-item
            slot="children"
            value="button"
          >
            Button
          </helix-headless-tree-item>
          <helix-headless-tree-item
            slot="children"
            value="tree"
          >
            Tree
          </helix-headless-tree-item>
        </helix-headless-tree-item>
        <helix-headless-tree-item value="tokens">Tokens</helix-headless-tree-item>
      </helix-headless-tree>
    </div>
  )
}
