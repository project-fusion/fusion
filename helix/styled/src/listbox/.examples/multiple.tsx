export function Example() {
  return (
    <helix-listbox
      default-value="one,three"
      hint="Where to send notifications"
      label="Notifications"
      multiple
      name="choice"
    >
      <helix-option value="one">Email</helix-option>
      <helix-option value="two">Text message</helix-option>
      <helix-option value="three">Push notification</helix-option>
      <helix-option value="four">In-app message</helix-option>
    </helix-listbox>
  )
}
