import { useState, useEffect } from 'react'

export interface Toast {
  id: string
  title?: string
  description?: string
  action?: React.ReactNode
  variant?: 'default' | 'destructive'
}

let count = 0
const listeners: Set<() => void> = new Set()
let toasts: Toast[] = []

export function toast(props: Omit<Toast, 'id'>) {
  const id = `toast-${count++}`
  toasts = [...toasts, { ...props, id }]
  listeners.forEach((listener) => listener())

  setTimeout(() => {
    toasts = toasts.filter((t) => t.id !== id)
    listeners.forEach((listener) => listener())
  }, 5000)

  return id
}

export function useToast() {
  const [state, setState] = useState(toasts)

  useEffect(() => {
    const listener = () => setState([...toasts])
    listeners.add(listener)
    return () => {
      listeners.delete(listener)
    }
  }, [])

  return { toasts: state, toast }
}
