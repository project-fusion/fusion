export function Example() {
  return (
    <helix-flex
      direction="column"
      gap="lg"
    >
      <helix-sparkline
        label="A dot, which is where a line ends unless it is told otherwise"
        values="1240 1318 1102 1291 1244 1180 1408"
      ></helix-sparkline>
      <helix-sparkline
        label="A ring, which lets the ground through for a chart drawn over something busy"
        terminus="ring"
        values="1240 1318 1102 1291 1244 1180 1408"
      ></helix-sparkline>
      <helix-sparkline
        label="A square"
        terminus="square"
        values="1240 1318 1102 1291 1244 1180 1408"
      ></helix-sparkline>
      <helix-sparkline
        label="A triangle, pointing along the axis rather than at the last movement"
        terminus="triangle"
        values="1240 1318 1102 1291 1244 1180 1408"
      ></helix-sparkline>
      <helix-sparkline
        label="None, for a series read as a shape rather than for where it finished"
        terminus="none"
        values="1240 1318 1102 1291 1244 1180 1408"
      ></helix-sparkline>
    </helix-flex>
  )
}
