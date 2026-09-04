import './preview.css'

export function Example() {
  return (
    <helix-headless-menu label="Menu">
      <helix-headless-button slot="trigger">Menu</helix-headless-button>

      <helix-headless-menu-item value="one">
        Item One
        <helix-headless-menu-item
          checkable
          checked
          slot="submenu"
          value="one-a"
        >
          Option One
        </helix-headless-menu-item>
        <helix-headless-menu-item
          checkable
          slot="submenu"
          value="one-b"
        >
          Option Two
        </helix-headless-menu-item>
      </helix-headless-menu-item>

      <helix-headless-divider announced></helix-headless-divider>

      <helix-headless-menu-item
        checkable
        checked
        value="two"
      >
        Item Two
      </helix-headless-menu-item>
      <helix-headless-menu-item
        checkable
        value="three"
      >
        Item Three
      </helix-headless-menu-item>
    </helix-headless-menu>
  )
}
