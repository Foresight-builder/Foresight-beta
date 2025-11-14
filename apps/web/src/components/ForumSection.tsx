"use client";
import React, { useEffect, useMemo, useState } from 'react'
import { useWallet } from '@/contexts/WalletContext'
import Button from '@/components/ui/Button'

interface ForumSectionProps { eventId: number }

interface ThreadView {
  id: number
  event_id: number
  title: string
  content: string
  user_id: string
  created_at: string
  upvotes: number
  downvotes: number
  comments?: CommentView[]
}

interface CommentView {
  id: number
  thread_id: number
  event_id: number
  user_id: string
  content: string
  created_at: string
  upvotes: number
  downvotes: number
  parent_id?: number | null
}

export default function ForumSection({ eventId }: ForumSectionProps) {
const { account, connectWallet, formatAddress, siweLogin, requestWalletPermissions, multisigSign } = useWallet()
  const [threads, setThreads] = useState<ThreadView[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [posting, setPosting] = useState(false)
  const [nameMap, setNameMap] = useState<Record<string, string>>({})
  const displayName = (addr: string) => {
    const key = String(addr || '').toLowerCase()
    return nameMap[key] || formatAddress(addr)
  }
  const [userVotes, setUserVotes] = useState<Set<string>>(new Set())
  const [userVoteTypes, setUserVoteTypes] = useState<Record<string, 'up'|'down'>>({})

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/forum?eventId=${eventId}`)
      const data = await res.json()
      setThreads(Array.isArray(data?.threads) ? data.threads : [])
    } catch (e: any) {
      setError(e?.message || '加载失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [eventId])

  useEffect(() => {
    const fetchVotes = async () => {
      try {
        if (!account) { setUserVotes(new Set()); return }
        const res = await fetch(`/api/forum/user-votes?eventId=${eventId}`)
        const j = await res.json()
        const set = new Set<string>()
        const types: Record<string, 'up'|'down'> = {}
        ;(Array.isArray(j?.votes) ? j.votes : []).forEach((v: any) => {
          const key = `${String(v.content_type)}:${String(v.content_id)}`
          set.add(key)
          const vt = String(v.vote_type) === 'down' ? 'down' : 'up'
          types[key] = vt
        })
        setUserVotes(set)
        setUserVoteTypes(types)
      } catch {}
    }
    fetchVotes()
  }, [eventId, account])

  useEffect(() => {
    try {
      const addrs = new Set<string>()
      threads.forEach(t => { if (t.user_id) addrs.add(String(t.user_id).toLowerCase()); (t.comments || []).forEach(c => { if (c.user_id) addrs.add(String(c.user_id).toLowerCase()) }) })
      if (account) addrs.add(String(account).toLowerCase())
      const unknown = Array.from(addrs).filter(a => !nameMap[a])
      if (unknown.length === 0) return
      fetch(`/api/user-profiles?addresses=${encodeURIComponent(unknown.join(','))}`)
        .then(r => r.json())
        .then(data => {
          const arr = Array.isArray(data?.profiles) ? data.profiles : []
          const next: Record<string, string> = {}
          arr.forEach((p: any) => { if (p?.wallet_address && p?.username) next[String(p.wallet_address).toLowerCase()] = String(p.username) })
          if (Object.keys(next).length > 0) setNameMap(prev => ({ ...prev, ...next }))
        }).catch(() => {})
    } catch {}
  }, [threads, account])

  const postThread = async () => {
    if (!account) { setError('请先连接钱包'); return }
    if (!title.trim() || !content.trim()) return
    setPosting(true)
    setError(null)
    try {
      const res = await fetch('/api/forum', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId, title, content, walletAddress: account })
      })
      if (!res.ok) throw new Error(await res.text())
      setTitle(''); setContent('')
      await load()
    } catch (e: any) { setError(e?.message || '创建失败') } finally { setPosting(false) }
  }

  const postComment = async (threadId: number, text: string, parentId?: number | null) => {
    if (!account) { setError('请先连接钱包'); return }
    if (!text.trim()) return
    try {
      const res = await fetch('/api/forum/comments', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId, threadId, content: text, walletAddress: account, parentId })
      })
      if (!res.ok) throw new Error(await res.text())
      await load()
    } catch (e: any) { setError(e?.message || '评论失败') }
  }

  const vote = async (type: 'thread'|'comment', id: number, dir: 'up'|'down') => {
    try {
      if (!account) { setError('请先连接钱包再投票'); return }
      const key = `${type}:${id}`
      if (userVotes.has(key)) { setError('您已经投过票了'); return }
      const res = await fetch('/api/forum/vote', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type, id, dir }) })
      if (!res.ok) {
        const t = await res.text()
        throw new Error(t || '投票失败')
      }
      setUserVotes(prev => new Set([...prev, key]))
      setUserVoteTypes(prev => ({ ...prev, [key]: dir }))
      await load()
    } catch (e: any) { setError(e?.message || '投票失败') }
  }

  // 将评论按 parent_id 构建简单树
  const buildTree = (comments: CommentView[] = []) => {
    const byParent: Record<string, CommentView[]> = {}
    comments.forEach(c => {
      const key = String(c.parent_id ?? 'root')
      if (!byParent[key]) byParent[key] = []
      byParent[key].push(c)
    })
    const renderBranch = (parentId: number | null, depth = 0): React.ReactNode[] => {
      const key = String(parentId ?? 'root')
      const nodes = byParent[key] || []
      return nodes.flatMap(node => [
        <div key={node.id} className="mt-3 pl-0" style={{ marginLeft: depth * 16 }}>
          <div className="text-sm text-gray-800">
            <span className="text-purple-700 font-medium mr-2">{displayName(node.user_id)}</span>
            <span className="text-gray-400">{new Date(node.created_at).toLocaleString()}</span>
          </div>
          <div className="mt-1 text-gray-700 break-words">{node.content}</div>
          <div className="mt-1 flex items-center gap-3 text-xs text-gray-500">
            <button onClick={() => vote('comment', node.id, 'up')} disabled={userVotes.has(`comment:${node.id}`)} className="inline-flex items-center px-2 py-1 rounded-full bg-gradient-to-r from-pink-500 to-purple-600 text-white disabled:opacity-50">▲ {node.upvotes}</button>
            {account && <ReplyBox onSubmit={(text) => postComment(node.thread_id, text, node.id)} />}
          </div>
        </div>,
        ...renderBranch(node.id, depth + 1)
      ])
    }
    return renderBranch(null, 0)
  }

  return (
    <div className="rounded-2xl border border-pink-200/60 bg-white/70 backdrop-blur overflow-hidden">
      <div className="px-4 py-3 flex items-center justify-between">
        <div className="font-semibold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">社区讨论</div>
      </div>

      <div className="p-4 space-y-6">
        {/* 新建主题 */}
        <div className="bg-white/80 rounded-xl border border-pink-200/60 p-4">
          {!account ? (
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600">发帖需连接钱包</div>
              <Button size="sm" variant="cta" onClick={async () => { await connectWallet(); await requestWalletPermissions(); await siweLogin(); await multisigSign(); }}>连接并签名</Button>
            </div>
          ) : (
            <div className="space-y-2">
              <input value={title} onChange={e => setTitle(e.target.value)} placeholder="主题标题"
                     className="w-full px-3 py-2 border border-pink-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-400 bg-white/80 text-gray-800" />
              <textarea value={content} onChange={e => setContent(e.target.value)} placeholder="详细内容"
                        className="w-full px-3 py-2 border border-pink-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-400 bg-white/80 min-h-[80px] text-gray-800" />
              <div className="flex justify-end">
                <Button onClick={postThread} disabled={posting} size="md" variant="cta">
                  {posting ? '发布中…' : '发布主题'}
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* 主题列表 */}
        <div className="space-y-4">
          {loading && <div className="text-sm text-gray-500">加载中…</div>}
          {!loading && threads.length === 0 && <div className="text-sm text-gray-500">暂无主题</div>}
          {threads.map(t => (
            <div key={t.id} className="bg-white/80 rounded-xl border border-purple-200/60 p-4">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-lg font-semibold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">{t.title}</div>
                  <div className="text-sm text-gray-600 mt-1">{t.content}</div>
                  <div className="text-xs text-gray-400 mt-1">由 <span className="text-purple-700 font-medium">{displayName(t.user_id)}</span> 在 {new Date(t.created_at).toLocaleString()} 发布</div>
                </div>
                <div className="flex items-center gap-3 text-sm text-gray-600">
                  <Button size="sm" variant="cta" className="bg-gradient-to-r from-pink-500 to-purple-600 text-white" onClick={() => vote('thread', t.id, 'up')} disabled={userVotes.has(`thread:${t.id}`)}>▲ {t.upvotes}</Button>
                  <Button size="sm" variant="cta" className="bg-gradient-to-r from-rose-500 to-pink-600 text-white" onClick={() => vote('thread', t.id, 'down')} disabled={userVotes.has(`thread:${t.id}`)}>▼ {t.downvotes}</Button>
                  {userVotes.has(`thread:${t.id}`) && (
                    <span className={`text-xs px-2 py-0.5 rounded-full ${userVoteTypes[`thread:${t.id}`] === 'down' ? 'bg-rose-100 text-rose-700' : 'bg-purple-100 text-purple-700'}`}>
                      {userVoteTypes[`thread:${t.id}`] === 'down' ? '已踩' : '已赞'}
                    </span>
                  )}
                </div>
              </div>

              {/* 评论区 */}
              <div className="mt-3">
                <div className="text-sm font-medium text-purple-700">评论</div>
                <div className="mt-2">
                  {buildTree(t.comments || [])}
                </div>
                {account && (
                  <div className="mt-2">
                    <ReplyBox onSubmit={(text) => postComment(t.id, text)} />
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {error && <div className="text-xs text-red-600">{error}</div>}
      </div>
    </div>
  )
}

function ReplyBox({ onSubmit }: { onSubmit: (text: string) => void }) {
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const submit = async () => {
    if (!text.trim()) return
    setSending(true)
    try { await onSubmit(text); setText('') } finally { setSending(false) }
  }
  return (
    <div className="flex items-center gap-2">
      <input value={text} onChange={e => setText(e.target.value)} placeholder="写下评论…"
             className="flex-1 px-3 py-2 border border-pink-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-400 bg-white/80 text-gray-800" />
      <Button onClick={submit} disabled={sending} size="sm" variant="primary">{sending ? '发送中…' : '评论'}</Button>
    </div>
  )
}
