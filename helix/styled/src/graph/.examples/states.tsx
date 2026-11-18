import './states.css'

export function Example() {
  return (
    <helix-flex
      direction="column"
      gap="lg"
    >
      <helix-graph
        label="Company notes"
        loading
        loading-text="Loading company notes"
      ></helix-graph>

      <helix-graph
        empty-text="No research notes yet"
        label="Research notes"
      ></helix-graph>
    </helix-flex>
  )
}
