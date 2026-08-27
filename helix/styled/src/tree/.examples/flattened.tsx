export function Example() {
  return (
    <helix-tree default-active="engram" label="Packages">
      <helix-tree-item level={1} value="cortex">
        cortex
      </helix-tree-item>
      <helix-tree-item level={2} value="core">
        core
      </helix-tree-item>
      <helix-tree-item level={2} value="engram">
        engram
      </helix-tree-item>
      <helix-tree-item level={2} value="trace">
        trace
      </helix-tree-item>
    </helix-tree>
  )
}
