import './preview.css'

export function Example() {
  return (
    <helix-headless-toggle-group
      default-value="one"
      hint="Hint"
      label="Label"
    >
      {' '}
      <helix-headless-toggle value="one">Option One</helix-headless-toggle>{' '}
      <helix-headless-toggle value="two">Option Two</helix-headless-toggle>{' '}
      <helix-headless-toggle value="three">Option Three</helix-headless-toggle>{' '}
    </helix-headless-toggle-group>
  )
}
