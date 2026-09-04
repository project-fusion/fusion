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
          Button
        </helix-button>
        <helix-button>Button</helix-button>
      </helix-flex>

      <helix-flex
        className="width-floor"
        gap="sm"
      >
        <helix-button
          emphasis="solid"
          tone="primary"
        >
          Button
        </helix-button>
        <helix-button>Button</helix-button>
      </helix-flex>

      <helix-flex
        className="width-floor"
        gap="sm"
      >
        <helix-button
          emphasis="solid"
          tone="primary"
        >
          Button
        </helix-button>
        <a
          data-button=""
          href="#cancel"
        >
          Button
        </a>
      </helix-flex>

      <helix-button
        emphasis="solid"
        tone="primary"
        width="full"
      >
        Button
      </helix-button>
    </helix-flex>
  )
}
