export function Example() {
  return (
    <helix-flex
      align-items="center"
      gap="md"
    >
      <helix-icon name="arrow-right"></helix-icon>
      <helix-icon
        name="arrow-right"
        rotate={90}
      ></helix-icon>
      <helix-icon
        flip="x"
        name="arrow-right"
      ></helix-icon>
      <helix-icon
        animation="spin"
        name="arrow-clockwise"
      ></helix-icon>
    </helix-flex>
  )
}
