# TÀI LIỆU HỆ THỐNG THIẾT KẾ & KIẾN TRÚC (DESIGN SYSTEM & WIREFRAME)

## 1. Bản Đồ Kiến Trúc SPA (Architecture Map)

```
[ Trình Duyệt / Browser ]
          │
          ▼
   [ index.html ] 
          │
          ├──> [ #canvas-container ] ────> Persistent WebGPU Stage (Three.js WebGPU / WebGL Fallback)
          │
          └──> [ #app (DOM Mount) ] ─────> SPA Router (logic.js)
                     ├──> '/'          : Home View (Selected Works + Unwoven Loom Stage)
                     ├──> '/archive'   : Archive View (Filterable Curatorial Grid via map/filter)
                     ├──> '/artwork/:id': Detail View (Interactive Relighting + Full Narrative)
                     └──> '/about'     : Atelier View (Manifesto & Technology Statement)
```

---

## 2. Wireframe Bố Cục Các Trang

### 2.1. Trang Chủ (Selected Works)
```text
+--------------------------------------------------------------------------+
|  ÉTHÉRÉ [Atelier]             Selected Works   The Archive   The Atelier  |
|                                                     [GRAPHICS •] [☀/🌙]  |
+--------------------------------------------------------------------------+
|                                                                          |
|  [SUB-BRAND]                                                             |
|  Ánh Sáng & Chiều Sâu Hội Họa                                            |
|  Phòng tranh số đương đại...                                              |
|                                                                          |
|       +----------------------------------------------------------+       |
|       |                                                          |       |
|       |        [=== UNWOVEN RIBBON CAROUSEL STAGE ===]           |       |
|       |         Thẻ tranh 26 dải sợi lụa bung xòe ở mép          |       |
|       |                                                          |       |
|       +----------------------------------------------------------+       |
|                                                                          |
|  ⟵⟶ Kéo chuột để khám phá băng chuyền                 6 Tác Phẩm Chọn Lọc |
+--------------------------------------------------------------------------+
```

### 2.2. Trang Chi Tiết Tác Phẩm (Interactive Relighting View)
```text
+--------------------------------------------------------------------------+
|  ← Quay Về Danh Mục                                                      |
+------------------------------------+-------------------------------------+
|                                    | [SƠN DẦU CỔ ĐIỂN]                   |
|   +----------------------------+   | Symphonie Maternelle                |
|   |                            |   | Khúc Thỉnh Ca Của Tình Mẫu Tử       |
|   |                            |   |                                     |
|   |    [ RELIGHTING CANVAS ]   |   | Tác giả: Émile Laurent (Paris)      |
|   |    Ánh sáng 3D di chuyển   |   |                                     |
|   |    theo chuột / chạm tay   |   | ✦ Ý Niệm & Bối Cảnh Sáng Tác        |
|   |                            |   | Chi tiết câu chuyện tác phẩm...     |
|   +----------------------------+   |                                     |
|   ✦ Chạm để xoay nguồn sáng        | ✦ Kỹ Thuật & Chất Liệu              |
|                                    | ✦ Hồ Sơ Kỹ Thuật (Năm, Kích thước)  |
|                                    |                                     |
|                                    | [← Tác phẩm trước]   [Tác phẩm sau →]|
+------------------------------------+-------------------------------------+
```

---

## 3. Hệ Thống Màu Sắc & Biến Giao Diện

| Biến CSS Token | Chế độ Sáng (Mặc định) | Chế độ Tối (Obsidian Noir) | Ý nghĩa / Ứng dụng |
| :--- | :--- | :--- | :--- |
| `--color-bg` | `#F4F0E8` (Trắng ngà) | `#0B0B0C` (Than chì) | Màu nền trang chủ & toàn website |
| `--color-unwoven-fade` | `var(--color-bg)` | `var(--color-bg)` | **Đồng bộ 100% với shader bleach color** |
| `--color-text` | `#1A1918` | `#EDE9E1` | Chữ tiêu đề và nội dung chính |
| `--color-muted` | `#75726B` | `#96938B` | Chữ phụ đề, năm sáng tác |
| `--color-surface` | `#FFFFFF` | `#141416` | Nền thẻ bài, bảng thông số kỹ thuật |
| `--color-accent` | `#9E4A28` (Đất nung sienna) | `#E07A4A` | Điểm nhấn thương hiệu và viền sáng |

---

## 4. Bản Đồ Phím Tắt Trợ Năng (Keyboard Navigation)

- **`T` / `t`**: Chuyển đổi qua lại giữa chế độ Sáng (Ivory) và Tối (Obsidian).
- **`Escape`**: Thoát chế độ xem chi tiết tác phẩm, quay về trang Danh mục (`/archive`).
- **`Tab` / `Shift + Tab`**: Di chuyển tuần tự qua các phần tử có thể tương tác với vòng sáng viền nổi (`:focus-visible`).
- **`Enter` / `Space`**: Kích hoạt thẻ tác phẩm hoặc nút bấm bộ lọc.
