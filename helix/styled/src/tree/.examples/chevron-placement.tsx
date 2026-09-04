export function Example() {
  return (
    <helix-flex
      direction="column"
      gap="lg"
    >
      <helix-tree label="At the start">
        <helix-tree-item
          default-open
          value="one"
        >
          Components
          <helix-tree-item
            slot="children"
            value="two"
          >
            Accordion
          </helix-tree-item>
          <helix-tree-item
            slot="children"
            value="three"
          >
            Button
          </helix-tree-item>
        </helix-tree-item>
      </helix-tree>

      <helix-tree
        chevron-placement="end"
        label="At the end"
      >
        <helix-tree-item
          default-open
          value="one"
        >
          Components
          <helix-tree-item
            slot="children"
            value="two"
          >
            Accordion
          </helix-tree-item>
          <helix-tree-item
            slot="children"
            value="three"
          >
            Button
          </helix-tree-item>
        </helix-tree-item>
      </helix-tree>
    </helix-flex>
  )
}
