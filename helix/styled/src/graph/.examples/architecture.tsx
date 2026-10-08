const nodes = [
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

const links = [
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
      {/* Preview frame: data-preview-graph="isometric" has the frame connect the isometric driver; on your page, connectGraph(frame, isometricDriver(box)) from @fusion.dev/helix-graph and @fusion.dev/helix-graph/isometric does. */}
      <helix-graph
        data-preview-graph="isometric"
        default-active="orders"
        label="Store architecture"
        legend
        links={links}
        nodes={nodes}
      >
        <div data-preview-graph-canvas></div>
      </helix-graph>
    </>
  )
}
