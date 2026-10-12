"use client"

import { Component, useState, type ReactNode } from "react"
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
          <p className="text-sm text-muted-foreground">The map couldn’t load. Search and filters still work in List view.</p>
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

export function SchoolsMapLoader(props: SchoolsMapProps) {
  // Bumping the key remounts the map, which also re-runs its one-time setup.
  const [attempt, setAttempt] = useState(0)
  return (
    <MapBoundary onRetry={() => setAttempt((n) => n + 1)}>
      <SchoolsMap key={attempt} {...props} />
    </MapBoundary>
  )
}
