export interface AnnouncementRow {
  id: string
  title: string
  content: string
  isPublished: boolean
  publishedAt: string | null
  createdAt: string | Date
  authorId: string
  authorName: string | null
}

export interface AnnouncementFormPayload {
  title: string
  content: string
  isPublished: boolean
}

export interface AnnouncementListResponse {
  data: AnnouncementRow[]
  canManage: boolean
}
