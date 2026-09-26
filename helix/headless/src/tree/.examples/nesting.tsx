import './nesting.css'

export function Example() {
  return (
    <div className="stack">
      <helix-headless-tree label="Project files">
        <helix-headless-tree-item
          default-open
          value="helix"
        >
          src
          <helix-headless-tree-item
            slot="children"
            value="headless"
          >
            components
          </helix-headless-tree-item>
          <helix-headless-tree-item
            slot="children"
            value="styled"
          >
            styles
          </helix-headless-tree-item>
        </helix-headless-tree-item>
        <helix-headless-tree-item value="readme">README.md</helix-headless-tree-item>
      </helix-headless-tree>

      <helix-headless-tree
        label="Filters"
        nesting="subordinate"
      >
        <helix-headless-tree-item
          default-open
          value="status"
        >
          Status
          <helix-headless-tree-item
            slot="children"
            value="open"
          >
            Open
          </helix-headless-tree-item>
          <helix-headless-tree-item
            slot="children"
            value="merged"
          >
            Merged
          </helix-headless-tree-item>
        </helix-headless-tree-item>
        <helix-headless-tree-item value="mine">Assigned to me</helix-headless-tree-item>
      </helix-headless-tree>

      <helix-headless-tree
        label="Documentation"
        nesting="heading"
      >
        <helix-headless-tree-item
          default-open
          value="start"
        >
          Getting started
          <helix-headless-tree-item
            default-open
            slot="children"
            value="install"
          >
            Installation
            <helix-headless-tree-item
              slot="children"
              value="any-framework"
            >
              Windows
            </helix-headless-tree-item>
            <helix-headless-tree-item
              slot="children"
              value="react"
            >
              macOS
            </helix-headless-tree-item>
          </helix-headless-tree-item>
          <helix-headless-tree-item
            slot="children"
            value="theming"
          >
            Configuration
          </helix-headless-tree-item>
        </helix-headless-tree-item>
        <helix-headless-tree-item value="changelog">Changelog</helix-headless-tree-item>
      </helix-headless-tree>
    </div>
  )
}
