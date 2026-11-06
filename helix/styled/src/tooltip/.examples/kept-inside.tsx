export function Example() {
  return (
    <helix-flex
      align-items="center"
      gap="sm"
      id="tooltipbounds"
    >
      <helix-tooltip
        content="Change the name of the file"
        within="tooltipbounds"
      >
        <helix-button>Rename file</helix-button>
      </helix-tooltip>
      <helix-tooltip content="Move the file to another folder">
        <helix-button>Move file</helix-button>
      </helix-tooltip>
    </helix-flex>
  )
}
