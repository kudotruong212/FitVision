# Hướng dẫn Debug mô hình 3D không hoạt động

## Các vấn đề thường gặp và cách fix

### 1. Model không hiển thị

**Kiểm tra:**
- Mở Console (F12) → Tab Console
- Tìm logs bắt đầu với `🔄`, `✅`, hoặc `❌`

**Logs bình thường:**
```
🔄 Loading model for squat, URL: /models/exercises/squat.glb
📥 Starting to load GLTF from: /models/exercises/squat.glb
⏳ Loading /models/exercises/squat.glb: 25% (2.6MB / 10.4MB)
✅ GLTF loaded successfully
✅ Model loaded: { isPrimitive: false, hasAnimations: true, animationCount: 1 }
🎬 Setting up GLTF animations: ["mixamo.com|Layer0"]
✅ Animation ready: mixamo.com|Layer0 (2.50s)
```

**Nếu thấy lỗi:**
- `❌ Failed to load model` → File không tồn tại hoặc bị corrupt
- `⚠️ Using primitive fallback` → Model không load được, dùng fallback
- `⚠️ No model URL found` → Config không đúng

### 2. Animation không chạy

**Kiểm tra:**
1. Console có log `✅ Animation ready` không?
2. Click nút "Play" có hoạt động không?
3. Console có errors không?

**Fix:**
- Đảm bảo file GLB có animation data
- Kiểm tra trong Blender xem có animation không
- Thử click "Reset" rồi "Play" lại

### 3. Model bị tách rời

**Nguyên nhân:**
- Export từ Blender không đúng settings
- Transforms chưa được apply

**Fix:**
- Xem file `BLENDER_EXPORT_GUIDE.md`
- Apply All Transforms trước khi export
- Join objects nếu cần

### 4. Model quá lớn/nhỏ

**Tự động fix:**
- Code sẽ tự động scale model về kích thước hợp lý
- Console sẽ log: `📏 Scaled model...`

### 5. File không load được

**Kiểm tra Network tab:**
1. Mở DevTools → Tab Network
2. Reload page
3. Tìm request đến `/models/exercises/squat.glb`
4. Kiểm tra Status:
   - `200 OK` → File load thành công
   - `404 Not Found` → File không tồn tại
   - `CORS error` → Server config issue

**Fix:**
- Đảm bảo file nằm trong `public/models/exercises/`
- Tên file đúng: `squat.glb` (chữ thường)
- Restart dev server nếu cần

## Debug Commands trong Console

Mở Console và chạy:

```javascript
// Kiểm tra model cache
console.log(window.modelCache);

// Kiểm tra GLTF loader
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
const loader = new GLTFLoader();
loader.load('/models/exercises/squat.glb', 
  (gltf) => console.log('✅ Model loaded:', gltf),
  (progress) => console.log('Progress:', progress),
  (error) => console.error('❌ Error:', error)
);
```

## Checklist Debug

- [ ] File `squat.glb` tồn tại trong `public/models/exercises/`
- [ ] Tên file đúng: `squat.glb` (không phải `Squat.glb`)
- [ ] Console không có errors
- [ ] Network tab shows 200 OK cho file GLB
- [ ] Model có animation data (kiểm tra trong Blender)
- [ ] Dev server đang chạy
- [ ] Browser cache cleared (Ctrl+Shift+R)

## Test Model trong Blender

1. Mở Blender
2. File → Import → glTF 2.0
3. Chọn file `squat.glb`
4. Kiểm tra:
   - ✅ Model hiển thị đúng
   - ✅ Animation có trong Timeline
   - ✅ Play animation hoạt động

Nếu không pass → File có vấn đề, cần export lại

## Test Model Online

1. Truy cập: https://gltf-viewer.donmccurdy.com/
2. Upload file `squat.glb`
3. Kiểm tra:
   - ✅ Model hiển thị
   - ✅ Animation chạy được

Nếu không pass → File có vấn đề

## Liên hệ Support

Nếu vẫn không hoạt động, cung cấp:
1. Console logs (copy/paste)
2. Network tab screenshot
3. File size của `squat.glb`
4. Browser và version

