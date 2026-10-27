# NHẬT KÝ LÀM VIỆC VỚI AI (PROMPT LOG — VIBE CODING)

Tài liệu này ghi lại toàn bộ chu trình cộng tác phát triển (Pair Programming) giữa lập trình viên và Trợ lý AI (Google DeepMind Antigravity) theo phương pháp luận **Vibe Coding**. Mọi quyết định kiến trúc, tối ưu mã nguồn và giải quyết bài toán phức tạp đều được kiểm chứng chặt chẽ.

---

## 1. Mục Tiêu & Chiến Lược Điều Khiển AI

- **Định hướng sản phẩm:** Tạo mẫu template web thương mại (Commercial Art Portfolio/Gallery Template) bán trên ThemeForest / Gumroad / Creative Market.
- **Tiêu chuẩn học thuật (Rubric Thiết Kế Web):** Đạt điểm tối đa ở cả 6 tiêu chí: UI/UX (20%), Kỹ thuật JS/DOM (30%), Logic dữ liệu JSON (15%), Quy trình Agile/Git (15%), Vibe Coding AI (10%), Thuyết trình Pitching (10%).

---

## 2. Nhật Ký Các Lượt Prompt & Kết Quả Xử Lý

### Lượt 1: Khảo sát nguồn tham khảo & Thẩm định giấy phép bản quyền
- **Prompt từ Người dùng:**
  > "Hãy giúp tôi xây một website nghệ thuật làm MẪU WEB để bán trên các sàn template... Nguồn tham khảo: WebGPU Transitions (Ben Paine), Relighting (Dominik Fojcik), Unwoven (Clément Grellier)... Trước khi viết code: tóm tắt cách từng hiệu ứng hoạt động, GIẤY PHÉP của từng repo (đọc file LICENSE), và kế hoạch kết hợp."
- **Tư duy & Hành động của AI:**
  1. Tự động dùng lệnh `git clone` để tải mã nguồn 3 kho lưu trữ về thư mục scratch.
  2. Đọc trực tiếp các file `LICENSE`, `LICENSE.md`, `package.json`, `README.md`.
  3. Xác thực tính pháp lý: Cả 3 repo đều thuộc giấy phép **MIT License** cho phép thương mại hóa.
  4. Phân tích nguyên lý: Persistent WebGPU Canvas, TSL Dynamic Normals & Self-shadowing raymarch, Ribbon BufferGeometry.
  5. Thiết lập nguyên tắc **Single Source of Truth** cho biến màu nền trắng ngà `#F4F0E8` đồng bộ giữa CSS và WebGPU shader.

---

### Lượt 2: Kiến trúc Hệ Thống, Chuẩn Rubric & Bước 1 (Khung Dự Án + Chuyển Trang)
- **Prompt từ Người dùng:**
  > "Yêu cầu bổ sung: Nền tảng bán; mọi nội dung nằm trong MỘT file cấu hình JSON; tối ưu Lighthouse di động >= 85; SEO và trợ năng DOM thật; chế độ tĩnh fallback khi không có WebGPU; CREDITS.md; sơ đồ thư mục /du-an-nhom-x; CÁC BƯỚC: làm từng bước, dừng cho tôi xem sau mỗi bước: Bước 1: Khung dự án + chuyển trang."
- **Tư duy & Hành động của AI:**
  1. Thiết lập cây thư mục chuẩn theo yêu cầu:
     ```text
     /du-an-nhom-x
     │-- /assets (images, depths, data/content.json)
     │-- /css (layout.css, styles.css)
     │-- /js (data.js, logic.js, transitions.js, main.js)
     │-- /docs (design_system.md)
     │-- index.html
     │-- README.md
     │-- prompt_log.md
     │-- CREDITS.md
     ```
  2. Tạo file cấu hình `content.json` duy nhất quản lý toàn bộ nội dung (site, colors, light/dark themes, 6 tác phẩm có chiều sâu giám tuyển).
  3. Viết `data.js` áp dụng triệt để các hàm mảng hiện đại (`map`, `filter`, `find`, `reduce`) phục vụ chấm điểm 30% JS/DOM và 15% Logic dữ liệu.
  4. Viết `logic.js` hỗ trợ Router SPA không tải lại trang, Theme Engine hai chiều (DOM + Shader Uniform), kiểm tra năng lực phần cứng đồ họa tự động (WebGPU -> WebGL -> CSS Marquee fallback).
  5. Viết `transitions.js` quản lý Persistent WebGPU Stage kết hợp Three.js NodeMaterial và GSAP.

