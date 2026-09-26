export function Example() {
  return (
    <helix-select
      default-value="two"
      hint="Used for emails and notifications"
      label="Language"
      name="choice"
    >
      <helix-icon
        name="caret-down"
        slot="indicator"
      ></helix-icon>
      <helix-option value="one">English</helix-option>
      <helix-option value="two">Spanish</helix-option>
      <helix-option value="three">French</helix-option>
    </helix-select>
  )
}
