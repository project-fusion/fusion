import { HelixBadge } from '@fusion.dev/helix/badge'
import { HelixButton } from '@fusion.dev/helix/button'
import { HelixCheckbox } from '@fusion.dev/helix/checkbox'
import { HelixCheckboxGroup } from '@fusion.dev/helix/checkbox-group'
import { HelixIcon } from '@fusion.dev/helix/icon'
import { HelixMotionToggle } from '@fusion.dev/helix/motion-toggle'
import { HelixProgress } from '@fusion.dev/helix/progress'
import { HelixSkeleton } from '@fusion.dev/helix/skeleton'
import { HelixTrend } from '@fusion.dev/helix/trend'
import { dateTimeSupport, numberSupport, ScrollArea, useTokens } from '@fusion.dev/helix-native'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { type ReactNode, useEffect, useState } from 'react'
import { I18nManager, Text, View } from 'react-native'
import { Device } from './device'
import { Gestures } from './gestures'
import { Layers } from './layers'
import { styles } from './page'
import type { Routes } from './routes'
import { StandingCopy, StandingUndo } from './standing'
import { color } from './tokens'

/* **What the device runs check that no example shows.** Each check is a
   screen of Helix components, opened with `helix://checks/<name>`, and the
   flows in `.maestro` press and photograph them. They set up a component as
   an app would and leave what it draws alone. */

/** A check's own words, in the page's muted text. */
function Note({ children }: { readonly children: ReactNode }) {
  const tokens = useTokens()
  return (
    <Text style={[styles.lead, { color: color(tokens, 'color-foreground-muted') }]}>
      {children}
    </Text>
  )
}

/** Checkbox Group's `select-all` box, with the group's value written below it. */
function SelectAll() {
  const tokens = useTokens()
  const [chosen, setChosen] = useState('email')
  return (
    <>
      <HelixCheckboxGroup
        label="Notifications"
        onChange={(event) => setChosen(event.target.value)}
        selectAll
        value="email"
      >
        <HelixCheckbox value="email">Email</HelixCheckbox>
        <HelixCheckbox value="text">Text message</HelixCheckbox>
        <HelixCheckbox value="app">Mobile app</HelixCheckbox>
      </HelixCheckboxGroup>
      <Text style={[styles.lead, { color: color(tokens, 'color-foreground') }]}>
        Chosen: {chosen === '' ? 'nothing' : chosen}
      </Text>
    </>
  )
}

/** Format Date's elapsed time for 42 minutes, as core's `elapsedTime` asks for it. */
const elapsed = (): string =>
  new Intl.NumberFormat('en-US', { style: 'unit', unit: 'minute', unitDisplay: 'narrow' }).format(
    42,
  )

/**
 * Trend in German, compact and as a signed percent, beside the same compact
 * number in English, then an elapsed time in English, and whether the
 * engine's `Intl.NumberFormat`, with what the native runtime installs over
 * it, writes each option, each as one line the `numbers` flow reads.
 */
function Numbers() {
  return (
    <>
      <Note>Elapsed: {elapsed()}</Note>
      {Object.entries(numberSupport()).map(([option, writes]) => (
        <Note key={option}>
          {option}: {writes ? 'writes' : 'missing'}
        </Note>
      ))}
      <HelixTrend
        formatOptions={{ notation: 'compact' }}
        label="Nutzer"
        locale="de"
        value={1500000}
      />
      <HelixTrend
        formatOptions={{ maximumFractionDigits: 1, signDisplay: 'always', style: 'percent' }}
        label="Umsatz"
        locale="de"
        value={0.084}
      />
      <HelixTrend
        formatOptions={{ notation: 'compact' }}
        label="Users"
        locale="en-US"
        value={1500000}
      />
    </>
  )
}

/**
 * Which options of `Intl.DateTimeFormat` the engine writes, each as one line
 * the `dates` flow reads, so a device run says whether the date families
 * need the polyfill.
 */
function Dates() {
  const support = dateTimeSupport()
  return (
    <>
      {Object.entries(support).map(([option, writes]) => (
        <Note key={option}>
          {option}: {writes ? 'writes' : 'missing'}
        </Note>
      ))}
    </>
  )
}

/** Each kind of motion wave 1 draws, under the app's Motion Toggle. */
function Motion() {
  return (
    <>
      <HelixMotionToggle>Pause motion</HelixMotionToggle>
      <View style={{ alignItems: 'center', flexDirection: 'row', gap: 16 }}>
        <HelixIcon animation="spin" label="Syncing" name="arrow-clockwise" />
        <HelixBadge attention="pulse" label="3 unread" value="3">
          <HelixButton>Inbox</HelixButton>
        </HelixBadge>
      </View>
      <HelixProgress indeterminate label="Indexing files" />
      <HelixSkeleton shape="text" />
      <HelixSkeleton effect="pulse" shape="text" />
    </>
  )
}

/**
 * Sets the direction the gallery draws in from its next launch. **React
 * Native reads the direction once, as the app starts**, so the flow stops
 * the gallery after it opens this screen.
 */
function Direction({ rtl }: { readonly rtl: boolean }) {
  useEffect(() => {
    I18nManager.allowRTL(true)
    I18nManager.forceRTL(rtl)
  }, [rtl])
  return (
    <>
      <Note>The gallery draws {rtl ? 'right to left' : 'left to right'} from its next launch.</Note>
      <Note>Now: {I18nManager.isRTL ? 'right to left' : 'left to right'}</Note>
    </>
  )
}

/** The checks by the last part of their link, with the title each screen shows. */
export const CHECKS: Readonly<
  Record<string, { readonly draw: () => ReactNode; readonly title: string }>
> = {
  dates: { draw: () => <Dates />, title: 'Dates' },
  device: { draw: () => <Device />, title: 'Device' },
  gestures: { draw: () => <Gestures />, title: 'Gestures' },
  layers: { draw: () => <Layers />, title: 'Layers' },
  ltr: { draw: () => <Direction rtl={false} />, title: 'Left to right' },
  motion: { draw: () => <Motion />, title: 'Motion' },
  numbers: { draw: () => <Numbers />, title: 'Numbers in German' },
  rtl: { draw: () => <Direction rtl />, title: 'Right to left' },
  'select-all': { draw: () => <SelectAll />, title: 'Checkbox Group' },
  'standing-copy': { draw: () => <StandingCopy />, title: 'Copy Button' },
  'standing-undo': { draw: () => <StandingUndo />, title: 'Toast' },
}

/** One check, by its name. */
export function ChecksScreen({ route }: NativeStackScreenProps<Routes, 'Checks'>) {
  const check = CHECKS[route.params.check]
  if (check === undefined) {
    return null
  }
  return (
    <ScrollArea contentContainerStyle={styles.page} contentInsetAdjustmentBehavior="automatic">
      {check.draw()}
    </ScrollArea>
  )
}
