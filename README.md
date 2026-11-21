# TaskFlow

Ứng dụng quản lý dự án và công việc cá nhân, tông **xanh dương + xanh đêm**, lấy cảm hứng từ những bể nước: mỗi dự án là một bể, xong càng nhiều việc thì nước càng dâng cao.

Đồ án cá nhân của **Duy An** ([@NayuD06](https://github.com/NayuD06)). Đang mở cho mọi người dùng thử miễn phí.

![Trang Tổng quan, giao diện tối](docs/screenshots/dashboard-dark.webp)

| Bảng Kanban | Giao diện sáng | Trên điện thoại |
| --- | --- | --- |
| ![Bảng Kanban kéo thả](docs/screenshots/board-dark.webp) | ![Trang Tổng quan, giao diện sáng](docs/screenshots/dashboard-light.webp) | ![Bảng Kanban trên điện thoại](docs/screenshots/mobile-light.webp) |

- **web/**: React 19 + Vite + Tailwind CSS v4 + Motion + TanStack Query + dnd-kit
- **api/**: Node.js + Express 5 + MongoDB (Mongoose) + JWT + bcrypt, tài liệu Swagger ở `/api/docs`, test bằng `node:test` + GitHub Actions
- **admin/**: trang quản trị riêng (React + Vite): thống kê, quản lý người dùng, quản lý ảnh đã lưu trên Cloudinary

Mỗi người tự đăng ký tài khoản và chỉ thấy dữ liệu của chính mình (cùng các dự án được mời vào), nên có thể đưa link công khai cho mọi người cùng dùng.

> Muốn đưa lên mạng? Xem hướng dẫn từng bước cho người mới trong [DEPLOY.md](DEPLOY.md).

## Tính năng

**Trang giới thiệu**
- Khách chưa đăng nhập mở trang chủ sẽ thấy trang giới thiệu: bảng Kanban thu nhỏ tự chạy, danh sách tính năng, 3 bước dùng với bể nước dâng theo thanh cuộn, câu hỏi thường gặp
- Nút Tạo tài khoản, Đăng nhập và Dùng thử bản demo. Người đã đăng nhập vào thẳng trang Tổng quan
- Tự "đánh thức" máy chủ Render ngay khi mở trang để lúc bấm đăng nhập không phải chờ lâu

**Tài khoản**
- Đăng ký, đăng nhập, đăng xuất. Người mới đăng ký được tạo sẵn 1 dự án hướng dẫn
- Trang **Tài khoản**: đổi tên, chọn ảnh đại diện (chữ cái đầu, 12 emoji có sẵn hoặc tải ảnh lên), chọn **màu nhấn** cho cả giao diện (10 màu, xem trước ngay), đổi ngôn ngữ, đổi mật khẩu, đăng xuất mọi thiết bị, xoá tài khoản (xoá luôn toàn bộ dữ liệu)
- Ảnh đại diện được cắt vuông ngay trên trình duyệt rồi lưu trên **Cloudinary**. Máy chủ chưa cấu hình Cloudinary thì ảnh được thu nhỏ còn 160px và lưu thẳng trong MongoDB
- **Quên mật khẩu**: gửi email có liên kết đặt lại (dùng được 30 phút, một lần). **Đăng nhập bằng Google**: tài khoản tạo bằng Google đặt thêm mật khẩu được trong trang Tài khoản
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
- Thêm nhanh ngay trong cột (Enter để thêm liên tục), tìm trong dự án (tìm cả theo nhãn)
- **Bộ lọc nâng cao**: chọn nhiều mức ưu tiên, lọc theo nhãn, theo hạn (hôm nay, 7 ngày tới, trễ hạn, chưa có hạn). Các bộ lọc đang bật hiện thành chip, bấm để bỏ từng cái
- Kiểu Danh sách sắp xếp được theo thứ tự trên bảng, hạn chót, ưu tiên, mới cập nhật, tên (nhớ lựa chọn cho lần sau)

**Công việc**
- Tên, mô tả, trạng thái, 4 mức ưu tiên (Khẩn cấp, Cao, Vừa, Thấp), hạn chót kèm nút chọn nhanh, checklist việc con
- **Nhãn** (tối đa 8 nhãn, mỗi nhãn 24 ký tự): gõ rồi Enter hoặc dấu phẩy, gợi ý từ các nhãn đã dùng. Mỗi nhãn luôn ra cùng một màu
- Bảng chi tiết trượt từ bên phải, tự lưu từng trường
- Thông báo nhỏ (toast) khi thêm, sửa, xoá; xoá và đánh dấu xong đều có nút **Hoàn tác**
- Khung xương (skeleton) lúc đang tải, màn hình trống có hình minh hoạ và gợi ý nên làm gì tiếp

**Làm việc nhóm**
- **Chia sẻ dự án**: mời người khác bằng email. Người đã có tài khoản vào ngay, người chưa có sẽ tự vào dự án khi đăng ký bằng đúng email đó (có email mời nếu máy chủ bật gửi email)
- Thành viên xem, sửa công việc, bình luận, tải ảnh. Chỉ chủ dự án sửa thông tin dự án, lưu trữ, xoá và quản lý thành viên. Thành viên tự rời dự án được
- **Bình luận** ngay trong chi tiết công việc (Ctrl + Enter để gửi), số bình luận hiện trên thẻ. Dòng thời gian có bộ lọc "Nhóm"

**Ảnh, việc lặp lại, tập trung**
- **Ảnh đính kèm** (tối đa 10 ảnh mỗi việc): kéo thả, dán bằng Ctrl + V hoặc chọn file. Ảnh tải thẳng từ trình duyệt lên Cloudinary, ảnh lớn được thu nhỏ trước. Ảnh đầu tiên làm ảnh bìa của thẻ trên bảng Kanban, bấm vào để xem lớn
- **Việc lặp lại**: hằng ngày, ngày làm việc (thứ 2 đến thứ 6), hằng tuần, hằng tháng. Đánh dấu xong thì tự tạo lần tiếp theo với hạn mới
- **Pomodoro gắn với công việc**: bấm "Bắt đầu tập trung" trong chi tiết công việc (15, 25 hoặc 50 phút), đồng hồ nổi góc màn hình, có chuông và thông báo khi hết giờ, tự nghỉ 5 phút (15 phút sau mỗi 4 phiên). Mỗi phiên xong được cộng vào công việc

**Dữ liệu**
- **Xuất dữ liệu**: tải bản sao lưu JSON hoặc bảng công việc CSV (mở bằng Excel, Google Sheets)
- **Nhập lại** file JSON đã xuất: luôn thêm dự án mới, không ghi đè dữ liệu đang có

**Trang quản trị** (thư mục `admin/`, deploy riêng)
- Tổng quan hệ thống: người dùng, dự án, công việc, ảnh, Pomodoro, biểu đồ đăng ký mới và việc hoàn thành 14 ngày, các tính năng đang bật trên máy chủ, hoạt động mới nhất
- **Người dùng**: tìm, lọc (quản trị, bị khoá, Google, demo), khoá hoặc mở khoá, cấp hoặc bỏ quyền quản trị, xoá tài khoản (phải gõ đúng email để xác nhận)
- **Ảnh Cloudinary**: mọi ảnh trong thư mục `taskflow/`, mỗi ảnh ghi rõ đang dùng ở công việc nào hoặc là ảnh đại diện của ai. Lọc ảnh không còn dùng, chọn nhiều ảnh để xoá, nút "Dọn dẹp" xoá hết ảnh bị bỏ quên, xem dung lượng và credits đã dùng của tài khoản Cloudinary

**Khác**
- **Việc của tôi**: tất cả việc đang mở ở mọi dự án, nhóm theo Trễ hạn, Hôm nay, 7 ngày tới, Sau này, Chưa có hạn
- **Ctrl K** (hoặc ⌘K, hoặc **/**): tìm nhanh việc, dự án, trang, không cần gõ dấu. Gõ `#nhãn` để tìm theo nhãn
- **Nhắc việc**: chuông trên thanh trên báo các việc trễ hạn và sắp đến hạn trong 24 giờ. Bật "Báo trước 1 giờ" để nhận thông báo của trình duyệt
- **Song ngữ Tiếng Việt / English**: nút đổi ngôn ngữ ở thanh trên, trang giới thiệu, trang đăng nhập và trang Tài khoản. Lần đầu mở web tự chọn theo ngôn ngữ trình duyệt
- Giao diện tối (mặc định, tông xanh đêm dịu mắt) và sáng. Khi đổi, màu mới lan ra như một gợn nước từ chỗ bạn bấm
- Dùng tốt trên điện thoại, cài được như ứng dụng (PWA)
- Trang 404 riêng với số 404 làm bằng nước

### Phím tắt

| Phím | Tác dụng |
| --- | --- |
| `N` | Thêm việc mới |
| `/` hoặc `Ctrl K` | Mở ô tìm nhanh |
| `?` | Xem bảng phím tắt |
| `G` rồi `D` / `P` / `M` / `S` | Đến Tổng quan / Dự án / Việc của tôi / Tài khoản |
| `Ctrl B` | Thu gọn thanh bên |
| `Space`, mũi tên | Nhấc và di chuyển thẻ trên bảng Kanban |

Phím tắt tự tắt khi đang gõ trong ô nhập hoặc đang mở hộp thoại.

### Hiệu ứng riêng

- Quả cầu nước và mặt nước ở thẻ dự án: sóng trôi liên tục, mực nước dâng theo tiến độ
- Checkbox nước: tick vào thì nước dâng đầy, dấu tick tự vẽ, bắn giọt nước; tên việc được gạch ngang dần
- Thẻ Kanban nghiêng nhẹ khi được nhấc lên, các thẻ khác tự dạt ra
- Viên chọn trượt ở mọi nhóm nút, số liệu đếm lên, biểu đồ tự vẽ nét
- Trang đăng nhập có bể nước và thẻ công việc trôi nổi, form rung nhẹ khi nhập sai
- Tôn trọng cài đặt *Reduce motion* của hệ điều hành

### SEO, PWA, trợ năng, tốc độ

- Thẻ meta mô tả, Open Graph và Twitter kèm ảnh xem trước `og.jpg` (1200×630) khi chia sẻ link lên Facebook, Zalo, Messenger. `robots.txt` và `sitemap.xml` được tạo lúc build
- Favicon, icon cho màn hình chính iOS/Android, `manifest.webmanifest` và service worker `sw.js` (lưu đệm file tĩnh, vẫn mở được khung app khi mất mạng). Service worker chỉ chạy ở bản build, không chạy lúc `npm run dev`
- Kiểm tra bằng **axe-core** trên 23 màn hình (sáng/tối, Việt/Anh, điện thoại/máy tính, nhiều màu nhấn): 0 lỗi WCAG 2.1 AA. Màu chữ đạt tương phản 4.5:1, mọi nút có nhãn cho trình đọc màn hình, dùng được hoàn toàn bằng bàn phím
- Mỗi trang là một file JS riêng, tải khi cần (lazy). Thư viện lớn (React, Motion, dnd-kit...) tách file riêng để trình duyệt lưu đệm lâu dài

## Bảo mật

- Mật khẩu băm bằng **bcrypt** (12 vòng), không bao giờ trả về trong API. Giới hạn 8 đến 72 byte, cần có chữ và số
- **JWT** (HS256) gửi qua header `Authorization: Bearer`, hết hạn sau 7 ngày. Mỗi user có `tokenVersion`: đổi mật khẩu hoặc "đăng xuất mọi thiết bị" làm mọi token cũ mất hiệu lực
- Mọi truy vấn dự án, công việc, hoạt động, thống kê đều lọc theo người đang đăng nhập (chủ dự án hoặc thành viên được mời). Truy cập dữ liệu người khác trả về 404
- **Quản trị viên** là tài khoản có `role: admin` hoặc email nằm trong `ADMIN_EMAILS`. Tài khoản bị khoá không đăng nhập và không gọi API được, mọi phiên cũ bị đăng xuất ngay
- Khoá bí mật Cloudinary (`CLOUDINARY_API_SECRET`) chỉ nằm trên máy chủ. Trình duyệt tải ảnh bằng "upload preset" không ký, máy chủ chỉ nhận link ảnh của đúng tài khoản Cloudinary của bạn. Trang quản trị chỉ xoá được ảnh trong thư mục `taskflow/`
- Liên kết đặt lại mật khẩu chỉ lưu mã băm SHA-256, hết hạn sau 30 phút, dùng được một lần, và trang Quên mật khẩu không cho biết email nào đã đăng ký
- Log mỗi request chỉ ghi đường dẫn và id người dùng. Sentry (nếu bật) không gửi kèm header đăng nhập, cookie hay nội dung request
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
│   │   ├── docs/             # tài liệu OpenAPI (Swagger UI ở /api/docs)
│   │   ├── scripts/          # makeAdmin.js: cấp quyền quản trị
│   │   ├── seed/             # dữ liệu mẫu + script seed
│   │   ├── services/         # quyền truy cập dự án, email, Cloudinary, nhật ký hoạt động, dự án hướng dẫn
│   │   ├── app.js            # cấu hình Express, CORS
│   │   ├── instrument.js     # bật Sentry (nếu có SENTRY_DSN)
│   │   └── server.js         # điểm khởi chạy
│   ├── test/                 # unit, HTTP và integration test (npm test)
│   └── .env.example
├── admin/                    # Trang quản trị (deploy thành project Vercel thứ hai)
│   ├── src/
│   │   ├── components/       # khung trang, biểu đồ, nút, hộp thoại
│   │   ├── lib/              # api client, định dạng số và ngày
│   │   └── pages/            # Đăng nhập, Tổng quan, Người dùng, Ảnh Cloudinary
│   ├── vercel.json
│   └── .env.example
├── web/                      # Frontend
│   ├── src/
│   │   ├── components/
│   │   │   ├── auth/         # AuthContext, chặn route, ô nhập, khung trang đăng nhập
│   │   │   ├── dashboard/    # thẻ chào, số liệu, biểu đồ, hoạt động
│   │   │   ├── landing/      # bảng Kanban minh hoạ, bể nước theo thanh cuộn
│   │   │   ├── project/      # Kanban, danh sách, lịch, hộp thoại dự án
│   │   │   ├── shell/        # thanh bên, thanh trên, Ctrl K
│   │   │   ├── pomodoro/     # đồng hồ Pomodoro nổi
│   │   │   ├── task/         # bảng chi tiết, checklist, ảnh đính kèm, bình luận
│   │   │   └── ui/           # nút, hộp thoại, biểu đồ, toast...
│   │   ├── hooks/            # gọi API bằng TanStack Query, cập nhật lạc quan
│   │   ├── lib/              # api client, ngày giờ, hằng số, theme, i18n (i18n-en.js là bản tiếng Anh)
│   │   └── pages/            # Giới thiệu, Đăng nhập, Đăng ký, Quên/Đặt lại mật khẩu, Tổng quan, Dự án, Trang dự án, Việc của tôi, Tài khoản, 404
│   ├── public/               # icon, ảnh og.jpg, manifest, service worker
│   ├── vercel.json
│   └── .env.example
├── .github/workflows/ci.yml  # GitHub Actions: chạy test API (kèm MongoDB) và build web, admin
├── docs/screenshots/         # ảnh chụp màn hình cho README
├── render.yaml               # Blueprint deploy API lên Render
├── DEPLOY.md                 # hướng dẫn deploy từng bước
├── LICENSE                   # giấy phép MIT
└── package.json              # script chạy cả web + api cùng lúc
```

## Chạy ở máy local

Yêu cầu: **Node.js 20+** và một MongoDB (cài local, chạy bằng Docker, hoặc dùng luôn MongoDB Atlas miễn phí như trong [DEPLOY.md](DEPLOY.md)).

```bash
# 1. Cài dependencies cho cả 4 package (root, api, web, admin)
npm run install:all

# 2. Tạo file môi trường
cp api/.env.example api/.env
cp web/.env.example web/.env
cp admin/.env.example admin/.env
#   Windows (PowerShell): Copy-Item api/.env.example api/.env ; Copy-Item web/.env.example web/.env ; Copy-Item admin/.env.example admin/.env

# 3. Sửa MONGODB_URI trong api/.env nếu không dùng MongoDB local

# 4. Seed dữ liệu mẫu (2 tài khoản, 5 dự án, 39 công việc, kèm lịch sử hoạt động)
npm run seed

# 5. Chạy API (cổng 5000), web (cổng 5173) và trang quản trị (cổng 5174)
npm run dev
```

Mở http://localhost:5173 và đăng nhập bằng một trong 2 tài khoản seed:

| Email | Mật khẩu | Dữ liệu |
| --- | --- | --- |
| `demo@taskflow.dev` | `Demo@123456` | 5 dự án mẫu, 39 công việc. Bị khoá đổi tên, đổi mật khẩu, xoá tài khoản |
| `minh@taskflow.dev` | `Minh@123456` | Chỉ 1 dự án hướng dẫn, dùng để thử tính năng tách dữ liệu |

Hoặc bấm **Đăng ký** để tạo tài khoản mới.

Muốn chạy riêng từng phần: `cd api && npm run dev`, `cd web && npm run dev`, `cd admin && npm run dev`.

**Trang quản trị** (http://localhost:5174): thêm email của bạn vào `ADMIN_EMAILS` trong `api/.env` (vd `ADMIN_EMAILS=ban@gmail.com`), khởi động lại API rồi đăng nhập bằng tài khoản đó. Hoặc cấp quyền cho một tài khoản đã đăng ký bằng lệnh `npm run make-admin -- ban@gmail.com` trong `api/` (thêm `--remove` để bỏ quyền).

### Test

```bash
cd api
npm test                       # unit + HTTP test, không cần database
# Có MongoDB thì chạy thêm integration test (database này bị xoá sạch mỗi lần chạy):
MONGODB_URI_TEST=mongodb://127.0.0.1:27017/taskflow_test npm test
```

Mỗi lần push hoặc mở pull request, GitHub Actions (`.github/workflows/ci.yml`) tự dựng MongoDB, chạy toàn bộ test API rồi build web và trang quản trị.

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
| `APP_URL` | `https://taskflow-abc.vercel.app` | Không bắt buộc. Địa chỉ web, dùng tạo link trong email. Bỏ trống thì lấy địa chỉ đầu tiên trong `CORS_ORIGIN` |
| `MAIL_FROM` | `TaskFlow <ban@gmail.com>` | Không bắt buộc. Người gửi email (đã xác minh bên Brevo hoặc Resend) |
| `BREVO_API_KEY` hoặc `RESEND_API_KEY` | | Không bắt buộc. Khoá API gửi email. Thiếu thì tắt quên mật khẩu qua email và email mời |
| `GOOGLE_CLIENT_ID` | `123-abc.apps.googleusercontent.com` | Không bắt buộc. Bật nút Đăng nhập bằng Google |
| `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_UPLOAD_PRESET` | `taskflow`, `taskflow_unsigned` | Không bắt buộc. Bật tải ảnh (ảnh đính kèm, ảnh đại diện). Preset phải ở chế độ **Unsigned** |
| `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | | Không bắt buộc. Cho trang quản trị xem và xoá ảnh. **Không** đưa vào web |
| `ADMIN_EMAILS` | `ban@gmail.com` | Không bắt buộc. Các email luôn là quản trị viên, cách nhau dấu phẩy |
| `SENTRY_DSN`, `SENTRY_TRACES_SAMPLE_RATE` | | Không bắt buộc. Gửi lỗi máy chủ lên Sentry |

Cách lấy từng khoá: xem [DEPLOY.md, phần Tính năng thêm](DEPLOY.md#tính-năng-thêm-không-bắt-buộc).

### web/.env

| Biến | Ví dụ | Ghi chú |
| --- | --- | --- |
| `VITE_API_URL` | `http://localhost:5000` | URL gốc của API, không có `/` ở cuối. Được gắn vào lúc build |
| `VITE_DEMO_EMAIL` | `demo@taskflow.dev` | Không bắt buộc. Cùng với biến dưới, hiện nút "Dùng thử bằng tài khoản demo" |
| `VITE_DEMO_PASSWORD` | `Demo@123456` | Không bắt buộc. Lộ ra trình duyệt, chỉ dùng cho tài khoản demo |
| `VITE_SITE_URL` | `https://taskflow.vercel.app` | Không bắt buộc. Địa chỉ web chính thức, dùng cho ảnh xem trước và sitemap. Trên Vercel tự lấy từ tên miền production nên không cần đặt |
| `VITE_SENTRY_DSN` | | Không bắt buộc. Gửi lỗi giao diện lên Sentry (project React) |
| `VITE_ADMIN_URL` | `https://taskflow-admin.vercel.app` | Không bắt buộc. Tài khoản admin thấy nút "Trang quản trị" trong trang Tài khoản |

Đăng nhập Google và tải ảnh **không** cần biến ở web: web tự đọc cấu hình công khai từ API (`GET /api/config`).

### admin/.env

| Biến | Ví dụ | Ghi chú |
| --- | --- | --- |
| `VITE_API_URL` | `http://localhost:5000` | Giống web. Nhớ thêm địa chỉ trang admin vào `CORS_ORIGIN` của API |
| `VITE_WEB_URL` | `http://localhost:5173` | Không bắt buộc. Hiện nút "Mở TaskFlow" |

### Thêm chữ cần dịch

Mọi chữ hiển thị đều bọc trong `tr('Câu tiếng Việt')` (file `web/src/lib/i18n.js`). Câu tiếng Việt chính là khoá, bản tiếng Anh nằm trong `web/src/lib/i18n-en.js`. Thiếu bản dịch thì web hiện luôn câu tiếng Việt chứ không lỗi. Có biến thì viết `tr('Còn {n} việc', { n })`.

## API

Base URL: `http://localhost:5000/api`. Mọi phản hồi có dạng `{ "data": ... }`, lỗi có dạng `{ "error": { "message", "fields"? } }`.

**Tài liệu đầy đủ, thử gọi được ngay:** mở `/api/docs` (Swagger UI) trên máy chủ, ví dụ http://localhost:5000/api/docs. Bấm **Authorize** và dán token để thử các route cần đăng nhập. File OpenAPI ở `/api/docs.json`.

Trừ `/health`, `/config`, `/docs` và `/auth/register`, `/auth/login`, `/auth/google`, `/auth/forgot-password`, `/auth/reset-password`, mọi endpoint đều cần header `Authorization: Bearer <token>`. Thiếu hoặc sai token trả về `401`.

### Tài khoản

| Method | Endpoint | Mô tả |
| --- | --- | --- |
| POST | `/auth/register` | Đăng ký: `{ name, email, password }` → `{ user, token }` (201). Email trùng trả `409` |
| POST | `/auth/login` | Đăng nhập: `{ email, password }` → `{ user, token }`. Tài khoản bị khoá trả `403` |
| POST | `/auth/google` | Đăng nhập hoặc đăng ký bằng Google: `{ credential }` (ID token từ nút Google) |
| POST | `/auth/forgot-password` | `{ email }`, luôn trả 200. Gửi email có liên kết đặt lại nếu email đã đăng ký |
| POST | `/auth/reset-password` | `{ token, password }` → `{ user, token }` |
| GET | `/auth/me` | Thông tin người đang đăng nhập |
| PATCH | `/auth/me` | Sửa `name`, `avatarColor`, `accentColor` (một trong 10 màu), `avatar` (`''`, `emoji:🐳` hoặc ảnh `data:image/webp;base64,...` dưới 60 KB) |
| POST | `/auth/change-password` | `{ currentPassword, newPassword }` → `{ user, token }`, mọi token cũ mất hiệu lực |
| POST | `/auth/logout-all` | Đăng xuất mọi thiết bị |
| DELETE | `/auth/me` | Xoá tài khoản và toàn bộ dữ liệu: `{ password }` (tài khoản chưa có mật khẩu gửi `{ confirm: email }`) |

Tài khoản demo (`isDemo`) nhận `403` ở 4 endpoint sửa, đổi mật khẩu, đăng xuất mọi thiết bị và xoá.

### Dự án

| Method | Endpoint | Mô tả |
| --- | --- | --- |
| GET | `/projects?archived=false` | Danh sách dự án kèm `stats` (total, open, done, doing, overdue, dueSoon, progress). `archived`: `false` (mặc định), `true`, `all` |
| POST | `/projects` | Tạo dự án: `{ name, description?, color? }` |
| GET | `/projects/:id` | Chi tiết một dự án kèm `stats` |
| PATCH | `/projects/:id` | Sửa `name`, `description`, `color`, `archived` |
| DELETE | `/projects/:id` | Xoá dự án cùng toàn bộ công việc của nó |

| GET | `/projects/:id/members` | Chủ dự án, thành viên và lời mời đang chờ |
| POST | `/projects/:id/members` | Mời: `{ email }`. Có tài khoản thì thêm ngay, chưa có thì lưu lời mời (chỉ chủ dự án) |
| DELETE | `/projects/:id/members/:userId` | Xoá thành viên (chủ dự án) hoặc tự rời dự án (`userId` là chính mình) |
| DELETE | `/projects/:id/invites?email=` | Huỷ lời mời |

Màu hợp lệ: `blue`, `sky`, `cyan`, `teal`, `green`, `amber`, `orange`, `rose`, `violet`, `indigo`. Mỗi dự án trả kèm `role` (`owner` hoặc `member`) và `members`.

### Công việc

| Method | Endpoint | Mô tả |
| --- | --- | --- |
| GET | `/tasks` | Danh sách. Query: `project`, `status` (`todo`, `doing`, `done`, `open`, `overdue`), `priority` (`low`, `medium`, `high`, `urgent`, nhiều giá trị cách nhau dấu phẩy), `due` (`today`, `week`, `overdue`, `none`), `tag`, `search` (tên, mô tả, nhãn), `sort` (`board`, `newest`, `oldest`, `deadline`, `priority`, `updated`, `title`), `tzOffset` |
| GET | `/tasks/tags` | Các nhãn bạn đã dùng kèm số việc: `[{ name, count }]` |
| POST | `/tasks` | Tạo: `{ project, title, description?, status?, priority?, deadline?, checklist?, tags? }` |
| GET | `/tasks/:id` | Chi tiết |
| PATCH | `/tasks/:id` | Sửa một hoặc nhiều trường |
| PATCH | `/tasks/:id/toggle` | Đảo trạng thái xong / chưa xong |
| POST | `/tasks/:id/move` | Kéo thả: `{ status, index }`, đưa việc vào cột `status` ở vị trí `index` |
| DELETE | `/tasks/:id` | Xoá |
| DELETE | `/tasks?status=done&project=<id>` | Dọn các việc đã xong của một dự án |
| GET, POST | `/tasks/:id/comments` | Đọc, viết bình luận: `{ text }` |
| DELETE | `/tasks/:id/comments/:commentId` | Xoá bình luận (người viết hoặc chủ dự án) |
| POST | `/tasks/:id/attachments` | Gắn ảnh đã tải lên Cloudinary: `{ url, publicId?, name?, width?, height?, bytes? }` |
| DELETE | `/tasks/:id/attachments/:attachmentId` | Gỡ ảnh |
| POST | `/tasks/:id/pomodoros` | Ghi lại một phiên tập trung: `{ minutes }` |

`repeat` là một trong `none`, `daily`, `weekdays`, `weekly`, `monthly`: đánh dấu xong một việc lặp lại thì phản hồi có thêm `nextOccurrence: { _id, deadline }` của lần kế tiếp. `checklist` là mảng `[{ text, done }]`, tối đa 50 mục. `tags` là mảng chuỗi, tối đa 8 nhãn, mỗi nhãn 24 ký tự, trùng nhau (không phân biệt hoa thường) sẽ được gộp. `tzOffset` theo quy ước của `Date.getTimezoneOffset()` (Việt Nam là `-420`), dùng để tính "hôm nay" đúng múi giờ.

### Thống kê và hoạt động

| Method | Endpoint | Mô tả |
| --- | --- | --- |
| GET | `/dashboard?tzOffset=-420` | Số liệu trang Tổng quan: tuần này, thẻ số liệu, nhịp hoàn thành 28 ngày, phân bố, tiến độ dự án, việc cần chú ý |
| GET | `/activity?type=all&limit=30` | Nhật ký hoạt động. `type`: `all`, `completed`, `created`, `team` |
| GET | `/export?format=json` | Tải dữ liệu của mình (`json` hoặc `csv`, thêm `lang=en` để tiêu đề cột CSV bằng tiếng Anh) |
| POST | `/import` | Nhập file JSON đã xuất (tối đa 5 MB) |
| GET | `/config` | Cấu hình công khai: Google Client ID, Cloudinary cloud name và upload preset, có bật email không |
| GET | `/health` | Kiểm tra server và kết nối DB |

### Quản trị (chỉ admin)

| Method | Endpoint | Mô tả |
| --- | --- | --- |
| GET | `/admin/stats?tzOffset=-420` | Số liệu toàn hệ thống và các tính năng đang bật |
| GET | `/admin/activity?limit=20` | Hoạt động mới nhất của mọi người dùng |
| GET | `/admin/users?q=&filter=&sort=&page=` | Danh sách người dùng kèm số dự án, công việc |
| PATCH | `/admin/users/:id` | `{ disabled?, role? }` khoá, mở khoá, đổi quyền |
| DELETE | `/admin/users/:id` | Xoá tài khoản và dữ liệu của họ |
| GET | `/admin/images?filter=unused&kind=tasks&q=` | Ảnh trên Cloudinary (thư mục `taskflow/`) kèm nơi đang dùng, dung lượng tài khoản |
| DELETE | `/admin/images` | `{ publicIds, force? }`. Ảnh đang dùng chỉ xoá khi `force: true` (được gỡ khỏi công việc và ảnh đại diện trước) |

## Tác giả

**Duy An**, GitHub [@NayuD06](https://github.com/NayuD06).

Gặp lỗi hoặc có ý tưởng hay? Mở một [issue](https://github.com/NayuD06/TaskFlow/issues) nhé.

## Giấy phép

[MIT](LICENSE). Bạn được xem, dùng lại và sửa code, miễn là giữ lại thông tin bản quyền của tác giả.
