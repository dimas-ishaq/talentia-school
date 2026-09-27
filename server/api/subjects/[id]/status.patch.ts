import { subjects } from '~~/server/database/schema'
import { createActiveStatusHandler } from '~~/server/utils/activeStatus'

export default createActiveStatusHandler(subjects, 'Mata pelajaran')
