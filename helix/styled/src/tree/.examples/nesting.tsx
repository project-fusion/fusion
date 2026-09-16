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
        label="Filters"
        nesting="subordinate"
      >
        <helix-tree-item
          default-open
          value="status"
        >
          Status
          <helix-tree-item
            slot="children"
            value="open"
          >
            Open
          </helix-tree-item>
          <helix-tree-item
            slot="children"
            value="merged"
          >
            Merged
          </helix-tree-item>
        </helix-tree-item>
        <helix-tree-item value="mine">Assigned to me</helix-tree-item>
      </helix-tree>

      <helix-tree
        label="Documentation"
        nesting="heading"
      >
        <helix-tree-item
          default-open
          value="start"
        >
          Getting started
          <helix-tree-item
            default-open
            slot="children"
            value="install"
          >
            Installation
            <helix-tree-item
              slot="children"
              value="any-framework"
            >
              Any framework
            </helix-tree-item>
            <helix-tree-item
              slot="children"
              value="react"
            >
              React
            </helix-tree-item>
          </helix-tree-item>
          <helix-tree-item
            slot="children"
            value="theming"
          >
            Theming
          </helix-tree-item>
        </helix-tree-item>
        <helix-tree-item value="changelog">Changelog</helix-tree-item>
      </helix-tree>
    </helix-flex>
  )
}
