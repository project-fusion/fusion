import type { HelixGraph } from '@fusion.dev/helix'

/* Each note stands on a cell of the floor: x across, y back. */
const nodes: HelixGraph['nodes'] = [
  { group: 'Edge', id: 'internet', label: 'Internet', shape: 'diamond', size: 3, x: 0, y: 0 },
  { group: 'Edge', id: 'firewall', label: 'Firewall', size: 4, x: 2, y: 0 },
  { group: 'Core', id: 'core', label: 'Core switch', size: 6, x: 4, y: 0 },
  { group: 'Floor 1', id: 'switch-1', label: 'Floor 1 switch', size: 3, x: 7, y: 2 },
  { group: 'Floor 1', id: 'desks-1', label: 'Floor 1 desks', size: 1, x: 9, y: 3 },
  { group: 'Floor 1', id: 'printers', label: 'Printers', size: 1, x: 9, y: 1 },
  { group: 'Floor 2', id: 'switch-2', label: 'Floor 2 switch', size: 3, x: 7, y: -2 },
  { group: 'Floor 2', id: 'desks-2', label: 'Floor 2 desks', size: 1, x: 9, y: -1 },
  { group: 'Floor 2', id: 'wifi', label: 'Wi-Fi', shape: 'circle', size: 1, x: 9, y: -3 },
  {
    group: 'Server room',
    id: 'files',
    label: 'File server',
    shape: 'circle',
    size: 4,
    x: 3,
    y: -3,
  },
  { group: 'Server room', id: 'backups', label: 'Backups', shape: 'circle', size: 3, x: 5, y: -3 },
]

const links: HelixGraph['links'] = [
  { source: 'internet', target: 'firewall' },
  { source: 'firewall', target: 'core' },
  { source: 'core', target: 'switch-1' },
  { source: 'core', target: 'switch-2' },
  { source: 'switch-1', target: 'desks-1' },
  { source: 'switch-1', target: 'printers' },
  { source: 'switch-2', target: 'desks-2' },
  { source: 'switch-2', target: 'wifi' },
  { source: 'core', target: 'files' },
  { source: 'files', target: 'backups' },
]

export function Example() {
  return (
    <>
      {/* Preview frame: data-preview-graph-turn and data-preview-graph-tilt set where the diagram is seen from; on your page, isometricDriver(box, { turn: 20, tilt: 55 }) with connectGraph(frame, isometricDriver(box)) does. */}
      <helix-graph
        data-preview-graph="isometric"
        data-preview-graph-tilt="55"
        data-preview-graph-turn="20"
        label="Office network"
        legend
        links={links}
        nodes={nodes}
      >
        <div data-preview-graph-canvas></div>
      </helix-graph>
    </>
  )
}
