"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import ChatContainer from "@/components/chat/chat-container";
import AuthForm from "@/components/auth/auth-form";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LogOut, ShieldCheck, MessageSquare, Loader2, Eye } from "lucide-react";

export default function AdminPage() {
  const router = useRouter();

  const [admin, setAdmin] = useState<any>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("chat-user");
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          return parsed.isAdmin ? parsed : null;
        } catch (e) {
          return null;
        }
      }
    }
    return null;
  });

  const [loading, setLoading] = useState(true);
  const [rooms, setRooms] = useState<any[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<any>(null);

  const fetchRooms = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/rooms");
      if (!res.ok) throw new Error("Failed to fetch rooms");
      const data = await res.json();
      setRooms(data);
    } catch (error) {
      console.error("Lỗi tải phòng:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (admin) {
      fetchRooms();
    } else {
      const stored = localStorage.getItem("chat-user");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (!parsed.isAdmin) router.push("/");
      }
      setLoading(false);
    }
  }, [admin, fetchRooms, router]);

  const logout = () => {
    localStorage.removeItem("chat-user");
    setAdmin(null);
    router.push("/");
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-slate-900" />
        <p className="text-sm text-slate-500 animate-pulse font-medium">Đang tải danh sách cuộc trò chuyện...</p>
      </div>
    );
  }

  if (!admin) {
    return (
      <main className="flex flex-col items-center justify-center min-h-screen bg-slate-50 p-4 gap-6">
        <div className="text-center space-y-2">
          <div className="bg-slate-900 w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-xl">
            <ShieldCheck className="text-white w-7 h-7" />
          </div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Admin Control</h1>
          <p className="text-slate-500">Vui lòng đăng nhập để quản lý hỗ trợ</p>
        </div>
        <div className="w-full max-w-sm">
          <AuthForm
            onAuth={(u: any) => {
              if (u.isAdmin) {
                localStorage.setItem("chat-user", JSON.stringify(u));
                setAdmin(u);
              } else {
                alert("Tài khoản này không có quyền Admin!");
              }
            }}
          />
        </div>
      </main>
    );
  }

  return (
    <main className="flex h-screen bg-slate-100 p-2 sm:p-4 gap-4 overflow-hidden">
      {/* Sidebar: Danh sách các cuộc trò chuyện */}
      <aside className="w-80 flex flex-col gap-4 shrink-0 hidden md:flex">
        <Card className="shadow-sm border-none bg-white overflow-hidden rounded-2xl">
          <CardContent className="p-4 flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-slate-900 rounded-full flex items-center justify-center text-white text-xs font-bold">
                AD
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Quản trị viên</span>
                <span className="font-bold text-slate-800 leading-none">{admin.username}</span>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={logout}
              className="text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors">
              <LogOut className="w-5 h-5" />
            </Button>
          </CardContent>
        </Card>

        <Card className="flex-1 flex flex-col overflow-hidden shadow-sm border-none bg-white rounded-2xl">
          <div className="p-4 border-b flex justify-between items-center bg-white sticky top-0 z-10">
            <h2 className="font-black text-slate-900 tracking-tight">Tất cả cuộc trò chuyện</h2>
            <span className="text-[10px] bg-slate-100 px-2 py-1 rounded-full font-black text-slate-500">
              {rooms.length} PHÒNG
            </span>
          </div>

          <ScrollArea className="flex-1">
            <div className="p-2 space-y-1">
              {rooms.length === 0 ? (
                <div className="py-20 text-center text-slate-300 italic">
                  <p className="text-xs">Chưa có cuộc trò chuyện nào</p>
                </div>
              ) : (
                rooms.map((room) => (
                  <div
                    key={room.roomId}
                    onClick={() => setSelectedRoom(room)}
                    className={`group flex items-center gap-3 p-3 cursor-pointer rounded-xl transition-all duration-200 ${
                      selectedRoom?.roomId === room.roomId
                        ? "bg-slate-900 text-white shadow-lg shadow-slate-300 translate-x-1"
                        : "hover:bg-slate-50 text-slate-600"
                    }`}>
                    <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center">
                      <Eye className="w-5 h-5" />
                    </div>
                    <div className="overflow-hidden">
                      <p className="font-bold text-sm truncate">
                        {room.participants.map((p: any) => p.username).join(", ")}
                      </p>
                      <p className="text-[10px] text-slate-400">ID: {room.roomId.slice(-8)}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </Card>
      </aside>

      {/* Chat area - chỉ xem, không gửi tin nhắn */}
      <Card className="flex-1 overflow-hidden shadow-sm border-none bg-white flex flex-col rounded-2xl">
        {selectedRoom ? (
          <>
            <header className="p-4 border-b flex items-center gap-3 bg-white z-10">
              <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse ring-2 ring-yellow-200" />
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-black tracking-tighter">
                  Đang xem (chỉ đọc)
                </span>
                <h3 className="font-black text-slate-900 leading-none text-lg">
                  {selectedRoom.participants.map((p: any) => p.username).join(", ")}
                </h3>
              </div>
            </header>
            <div className="flex-1 overflow-hidden relative bg-slate-50/30">
              {selectedRoom && admin && (
                <ChatContainer key={selectedRoom.roomId} user={admin} roomId={selectedRoom.roomId} readOnly={true} />
              )}
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-slate-300 gap-4 bg-slate-50/20">
            <div className="w-24 h-24 bg-white rounded-[2.5rem] flex items-center justify-center border border-slate-100 shadow-xl shadow-slate-200/50">
              <MessageSquare className="w-10 h-10 text-slate-200" />
            </div>
            <div className="text-center space-y-1">
              <p className="font-black text-slate-400 uppercase text-xs tracking-widest">Quan sát viên</p>
              <p className="text-sm text-slate-400 italic font-medium">Chọn một cuộc trò chuyện để xem nội dung</p>
            </div>
          </div>
        )}
      </Card>
    </main>
  );
}
