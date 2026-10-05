import './context.css'

export function Example() {
  return (
    <helix-menu
      context
      label="Edit"
    >
      <textarea
        aria-label="Notes"
        className="area"
        defaultValue="Right-click in this field."
        slot="trigger"
      />

      <helix-menu-item
        shortcut="mod+x"
        value="cut"
      >
        Cut
      </helix-menu-item>
      <helix-menu-item
        shortcut="mod+c"
        value="copy"
      >
        Copy
      </helix-menu-item>
      <helix-menu-item
        shortcut="mod+v"
        value="paste"
      >
        Paste
      </helix-menu-item>
    </helix-menu>
  )
}
