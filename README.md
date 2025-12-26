### SecManager

Ứng dụng desktop (Tauri + React) để duyệt, chỉnh sửa và tự động hoá secret trong AWS Secrets Manager. UI dùng React 19, TailwindCSS 4, DaisyUI 5, CodeMirror 6 và Zustand; backend native viết bằng Rust/AWS SDK (Tauri 2) nên chạy được trên macOS, Windows và Linux.

### Tải ứng dụng

**Phiên bản mới nhất: v0.0.19**

- **macOS (Apple Silicon)**: [Tải Secrets Manager 0.0.19 (aarch64)](https://secrets-manager.dung.io.vn/releases/darwin/aarch64/0.0.19/Secrets%20Manager.app.tar.gz)
- **Windows (x86_64)**: [Tải Secrets Manager 0.0.19 (x64)](https://secrets-manager.dung.io.vn/releases/windows/x86_64/0.0.19/Secrets%20Manager_0.0.19_x64_en-US.msi)
- **Linux (x86_64)**: [Tải Secrets Manager 0.0.19 (AppImage)](https://secrets-manager.dung.io.vn/releases/linux/x86_64/0.0.19/secrets-manager_0.0.19_amd64.AppImage)

> **Lưu ý**: Ứng dụng hỗ trợ tự động cập nhật sau khi cài đặt. Chỉ cần tải thủ công khi cài lần đầu hoặc downgrade phiên bản.

### Công nghệ chính
- **Frontend**: React 19 + Vite + Tailwind 4 + DaisyUI, CodeMirror 6 cho editor, Zustand quản lý state, Lucide icons, Bun làm package manager kiêm task runner.
- **Desktop shell**: Tauri 2 với plugin dialog/fs/updater/process/opener/os/global-shortcut. Theme và trạng thái UI được lưu bằng `@tauri-apps/api`.
- **Backend (Rust)**: AWS SDK for Rust (Secrets Manager + STS), async command/event `secret_fetch_ok/error`, cơ chế cache và updater signer.
- **Build tooling**: `bun run dev|build`, `bun tauri ...`, script `scripts/sync-version.mjs` để đồng bộ version giữa `package.json` và `src-tauri/Cargo.toml`.

### Tính năng nổi bật
#### Quản lý profile & SSO
- Tự đọc toàn bộ profile trong `~/.aws/config` + `~/.aws/credentials`, tự chọn default khi có sẵn (hoặc auto pick profile đầu tiên).
- Cho phép đặt lại `default_profile`, lưu tại `~/.config/secmanager/settings.json`.
- Hiển thị trạng thái SSO realtime (Valid/Invalid/Checking) và nút kiểm tra lại. Nếu chưa login, app mở `aws sso login --profile <name>` và poll STS cho tới khi hợp lệ (hoặc timeout) rồi emit event về UI.

#### Thanh bên trái (Profiles, Bookmarks, Recent, Version)
- Bookmarks lưu riêng cho từng profile (`~/.config/secmanager/bookmarks_<profile>.json`), có thể xoá từng mục hoặc clear toàn bộ.
- Recent secrets (tối đa 20) lấy từ lần `Get` gần nhất (`recent_secrets.json`), có nút convert sang bookmark hoặc clear.
- Thông tin phiên bản + nút "Check update" gọi `useUpdaterStore.initCheck` để kiểm tra qua plugin updater (có defer counter dựa trên số lần mở app).

#### Trình duyệt secrets (panel phải)
- Secret tree được build từ danh sách tên theo dấu `/`, có thể collapse toàn bộ, resize panel, ẩn/hiện panel bằng nút trên main layout.
- Cache tên secret + metadata nhị phân/JSON theo profile (`secrets_<profile>.json`, `secrets_meta_<profile>.json`) để mở app nhanh; Force reload sẽ bỏ cache và fetch mới.
- Ô tìm kiếm realtime (debounce 250 ms) hiển thị kết quả dạng danh sách + badge `JSON/BINARY` + nút Get.
- Tab Deleted secrets (toggle icon Trash) gọi `list_deleted_secrets` và có nút Restore từng item (gọi `restore_secret`).

#### Editor đa tab và thao tác nâng cao
- Mỗi secret mở trong một tab riêng, tiêu đề tự rút gọn theo common prefix; tab đang chứa chuỗi `prod` sẽ hiện badge cảnh báo.
- `Get` tải nội dung qua event async, JSON tự pretty-print, binary hiển thị base64 (hoặc ẩn khi >50 KB).
- Toolbar hỗ trợ Copy toàn bộ, Copy theo key (tối đa 200 key từ JSON), Export JSON, toggle wrap, toggle decode base64, Clone secret, Edit/Delete, Save/Cancel.
- Chế độ tạo mới (`New JSON Secret`) tự sinh skeleton `{\n  ""\n}` và focus vào editor. Clone giữ nguyên nội dung + binary state để nhân bản nhanh.
- Delete sử dụng `aws delete_secret` với recovery window mặc định; sau khi xoá tab hiện tại được đóng và danh sách được reload.

#### Workflow dành cho binary & import
- Có thể import file qua nút `Import Binary Secret` hoặc kéo-thả trực tiếp vào cửa sổ (hỗ trợ JSON hoặc file nhị phân). App tự parse JSON (kể cả format `{"secretId": "...", "content": ...}`) hoặc encode base64 cho binary.
- Khi import binary, editor chuyển sang `BinaryImportPanel` hiển thị tên/size file, cho phép push secret trực tiếp (và chọn có tạo Argo template hay không).
- Secret binary > 50 KB không render inline: UI hiển thị `BinaryTooLargePanel` với nút Export (fetch lại từ AWS và lưu ra file).

#### ArgoCD External Secret template
- Checkbox “Create ArgoCD External Secret” trong toolbar/binary panel sẽ mở modal template ngay sau khi Save thành công.
- Nút “Copy template” luôn sẵn sàng khi có `secretId`; modal cho phép copy hoặc export `.yaml`. Template sử dụng mặc định `aws-cluster-secret-store` và sinh tên `*-es`/`*-secret`, logic riêng cho binary (secretKey lấy theo tên file).

#### Logs, theme và update
- Logs panel (draggable divider) hiển thị tối đa 500 dòng với timestamp, filter theo level/text, copy filtered logs, auto-scroll toggle.
- Theme switcher (light/dark) nằm trên thanh tiêu đề, trạng thái lưu vào settings.
- UI nhớ trạng thái sidebar trái/phải, chiều rộng panel phải, hight logs,… thông qua Zustand store.

### Yêu cầu hệ thống
- AWS CLI v2, đã cấu hình profile và (nếu dùng) SSO federation (`aws configure --profile <name>` và `aws sso login`).
- Bun ≥1.1 (hoặc Node 20 + npm nếu muốn, nhưng repo dùng Bun lockfile).
- Rust (toolchain stable) + Tauri prerequisites:  
  - macOS: Xcode Command Line Tools.  
  - Windows: MSVC build tools + `winget install tauri-deps`.  
  - Linux: `libwebkit2gtk-4.1-dev libgtk-3-dev libayatana-appindicator3-dev librsvg2-dev` (đã được script CI cài mẫu).
- Quyền truy cập Secrets Manager/STS tương ứng với profile sử dụng.

### Thiết lập & chạy
1. Cài dependencies rồi chạy cài đặt:
   ```bash
   bun install
   ```
2. Chạy web preview (Vite):
   ```bash
   bun run dev
   ```
3. Chạy app Tauri (chọn script phù hợp OS):
   ```bash
   bun run dev:mac      # macOS
   bun run dev:windows  # Windows
   bun run dev:linux    # Linux
   ```
4. Build bundle:
   ```bash
   bun run build          # build frontend (ra dist/)
   bun run build:mac      # Tauri bundle macOS (app + dmg + updater tar.gz)
   bun run build:windows  # bundle .msi + .exe updater
   bun run build:linux    # AppImage
   ```
5. Đồng bộ version (tự cập nhật cả Rust + package.json):
   ```bash
   bun run bump:patch     # hoặc bump:minor / bump:major
   ```

### Hướng dẫn sử dụng nhanh (UI)
1. Mở app → sidebar trái sẽ hiện danh sách profile và trạng thái SSO. Chọn profile, nhấn “Set default” nếu muốn lưu.
2. Bấm “Check” để xác thực SSO; nếu hết hạn, app sẽ mở browser cho bạn login, logs panel hiển thị tiến trình.
3. Sử dụng nút `Get` trong TopBar để tải secret theo ID, hoặc chọn từ tree/search panel bên phải. Force reload nếu muốn bỏ cache.
4. Dùng toolbar để Edit/Clone/Delete. Khi Edit, nội dung chuyển sang CodeMirror; Save gọi `update_secret`, Create gọi `create_secret`.
5. Import file bằng nút Upload hoặc kéo-thả. Với binary nhỏ, bạn có thể xem base64 và bật decoded view; với binary lớn, export bằng panel riêng.
6. Tick “Create ArgoCD External Secret” nếu muốn xem template ngay khi lưu. Có thể copy template bất kỳ lúc nào từ toolbar.
7. Thêm secret vào Bookmarks/Recent từ sidebar trái để truy cập nhanh. Logs panel cho phép filter, copy và clear trong quá trình thao tác.

### Lưu cache & dữ liệu cục bộ
- `~/.config/secmanager/settings.json` (Linux/macOS) hoặc `%APPDATA%\secmanager\settings.json` (Windows): theme, default profile, open_count (phục vụ updater defer).
- `secrets_<profile>.json`: cache danh sách tên.
- `secrets_meta_<profile>.json`: metadata JSON/BINARY thu được khi fetch.
- `bookmarks_<profile>.json`, `recent_secrets.json`: danh sách bookmark & recent.
- Force reload sẽ xoá cache tên/metadata trước khi fetch; bookmark/recent chỉ xoá khi người dùng chọn “Clear”.

### CI/CD
- `ci.yml`: chạy khi `workflow_dispatch` hoặc tag `v*`. Pipeline gồm:
  - Frontend type-check (`bun install`, `bun run build`).
  - `cargo fmt`, `cargo clippy`, `cargo test` + `cargo check --release` cho phần Rust.
- `build.yml`: build đa nền tảng (macOS aarch64, Windows x86_64, Linux x86_64). Sau khi `bun run generate:icon` và `tauri-action` tạo bundle, workflow ký binaries, sinh `latest.json` cho updater và tải lên Cloudflare R2 (dùng secrets `CF_R2_*`). Bước cuối có thể tạo GitHub Release.
