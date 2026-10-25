export function Example() {
  return (
    <helix-tabs
      label="Project"
      marker="underlined"
    >
      <helix-tab
        href="#/overview"
        selected
        value="overview"
      >
        Overview
      </helix-tab>
      <helix-tab
        href="#/activity"
        value="activity"
      >
        Activity
      </helix-tab>
      <helix-tab
        href="#/settings"
        value="settings"
      >
        Settings
      </helix-tab>
      <helix-tab-panel
        slot="panels"
        value="overview"
      >
        A summary of the project and the people on it.
      </helix-tab-panel>
      <helix-tab-panel
        slot="panels"
        value="activity"
      >
        Recent changes to the project and its files.
      </helix-tab-panel>
      <helix-tab-panel
        slot="panels"
        value="settings"
      >
        The project's name, its members, and who can see it.
      </helix-tab-panel>
    </helix-tabs>
  )
}
