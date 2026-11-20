import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { ExpoRoot } from 'expo-router'
import type { Routes } from './routes'

/* **The proof app's own route tree**, `helix/proof/app`, which Metro gathers
   with `require.context` as Expo Router's own entry does. The app's root
   layout draws no `HelixRoot` inside the gallery's, so the gallery's theme
   and icons reach it. */
const proof = require.context('../../proof/app', true, /\.tsx$/)

/* The proof app, a project dashboard on Expo Router written once for the web
   and a phone, in a screen of the gallery. The gallery reads the link and
   hands the app the route it opens at, as `helix://proof/projects/website`
   names `/projects/website`. A new link draws the app afresh at its route. */
export function ProofScreen({ route }: NativeStackScreenProps<Routes, 'Proof'>) {
  const location = route.params?.path ?? '/'
  return <ExpoRoot context={proof} key={location} location={location} />
}
