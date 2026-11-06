# @fusion.dev/helix

The styled component tier of Fusion Helix: the headless elements with
token-driven presentation on top. Custom elements, so they work in any framework
or in none.

```sh
npm install @fusion.dev/helix @fusion.dev/helix-styles
```

The elements need a bundler, such as Vite. They import their dependencies by
bare specifiers, which a browser resolves only through an import map. Import the
stylesheet and each family you use from your app's entry module:

```js
import '@fusion.dev/helix-styles/helix.css'
import '@fusion.dev/helix/button'
```

```html
<helix-button emphasis="solid" tone="primary">Save</helix-button>
```

Import each family from its subpath, as `@fusion.dev/helix/button` above. The
stylesheet is `@fusion.dev/helix-styles`' `helix.css`, which carries the tokens, the
base layer, and `elements.css`, the `:not(:defined)` rules that hide each element
until its definition loads.

Every component publishes its parts and its custom properties, so presentation is
adjustable from outside the shadow root without a fork.

Framework typings ship alongside: `@fusion.dev/helix/jsx`, `/vue` and `/svelte`.

Built on [`@fusion.dev/helix-headless`](https://www.npmjs.com/package/@fusion.dev/helix-headless),
which is the same behavior with no styling at all if you would rather bring your
own.

## React Native

Badge, Blockquote, Breadcrumbs, Button, Button Group, Card, Checkbox, Checkbox
Group, Code, Description List, Divider, Empty, Flex, Grid, Icon, Icon Button,
Kbd, List, Motion Toggle, Quote, Radio, Stat, Steps, Switch, Tabs, Tag, Tag
Group, Text, Toggle, Toggle Group, Toolbar, and Trend are also React Native
components, from the same entries, and are experimental there. Skip Link's
entry gives a phone a component that draws nothing, so a universal app's
shared screens can write it for the web. A React Native bundler such as Metro
asks for the `react-native` export condition, and `@fusion.dev/helix/tabs`
gives it `HelixTabs`, `HelixTab`, and `HelixTabPanel`, drawn with
[`@fusion.dev/helix-native`](https://www.npmjs.com/package/@fusion.dev/helix-native).

```sh
npx expo install @fusion.dev/helix react-native-gesture-handler react-native-reanimated react-native-worklets
```

```tsx
import { HelixRoot } from '@fusion.dev/helix-native'
import { HelixTab, HelixTabPanel, HelixTabs } from '@fusion.dev/helix/tabs'
```

React, React Native, Gesture Handler, Reanimated, and worklets are optional
peers here, because this package serves the web too. Without one of them,
Metro stops the bundle and names it, and Jest throws one error that names each
one missing.

**A universal Expo app's web build draws the web elements.** Expo's web
bundler does not ask for the `react-native` condition, so on the web
`@fusion.dev/helix/tabs` registers `helix-tabs` and its parts, as in any web
app. The `@fusion.dev/helix-native` README says how the props are named and
what `HelixRoot` does.

[Documentation](https://fusion.dev/helix) · [Components](https://fusion.dev/helix/components)

MIT
