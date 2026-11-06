/* The root layout: the app's root, the bar over every screen, and the screen
   the route shows. It names no platform: `Root` and `Navigator` are each a
   pair of files, `.web.tsx` and `.native.tsx`, for what one platform alone
   has. */
import '../src/families'
import { Header } from '../src/header'
import { Navigator } from '../src/navigator'
import { Root } from '../src/root'

export default function Layout() {
  return (
    <Root>
      <Header />
      <Navigator />
    </Root>
  )
}
