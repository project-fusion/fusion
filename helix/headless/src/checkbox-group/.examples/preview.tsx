import './preview.css'

export function Example() {
  return (
    <helix-headless-checkbox-group
      hint="Choose where you receive updates."
      label="Notifications"
      name="group"
      value="one,two"
    >
      <helix-headless-checkbox value="one">Email</helix-headless-checkbox>
      <helix-headless-checkbox value="two">Text message</helix-headless-checkbox>
      <helix-headless-checkbox value="three">Mobile app</helix-headless-checkbox>
      <helix-headless-checkbox value="four">Browser</helix-headless-checkbox>
    </helix-headless-checkbox-group>
  )
}
