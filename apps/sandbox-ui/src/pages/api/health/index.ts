/**
 * GET /api/health
 * Returns the status of all four backend functions.
 * Used by selfHeal.ts and external monitors.
 */
import type { NextApiRequest, NextApiResponse } from 'next'

const BACKEND_API_URL = process.env.BACKEND_API_URL ?? ''

const services = ['listRepoFiles', 'getFileContent', 'codegenChat', 'pushToRepo'] as const
type Service = (typeof services)[number]

export default async function handler(_req: NextApiRequest, res: NextApiResponse) {
  const results: Record<Service, 'ok' | 'degraded' | 'unconfigured'> = {} as never

  if (!BACKEND_API_URL) {
    for (const s of services) results[s] = 'unconfigured'
    return res.status(200).json({ status: 'degraded', services: results })
  }

  await Promise.all(
    services.map(async (name) => {
      try {
        const r = await fetch(`${BACKEND_API_URL}/${name}`, {
          method: 'GET',
          signal: AbortSignal.timeout(5000),
        })
        results[name] = r.ok ? 'ok' : 'degraded'
      } catch {
        results[name] = 'degraded'
      }
    })
  )

  const allOk = Object.values(results).every(v => v === 'ok')
  return res.status(200).json({ status: allOk ? 'healthy' : 'degraded', services: results })
}
