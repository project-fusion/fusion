export function Example() {
  return (
    <helix-flex
      direction="column"
      gap="sm"
    >
      <helix-sparkline
        label="Revenue"
        values="4 9 6 11 8 14 12 18"
      ></helix-sparkline>
      <helix-sparkline
        emphasis="subtle"
        label="Orders"
        values="4 9 6 11 8 14 12 18"
      ></helix-sparkline>
      <helix-sparkline
        label="Sign-ups"
        plot="area"
        values="4 9 6 11 8 14 12 18"
      ></helix-sparkline>
      <helix-sparkline
        emphasis="outlined"
        label="Active users"
        plot="area"
        values="4 9 6 11 8 14 12 18"
      ></helix-sparkline>
      <helix-sparkline
        emphasis="solid"
        label="Page views"
        plot="area"
        values="4 9 6 11 8 14 12 18"
      ></helix-sparkline>
      <helix-sparkline
        label="Downloads"
        plot="bar"
        values="4 9 6 11 8 14 12 18"
      ></helix-sparkline>
      <helix-sparkline
        emphasis="outlined"
        label="Support tickets"
        plot="bar"
        values="4 9 6 11 8 14 12 18"
      ></helix-sparkline>
    </helix-flex>
  )
}
