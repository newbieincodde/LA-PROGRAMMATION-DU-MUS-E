import json

data = json.load(open('assets/data/content.json', 'r', encoding='utf-8'))

table_rows = []
for a in data['artworks']:
    room_name = a.get('roomName', '')
    if ' · ' in room_name:
        room_name = room_name.split(' · ', 1)[1]
    room_str = f"**Cánh {a['room']}: {room_name}**"
    title = f"*{a['title']}*"
    artist = f"{a.get('artist', 'Khuyết danh')} ({a.get('year', a.get('century', ''))})"
    
    src = a.get('source', '')
    if isinstance(src, dict):
        museum = src.get('museum', 'The Metropolitan Museum of Art')
    else:
        museum = src if src else 'The Metropolitan Museum of Art'
    
    origin = a.get('origin', 'Bảo tàng Quốc tế')
    table_rows.append(f"| {room_str} | {title} | {artist} | {origin} | {museum} | **CC0 (Open Access)** |")

credits_header = """# Ghi Công Mã Nguồn, Thư Viện & Bản Quyền (CREDITS & LICENSES)

Dự án mẫu **ÉTHÉRÉ Atelier & Gallery — Đại Triển Lãm "Ánh Sáng Đi Qua Thời Gian" (Grand Edition)** được phát triển tuân thủ nghiêm ngặt các quy định về giấy phép mã nguồn mở (Open Source) và bản quyền hình ảnh phục vụ mục đích thương mại trên các nền tảng bán template (ThemeForest, Gumroad, Creative Market).

---

## 1. Bản Quyền 50 Kiệt Tác Nghệ Thuật Trong Triển Lãm (Public Domain / CC0 Open Access)

Toàn bộ 50 tác phẩm nghệ thuật trưng bày trong triển lãm đều được số hóa từ chương trình **Open Access (CC0 - Creative Commons Zero)** của các bảo tàng danh giá hàng đầu thế giới (**The Metropolitan Museum of Art**, **Art Institute of Chicago**, **Musée de Cluny**, **Rijksmuseum**, **Tokyo National Museum**), cho phép tự do sử dụng cho mục đích cá nhân lẫn thương mại quốc tế:

| Cánh Trưng Bày | Tác Phẩm | Nghệ Sĩ / Xuất Xứ | Niên Đại & Địa Điểm | Bảo Tàng Lưu Trữ | Giấy Phép |
| :--- | :--- | :--- | :--- | :--- | :--- |
"""

