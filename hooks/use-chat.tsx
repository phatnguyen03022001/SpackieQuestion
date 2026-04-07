import { useState, useEffect, useCallback, useRef } from "react";
import { getPusherClient } from "@/lib/client";

export function useChat(currentUser: any, roomId: string) {
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const loadingMoreRef = useRef(false);

  const loadMessages = useCallback(
    async (cursor?: string, isLoadMore = false) => {
      if (!currentUser?._id || !roomId) return;
      if (isLoadMore && (loadingMoreRef.current || !hasMore)) return;

      const setter = isLoadMore ? setLoadingMore : setLoading;
      if (isLoadMore) loadingMoreRef.current = true;
      setter(true);

      try {
        const url = `/api/messages?roomId=${roomId}&isAdmin=${currentUser.isAdmin}&limit=10${cursor ? `&cursor=${cursor}` : ""}`;
        const res = await fetch(url);
        const data = await res.json();

        if (isLoadMore) {
          setMessages((prev) => [...data.messages, ...prev]);
        } else {
          setMessages(data.messages || []);
        }
        setHasMore(data.hasMore ?? false);
        setNextCursor(data.nextCursor ?? null);
      } catch (error) {
        console.error("Load messages error:", error);
        if (!isLoadMore) setMessages([]);
      } finally {
        setter(false);
        if (isLoadMore) loadingMoreRef.current = false;
      }
    },
    [currentUser?._id, currentUser?.isAdmin, roomId, hasMore],
  );

  useEffect(() => {
    loadMessages();
    const pusher = getPusherClient();
    const channel = pusher.subscribe(`chat-${roomId}`);
    console.log("Subscribed to channel:", `chat-${roomId}`);

    channel.bind("new-message", (data: any) => {
      setMessages((prev) => (prev.find((m) => m._id === data._id) ? prev : [...prev, data]));
    });
    channel.bind("message-deleted", (data: { messageId: string }) => {
      setMessages((prev) =>
        prev.map((msg) => {
          if (msg._id !== data.messageId) return msg;
          const updated = { ...msg, deleted: true, isDeleted: true };
          if (!currentUser.isAdmin) {
            updated.text = "[Tin nhắn đã bị gỡ]";
            updated.imageUrl = null;
          }
          return updated;
        }),
      );
    });
    channel.bind("messages-seen", (data: { roomId: string; userId: string }) => {
      console.log("🔔 messages-seen event", data);
      setMessages((prev) =>
        prev.map((msg) => {
          if (msg.userId !== data.userId && !msg.seenBy?.includes(data.userId)) {
            return { ...msg, seenBy: [...(msg.seenBy || []), data.userId] };
          }
          return msg;
        }),
      );
    });

    return () => {
      channel.unbind_all();
      pusher.unsubscribe(`chat-${roomId}`);
    };
  }, [currentUser?._id, currentUser?.isAdmin, roomId]);

  const loadMoreOlder = useCallback(async () => {
    if (!hasMore || loadingMoreRef.current || !nextCursor) return;
    await loadMessages(nextCursor, true);
  }, [hasMore, nextCursor, loadMessages]);

  return { messages, loading, loadingMore, hasMore, loadMoreOlder, setMessages };
}
