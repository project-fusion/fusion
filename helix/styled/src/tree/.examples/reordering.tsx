import { useState } from 'react'

interface Chapter {
  children?: Chapter[]
  label: string
  value: string
}

const CHAPTERS: Chapter[] = [
  {
    children: [
      { label: 'Install', value: 'install' },
      { label: 'Your first page', value: 'first-page' },
      { label: 'Theming', value: 'theming' },
    ],
    label: 'Basics',
    value: 'basics',
  },
  { label: 'Forms', value: 'forms' },
  { label: 'Deploying', value: 'deploying' },
]

/** The chapters with the siblings `keys` names put in that order, wherever they are. */
const reorder = (chapters: Chapter[], keys: string[]): Chapter[] =>
  keys.every((key) => chapters.some((chapter) => chapter.value === key))
    ? keys.flatMap((key) => chapters.filter((chapter) => chapter.value === key))
    : chapters.map((chapter) =>
        chapter.children ? { ...chapter, children: reorder(chapter.children, keys) } : chapter,
      )

const Item = ({ chapter, slot }: { chapter: Chapter; slot?: string }) => (
  <helix-tree-item
    open={chapter.children ? true : undefined}
    slot={slot}
    value={chapter.value}
  >
    {chapter.label}
    {chapter.children?.map((child) => (
      <Item
        chapter={child}
        key={child.value}
        slot="children"
      />
    ))}
  </helix-tree-item>
)

export function Example() {
  const [chapters, setChapters] = useState(CHAPTERS)

  // The tree moves no item itself. Render the siblings in the order the event carries.
  const reordered = (event: CustomEvent<{ keys: string[] }>) => {
    setChapters((current) => reorder(current, event.detail.keys))
  }

  return (
    <helix-tree
      label="Chapters"
      onhelix-reorder={reordered}
      reorderable
    >
      {chapters.map((chapter) => (
        <Item
          chapter={chapter}
          key={chapter.value}
        />
      ))}
    </helix-tree>
  )
}
