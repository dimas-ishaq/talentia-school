import { teachers } from '~~/server/database/schema'
import { createActiveStatusHandler } from '~~/server/utils/activeStatus'

export default createActiveStatusHandler(teachers, 'Guru')
