import './preview.css'

export function Example() {
  return (
    <helix-headless-select
      default-value="two"
      hint="Used for emails and notifications"
      label="Language"
      name="choice"
    >
      <helix-headless-icon
        name="caret-down"
        slot="indicator"
      ></helix-headless-icon>
      <helix-headless-option value="one">English</helix-headless-option>
      <helix-headless-option value="two">Spanish</helix-headless-option>
      <helix-headless-option value="three">French</helix-headless-option>
    </helix-headless-select>
  )
}
