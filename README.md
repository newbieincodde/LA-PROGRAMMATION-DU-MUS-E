# ÉTHÉRÉ Atelier — Mẫu Website Triển Lãm & Portfolio Nghệ Thuật 1-Page (Grand Edition)
### *Triển Lãm Tương Tác 3D Relighting & Unwoven Cinema-Scale Ribbon Loom (Three.js WebGPU / WebGL)*

Chào mừng bạn đến với **ÉTHÉRÉ Atelier (Grand Edition)**, mẫu website nghệ thuật (phòng tranh / portfolio / bảo tàng ảo) thương mại chuẩn quốc tế được thiết kế chuyên biệt để bán trên các sàn như **ThemeForest, Gumroad, Creative Market**.

Mẫu web tái hiện trải nghiệm triển lãm bảo tàng danh giá với chủ đề **"Ánh Sáng Đi Qua Thời Gian"**: người xem cầm một "nguồn sáng ảo" soi vào từng vết đục của phù điêu Assyria 2.800 năm tuổi, từng gờ sơn dầu đắp nổi (impasto) của Van Gogh và Rembrandt, thớ giấy dâu tằm của mộc bản Hokusai, và chiêm ngưỡng tấm thảm dệt Kỳ Lân thế kỷ XV tách thành 26 dải sợi ruy-băng rồi dệt lại trên băng chuyền Cinema-Scale hoành tráng (76vh).

---

## ✦ Điểm Nhấn Công Nghệ & Thương Mại Độc Quyền (Grand Edition)

1. **Quy Mô Bảo Tàng 5 Cánh & 18 Kiệt Tác CC0 (5x Scale Expansion):**
   - Mở rộng từ 6 lên **18 kiệt tác thật** được số hóa Open Access CC0 từ **The Metropolitan Museum of Art** và **Art Institute of Chicago**.
   - 5 cánh trưng bày chuyên biệt: Cổ vật đá Assyria & La Mã, Bậc thầy Sơn dầu Impasto (Van Gogh, Rembrandt, Monet, Cézanne, Vermeer, Seurat), Khắc gỗ Ukiyo-e Hokusai, Thảm dệt Tapestry Phục hưng, và Nghiên cứu quang học đương đại.

2. **Dải Băng Chuyền Dệt Sợi Cinema-Scale (76vh Full-Bleed Ribbon Loom):**
   - Băng chuyền chuyển ảnh liên tiếp `unwoven.js` nâng cấp kích thước màn ảnh rộng (`cardAspect: 0.72`, chiều cao chiếm 76vh), mang lại ấn tượng thị giác choáng ngợp và sang trọng bậc nhất.
   - 26 dải ruy-băng chuyển động hữu cơ với hiệu ứng rách viền (tear zone flutter) và tự dệt lại mượt mà khi cuộn hoặc kéo chuột.

3. **Công Cụ Bảo Tồn & Giám Định Kỹ Thuật Số 3D (Digital Conservation Tools):**
   - **Interactive Torchlight Relighting:** Nguồn sáng ảo tương tác theo chuột với dò tia bóng tự thân 12 bước (12-step self-shadowing raymarch).
   - **Surface Normal Map Mode:** Chuyển đổi hiển thị vector pháp tuyến bề mặt dưới dạng bản đồ phổ màu RGB iridescent.
   - **Macro-Inspection Zoom (1.0x – 2.5x):** Phóng đại siêu vi tế để kiểm tra từng vết nứt vữa fresco và từng gờ sơn dầu impasto.

4. **Trục Thời Gian Lịch Sử Tương Tác (Chronological Timeline Rail):**
   - Dòng thời gian 2.800 năm từ năm 883 TCN đến năm 2026 SCN với 11 cột mốc lịch sử nghệ thuật. Nhấp vào cột mốc để điều hướng và lọc nhanh tác phẩm.

5. **Bộ Lọc Danh Mục & Tìm Kiếm Trực Tiếp (Live Archive Search & Filter):**
   - Thanh tìm kiếm tức thời kết hợp các thẻ chip lọc theo 5 cánh trưng bày, cập nhật danh mục 18 tác phẩm mà không tải lại trang.

6. **Hướng Dẫn Âm Thanh Thủ Tục (Procedural Museum Ambient Drone):**
   - Tích hợp bộ tạo âm nền bảo tàng tĩnh lặng tần số điều hòa ấm 108Hz/162Hz sử dụng native **Web Audio API** (không cần file âm thanh ngoài nặng nề, mặc định tắt để tôn trọng người xem).

7. **Kiến Trúc Đổi Nội Dung "Zero-Code" (Single Source of Truth):**
   - Toàn bộ nội dung triển lãm (tiêu đề, tên phòng, thông tin tác phẩm, số định danh hiện vật, preset ánh sáng, bảng màu) nằm gọn trong **duy nhất 1 file cấu hình**: `assets/data/content.json`.
   - Màu nền trang web (Trắng Ngà `#F4F0E8` / Obsidian `#0B0B0C`) và màu biên shader chia sẻ **cùng một biến duy nhất**.

---

## 📁 Cấu Trúc Thư Mục Chuẩn

