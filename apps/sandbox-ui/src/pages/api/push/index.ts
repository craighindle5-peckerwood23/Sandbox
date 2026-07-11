import type { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const apiUrl = process.env.BACKEND_API_URL ?? ''
  if (!apiUrl) return res.status(500).json({ error: 'BACKEND_API_URL not configured' })

  const upstream = await fetch(`${apiUrl}/pushToRepo`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req.body),
  })

  const data = await upstream.json()
  return res.status(upstream.status).json(data)
}
