export function useCourseReturn(fallback: MaybeRefOrGetter<string>) {
  const route = useRoute()
  const returnTo = computed(() => {
    const value = route.query.returnTo
    return typeof value === 'string' && value.startsWith('/dashboard/courses/') ? value : toValue(fallback)
  })

  function withReturnTo(path: string) {
    return { path, query: { returnTo: route.fullPath } }
  }

  return { returnTo, withReturnTo }
}
