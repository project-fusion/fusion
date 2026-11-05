export function Example() {
  return (
    <helix-listbox
      bleed
      default-value="two"
      label="Notifications"
    >
      <helix-option value="one">Email</helix-option>
      <helix-option value="two">Text message</helix-option>
      <helix-option value="three">Push notification</helix-option>
    </helix-listbox>
  )
}
