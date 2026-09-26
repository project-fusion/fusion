import './preview.css'

export function Example() {
  return (
    <helix-headless-toggle-group
      default-value="one"
      hint="How the results are laid out"
      label="View"
    >
      {' '}
      <helix-headless-toggle value="one">List</helix-headless-toggle>{' '}
      <helix-headless-toggle value="two">Grid</helix-headless-toggle>{' '}
      <helix-headless-toggle value="three">Board</helix-headless-toggle>{' '}
    </helix-headless-toggle-group>
  )
}
