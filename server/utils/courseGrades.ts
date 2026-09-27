// server/utils/courseGrades.ts
// Perhitungan nilai akhir course berbasis bobot per tipe aktivitas.
import { and, asc, eq, inArray } from 'drizzle-orm'
import { activities, activityProgress, courseGradeWeights, courseClasses, sections, students } from '~~/server/database/schema'
import { db } from '~~/server/utils/db'

export const ACTIVITY_TYPES = ['text', 'file', 'video', 'quiz', 'assignment', 'forum', 'presentation', 'link'] as const
export type ActivityType = typeof ACTIVITY_TYPES[number]

/** Konversi skor 0-100 menjadi predikat huruf. */
export function gradeLetter(score: number): string {
  if (score >= 90) return 'A'
  if (score >= 80) return 'B'
  if (score >= 70) return 'C'
  if (score >= 60) return 'D'
  return 'E'
}

/** Parse JSON bobot; aman terhadap nilai null / string rusak. */
export function parseWeights(raw?: string | null): Record<string, number> {
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : {}
    if (!parsed || typeof parsed !== 'object') return {}
    const out: Record<string, number> = {}
    for (const type of ACTIVITY_TYPES) {
      const v = Number((parsed as Record<string, unknown>)[type])
      if (Number.isFinite(v) && v > 0) out[type] = v
    }
    return out
  } catch {
    return {}
  }
}

/** Penyebut skor aktivitas: quiz memakai maxPoint, tipe lain memakai points (default 100). */
export function activityDenominator(activity: { type: string; points: number | null; maxPoint: number | null }): number {
  if (activity.type === 'quiz') return Number(activity.maxPoint) || 100
  return Number(activity.points) || 100
}

export interface GradeComponent {
  average: number
  count: number
  weight: number
}

export interface CalculatedGrade {
  studentId: string
  score: number
  grade: string
  components: Record<string, GradeComponent>
}

/**
 * Hitung nilai akhir seluruh siswa pada sebuah course.
 * - Skor tiap aktivitas dinormalisasi ke skala 0-100.
 * - Rata-rata per tipe aktivitas dikalikan bobot tipe.
 * - Bobot dinormalisasi terhadap total bobot komponen yang tersedia,
 *   sehingga komponen tanpa nilai tidak menggeser hasil.
 */
export async function calculateCourseGrades(courseId: string, weights: Record<string, number>): Promise<CalculatedGrade[]> {
  const acts = await db
    .select({ id: activities.id, type: activities.type, points: activities.points, maxPoint: activities.maxPoint })
    .from(activities)
    .innerJoin(sections, eq(activities.sectionId, sections.id))
    .where(eq(sections.courseId, courseId))
    .orderBy(asc(sections.position), asc(activities.position))

  const roster = await db
    .select({ id: students.id })
    .from(courseClasses)
    .innerJoin(students, eq(students.classId, courseClasses.classId))
    .where(eq(courseClasses.courseId, courseId))

  const rows = acts.length && roster.length
    ? await db
        .select()
        .from(activityProgress)
        .where(and(
          inArray(activityProgress.activityId, acts.map((a) => a.id)),
          inArray(activityProgress.studentId, roster.map((s) => s.id)),
        ))
    : []
  const byKey = new Map(rows.map((row) => [`${row.studentId}:${row.activityId}`, row]))

  return roster.map((student) => {
    const components: Record<string, GradeComponent> = {}

    for (const type of ACTIVITY_TYPES) {
      const weight = Number(weights[type])
      if (!(weight > 0)) continue

      const typeActs = acts.filter((a) => a.type === type)
      const scored: number[] = []
      for (const a of typeActs) {
        const p = byKey.get(`${student.id}:${a.id}`)
        if (p?.score == null) continue
        const denom = activityDenominator(a)
        if (denom <= 0) continue
        scored.push(Math.max(0, Math.min(100, (Number(p.score) / denom) * 100)))
      }

      if (scored.length) {
        components[type] = {
          average: scored.reduce((sum, v) => sum + v, 0) / scored.length,
          count: scored.length,
          weight,
        }
      }
    }

    const totalWeight = Object.values(components).reduce((sum, c) => sum + c.weight, 0)
    const raw = totalWeight
      ? Object.values(components).reduce((sum, c) => sum + c.average * c.weight, 0) / totalWeight
      : 0
    const score = Math.round(raw * 100) / 100

    return { studentId: student.id, score, grade: gradeLetter(score), components }
  })
}

/** Ambil bobot tersimpan untuk sebuah course (objek kosong bila belum diatur). */
export async function getCourseWeights(courseId: string): Promise<Record<string, number>> {
  const row = await db.query.courseGradeWeights.findFirst({ where: eq(courseGradeWeights.courseId, courseId) })
  return parseWeights(row?.weightsJson)
}
