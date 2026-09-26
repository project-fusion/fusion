import { Fragment } from 'react'
import './palette.css'

/* Every series draws the same values, so only the color changes. */
const VALUES = '1240 1318 1102 1291 1244 1180 1408'

/* Series are numbered 1 to 24 across all three tones, to match the `series-N`
   classes. */
const PER_TONE = 8
const TONES = ['Balanced', 'Bright', 'Muted']

export function Example() {
  return (
    <div className="palette">
      {TONES.map((tone, group) => (
        <Fragment key={tone}>
          <p className="tone">{tone}</p>
          {Array.from({ length: PER_TONE }, (_, step) => group * PER_TONE + step + 1).map(
            (series) => (
              <Fragment key={series}>
                <span className="index">{series}</span>
                {/* Each series is drawn as a line and as an area. */}
                <helix-sparkline
                  className={`series-${series}`}
                  label={`Series ${series}`}
                  values={VALUES}
                ></helix-sparkline>
                <helix-sparkline
                  className={`series-${series}`}
                  label={`Series ${series}, area`}
                  plot="area"
                  values={VALUES}
                ></helix-sparkline>
              </Fragment>
            ),
          )}
        </Fragment>
      ))}
    </div>
  )
}
