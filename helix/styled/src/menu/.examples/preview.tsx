export function Example() {
  return (
    <helix-menu label="View options">
      <helix-button slot="trigger">View options</helix-button>

      <helix-menu-item value="one">
        Sort by
        <helix-menu-item
          checkable
          checked
          exclusive
          slot="submenu"
          value="one-a"
        >
          Name
        </helix-menu-item>
        <helix-menu-item
          checkable
          exclusive
          slot="submenu"
          value="one-b"
        >
          Date modified
        </helix-menu-item>
      </helix-menu-item>

      <helix-divider></helix-divider>

      <helix-menu-item
        checkable
        checked
        value="two"
      >
        Show hidden files
      </helix-menu-item>
      <helix-menu-item
        checkable
        value="three"
      >
        Show file extensions
      </helix-menu-item>
    </helix-menu>
  )
}
