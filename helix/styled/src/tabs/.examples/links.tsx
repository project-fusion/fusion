export function Example() {
  return (
    <helix-tabs
      label="Project"
      variant="underlined"
    >
      <helix-tab
        href="#overview"
        selected
        value="overview"
      >
        Overview
      </helix-tab>
      <helix-tab
        href="#activity"
        value="activity"
      >
        Activity
      </helix-tab>
      <helix-tab
        href="#settings"
        value="settings"
      >
        Settings
      </helix-tab>
    </helix-tabs>
  )
}
