import type { ReactNode } from 'react'

export const donutChartArt: ReactNode = (
  <>
    <circle
      className="artStroke"
      cx="160"
      cy="112"
      fill="none"
      r="44"
      strokeDasharray="97 179"
      strokeOpacity="0.55"
      strokeWidth="14"
      transform="rotate(-90 160 112)"
    />
    <circle
      className="artStroke"
      cx="160"
      cy="112"
      fill="none"
      r="44"
      strokeDasharray="83 193"
      strokeDashoffset="-97"
      strokeOpacity="0.28"
      strokeWidth="14"
      transform="rotate(-90 160 112)"
    />
    <circle
      className="artStroke"
      cx="160"
      cy="112"
      fill="none"
      r="44"
      strokeDasharray="56 220"
      strokeDashoffset="-180"
      strokeOpacity="0.16"
      strokeWidth="14"
      transform="rotate(-90 160 112)"
    />
  </>
)