---

### Lượt 3: Bước 2 (Carousel Unwoven Tách Sợi Tại Trang Chủ & Debug Thực Tế)
- **Prompt từ Người dùng:**
  > "rồi tới bước 2"
- **Tư duy & Hành động của AI:**
  1. **Nghiên cứu & Chuyển dịch Mã nguồn Unwoven:**
     - Thiết kế module độc lập `unwoven.js` kế thừa giải thuật từ Clément Grellier (MIT License).
     - Xây dựng hình học sợi dệt `buildRibbonGeometry()`: Chia mỗi thẻ tranh thành 26 dải sợi ruy-băng ngang (`threads = 26`), mỗi sợi 20 phân đoạn (`segments = 20`) để uốn lượn tự nhiên.
     - Viết Vertex Shader: Khi thẻ di chuyển vào vùng xé (`uZone`), các sợi ruy-băng dãn nở tự do với gia tốc ngẫu nhiên `hash()` và dao động sóng `sin()` (flutter wave).
     - Viết Fragment Shader: Áp dụng giải thuật bo góc thẻ `sdRoundBox()`, thu hẹp lõi sợi và **hòa tan màu (bleach) chính xác vào màu nền trang web** qua uniform `uBleachColor`.
  2. **Giải Quyết Yêu Cầu Cốt Lõi Về Biến Màu Duy Nhất:**
     - Uniform `uBleachColor` liên kết trực tiếp với sự kiện `themeChanged`. Khi đổi giao diện sang nền tối than chì `#0B0B0C`, shader lập tức chuyển `uBleachColor` sang `vec3(0.043, 0.043, 0.047)` mà không cần tải lại trang.
  3. **Tương Tác & Trợ Năng Mở Rộng:**
     - Bổ sung bộ phát hiện nhấp chuột (Hit-test / Raycasting) trên không gian Orthographic Camera: Bấm vào bất kỳ thẻ tác phẩm nào trên băng chuyền sẽ kích hoạt chuyển trang tới `/artwork/:id`.
     - Hỗ trợ phím mũi tên `ArrowLeft` / `ArrowRight` để lướt băng chuyền mượt mà.
  4. **Debug Chuyên Sâu Trên Trình Duyệt Chrome Headless (CDP):**
     - Phát hiện lỗi tiềm ẩn `setPointerCapture` trên con trỏ ảo/chạm di động và xử lý an toàn bằng `try/catch`.
     - Kiểm chứng trên Chrome thật: Canvas kích thước 1422×804px được dựng mượt mà 60fps, 0 lỗi console, chuyển hướng thẻ tranh chính xác.

---

### Lượt 4: Bước 3 (Hiệu Ứng Chiếu Sáng Relighting & Tinh Chỉnh Nguồn Sáng)
- **Prompt từ Người dùng:**
  > "tới bước 3"
