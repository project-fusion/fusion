import { HelixButton } from '@fusion.dev/helix/button'
import { camera } from '@fusion.dev/helix-core/capabilities/camera'
import { files } from '@fusion.dev/helix-core/capabilities/files'
import { share } from '@fusion.dev/helix-core/capabilities/share'
import type { DeviceFile, Picked } from '@fusion.dev/helix-core/capabilities/types'
import { useTokens } from '@fusion.dev/helix-native'
import { type ReactNode, useState } from 'react'
import { Image, Text, View } from 'react-native'
import { styles } from './page'
import { color } from './tokens'

/* **The device capabilities, each behind a press.** Share hands a link, and
   a text file, to the share sheet. Files picks documents and saves a text
   file through the share sheet. Camera takes a photo, or chooses photos from
   the library, and the page shows the first one. Each press writes what
   became of it below the buttons. */

/** A text file written as a `data:` URL, as an app exports a few lines. */
const NOTES = {
  name: 'helix-notes.txt',
  type: 'text/plain',
  uri: `data:text/plain;charset=utf-8,${encodeURIComponent('Release notes\nHelix 0.224\n')}`,
}

/** Words in the page's text. */
function Words({
  children,
  muted = false,
}: {
  readonly children: ReactNode
  readonly muted?: boolean
}) {
  const tokens = useTokens()
  return (
    <Text
      style={[
        styles.lead,
        { color: color(tokens, muted ? 'color-foreground-muted' : 'color-foreground') },
      ]}
    >
      {children}
    </Text>
  )
}

/** What a request for files gave, in words. */
const told = (picked: Picked): string =>
  picked.outcome === 'chosen'
    ? `chosen: ${picked.files.map((file) => file.name).join(', ')}`
    : picked.outcome

/** A row of buttons. */
function Row({ children }: { readonly children: ReactNode }) {
  return <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{children}</View>
}

/** The three device capabilities, and what each press last gave. */
export function Device() {
  const [heard, setHeard] = useState('Press a button')
  const [photo, setPhoto] = useState<DeviceFile>()
  const picked = (what: string) => (result: Picked) => {
    setHeard(`${what}: ${told(result)}`)
    const image = result.files.find(
      (file) => file.type.startsWith('image/') || /\.(heic|jpe?g|png)$/i.test(file.name),
    )
    if (image !== undefined) {
      setPhoto(image)
    }
  }
  return (
    <>
      <Words muted>Share</Words>
      <Row>
        <HelixButton
          onPress={() => {
            void share()
              .share({ text: 'Helix components', title: 'Helix', url: 'https://fusion.dev/helix' })
              .then((shared) => setHeard(`Share a link: ${shared}`))
          }}
        >
          Share a link
        </HelixButton>
        <HelixButton
          onPress={() => {
            void share()
              .share({ file: { ...NOTES, size: 0 }, title: 'Release notes' })
              .then((shared) => setHeard(`Share a file: ${shared}`))
          }}
        >
          Share a file
        </HelixButton>
      </Row>
      <Words muted>Files</Words>
      <Row>
        <HelixButton
          onPress={() => {
            void files().pick({ accept: [], multiple: true }).then(picked('Pick files'))
          }}
        >
          Pick files
        </HelixButton>
        <HelixButton
          onPress={() => {
            void files()
              .save(NOTES)
              .then((saved) => setHeard(`Save a file: ${saved ? 'saved' : 'not saved'}`))
          }}
        >
          Save a file
        </HelixButton>
      </Row>
      <Words muted>Camera</Words>
      <Row>
        <HelixButton
          onPress={() => {
            void camera().capture().then(picked('Take a photo'))
          }}
        >
          Take a photo
        </HelixButton>
        <HelixButton
          onPress={() => {
            void camera().choose(true).then(picked('Choose photos'))
          }}
        >
          Choose photos
        </HelixButton>
      </Row>
      <Words>{heard}</Words>
      {photo === undefined ? null : (
        <Image
          accessibilityLabel={photo.name}
          source={{ uri: photo.uri }}
          style={{ aspectRatio: 4 / 3, borderRadius: 8, width: '100%' }}
        />
      )}
    </>
  )
}
