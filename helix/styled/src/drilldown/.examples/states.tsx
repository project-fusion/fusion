import './states.css'

export function Example() {
  return (
    <helix-flex
      gap="lg"
      wrap
    >
      <helix-drilldown
        className="panel"
        label="Settings"
        loading
        loading-text="Loading settings"
      ></helix-drilldown>

      <helix-drilldown
        className="panel"
        empty-text="No saved filters"
        label="Saved filters"
      ></helix-drilldown>
    </helix-flex>
  )
}
