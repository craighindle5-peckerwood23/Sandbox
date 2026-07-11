import type { NextApiRequest, NextApiResponse } from 'next'

type ChatResponse = {
  message: string
  error?: string
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ChatResponse>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: '', error: 'Method not allowed' })
  }

  const { message } = req.body as { message: string }

  if (!message || typeof message !== 'string') {
    return res.status(400).json({ message: '', error: 'Message is required' })
  }

  // TODO: wire up to your AI provider (OpenAI, etc.)
  return res.status(200).json({ message: `Echo: ${message}` })
}
