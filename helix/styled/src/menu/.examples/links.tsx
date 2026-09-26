export function Example() {
  return (
    <helix-menu label="Go to">
      <helix-button
        emphasis="outlined"
        slot="trigger"
      >
        Open menu
      </helix-button>
      <helix-menu-item
        href="#button"
        value="button"
      >
        Dashboard
      </helix-menu-item>
      <helix-menu-item
        href="#menu"
        value="menu"
      >
        Settings
      </helix-menu-item>
      <helix-menu-item
        href="https://github.com"
        rel="noreferrer"
        target="_blank"
        value="source"
      >
        Source code
      </helix-menu-item>
    </helix-menu>
  )
}
