export function Example() {
  return (
    <helix-flex
      direction="column"
      gap="sm"
    >
      <helix-skeleton shape="text"></helix-skeleton>
      <helix-skeleton
        effect="pulse"
        shape="text"
      ></helix-skeleton>
      <helix-skeleton
        effect="none"
        shape="text"
      ></helix-skeleton>
    </helix-flex>
  )
}
