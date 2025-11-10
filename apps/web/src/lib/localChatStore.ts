import fs from 'fs'
import path from 'path'

export interface ChatMessage {
  id: string
  event_id: number
  user_id: string
  content: string
  created_at: string
}

const DATA_DIR = path.join(process.cwd(), '.data')
const STORE_PATH = path.join(DATA_DIR, 'event_chat_messages.json')

function ensureDir() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true })
    }
  } catch {}
}

async function readFileSafe(file: string): Promise<string | null> {
  try {
    return await fs.promises.readFile(file, 'utf-8')
  } catch {
    return null
  }
}

export async function loadStore(): Promise<ChatMessage[]> {
  ensureDir()
  const content = await readFileSafe(STORE_PATH)
  if (!content) return []
  try {
    const data = JSON.parse(content)
    if (Array.isArray(data)) return data as ChatMessage[]
    return []
  } catch {
    return []
  }
}

export async function saveStore(records: ChatMessage[]): Promise<void> {
  ensureDir()
  const json = JSON.stringify(records, null, 2)
  await fs.promises.writeFile(STORE_PATH, json, 'utf-8')
}

function genId(): string {
  const rnd = Math.random().toString(36).slice(2)
  return `${Date.now()}_${rnd}`
}

export async function addMessage(userId: string, eventId: number, content: string): Promise<ChatMessage> {
  const records = await loadStore()
  const msg: ChatMessage = {
    id: genId(),
    event_id: eventId,
    user_id: userId || 'guest',
    content: String(content || '').slice(0, 2000),
    created_at: new Date().toISOString()
  }
  records.push(msg)
  await saveStore(records)
  return msg
}

export async function getMessagesByEvent(eventId: number, limit = 50, since?: string): Promise<ChatMessage[]> {
  const records = await loadStore()
  let list = records.filter(r => r.event_id === eventId)
  list.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
  if (since) {
    const ts = new Date(since).getTime()
    list = list.filter(r => new Date(r.created_at).getTime() > ts)
  }
  if (limit && limit > 0) {
    list = list.slice(Math.max(0, list.length - limit))
  }
  return list
}