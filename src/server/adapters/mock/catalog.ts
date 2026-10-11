import "server-only"
import type { StoreRepository } from "@/server/repositories/types"
import { latency, tables } from "./store"

export function createMockStoreRepository(latencyMs: number): StoreRepository {
  return {
    async listProducts() {
      await latency(latencyMs)
      return tables.products
    },
  }
}
