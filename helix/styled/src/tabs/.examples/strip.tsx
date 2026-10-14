export function Example() {
  return (
    <helix-tabs
      default-active="one"
      dismiss-marks="hover"
      emphasis="subtle"
      label="Pages"
    >
      <helix-tab
        dismissible
        value="one"
      >
        Dashboard
      </helix-tab>
      <helix-tab
        dismissible
        value="two"
      >
        Settings
      </helix-tab>
      <helix-tab
        dismissible
        value="three"
      >
        Sign in
      </helix-tab>
    </helix-tabs>
  )
}
