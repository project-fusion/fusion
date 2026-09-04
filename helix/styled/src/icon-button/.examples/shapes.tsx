export function Example() {
  return (
    <helix-flex
      align="center"
      gap="md"
    >
      <helix-icon-button label="Search">
        <helix-icon name="magnifying-glass"></helix-icon>
      </helix-icon-button>

      <helix-icon-button
        label="Search"
        shape="circle"
      >
        <helix-icon name="magnifying-glass"></helix-icon>
      </helix-icon-button>

      <helix-icon-button
        label="Search"
        raised
      >
        <helix-icon name="magnifying-glass"></helix-icon>
      </helix-icon-button>
    </helix-flex>
  )
}
