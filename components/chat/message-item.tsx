"use client";

import Image from "next/image";
import { Trash2, X, ImageIcon, Clock } from "lucide-react";
import { useState, useEffect, useRef } from "react";

/* ---------------- types ---------------- */

interface User {
  _id: string;
  username: string;
  isAdmin: boolean;
}

interface Message {
  _id: string;
  userId: string;
  text?: string;
  imageUrl?: string | null;
  imageMode?: "normal" | "once";
  onceViewedBy?: string[];
  deleted?: boolean;
  seenBy?: string[];
  createdAt: string;
}

interface Props {
  message: Message;
  isMe: boolean;
  currentUser: User;
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
}

/* ---------------- component ---------------- */

export default function MessageItem({ message, isMe, currentUser, setMessages }: Props) {
  const [deleting, setDeleting] = useState(false);
  const [showFullImage, setShowFullImage] = useState(false);
  const [imageOpened, setImageOpened] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const canDelete = isMe;
  const isOnceImage = message.imageMode === "once" && !!message.imageUrl;
  const hasBeenSeen = !message.deleted && (message.seenBy?.length ?? 0) > 0;

  const alreadyViewed = message.onceViewedBy?.includes(currentUser._id) ?? false;

  /* ---------------- cleanup ---------------- */

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  /* ---------------- handlers ---------------- */

  const handleViewImage = async () => {
    if (!message.imageUrl || alreadyViewed || imageOpened) return;

    setImageOpened(true);
    setShowFullImage(true);
    setTimeLeft(5);

    intervalRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (!prev || prev <= 1) {
          if (intervalRef.current) clearInterval(intervalRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    timerRef.current = setTimeout(async () => {
      setShowFullImage(false);
      setTimeLeft(null);

      await fetch(`/api/messages/${message._id}/once-viewed`, {
        method: "POST",
      }).catch(console.error);
    }, 5000);
  };

  const handleCloseModal = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (intervalRef.current) clearInterval(intervalRef.current);

    setShowFullImage(false);
    setTimeLeft(null);

    if (!alreadyViewed && imageOpened) {
      fetch(`/api/messages/${message._id}/once-viewed`, {
        method: "POST",
      }).catch(console.error);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Bạn có chắc muốn thu hồi tin nhắn này?")) return;

    setDeleting(true);

    try {
      const res = await fetch(`/api/messages/${message._id}`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error();
    } catch {
      alert("Thu hồi tin nhắn thất bại");
    } finally {
      setDeleting(false);
    }
  };

  /* ---------------- render content ---------------- */

  const renderContent = () => {
    if (message.deleted) {
      if (currentUser.isAdmin) {
        return (
          <>
            {message.text && <p className="text-sm whitespace-pre-wrap">{message.text}</p>}

            {message.imageUrl && (
              <div className="mt-2 relative min-w-[200px] h-48 rounded-lg overflow-hidden border border-red-300 opacity-70">
                <Image src={message.imageUrl} alt="Deleted image" fill className="object-cover" />
              </div>
            )}

            <span className="text-xs text-red-400 ml-2">(đã thu hồi)</span>
          </>
        );
      }

      return <p className="text-sm italic text-gray-400">Tin nhắn đã bị thu hồi</p>;
    }

    return (
      <>
        {message.text && <p className="text-sm whitespace-pre-wrap">{message.text}</p>}

        {message.imageUrl && (
          <>
            {!currentUser.isAdmin && isOnceImage && (alreadyViewed || (imageOpened && timeLeft === 0)) && (
              <div className="mt-2 text-xs text-gray-400 italic">Ảnh đã hết hạn (xem một lần)</div>
            )}

            {(currentUser.isAdmin || !isOnceImage || (!alreadyViewed && !imageOpened)) && (
              <button
                onClick={handleViewImage}
                className="mt-2 flex items-center gap-2 px-3 py-2 bg-slate-200 hover:bg-slate-300 rounded-lg">
                <ImageIcon className="w-4 h-4" />
                <span className="text-xs font-medium">Xem ảnh</span>
              </button>
            )}

            {isOnceImage && !currentUser.isAdmin && imageOpened && timeLeft && timeLeft > 0 && (
              <div className="mt-2 text-xs text-blue-500">Đang xem ảnh (còn {timeLeft}s)</div>
            )}
          </>
        )}
      </>
    );
  };

  /* ---------------- UI ---------------- */

  return (
    <>
      <div className={`flex ${isMe ? "justify-end" : "justify-start"} mb-4 group relative`}>
        <div
          className={`max-w-[70%] p-3 rounded-2xl ${isMe ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-900"}`}>
          {renderContent()}

          <div className="text-[10px] opacity-50 mt-1 flex gap-1">
            <span>
              {new Date(message.createdAt).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>

            {isMe && !message.deleted && (
              <span className={hasBeenSeen ? "text-green-500" : "text-gray-400"}>{hasBeenSeen ? "✓✓" : "✓"}</span>
            )}
          </div>
        </div>

        {canDelete && !message.deleted && (
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 transition bg-red-500 text-white rounded-full p-1">
            <Trash2 className="w-3 h-3" />
          </button>
        )}
      </div>

      {showFullImage && message.imageUrl && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4" onClick={handleCloseModal}>
          <div className="relative max-w-[90vw] max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
            <img src={message.imageUrl} className="max-w-full max-h-full object-contain" alt="Fullscreen" />

            {!currentUser.isAdmin && isOnceImage && timeLeft && timeLeft > 0 && (
              <div className="absolute top-4 left-4 bg-black/60 text-white px-2 py-1 rounded-md text-sm flex gap-1">
                <Clock className="w-3 h-3" />
                {timeLeft}s
              </div>
            )}

            <button
              onClick={handleCloseModal}
              className="absolute top-4 right-4 text-white bg-black/50 rounded-full p-2">
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
