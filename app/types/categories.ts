// app/types/categories.ts
export interface CategoryRow {
  id: string
  name: string
  parentId: string | null
  position: number
  isVisible: boolean
  createdAt?: string
}

export interface CategoryFormPayload {
  name: string
  parentId?: string | null
  position?: number
}