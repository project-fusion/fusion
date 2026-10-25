import { ScrollArea } from '@fusion.dev/helix-native'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { Projects } from 'helix-proof'
import { styles } from './page'
import type { Routes } from './routes'

/* The proof page, a project dashboard written once for the web and a phone,
   in the gallery's scrolling screen. The page itself names no platform: the
   route reads the link, and hands the page the project and the tab it opens
   at, as `helix://proof/website/activity` names them. The screens flow opens
   each screen by its own link this way, with no tap or scroll between
   screens. A new link draws the page afresh, at its top. */
export function ProofScreen({ route }: NativeStackScreenProps<Routes, 'Proof'>) {
  const project = route.params?.project
  const tab = route.params?.tab
  return (
    <ScrollArea contentContainerStyle={styles.page} contentInsetAdjustmentBehavior="automatic">
      <Projects key={`${project ?? ''}/${tab ?? ''}`} project={project} tab={tab} />
    </ScrollArea>
  )
}
