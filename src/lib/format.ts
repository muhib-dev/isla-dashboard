const currency = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 })
const compactCurrency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  notation: "compact",
  maximumFractionDigits: 1,
})
const number = new Intl.NumberFormat("en-US")
const percent = new Intl.NumberFormat("en-US", { style: "percent", maximumFractionDigits: 0 })
const date = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" })
const monthYear = new Intl.DateTimeFormat("en-US", { month: "short", year: "numeric", timeZone: "UTC" })

export const fmt = {
  currency: (n: number) => currency.format(n),
  compactCurrency: (n: number) => compactCurrency.format(n),
  number: (n: number) => number.format(n),
  percent: (n: number) => percent.format(n),
  ratio: (n: number) => `${n.toFixed(1)} : 1`,
  date: (iso: string) => date.format(new Date(iso)),
  monthYear: (iso: string) => monthYear.format(new Date(iso)),
  time: (hhmm: string) => {
    const [h, m] = hhmm.split(":").map(Number)
    const suffix = h >= 12 ? "pm" : "am"
    return `${((h + 11) % 12) + 1}:${String(m).padStart(2, "0")} ${suffix}`
  },
}

export function formatMetric(value: number, format: "number" | "currency" | "percent" | "ratio" | "decimal") {
  if (format === "currency") return fmt.currency(value)
  if (format === "percent") return fmt.percent(value)
  if (format === "ratio") return fmt.ratio(value)
  if (format === "decimal") return value.toFixed(1)
  return fmt.number(Math.round(value))
}
