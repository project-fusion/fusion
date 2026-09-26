import './width.css'

export function Example() {
  return (
    <helix-flex
      direction="column"
      gap="md"
    >
      <helix-flex gap="sm">
        <helix-button
          emphasis="solid"
          tone="primary"
        >
          Save
        </helix-button>
        <helix-button>Cancel</helix-button>
      </helix-flex>

      <helix-flex
        className="standard"
        gap="sm"
      >
        <helix-button
          emphasis="solid"
          tone="primary"
        >
          Save
        </helix-button>
        <helix-button>Cancel</helix-button>
      </helix-flex>

      <helix-flex
        className="standard"
        gap="sm"
      >
        <helix-button
          emphasis="solid"
          tone="primary"
        >
          Save
        </helix-button>
        <a
          data-button=""
          href="#cancel"
        >
          Cancel
        </a>
      </helix-flex>

      <helix-button
        emphasis="solid"
        tone="primary"
        width="full"
      >
        Continue
      </helix-button>
    </helix-flex>
  )
}
