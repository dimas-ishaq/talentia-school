const ACTIVITY_PATH: Record<string, (c: string, a: string) => string> = {
  text: (c, a) => `/dashboard/courses/${c}/read/${a}`,
  quiz: (c, a) => `/dashboard/courses/${c}/quizzes/${a}`,
  forum: (c, a) => `/dashboard/courses/${c}/forum/${a}`,
}

function activityUrl(type: string | undefined, courseId: string, activityId: string) {
  if (type && ACTIVITY_PATH[type]) return ACTIVITY_PATH[type]!(courseId, activityId)
  return `/dashboard/courses/${courseId}/activity/${activityId}`
}

export function useCourseBreadcrumb(options: {
  courseId: MaybeRefOrGetter<string>
  activityId?: MaybeRefOrGetter<string | undefined>
  course?: MaybeRefOrGetter<any>
  leaf?: MaybeRefOrGetter<{ label: string; to?: string } | undefined>
}) {
  const route = useRoute()
  const id = computed(() => toValue(options.courseId))

  let courseRef: ComputedRef<any>
  if (options.course) {
    courseRef = computed(() => toValue(options.course))
  } else {
    const { data } = useFetch<any>(() => `/api/courses/${id.value}`, { key: `course-breadcrumb-${id.value}` })
    courseRef = computed(() => (data as any).value?.data)
  }

  const items = computed(() => {
    const list: { label: string; to?: string }[] = [
      { label: 'Courses', to: '/dashboard/courses' },
      { label: (courseRef.value?.name as string) || 'Course', to: `/dashboard/courses/${id.value}` },
    ]

    const activityId = toValue(options.activityId) as string | undefined
    const activity = activityId
      ? courseRef.value?.sections?.flatMap((s: any) => s.activities ?? []).find((a: any) => a.id === activityId)
      : null

    if (activityId && activity) {
      const section = courseRef.value?.sections?.find((s: any) => s.activities?.some((a: any) => a.id === activityId))
      if (section) list.push({ label: section.title as string })
      const url = activityUrl(activity.type as string | undefined, id.value, activityId)
      const isCurrent = route.path === url
      list.push({ label: activity.title as string, ...(isCurrent ? {} : { to: url }) })
    } else if (activityId) {
      // activity belum ter-load (mis. quiz take / manual fetch) — tetap tampilkan id sebagai fallback
      list.push({ label: activityId })
    }

    const leaf = toValue(options.leaf) as { label: string; to?: string } | undefined
    if (leaf) {
      // hindari duplikat bila leaf == activity
      const last = list[list.length - 1]
      if (!last || last.label !== leaf.label) list.push(leaf)
    }
    return list
  })

  return { items, course: courseRef }
}
