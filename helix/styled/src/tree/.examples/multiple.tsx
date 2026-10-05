export function Example() {
  return (
    <helix-tree
      default-active="guide"
      label="Files to export"
      selection-mode="multiple"
    >
      <helix-tree-item
        open
        value="docs"
      >
        Docs
        <helix-tree-item
          slot="children"
          value="guide"
        >
          Guide
        </helix-tree-item>
        <helix-tree-item
          slot="children"
          value="reference"
        >
          Reference
        </helix-tree-item>
      </helix-tree-item>
      <helix-tree-item value="changelog">Changelog</helix-tree-item>
      <helix-tree-item
        disabled
        value="archive"
      >
        Archive
      </helix-tree-item>
    </helix-tree>
  )
}
