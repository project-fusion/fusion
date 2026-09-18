import './accent.css'

export function Example() {
  return (
    <helix-flex
      direction="column"
      gap="lg"
    >
      <helix-flex
        align-items="center"
        gap="sm"
      >
        <helix-button
          emphasis="solid"
          tone="primary"
        >
          Publish
        </helix-button>
        <helix-button
          emphasis="solid"
          tone="accent"
        >
          Schedule
        </helix-button>
        <helix-button tone="accent">Preview</helix-button>
      </helix-flex>

      {/* Preview frame: the angle is a token, so this section rethemes on its own. */}
      <helix-flex
        align-items="center"
        className="rethemed"
        data-helix-theme
        gap="sm"
      >
        <helix-button
          emphasis="solid"
          tone="primary"
        >
          Publish
        </helix-button>
        <helix-button
          emphasis="solid"
          tone="accent"
        >
          Schedule
        </helix-button>
        <helix-button tone="accent">Preview</helix-button>
      </helix-flex>
    </helix-flex>
  )
}