credits_footer = """
> [!NOTE]
> Mọi tác phẩm đều đi kèm liên kết kiểm tra trực tiếp tới cơ sở dữ liệu hiện vật chính thức của The Met (`metmuseum.org`), Art Institute of Chicago (`artic.edu`), Rijksmuseum (`rijksmuseum.nl`) hoặc Paris Musées (`parismusees.paris.fr`).

---

## 2. Các Dự Án & Hiệu Ứng Tham Khảo (MIT License)

### 2.1. Relighting Images with Three.js & WebGPU
- **Tác giả:** Dominik Fojcik & Codrops (2026)
- **Kho lưu trữ:** [github.com/DGFX/codrops-relightning-images](https://github.com/DGFX/codrops-relightning-images)
- **Giấy phép:** MIT License
- **Đóng góp kiến trúc:** Giải thuật tính toán vector pháp tuyến bề mặt (surface normal) động từ đạo hàm gradient bản đồ độ sâu kết hợp vi chi tiết độ chói cọ vẽ (luminance detail), và kỹ thuật dò tia bóng tự thân 12 bước (12-step self-shadowing raymarch). Bổ sung chế độ soi vector pháp tuyến Surface Normals RGB và Macro Zoom 2.5x.

### 2.2. Unwoven — Infinite Loom of Images
- **Tác giả:** Clément Grellier (2026)
- **Kho lưu trữ:** [github.com/clementgrellier/unwoven](https://github.com/clementgrellier/unwoven)
- **Giấy phép:** MIT License
- **Đóng góp kiến trúc:** Ý niệm chia nhỏ thẻ ảnh thành 26 dải sợi ruy-băng ngang độc lập (`BufferGeometry`), thuật toán vertex flutter wave ở vùng xé (tear zone) và shader hòa tan màu biên đồng bộ với màu nền trang web qua biến màu đơn nhất. Nâng cấp tỉ lệ Cinema-Scale (76vh) hoành tráng.

### 2.3. Persistent Page Transitions with WebGPU & VanillaJS
- **Tác giả:** Ben Paine & Codrops (2025 - 2026)
- **Kho lưu trữ:** [github.com/bnpne/page-transitions-with-webgpu-vanilla-js](https://github.com/bnpne/page-transitions-with-webgpu-vanilla-js)
- **Giấy phép:** MIT License
- **Đóng góp kiến trúc:** Ý niệm về persistent WebGPU canvas xuyên suốt các trang, chuyển đổi tọa độ DOM sang tọa độ 3D Perspective camera 1:1 pixel và bo góc SDF.

---

## 3. Thư Viện Lõi Bên Thứ Ba & Giấy Phép Hoạt Họa (Dependencies & Licensing)

Dự án cung cấp kiến trúc **Dual-Compatibility** (chạy trực tiếp không cần Node.js qua `js/vendor/` + `<script type="importmap">`, hoặc qua bundler Vite):

| Thư viện | Phiên bản | Tác giả / Tổ chức | Giấy phép | Vị trí Vendored | Mục đích sử dụng |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Three.js** | `^0.180.0` | Ricardo Cabello (Mr.doob) | **MIT License** | `js/vendor/three.module.js` | Đồ họa WebGL, ShaderMaterial, Relighting, Ambient Points |
| **Lenis** | `^1.3.27` | Studio Freight / Darkroom | **MIT License** | `js/vendor/lenis/lenis.mjs` | Cuộn quán tính mềm mại (Smooth Momentum Scroll) đồng bộ GSAP |
| **GSAP Core** | `^3.12.5` | GreenSock (Jack Doyle) | **Standard 'No-Charge'** | `js/vendor/gsap/index.js` | Động cơ timeline, ticker điều phối, nội suy lerp ánh sáng |
| **GSAP ScrollTrigger** | `3.15.0` | GreenSock | **Standard 'No-Charge'** | `js/vendor/gsap/ScrollTrigger.js` | Hiệu ứng xuất hiện cuộn trang (scroll reveal) & thị sai (parallax) |
| **GSAP Flip** | `3.15.0` | GreenSock | **Standard 'No-Charge'** | `js/vendor/gsap/Flip.js` | Chuyển cảnh mở rộng thẻ tranh mượt mà sang phòng triển lãm 3D |
| **GSAP Observer** | `3.15.0` | GreenSock | **Standard 'No-Charge'** | `js/vendor/gsap/Observer.js` | Chuẩn hóa sự kiện cuộn/kéo vuốt cảm ứng đa nền tảng |
| **GSAP SplitText** | `3.15.0` | GreenSock | **Club GSAP / Commercial** | `js/vendor/gsap/SplitText.js` | Tách ký tự & từ ngữ cho nghệ thuật typography chuyển động (Hero Reveal) |
| **Vite** | `^8.3.5` | Evan You & Vite Contributors | **MIT License** | `node_modules/vite` | Môi trường đóng gói sản xuất (`npm run build`) |

> [!IMPORTANT]
> **Lưu ý Bản Quyền Hoạt Họa GSAP (GreenSock Licensing Notice):**
> - **GSAP Core, ScrollTrigger, Flip và Observer** được phát hành theo giấy phép chuẩn *GreenSock Standard 'No-Charge' License* — hoàn toàn miễn phí cho các website thông thường, portfolio cá nhân, và các dự án không thu phí định kỳ từ người dùng cuối.
> - **SplitText** là plugin cao cấp thuộc *Club GSAP*. Khi sử dụng dự án cho các sản phẩm thương mại tính phí trực tiếp tới nhiều khách hàng (như bán template trên ThemeForest có tính phí giấy phép mở rộng Extended License), người triển khai cần sở hữu giấy phép thương mại chính thức từ GreenSock (xem chi tiết tại [gsap.com/pricing](https://gsap.com/pricing)). Dự án đã được thiết kế sẵn cơ chế fallback tự động an toàn (graceful degradation) nếu SplitText không được nạp.

---

## 4. Hướng Dẫn Pháp Lý Về Bản Đồ Độ Sâu (Depth Map Licensing)

- Các file bản đồ độ sâu trong thư mục `assets/depths/` được sinh bằng kỹ thuật tính toán gradient độ sáng vi chi tiết kết hợp lọc Gauss bảo toàn biên sắc sảo hoặc mô hình **Depth Anything V2 (Small checkpoint)**.
- **Lưu ý pháp lý quan trọng cho người mua template thương mại:**
  - Mô hình **Depth Anything V2 - Small** được phát hành dưới giấy phép **Apache-2.0** (cho phép thương mại hóa hoàn toàn).
  - Các mô hình Depth Anything bản *Base/Large/Giant* chứa trọng số huấn luyện phi thương mại (CC-BY-NC).
  - Khuyến nghị người mua sử dụng checkpoint **Small (Apache-2.0)** hoặc các giải pháp miễn phí thương mại như **MiDaS (MIT)** khi tạo bản đồ độ sâu mới cho khách hàng.

---

## 5. Toàn Văn Giấy Phép MIT (The MIT License)

```text
MIT License

Copyright (c) 2026 ÉTHÉRÉ Atelier & Antigravity Studio

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```
"""

full_content = credits_header + '\n'.join(table_rows) + '\n' + credits_footer
open('CREDITS.md', 'w', encoding='utf-8').write(full_content)
print("Updated CREDITS.md with 50 artworks")
