export function Example() {
  return (
    <helix-flex
      direction="column"
      gap="lg"
    >
      <helix-sparkline
        label="Daily visitors"
        values="1240 1318 1102 1291 1244 1180 1408"
      ></helix-sparkline>
      <helix-sparkline
        curve="smooth"
        label="Daily sessions"
        values="1240 1318 1102 1291 1244 1180 1408"
      ></helix-sparkline>
      <helix-sparkline
        curve="step"
        label="Daily page views"
        values="1240 1318 1102 1291 1244 1180 1408"
      ></helix-sparkline>
    </helix-flex>
  )
}
