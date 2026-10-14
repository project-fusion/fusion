export function Example() {
  return (
    <helix-flex
      align-items="center"
      gap="sm"
    >
      <helix-icon-button
        aria-describedby="back-tip"
        disabled
        focusable-when-disabled
        id="back"
        label="Back"
      >
        <helix-icon name="arrow-left"></helix-icon>
      </helix-icon-button>
      <helix-tooltip
        content="No page to go back to"
        for="back"
        id="back-tip"
      ></helix-tooltip>

      <helix-button
        aria-describedby="save-tip"
        disabled
        emphasis="solid"
        focusable-when-disabled
        id="save"
        tone="primary"
      >
        Save changes
      </helix-button>
      <helix-tooltip
        content="No changes to save"
        for="save"
        id="save-tip"
      ></helix-tooltip>
    </helix-flex>
  )
}