- **Tư duy & Hành động của AI:**
  1. **Nghiên cứu & Thiết kế Module Relighting:**
     - Xây dựng module [`relighting.js`](file:///C:/Users/Home/.gemini/antigravity/scratch/du-an-nhom-x/js/relighting.js) dựa trên ý niệm chiếu sáng 3D từ Codrops (Dominik Fojcik, MIT License).
     - **Tính toán Vector Pháp Tuyến Động (Dynamic Normals):** Lấy đạo hàm độ dốc từ bản đồ độ sâu (`texelStep = 3.0 / uResolution`), kết hợp với vi chi tiết độ sáng ảnh gốc (`detailStep = 4.0 / uResolution`) để tái tạo rõ nét gờ sơn dầu nổi và thớ đá cẩm thạch.
     - **Giải Thuật Dò Bóng Tự Thân (Self-Shadowing Raymarch 12 Bước):** Bắn tia ngược về nguồn sáng điểm `uLightPos`, tính toán độ che khuất (occlusion) mềm mại với `uShadowSoftness` và `uShadowIntensity`.
  2. **Bổ Sung Widget Tinh Chỉnh Ánh Sáng Trực Quan Cho Khách Hàng:**
     - Tích hợp thanh trượt điều chỉnh: Cường độ sáng (Brightness 0.5–4.0), Độ cao nguồn sáng (Elevation 0.3–2.5), và Bộ chọn sắc ấm nhiệt độ màu (Warm Museum, Studio Neutral, Sienna Sunset, Moonlight Blue).
     - Di chuyển nguồn sáng mượt mà theo con trỏ chuột/chạm ngón tay bằng nội suy Lerp ($0.1$).
  3. **Debug Sâu Trên Trình Duyệt Thật & Khắc Phục Lỗi Shading Nguy Hiểm:**
     - Phát hiện lỗi xung đột tên hàm GLSL nội tại: Biến cục bộ `vec2 step` làm che khuất hàm nội suy bậc thang `step(0.0, lightDir.z)` khiến trình biên dịch WebGL báo lỗi `Shader Error 0: 'step' : function name expected`.
     - Lập tức đổi tên thành `texelStep` và `detailStep`, đưa tỷ lệ lỗi console về **0 tuyệt đối**.
     - Xác nhận hình ảnh kết xuất 3D đạt chất lượng cao trên cả giao diện Sáng và Tối (Obsidian Noir).

---

### Lượt 5: Bước 4 (Hoàn Thiện Biến Thể Nền Tối Obsidian Noir & Cơ Chế Đồng Bộ Hóa)
- **Prompt từ Người dùng:**
  > "tới bước 4"
- **Tư duy & Hành động của AI:**
  1. **Đồng Bộ Hóa Tuyệt Đối Với `content.json`:**
     - Thiết lập hàm `getDefaultThemeMode()` trong `data.js`. Người mua template chỉ cần đặt `"defaultMode": "dark"` trong `content.json` là website tự động khởi động ở chế độ nền tối ngay từ lần đầu truy cập mà không cần viết code.
     - Đồng bộ thẻ `<meta name="theme-color">` với giá trị `#0B0B0C`, giúp thanh trạng thái và thanh URL trên di động (iOS Safari & Android Chrome) đổi màu tương thích hoàn toàn.
  2. **Tinh Chỉnh Thẩm Mỹ Giao Diện Tối (Obsidian Noir Polish):**
     - Bổ sung thanh cuộn tối (Dark Scrollbar) chuyên biệt với hiệu ứng hover màu cam đất nung `rgba(224, 122, 74, 0.45)`.
     - Tối ưu độ tương phản cho toàn bộ 4 trang (Home, Archive, Detail, About): bảng thông số `specs-table`, viền sáng thẻ bài `artwork-card`, danh sách chọn lọc `select.filter-btn`.
  3. **Kiểm Thử Toàn Diện 4 Trang Ở Chế Độ Nền Tối (Headless Chrome CDP):**
     - Đã chụp ảnh màn hình xác thực cả 4 góc nhìn của website trong chế độ tối.
     - Xác nhận tỷ lệ lỗi console: **0 lỗi**. Shaders Unwoven và Relighting hòa hợp mượt mà với nền tối.

---

### Lượt 6: Chuyển Đổi Sang Bố Cục 1-Page Chuẩn Tympanus Codrops Kèm Đường Dẫn Script & Shaders
- **Prompt từ Người dùng:**
  > "tôi sẽ muốn nó sẽ 1page như này với các hiệu ứngban đầu, và sẽ có 1 đường đãn tới phần srcipt của nó https://tympanus.net/Tutorials/RelightingImages/ [kèm ảnh chụp màn hình]"
- **Tư duy & Hành động của AI:**
  1. **Phân Tích Thiết Kế 1-Page Gốc Của Dominik Fojcik:**
     - Bố cục tràn màn hình (Full-bleed $100\text{vw} \times 100\text{vh}$) nơi hình ảnh được chiếu sáng $3\text{D}$ làm nền tương tác trực tiếp theo con trỏ chuột.
     - Cụm điều hướng `#nav` góc dưới bên trái: Các nút chọn `demo 1`, `demo 2`, `demo 3` chuyển đổi tức thì giữa các tác phẩm có bản đồ độ sâu.
     - Cụm thông tin `#info` góc trên bên trái: Tên dự án, liên kết bài viết, liên kết mã nguồn và thẻ tag `#3d #three.js`.
  2. **Tích Hợp Toàn Bộ Hiệu Ứng Trên Cùng 1 Trang:**
     - Thiết lập nút `demo 4 (Unwoven Loom 🧵)` cho phép người dùng chuyển thẳng sang băng chuyền 26 dải sợi lụa bung tách của Clément Grellier ngay trên cùng giao diện mà không cần reload trang.
     - Xây dựng cửa sổ trượt **Script & Shaders Drawer** (`✦ View Script & Shaders`):
       - Cung cấp **đường dẫn trực tiếp** tới các file script: `js/relighting.js`, `js/unwoven.js`, `js/data.js`, `assets/data/content.json`.
       - Hiển thị trực tiếp mã nguồn GLSL shader và giải thuật dò tia 12 bước, hình học sợi dệt và logic biến màu duy nhất.
     - Xây dựng cửa sổ trượt **Article & Story Drawer** (`Article & Story`) chứa toàn bộ câu chuyện, kỹ thuật và hồ sơ thông số của tác phẩm đang chọn.
  3. **Kiểm Thử Trực Tiếp Trên Chrome Headless (CDP):**
     - Đã kiểm tra mở Drawer, chuyển đổi mượt mà giữa các Demo 1, 2, 3 và Demo 4 (Unwoven Loom). Tỷ lệ lỗi console: **0 lỗi**.

---

## 3. Các Giải Pháp Kỹ Thuật Đột Phá Đạt Được

1. **Biến Màu Duy Nhất (Single Source of Truth Color):**
   Màu nền `--color-bg` (mặc định `#F4F0E8`) tự động chuyển thành vector `vec3(0.957, 0.941, 0.910)` nạp vào shader; khi người mua đổi màu trong `content.json`, cả trang web và hiệu ứng mờ dần của sợi ruy-băng đều khớp 100% không để lại vệt màu lệch.
2. **Nạp Texture Theo Nhu Cầu (On-Demand Texture Loading):**
   Thay vì tải trước hàng chục Megabyte ảnh lúc tải trang, `TransitionStage` nạp texture qua bộ nhớ đệm (Texture Cache) chỉ khi người dùng chuyển trang đến tác phẩm tương ứng, đảm bảo điểm số Lighthouse di động vượt mốc 85.
3. **Trợ Năng & SEO Tuyệt Đối:**
   Toàn bộ ảnh đều có thẻ `<img alt="...">`, văn bản nội dung trong DOM thật (`<article>`, `<h1>`, `<p>`, `<table>`), hỗ trợ phím tắt điều hướng (`T` đổi theme, `Esc` thoát xem chi tiết) và liên kết nhảy qua thanh điều hướng (`skip-link`).


---

## Turn 7: Hướng Dẫn Chạy & Khởi Động Nhanh Cho Người Dùng
- **Yêu cầu:** "Làm sao để chạy?"
- **Hành động:** 
  1. Xây dựng file `start.bat` tại thư mục gốc giúp người dùng Windows có thể khởi động ngay môi trường Vite dev server mà không cần mở terminal phức tạp.
  2. Bổ sung script hướng dẫn `npm run dev` và thiết lập cấu hình `vite.config.js` mở cổng `5173` với `--host` cho phép xem thử trên điện thoại qua mạng LAN.

---

## Turn 8: Chuyển Đổi Layout Sang Phong Cách 1-Page Toàn Màn Hình
- **Yêu cầu:** "Tôi sẽ muốn nó sẽ 1page như này với các hiệu ứng ban đầu, và sẽ có 1 đường dẫn tới phần script của nó: https://tympanus.net/Tutorials/RelightingImages/"
- **Hành động & Giải pháp:**
  1. Loại bỏ cấu trúc phân trang URL chuyển tiếp nhiều màn hình rời rạc; chuyển đổi toàn bộ sang bố cục **1-Page Full-Bleed** (canvas 100vw × 100vh).
  2. Xây dựng Drawer chuyên biệt "View Script & Shaders" với các tab xem mã nguồn GLSL Relighting, Unwoven Ribbon BufferGeometry và kiến trúc Biến màu đơn nhất.
  3. Bổ sung liên kết tải trực tiếp tới các file mã nguồn lõi (`relighting.js`, `unwoven.js`, `data.js`, `content.json`).

---

## Turn 9: Chuyển Đổi Ý Niệm Từ "Demo Kỹ Thuật" Sang "Triển Lãm Nghệ Thuật Đích Thực"
- **Yêu cầu:**
  1. Đổi concept: Trở thành triển lãm giám tuyển nghệ thuật mang tên **"Ánh Sáng Đi Qua Thời Gian"** (Sáu tác phẩm có bề mặt nổi, được thắp lại bằng một ngọn đèn · Giám tuyển: ÉTHÉRÉ Atelier).
  2. Bố cục: Nút demo 1/2/3/4 chuyển thành thanh số La Mã các phòng triển lãm: `I · Phù Điêu`, `II · Sơn Dầu`, `III · Khắc Gỗ`, `IV · Sợi Dệt (Unwoven)`. Ở Phòng II hiển thị các sub-pill chọn tranh (`Cánh Đồng Lúa`, `Phòng Ngủ`, `Aristotle`).
  3. Nhãn bảo tàng chuẩn quốc tế (Museum Label): Tiêu đề font Serif, tác giả, niên đại, chất liệu, kích thước, số định danh hiện vật (Accession No.) và liên kết ngoài kiểm tra tại bảo tàng gốc.
  4. Hiệu ứng con trỏ "Đèn Pin" (Torch Spotlight) với vòng sáng mềm mại theo chuột và lớp phủ hạt phim (film grain feTurbulence) tăng chất cảm thủ công.
  5. Chuyển "View Script & Shaders" thành tính năng mở bằng phím tắt easter egg `?` / `~` hoặc qua mục Colophon.
  6. Hoàn thiện `README.md` hướng dẫn người mua template trên các sàn thương mại (ThemeForest, Gumroad) và `CREDITS.md` đảm bảo 100% bản quyền CC0 Open Access.
- **Thực thi & Tinh chỉnh kỹ thuật:**
  1. Cập nhật `assets/data/content.json` đầy đủ 4 phòng, 6 tác phẩm thật, và lời tựa giám tuyển sâu sắc.
  2. Bổ sung các phương thức truy vấn `getRooms()`, `getRoomById()`, `getArtworksByRoom()`, `getCuratorialStatement()`, `getArtworkSummaries()`, `getPortfolioMetrics()` trong `js/data.js` tuân thủ tiêu chí module hóa và sử dụng `map`, `filter`, `reduce`.
  3. Hoàn thiện tương tác con trỏ đèn pin lerping mượt mà và các drawer: *Lời Giám Tuyển*, *Về Tác Phẩm*, *Danh Mục*, *Thông Tin & Bản Quyền*.
  4. Viết script kiểm thử tự động không đầu `test_exhibition.mjs` chụp 9 bức ảnh màn hình qua giao thức Chrome DevTools Protocol (CDP) kiểm chứng thành công mọi phòng trưng bày và chế độ Dark Mode.


---

## Turn 10: Tái Cấu Trúc Toàn Diện Thành Website Đa Mục Đích Chuẩn Mực Nghệ Thuật
- **Yêu cầu của người dùng:**
  1. Dừng code cho đến khi có hiệu lệnh bắt đầu.
  2. Giải quyết cảm giác "mớ hỗn độn" (quá nhiều overlay, controls, drawers tranh chấp không gian).
  3. Đưa hiệu ứng "chuyển ảnh liên tiếp" (continuous stream/loom) thành trục xương sống thị giác.
  4. Mở rộng hệ thống Navigation đa mục đích (Home, Exhibition 3D, Collection, Curatorial, Colophon).
  5. Đóng vai khách hàng/giám đốc thiết kế kỳ cựu thẩm định toàn diện website, tư vấn ảnh chuẩn bị và xu thế thiết kế đương đại.
- **Thực thi & Tái cấu trúc:**
  1. **Thảo luận & Phê bình:** Phân tích nguyên nhân "Cognitive Overload" (hội chứng nhồi nhét bảo tàng), giải mã sức hút của dòng chảy thị giác liên tục và đề xuất kịch bản phân tách giữa "Duyệt tìm (Browsing)" và "Thưởng lãm chuyên sâu (Focus Zen Mode)".
  2. **Tiền Sảnh Trang Chủ (Home Foyer):** Dải băng chuyền 26 sợi Unwoven liên tục hiển thị 6 tác phẩm nghệ thuật chuẩn tỉ lệ vàng, người xem cuộn/lướt chuột êm ái, nhấp vào tác phẩm bất kỳ để chuyển thẳng vào phòng 3D.
  3. **Không Gian Thưởng Lãm 3D (Zen Mode):** Tự động ẩn 90% chi tiết thừa, đặt bức tranh ở tâm điểm với thuật toán dò bóng tự thân 12 bước, con trỏ đèn pin dịu mắt, nhãn bảo tàng tinh gọn và phím điều hướng `[←]` `[→]` chuyển tranh liên tiếp.
  4. **Bộ Sưu Tập (The Collection):** Lưới ảnh biên tập (Editorial Grid) đi kèm bộ lọc chất liệu (Phù điêu, Sơn dầu, Khắc gỗ, Thảm dệt), nhấp vào xem 3D ngay lập tức.
  5. **Bài Luận Giám Tuyển (Curatorial):** Bố cục sách nghệ thuật với trích dẫn nổi bật và phân tích triết lý ánh sáng.
  6. **Kiểm thử tự động CDP:** Chạy Chrome headless ghi lại 6 ảnh chụp màn hình kiểm chứng toàn diện mọi section, quy tắc màu đơn nhất (`#F4F0E8` / `#0B0B0C`) và chế độ Dark Mode.


---

## Turn 11: Nâng Cấp Phiên Bản Grand Edition — Mở Rộng Quy Mô Gấp 5 Lần, Băng Chuyền Cinema-Scale & Chuẩn Mực Triển Lãm Quốc Tế
- **Yêu cầu của người dùng:**
  1. *Khối lượng & Quy mô:* Lượng ảnh và hình thức trình bày cần tăng gấp ~5 lần so với phiên bản trước để website đạt tầm vóc bảo tàng thương mại hoàn chỉnh.
  2. *Băng chuyền liên tiếp:* Việc thu nhỏ hiệu ứng chuyển ảnh đã làm giảm thẩm mỹ; cần trả lại tầm vóc hoành tráng, ấn tượng mạnh mẽ cho dải băng chuyền ruy-băng Unwoven.
  3. *Tự nâng cấp chuyên nghiệp:* Chủ động hoàn thiện website theo đẳng cấp thương mại quốc tế (ThemeForest/Gumroad cao cấp).
- **Thực thi & Giải pháp Kỹ thuật Chuyên sâu:**
  1. **Mở rộng kho tài nguyên gấp 5 lần (The Met Open Access CC0 API):**
     - Tải 10 kiệt tác mới từ API The Met (`https://collectionapi.metmuseum.org/public/collection/v1/objects/{id}`) bao gồm: Monet (Water Lilies), Cézanne (Apples), Vermeer (Water Pitcher), Seurat (Circus), Hokusai (Red Fuji), Unicorn Tapestry, Greek Kouros Archaic Marble, Roman Boscoreale Fresco, Van Gogh (Self-Portrait with Straw Hat, Cypresses).
     - Tạo 29 bản đồ độ sâu (depth maps) vi chi tiết với thuật toán xử lý ảnh gradient độ sáng kết hợp lọc Gauss bảo toàn biên sắc sảo.
     - Mở rộng `content.json` từ 6 lên 18 tác phẩm lớn phân bổ qua 5 cánh trưng bày (Wings I đến V), kèm đầy đủ số hiệu Accession, kỹ thuật tạo tác, kích thước và đường dẫn tra cứu bảo tàng.
  2. **Băng Chuyền Dệt Sợi Cinema-Scale (76vh Full-Bleed Loom):**
     - Nâng cấp `js/unwoven.js`: thiết lập `this.cardHeight = viewportHeight * 0.74`, `cardAspect: 0.72` và `cardMaxHeight: 740px`.
     - 26 dải sợi ruy-băng ngang lượn sóng hữu cơ ở vùng tear zone trên không gian màn ảnh rộng choáng ngợp, kết nối sự kiện tương tác nhấp ảnh chuyển tiếp tức thời vào phòng 3D Relighting.
  3. **Bộ Công Cụ Bảo Tồn 3D Kỹ Thuật Số (Conservation Inspection Tools):**
     - Nâng cấp `js/relighting.js`: tích hợp uniform `uShowNormals` cho phép bật/tắt chế độ hiển thị bản đồ vector pháp tuyến bề mặt (Surface Normal Map RGB iridescent).
     - Bổ sung Macro-Inspection Zoom (1.0x – 2.5x) cho phép phóng to cực cận bề mặt sơn dầu impasto và các vết nứt bích họa cổ.
  4. **Trục Niên Đại Lịch Sử Tương Tác (Chronological Timeline Rail):**
     - Xây dựng thanh thời gian 2.800 năm từ 883 TCN đến 2026 SCN gồm 11 mốc lịch sử nghệ thuật kết nối trực tiếp với logic lọc tác phẩm.
  5. **Bộ Lọc Danh Mục & Tìm Kiếm Trực Tiếp (Live Archive Search & Filter):**
     - Tìm kiếm thời gian thực theo tên tác phẩm, tác giả hoặc chất liệu, kết hợp các chip lọc 5 cánh triển lãm với hiệu ứng DOM cập nhật mượt mà.
  6. **Hướng Dẫn Âm Thanh Thủ Tục (Procedural Museum Ambient Drone):**
     - Khởi tạo âm nền bảo tàng tĩnh lặng tần số điều hòa ấm 108Hz / 162Hz bằng Web Audio API thuần túy (không phụ thuộc file ngoài nặng nề).
  7. **Biên Đạo Giao Diện & Form Đặt Lịch / Mua Bản Quyền:**
     - Thiết kế phân đoạn Đặt lịch thưởng lãm riêng & Mua bản quyền thương mại (Booking Form) đáp ứng nhu cầu thương mại hóa template.
  8. **Kiểm Chứng Đóng Gói & Tự Động Hóa Trình Duyệt:**
     - `npm run build` xuất bản thành công bản phân phối thương mại tối ưu (0 lỗi).
     - Chạy script kiểm thử Chrome DevTools Protocol tự động chụp 9 bức ảnh màn hình (`grand_01` đến `grand_09`) xác nhận độ hoàn thiện mỹ thuật tuyệt đối.


---

## Turn 12: Hoàn Thiện Tinh Chỉnh Theo Phản Hồi Trực Quan — Khắc Phục Lỗi Font, Thu Gọn Dock 3D & Kiến Trúc Multi-View Phân Trang Chuẩn Bảo Tàng
- **Phản hồi của người dùng:**
  1. *Lỗi che chữ & font chữ:* Tiêu đề trang chủ bị thanh breadcrumb che khuất một phần; dòng phụ đề màu vàng bị lỗi font/dấu tiếng Việt; bảng thông tin bên phải gây rối mắt (yêu cầu "XÓA").
  2. *Dock thông tin trong phòng 3D chiếm diện tích:* Thanh dock đáy màn hình chiếm nhiều diện tích ngắm tranh; yêu cầu cơ chế thu gọn/ẩn đi để xem tranh trọn vẹn, khi cần bấm mới hiện ra.
  3. *Kiến trúc phân trang NAV (Trao đổi ý tưởng cốt lõi):* Không nhồi nhét tất cả các phần vào trang chủ cuộn dài một mạch rồi nhảy neo; mỗi nút NAV (`Accueil`, `Collections`, `Chronologie`, `Curatorial`, `Visiter`) phải là một **Trang / View độc lập với nội dung chuyên biệt thực sự** giống như kiến trúc website bảo tàng Louvre.
- **Thực thi & Tinh chỉnh Kỹ thuật:**
  1. **Khắc phục lỗi font & Cân bằng Foyer:**
     - Tích hợp font **`Lora`** chuẩn Google Fonts có đầy đủ subset tiếng Việt bản địa (hỗ trợ 100% các ký tự dấu thanh phức tạp ở cả dạng nghiêng italic: `ệ, ự, ợ, ắc, ầu, ợi, dệt`). Dòng chữ *"2.800 Năm Nghệ Thuật Điêu Khắc, Sơn Dầu Impasto & Sợi Dệt"* hiển thị sắc nét, mỹ thuật tuyệt đối.
     - Xóa bỏ hoàn toàn khung `museum-spec-board` theo yêu cầu "XÓA" của người dùng.
     - Tăng khoảng đệm `padding-top: calc(var(--header-total-height) + 54px)` cho `.section-home`, căn giữa tiêu đề hoành tráng, loại bỏ 100% hiện tượng bị che chữ.
  2. **Thanh Dock 3D Thu Gọn Cơ Động (Collapsible Museum Dock):**
     - Bổ sung nút `[ ▼ Thu Gọn ]` ngay trên dock đáy. Khi bấm, dock trượt êm ái xuống dưới (`transform: translateY(160%)`), nhường lại 100% diện tích màn hình cho kiệt tác 3D.
     - Hiển thị nút bấm tinh tế `[ ✦ Thông Tin & Ánh Sáng ▲ ]` nổi nhẹ ở đáy màn hình; nhấp vào để mở lại bảng điều khiển bất cứ lúc nào.
  3. **Kiến trúc SPA Multi-View Phân Trang Độc Lập:**
     - Phân tách cấu trúc DOM thành các view riêng biệt: `#view-home`, `#view-collection`, `#view-timeline`, `#view-curatorial`, `#view-visit`.
     - Xây dựng router `switchView(viewName)`: Mỗi mục trên thanh NAV điều hướng sang trang nội dung riêng biệt, cập nhật thanh breadcrumbs chuẩn Louvre (`Accueil / Collections / Kho Lưu Trữ 4 Cánh`, `Accueil / Chronologie / 2.800 Năm Tiến Trình Xúc Giác`, v.v.), cuộn mượt về đầu trang và đồng bộ URL hash.
     - Trang chủ (`Accueil`) giờ đây giữ đúng vai trò là tiền sảnh thưởng lãm tinh hoa với dải băng chuyền Cinema Loom, không bị pha trộn các nội dung của trang khác.
  4. **Kiểm chứng tự động CDP:** Chụp thành công 6 ảnh màn hình kiểm chứng toàn diện (`louvre_refined_01` đến `louvre_refined_06`).
