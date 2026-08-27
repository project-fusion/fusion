export function Example() {
  return (
    <helix-flex direction="column" gap="lg">
      <helix-sparkline
        label="Straight, which joins the readings and claims nothing between them"
        values="1240 1318 1102 1291 1244 1180 1408"
      ></helix-sparkline>
      <helix-sparkline
        curve="smooth"
        label="Smooth, which is easier to follow and invents the values in between"
        values="1240 1318 1102 1291 1244 1180 1408"
      ></helix-sparkline>
      <helix-sparkline
        curve="step"
        label="Stepped, which says each reading held until the next one"
        values="1240 1318 1102 1291 1244 1180 1408"
      ></helix-sparkline>
    </helix-flex>
  )
}
