import { HelixList, HelixListItem } from '@fusion.dev/helix/list'
import { ScrollArea, useTokens } from '@fusion.dev/helix-native'
import { useEffect, useRef, useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { useFrameCallback, useSharedValue } from 'react-native-reanimated'
import { Bleed, styles } from './page'
import { color } from './tokens'

/* **A list of 1,000 rows, and the frame rate it scrolls at.** The device runs
   scroll it and read the line at the top, and on a phone you scroll it and
   read the same line.

   **The frames are counted on the UI thread**, by Reanimated's frame
   callback, which the display's refresh drives. A frame the UI thread draws
   late arrives late, so the count is what you see. It covers the time the
   list moves: from a finger's touch to the end of the glide after it, for
   each scroll since the screen opened. */

/** The number of rows. */
export const COUNT = 1000

const ROWS = Array.from({ length: COUNT }, (_, index) => index + 1)

/** How long a scroll that ends without a glide waits for one to start. */
const GLIDE_WITHIN = 150

/** What the frames drawn while the list moved add up to. */
interface Tally {
  /** The frames drawn, each counted at its end. */
  readonly frames: number
  /** The longest frame, in milliseconds. */
  readonly longest: number
  /** The time the frames took, in milliseconds. */
  readonly milliseconds: number
}

const grouped = new Intl.NumberFormat('en-US')

/** The line the screen shows: the frames, the time, the rate, and the longest frame. */
const said = (tally: Tally | null): string => {
  if (tally === null || tally.frames === 0) {
    return 'Scroll the list to measure the frame rate.'
  }
  const seconds = tally.milliseconds / 1000
  return `${grouped.format(tally.frames)} frames in ${seconds.toFixed(1)} seconds of scrolling: ${(tally.frames / seconds).toFixed(1)} a second. The longest frame took ${Math.round(tally.longest)} ms.`
}

/**
 * Counts the frames drawn while a scroll view moves. `moving` starts a count
 * or carries one on, and `rested` ends it and reports the total since the
 * screen opened.
 */
const useFrames = (report: (tally: Tally) => void) => {
  const frames = useSharedValue(0)
  const longest = useSharedValue(0)
  const milliseconds = useSharedValue(0)
  /* The last frame's time, or -1 before the first frame of a count. Set back
     after the callback stops, so a count never spans the rest between two. */
  const previous = useSharedValue(-1)
  const counting = useFrameCallback((frame) => {
    'worklet'
    const before = previous.get()
    previous.set(frame.timestamp)
    if (before < 0) {
      return
    }
    const took = frame.timestamp - before
    frames.set(frames.get() + 1)
    milliseconds.set(milliseconds.get() + took)
    longest.set(Math.max(longest.get(), took))
  }, false)
  const glide = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const on = useRef(false)
  useEffect(() => () => clearTimeout(glide.current), [])

  const moving = () => {
    clearTimeout(glide.current)
    if (!on.current) {
      on.current = true
      counting.setActive(true)
    }
  }
  const rested = () => {
    clearTimeout(glide.current)
    if (!on.current) {
      return
    }
    on.current = false
    counting.setActive(false)
    previous.set(-1)
    report({ frames: frames.get(), longest: longest.get(), milliseconds: milliseconds.get() })
  }
  const released = () => {
    clearTimeout(glide.current)
    glide.current = setTimeout(rested, GLIDE_WITHIN)
  }
  return { moving, released, rested }
}

/** A list of 1,000 rows, with the frame rate of its scrolls above it. */
export function RowsScreen() {
  const tokens = useTokens()
  const [tally, setTally] = useState<Tally | null>(null)
  const { moving, released, rested } = useFrames(setTally)
  return (
    <View style={local.screen}>
      <Text
        style={[
          styles.note,
          local.rate,
          {
            borderColor: color(tokens, 'color-border'),
            color: color(tokens, 'color-foreground-muted'),
          },
        ]}
        testID="rows-frame-rate"
      >
        {said(tally)}
      </Text>
      <ScrollArea
        contentContainerStyle={styles.page}
        onMomentumScrollBegin={moving}
        onMomentumScrollEnd={rested}
        onScrollBeginDrag={moving}
        onScrollEndDrag={released}
        style={local.screen}
      >
        <Bleed>
          <HelixList label={`${grouped.format(COUNT)} rows`} selectionMode="none">
            {ROWS.map((row) => (
              <HelixListItem
                description={`${grouped.format(row)} of ${grouped.format(COUNT)}`}
                key={row}
                value={String(row)}
              >
                {`Row ${grouped.format(row)}`}
              </HelixListItem>
            ))}
          </HelixList>
        </Bleed>
      </ScrollArea>
    </View>
  )
}

const local = StyleSheet.create({
  rate: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    marginTop: 0,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  screen: { flex: 1 },
})
