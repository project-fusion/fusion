'use client'

import { useState } from 'react'

/**
 * Holds an element in state, for when the element itself is a dependency.
 */
export function useElementRef<E extends HTMLElement>(): [E | null, (node: E | null) => void] {
  return useState<E | null>(null)
}
