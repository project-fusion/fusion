export function Example() {
  return (
    <helix-flex
      direction="column"
      gap="md"
    >
      <helix-toolbar label="Report">
        <helix-button>Export report</helix-button>
        <helix-button>Share report</helix-button>
        <helix-switch label="Show totals" />
      </helix-toolbar>

      {/* `controls` lists the toolbar's controls under the commands once you type. */}
      <helix-command
        controls
        inline
        label="Commands"
      >
        <helix-option value="new">New report</helix-option>
        <helix-option value="open">Open recent</helix-option>
      </helix-command>
    </helix-flex>
  )
}
