import { Announce, headless, number, Path, Svg, string, View, web } from '../../../render.js'

/**
 * Map Position's headless tier: a live position, such as a van on its
 * round, a dot on its place with the ring its accuracy draws, and an arrow
 * where it has a heading.
 *
 * **The frame stands it on its place**, as it stands a marker: `connectMap`
 * on the web, and core's camera on a phone. The ring is `accuracy` meters
 * across the ground at the zoom the map is at.
 *
 * **A screen reader hears it move** at most once every `announce-every`,
 * through its status, which stays in the tree while the position is off the
 * map.
 *
 * **Held to `helix-map-position`.**
 */
export default headless('map-position', {
  props: {
    accuracy: number(),
    announceEvery: web(5000),
    description: string(),
    fallbackLabel: 'Live position',
    heading: number(),
    label: '',
    lat: number(),
    lng: number(),
  },
  events: {
    mapPartChange: web(['kind']),
  },
  states: ['placed', 'settled'],
  map: {
    named: 'named',
    said: 'said',
  },
  render: ({ map }) => (
    <>
      <View
        label={map.named}
        part="position"
        role="img"
      >
        <View part="accuracy" />
        <View part="heading" />
        <View part="pulse" />
        <View part="dot" />
        <Svg
          part="arrow"
          viewBox="0 0 24 24"
        >
          <Path
            d="M12 2.5 20.5 20.5 12 16.5 3.5 20.5Z"
            part="arrow-shape"
            platform="native"
          />
        </Svg>
      </View>
      <Announce
        follows={map.said}
        part="status"
      >
        {map.said}
      </Announce>
    </>
  ),
})
