// BSChatHistory.FavoriteNotice — dialog body shown when the user tries to
// delete a chat that is saved in Chat Favorites (feature: Chat Favorites).
//
// Favorited chats are protected from deletion (Option 1). This notice explains
// why the delete is blocked and offers to remove the chat from Favorites so the
// user can delete it afterwards.

"use client";

import { Button } from "@heroui/react";
import { Star } from "lucide-react";
import { bsDB } from "../../BSDatabase";
import type { BSChat } from "../chat/BSChat.Types";

export interface BSChatHistoryFavoriteNoticeProps {
  /** The chat the user tried to delete. */
  chat: BSChat;
  /** Close the dialog without making any changes. */
  onClose: () => void;
  /**
   * Removes the chat from Favorites, then closes the dialog. The caller is
   * responsible for refreshing the table so the favorite marker updates.
   */
  onRemove: () => void;
}

export function BSChatHistoryFavoriteNotice({
  chat,
  onClose,
  onRemove,
}: BSChatHistoryFavoriteNoticeProps) {
  const handleRemove = async () => {
    await bsDB.chatFavoritesRepo.removeForChat(chat.id);
    onRemove();
  };

  return (
    <div className="space-y-4">
      {/* Chat summary */}
      <div className="flex items-start gap-2.5 rounded-xl bg-amber-50 border border-amber-100 px-3 py-2.5">
        <Star className="w-4 h-4 mt-0.5 text-amber-500 fill-amber-400 shrink-0" />
        <div className="min-w-0">
          <p className="text-sm font-semibold text-gray-800 truncate">
            {chat.title}
          </p>
          <p className="text-xs text-gray-500">This chat is saved to Favorites.</p>
        </div>
      </div>

      <p className="text-sm text-gray-600">
        Chats saved to Favorites are protected from deletion in Chat History.
        Remove the chat from Favorites first if you still want to delete it.
      </p>

      {/* Actions */}
      <div className="flex items-center justify-end gap-2 pt-1">
        <Button type="button" size="sm" variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button
          type="button"
          size="sm"
          variant="primary"
          onClick={() => void handleRemove()}
        >
          Remove from Favorites
        </Button>
      </div>
    </div>
  );
}
