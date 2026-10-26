import { headless, object, oneOf, Slot, Text, time, View, Wrap } from '../../../render.js'
import { derive } from '../../../tree.js'

/**
 * A timeline entry's headless tier: when it happened, and what it was.
 *
 * **The mark is an image named by the meaning**, the tone's word and
 * `pending-label` where either applies, so the color is not the only place
 * the tone is. A mark passed into `marker` is named the same way. With no
 * name, the mark is decoration.
 *
 * **`relative` writes the time as how long ago it was** from `datetime`,
 * where nothing is passed into `time`, with the whole date as its
 * description. The words move on as they go stale, on a clock that starts
 * again as `datetime` or `relative` changes.
 *
 * **Without a subgrid, a phone draws the entry in two rows**: the line that
 * arrives beside the time, then the mark and the rest of the line beside
 * what happened, so the mark sits on what happened as the web's subgrid puts
 * it there. Each layout of the timeline places the time where the web does:
 * over what happened, on the other side of the line, or under the mark. The
 * copies of the time a layout does not use are not drawn.
 *
 * **The web's**: the `<time>` element and its `datetime`, and the whole date
 * as a pointer's title.
 *
 * **Held to `helix-timeline-item`.** `helix family check` compares the props,
 * the states, the regions, and the parts with what the manifest says the
 * element has.
 */
export default headless('timeline-item', {
  props: {
    datetime: time(''),
    pending: false,
    pendingLabel: 'Scheduled',
    relative: oneOf(['long', 'narrow', 'short']),
    tone: oneOf(['danger', 'info', 'neutral', 'primary', 'success', 'warning']),
    toneLabel: '',
    toneLabels: object(),
  },
  events: {},
  states: ['settled'],
  derived: {
    glyph: derive('timeline-item-glyph'),
    markName: derive('timeline-item-mark-name'),
    markUnnamed: derive('timeline-item-mark-unnamed'),
    reading: derive('timeline-item-reading'),
    whole: derive('timeline-item-whole'),
  },
  clock: { expires: 'timeline-item-expires', restartOn: ['datetime', 'relative'] },
  host: { role: 'listitem' },
  render: ({ derived }) => (
    <>
      {/* A phone's first row: the line that arrives, beside the time. */}
      <Wrap
        part="head"
        platform="native"
      >
        <View
          ariaHidden
          part="head-lead"
          platform="native"
        />
        <View
          ariaHidden
          part="arrive"
          platform="native"
        />
        <View
          description={derived.whole}
          part="time"
        >
          <Slot name="time">
            <Text part="reading">{derived.reading}</Text>
          </Slot>
        </View>
      </Wrap>
      {/* A phone's second row: the mark and the rest of the line, beside what
          happened. The time stands before the line where the time is on the
          other side, and over what happened where the line runs across. */}
      <Wrap
        part="body"
        platform="native"
      >
        <View
          part="lead"
          platform="native"
        >
          <View
            part="beside"
            platform="native"
          >
            <View
              description={derived.whole}
              part="time"
              platform="native"
            >
              <Slot name="time">
                <Text part="reading">{derived.reading}</Text>
              </Slot>
            </View>
          </View>
        </View>
        <View part="rail">
          <View
            ariaHidden={derived.markUnnamed}
            label={derived.markName}
            part="marker"
            role={derived.markUnnamed === false ? 'img' : ''}
          >
            <Slot name="marker">
              <View
                ariaHidden
                icon={derived.glyph}
                part="dot"
              />
            </Slot>
          </View>
        </View>
        <Wrap
          part="main"
          platform="native"
        >
          <View
            part="above"
            platform="native"
          >
            <View
              description={derived.whole}
              part="time"
              platform="native"
            >
              <Slot name="time">
                <Text part="reading">{derived.reading}</Text>
              </Slot>
            </View>
          </View>
          <View part="content">
            <Slot />
          </View>
        </Wrap>
      </Wrap>
    </>
  ),
})
