import './states.css'

export function Example() {
  return (
    <>
      <table
        data-hidden-visually
        id="commitsloading"
      >
        <caption>Commits</caption>
        <tbody></tbody>
      </table>

      <table
        data-hidden-visually
        id="commitsempty"
      >
        <caption>Commits</caption>
        <tbody></tbody>
      </table>

      <div className="values">
        <figure>
          <figcaption>Loading</figcaption>
          <helix-spatial-heatmap
            for="commitsloading"
            label="Commits, last four weeks"
            loading
            rows={7}
            thresholds="1 3 5 7 9"
            tones="1 2 3 4 5"
          ></helix-spatial-heatmap>
        </figure>
        <figure>
          <figcaption>Empty</figcaption>
          <helix-spatial-heatmap
            for="commitsempty"
            label="Commits, last four weeks"
            rows={7}
            thresholds="1 3 5 7 9"
            tones="1 2 3 4 5"
          ></helix-spatial-heatmap>
        </figure>
      </div>
    </>
  )
}
