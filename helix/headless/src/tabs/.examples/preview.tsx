import './preview.css'

export function Example() {
  return (
    <helix-headless-tabs
      default-active="one"
      label="Project"
    >
      {' '}
      <helix-headless-tab value="one">Overview</helix-headless-tab>{' '}
      <helix-headless-tab value="two">Activity</helix-headless-tab>{' '}
      <helix-headless-tab-panel
        slot="panels"
        value="one"
      >
        {' '}
        A summary of the project and the people on it.{' '}
      </helix-headless-tab-panel>{' '}
      <helix-headless-tab-panel
        slot="panels"
        value="two"
      >
        {' '}
        Recent changes to the project and its files.{' '}
      </helix-headless-tab-panel>{' '}
    </helix-headless-tabs>
  )
}
