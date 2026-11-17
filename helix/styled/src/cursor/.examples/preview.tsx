import { useEffect, useRef, useState } from 'react'
import './preview.css'

export function Example() {
  const board = useRef<HTMLDivElement>(null)
  const [ada, setAda] = useState({ x: 40, y: 40 })
  const [grace, setGrace] = useState({ x: 220, y: 120 })

  // Stands in for a collaboration service reporting where each person points.
  useEffect(() => {
    const place = () => ({
      x: Math.round(Math.random() * ((board.current?.clientWidth ?? 320) - 80)),
      y: Math.round(Math.random() * ((board.current?.clientHeight ?? 224) - 40)),
    })
    const timer = setInterval(() => {
      setAda(place())
      setGrace(place())
    }, 900)
    return () => clearInterval(timer)
  }, [])

  return (
    <div
      className="board"
      ref={board}
    >
      <helix-cursor
        name="Ada"
        series={1}
        x={ada.x}
        y={ada.y}
      ></helix-cursor>
      <helix-cursor
        name="Grace"
        series={4}
        x={grace.x}
        y={grace.y}
      ></helix-cursor>
    </div>
  )
}
