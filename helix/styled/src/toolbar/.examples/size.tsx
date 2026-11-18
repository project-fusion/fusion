export function Example() {
  return (
    <helix-flex
      align-items="start"
      direction="column"
      gap="md"
    >
      <helix-toolbar label="Text formatting">
        <helix-icon-button label="Bold">
          <helix-icon name="text-b"></helix-icon>
        </helix-icon-button>
        <helix-icon-button label="Italic">
          <helix-icon name="text-italic"></helix-icon>
        </helix-icon-button>
        <helix-icon-button label="Link">
          <helix-icon name="link"></helix-icon>
        </helix-icon-button>
      </helix-toolbar>

      <helix-toolbar
        label="Text formatting"
        size="md"
      >
        <helix-icon-button label="Bold">
          <helix-icon name="text-b"></helix-icon>
        </helix-icon-button>
        <helix-icon-button label="Italic">
          <helix-icon name="text-italic"></helix-icon>
        </helix-icon-button>
        <helix-icon-button label="Link">
          <helix-icon name="link"></helix-icon>
        </helix-icon-button>
      </helix-toolbar>

      <helix-toolbar
        label="Text formatting"
        size="lg"
      >
        <helix-icon-button label="Bold">
          <helix-icon name="text-b"></helix-icon>
        </helix-icon-button>
        <helix-icon-button label="Italic">
          <helix-icon name="text-italic"></helix-icon>
        </helix-icon-button>
        <helix-icon-button label="Link">
          <helix-icon name="link"></helix-icon>
        </helix-icon-button>
      </helix-toolbar>
    </helix-flex>
  )
}