```plaintext
/du-an-nhom-x
│-- /assets
│   │-- /data
│   │   └── content.json      # FILE CẤU HÌNH DUY NHẤT: 18 tác phẩm, timeline, màu sắc, preset
│   │-- /images               # 18+ ảnh khuếch tán (Diffuse maps) chuẩn bảo tàng CC0
│   └── /depths               # 18+ bản đồ độ sâu (Depth maps) vi chi tiết tương ứng
│-- /css
│   │-- layout.css            # Lưới bố cục 1-Page, Cinema Loom, Zen Stage, Timeline, Archive
│   └── styles.css            # Hệ thống màu sắc ngà/đen, kiểu chữ Cormorant Garamond, Theme Engine
│-- /js
│   │-- data.js               # Logic truy xuất JSON (map, filter, reduce, search, timeline)
│   │-- logic.js              # Theme engine Sáng/Tối, phát hiện WebGPU/WebGL, Audio guide
│   │-- relighting.js         # Shader 3D Relighting, Surface Normal RGB, Macro Zoom
│   │-- unwoven.js            # Băng chuyền Cinema-Scale 26 dải sợi ruy-băng Unwoven Loom
│   └── main.js               # Bộ điều phối trung tâm kết nối toàn bộ module
│-- index.html                # Giao diện chính 1-Page Fullscreen hoàn chỉnh
│-- CREDITS.md                # Danh mục bản quyền 18 tác phẩm CC0 The Met/AIC & giấy phép MIT
│-- README.md                 # Tài liệu hướng dẫn sử dụng chi tiết cho người mua template
│-- prompt_log.md             # Nhật ký phát triển và tinh chỉnh cùng AI
│-- package.json              # Khai báo thư viện (Three.js, GSAP, Lenis, Vite)
└── start.bat                 # Trình khởi chạy 1-Click cho người dùng Windows
```

---

## 🚀 Hướng Dẫn Khởi Động Website (HOÀN TOÀN KHÔNG CẦN CÀI NODE.JS)

Dự án đã được tích hợp kiến trúc **Zero-Node Standalone**: toàn bộ thư viện Three.js và GSAP đã được đóng gói sẵn trong thư mục `js/vendor/` kết hợp với chuẩn **Native ES Module Import Maps**, cho phép bạn chạy web trên bất kỳ máy tính nào mà **không cần cài đặt Node.js hay gõ lệnh npm**.

### Cách 1: Chạy 1-Click Cực Dễ (Dành cho Windows)
1. Chỉ cần nhấp đúp chuột vào file **`chay-website.bat`** (hoặc **`start.bat`**).
2. Tệp sẽ tự động nhận diện môi trường máy tính của bạn:
   - Nếu có **Python** (đã có sẵn): Khởi động ngay máy chủ nhẹ tại `http://localhost:8000/`.
   - Nếu **không có bất kỳ phần mềm nào**: Tự động dùng máy chủ Windows PowerShell có sẵn trong hệ điều hành.
3. Trình duyệt web mặc định sẽ tự động bật lên và hiển thị triển lãm ngay lập tức!

### Cách 2: Sử dụng VS Code Live Server
Nếu bạn đang mở dự án trong **VS Code**:
1. Nhấp chuột phải vào file `index.html`.
2. Chọn **"Open with Live Server"** (nếu đã cài tiện ích Live Server).

### Cách 3: Đưa lên mạng miễn phí (GitHub Pages / Vercel / Netlify)
Chỉ cần tải toàn bộ thư mục dự án lên GitHub Pages hoặc kéo-thả vào Netlify Drop / Vercel, website sẽ chạy trực tiếp trên Internet 24/7 cho bạn bè và thầy cô cùng xem mà không cần cấu hình máy chủ.

### Cách 4: Dành cho lập trình viên (Nếu muốn dùng Node.js & Vite)
Nếu máy bạn có sẵn Node.js và muốn dùng Vite:
```bash
npm run dev      # Mở dev server tại http://localhost:5173/
npm run build    # Đóng gói tối ưu vào thư mục dist/
```

---

## 🎨 Hướng Dẫn Tùy Biến Triển Lãm (Chỉ sửa file `assets/data/content.json`)

Mọi thông tin đều được cấu hình tập trung trong `assets/data/content.json`:
- **Thêm/bớt tác phẩm:** Thêm một đối tượng vào mảng `artworks` với đường dẫn `image` và `depth`.
- **Đổi bảng màu nền:** Đổi mã Hex trong `theme.light.background` hoặc `theme.dark.background`.
- **Cấu hình Timeline:** Thêm sự kiện lịch sử vào mảng `timelineMilestones`.
- **Preset ánh sáng:** Thêm hoặc đổi màu đèn, cường độ ánh sáng trong mảng `lightPresets`.

---

## 📜 Bản Quyền & Giấy Phép (License)
- Toàn bộ mã nguồn phát hành dưới giấy phép **MIT License**.
- Toàn bộ 18 hình ảnh tác phẩm nghệ thuật thuộc phạm vi công cộng **CC0 (Open Access)** từ The Met và Art Institute of Chicago. Xem chi tiết tại `CREDITS.md`.
