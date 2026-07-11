'use client'
import React, { useState, useRef, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark } from 'react-syntax-highlighter/dist/cjs/styles/prism'
import styles from './ChatBox.module.css'

type Message = { role: 'user' | 'assistant'; content: string }
type CodeBlock = { path: string; language: string; content: string }

export default function ChatBox() {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: '## ⚡ CodeForge ready.\n\nDescribe what you want to build and I will generate the code for **microfyxd-site**. Once you approve, I will open a PR automatically.' }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [pendingFiles, setPendingFiles] = useState<CodeBlock[]>([])
  const [pushing, setPushing] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = async () => {
    if (!input.trim() || loading) return
    const userMsg: Message = { role: 'user', content: input.trim() }
    const newMessages = [...messages, userMsg]
    setMessages(newMessages)
    setInput('')
    setLoading(true)

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages }),
      })
      const data = await res.json() as { reply: string; codeBlocks: CodeBlock[]; error?: string }
      if (!res.ok) throw new Error(data.error ?? 'Request failed')
      setMessages(prev => [...prev, { role: 'assistant', content: data.reply }])
      if (data.codeBlocks?.length > 0) setPendingFiles(data.codeBlocks)
    } catch (err) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `**Error:** ${err instanceof Error ? err.message : 'Something went wrong'}`
      }])
    } finally {
      setLoading(false)
    }
  }

  const pushToRepo = async () => {
    if (!pendingFiles.length || pushing) return
    setPushing(true)
    const branchName = `forge/${Date.now()}-codegen`
    const prTitle = `feat: CodeForge generated ${pendingFiles.length} file(s)`
    const prBody = `## CodeForge Auto-PR\n\n**Files changed:**\n${pendingFiles.map(f => `- \`${f.path}\``).join('\n')}\n\n*Generated via CodeForge sandbox chatbot.*`

    try {
      const res = await fetch('/api/push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ branchName, files: pendingFiles, prTitle, prBody }),
      })
      const data = await res.json() as { pr_url?: string; error?: string }
      if (!res.ok) throw new Error(data.error ?? 'Push failed')
      setPendingFiles([])
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `✅ **PR opened successfully!**\n\n[View PR on GitHub](${data.pr_url})\n\`${data.pr_url}\``
      }])
    } catch (err) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `**Push failed:** ${err instanceof Error ? err.message : 'Unknown error'}`
      }])
    } finally {
      setPushing(false)
    }
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <span className={styles.logo}>⚡ CodeForge</span>
        <span className={styles.target}>→ microfyxd-site</span>
      </div>

      <div className={styles.messages}>
        {messages.map((msg, i) => (
          <div key={i} className={`${styles.message} ${styles[msg.role]}`}>
            <span className={styles.role}>{msg.role === 'user' ? '▶ You' : '⚡ CodeForge'}</span>
            <div className={styles.content}>
              <ReactMarkdown
                components={{
                  code({ node, className, children, ...props }: any) {
                    const match = /language-(\w+)/.exec(className || '')
                    const inline = !match
                    return !inline && match ? (
                      <SyntaxHighlighter
                        style={oneDark as any}
                        language={match[1]}
                        PreTag="div"
                        {...props}
                      >
                        {String(children).replace(/\n$/, '')}
                      </SyntaxHighlighter>
                    ) : (
                      <code className={styles.inlineCode} {...props}>{children}</code>
                    )
                  }
                }}
              >
                {msg.content}
              </ReactMarkdown>
            </div>
          </div>
        ))}
        {loading && (
          <div className={`${styles.message} ${styles.assistant}`}>
            <span className={styles.role}>⚡ CodeForge</span>
            <div className={styles.content}><span className={styles.typing}>Generating code...</span></div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {pendingFiles.length > 0 && (
        <div className={styles.pendingPanel}>
          <p className={styles.pendingTitle}>📁 {pendingFiles.length} file(s) ready to push:</p>
          <ul className={styles.fileList}>
            {pendingFiles.map((f, i) => <li key={i}><code>{f.path}</code></li>)}
          </ul>
          <button className={styles.pushButton} onClick={pushToRepo} disabled={pushing}>
            {pushing ? 'Opening PR...' : '🚀 Push to microfyxd-site'}
          </button>
        </div>
      )}

      <div className={styles.inputRow}>
        <input
          className={styles.input}
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && sendMessage()}
          placeholder="Describe what to build for microfyxd-site..."
          disabled={loading}
        />
        <button className={styles.button} onClick={sendMessage} disabled={loading}>
          {loading ? '...' : 'Send'}
        </button>
      </div>
    </div>
  )
}
