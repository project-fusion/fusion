import type { Scenario, Setup } from '../format.js'

/*
 * The scenarios of Map, a frame around a map and its places. Both halves
 * press the frame's controls, and the comparison holds the two records to
 * each other: each `map-zoom`, `map-pan`, `map-rotate` and `map-tilt` a
 * control sends. **The web's frame draws no map of its own**: it says a move
 * only once a renderer tells it the view moved, and stands a marker on its
 * place only once a renderer projects it, where a phone's frame is the
 * renderer itself. So what the live region says, and a marker's press, are
 * each platform's own spec's: `map-root.dom.spec.ts` and `map.jest.tsx`.
 */

/** A marker at a place. */
const marker = (name: string, label: string, lat: number, lng: number): Setup => ({
  props: { label, lat, lng, name },
  tag: 'helix-map-marker',
})

/** Two places in Austin, with the frame's props. */
const frame = (props: Readonly<Record<string, boolean | number | string>> = {}): Setup => ({
  children: [
    marker('capitol', 'Texas Capitol', 30.2747, -97.7405),
    marker('bridge', 'Congress Avenue Bridge', 30.2614, -97.7453),
  ],
  props: { label: 'Places in Austin', view: '30.268,-97.743,14', ...props },
  tag: 'helix-map',
})

/** Frames: each kind of control. */
export const MAP: readonly Scenario[] = [
  {
    family: 'map',
    intents: [
      { kind: 'press', label: 'Zoom in' },
      { kind: 'press', label: 'Zoom out' },
    ],
    name: 'the zoom controls ask for a step in and a step out',
    setup: frame(),
  },
  {
    family: 'map',
    intents: [
      { kind: 'press', label: 'Pan up' },
      { kind: 'press', label: 'Pan right' },
      { kind: 'press', label: 'Pan down' },
      { kind: 'press', label: 'Pan left' },
    ],
    name: 'the pan controls ask for a move by a quarter of the box, in reading order',
    setup: frame({ controls: 'pan zoom' }),
  },
  {
    family: 'map',
    intents: [
      { kind: 'press', label: 'Rotate right' },
      { kind: 'press', label: 'Rotate left' },
      { kind: 'press', label: 'Face north' },
      { kind: 'press', label: 'Show in 3D' },
    ],
    name: 'the rotate controls, the compass and the 3D button ask for a turn and a tilt',
    setup: frame({ controls: 'rotate tilt zoom' }),
  },
]
