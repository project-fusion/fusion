export function Example() {
  return (
    <helix-flex
      direction="column"
      gap="lg"
    >
      <helix-tree label="Project files">
        <helix-tree-item
          default-open
          value="helix"
        >
          src
          <helix-tree-item
            slot="children"
            value="headless"
          >
            components
          </helix-tree-item>
          <helix-tree-item
            slot="children"
            value="styled"
          >
            styles
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
              Windows
            </helix-tree-item>
            <helix-tree-item
              slot="children"
              value="react"
            >
              macOS
            </helix-tree-item>
          </helix-tree-item>
          <helix-tree-item
            slot="children"
            value="theming"
          >
            Configuration
          </helix-tree-item>
        </helix-tree-item>
        <helix-tree-item value="changelog">Changelog</helix-tree-item>
      </helix-tree>
    </helix-flex>
  )
}
