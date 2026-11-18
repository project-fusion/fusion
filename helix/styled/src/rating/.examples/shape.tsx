export function Example() {
  return (
    <helix-flex
      direction="column"
      gap="md"
    >
      <helix-rating
        default-value="3"
        label="Star"
        show-value
      ></helix-rating>
      <helix-rating
        default-value="2"
        label="Dots"
        max={4}
        shape="dots"
        show-value
      ></helix-rating>
    </helix-flex>
  )
}
