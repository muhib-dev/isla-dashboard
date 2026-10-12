import type { ResultRow } from "./search"

const COLUMNS = ["id", "name", "city", "state", "country", "postal_code", "region", "grades", "students", "tuition", "founded", "membership", "listing", "type", "profile_status", "accreditation", "location_precision", "distance"] as const

/** Neutralise spreadsheet formulas (=, +, -, @) and quote anything with commas, quotes or newlines. */
export function csvCell(value: unknown): string {
  let s = value === null || value === undefined ? "" : String(value)
  if (/^[=+\-@\t\r]/.test(s) && !/^-?\d+(\.\d+)?$/.test(s)) s = `'${s}`
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

export function resultsToCsv(rows: ResultRow[], unit: "mi" | "km"): string {
  const lines = [COLUMNS.join(",")]
  for (const { doc, distance } of rows) {
    lines.push(
      [
        doc.id, doc.name, doc.city, doc.state, doc.country, doc.postalCode, doc.region, `${doc.gradesFrom}-${doc.gradesTo}`, doc.enrollment,
        doc.tuition, doc.founded, doc.membership.status, doc.listing, doc.schoolType, doc.freshness, doc.accreditation.join("; "), doc.precision,
        distance === null ? "" : `${distance.toFixed(1)} ${unit}`,
      ].map(csvCell).join(","),
    )
  }
  return lines.join("\r\n") + "\r\n"
}

export function downloadCsv(filename: string, text: string) {
  const url = URL.createObjectURL(new Blob(["﻿" + text], { type: "text/csv;charset=utf-8" }))
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  document.body.append(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
