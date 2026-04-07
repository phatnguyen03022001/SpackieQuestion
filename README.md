Dưới đây là nội dung file `README.md` mô tả toàn bộ hệ thống chat (các tính năng, công nghệ sử dụng, cấu trúc và hướng dẫn triển khai). Bạn có thể lưu với tên `README.md` hoặc `SYSTEM_DESCRIPTION.md`.

```markdown
# Hệ thống Chat 1-1 Real-time với Admin, Ảnh "Xem một lần" và Trạng thái "Đã đọc"

## 📌 Tổng quan
Hệ thống chat hoàn chỉnh cho phép người dùng:
- Nhắn tin **1-1** (private) với nhau.
- Gửi **ảnh bình thường** hoặc **ảnh xem một lần** (hết hạn sau 5 giây, người nhận chỉ xem được một lần).
- **Thu hồi tin nhắn** (chỉ chủ sở hữu, admin vẫn thấy nội dung gốc).
- **Trạng thái đã đọc** (seen) – hai tick xanh khi người nhận mở phòng chat.
- **Quản trị viên** (admin) có thể xem tất cả các cuộc trò chuyện (read‑only) mà không làm ảnh hưởng đến trạng thái seen.
- **Phân trang tin nhắn** – tải 10 tin nhắn/lần, có nút “Xem tin nhắn cũ”.
- **Realtime** qua Pusher – tin nhắn mới, xóa, seen được cập nhật ngay.
- **Upload ảnh trực tiếp lên Cloudinary** (client‑side) – tránh quá tải serverless, hỗ trợ nén ảnh.

---

## 🛠 Công nghệ sử dụng

| Thành phần       | Công nghệ                                                      |
| ---------------- | -------------------------------------------------------------- |
| Framework        | Next.js 16 (App Router, Turbopack)                             |
| Ngôn ngữ         | TypeScript                                                     |
| Database         | MongoDB (Mongoose ODM)                                         |
| Realtime         | Pusher (channels)                                              |
| Xác thực         | Cookie `auth_session` (httpOnly)                               |
| Upload ảnh       | Cloudinary (unsigned preset) + nén client (`compressImage`)    |
| UI               | Tailwind CSS + shadcn/ui components                            |
| State management | React hooks (`useState`, `useEffect`, `useRef`, `useCallback`) |

---

## 📁 Cấu trúc thư mục quan trọng

```
├── app/
│   ├── admin/                 # Trang admin (quan sát viên)
│   ├── api/                   # API routes
│   │   ├── admin/rooms        # Lấy danh sách tất cả phòng (admin)
│   │   ├── login/             # Đăng nhập (set cookie)
│   │   ├── messages/          # GET (phân trang, xử lý deleted/seen) & POST (tạo tin nhắn)
│   │   ├── messages/[id]/     # DELETE (thu hồi), once-viewed (đánh dấu ảnh once)
│   │   ├── messages/seen/     # Đánh dấu đã đọc
│   │   ├── rooms/             # Lấy danh sách phòng của user thường
│   │   ├── rooms/start/       # Tạo roomId mới (private)
│   │   ├── users/search/      # Tìm kiếm user (bắt đầu chat mới)
│   ├── page.tsx               # Giao diện chính (user thường)
├── components/
│   ├── chat/
│   │   ├── chat-container.tsx # Khung chat, tự động scroll, gọi seen
│   │   ├── chat-input.tsx     # Ô nhập, upload ảnh, chọn chế độ once/normal
│   │   ├── message-item.tsx   # Hiển thị tin nhắn, ảnh once (timer, modal), thu hồi, seen tick
│   │   ├── conversation-list.tsx # Danh sách các cuộc trò chuyện (có realtime refresh)
│   │   ├── user-search.tsx    # Tìm user và tạo phòng mới
├── hooks/
│   └── use-chat.tsx           # Load tin nhắn, phân trang, lắng nghe Pusher events
├── lib/
│   ├── client.ts              # Pusher client singleton
│   ├── server.ts              # Kết nối DB, Pusher server, Cloudinary config
│   ├── utils.ts               # `compressImage`, `getPrivateRoomId`, `cn`
├── models/
│   ├── Message.ts             # Schema: text, imageUrl, imageMode, onceViewedBy, deleted, seenBy...
│   ├── User.ts                # username, password (hash), isAdmin
```

---

## 🚀 Cài đặt và chạy môi trường development

### 1. Clone repository và cài dependencies
```bash
git clone <your-repo>
cd something
npm install
```

### 2. Tạo file `.env.local` (xem mẫu dưới)
```env
# MongoDB
MONGODB_URI=mongodb+srv://<user>:<pass>@cluster.mongodb.net/chat

# Pusher
PUSHER_APP_ID=xxxxxx
PUSHER_KEY=xxxxxxxxxxxxxxxx
PUSHER_SECRET=xxxxxxxxxxxxxxxx
PUSHER_CLUSTER=ap1
NEXT_PUBLIC_PUSHER_KEY=xxxxxxxxxxxxxxxx
NEXT_PUBLIC_PUSHER_CLUSTER=ap1

