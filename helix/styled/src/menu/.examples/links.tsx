export function Example() {
  return (
    <helix-menu label="Go to">
      <helix-button
        emphasis="outlined"
        slot="trigger"
      >
        Open
      </helix-button>
      <helix-menu-item
        href="/design/components/button"
        value="button"
      >
        Button
      </helix-menu-item>
      <helix-menu-item
        href="/design/components/menu"
        value="menu"
      >
        Menu
      </helix-menu-item>
      <helix-menu-item
        href="https://github.com"
        rel="noreferrer"
        target="_blank"
        value="source"
      >
        Source on GitHub
      </helix-menu-item>
    </helix-menu>
  )
}
