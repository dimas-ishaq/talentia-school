// server/utils/completion.ts
// Aturan completion activity — sumber kebenaran tunggal.
// Dipakai oleh endpoint submit, complete, dan forum post
// agar siswa tidak dianggap selesai sebelum waktunya.
//
// Aturan per tipe activity:
//   - text          : viewedAt cukup (kompatibel lama)
//   - file          : viewedAt cukup
//   - video         : viewedAt cukup (video percentage di fase berikutnya)
//   - presentation  : viewedAt cukup
//   - link          : linkCompletionRule 'view' → viewedAt; 'complete' → manual
//   - quiz          : attempt submitted dengan score >= passingScore (jika ada)
//   - assignment    : submittedAt
//   - forum         : forumCompletionRule + forumRequirePost/Reply
//
// field 'required' dari activity tetap dipakai untuk progress course,
// bukan untuk menentukan apakah siswa boleh submit.

export interface CompletionActivity {
  type: string
  passingScore?: number | null
  linkCompletionRule?: string | null
  forumCompletionRule?: string | null
  forumRequirePost?: boolean | null
  forumRequireReply?: boolean | null
}

export type CompletionDecision = {
  done: boolean
  reason: 'viewed' | 'submitted' | 'quiz_passed' | 'quiz_graded' | 'forum_post' | 'forum_reply' | 'manual' | 'none'
}

interface QuizAttemptLite {
  score: number | null
  submittedAt: Date | null
}

interface ForumStats {
  postCount: number
  replyCount: number
}

interface ProgressLite {
  viewedAt?: Date | null
  submittedAt?: Date | null
  completedAt?: Date | null
  score?: number | null
}

export interface CompletionInput {
  activity: CompletionActivity
  progress: ProgressLite | null
  /** Attempt quiz terakhir yang submitted / needs_grading. */
  lastQuizAttempt?: QuizAttemptLite | null
  /** Statistik forum siswa pada activity ini. */
  forumStats?: ForumStats
}

/** Tentukan apakah activity sudah selesai untuk seorang siswa. */
export function evaluateCompletion(input: CompletionInput): CompletionDecision {
  const { activity, progress, lastQuizAttempt, forumStats } = input

  if (progress?.completedAt) {
    // Jika sudah pernah ditandai selesai, hormati status itu
    // (mis. quiz dengan passingScore 0 dianggap selesai setelah submit).
    return { done: true, reason: progress.submittedAt ? 'submitted' : 'viewed' }
  }

  switch (activity.type) {
    case 'text':
    case 'file':
    case 'video':
    case 'presentation':
      return progress?.viewedAt
        ? { done: true, reason: 'viewed' }
        : { done: false, reason: 'none' }

    case 'link': {
      // 'view'  : dibuka = selesai
      // 'complete': siswa harus menandai sendiri (endpoint /complete)
      if (activity.linkCompletionRule === 'complete') {
        return progress?.completedAt
          ? { done: true, reason: 'manual' }
          : { done: false, reason: 'none' }
      }
      return progress?.viewedAt
        ? { done: true, reason: 'viewed' }
        : { done: false, reason: 'none' }
    }

    case 'assignment':
      return progress?.submittedAt
        ? { done: true, reason: 'submitted' }
        : { done: false, reason: 'none' }

    case 'quiz': {
      // Selesai bila attempt submitted dan (opsional) lulus passingScore.
      const submitted = lastQuizAttempt?.submittedAt
      if (!submitted) return { done: false, reason: 'none' }
      const passing = Number(activity.passingScore ?? 0)
      if (passing > 0) {
        const score = Number(lastQuizAttempt.score ?? 0)
        return score >= passing
          ? { done: true, reason: 'quiz_passed' }
          : { done: false, reason: 'none' }
      }
      return { done: true, reason: 'quiz_graded' }
    }

    case 'forum': {
      const rule = activity.forumCompletionRule ?? 'view'
      if (rule === 'view') {
        return progress?.viewedAt
          ? { done: true, reason: 'viewed' }
          : { done: false, reason: 'none' }
      }
      const posts = forumStats?.postCount ?? 0
      const replies = forumStats?.replyCount ?? 0
      const needPost = !!activity.forumRequirePost || rule === 'post' || rule === 'reply'
      const needReply = !!activity.forumRequireReply || rule === 'reply'
      if (needReply && replies > 0) return { done: true, reason: 'forum_reply' }
      if (needPost && posts > 0) return { done: true, reason: 'forum_post' }
      // fallback jika completion rule 'post' tapi tidak ada requirePost: anggap post cukup
      if (!needReply && !needPost && posts > 0) return { done: true, reason: 'forum_post' }
      return { done: false, reason: 'none' }
    }

    default:
      return { done: false, reason: 'none' }
  }
}

/** Hitung progress course: hanya activity isRequired (required). */
export function courseProgress(
  activities: Array<{ id: string; isRequired: boolean | null }>,
  decisions: Map<string, CompletionDecision>,
): { completed: number; required: number; percent: number } {
  let required = 0
  let completed = 0
  for (const a of activities) {
    if (!a.isRequired) continue
    required += 1
    if (decisions.get(a.id)?.done) completed += 1
  }
  const percent = required ? Math.round((completed / required) * 100) : 0
  return { completed, required, percent }
}