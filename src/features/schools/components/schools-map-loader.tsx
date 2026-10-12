"use client"

import { Component, useEffect, useState, type ReactNode } from "react"
import dynamic from "next/dynamic"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import type { SchoolsMapProps } from "./schools-map"

// Leaflet touches `window` on import, so it only ever loads in the browser.
const SchoolsMap = dynamic(() => import("./schools-map"), {
  ssr: false,
  loading: () => <Skeleton className="size-full min-h-72 rounded-xl" />,
})

/** Starts downloading the map code before it's needed, so the first click on "Map" is instant. */
export function preloadMap() {
  void import("./schools-map").catch(() => {})
}

type BoundaryProps = { children: ReactNode; onRetry: () => void }

class MapBoundary extends Component<BoundaryProps, { error: Error | null }> {
  state: { error: Error | null } = { error: null }
  static getDerivedStateFromError(error: Error) {
    return { error }
  }
  componentDidCatch(error: Error) {
    // Keep the real reason in the console; the UI only shows a short message.
    console.error("School map failed to render:", error)
  }
  render() {
    const { error } = this.state
    if (!error) return this.props.children
    return (
      <div role="alert" className="grid size-full min-h-72 place-items-center rounded-xl p-6 text-center ring-1 ring-foreground/10">
        <div className="max-w-md space-y-3">
          <p className="text-sm text-muted-foreground">The map couldn’t load. Search and filters still work.</p>
          <p className="text-xs break-words text-muted-foreground/80">{error.message.slice(0, 160)}</p>
          <div className="flex justify-center gap-2">
            <Button size="sm" onClick={() => { this.setState({ error: null }); this.props.onRetry() }}>Try again</Button>
            <Button size="sm" variant="outline" onClick={() => window.location.reload()}>Reload page</Button>
          </div>
        </div>
      </div>
    )
  }
}

/**
 * Next keeps visited routes alive in React <Activity>. Leaving the page runs effect cleanups,
 * so react-leaflet destroys its Leaflet map, but coming back reuses the same component and DOM
 * and re-runs effects against that destroyed map ("Map container is being reused…",
 * "reading 'appendChild'"). So only render the map while our effects are live, and give each
 * mount a fresh key so it builds a new Leaflet map on a new container.
 */
export function SchoolsMapLoader(props: SchoolsMapProps) {
  const [mount, setMount] = useState<number | null>(null)
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- the effect lifecycle *is* the signal (Activity hide/show)
    setMount((n) => (n ?? 0) + 1)
    return () => setMount(null)
  }, [])
  // Bumping the key also re-runs the map's one-time setup after "Try again".
  const [attempt, setAttempt] = useState(0)
  if (mount === null) return <Skeleton className="size-full min-h-72 rounded-xl" />
  return (
    <MapBoundary onRetry={() => setAttempt((n) => n + 1)}>
      <SchoolsMap key={`${mount}:${attempt}`} {...props} />
    </MapBoundary>
  )
}
