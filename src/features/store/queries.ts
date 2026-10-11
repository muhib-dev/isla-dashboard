import "server-only"
import { cacheLife, cacheTag } from "next/cache"
import { repos } from "@/server/repositories"

export async function getProducts() {
  "use cache"
  cacheLife("days")
  cacheTag("store-products")
  return repos.store.listProducts()
}
