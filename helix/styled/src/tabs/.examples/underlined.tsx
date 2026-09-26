export function Example() {
  return (
    <helix-tabs
      default-active="one"
      label="Project"
      variant="underlined"
    >
      <helix-tab value="one">Overview</helix-tab>
      <helix-tab value="two">Activity</helix-tab>
      <helix-tab-panel
        slot="panels"
        value="one"
      >
        A summary of the project and the people on it.
      </helix-tab-panel>
      <helix-tab-panel
        slot="panels"
        value="two"
      >
        Recent changes to the project and its files.
      </helix-tab-panel>
    </helix-tabs>
  )
}
