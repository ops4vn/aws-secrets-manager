### SecManager

Ứng dụng desktop quản lý AWS Secrets Manager với giao diện dựa trên React + TailwindCSS + DaisyUI.

### Tính năng chính
- **Profiles**: Tự động tải danh sách `aws config` profiles, cho phép chọn và đặt profile mặc định.
- **SSO Check**: Kiểm tra trạng thái SSO qua STS. Nếu chưa hợp lệ, tự mở `aws sso login` trong trình duyệt và polling tới khi hợp lệ hoặc timeout.
- **List Secrets (có cache)**:
  - Lưu cache danh sách secrets theo profile (file `~/.config/secmanager/secrets_<profile>.json`).
  - Khi khởi động app, nếu có `default_profile` và cache tồn tại, tự hiển thị danh sách từ cache.
  - Nút "📋 List Secrets": ưu tiên dùng cache (nếu có); nếu chưa có cache thì fetch từ AWS.
  - Nút "🔄 Force Reload": bỏ qua cache và fetch danh sách từ AWS, sau đó ghi đè cache.
- **Tree View**: Hiển thị secret names dạng cây theo dấu `/`. Chỉ fetch nội dung khi chọn nút lá (leaf).
- **Search**: Ô tìm kiếm realtime trên panel phải; lọc và hiển thị kết quả theo mức độ khớp (không phân biệt hoa thường).
- **View/Get**: Lấy nội dung secret; nếu là JSON sẽ auto pretty print; nếu là binary sẽ hiển thị base64.
- **Edit/Create**: 
  - "📝 Edit": bật chế độ chỉnh sửa nội dung hiện tại.
  - "➕ New Secret": chuyển sang chế độ tạo secret mới; nút Delete tự động disable trong chế độ này.
  - "💾 Save": gọi `update_secret` khi đang edit; gọi `create_secret` khi trong chế độ tạo mới.
- **Error messages (English)**: Chuẩn hóa thông điệp lỗi thân thiện cho các tình huống thường gặp (duplicate ID, not found, invalid params, network/timeout...).
- **Logs & Status**: Log theo thời gian thực và thanh trạng thái ở panel dưới.

### Yêu cầu hệ thống
- Đã cấu hình AWS CLI và profiles (`~/.aws/config`, `~/.aws/credentials`).
- Đối với SSO: AWS CLI v2 và quyền truy cập theo tổ chức.

### Cách chạy
- Debug:
```bash
cargo run
```
- Release:
```bash
cargo build --release
./target/release/secmanager
```

### Hướng dẫn sử dụng nhanh
1. Mở ứng dụng, chọn profile (hoặc dùng `default_profile` nếu đã lưu trước đó).
2. Bấm "📋 List Secrets" để hiển thị danh sách (ưu tiên cache). Dùng "🔄 Force Reload" để cập nhật từ AWS.
3. Sử dụng ô "🔍 Search" để lọc nhanh theo tên.
4. Chọn secret trong tree (tại leaf) để tải nội dung.
5. Bấm "📝 Edit" để sửa, sau đó "💾 Save" để cập nhật AWS; hoặc bấm "➕ New Secret" để tạo mới.
6. Theo dõi trạng thái và log ở panel dưới.

### Caching
- Vị trí cache: `~/.config/secmanager/secrets_<profile>.json` (Linux/macOS) hoặc đường dẫn tương ứng trên Windows theo tiêu chuẩn thư mục config.
- Cache chỉ lưu danh sách tên secrets (không lưu nội dung).
- Có thể làm mới bằng nút "🔄 Force Reload".

### Đóng gói macOS (.app, .dmg)
- Script: `scripts/macos_bundle.sh`
- Cách dùng:
```bash
VERSION=0.1.0 ./scripts/macos_bundle.sh
```
- Kết quả tại thư mục `dist/`:
  - `SecManager.app`
  - `SecManager-<VERSION>.dmg` (mở DMG và kéo thả vào Applications)
- Icon: đặt file `assets/icon.icns` (script tự thêm vào Info.plist nếu có).

### Windows (ẩn console)
- Ứng dụng bản release ẩn cửa sổ console nhờ cấu hình subsystem GUI:
  - Áp dụng qua dòng lệnh cấu hình ở đầu `src/main.rs`:
```rust
#![cfg_attr(all(windows, not(debug_assertions)), windows_subsystem = "windows")]
```

### CI/CD
- GitHub Actions:
  - `/.github/workflows/ci.yml`: lint (fmt, clippy) và test.
  - `/.github/workflows/build.yml`: build đa nền tảng (Windows, macOS x64/ARM64, Linux x64) và tạo artifact/release khi tag `v*`.

### Ghi chú
- Nút Delete hiện đang disable khi trong chế độ tạo mới secret.
- Nội dung secret dạng JSON sẽ được pretty print tự động khi fetch.
- Binary secret hiển thị dưới dạng base64 và có thể sao chép trực tiếp.

