export function Example() {
  return (
    <helix-flex
      align-items="center"
      gap="md"
    >
      <helix-tooltip content="Save your changes to the file">
        <helix-button>Save changes</helix-button>
      </helix-tooltip>

      <helix-tooltip
        content="Move the message out of your inbox"
        placement="bottom"
      >
        <helix-icon-button label="Archive">
          <helix-icon name="archive"></helix-icon>
        </helix-icon-button>
      </helix-tooltip>
    </helix-flex>
  )
}
