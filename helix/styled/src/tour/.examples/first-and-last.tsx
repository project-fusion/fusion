export function Example() {
  return (
    <helix-flex
      direction="column"
      gap="md"
    >
      <helix-button id="tourstart">Create project</helix-button>

      <helix-tour
        label="Welcome tour"
        open
        spotlight-padding="16"
      >
        <helix-tour-stop
          first
          for="tourstart"
        >
          Create a project to get started.
        </helix-tour-stop>

        <helix-tour-stop
          for="tourstart"
          last
        >
          You can create more projects at any time.
        </helix-tour-stop>
      </helix-tour>
    </helix-flex>
  )
}
