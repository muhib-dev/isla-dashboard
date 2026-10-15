import { ArrowUpRightIcon, StarIcon } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { getProducts } from "@/features/store/queries"
import { fmt } from "@/lib/format"
import { cn } from "@/lib/utils"

export async function ProductGrid() {
  const products = await getProducts()
  const sorted = [...products].sort((a, b) => b.price - a.price)

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {sorted.map((product, i) => (
        <a
          key={product.id}
          href={product.url}
          target="_blank"
          rel="noreferrer"
          className={cn(
            "group flex flex-col rounded-lg border bg-card p-5 transition-colors hover:bg-surface-2",
            i === 0 && "bg-highlight-subtle hover:bg-highlight-subtle/80 sm:col-span-2 lg:col-span-1",
          )}
        >
          {i === 0 ? (
            <Badge variant="highlight">
              <StarIcon aria-hidden /> Best value · all five toolkits
            </Badge>
          ) : (
            <p className="text-[13px] font-medium text-muted-foreground">{product.category}</p>
          )}
          <p className="mt-2 text-h4 font-semibold text-balance">{product.name}</p>
          <p className="mt-1 flex-1 text-[15px] text-muted-foreground">{product.summary}</p>
          <div className="mt-5 flex items-center justify-between border-t pt-4">
            <span className="tabular text-h3 font-semibold">{fmt.currency(product.price)}</span>
            <ArrowUpRightIcon
              className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
              aria-hidden
            />
          </div>
        </a>
      ))}
    </div>
  )
}
