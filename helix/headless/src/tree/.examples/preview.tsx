import './preview.css'

export function Example() {
  return (
    <helix-headless-tree
      default-active="two"
      label="Files"
    >
      <helix-headless-tree-item
        default-open
        value="one"
      >
        Documents
        <helix-headless-tree-item
          slot="children"
          value="two"
        >
          Budget.xlsx
        </helix-headless-tree-item>
        <helix-headless-tree-item
          slot="children"
          value="three"
        >
          Notes.txt
        </helix-headless-tree-item>
      </helix-headless-tree-item>
      <helix-headless-tree-item value="four">Invoice-1042.pdf</helix-headless-tree-item>
    </helix-headless-tree>
  )
}
