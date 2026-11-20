# TaskFlow

Ứng dụng quản lý dự án và công việc cá nhân, tông **đen + xanh dương**, lấy cảm hứng từ những bể nước: mỗi dự án là một bể, xong càng nhiều việc thì nước càng dâng cao.

- **web/**: React 19 + Vite + Tailwind CSS v4 + Motion + TanStack Query + dnd-kit
- **api/**: Node.js + Express 5 + MongoDB (Mongoose) + JWT + bcrypt

Mỗi người tự đăng ký tài khoản và chỉ thấy dữ liệu của chính mình, nên có thể đưa link công khai cho mọi người cùng dùng.

> Muốn đưa lên mạng? Xem hướng dẫn từng bước cho người mới trong [DEPLOY.md](DEPLOY.md).

## Tính năng

**Tài khoản**
- Đăng ký, đăng nhập, đăng xuất. Người mới đăng ký được tạo sẵn 1 dự án hướng dẫn
- Trang **Tài khoản**: đổi tên, chọn màu avatar, đổi mật khẩu, đăng xuất mọi thiết bị, xoá tài khoản (xoá luôn toàn bộ dữ liệu)
- Đồng hồ đo độ mạnh mật khẩu, hiện/ẩn mật khẩu, báo lỗi ngay dưới từng ô
- Nút "Dùng thử bằng tài khoản demo" (bật bằng biến môi trường). Tài khoản demo bị khoá các thao tác phá hoại
- Hết phiên thì tự đưa về trang đăng nhập, đăng nhập xong quay lại đúng trang đang mở

**Tổng quan**
- Lời chào theo buổi, quả cầu nước thể hiện % việc trong tuần đã xong
- 4 thẻ số liệu (đang mở, đến hạn hôm nay, trễ hạn, xong trong 7 ngày) có biểu đồ nhỏ
- Biểu đồ "Nhịp hoàn thành" 7 hoặc 14 ngày, so với kỳ trước
- Thẻ "Cần chú ý" (trễ hạn, hôm nay, 7 ngày tới), tiến độ từng dự án, dòng thời gian hoạt động, phân bố theo trạng thái và ưu tiên

**Dự án**
- Tạo, sửa, lưu trữ, khôi phục, xoá dự án; mỗi dự án có 1 trong 10 màu
- Ảnh bìa là mặt nước dâng theo % tiến độ của dự án
- Tìm kiếm, sắp xếp (mới cập nhật, nhiều việc mở, tiến độ, tên)

**Trong một dự án, có 3 kiểu xem**
- **Bảng Kanban**: 3 cột Cần làm, Đang làm, Đã xong. Kéo thả bằng chuột, cảm ứng hoặc bàn phím (Space để nhấc, mũi tên để di chuyển). Thứ tự được lưu lại.
- **Danh sách**: nhóm theo trạng thái, thu gọn được
- **Lịch tháng**: kéo việc sang ngày khác để dời hạn, kéo việc "chưa có hạn" vào lịch để đặt hạn
- Thêm nhanh ngay trong cột (Enter để thêm liên tục), lọc theo ưu tiên, tìm trong dự án

**Công việc**
- Tên, mô tả, trạng thái, 4 mức ưu tiên (Khẩn cấp, Cao, Vừa, Thấp), hạn chót kèm nút chọn nhanh, checklist việc con
- Bảng chi tiết trượt từ bên phải, tự lưu từng trường
- Xoá có nút **Hoàn tác**

**Khác**
- **Việc của tôi**: tất cả việc đang mở ở mọi dự án, nhóm theo Trễ hạn, Hôm nay, 7 ngày tới, Sau này, Chưa có hạn
- **Ctrl K** (hoặc ⌘K): tìm nhanh việc, dự án, trang, không cần gõ dấu
- Phím tắt: **N** thêm việc mới, **Ctrl B** thu gọn thanh bên
- Giao diện tối (mặc định) và sáng, dùng tốt trên điện thoại

### Hiệu ứng riêng

- Quả cầu nước và mặt nước ở thẻ dự án: sóng trôi liên tục, mực nước dâng theo tiến độ
- Checkbox nước: tick vào thì nước dâng đầy, dấu tick tự vẽ, bắn giọt nước; tên việc được gạch ngang dần
- Thẻ Kanban nghiêng nhẹ khi được nhấc lên, các thẻ khác tự dạt ra
- Viên chọn trượt ở mọi nhóm nút, số liệu đếm lên, biểu đồ tự vẽ nét
- Trang đăng nhập có bể nước và thẻ công việc trôi nổi, form rung nhẹ khi nhập sai
- Tôn trọng cài đặt *Reduce motion* của hệ điều hành

## Bảo mật

- Mật khẩu băm bằng **bcrypt** (12 vòng), không bao giờ trả về trong API. Giới hạn 8 đến 72 byte, cần có chữ và số
- **JWT** (HS256) gửi qua header `Authorization: Bearer`, hết hạn sau 7 ngày. Mỗi user có `tokenVersion`: đổi mật khẩu hoặc "đăng xuất mọi thiết bị" làm mọi token cũ mất hiệu lực
- Mọi truy vấn dự án, công việc, hoạt động, thống kê đều lọc theo `owner` là người đang đăng nhập. Truy cập dữ liệu người khác trả về 404
- **Rate limit**: đăng nhập/đăng ký 10 lần sai mỗi 15 phút, đổi mật khẩu/xoá tài khoản 10 lần mỗi 15 phút, toàn API 1000 yêu cầu mỗi 15 phút
- Kiểm tra input ở server (kiểu dữ liệu, độ dài, định dạng email), **helmet**, CORS theo danh sách cho phép
- Lỗi đăng nhập không tiết lộ email có tồn tại hay không, thời gian phản hồi như nhau
- `JWT_SECRET` bắt buộc khi chạy production (ít nhất 32 ký tự), thiếu thì server không khởi động

## Cấu trúc thư mục

```
todo-list/
├── api/                      # REST API
│   ├── src/
│   │   ├── config/           # đọc .env, kết nối MongoDB
│   │   ├── controllers/      # auth, project, task, dashboard + dựng query lọc/sắp xếp
│   │   ├── lib/              # băm mật khẩu + JWT, kiểm tra input, thống kê, múi giờ
│   │   ├── middleware/       # bắt buộc đăng nhập, rate limit, xử lý lỗi
│   │   ├── models/           # User, Project, Task, Activity
│   │   ├── routes/
│   │   ├── seed/             # dữ liệu mẫu + script seed
│   │   ├── services/         # ghi nhật ký hoạt động, dự án hướng dẫn cho user mới
│   │   ├── app.js            # cấu hình Express, CORS
│   │   └── server.js         # điểm khởi chạy
│   └── .env.example
├── web/                      # Frontend
│   ├── src/
│   │   ├── components/
│   │   │   ├── auth/         # AuthContext, chặn route, ô nhập, khung trang đăng nhập
│   │   │   ├── dashboard/    # thẻ chào, số liệu, biểu đồ, hoạt động
│   │   │   ├── project/      # Kanban, danh sách, lịch, hộp thoại dự án
│   │   │   ├── shell/        # thanh bên, thanh trên, Ctrl K
│   │   │   ├── task/         # bảng chi tiết, checklist, dòng việc
│   │   │   └── ui/           # nút, hộp thoại, biểu đồ, toast...
│   │   ├── hooks/            # gọi API bằng TanStack Query, cập nhật lạc quan
│   │   ├── lib/              # api client, ngày giờ, hằng số, theme
│   │   └── pages/            # Đăng nhập, Đăng ký, Tổng quan, Dự án, Trang dự án, Việc của tôi, Tài khoản
│   ├── vercel.json
│   └── .env.example
├── render.yaml               # Blueprint deploy API lên Render
├── DEPLOY.md                 # hướng dẫn deploy từng bước
└── package.json              # script chạy cả web + api cùng lúc
```

## Chạy ở máy local

Yêu cầu: **Node.js 20+** và một MongoDB (cài local, chạy bằng Docker, hoặc dùng luôn MongoDB Atlas miễn phí như trong [DEPLOY.md](DEPLOY.md)).

```bash
# 1. Cài dependencies cho cả 3 package (root, api, web)
npm run install:all

# 2. Tạo file môi trường
cp api/.env.example api/.env
cp web/.env.example web/.env
#   Windows (PowerShell): Copy-Item api/.env.example api/.env ; Copy-Item web/.env.example web/.env

# 3. Sửa MONGODB_URI trong api/.env nếu không dùng MongoDB local

# 4. Seed dữ liệu mẫu (2 tài khoản, 5 dự án, 39 công việc, kèm lịch sử hoạt động)
npm run seed

# 5. Chạy cả API (cổng 5000) và web (cổng 5173)
npm run dev
```

Mở http://localhost:5173 và đăng nhập bằng một trong 2 tài khoản seed:

| Email | Mật khẩu | Dữ liệu |
| --- | --- | --- |
| `demo@taskflow.dev` | `Demo@123456` | 5 dự án mẫu, 39 công việc. Bị khoá đổi tên, đổi mật khẩu, xoá tài khoản |
| `minh@taskflow.dev` | `Minh@123456` | Chỉ 1 dự án hướng dẫn, dùng để thử tính năng tách dữ liệu |

Hoặc bấm **Đăng ký** để tạo tài khoản mới.

Muốn chạy riêng từng phần: `cd api && npm run dev` và `cd web && npm run dev`.

Chưa có MongoDB local thì chạy nhanh bằng Docker:

```bash
docker run -d --name taskflow-mongo -p 27017:27017 mongo:7
```

### Seed dữ liệu

| Lệnh (trong `api/`) | Tác dụng |
| --- | --- |
| `npm run seed` | **Xoá toàn bộ** người dùng, dự án, công việc, hoạt động hiện có rồi thêm dữ liệu mẫu |
| `npm run seed:clear` | Chỉ xoá toàn bộ |

Khi `MONGODB_URI` không trỏ về máy local (ví dụ Atlas), script sẽ hỏi lại và chỉ chạy khi bạn gõ `yes`. Thêm `-- --yes` để bỏ qua câu hỏi (vd `npm run seed -- --yes`).

Hạn chót trong dữ liệu mẫu tính theo thời điểm chạy seed, nên lúc nào cũng có việc "hôm nay", "trễ hạn", "tuần sau".

## Biến môi trường

### api/.env

| Biến | Ví dụ | Ghi chú |
| --- | --- | --- |
| `PORT` | `5000` | Render tự cấp, không cần đặt khi deploy |
| `MONGODB_URI` | `mongodb://127.0.0.1:27017/taskflow` | Bắt buộc. Với Atlas: `mongodb+srv://user:pass@cluster.mongodb.net/taskflow` |
| `CORS_ORIGIN` | `http://localhost:5173` | Các origin được gọi API, ngăn cách bằng dấu phẩy, hỗ trợ `*` (vd `https://taskflow-*.vercel.app`) |
| `NODE_ENV` | `development` | Đặt `production` khi deploy để ẩn chi tiết lỗi |
| `JWT_SECRET` | chuỗi ngẫu nhiên 96 ký tự | Khoá ký token. **Bắt buộc** khi `production`, tối thiểu 32 ký tự. Tạo bằng `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`. Local bỏ trống thì dùng khoá tạm |
| `JWT_EXPIRES_IN` | `7d` | Thời hạn đăng nhập |

### web/.env

| Biến | Ví dụ | Ghi chú |
| --- | --- | --- |
| `VITE_API_URL` | `http://localhost:5000` | URL gốc của API, không có `/` ở cuối. Được gắn vào lúc build |
| `VITE_DEMO_EMAIL` | `demo@taskflow.dev` | Không bắt buộc. Cùng với biến dưới, hiện nút "Dùng thử bằng tài khoản demo" |
| `VITE_DEMO_PASSWORD` | `Demo@123456` | Không bắt buộc. Lộ ra trình duyệt, chỉ dùng cho tài khoản demo |

## API

Base URL: `http://localhost:5000/api`. Mọi phản hồi có dạng `{ "data": ... }`, lỗi có dạng `{ "error": { "message", "fields"? } }`.

Trừ `/health` và `/auth/register`, `/auth/login`, mọi endpoint đều cần header `Authorization: Bearer <token>`. Thiếu hoặc sai token trả về `401`.

### Tài khoản

| Method | Endpoint | Mô tả |
| --- | --- | --- |
| POST | `/auth/register` | Đăng ký: `{ name, email, password }` → `{ user, token }` (201). Email trùng trả `409` |
| POST | `/auth/login` | Đăng nhập: `{ email, password }` → `{ user, token }` |
| GET | `/auth/me` | Thông tin người đang đăng nhập |
| PATCH | `/auth/me` | Sửa `name`, `avatarColor` |
| POST | `/auth/change-password` | `{ currentPassword, newPassword }` → `{ user, token }`, mọi token cũ mất hiệu lực |
| POST | `/auth/logout-all` | Đăng xuất mọi thiết bị |
| DELETE | `/auth/me` | Xoá tài khoản và toàn bộ dữ liệu: `{ password }` |

Tài khoản demo (`isDemo`) nhận `403` ở 4 endpoint sửa, đổi mật khẩu, đăng xuất mọi thiết bị và xoá.

### Dự án

| Method | Endpoint | Mô tả |
| --- | --- | --- |
| GET | `/projects?archived=false` | Danh sách dự án kèm `stats` (total, open, done, doing, overdue, dueSoon, progress). `archived`: `false` (mặc định), `true`, `all` |
| POST | `/projects` | Tạo dự án: `{ name, description?, color? }` |
| GET | `/projects/:id` | Chi tiết một dự án kèm `stats` |
| PATCH | `/projects/:id` | Sửa `name`, `description`, `color`, `archived` |
| DELETE | `/projects/:id` | Xoá dự án cùng toàn bộ công việc của nó |

Màu hợp lệ: `blue`, `sky`, `cyan`, `teal`, `green`, `amber`, `orange`, `rose`, `violet`, `indigo`.

### Công việc

| Method | Endpoint | Mô tả |
| --- | --- | --- |
| GET | `/tasks` | Danh sách. Query: `project`, `status` (`todo`, `doing`, `done`, `open`, `overdue`), `priority` (`low`, `medium`, `high`, `urgent`), `due` (`today`, `week`, `overdue`, `none`), `search`, `sort` (`board`, `newest`, `oldest`, `deadline`, `priority`), `tzOffset` |
| POST | `/tasks` | Tạo: `{ project, title, description?, status?, priority?, deadline?, checklist? }` |
| GET | `/tasks/:id` | Chi tiết |
| PATCH | `/tasks/:id` | Sửa một hoặc nhiều trường |
| PATCH | `/tasks/:id/toggle` | Đảo trạng thái xong / chưa xong |
| POST | `/tasks/:id/move` | Kéo thả: `{ status, index }`, đưa việc vào cột `status` ở vị trí `index` |
| DELETE | `/tasks/:id` | Xoá |
| DELETE | `/tasks?status=done&project=<id>` | Dọn các việc đã xong của một dự án |

`checklist` là mảng `[{ text, done }]`, tối đa 50 mục. `tzOffset` theo quy ước của `Date.getTimezoneOffset()` (Việt Nam là `-420`), dùng để tính "hôm nay" đúng múi giờ.

### Thống kê và hoạt động

| Method | Endpoint | Mô tả |
| --- | --- | --- |
| GET | `/dashboard?tzOffset=-420` | Số liệu trang Tổng quan: tuần này, thẻ số liệu, nhịp hoàn thành 28 ngày, phân bố, tiến độ dự án, việc cần chú ý |
| GET | `/activity?type=all&limit=30` | Nhật ký hoạt động. `type`: `all`, `completed`, `created` |
| GET | `/health` | Kiểm tra server và kết nối DB |
