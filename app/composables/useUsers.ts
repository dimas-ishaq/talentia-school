export type UserRole = 'admin' | 'org_admin' | 'owner' | 'teacher' | 'student' | 'parent'
export type UserRow = { id: string; email: string; name: string; role: UserRole; createdAt?: string | Date | null }
type UserResponse = { data: UserRow[]; meta: { page: number; perPage: number; total: number; totalPages: number } }

export function useUsers() {
  const page = ref(1)
  const perPage = 10
  const search = ref('')
  const role = ref<'' | UserRole>('')
  const { data, pending, error, refresh } = useFetch<UserResponse>('/api/users', {
    query: { page, perPage, search, role },
    watch: [page, search, role],
  })

  watch([search, role], () => { page.value = 1 })

  return {
    page, search, role, users: computed(() => data.value?.data ?? []),
    meta: computed(() => data.value?.meta), pending, error, refresh,
  }
}
