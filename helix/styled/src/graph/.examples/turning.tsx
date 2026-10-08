import type { HelixGraph } from '@fusion.dev/helix'
import './turning.css'

/* Each note stands on a cell of the floor: x across, y back. */
const nodes: HelixGraph['nodes'] = [
  { group: 'Edge', id: 'cdn', label: 'CDN', size: 3, x: 0, y: 0 },
  { group: 'Edge', id: 'gateway', label: 'API gateway', size: 5, x: 2, y: 0 },
  { group: 'Services', id: 'accounts', label: 'Accounts', x: 5, y: 2 },
  { group: 'Services', id: 'orders', label: 'Orders', size: 6, x: 5, y: 0 },
  { group: 'Services', id: 'search', label: 'Search', x: 5, y: -2 },
  { group: 'Data', id: 'users', label: 'Users', shape: 'circle', x: 8, y: 2 },
  { group: 'Data', id: 'ledger', label: 'Order ledger', shape: 'circle', size: 5, x: 8, y: 0 },
  { group: 'Data', id: 'index', label: 'Search index', shape: 'circle', x: 8, y: -2 },
  { group: 'Data', id: 'events', label: 'Event stream', shape: 'diamond', size: 4, x: 10, y: 1 },
]

const links: HelixGraph['links'] = [
  { source: 'cdn', target: 'gateway' },
  { source: 'gateway', target: 'accounts' },
  { source: 'gateway', target: 'orders' },
  { source: 'gateway', target: 'search' },
  { source: 'accounts', target: 'users' },
  { source: 'orders', target: 'ledger' },
  { source: 'search', target: 'index' },
  { source: 'orders', target: 'events' },
  { source: 'events', target: 'index' },
]

export function Example() {
  return (
    <>
      {/* Preview frame: a button marked data-preview-graph-turn-by turns the view by its degrees, and one marked data-preview-graph-tilt-to tilts it; on your page, keep the driver you pass to connectGraph and call driver.turnBy(90) and driver.turnTo({ tilt: 90 }). */}
      <helix-graph
        data-preview-graph="isometric"
        label="Store architecture"
        legend
        links={links}
        nodes={nodes}
      >
        <div
          className="turns"
          data-density="sm"
          slot="header"
        >
          <helix-button
            data-preview-graph-turn-by="-90"
            emphasis="outlined"
          >
            Turn the diagram left
          </helix-button>
          <helix-button
            data-preview-graph-turn-by="90"
            emphasis="outlined"
          >
            Turn the diagram right
          </helix-button>
          <helix-button
            data-preview-graph-tilt-to="90"
            emphasis="outlined"
          >
            Look from above
          </helix-button>
          <helix-button
            data-preview-graph-tilt-to="35.26"
            emphasis="outlined"
          >
            Look from the side
          </helix-button>
        </div>
        <div data-preview-graph-canvas></div>
      </helix-graph>
    </>
  )
}
