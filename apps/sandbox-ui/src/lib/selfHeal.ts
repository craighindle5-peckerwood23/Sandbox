/**
 * selfHeal.ts
 * Lightweight self-healing layer for the CodeForge sandbox-ui.
 *
 * Responsibilities:
 *  1. Retry failed backend calls with exponential back-off
 *  2. Circuit-breaker: open after N consecutive failures, half-open after cooldown
 *  3. Health-check: ping the four backend functions and report status
 *  4. Structured error logging (console-based; swap for a real sink later)
 */

export type ServiceName = 'listRepoFiles' | 'getFileContent' | 'codegenChat' | 'pushToRepo'

interface CircuitState {
  failures: number
  lastFailure: number | null
  open: boolean
}

const FAILURE_THRESHOLD = 3          // trips the breaker
const COOLDOWN_MS       = 30_000     // 30 s before half-open retry
const MAX_RETRIES       = 3
const BASE_DELAY_MS     = 500

const circuits: Record<ServiceName, CircuitState> = {
  listRepoFiles:  { failures: 0, lastFailure: null, open: false },
  getFileContent: { failures: 0, lastFailure: null, open: false },
  codegenChat:    { failures: 0, lastFailure: null, open: false },
  pushToRepo:     { failures: 0, lastFailure: null, open: false },
}

function log(level: 'info' | 'warn' | 'error', service: ServiceName, msg: string, meta?: object) {
  const entry = { ts: new Date().toISOString(), level, service, msg, ...meta }
  if (level === 'error') console.error('[selfHeal]', entry)
  else if (level === 'warn')  console.warn('[selfHeal]', entry)
  else                        console.info('[selfHeal]', entry)
}

function sleep(ms: number) {
  return new Promise<void>(res => setTimeout(res, ms))
}

function isCircuitOpen(name: ServiceName): boolean {
  const c = circuits[name]
  if (!c.open) return false
  // half-open check: cooldown elapsed?
  if (c.lastFailure && Date.now() - c.lastFailure > COOLDOWN_MS) {
    c.open = false
    c.failures = 0
    log('info', name, 'Circuit half-open — allowing probe request')
    return false
  }
  return true
}

function recordSuccess(name: ServiceName) {
  circuits[name].failures = 0
  circuits[name].open = false
}

function recordFailure(name: ServiceName) {
  const c = circuits[name]
  c.failures += 1
  c.lastFailure = Date.now()
  if (c.failures >= FAILURE_THRESHOLD) {
    c.open = true
    log('error', name, `Circuit OPEN after ${c.failures} consecutive failures`)
  }
}

/** Retry a fetch-like async fn with exponential back-off + circuit breaker */
export async function resilientCall<T>(
  name: ServiceName,
  fn: () => Promise<T>,
): Promise<T> {
  if (isCircuitOpen(name)) {
    throw new Error(`[selfHeal] Circuit open for ${name} — backing off`)
  }

  let lastErr: unknown
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const result = await fn()
      recordSuccess(name)
      if (attempt > 1) log('info', name, `Recovered on attempt ${attempt}`)
      return result
    } catch (err) {
      lastErr = err
      log('warn', name, `Attempt ${attempt}/${MAX_RETRIES} failed`, { err: String(err) })
      if (attempt < MAX_RETRIES) await sleep(BASE_DELAY_MS * 2 ** (attempt - 1))
    }
  }

  recordFailure(name)
  throw lastErr
}

/** Health-check all four backend services */
export async function healthCheck(baseUrl: string): Promise<Record<ServiceName, 'ok' | 'degraded'>> {
  const results = {} as Record<ServiceName, 'ok' | 'degraded'>

  const checks: Array<{ name: ServiceName; url: string; method: string }> = [
    { name: 'listRepoFiles',  url: `${baseUrl}/api/health/listRepoFiles`,  method: 'GET' },
    { name: 'getFileContent', url: `${baseUrl}/api/health/getFileContent`, method: 'GET' },
    { name: 'codegenChat',    url: `${baseUrl}/api/health/codegenChat`,    method: 'GET' },
    { name: 'pushToRepo',     url: `${baseUrl}/api/health/pushToRepo`,     method: 'GET' },
  ]

  await Promise.all(checks.map(async ({ name, url, method }) => {
    try {
      const r = await fetch(url, { method })
      results[name] = r.ok ? 'ok' : 'degraded'
    } catch {
      results[name] = 'degraded'
    }
  }))

  return results
}

/** Expose circuit state for dashboards / tests */
export function getCircuitStates(): Record<ServiceName, CircuitState> {
  return { ...circuits }
}

/** Reset all circuits — use in tests or after a deploy */
export function resetCircuits() {
  for (const name of Object.keys(circuits) as ServiceName[]) {
    circuits[name] = { failures: 0, lastFailure: null, open: false }
  }
}
