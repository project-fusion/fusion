import './nesting.css'

export function Example() {
  return (
    <div className="stack">
      <helix-headless-tree label="Repository">
        <helix-headless-tree-item
          default-open
          value="helix"
        >
          helix
          <helix-headless-tree-item
            slot="children"
            value="headless"
          >
            headless
          </helix-headless-tree-item>
          <helix-headless-tree-item
            slot="children"
            value="styled"
          >
            styled
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
              Any framework
            </helix-headless-tree-item>
            <helix-headless-tree-item
              slot="children"
              value="react"
            >
              React
            </helix-headless-tree-item>
          </helix-headless-tree-item>
          <helix-headless-tree-item
            slot="children"
            value="theming"
          >
            Theming
          </helix-headless-tree-item>
        </helix-headless-tree-item>
        <helix-headless-tree-item value="changelog">Changelog</helix-headless-tree-item>
      </helix-headless-tree>
    </div>
  )
}
