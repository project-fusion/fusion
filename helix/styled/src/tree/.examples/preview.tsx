export function Example() {
  return (
    <helix-tree
      default-active="two"
      label="Files"
    >
      <helix-tree-item
        default-open
        value="one"
      >
        Documents
        <helix-tree-item
          slot="children"
          value="two"
        >
          Budget.xlsx
        </helix-tree-item>
        <helix-tree-item
          slot="children"
          value="three"
        >
          Notes.txt
        </helix-tree-item>
      </helix-tree-item>
      <helix-tree-item value="four">Invoice-1042.pdf</helix-tree-item>
    </helix-tree>
  )
}
