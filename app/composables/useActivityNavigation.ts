export type ActivityNavItem = { id: string; title: string; type: string; path: string }

export function useActivityNavigation(
  course: MaybeRefOrGetter<any>,
  activityId: MaybeRefOrGetter<string>,
  isStudent: MaybeRefOrGetter<boolean>,
) {
  const route = useRoute()
  const courseId = computed(() => String(route.params.id))
  const { returnTo } = useCourseReturn(() => `/dashboard/courses/${courseId.value}`)

  function pathFor(activity: any) {
    const base = `/dashboard/courses/${courseId.value}`
    if (activity.type === 'text') return `${base}/read/${activity.id}`
    if (['link', 'file', 'video', 'presentation'].includes(activity.type)) return `${base}/activity/${activity.id}`
    if (activity.type === 'quiz') return `${base}/quizzes/${activity.id}/${toValue(isStudent) ? 'take' : ''}`.replace(/\/$/, '')
    if (activity.type === 'forum') return `${base}/forum/${activity.id}`
    return `${base}/activity/${activity.id}`
  }

  const items = computed<ActivityNavItem[]>(() => (toValue(course)?.sections ?? []).flatMap((section: any) =>
    (section.activities ?? []).filter((activity: any) => activity.isVisible !== false || !toValue(isStudent)).map((activity: any) => ({
      id: activity.id,
      title: activity.title,
      type: activity.type,
      path: pathFor(activity),
    })),
  ))
  const index = computed(() => items.value.findIndex((item) => item.id === toValue(activityId)))
  const previous = computed(() => index.value > 0 ? items.value[index.value - 1] : null)
  const next = computed(() => index.value >= 0 && index.value < items.value.length - 1 ? items.value[index.value + 1] : null)

  function link(item: ActivityNavItem | null) {
    return item ? { path: item.path, query: { returnTo: route.fullPath } } : undefined
  }

  return { previous, next, link, returnTo }
}
