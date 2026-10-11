import Link from "next/link"
import { PageBody } from "@/components/layout/page-header"
import { Button } from "@/components/ui/button"

export default function SchoolNotFound() {
  return (
    <PageBody className="py-24 text-center">
      <p className="text-sm font-medium">School not found</p>
      <p className="text-sm text-muted-foreground">It may have been removed from the directory.</p>
      <Button asChild variant="outline">
        <Link href="/schools">Back to schools</Link>
      </Button>
    </PageBody>
  )
}
