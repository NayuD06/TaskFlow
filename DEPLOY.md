# Hướng dẫn deploy TaskFlow (cho người mới)

Hướng dẫn này đưa TaskFlow lên mạng **miễn phí** bằng 3 dịch vụ. Làm lần lượt từ trên xuống, mỗi bước có phần "Kiểm tra" để chắc chắn đã đúng rồi mới đi tiếp. Lần đầu mất khoảng 30 đến 45 phút.

| Phần | Chạy ở đâu | Vai trò |
| --- | --- | --- |
| Cơ sở dữ liệu | **MongoDB Atlas** | Lưu người dùng, dự án, công việc, hoạt động |
| `api/` | **Render** | Server Express: đăng nhập, kiểm tra quyền, nói chuyện với Atlas |
| `web/` | **Vercel** | Giao diện React mà mọi người mở trên trình duyệt |

```
Trình duyệt ──► Vercel (web) ──gọi API kèm token──► Render (api) ──► MongoDB Atlas
```

**Thứ tự làm:** Atlas → đưa code lên GitHub → Render → Vercel → quay lại Render cho phép Vercel gọi API.

Mỗi người tự đăng ký tài khoản và chỉ thấy dự án, công việc của chính mình. Mật khẩu được mã hoá bằng bcrypt trước khi lưu, đăng nhập dùng JWT.

> Giao diện các trang web này thỉnh thoảng đổi tên nút hoặc vị trí menu. Nếu không thấy đúng chữ như trong hướng dẫn, hãy tìm nút có ý nghĩa tương tự.

---

## Đã deploy bản cũ (chưa có tài khoản)? Làm phần này

Nếu bạn đã seed Atlas và đưa code lên GitHub **trước khi có tính năng tài khoản**, chỉ cần 4 việc. Chưa deploy lần nào thì bỏ qua phần này, làm từ Bước 0.

1. **Thêm biến `JWT_SECRET` trên Render** (bắt buộc, thiếu là API không chạy):
   - Tạo một chuỗi ngẫu nhiên bằng lệnh sau trong PowerShell, copy kết quả:

     ```powershell
     node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
     ```

   - Render → service `taskflow-api` → tab **Environment** → **Add Environment Variable**: Key `JWT_SECRET`, Value là chuỗi vừa tạo → **Save Changes**.
   - Nếu đã tạo service bằng Blueprint thì Render **không** tự thêm biến mới vào service cũ, vẫn phải thêm tay như trên.
2. **Seed lại Atlas**: dữ liệu cũ chưa gắn với người dùng nào nên sẽ không ai nhìn thấy. Làm lại bước 1.5 (lần này lệnh seed sẽ hỏi xác nhận, gõ `yes`).
3. **Đẩy code mới lên GitHub** (bước 2). Render và Vercel tự deploy lại.
4. (Không bắt buộc) Thêm 2 biến `VITE_DEMO_EMAIL` và `VITE_DEMO_PASSWORD` trên Vercel để có nút "Dùng thử bằng tài khoản demo" (xem bước 4), rồi **Redeploy**.

Sau đó kiểm tra theo Bước 6.

---

## Bước 0. Chuẩn bị

Bạn cần:

