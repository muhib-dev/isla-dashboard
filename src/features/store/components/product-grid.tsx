import { ArrowUpRightIcon } from "lucide-react"
import { getProducts } from "@/features/store/queries"
import { fmt } from "@/lib/format"
import { cn } from "@/lib/utils"

export async function ProductGrid() {
  const products = await getProducts()
  const sorted = [...products].sort((a, b) => b.price - a.price)

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {sorted.map((product, i) => (
        <a
          key={product.id}
          href={product.url}
          target="_blank"
          rel="noreferrer"
          className={cn(
            "group flex flex-col rounded-xl bg-card p-5 ring-1 ring-foreground/10 transition-colors hover:bg-accent/50",
            i === 0 && "bg-primary text-primary-foreground ring-primary hover:bg-primary/95 sm:col-span-2 lg:col-span-1",
          )}
        >
          <p className={cn("text-sm text-muted-foreground", i === 0 && "text-primary-foreground/70")}>
            {i === 0 ? "Best value · all five toolkits" : product.category}
          </p>
          <p className="mt-2 font-medium text-balance">{product.name}</p>
          <p className={cn("mt-1 flex-1 text-sm text-muted-foreground", i === 0 && "text-primary-foreground/75")}>{product.summary}</p>
          <div className="mt-5 flex items-center justify-between">
            <span className="tabular text-lg font-semibold">{fmt.currency(product.price)}</span>
            <ArrowUpRightIcon className="size-4 opacity-60 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </div>
        </a>
      ))}
    </div>
  )
}
