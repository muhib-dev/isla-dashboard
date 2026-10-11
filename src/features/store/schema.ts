import { z } from "zod"

export const ProductSchema = z.object({
  id: z.string(),
  name: z.string(),
  summary: z.string(),
  price: z.number().nonnegative(),
  category: z.string(),
  url: z.url(),
})
export type Product = z.infer<typeof ProductSchema>