- Tài khoản **GitHub** (https://github.com). Render và Vercel lấy code từ GitHub.
- **Git** đã cài trên máy. Mở PowerShell gõ `git --version`, ra số phiên bản là được. Chưa có thì tải ở https://git-scm.com.
- **Node.js 20 trở lên**. Gõ `node -v` để kiểm tra.
- Một chỗ để ghi chú tạm (Notepad). Trong lúc làm bạn sẽ có vài thứ cần copy: mật khẩu database, chuỗi kết nối, địa chỉ Render, địa chỉ Vercel.

> **Đừng bao giờ** đưa file `.env` hay mật khẩu lên GitHub. File `.gitignore` của dự án đã chặn sẵn `.env`, bạn chỉ cần không xoá dòng đó.

---

## Bước 1. Tạo database trên MongoDB Atlas

### 1.1. Đăng ký và tạo cluster

1. Vào https://www.mongodb.com/cloud/atlas/register, đăng ký (có thể dùng tài khoản Google).
2. Atlas sẽ hỏi vài câu khảo sát, trả lời tuỳ ý.
3. Ở màn hình tạo cluster (**Deploy your cluster** hoặc **Create**), chọn:
   - Gói **Free** (tên là **M0**).
   - Provider: **AWS**.
   - Region: **Singapore (ap-southeast-1)**, gần Việt Nam và cùng khu vực với Render ở bước sau nên nhanh hơn.
   - Name: để mặc định `Cluster0` cũng được.
4. Bấm **Create Deployment** và đợi 1 đến 3 phút.

### 1.2. Tạo tài khoản database

Atlas thường bật luôn hộp thoại **Connect to Cluster0** sau khi tạo. Nếu không, vào menu bên trái **Database Access** (có thể nằm trong mục **Security**) → **Add New Database User**.

1. Username: `taskflow`
2. Password: bấm **Autogenerate Secure Password**, rồi **Copy** và dán vào Notepad.
   - Nên dùng mật khẩu **chỉ có chữ và số**. Nếu tự đặt mà có ký tự như `@ : / ? # %` thì phải đổi sang dạng mã hoá (xem phần Xử lý lỗi), rất dễ sai.
3. Quyền (Built-in Role): **Read and write to any database**.
4. Bấm **Add User** (hoặc **Create Database User**).

### 1.3. Cho phép kết nối từ mọi nơi

Render bản miễn phí không có địa chỉ IP cố định, nên phải mở cho mọi IP. Dữ liệu vẫn được bảo vệ bằng username và mật khẩu ở trên.

1. Menu trái **Network Access** (trong mục **Security**) → **Add IP Address**.
2. Bấm **Allow Access from Anywhere**, ô địa chỉ sẽ thành `0.0.0.0/0`.
3. Bấm **Confirm**, đợi trạng thái chuyển sang **Active**.

### 1.4. Lấy chuỗi kết nối (connection string)

1. Vào **Database** (hoặc **Clusters**) → ở Cluster0 bấm **Connect** → **Drivers**.
2. Driver: **Node.js**. Copy chuỗi có dạng:

   ```
   mongodb+srv://taskflow:<db_password>@cluster0.abcde.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0
   ```

3. Sửa chuỗi đó trong Notepad:
   - Thay `<db_password>` bằng mật khẩu ở bước 1.2 (xoá cả dấu `<` và `>`).
   - Thêm tên database `taskflow` ngay sau `.mongodb.net/`, trước dấu `?`.

   Kết quả đúng sẽ giống thế này:

   ```
   mongodb+srv://taskflow:MatKhauCuaBan123@cluster0.abcde.mongodb.net/taskflow?retryWrites=true&w=majority&appName=Cluster0
   ```

   Đây là **MONGODB_URI**, sẽ dùng ở bước 1.5 và bước 3.

### 1.5. Đưa dữ liệu mẫu lên Atlas (từ máy bạn)

1. Mở file `api/.env` trên máy (chưa có thì copy từ `api/.env.example`).
2. Sửa dòng `MONGODB_URI=` thành chuỗi ở bước 1.4:

   ```
   MONGODB_URI=mongodb+srv://taskflow:MatKhauCuaBan123@cluster0.abcde.mongodb.net/taskflow?retryWrites=true&w=majority&appName=Cluster0
   ```

3. Mở PowerShell ở thư mục dự án và chạy:

   ```powershell
   cd api
   npm install
   npm run seed
   ```

4. Vì database không nằm trên máy bạn, lệnh seed sẽ hỏi lại cho chắc:

   ```
   [seed] Lệnh này sẽ XOÁ TOÀN BỘ người dùng và dữ liệu trên database đó.
   [seed] Gõ "yes" để tiếp tục:
   ```

   Gõ `yes` rồi Enter.

**Kiểm tra:** Terminal báo seed xong với 5 dự án, 39 công việc và in ra 2 tài khoản đăng nhập thử:

| Email | Mật khẩu | Ghi chú |
| --- | --- | --- |
| `demo@taskflow.dev` | `Demo@123456` | Tài khoản demo công khai, có sẵn 5 dự án mẫu. Bị khoá đổi tên, đổi mật khẩu và xoá tài khoản để không ai phá được |
| `minh@taskflow.dev` | `Minh@123456` | Tài khoản thứ hai chỉ có 1 dự án hướng dẫn, dùng để thử xem dữ liệu 2 người có tách riêng không |

Trên Atlas, vào Cluster0 → **Browse Collections**, thấy database `taskflow` có 4 collection `users`, `projects`, `tasks`, `activities`. Mở `users` sẽ thấy ô `passwordHash` là một chuỗi dài bắt đầu bằng `$2b$12$...`, đó là mật khẩu đã mã hoá, không đọc ngược lại được.

> Mật khẩu 2 tài khoản trên nằm công khai trong code (`api/src/seed/seedData.js`), nên chỉ coi là tài khoản thử. Tài khoản thật của bạn hãy tự **Đăng ký** trên web.
> `npm run seed` **xoá sạch** mọi người dùng và dữ liệu rồi mới thêm dữ liệu mẫu. Khi đã có người dùng thật thì **đừng chạy lại**.
> Muốn database trống hoàn toàn thì chạy `npm run seed:clear`. Người dùng mới đăng ký luôn được tạo sẵn 1 dự án hướng dẫn.

---

## Bước 2. Đưa code lên GitHub

### Trường hợp thư mục đã nối với một repo GitHub

Mở PowerShell ở `E:\DEV\projects\todo-list`, gõ `git remote -v`. Nếu thấy dòng `origin  https://github.com/...` thì thư mục đã có repo, chỉ cần đẩy code mới lên:

```powershell
git add .
git commit -m "TaskFlow: giao diện mới + API dự án"
git push
```

Xong thì chuyển sang phần **Kiểm tra** ở cuối bước này.

### Trường hợp chưa có repo

1. Vào https://github.com/new, đặt tên repo, ví dụ `taskflow`. Chọn **Private** hoặc **Public** tuỳ bạn. **Không** tick "Add a README" (dự án đã có sẵn).
2. Bấm **Create repository**. GitHub hiện ra địa chỉ repo dạng `https://github.com/<tên-bạn>/taskflow.git`.
3. Mở PowerShell ở thư mục `E:\DEV\projects\todo-list` và chạy lần lượt:

   ```powershell
   git init
   git add .
   git commit -m "TaskFlow: web + api"
   git branch -M main
   git remote add origin https://github.com/<tên-bạn>/taskflow.git
   git push -u origin main
   ```

   Lần đầu push, Git sẽ mở cửa sổ đăng nhập GitHub, cứ đăng nhập là được.

**Kiểm tra:** Mở repo trên GitHub thấy 2 thư mục `api`, `web` và các file `render.yaml`, `README.md`, `DEPLOY.md`. **Không** được thấy file `.env` nào (chỉ có `.env.example`).

---

## Bước 3. Deploy API lên Render

1. Vào https://render.com → **Get Started**, đăng ký bằng **GitHub** cho tiện.
2. Cho phép Render đọc repo của bạn khi được hỏi (chọn đúng repo `taskflow` hoặc cho phép tất cả).

Có 2 cách, chọn **một**:

### Cách A (nhanh): dùng Blueprint có sẵn

Dự án đã có file `render.yaml` mô tả sẵn cấu hình.

1. Trên Render bấm **New +** → **Blueprint**.
2. Chọn repo `taskflow`, bấm **Connect**.
3. Render đọc `render.yaml` và hỏi 2 biến:
   - `MONGODB_URI`: dán chuỗi ở bước 1.4.
   - `CORS_ORIGIN`: tạm điền `http://localhost:5173` (sẽ sửa ở bước 5).

   Biến `JWT_SECRET` được Render **tự sinh** chuỗi ngẫu nhiên, bạn không cần làm gì.
4. Bấm **Apply** (hoặc **Deploy Blueprint**).

### Cách B: tạo Web Service thủ công

1. **New +** → **Web Service** → chọn repo `taskflow`.
2. Điền:

   | Ô | Giá trị |
   | --- | --- |
   | Name | `taskflow-api` |
   | Region | **Singapore** |
   | Branch | `main` |
   | Root Directory | `api` |
   | Runtime / Language | **Node** |
   | Build Command | `npm ci` |
   | Start Command | `npm start` |
   | Instance Type | **Free** |

3. Kéo xuống **Environment Variables**, bấm **Add Environment Variable** 4 lần:

   | Key | Value |
   | --- | --- |
   | `NODE_ENV` | `production` |
   | `MONGODB_URI` | chuỗi ở bước 1.4 |
   | `CORS_ORIGIN` | `http://localhost:5173` (tạm thời) |
   | `JWT_SECRET` | một chuỗi ngẫu nhiên dài, tạo bằng lệnh bên dưới |

   Tạo `JWT_SECRET` bằng PowerShell rồi copy kết quả (96 ký tự):

   ```powershell
   node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
   ```

   - `JWT_SECRET` là khoá để ký token đăng nhập. Ai có khoá này có thể giả mạo đăng nhập, nên **không** gửi cho ai, **không** đưa lên GitHub.
   - Đổi khoá này thì mọi người đang đăng nhập sẽ bị đăng xuất (đăng nhập lại là được), dữ liệu không mất.
   - Có thể thêm `JWT_EXPIRES_IN` = `7d` để chỉnh thời hạn đăng nhập (mặc định 7 ngày, ví dụ `30d`, `12h`).

   **Không** cần thêm `PORT`, Render tự cấp.

4. Mở **Advanced**, ô **Health Check Path** điền `/api/health`.
5. Bấm **Create Web Service** (hoặc **Deploy Web Service**).

### Kiểm tra API

1. Đợi tab **Logs** chạy xong (2 đến 5 phút) và thấy dòng:

   ```
   [api] TaskFlow API chạy tại http://localhost:10000
   ```

   (Số cổng do Render cấp, khác 5000 là bình thường.)

2. Ở đầu trang service có địa chỉ dạng `https://taskflow-api-xxxx.onrender.com`. Copy vào Notepad, đây là **địa chỉ API**.
3. Mở trình duyệt vào `https://taskflow-api-xxxx.onrender.com/api/health`, phải thấy:

   ```json
   { "status": "ok", "db": "connected", "uptime": 12 }
   ```

4. Thử thêm `https://taskflow-api-xxxx.onrender.com/api/projects`, phải thấy báo lỗi cần đăng nhập. Đúng như vậy là tốt: dữ liệu đã được bảo vệ, không ai xem được nếu chưa đăng nhập.

   ```json
   { "error": { "message": "Bạn cần đăng nhập để tiếp tục" } }
   ```

> **Render bản miễn phí "ngủ"** sau khoảng 15 phút không có ai dùng. Lần mở đầu tiên sau đó sẽ mất 30 đến 60 giây để thức dậy. Trong lúc đó web TaskFlow hiện màn hình chờ "Đang tải TaskFlow..." và tự thử lại vài lần. Nếu vẫn chưa được sẽ hiện "Không kết nối được tới máy chủ" kèm nút **Thử lại**, đợi một chút rồi bấm là được.

---

## Bước 4. Deploy web lên Vercel

1. Vào https://vercel.com/signup, chọn **Continue with GitHub**.
2. Bấm **Add New...** → **Project**.
3. Tìm repo `taskflow` → **Import** (nếu không thấy, bấm **Adjust GitHub App Permissions** để cho phép Vercel đọc repo).
4. Ở màn hình cấu hình:
   - **Root Directory**: bấm **Edit** → chọn thư mục **`web`** → **Continue**. Đây là bước hay bị quên nhất.
   - **Framework Preset**: Vercel tự nhận **Vite**. Build Command và Output Directory để mặc định (file `web/vercel.json` đã cấu hình sẵn `npm run build` và `dist`).
   - Mở **Environment Variables**, thêm:

     | Key | Value |
     | --- | --- |
     | `VITE_API_URL` | địa chỉ API ở bước 3, ví dụ `https://taskflow-api-xxxx.onrender.com` |
     | `VITE_DEMO_EMAIL` | `demo@taskflow.dev` (không bắt buộc) |
     | `VITE_DEMO_PASSWORD` | `Demo@123456` (không bắt buộc) |

     - `VITE_API_URL`: không có dấu `/` ở cuối, **không** thêm `/api`.
     - 2 biến `VITE_DEMO_...` làm hiện nút **Dùng thử bằng tài khoản demo** ở trang đăng nhập, để người xem bấm vào là dùng được ngay, khỏi đăng ký. Không thêm thì không có nút đó. Chỉ điền tài khoản demo, **không** điền tài khoản thật vì mọi biến `VITE_` đều bị lộ ra trình duyệt.

5. Bấm **Deploy**, đợi khoảng 1 phút.
6. Xong sẽ có địa chỉ dạng `https://taskflow-xxxx.vercel.app` (xem ở mục **Domains** của project). Copy vào Notepad, đây là **địa chỉ web**.

Lúc này mở web lên sẽ thấy báo **không kết nối được API**. Đó là vì API chưa cho phép địa chỉ Vercel gọi tới. Làm tiếp bước 5.

---

## Bước 5. Cho phép web gọi API (sửa CORS_ORIGIN)

1. Quay lại Render → service `taskflow-api` → tab **Environment**.
2. Sửa `CORS_ORIGIN` thành địa chỉ web ở bước 4, ví dụ:

   ```
   https://taskflow-xxxx.vercel.app
   ```

   - Phải có `https://`, **không** có `/` ở cuối.
   - Muốn các bản preview của Vercel (mỗi lần push nhánh khác) cũng gọi được API, thêm dấu phẩy và mẫu có dấu `*`:

     ```
     https://taskflow-xxxx.vercel.app,https://taskflow-*.vercel.app
     ```

   - Muốn vừa chạy local vừa dùng chung API thì thêm `,http://localhost:5173`.

3. Bấm **Save Changes** (chọn **Save, rebuild, and deploy** nếu được hỏi). Render sẽ tự khởi động lại, đợi 1 đến 2 phút.

---

## Bước 6. Kiểm tra lần cuối

Mở địa chỉ web ở bước 4:

- [ ] Chưa đăng nhập thì thấy **trang giới thiệu** (có nút Bắt đầu miễn phí, Đăng nhập, Dùng thử bản demo). Bấm F5 ở bất kỳ trang nào cũng không bị lỗi 404.
- [ ] Đăng nhập bằng `demo@taskflow.dev` / `Demo@123456`: trang **Tổng quan** hiện lời chào kèm tên, quả cầu nước, số liệu và biểu đồ.
- [ ] Vào **Dự án** thấy 5 dự án mẫu, mở một dự án thấy bảng Kanban.
- [ ] Kéo một thẻ sang cột khác, tải lại trang (F5) thẻ vẫn ở chỗ mới.
- [ ] Đang ở trang một dự án mà bấm F5 vẫn mở bình thường (không ra lỗi 404), vẫn còn đăng nhập.
- [ ] Bấm **Đăng xuất** (góc dưới thanh bên trái), rồi **Đăng ký** một tài khoản mới: chỉ thấy 1 dự án hướng dẫn, **không** thấy 5 dự án của tài khoản demo.
- [ ] Đăng nhập sai mật khẩu thì báo "Email hoặc mật khẩu không đúng".
- [ ] Mở trên điện thoại vẫn dùng được.

Xong rồi đó! Gửi địa chỉ Vercel cho bạn bè xem thôi.

---

## Cập nhật code sau này

- Sửa code trên máy → `git add .` → `git commit -m "mô tả thay đổi"` → `git push`. Render và Vercel **tự deploy lại** sau vài phút.
- Đổi `VITE_API_URL` trên Vercel thì phải build lại mới có tác dụng (biến này được gắn vào lúc build): vào **Deployments** → bấm `...` ở bản mới nhất → **Redeploy**.
- Đổi biến môi trường trên Render thì Render tự khởi động lại.

---

## Xử lý lỗi thường gặp

| Hiện tượng | Nguyên nhân hay gặp | Cách sửa |
| --- | --- | --- |
| Web báo "Không kết nối được tới máy chủ" ngay lần đầu mở trong ngày | Render đang ngủ | Đợi 30 đến 60 giây rồi bấm **Thử lại** |
| Vẫn báo không kết nối được, bấm F12 → tab **Console** thấy chữ `blocked by CORS policy` | `CORS_ORIGIN` trên Render không khớp địa chỉ web | Sửa lại đúng như bước 5: có `https://`, không có `/` cuối, đúng tên miền Vercel |
| Console thấy gọi tới `http://localhost:5000` | Thiếu hoặc sai `VITE_API_URL` trên Vercel | Thêm hoặc sửa biến, rồi **Redeploy** |
| Console thấy gọi tới `.../api/api/...` | `VITE_API_URL` bị thừa `/api` | Bỏ `/api` ở cuối, rồi **Redeploy** |
| Logs Render: `Không kết nối được MongoDB: bad auth` hoặc `Authentication failed` | Sai username hoặc mật khẩu trong `MONGODB_URI` | Kiểm tra lại bước 1.2 và 1.4, nhớ xoá dấu `< >` |
| Logs Render: `Server selection timed out` hoặc `connection timed out` | Atlas chưa mở `0.0.0.0/0` | Làm lại bước 1.3, đợi trạng thái **Active** |
| Logs Render: `querySrv ENOTFOUND` | Sai phần địa chỉ cluster trong chuỗi kết nối | Copy lại chuỗi ở bước 1.4 |
| Mật khẩu có ký tự đặc biệt và kết nối lỗi | Ký tự `@ : / ? # %` làm hỏng chuỗi | Đổi mật khẩu chỉ có chữ và số (Database Access → Edit → Edit Password), hoặc mã hoá: `@` → `%40`, `:` → `%3A`, `/` → `%2F`, `?` → `%3F`, `#` → `%23`, `%` → `%25` |
| Logs Render: `Thiếu biến môi trường: MONGODB_URI` | Chưa khai báo biến | Thêm `MONGODB_URI` ở tab **Environment** |
| `/api/health` trả về `"db": "disconnected"` | API chạy nhưng mất kết nối DB | Xem các dòng về MongoDB ở trên |
| Render build lỗi ở `npm ci` | Thiếu file `api/package-lock.json` trên GitHub | Chạy `npm install` trong `api/`, commit file `package-lock.json` rồi push |
| Render báo không tìm thấy `package.json` | Root Directory chưa đặt là `api` | Settings → **Root Directory** = `api` |
| Vercel build lỗi hoặc ra trang trắng | Root Directory chưa đặt là `web` | Project → Settings → **Build and Deployment** → Root Directory = `web`, rồi Redeploy |
| Web chạy nhưng không có dữ liệu | Chưa seed lên Atlas | Làm bước 1.5 |
| Logs Render: `Thiếu biến môi trường: JWT_SECRET` | Chưa khai báo khoá ký token | Thêm `JWT_SECRET` ở tab **Environment** (cách tạo ở bước 3, cách B) |
| Logs Render: `JWT_SECRET quá ngắn hoặc là khoá mặc định` | Khoá dưới 32 ký tự | Tạo lại bằng lệnh `node -e ...` ở bước 3 |
| Đăng nhập tài khoản demo báo "Email hoặc mật khẩu không đúng" | Atlas vẫn là dữ liệu cũ, chưa có người dùng | Seed lại theo bước 1.5 |
| Đăng nhập được nhưng không thấy dự án cũ nào | Dữ liệu tạo trước khi có tài khoản chưa gắn chủ sở hữu | Seed lại theo bước 1.5 (dữ liệu cũ sẽ bị xoá) |
| Đang dùng thì bị đá ra trang đăng nhập, báo "Phiên đăng nhập đã hết hạn" | Token hết hạn (mặc định 7 ngày), vừa đổi `JWT_SECRET`, vừa đổi mật khẩu hoặc bấm "Đăng xuất mọi thiết bị" | Đăng nhập lại. Đây là cơ chế bảo mật, không phải lỗi |
| Báo "Bạn thử quá nhiều lần. Hãy đợi khoảng 15 phút" | Nhập sai mật khẩu hơn 10 lần trong 15 phút (chống dò mật khẩu) | Đợi 15 phút. Khởi động lại service trên Render cũng xoá bộ đếm |
| Không thấy nút "Dùng thử bằng tài khoản demo" | Thiếu `VITE_DEMO_EMAIL` hoặc `VITE_DEMO_PASSWORD` trên Vercel | Thêm 2 biến rồi **Redeploy** |
| Trang Tài khoản không cho đổi mật khẩu, đổi tên | Đang dùng tài khoản demo (bị khoá có chủ ý) | Đăng ký tài khoản riêng |

Mẹo: hầu hết lỗi đều thấy được ở 2 chỗ. **Logs** của service trên Render (lỗi phía API, database) và **F12 → Console / Network** trên trình duyệt (lỗi phía web, CORS, sai địa chỉ).

---

## Bảo mật đã có sẵn

Để bạn tự tin đưa link cho mọi người dùng:

- **Mật khẩu** mã hoá một chiều bằng bcrypt (12 vòng). Database bị lộ thì cũng không đọc được mật khẩu gốc.
- **Đăng nhập** bằng JWT ký bằng `JWT_SECRET`, hết hạn sau 7 ngày. Đổi mật khẩu hoặc bấm "Đăng xuất mọi thiết bị" thì mọi token cũ mất hiệu lực ngay.
- **Dữ liệu tách riêng**: mọi truy vấn đều lọc theo người đang đăng nhập. Biết ID dự án của người khác cũng không xem hay sửa được (trả về 404).
- **Chống dò mật khẩu**: tối đa 10 lần đăng nhập/đăng ký sai trong 15 phút cho mỗi IP. Toàn bộ API giới hạn 1000 yêu cầu trong 15 phút.
- **Kiểm tra dữ liệu gửi lên** ở cả trình duyệt lẫn server (email hợp lệ, mật khẩu 8 ký tự trở lên có cả chữ và số, giới hạn độ dài).
- **Helmet** thêm các header bảo mật, **CORS** chỉ cho địa chỉ web của bạn gọi API.
- Báo lỗi đăng nhập chung chung ("Email hoặc mật khẩu không đúng") để người lạ không dò được email nào đã đăng ký.

Việc bạn cần giữ: không đưa `.env` hay `JWT_SECRET` lên GitHub, và không chạy lại `npm run seed` khi đã có người dùng thật.

---

## Chi phí

Cả 3 dịch vụ đều có gói miễn phí đủ cho dự án cá nhân (điều khoản có thể thay đổi theo thời gian, nên xem lại trang giá của từng bên):

- **MongoDB Atlas M0**: miễn phí, dung lượng khoảng 512 MB, quá đủ cho hàng chục nghìn công việc.
- **Render Free**: miễn phí, server ngủ sau khoảng 15 phút không dùng.
- **Vercel Hobby**: miễn phí cho dự án cá nhân, không dùng cho mục đích thương mại.
