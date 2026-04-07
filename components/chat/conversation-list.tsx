"use client";

import { useEffect, useState } from "react";
import { getPusherClient } from "@/lib/client";
import { MessageCircle } from "lucide-react";

export function ConversationList({
  userId,
  onSelectRoom,
  selectedRoomId,
}: {
  userId: string;
  onSelectRoom: (roomId: string, otherUser: any) => void;
  selectedRoomId?: string;
}) {
  const [rooms, setRooms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRooms = async () => {
    try {
      const res = await fetch("/api/rooms");
      const data = await res.json();
      setRooms(data);
    } catch (err) {
      console.error("Failed to fetch rooms", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRooms();

    const pusher = getPusherClient();
    const channel = pusher.subscribe(`user-${userId}`);
    channel.bind("rooms-updated", () => {
      fetchRooms(); // refresh khi có tin nhắn mới
    });
    return () => {
      channel.unbind_all();
      pusher.unsubscribe(`user-${userId}`);
    };
  }, [userId]);

  // Tự động chọn room đầu tiên khi có danh sách và chưa có room nào được chọn
  useEffect(() => {
    if (!loading && rooms.length > 0 && !selectedRoomId) {
      const firstRoom = rooms[0];
      onSelectRoom(firstRoom.roomId, firstRoom.otherUser);
    }
  }, [loading, rooms, selectedRoomId, onSelectRoom]);

  if (loading) return <div className="p-2 text-sm">Đang tải...</div>;

  return (
    <div className="flex flex-col h-full">
      <div className="p-2 font-bold border-b">Tin nhắn</div>
      <div className="flex-1 overflow-auto">
        {rooms.length === 0 && <div className="p-2 text-gray-400 text-sm">Chưa có cuộc trò chuyện</div>}
        {rooms.map((room: any) => (
          <div
            key={room.roomId}
            onClick={() => onSelectRoom(room.roomId, room.otherUser)}
            className={`p-2 hover:bg-gray-100 cursor-pointer border-b flex items-center gap-2 ${
              selectedRoomId === room.roomId ? "bg-blue-50" : ""
            }`}>
            <MessageCircle className="w-4 h-4" />
            <span className="text-sm">{room.otherUser?.username || "Unknown"}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
