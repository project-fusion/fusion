export function Example() {
  return (
    <helix-flex
      direction="column"
      gap="lg"
    >
      <helix-sparkline
        label="Sessions over seven days"
        loading
      ></helix-sparkline>
      <helix-sparkline
        empty-text="No orders this week"
        label="Orders over seven days"
      ></helix-sparkline>
    </helix-flex>
  )
}
