import { setOpenLink } from '@fusion.dev/helix-core/capabilities/open-link'
import { HelixRoot, useTokens } from '@fusion.dev/helix-native'
import {
  createNavigationContainerRef,
  DarkTheme,
  DefaultTheme,
  NavigationContainer,
} from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { StatusBar } from 'expo-status-bar'
import { TABS } from 'helix-proof'
import { StrictMode, useEffect, useState } from 'react'
import { Linking, useColorScheme } from 'react-native'
import { CHECKS, ChecksScreen } from './checks'
import { ExampleScreen } from './example-screen'
import { exampleOf, familyOf } from './gallery'
import { Glyph, galleryLinks } from './glyph'
import { ProofScreen } from './proof-screen'
import type { Routes } from './routes'
import { RowsScreen } from './rows'
import { FamilyScreen, Home } from './screens'
import { color } from './tokens'

/* The Helix gallery: each component with a native version, and each of its
   examples as the sandbox shows it, drawn natively. A link opens it at a
   component or an example: `/--/list`, or `/--/list/selectable`, after the
   address Expo Go opens, and `helix://list/selectable` in a build of the
   gallery. `rows` opens the list of 1,000 rows, `proof` the proof page,
   `proof/website/activity` that page at one project and one of its tabs, and
   `checks/<name>` one of the checks the device runs make that no example
   shows. */

const Stack = createNativeStackNavigator<Routes>()
const navigation = createNavigationContainerRef<Routes>()

type State = Parameters<typeof navigation.reset>[0]

/** The scheme a build of the gallery opens, as `app.json` names it. */
const SCHEME = 'helix://'

/** The path a link names: after `/--/` in an address Expo Go opens, and after the scheme in a link to a build. */
const pathOf = (url: string): string => {
  const path = url.split('/--/')[1] ?? (url.startsWith(SCHEME) ? url.slice(SCHEME.length) : '')
  return path.split(/[?#]/)[0] ?? ''
}

/** The screens a link opens, from its path. */
const stateFor = (url: string | null | undefined): State => {
  const [family = '', example = '', view = ''] = pathOf(url ?? '')
    .split('/')
    .filter((part) => part !== '')
  const routes: { name: keyof Routes; params?: Routes[keyof Routes] }[] = [{ name: 'Home' }]
  if (family === 'rows') {
    routes.push({ name: 'Rows' })
  } else if (family === 'proof') {
    /* A tab the page lacks opens the project's overview. */
    const tab = TABS.find((one) => one === view)
    routes.push({
      name: 'Proof',
      params: {
        ...(example === '' ? {} : { project: example }),
        ...(tab === undefined ? {} : { tab }),
      },
    })
  } else if (family === 'checks' && CHECKS[example] !== undefined) {
    routes.push({ name: 'Checks', params: { check: example } })
  } else if (familyOf(family) !== undefined) {
    routes.push({ name: 'Family', params: { family } })
    if (exampleOf(family, example) !== undefined) {
      routes.push({
        name: 'Example',
        params: view === 'preview' ? { alone: true, example, family } : { example, family },
      })
    }
  }
  return { index: routes.length - 1, routes } as State
}

export function App() {
  return (
    <StrictMode>
      <HelixRoot Glyph={Glyph}>
        <Gallery />
      </HelixRoot>
    </StrictMode>
  )
}

/* The gallery's own way to follow a link, set once the root has installed
   the capabilities, so it replaces the phone's. */
let linksSet = false

/* **A link is heard from the moment the gallery loads.** React Native tells
   only the listeners already attached, so a link that arrived after launch
   and before the screen's effect ran was lost, and so was one that arrived
   before navigation was ready. The latest link waits here until the gallery
   follows it. */
let waiting: string | null = null
let follow: ((url: string) => void) | undefined
Linking.addEventListener('url', ({ url }) => {
  if (follow === undefined) {
    waiting = url
  } else {
    follow(url)
  }
})

function Gallery() {
  if (!linksSet) {
    linksSet = true
    setOpenLink(galleryLinks)
  }
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light'
  const tokens = useTokens()
  const [initial, setInitial] = useState<State | null>(null)
  useEffect(() => {
    let mounted = true
    follow = (url) => {
      if (navigation.isReady()) {
        navigation.reset(stateFor(url))
      } else {
        waiting = url
      }
    }
    Linking.getInitialURL().then((url) => {
      if (mounted) {
        const opened = waiting ?? url
        waiting = null
        setInitial(stateFor(opened))
      }
    })
    return () => {
      mounted = false
      follow = undefined
    }
  }, [])
  if (initial === null) {
    return null
  }
  const base = scheme === 'dark' ? DarkTheme : DefaultTheme
  const theme = {
    ...base,
    colors: {
      ...base.colors,
      background: color(tokens, 'color-background'),
      border: color(tokens, 'color-border'),
      card: color(tokens, 'color-background'),
      notification: color(tokens, 'color-danger'),
      primary: color(tokens, 'color-primary'),
      text: color(tokens, 'color-foreground'),
    },
  }
  return (
    <NavigationContainer
      initialState={initial}
      onReady={() => {
        if (waiting !== null) {
          navigation.reset(stateFor(waiting))
          waiting = null
        }
      }}
      ref={navigation}
      theme={theme}
    >
      <StatusBar style="auto" />
      <Stack.Navigator screenOptions={{ headerLargeTitleShadowVisible: false }}>
        <Stack.Screen
          component={Home}
          name="Home"
          options={{ headerLargeTitle: true, title: 'Helix' }}
        />
        <Stack.Screen
          component={FamilyScreen}
          name="Family"
          options={({ route }) => ({
            headerLargeTitle: true,
            title: familyOf(route.params.family)?.label ?? '',
          })}
        />
        <Stack.Screen
          component={ExampleScreen}
          name="Example"
          options={({ route }) => ({
            title: exampleOf(route.params.family, route.params.example)?.label ?? '',
          })}
        />
        <Stack.Screen component={RowsScreen} name="Rows" options={{ title: '1,000 rows' }} />
        <Stack.Screen component={ProofScreen} name="Proof" options={{ title: 'Proof page' }} />
        <Stack.Screen
          component={ChecksScreen}
          name="Checks"
          options={({ route }) => ({ title: CHECKS[route.params.check]?.title ?? '' })}
        />
      </Stack.Navigator>
    </NavigationContainer>
  )
}
