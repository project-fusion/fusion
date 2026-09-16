export function Example() {
  return (
    <helix-flex
      direction="column"
      gap="lg"
    >
      <helix-tree label="Repository">
        <helix-tree-item
          default-open
          value="helix"
        >
          helix
          <helix-tree-item
            slot="children"
            value="headless"
          >
            headless
          </helix-tree-item>
          <helix-tree-item
            slot="children"
            value="styled"
          >
            styled
          </helix-tree-item>
        </helix-tree-item>
        <helix-tree-item value="readme">README.md</helix-tree-item>
      </helix-tree>

      <helix-tree
        label="Documentation"
        nesting="subordinate"
      >
        <helix-tree-item
          default-open
          value="components"
        >
          Components
          <helix-tree-item
            slot="children"
            value="button"
          >
            Button
          </helix-tree-item>
          <helix-tree-item
            slot="children"
            value="tree"
          >
            Tree
          </helix-tree-item>
        </helix-tree-item>
        <helix-tree-item value="tokens">Tokens</helix-tree-item>
      </helix-tree>
    </helix-flex>
  )
}
