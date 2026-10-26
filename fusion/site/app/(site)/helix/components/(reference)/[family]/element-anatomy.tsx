import type { AnatomyNode } from '@fusion.dev/helix-cem'
import { CodeText } from '@/components/code-text/code-text'
import { SectionHeading } from '@/components/section-heading/section-heading'
import type { NativeFamily } from '@/content/native/native'
import type { Element } from '../../../../../../content/catalog/catalog'
import styles from './anatomy.module.css'
import api from './page.module.css'

/*
 * What each element of a family draws, on the web and on a phone, from the
 * anatomy the compiler writes into the styled package's `api.json`. The web
 * tree carries the page's `web` mark and the phone's `native`, so the
 * platform preference shows one of the two, as it does the API reference.
 */

/** Where the section is, for the rail. */
export const ANATOMY_ID = 'anatomy'

/** The root first, then the rest in the order the family lists them. */
const rootFirst = (elements: Element[]): Element[] =>
  [...elements].sort((a, b) => Number(b.part === 'Root') - Number(a.part === 'Root'))

/** The elements a reader can see the anatomy of. */
export const withAnatomy = (elements: Element[]): Element[] =>
  rootFirst(elements.filter((element) => element.anatomy !== undefined))

function Row({ label, says, tone }: { label: string; says?: string[]; tone?: 'host' | 'root' }) {
  return (
    <span className={styles.row}>
      <code className={tone ? styles[tone] : styles.draws}>{label}</code>
      {says?.map((one) => (
        <code className={styles.says} key={one}>
          {one}
        </code>
      ))}
    </span>
  )
}

function Nodes({ nodes }: { nodes: AnatomyNode[] }) {
  return (
    <ul className={styles.tree}>
      {nodes.map((node, index) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: two `while` nodes can read one prop, and the order is the tree's
        <li key={`${node.kind}.${node.name}.${index}`}>
          <Row label={node.draws} says={node.says} />
          {node.children && node.children.length > 0 && <Nodes nodes={node.children} />}
        </li>
      ))}
    </ul>
  )
}

/**
 * One element's two trees: the web element's shadow root and the
 * component's. An element with no component is the web's alone, heading and
 * all.
 */
function ElementAnatomy({
  element,
  native,
  web,
}: {
  element: Element
  native: NativeFamily | undefined
  web: 'web' | undefined
}) {
  const anatomy = element.anatomy
  if (!anatomy) {
    return null
  }
  const component = native?.components.find((one) => one.tag === element.tagName)?.name
  const drawn = component !== undefined && anatomy.native !== undefined
  const label = element.part || element.label
  const id = `${element.tagName}-anatomy`
  const states = (anatomy.web.states ?? []).map((state) => `:state(${state})`)
  return (
    <helix-flex data-platform={drawn ? undefined : web} direction="column" gap="sm" id={id}>
      <SectionHeading as="h3" label={`${label} anatomy`} target={id}>
        {label}
      </SectionHeading>
      <div className={styles.surface} data-platform={web}>
        <ul aria-label={`${element.tagName} on the web`} className={styles.tree}>
          <li>
            <Row label={`<${element.tagName}>`} says={states} tone="host" />
            <ul className={styles.tree}>
              <li>
                <Row label="#shadow-root" tone="root" />
                <Nodes nodes={anatomy.web.tree} />
              </li>
            </ul>
          </li>
        </ul>
      </div>
      {drawn && anatomy.native && (
        <div className={styles.surface} data-platform="native">
          <ul aria-label={`${component} on React Native`} className={styles.tree}>
            <li>
              <Row label={`<${component}>`} tone="host" />
              <Nodes nodes={anatomy.native.tree} />
            </li>
          </ul>
        </div>
      )}
    </helix-flex>
  )
}

/**
 * The section: each element's tree, the root first. Nothing where the
 * package records no anatomy for the family.
 */
export function Anatomy({
  elements,
  native,
  web,
}: {
  elements: Element[]
  native: NativeFamily | undefined
  web: 'web' | undefined
}) {
  const shown = withAnatomy(elements)
  if (shown.length === 0) {
    return null
  }
  return (
    <helix-flex direction="column" gap="2xl" id={ANATOMY_ID}>
      <helix-flex direction="column" gap="sm">
        <SectionHeading as="h2" label="Anatomy" target={ANATOMY_ID}>
          Anatomy
        </SectionHeading>
        <helix-text
          as="p"
          class={api.description}
          data-platform={web}
          emphasis="muted"
          variant="caption"
        >
          <CodeText>
            {
              'What each element draws in its shadow root: each part by the name `::part()` reaches, and each slot by the name content goes into.'
            }
          </CodeText>
        </helix-text>
        {web && (
          <helix-text
            as="p"
            class={api.description}
            data-platform="native"
            emphasis="muted"
            variant="caption"
          >
            <CodeText>
              {'What each component draws, and the prop that fills each region in braces.'}
            </CodeText>
          </helix-text>
        )}
      </helix-flex>
      {shown.map((element) => (
        <ElementAnatomy element={element} key={element.tagName} native={native} web={web} />
      ))}
    </helix-flex>
  )
}
