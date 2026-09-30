import './editing.css'
import { useRef, useState } from 'react'

type Side = 'top' | 'right' | 'bottom' | 'left'
type Card = { name: string; text: string; tone?: 'accent' | 'success'; x: number; y: number }
type Link = {
  from: string
  fromSide?: Side | undefined
  label?: string | undefined
  name: string
  to: string
  toSide?: Side | undefined
}

const CARDS: Card[] = [
  { name: 'post', text: 'Draft the email', x: 0, y: 0 },
  { name: 'demo', text: 'Record a demo', tone: 'accent', x: 256, y: 0 },
  { name: 'ship', text: 'Publish the release', tone: 'success', x: 128, y: 160 },
]

const LINKS: Link[] = [{ from: 'post', name: 'post-ship', to: 'ship' }]

export function Example() {
  const [cards, setCards] = useState(CARDS)
  const [links, setLinks] = useState(LINKS)
  const [editing, setEditing] = useState<string | undefined>()
  const made = useRef(0)

  // The page edits a card's content. Here, an input replaces the text.
  const save = (name: string, text: string) => {
    const kept = text.trim()
    setCards((before) =>
      before.map((card) => (card.name === name && kept ? { ...card, text: kept } : card)),
    )
    setEditing(undefined)
  }

  return (
    <helix-canvas
      label="Launch plan"
      onhelix-before-reconnect={(event) => {
        // Cancel the move and update state, so React keeps rendering the connection.
        event.preventDefault()
        const { from, fromSide, name, to, toSide } = event.detail
        setLinks((before) =>
          before.map((link) =>
            link.name === name ? { ...link, from, fromSide, to, toSide } : link,
          ),
        )
      }}
      onhelix-before-relabel={(event) => {
        // The same for a connection's label.
        event.preventDefault()
        const { label, name } = event.detail
        setLinks((before) =>
          before.map((link) =>
            link.name === name ? { ...link, label: label || undefined } : link,
          ),
        )
      }}
      onhelix-canvas-edit={(event) => setEditing(event.detail.name)}
      onhelix-connect={(event) => {
        // The board does not add connections itself, so state adds each new edge.
        const { from, fromSide, to, toSide } = event.detail
        made.current += 1
        const name = `made-${made.current}`
        setLinks((before) => [...before, { from, fromSide, name, to, toSide }])
      }}
      onhelix-remove={(event) => {
        // The event names every card and connection to remove.
        const nodes = new Set(event.detail.nodes)
        const edges = new Set(event.detail.edges.map((one) => one.name))
        setCards((before) => before.filter((card) => !nodes.has(card.name)))
        setLinks((before) => before.filter((link) => !edges.has(link.name)))
      }}
    >
      {cards.map((card) => (
        <helix-canvas-node
          height={64}
          key={card.name}
          name={card.name}
          tone={card.tone}
          width={160}
          x={card.x}
          y={card.y}
        >
          {editing === card.name ? (
            // An input replaces the text while the card is edited.
            <input
              aria-label="Card text"
              defaultValue={card.text}
              onBlur={(event) => save(card.name, event.currentTarget.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === 'Escape') {
                  event.preventDefault()
                  if (event.key === 'Escape') {
                    event.currentTarget.value = card.text
                  }
                  // Back to the card, since the input goes when it is saved.
                  const holder = event.currentTarget.closest(
                    'helix-canvas-node',
                  ) as HTMLElement | null
                  event.currentTarget.blur()
                  holder?.focus()
                }
              }}
              ref={(field) => {
                field?.focus()
                field?.select()
              }}
            />
          ) : (
            <span>{card.text}</span>
          )}
        </helix-canvas-node>
      ))}

      {links.map((link) => (
        <helix-canvas-edge
          from={link.from}
          from-side={link.fromSide}
          key={link.name}
          label={link.label}
          name={link.name}
          to={link.to}
          to-side={link.toSide}
        ></helix-canvas-edge>
      ))}
    </helix-canvas>
  )
}
