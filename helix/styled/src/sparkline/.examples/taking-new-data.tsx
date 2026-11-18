import { useState } from 'react'

const OPENING = [1240, 1318, 1102, 1291, 1244, 1180, 1408]

export function Example() {
  /* The oldest day drops off and a new one joins at the end, so the line
     keeps its count of points and moves to its new shape. */
  const [days, setDays] = useState(OPENING)
  const nextDay = () =>
    setDays((before) => [...before.slice(1), 1000 + Math.round(Math.random() * 500)])

  return (
    <helix-flex
      direction="column"
      gap="md"
    >
      <helix-sparkline
        label="Daily visitors"
        values={days.join(' ')}
      ></helix-sparkline>
      <helix-button onClick={nextDay}>Next day</helix-button>
    </helix-flex>
  )
}
