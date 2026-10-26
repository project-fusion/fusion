import { HelixList, HelixListItem } from '@fusion.dev/helix/list'
import { ScrollArea, useTokens } from '@fusion.dev/helix-native'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { useState } from 'react'
import { Text } from 'react-native'
import { askAppearance, currentChoice, said } from './appearance'
import { FAMILIES, familyOf } from './gallery'
import { Bleed, Described, Onward, styles } from './page'
import type { Routes } from './routes'
import { color } from './tokens'

/** The families, each opening its examples, the proof app, the list of 1,000 rows, and the appearance setting. */
export function Home({ navigation }: NativeStackScreenProps<Routes, 'Home'>) {
  const tokens = useTokens()
  const muted = { color: color(tokens, 'color-foreground-muted') }
  const [choice, setChoice] = useState(currentChoice)
  return (
    <ScrollArea contentContainerStyle={styles.page} contentInsetAdjustmentBehavior="automatic">
      <Text style={[styles.lead, muted]}>
        Helix components drawn by the native renderer, from the same sources as the web. Each
        example is the one the sandbox shows.
      </Text>
      <Bleed>
        <HelixList
          label="Components"
          onAction={(event) => navigation.navigate('Family', { family: event.target.value })}
          selectionMode="none"
        >
          {FAMILIES.map((family) => (
            <HelixListItem
              description={`${family.examples.length} examples`}
              end={<Onward />}
              key={family.slug}
              value={family.slug}
            >
              {family.label}
            </HelixListItem>
          ))}
        </HelixList>
      </Bleed>
      <Text style={[styles.section, muted]}>Pages</Text>
      <Bleed>
        <HelixList label="Pages" onAction={() => navigation.navigate('Proof')} selectionMode="none">
          <HelixListItem
            description="A project dashboard on Expo Router, written once for the web and a phone"
            end={<Onward />}
            value="proof"
          >
            Projects
          </HelixListItem>
        </HelixList>
      </Bleed>
      <Text style={[styles.section, muted]}>Performance</Text>
      <Bleed>
        <HelixList
          label="Performance"
          onAction={() => navigation.navigate('Rows')}
          selectionMode="none"
        >
          <HelixListItem
            description="Scroll it to measure the frame rate"
            end={<Onward />}
            value="rows"
          >
            1,000 rows
          </HelixListItem>
        </HelixList>
      </Bleed>
      <Text style={[styles.section, muted]}>Settings</Text>
      <Bleed>
        <HelixList label="Settings" onAction={() => askAppearance(setChoice)} selectionMode="none">
          <HelixListItem description={said(choice)} end={<Onward />} value="appearance">
            Appearance
          </HelixListItem>
        </HelixList>
      </Bleed>
    </ScrollArea>
  )
}

/** One family's summary and its examples, each opening its own screen. */
export function FamilyScreen({ navigation, route }: NativeStackScreenProps<Routes, 'Family'>) {
  const tokens = useTokens()
  const family = familyOf(route.params.family)
  if (family === undefined) {
    return null
  }
  return (
    <ScrollArea contentContainerStyle={styles.page} contentInsetAdjustmentBehavior="automatic">
      <Text style={[styles.lead, { color: color(tokens, 'color-foreground-muted') }]}>
        {family.summary}
      </Text>
      <Bleed>
        <HelixList
          label={`${family.label} examples`}
          onAction={(event) =>
            navigation.navigate('Example', { example: event.target.value, family: family.slug })
          }
          selectionMode="none"
        >
          {family.examples.map((example) => (
            <HelixListItem
              description={
                example.description === '' ? undefined : (
                  <Described>{example.description}</Described>
                )
              }
              end={<Onward />}
              key={example.slug}
              value={example.slug}
            >
              {example.label}
            </HelixListItem>
          ))}
        </HelixList>
      </Bleed>
    </ScrollArea>
  )
}
