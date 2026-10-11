import "server-only"
import { cacheLife, cacheTag } from "next/cache"
import { repos } from "@/server/repositories"

export const BILLING_TAG = "billing"
export const billingTag = (schoolId: string) => `billing-${schoolId}`

export async function getSchoolBilling(schoolId: string) {
  "use cache"
  cacheLife("hours")
  cacheTag(BILLING_TAG, billingTag(schoolId))
  const [plan, invoices] = await Promise.all([
    repos.billing.getPlan(schoolId),
    repos.billing.listInvoices(schoolId),
  ])
  const renewsInDays = plan ? Math.ceil((Date.parse(plan.renewsOn) - Date.now()) / 86_400_000) : null
  return { plan, invoices, renewsInDays }
}

export async function getOrgBilling() {
  "use cache"
  cacheLife("hours")
  cacheTag(BILLING_TAG)
  return repos.billing.getOrgSummary()
}
