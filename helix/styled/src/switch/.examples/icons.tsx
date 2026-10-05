export function Example() {
  return (
    <helix-switch name="theme">
      Dark mode
      <helix-icon
        name="sun"
        slot="off"
      ></helix-icon>
      <helix-icon
        name="moon"
        slot="on"
      ></helix-icon>
    </helix-switch>
  )
}
