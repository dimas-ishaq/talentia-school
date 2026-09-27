import { setActiveTimeFormat, setActiveTimezone } from '~/utils/datetime'

// Muat zona waktu regional sekolah sekali, dipakai oleh semua
// konversi/tampilan tanggal-jam (baik saat SSR maupun di klien).
export default defineNuxtPlugin(async () => {
  try {
    const result = await $fetch<{ data?: { timezone?: string; timeFormat?: string } }>('/api/settings/timezone')
    setActiveTimezone(result.data?.timezone)
    setActiveTimeFormat(result.data?.timeFormat)
  } catch {
    setActiveTimezone(undefined)
  }
})
