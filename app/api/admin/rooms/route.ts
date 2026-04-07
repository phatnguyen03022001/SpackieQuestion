import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/server";
import Message from "@/models/Message";
import User from "@/models/User";
import { cookies } from "next/headers";
import mongoose from "mongoose";

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const cookieStore = await cookies();
    const adminId = cookieStore.get("auth_session")?.value;
    if (!adminId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const admin = await User.findById(adminId);
    if (!admin || !admin.isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Lấy tất cả roomId có trong hệ thống
    const rooms = await Message.aggregate([{ $group: { _id: "$roomId" } }, { $project: { roomId: "$_id", _id: 0 } }]);

    const result = [];
    for (const { roomId } of rooms) {
      const parts = roomId.split("-");
      const userIds = parts.filter((id: string) => {
        if (id === "room") return false;
        return mongoose.Types.ObjectId.isValid(id);
      });
      if (userIds.length === 0) continue; // bỏ qua room không có user hợp lệ

      const users = await User.find({ _id: { $in: userIds } }).select("username");
      result.push({
        roomId,
        participants: users.map((u) => ({ _id: u._id, username: u.username })),
      });
    }

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Error in /api/admin/rooms:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
