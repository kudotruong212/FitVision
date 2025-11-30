# Hướng dẫn sử dụng Animation từ GLTF Models

## Tại sao nên dùng GLTF models với animation?

Mô hình primitive hiện tại chỉ có animation đơn giản (position/rotation của toàn bộ body). Để có chuyển động **chính xác và đẹp** như thật, bạn nên sử dụng GLTF models có sẵn animation từ **Mixamo** (Adobe).

## Cách lấy mô hình với animation từ Mixamo

### Bước 1: Truy cập Mixamo
1. Vào https://www.mixamo.com/
2. Đăng ký/đăng nhập miễn phí (cần Adobe account)

### Bước 2: Chọn Character
1. Click "Characters" ở menu trên
2. Chọn một character (ví dụ: "Remy" hoặc "Sofia")
3. Click "Download" → Chọn format: **FBX for Unity (.fbx)**

### Bước 3: Chọn Animation cho từng bài tập
1. Click "Animations" ở menu trên
2. Tìm animation phù hợp:
   - **Squat**: Tìm "Squat" hoặc "Squat Down"
   - **Push-up**: Tìm "Push Up" hoặc "Push Up Exercise"
   - **Plank**: Tìm "Plank" hoặc "Plank Hold"
   - **Dead Bug**: Tìm "Dead Bug" hoặc "Abdominal Exercise"
   - **Row**: Tìm "Rowing" hoặc "Pull"
3. Click animation → Chọn character → Click "Download"
4. Format: **FBX for Unity (.fbx)**

### Bước 4: Convert FBX → GLB
1. Mở **Blender** (miễn phí: https://www.blender.org/)
2. Import FBX: File → Import → FBX
3. Export GLB: File → Export → glTF 2.0
   - Format: **glTF Binary (.glb)**
   - Include: ✅ Selected Objects, ✅ Animations
   - Transform: ✅ +Y Up
4. Lưu file với tên phù hợp: `squat.glb`, `push-up.glb`, etc.

### Bước 5: Đặt vào project
```
public/models/exercises/
  ├── squat.glb
  ├── push-up.glb
  ├── plank.glb
  ├── dead-bug.glb
  └── ...
```

### Bước 6: Cập nhật config
File `src/config/3dModels.js` đã được setup sẵn. Chỉ cần đảm bảo tên file khớp:

```javascript
exercises: {
  squat: "/models/exercises/squat.glb",
  "push-up": "/models/exercises/push-up.glb",
  // ...
}
```

## Animation sẽ tự động hoạt động!

Khi bạn load GLTF model có animation, hệ thống sẽ:
1. Tự động detect animations trong model
2. Tạo AnimationController
3. Cho phép play/pause/reset
4. Điều chỉnh speed

## Tips

1. **Mixamo có hàng nghìn animations**: Tìm kiếm bằng tiếng Anh (squat, push up, plank, etc.)
2. **Character consistency**: Dùng cùng một character cho tất cả animations để nhất quán
3. **File size**: Mỗi animation thường 1-3MB. Nếu quá lớn, có thể optimize trong Blender
4. **Loop animations**: Chọn animations có thể loop (squat, push-up) thay vì one-time actions

## Alternative: Sử dụng ready-made GLTF models

Nếu không muốn tự convert, có thể tìm trên:
- **Sketchfab**: https://sketchfab.com/ (tìm "exercise animation", filter: Downloadable, Animated)
- **CGTrader**: https://www.cgtrader.com/ (một số free, một số paid)

## Troubleshooting

**Animation không chạy?**
- Kiểm tra model có animation trong Blender (Timeline panel)
- Đảm bảo export với "Include: Animations" checked
- Check console logs để xem có errors

**Animation quá nhanh/chậm?**
- Dùng speed control trong UI (0.25x - 2x)
- Hoặc adjust duration trong Blender trước khi export

