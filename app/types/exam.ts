// Tipe data untuk fitur Ujian — dipakai oleh view, composable, dan modal.

// ===================== EXAM EVENT (list & detail) =====================

export interface ExamEventList {
  id: string
  name: string
  type: string
  academicYear: string
  semester: string
  startDate: string
  endDate: string
  description?: string | null
  status: string
  subjects?: ExamEventSubjectRef[]
  classes?: ExamEventClassRef[]
}

export interface ExamEventSubjectRef {
  id: string
  subjectId: string
  passingGrade: number
  durationMinutes: number
  maxAttempts: number
  tokenPlain?: string | null
  subject?: { id: string; name: string } | null
  subjectClasses?: ExamEventSubjectClassRef[]
}

export interface ExamEventSubjectClassRef {
  classId: string
  class?: { id: string; name: string } | null
}

export interface ExamEventClassRef {
  classId: string
  class?: { id: string; name: string; studentCount?: number } | null
}

export interface ExamEventSesi {
  id: string
  name: string
  openAt: string
  closeAt: string
  proctorTokenPlain?: string | null
  subjects?: ExamEventSubjectRef[]
}

export interface ExamEventSession {
  id: string
  classId?: string
  class?: { id: string; name: string } | null
  eventSubjectId?: string
  eventSubject?: { subject?: { name: string } | null } | null
}

export interface ExamEventDetail extends ExamEventList {
  subjects: ExamEventSubjectRef[]
  classes: ExamEventClassRef[]
  sessions: ExamEventSession[]
  sesi: ExamEventSesi[]
}

// ===================== SESI / MONITORING =====================

export interface ExamMonitorRow {
  id: string
  studentName: string
  nis: string
  className: string
  subjectName: string
  status: string
  lockStatus: string
  violationCount: number
  score: number | null
}

export interface ExamMonitorResponse {
  sesi: { id: string; name: string }
  attempts: ExamMonitorRow[]
}

// ===================== STUDENT EXAM SESSIONS =====================

export interface StudentExamSession {
  sessionId: string
  eventName: string
  subjectName: string
  sesiName: string
  status: string
  openAt: string
  closeAt: string
  durationMinutes: number
}

// ===================== EXAM ATTEMPT (siswa mengerjakan) =====================

export interface ExamAttemptDetail {
  attempt: { id: string; title: string }
  questions: ExamQuestion[]
  answers: ExamAnswer[]
}

export interface ExamQuestion {
  id: string
  type: string
  question: string
  points: number
  options: ExamQuestionOption[]
}

export interface ExamQuestionOption {
  id: string
  label: string
  text: string
}

export interface ExamAnswer {
  quizQuestionId: string
  selectedOptionId?: string | null
  answerText?: string | null
}

// ===================== BANK SOAL =====================

export interface BankQuestion {
  id: string
  question: string
  isActive: boolean
  type?: string
  points?: number
}

export interface QuestionPackage {
  id: string
  name: string
  questionCount?: number
}

// ===================== SIMPLE LOOKUP =====================

export interface SimpleSubject {
  id: string
  name: string
  code?: string
}

export interface SimpleClass {
  id: string
  name: string
  studentCount?: number
}

// ===================== FORM PAYLOADS =====================

export interface ExamEventForm {
  name: string
  type: string
  academicYear: string
  semester: string
  startDate: string
  endDate: string
  description: string
}

export interface SesiForm {
  id: string
  name: string
  openDate: string
  openTime: string
  closeDate: string
  closeTime: string
}

export interface MapelForm {
  subjectId: string
  sesiId: string
  classIds: string[]
  teacherIds: string[]
  passingGrade: number
  durationMinutes: number
  maxAttempts: number
  shuffleQuestions: boolean
  shuffleOptions: boolean
  tokenRotationMinutes: null
}

// ===================== HELPER: ekstrak pesan error =====================

/** Ekstrak pesan error dari respons HTTP atau fallback. */
export function extractError(e: unknown, fallback: string): string {
  if (
    typeof e === 'object'
    && e !== null
    && 'data' in e
    && typeof (e as Record<string, unknown>).data === 'object'
    && (e as Record<string, unknown>).data !== null
  ) {
    const data = (e as { data: Record<string, unknown> }).data
    if (typeof data.statusMessage === 'string') return data.statusMessage
  }
  if (e instanceof Error && e.message) return e.message
  return fallback
}
