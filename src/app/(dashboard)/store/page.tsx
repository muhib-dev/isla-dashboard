import type { Metadata } from "next"
import { ArrowUpRightIcon } from "lucide-react"
import { PageBody, PageHeader } from "@/components/layout/page-header"
import { Button } from "@/components/ui/button"
import { externalLinks } from "@/config/links"
import { ProductGrid } from "@/features/store/components/product-grid"

export const metadata: Metadata = { title: "ISLA Store" }

/** Fully cached: the catalog doesn't depend on the viewer, so this page is prerendered. */
export default function StorePage() {
  return (
    <PageBody>
      <PageHeader
        title="ISLA Store"
        description="Ready-to-use templates for running an Islamic school. Purchases show up in your billing history."
        actions={
          <Button asChild variant="outline">
            <a href={externalLinks.store} target="_blank" rel="noreferrer">
              Open store <ArrowUpRightIcon />
            </a>
          </Button>
        }
      />
      <ProductGrid />
    </PageBody>
  )
}
