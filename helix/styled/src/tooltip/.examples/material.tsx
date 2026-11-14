export function Example() {
  return (
    <helix-flex
      direction="column"
      gap="md"
    >
      <helix-tooltip content="Copy the link to your clipboard">
        <helix-button>Copy link</helix-button>
      </helix-tooltip>
      <helix-tooltip
        content="Save a PDF copy of the file"
        material="glass"
      >
        <helix-button>Download file</helix-button>
      </helix-tooltip>
    </helix-flex>
  )
}
