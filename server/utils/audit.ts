import { auditLogs } from '~~/server/database/schema'
import { db } from '~~/server/utils/db'

export async function writeAuditLog(input: { userId?: string | null; action: string; target?: string; metadata?: unknown }) {
  try {
    await (db as any).insert(auditLogs).values({
      id: crypto.randomUUID(),
      userId: input.userId ?? null,
      action: input.action,
      target: input.target ?? null,
      metadata: input.metadata === undefined ? null : JSON.stringify(input.metadata),
    })
  } catch (error) {
    // Logging must not turn a valid user action into a 500 during migration/outage.
    console.error('[audit]', input.action, error)
  }
}
