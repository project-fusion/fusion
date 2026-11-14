import {
  headless,
  object,
  Pressable,
  property,
  Repeat,
  string,
  Text,
  View,
  web,
} from '../../../render.js'

/**
 * Map Points' headless tier: a layer of many places from data, drawn by the
 * renderer as dots, gathered into counts where they would meet with
 * `cluster`.
 *
 * **The renderer draws the dots, where a screen reader cannot reach them**,
 * so the places in view are buttons, each on its dot and invisible until
 * focused, from core's projection: the connector stands them on the web, and
 * a phone's frame works them out from its camera as the view settles. A
 * press sends `activate` from the frame with the place's id, name, or index.
 *
 * **A phone reaches each place up to a few dozen in view**; past that the
 * layer is one element that says how many places are in view, and zooming
 * in brings them within reach, as the web's counts do.
 *
 * **Web only:** the counts a cluster draws as buttons, the arrow keys
 * between the places, and `src`, a GeoJSON file the web fetches.
 *
 * **Held to `helix-map-points`.**
 */
export default headless('map-points', {
  props: {
    cluster: false,
    countLabel: '{count, plural, one {# place} other {# places}}',
    data: property(object()),
    description: string(),
    fallbackLabel: 'Places',
    group: string(),
    label: '',
    nameKey: 'name',
    src: web(string()),
  },
  events: {
    activate: web(['value']),
    mapCluster: web(['key', 'labels']),
    mapPartChange: web(['kind']),
  },
  states: ['settled'],
  map: {
    named: 'named',
    places: 'places',
  },
  render: ({ entry, map }) => (
    <View
      label={map.named}
      part="places"
      role="group"
    >
      <Repeat
        each={map.places}
        key="key"
        part="place-items"
      >
        <Pressable
          also={{ count: entry.count }}
          label={entry.name}
          part="place"
          role="button"
          style={{ '--_map-place-x': entry.x, '--_map-place-y': entry.y }}
        >
          <View part="label">
            <Text part="label-words">{entry.name}</Text>
          </View>
        </Pressable>
      </Repeat>
    </View>
  ),
})
