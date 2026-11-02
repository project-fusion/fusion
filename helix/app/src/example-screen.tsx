import { HelixTab, HelixTabPanel, HelixTabs } from '@fusion.dev/helix/tabs'
import { ScrollArea, useTokens } from '@fusion.dev/helix-native'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { Component, type ReactNode } from 'react'
import { ScrollView, StyleSheet, Text, View } from 'react-native'
import { exampleOf, type GalleryExample } from './gallery'
import { Described, styles } from './page'
import type { Routes } from './routes'
import { color, MONOSPACE, points } from './tokens'

/** An example that throws says so, and the screen around it stands. */
class Contained extends Component<
  { readonly children: ReactNode; readonly failed: string },
  { failed?: string }
> {
  override state: { failed?: string } = {}

  static getDerivedStateFromError(error: Error) {
    return { failed: error.message }
  }

  override render() {
    return this.state.failed === undefined ? (
      this.props.children
    ) : (
      <Text style={[styles.note, { color: this.props.failed }]}>
        The example did not draw: {this.state.failed}
      </Text>
    )
  }
}

/** The source the sandbox shows, colored as the sandbox colors it. */
function Code({ example }: { readonly example: GalleryExample }) {
  const tokens = useTokens()
  return (
    <ScrollView
      contentContainerStyle={{ padding: points(tokens, 'space-md') }}
      horizontal
      style={[
        local.framed,
        {
          backgroundColor: color(tokens, 'color-surface'),
          borderColor: color(tokens, 'color-border'),
          borderRadius: points(tokens, 'radii-md'),
        },
      ]}
    >
      <Text
        selectable
        style={{
          color: color(tokens, 'color-foreground'),
          fontFamily: MONOSPACE,
          fontSize: 12,
          lineHeight: 18,
        }}
      >
        {example.code.map(([kind, text], index) =>
          kind === '' ? (
            text
          ) : (
            // biome-ignore lint/suspicious/noArrayIndexKey: the runs never move.
            <Text key={index} style={{ color: color(tokens, `color-syntax-${kind}`) }}>
              {text}
            </Text>
          ),
        )}
      </Text>
    </ScrollView>
  )
}

/**
 * One example, drawn in its Preview tab and written out in its Code tab, or
 * its preview alone.
 *
 * **Alone, the example's own parts are the first a hardware keyboard reaches.**
 * The Preview and Code tabs take the arrow keys of both axes, as every set of
 * tabs does, so the device runs open an example this way to drive it by keys.
 */
export function ExampleScreen({ route }: NativeStackScreenProps<Routes, 'Example'>) {
  const tokens = useTokens()
  const example = exampleOf(route.params.family, route.params.example)
  if (example === undefined) {
    return null
  }
  const muted = { color: color(tokens, 'color-foreground-muted') }
  const stage = {
    backgroundColor: color(tokens, 'color-background'),
    borderColor: color(tokens, 'color-border'),
    borderRadius: points(tokens, 'radii-md'),
    padding: points(tokens, 'space-md'),
  }
  const preview = (
    <View style={[local.framed, stage]}>
      <Contained failed={color(tokens, 'color-danger')}>
        <example.Example />
      </Contained>
    </View>
  )
  if (route.params.alone === true) {
    return (
      <ScrollArea contentContainerStyle={styles.page} contentInsetAdjustmentBehavior="automatic">
        {preview}
      </ScrollArea>
    )
  }
  return (
    <ScrollArea contentContainerStyle={styles.page} contentInsetAdjustmentBehavior="automatic">
      {example.description === '' ? null : (
        <Text style={[styles.lead, muted]}>
          <Described>{example.description}</Described>
        </Text>
      )}
      <HelixTabs
        defaultActive="preview"
        label="View"
        marker="segmented"
        panels={[
          <HelixTabPanel key="preview" value="preview">
            {preview}
            {example.styled ? (
              <Text style={[styles.note, muted]}>
                On the web the example also has a stylesheet of its own, which is not drawn here.
              </Text>
            ) : null}
          </HelixTabPanel>,
          <HelixTabPanel key="code" value="code">
            <Code example={example} />
            <Text style={[styles.note, muted]}>
              The source the sandbox shows. Each helix tag in it is drawn as its native component.
            </Text>
          </HelixTabPanel>,
        ]}
        width="full"
      >
        <HelixTab value="preview">Preview</HelixTab>
        <HelixTab value="code">Code</HelixTab>
      </HelixTabs>
    </ScrollArea>
  )
}

const local = StyleSheet.create({
  framed: { borderWidth: StyleSheet.hairlineWidth },
})
