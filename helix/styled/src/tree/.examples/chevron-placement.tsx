export function Example() {
  return (
    <helix-flex
      direction="column"
      gap="lg"
    >
      <helix-tree label="Documents">
        <helix-tree-item
          default-open
          value="one"
        >
          Reports
          <helix-tree-item
            slot="children"
            value="two"
          >
            Budget 2026
          </helix-tree-item>
          <helix-tree-item
            slot="children"
            value="three"
          >
            Quarterly sales
          </helix-tree-item>
        </helix-tree-item>
      </helix-tree>

      <helix-tree
        chevron-placement="end"
        label="Shared documents"
      >
        <helix-tree-item
          default-open
          value="one"
        >
          Reports
          <helix-tree-item
            slot="children"
            value="two"
          >
            Budget 2026
          </helix-tree-item>
          <helix-tree-item
            slot="children"
            value="three"
          >
            Quarterly sales
          </helix-tree-item>
        </helix-tree-item>
      </helix-tree>
    </helix-flex>
  )
}
