import { students } from '~~/server/database/schema'
import { createActiveStatusHandler } from '~~/server/utils/activeStatus'

export default createActiveStatusHandler(students, 'Siswa')
