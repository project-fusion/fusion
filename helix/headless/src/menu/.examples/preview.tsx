import './preview.css'

export function Example() {
  return (
    <helix-headless-menu label="View options">
      <helix-headless-button slot="trigger">View options</helix-headless-button>

      <helix-headless-menu-item value="one">
        Sort by
        <helix-headless-menu-item
          checkable
          checked
          slot="submenu"
          value="one-a"
        >
          Name
        </helix-headless-menu-item>
        <helix-headless-menu-item
          checkable
          slot="submenu"
          value="one-b"
        >
          Date modified
        </helix-headless-menu-item>
      </helix-headless-menu-item>

      <helix-headless-divider announced></helix-headless-divider>

      <helix-headless-menu-item
        checkable
        checked
        value="two"
      >
        Show hidden files
      </helix-headless-menu-item>
      <helix-headless-menu-item
        checkable
        value="three"
      >
        Show file extensions
      </helix-headless-menu-item>
    </helix-headless-menu>
  )
}
