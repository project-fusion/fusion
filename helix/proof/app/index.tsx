import { Redirect } from 'expo-router'

/** The app opens on its projects. */
export default function Home() {
  return <Redirect href="/projects" />
}
