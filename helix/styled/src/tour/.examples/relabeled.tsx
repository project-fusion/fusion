export function Example() {
  return (
    <helix-flex
      direction="column"
      gap="md"
    >
      <helix-flex gap="sm">
        <helix-button id="library">Files</helix-button>
        <helix-button id="shelves">New folder</helix-button>
        <helix-button id="share">Share</helix-button>
      </helix-flex>

      <helix-tour
        back-label="Go back"
        done-label="Got it"
        label="Files tour"
        next-label="Keep going"
        open
        skip-label="Not now"
      >
        <helix-tour-stop
          for="library"
          placement="bottom-start"
        >
          Everything you have saved is here, newest first.
        </helix-tour-stop>

        <helix-tour-stop
          for="shelves"
          placement="bottom"
        >
          Create a folder to group related files.
        </helix-tour-stop>

        <helix-tour-stop
          for="share"
          placement="bottom-end"
        >
          Sharing a folder also shares any files you add to it later.
        </helix-tour-stop>
      </helix-tour>
    </helix-flex>
  )
}
