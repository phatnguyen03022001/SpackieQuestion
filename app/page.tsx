"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import ChatContainer from "@/components/chat/chat-container";
import AuthForm from "@/components/auth/auth-form";
import { Button } from "@/components/ui/button";
import { LogOut, MessageCircle, Users, Plus } from "lucide-react";
import { ConversationList } from "@/components/chat/conversation-list";
import { UserSearch } from "@/components/chat/user-search";
import { startTransition } from "react";

export default function HomePage() {
  const router = useRouter();
  // Khởi tạo user từ localStorage ngay lập tức
  const [user, setUser] = useState<any>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("chat-user");
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (!parsed.isAdmin) return parsed;
        } catch (e) {}
      }
    }
    return null;
  });

  const [loading, setLoading] = useState(true);
  const [selectedRoomId, setSelectedRoomId] = useState<string>("");
  const [selectedOtherUser, setSelectedOtherUser] = useState<any>(null);
  const [showSearch, setShowSearch] = useState(false);

  // Effect chỉ để kiểm tra admin và chuyển hướng
  useEffect(() => {
    const stored = localStorage.getItem("chat-user");
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (parsed.isAdmin) {
          router.push("/admin");
          return;
        }
      } catch (e) {}
    }
    setTimeout(() => setLoading(false), 0);
  }, [router]);

  const logout = () => {
    localStorage.removeItem("chat-user");
    setUser(null);
    router.refresh();
  };

  const handleSelectRoom = (roomId: string, otherUser: any) => {
    setSelectedRoomId(roomId);
    setSelectedOtherUser(otherUser);
    setShowSearch(false);
  };

  const handleStartChat = (roomId: string, targetUser: any) => {
    setSelectedRoomId(roomId);
    setSelectedOtherUser(targetUser);
    setShowSearch(false);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        <p className="italic text-gray-500 animate-pulse">Đang chuẩn bị...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <main className="flex flex-col items-center justify-center min-h-screen bg-slate-50 p-4 gap-8">
        <div className="flex flex-col items-center text-center space-y-3">
          <div className="p-4 bg-blue-600 rounded-2xl shadow-lg shadow-blue-200">
            <MessageCircle className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-4xl font-black tracking-tight text-slate-900">Spackie Chat</h1>
          <p className="text-slate-500 max-w-[280px]">Nhắn tin riêng tư với bạn bè và đội ngũ hỗ trợ.</p>
        </div>
        <div className="w-full max-w-md">
          <AuthForm
            onAuth={(u: any) => {
              localStorage.setItem("chat-user", JSON.stringify(u));
              if (u.isAdmin) router.push("/admin");
              else setUser(u);
            }}
          />
        </div>
      </main>
    );
  }

  return (
    <main className="h-screen bg-slate-100 flex flex-col p-0 sm:p-4">
      <div className="flex-1 flex flex-col sm:flex-row gap-4 overflow-hidden">
        {/* Sidebar */}
        <aside className="w-full sm:w-80 bg-white rounded-2xl shadow-xl border flex flex-col overflow-hidden">
          <div className="p-4 border-b flex justify-between items-center">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold">
                {user.username[0].toUpperCase()}
              </div>
              <div>
                <p className="text-xs text-gray-400">Xin chào,</p>
                <p className="font-bold text-slate-900 leading-tight">{user.username}</p>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={logout} className="text-slate-400 hover:text-red-500">
              <LogOut className="w-5 h-5" />
            </Button>
          </div>
          <div className="p-2 border-b">
            <Button
              variant="ghost"
              className="w-full justify-start gap-2 text-slate-600"
              onClick={() => setShowSearch(!showSearch)}>
              <Plus className="w-4 h-4" />
              {showSearch ? "Đóng tìm kiếm" : "Chat mới"}
            </Button>
            {showSearch && (
              <div className="mt-2">
                <UserSearch
                  onStartChat={handleStartChat}
                  currentUserId={user._id} // ← ĐÃ THÊM
                />
              </div>
            )}
          </div>
          <div className="flex-1 overflow-auto">
            <ConversationList
              userId={user._id}
              onSelectRoom={handleSelectRoom}
              selectedRoomId={selectedRoomId} // 👈 thêm dòng này
            />
          </div>
        </aside>

        {/* Chat area */}
        <div className="flex-1 bg-white rounded-2xl shadow-xl border flex flex-col overflow-hidden">
          {!selectedRoomId ? (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-300 gap-3">
              <Users className="w-16 h-16" />
              <p className="text-sm">Chọn một cuộc trò chuyện hoặc bắt đầu chat mới</p>
            </div>
          ) : (
            <>
              <div className="p-4 border-b bg-white flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold">
                  {selectedOtherUser?.username?.[0]?.toUpperCase() || "?"}
                </div>
                <div>
                  <p className="text-xs text-gray-400">Đang trò chuyện với</p>
                  <p className="font-bold text-slate-900">{selectedOtherUser?.username || "Người dùng"}</p>
                </div>
              </div>
              <div className="flex-1 overflow-hidden bg-slate-50">
                {selectedRoomId && user && user._id && <ChatContainer user={user} roomId={selectedRoomId} />}{" "}
              </div>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
