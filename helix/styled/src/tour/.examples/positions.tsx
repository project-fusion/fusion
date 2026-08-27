export function Example() {
  return (
    <helix-flex direction="column" gap="md">
      <helix-button id="tourstart">Start here</helix-button>

      <helix-tour label="Getting around" open spotlight-padding="16">
        <helix-tour-stop first for="tourstart">
          The first stop. Nothing behind it, so there is no way back.
        </helix-tour-stop>

        <helix-tour-stop for="tourstart" last>
          The last. Nothing ahead, so the forward control finishes instead.
        </helix-tour-stop>
      </helix-tour>
    </helix-flex>
  )
}
