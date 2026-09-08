export function Example() {
  return (
    <helix-flex
      direction="column"
      gap="md"
    >
      <helix-number-input
        default-value="8"
        disabled
        label="Seats"
      ></helix-number-input>
      <helix-number-input
        disabled
        label="Seats"
      ></helix-number-input>
    </helix-flex>
  )
}
