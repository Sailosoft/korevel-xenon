"use client";

import React from "react";
import { useParams } from "next/navigation";
import { BSChatComponent } from "@/src/modules/bunny-studio/src/modules/chat/BSChat.Component";

export default function BunnyStudioChatDetailRoute() {
  const params = useParams<{ id: string }>();
  return <BSChatComponent chatId={params.id} />;
}
