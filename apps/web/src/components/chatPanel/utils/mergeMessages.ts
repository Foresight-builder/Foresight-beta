import type { ChatMessageView } from "../types";

export function mergeMessages(messages: ChatMessageView[], forumMessages: ChatMessageView[]) {
  const all = [...messages, ...forumMessages];
  const byId: Record<string, ChatMessageView> = {};
  
  all.forEach((m) => {
    // 深度集成后，直接使用数据库返回的字段
    // 同时保留对旧版本“协议式”消息的兼容处理
    let processed = { ...m };
    
    if (!processed.reply_to_id) {
      const replyMatch = m.content.match(/^\[reply:([^:]+):([^:]+):([^\]]+)\]\s?(.*)/s);
      if (replyMatch) {
        processed.reply_to_id = replyMatch[1];
        processed.reply_to_user = replyMatch[2];
        processed.reply_to_content = replyMatch[3];
        processed.content = replyMatch[4];
      }
    }
    
    byId[m.id] = processed;
  });
  
  const arr = Object.values(byId);
  arr.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  return arr;
}
