import { highlight } from '@fusion.dev/helix-sandbox/highlight'
import { CodeText } from '@/components/code-text/code-text'
import { SectionHeading } from '@/components/section-heading/section-heading'
import type { NativeComponent, NativeEvent, NativeFamily } from '@/content/native/native'
import type { Element, Example } from '../../../../../../content/catalog/catalog'
import {
  byName,
  Code,
  DESCRIPTION,
  Described,
  MemberTable,
  NAME,
  PropertyTable,
  stacked,
  TYPE,
  TypeText,
} from './api-table'
import api from './page.module.css'

/*
 * The React Native half of a reference page, for a family Helix draws
 * natively. Every element here carries `data-platform="native"`, which
 * `docs-shell.module.css` shows only under the native preference, so the web
 * page renders as it did.
 *
 * What it shows comes from `content/native`, which is written from the
 * modules the compiler writes. The words around it are the only ones typed
 * here.
 */

/** Where the theme section is, for the rail. */
export const THEME_ID = 'theme'

/**
 * The imports an app writes: the root, from the runtime, and the family's
 * components, from the entry React Native resolves to them.
 */
export function NativeUsage({ native }: { native: NativeFamily }) {
  const names = native.components.map((component) => component.name).sort()
  const code = [
    `import { HelixRoot } from '${native.runtime}'`,
    `import { ${names.join(', ')} } from '${native.entry}'`,
  ].join('\n')
  return (
    <>
      <helix-code-block data-platform="native">
        <span
          // biome-ignore lint/security/noDangerouslySetInnerHtml: markup this build produced from its own source
          dangerouslySetInnerHTML={{ __html: highlight(code, 'tsx') }}
        />
      </helix-code-block>
      <helix-text as="p" data-platform="native" emphasis="muted" scale="caption">
        <CodeText>
          {
            "Wrap your app in `HelixRoot` once. A universal Expo app's web build draws the web elements."
          }
        </CodeText>
      </helix-text>
    </>
  )
}

/** What a handler's event carries: each field of its detail, then each of its target's. */
const fieldsOf = (event: NativeEvent): string[] =>
  (['detail', 'target'] as const).flatMap((on) =>
    event[on].map((field) => `${on}.${field.name}${field.optional ? '?' : ''}: ${field.type}`),
  )

/** The handlers, each with what its event carries. */
function EventTable({ rows }: { rows: NativeEvent[] }) {
  if (rows.length === 0) {
    return null
  }
  return (
    <div className={api.apiTable} style={stacked(true)}>
      <helix-table label="Event">
        <helix-table-column width={NAME}>Event</helix-table-column>
        <helix-table-column width={TYPE}>Fields</helix-table-column>
        <helix-table-column width={DESCRIPTION}>Description</helix-table-column>
        {byName(rows).map((row) => (
          <helix-table-row key={row.name}>
            <helix-table-cell header>
              <Code>{row.name}</Code>
            </helix-table-cell>
            <helix-table-cell>
              {fieldsOf(row).map((field) => (
                <TypeText key={field}>{field}</TypeText>
              ))}
            </helix-table-cell>
            <Described description={row.description} />
          </helix-table-row>
        ))}
      </helix-table>
    </div>
  )
}

/**
 * One component: its props, the props that take React nodes, and its
 * handlers. Headed by its web element's part, as the web reference heads it.
 */
function NativeComponentApi({ component, part }: { component: NativeComponent; part: string }) {
  return (
    <helix-flex data-platform="native" direction="column" gap="md" id={component.name}>
      <helix-flex align-items="center" data-density="sm" gap="sm" wrap>
        <SectionHeading as="h3" label={part} target={component.name}>
          {part}
        </SectionHeading>
        <helix-tag>
          <helix-text scale="code">{component.name}</helix-text>
        </helix-tag>
      </helix-flex>

      {component.summary && (
        <helix-text as="p" class={api.description} emphasis="muted" scale="caption">
          <CodeText>{component.summary}</CodeText>
        </helix-text>
      )}

      <PropertyTable
        rows={component.props.map((prop) => ({
          default: prop.default ?? '',
          description: prop.description,
          name: prop.name,
          readonly: false,
          references: [],
          type: prop.type,
        }))}
      />
      <MemberTable
        label="Region"
        rows={component.regions.map((region) => ({ ...region, type: '' }))}
        typed={false}
      />
      <EventTable rows={component.events} />
      <MemberTable
        label="Hook"
        rows={component.hooks.map(({ description, name, type }) => ({ description, name, type }))}
      />
    </helix-flex>
  )
}

/** What styles every component of the family, in the place of parts and custom properties. */
function NativeTheme() {
  return (
    <helix-flex data-platform="native" direction="column" gap="md" id={THEME_ID}>
      <SectionHeading as="h3" label="Theme" target={THEME_ID}>
        Theme
      </SectionHeading>
      <helix-text as="p" emphasis="muted" scale="caption">
        <CodeText>
          {
            "`HelixRoot` gives every component its theme. Set its `mode` and `tokens`, and read the values in your own styles with `useTokens`. Set one component’s hooks with its `hooks` prop, such as `hooks={{ backgroundColor: '#0a84ff' }}`. The components inside it inherit them."
          }
        </CodeText>
      </helix-text>
    </helix-flex>
  )
}

/** The part a component is headed by: its web element's, or its own name. */
const partOf = (component: NativeComponent, elements: readonly Element[]): string => {
  const element = elements.find((one) => one.tagName === component.tag)
  return element?.part || element?.label || component.name
}

/** Every component of the family, the root first, and then the theme. */
export function NativeReference({
  elements,
  native,
}: {
  elements: readonly Element[]
  native: NativeFamily
}) {
  return (
    <>
      {native.components.map((component) => (
        <NativeComponentApi
          component={component}
          key={component.name}
          part={partOf(component, elements)}
        />
      ))}
      <NativeTheme />
    </>
  )
}

/** The rail's links to the sections `NativeReference` draws, in its order. */
export const railLinks = (
  native: NativeFamily,
  elements: readonly Element[],
): { id: string; label: string }[] => [
  ...native.components.map((component) => ({
    id: component.name,
    label: partOf(component, elements),
  })),
  { id: THEME_ID, label: 'Theme' },
]

/** The line a family Helix draws on the web only shows under the native preference. */
export function WebOnly({ label }: { label: string }) {
  return (
    <helix-text as="p" data-platform="native" emphasis="muted" scale="caption">
      {label} has no React Native component yet.
    </helix-text>
  )
}

/**
 * An example's description, and under the native preference what it shows on
 * a phone, where its `@react-native-summary` says that differs.
 */
export function ExampleSummary({ example, native }: { example: Example; native: boolean }) {
  const web = example.description ? <CodeText>{example.description}</CodeText> : '-'
  const phone = native ? example.platforms?.['react-native']?.description : undefined
  if (!phone) {
    return web
  }
  return (
    <>
      <span data-platform="web">{web}</span>
      <span data-platform="native">
        <CodeText>{phone}</CodeText>
      </span>
    </>
  )
}
