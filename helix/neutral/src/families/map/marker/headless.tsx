import { headless, number, Pressable, Slot, string, Text, View, web } from '../../../render.js'

/**
 * Map Marker's headless tier: a named place on the map, a button at its
 * latitude and longitude.
 *
 * **The frame stands it on its place**, on both platforms: `connectMap`
 * writes where the place falls on the web, and a phone's frame works it out
 * from core's camera as the view moves, MapLibre Native's or the still
 * picture's. A press asks the frame, which sends `activate` with the
 * marker's `name`, or its `label` where it has none.
 *
 * **Its name shows beside the point** while it is pointed at or focused on
 * the web, and on a phone after a press, which holds the frame's one stop.
 * A screen reader reads the name either way: it is the button's name.
 *
 * **Web only:** clusters of markers and the fanned places pressed out of
 * one, the far side of a globe, and the name turned to the start where there
 * is no room after the point.
 *
 * **Held to `helix-map-marker`.**
 */
export default headless('map-marker', {
  props: {
    label: string(),
    lat: number(),
    lng: number(),
    name: '',
    passed: false,
    passedLabel: '{label}, passed',
  },
  events: {
    mapCluster: web(['key', 'labels']),
    mapPartChange: web(['kind']),
  },
  states: [
    'active',
    'behind',
    'cluster',
    'clustered',
    'fanned',
    'icon',
    'passed',
    'placed',
    'settled',
    'start',
  ],
  map: {
    named: 'named',
    open: 'open',
  },
  render: ({ map }) => (
    <Pressable
      data-shown={map.open}
      label={map.named}
      part="marker"
      role="button"
    >
      <View
        ariaHidden
        data-shown={map.open}
        part="point"
      >
        {/* The teardrop a pin's head stands in, and where its tip meets the
            ground, the web's `::before` and `::after`. */}
        <View
          part="point-drop"
          platform="native"
        />
        <View
          part="point-foot"
          platform="native"
        />
        {/* The dot of ink in the middle of the point, the web's gradient. */}
        <View
          part="point-dot"
          platform="native"
        />
        <Slot name="icon" />
      </View>
      <View
        data-shown={map.open}
        part="label"
      >
        <Text part="label-words">{map.named}</Text>
      </View>
    </Pressable>
  ),
})
