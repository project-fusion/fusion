export function Example() {
  return (
    <helix-checkbox-group
      hint="Choose where you receive updates."
      label="Notifications"
      name="group"
      value="one,two"
    >
      <helix-checkbox value="one">Email</helix-checkbox>
      <helix-checkbox value="two">Text message</helix-checkbox>
      <helix-checkbox value="three">Mobile app</helix-checkbox>
      <helix-checkbox value="four">Browser</helix-checkbox>
    </helix-checkbox-group>
  )
}
