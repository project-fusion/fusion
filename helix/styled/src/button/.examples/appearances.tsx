export function Example() {
  return (
    <helix-flex
      direction="column"
      gap="md"
    >
      <helix-flex gap="sm">
        <helix-button>Button</helix-button>
        <helix-button tone="primary">Button</helix-button>
        <helix-button tone="danger">Button</helix-button>
      </helix-flex>

      <helix-flex gap="sm">
        <helix-button emphasis="solid">Button</helix-button>
        <helix-button
          emphasis="solid"
          tone="primary"
        >
          Button
        </helix-button>
        <helix-button
          emphasis="solid"
          tone="danger"
        >
          Button
        </helix-button>
      </helix-flex>

      <helix-flex gap="sm">
        <helix-button emphasis="subtle">Button</helix-button>
        <helix-button
          emphasis="subtle"
          tone="primary"
        >
          Button
        </helix-button>
        <helix-button
          emphasis="subtle"
          tone="danger"
        >
          Button
        </helix-button>
      </helix-flex>

      <helix-flex gap="sm">
        <helix-button emphasis="ghost">Button</helix-button>
        <helix-button
          emphasis="ghost"
          tone="primary"
        >
          Button
        </helix-button>
        <helix-button
          emphasis="ghost"
          tone="danger"
        >
          Button
        </helix-button>
      </helix-flex>
    </helix-flex>
  )
}
