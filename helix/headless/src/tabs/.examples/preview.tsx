import './preview.css'

export function Example() {
  return (
    <helix-headless-tabs
      default-active="one"
      label="Label"
    >
      {' '}
      <helix-headless-tab value="one">Tab One</helix-headless-tab>{' '}
      <helix-headless-tab value="two">Tab Two</helix-headless-tab>{' '}
      <helix-headless-tab-panel
        slot="panels"
        value="one"
      >
        {' '}
        Lorem ipsum dolor sit amet, consectetur adipiscing elit.{' '}
      </helix-headless-tab-panel>{' '}
      <helix-headless-tab-panel
        slot="panels"
        value="two"
      >
        {' '}
        Lorem ipsum dolor sit amet, consectetur adipiscing elit.{' '}
      </helix-headless-tab-panel>{' '}
    </helix-headless-tabs>
  )
}
