import { Fragment } from 'react'
import './palette.css'

/* One reading, plotted twenty-four times. The palette is what this example is
   for, so every series draws the same numbers: a different shape per swatch
   would put a second variable into a picture that is about one. */
const VALUES = '1240 1318 1102 1291 1244 1180 1408'

/* The series are numbered straight through rather than per tone, because
   `series-9` is the ninth class the stylesheet declares and not the first of the
   bright ones. The headings are where the palette changes tone, not where the
   numbering restarts. */
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
                {/* The line and the wash are the same color asked two ways, which
                    is the pair a reader is comparing. */}
                <helix-sparkline
                  className={`series-${series}`}
                  label={`Series ${series}`}
                  values={VALUES}
                ></helix-sparkline>
                <helix-sparkline
                  className={`series-${series}`}
                  label={`Series ${series}, washed`}
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
