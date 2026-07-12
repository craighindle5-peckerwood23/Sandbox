/**
 * selfHeal.test.ts
 * Tests for: resilientCall, circuit-breaker, resetCircuits, getCircuitStates
 */
import { resilientCall, resetCircuits, getCircuitStates } from '../lib/selfHeal'

beforeEach(() => resetCircuits())

// ── resilientCall ────────────────────────────────────────────────────────────

test('resilientCall succeeds on first attempt', async () => {
  const fn = jest.fn().mockResolvedValue('hello')
  const result = await resilientCall('listRepoFiles', fn)
  expect(result).toBe('hello')
  expect(fn).toHaveBeenCalledTimes(1)
})

test('resilientCall retries on transient failure and recovers', async () => {
  const fn = jest.fn()
    .mockRejectedValueOnce(new Error('transient'))
    .mockResolvedValue('recovered')
  const result = await resilientCall('getFileContent', fn)
  expect(result).toBe('recovered')
  expect(fn).toHaveBeenCalledTimes(2)
})

test('resilientCall throws after exhausting retries', async () => {
  const fn = jest.fn().mockRejectedValue(new Error('always fails'))
  await expect(resilientCall('codegenChat', fn)).rejects.toThrow('always fails')
  expect(fn).toHaveBeenCalledTimes(3)
})

// ── Circuit breaker ──────────────────────────────────────────────────────────

test('circuit opens after 3 consecutive failures', async () => {
  const fn = jest.fn().mockRejectedValue(new Error('boom'))

  // 3 calls × 3 retries each = 9 total fn calls → trips the breaker
  for (let i = 0; i < 3; i++) {
    await resilientCall('pushToRepo', fn).catch(() => {})
  }

  const state = getCircuitStates()
  expect(state.pushToRepo.open).toBe(true)
})

test('subsequent call on open circuit throws immediately without calling fn', async () => {
  const fn = jest.fn().mockRejectedValue(new Error('boom'))

  for (let i = 0; i < 3; i++) {
    await resilientCall('listRepoFiles', fn).catch(() => {})
  }

  const guardFn = jest.fn().mockResolvedValue('should not run')
  await expect(resilientCall('listRepoFiles', guardFn)).rejects.toThrow(/Circuit open/)
  expect(guardFn).not.toHaveBeenCalled()
})

// ── Reset ────────────────────────────────────────────────────────────────────

test('resetCircuits clears open circuit', async () => {
  const fn = jest.fn().mockRejectedValue(new Error('boom'))
  for (let i = 0; i < 3; i++) {
    await resilientCall('codegenChat', fn).catch(() => {})
  }
  expect(getCircuitStates().codegenChat.open).toBe(true)

  resetCircuits()
  expect(getCircuitStates().codegenChat.open).toBe(false)
  expect(getCircuitStates().codegenChat.failures).toBe(0)
})
