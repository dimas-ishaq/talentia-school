// app/types/schedule.ts

export interface ScheduleRow {
  id: string
  dayOfWeek: number
  startTime: string
  endTime: string
  subjectId: string
  subjectName: string
  subjectCode: string
  classId: string
  className: string
  teacherId: string | null
  teacherName: string | null
  room: string | null
  note: string | null
  isActive: boolean
}

export interface ScheduleFormPayload {
  dayOfWeek: number
  startTime: string
  endTime: string
  subjectId: string
  classId: string
  teacherId: string
  room?: string
  note?: string
}

export interface ScheduleListResponse {
  data: ScheduleRow[]
  meta?: { minDay?: number; maxDay?: number }
}

export const DAY_NAMES: Record<number, string> = {
  1: 'Senin', 2: 'Selasa', 3: 'Rabu', 4: 'Kamis', 5: 'Jumat', 6: 'Sabtu',
}

// Daftar hari untuk tab/option (menghindari masalah key string saat iterasi Record)
export const DAYS: { value: number; label: string }[] = [
  { value: 1, label: 'Senin' },
  { value: 2, label: 'Selasa' },
  { value: 3, label: 'Rabu' },
  { value: 4, label: 'Kamis' },
  { value: 5, label: 'Jumat' },
  { value: 6, label: 'Sabtu' },
]