# Cloudinary
CLOUDINARY_CLOUD_NAME=your_cloud_name
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=123456789
CLOUDINARY_API_SECRET=abc123
NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET=chat_unsigned
```

> **Lưu ý:** Upload preset trên Cloudinary phải có chế độ **Unsigned**.

### 3. Chạy development server
```bash
npm run dev
```
Truy cập `http://localhost:3000`

---

## 📝 Luồng hoạt động chính

### Đăng nhập / Đăng ký
- Dùng `AuthForm` gọi API `/api/login` hoặc `/api/register`.
- Thành công → lưu user vào `localStorage` (`chat-user`) và server set cookie `auth_session` (httpOnly).
- Nếu user có `isAdmin: true` → chuyển hướng về `/admin`.

### Chat 1-1 giữa hai user thường
- Khi A tìm B qua `UserSearch` → gọi `/api/rooms/start` → nhận `roomId = room-{idA}-{idB}` (sắp xếp id).
- A gửi tin nhắn → `POST /api/messages` với `roomId`, `text`, `imageUrl`, `imageMode`.
- Pusher trigger `new-message` đến kênh `chat-${roomId}` → cả hai nhận và thêm vào state.
- Khi B mở phòng → `ChatContainer` gọi `POST /api/messages/seen` → cập nhật `seenBy` cho tin nhắn của A → trigger `messages-seen` → A thấy ✓✓.

### Ảnh “xem một lần” (once)
- Người gửi chọn chế độ `once` trong `ChatInput`.
- Ảnh được upload lên Cloudinary (client) và gửi `imageMode: "once"` cùng tin nhắn.
- **Người nhận**: thấy nút “Xem ảnh” → bấm vào → modal hiện, đếm ngược 5s → sau 5s modal đóng, gọi API `once-viewed` → không thể xem lại.
- **Người gửi (và admin)**: ảnh hiển thị trực tiếp (không timer, có thể xem lại nhiều lần).

### Thu hồi tin nhắn
- Chỉ người gửi mới có nút thùng rác (hover).
- Gọi `DELETE /api/messages/[id]` → đánh dấu `deleted: true`.
- Server trigger `message-deleted` → client cập nhật:
  - Người thường: thay nội dung bằng “[Tin nhắn đã bị gỡ]” (xóa ảnh).
  - Admin: vẫn thấy nội dung gốc + nhãn “(đã thu hồi)”.

### Admin (quan sát viên)
- Vào `/admin`, đăng nhập tài khoản có `isAdmin: true`.
- Admin thấy danh sách **tất cả các room** (cả user-admin và user-user) qua API `/api/admin/rooms`.
- Khi chọn một room, `ChatContainer` được render với `readOnly={true}` → không có ô nhập tin nhắn, không gọi seen.
- Admin xem nội dung các tin nhắn (kể cả ảnh once, tin nhắn đã thu hồi) mà không làm thay đổi trạng thái đã đọc.

---

## 🧪 Triển khai lên Vercel

### Chuẩn bị
- Đẩy code lên GitHub/GitLab.
- Tạo project trên Vercel, liên kết với repository.

### Cấu hình biến môi trường
Vào **Settings → Environment Variables** và thêm tất cả các biến trong `.env.local`.

### Lưu ý với MongoDB
- Sử dụng **MongoDB Atlas** (đã có sẵn).
- Vercel Functions có giới hạn thời gian (Hobby: 10s). Với cơ chế upload ảnh **client‑side**, API `/api/messages` chỉ xử lý JSON (không upload file) nên thời gian rất thấp (< 1s).

### Build và deploy
Vercel tự động build với `npm run build`. Sau khi deploy, ứng dụng chạy ổn định.

---

## 🐛 Xử lý lỗi thường gặp

| Lỗi                                                   | Nguyên nhân                                                      | Cách khắc phục                                                                                          |
| ----------------------------------------------------- | ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `Cannot read properties of undefined (reading '_id')` | `user` hoặc `currentUser` chưa được khởi tạo khi component mount | Thêm guard `if (!user?._id) return null;` ở đầu component (sau các hook).                               |
| Upload ảnh lỗi `upload preset must be whitelisted`    | Preset chưa ở chế độ Unsigned                                    | Vào Cloudinary dashboard → Settings → Upload presets → chọn preset hoặc tạo mới với Mode: **Unsigned**. |
| Pusher không nhận event                               | Key/Cluster sai hoặc client chưa subscribe đúng kênh             | Kiểm tra biến môi trường, dùng `console.log` trong `channel.bind`.                                      |
| Tin nhắn realtime không hiển thị                      | `useChat` không chạy lại khi `roomId` thay đổi                   | Đảm bảo `roomId` được truyền đúng và dependency array `[roomId]`.                                       |

---

## 📄 License
MIT

---

## 👥 Tác giả
Phát triển bởi phatnguyen03022001@gmail.com – dự án học tập và thực hành Next.js + Realtime Chat.
```

Bạn có thể lưu nội dung trên vào file `README.md` hoặc `SYSTEM_DESCRIPTION.md` tùy ý. Nếu cần bổ sung hoặc chỉnh sửa phần nào, hãy cho tôi biết.