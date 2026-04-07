import { NextRequest, NextResponse } from "next/server";
import { connectDB, pusherServer } from "@/lib/server";
import User from "@/models/User";
import Message from "@/models/Message";
import { cookies } from "next/headers";
import mongoose from "mongoose";

export async function GET(req: NextRequest) {
  await connectDB();
  const roomId = req.nextUrl.searchParams.get("roomId");
  const isAdmin = req.nextUrl.searchParams.get("isAdmin") === "true";
  const cursor = req.nextUrl.searchParams.get("cursor");
  const limit = parseInt(req.nextUrl.searchParams.get("limit") || "10", 10);

  if (!roomId) return NextResponse.json({ error: "Thiếu roomId" }, { status: 400 });

  let query = Message.find({ roomId });
  if (cursor && mongoose.Types.ObjectId.isValid(cursor)) {
    query = query.where("_id").lt(new mongoose.Types.ObjectId(cursor) as any);
  }
  const messages = await query.sort({ createdAt: -1 }).limit(limit);

  const processed = messages.map((m) => {
    const obj = m.toObject();
    if (obj.deleted) {
      if (isAdmin) obj.isDeleted = true;
      else {
        obj.text = "[Tin nhắn đã bị gỡ]";
        obj.imageUrl = null;
        obj.isDeleted = true;
      }
    }
    if (!isAdmin) obj.username = obj.username === "Admin" ? "Support" : "someone";
    return obj;
  });

  const hasMore = messages.length === limit;
  const nextCursor = messages.length ? messages[messages.length - 1]._id.toString() : null;

  return NextResponse.json({
    messages: processed.reverse(),
    hasMore,
    nextCursor,
  });
}

export async function POST(req: NextRequest) {
  await connectDB();
  const cookieStore = await cookies();
  const userIdFromCookie = cookieStore.get("auth_session")?.value;
  if (!userIdFromCookie) {
    return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  }

  // Nhận JSON từ client (text, roomId, imageUrl, imageMode)
  const { text, roomId, imageUrl, imageMode } = await req.json();

  if (!text && !imageUrl) {
    return NextResponse.json({ error: "Nội dung trống" }, { status: 400 });
  }

  const user = await User.findById(userIdFromCookie);
  if (!user) return NextResponse.json({ error: "User không tồn tại" }, { status: 404 });

  const finalRoomId = roomId || `room-${user._id}`;

  const isOwnerRoom = finalRoomId === `room-${user._id}`;
  const isPrivateRoom = finalRoomId.startsWith("room-") && finalRoomId.includes(user._id.toString());
  if (!user.isAdmin && !isOwnerRoom && !isPrivateRoom) {
    return NextResponse.json({ error: "Không có quyền gửi vào phòng này" }, { status: 403 });
  }

  const msg = await Message.create({
    roomId: finalRoomId,
    userId: user._id,
    username: user.username,
    text: text || "",
    imageUrl,
    imageMode: imageMode || "normal",
  });

  await pusherServer.trigger(`chat-${finalRoomId}`, "new-message", {
    ...msg.toObject(),
    username: user.isAdmin ? user.username : "someone",
  });

  // Gửi sự kiện cập nhật danh sách phòng cho cả người gửi và người nhận
  // Xác định người nhận (nếu là private room)
  const participants = finalRoomId
    .split("-")
    .filter(
      (id: string | Uint8Array<ArrayBufferLike> | mongoose.mongo.BSON.ObjectId | mongoose.mongo.BSON.ObjectIdLike) =>
        id !== "room" && mongoose.Types.ObjectId.isValid(id),
    );
  for (const participantId of participants) {
    await pusherServer.trigger(`user-${participantId}`, "rooms-updated", {});
  }

  return NextResponse.json(msg, { status: 201 });
}
