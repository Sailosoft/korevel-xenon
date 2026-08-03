// BSChat.List — Chat history list for the chat home page.
//
// Shows all chats with the ability to open one or start a new chat.

"use client";

import React, { useCallback } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { useRouter } from "next/navigation";
import { MessageSquare, Plus, Trash2, Rabbit } from "lucide-react";
import { bsDB } from "../../BSDatabase";
import type { BSChat } from "./BSChat.Types";

export interface BSChatListProps {
  /** Optional agent pool filter */
  agentPoolId?: string;
}

export function BSChatList({ agentPoolId }: BSChatListProps) {
  const router = useRouter();

  const chats = useLiveQuery<BSChat[]>(async () => {
    const list = await bsDB.chatsRepo.query.getAll({
      page: 0,
      pageSize: 0,
    });
    const data: BSChat[] = list.data;
    return data.sort((a, b) => b.createdDate.localeCompare(a.createdDate));
  }, [agentPoolId]);

  const handleNewChat = useCallback(async () => {
    const created = await bsDB.chatsRepo.createChat(
      agentPoolId ? { agentPoolId } : {},
    );
    router.push(`/modules/bunny-studio/chat/${created.id}`);
  }, [router, agentPoolId]);

  const handleDelete = useCallback(
    async (e: React.MouseEvent, id: string) => {
      e.stopPropagation();
      await bsDB.conversations.where("chatId").equals(id).delete();
      await bsDB.chatsRepo.delete(id);
    },
    [],
  );

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-4xl mx-auto px-4 py-6 space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Chats</h1>
            <p className="text-gray-500 mt-1">
              {agentPoolId ? "Chats in this agent pool." : "Your conversation history."}
            </p>
          </div>
          <button
            onClick={handleNewChat}
            className="flex items-center gap-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg px-4 py-2 text-sm font-medium transition"
          >
            <Plus className="w-4 h-4" /> New Chat
          </button>
        </div>

        {!chats || chats.length === 0 ? (
          <div className="bg-white border border-dashed border-gray-300 rounded-2xl py-16 text-center text-sm text-gray-400">
            <Rabbit className="w-10 h-10 mx-auto mb-3 text-gray-300" />
            No chats yet. Start a new conversation.
          </div>
        ) : (
          <div className="space-y-2">
            {chats.map((chat) => (
              <button
                key={chat.id}
                onClick={() =>
                  router.push(`/modules/bunny-studio/chat/${chat.id}`)
                }
                className="w-full flex items-center gap-3 bg-white border border-gray-200 rounded-2xl px-4 py-3 text-left shadow-sm hover:shadow-md hover:border-red-300 transition"
              >
                <div className="w-8 h-8 rounded-lg bg-gray-100 text-gray-500 flex items-center justify-center shrink-0">
                  <MessageSquare className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-gray-800 text-sm truncate">
                    {chat.title}
                  </div>
                  <div className="text-[11px] text-gray-400">
                    {new Date(chat.createdDate).toLocaleString()}
                    {chat.provider ? ` · ${chat.provider}` : ""}
                  </div>
                </div>
                <button
                  onClick={(e) => handleDelete(e, chat.id)}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition shrink-0"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default BSChatList;
