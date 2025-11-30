# Hướng dẫn về file GLB cho FitVision

## File GLB là gì?

**GLB** (GL Transmission Format Binary) là định dạng file 3D:
- **Container format**: Chứa tất cả dữ liệu trong 1 file (model, textures, animations)
- **Binary format**: Nhị phân, nhỏ gọn hơn GLTF (text-based)
- **Standard**: Được hỗ trợ bởi Three.js, Unity, Unreal, Blender, v.v.

## File squat.glb của bạn

- **Size**: 10.4 MB (hơi lớn nhưng OK)
- **Format**: GLB binary (đúng format)
- **Location**: `public/models/exercises/squat.glb`

## File GLB lý tưởng sẽ có:

### ✅ Có Animation
- Animation "Squat" hoặc tên tương tự
- Duration: ~2-3 giây cho 1 rep
- Loop: Có thể loop để lặp lại động tác
- Keyframes: Mô tả chuyển động từ đứng → xuống → đứng

### ✅ Model chất lượng
- Human character model (nam/nữ)
- Polygon count: 5,000 - 20,000 (đủ chi tiết nhưng không quá nặng)
- Textures: Có thể có hoặc không (có thì đẹp hơn)

### ✅ File size
- Tối ưu: 1-5 MB
- Có thể lớn hơn nếu có textures chi tiết
- File của bạn: 10.4 MB (có thể có textures chi tiết)

## Kiểm tra file GLB

### Cách 1: Dùng Blender
1. Mở Blender → File → Import → glTF 2.0
2. Chọn file `squat.glb`
3. Kiểm tra:
   - ✅ Có model hiển thị (nhân vật 3D)
   - ✅ Có animation trong Timeline (dòng thời gian)
   - ✅ Animation chạy được khi play

### Cách 2: Dùng online viewer
1. Truy cập: https://gltf-viewer.donmccurdy.com/
2. Upload file `squat.glb`
3. Xem preview và kiểm tra animation

### Cách 3: Kiểm tra trong Console
Khi load trong app, mở Console (F12) sẽ thấy:
```
✅ Successfully loaded GLTF model: /models/exercises/squat.glb
hasAnimations: true
animationCount: 1
animationNames: ["mixamo.com|Layer0"] hoặc tên animation khác
```

## Tại sao có thể không hiển thị?

1. **File quá lớn**: 10.4 MB có thể load chậm
2. **URL path**: Cần đảm bảo path đúng `/models/exercises/squat.glb`
3. **CORS/Server**: Dev server cần serve file từ `public/`
4. **Animation**: File có thể không có animation data

## Cách tối ưu file GLB

Nếu file quá lớn (>5MB), có thể:

1. **Giảm textures**: 
   - Mở trong Blender
   - Giảm resolution textures
   - Hoặc remove textures không cần

2. **Compress với Draco**:
   - Dùng glTF Pipeline
   - Giảm file size đáng kể

3. **Decimate geometry**:
   - Giảm polygon count
   - Vẫn giữ được hình dạng

## File squat.glb nên có gì?

### Tối thiểu:
- ✅ Model nhân vật 3D (human character)
- ✅ Animation squat (chuyển động squat)
- ✅ Skeleton/rigging (để animation hoạt động)

### Tốt hơn:
- ✅ Textures (da, quần áo)
- ✅ Materials (shading, lighting)
- ✅ Multiple animations (nếu cần)

## Troubleshooting

**File không load?**
- Kiểm tra Console errors
- Kiểm tra Network tab xem file có được request không
- Thử truy cập trực tiếp: `http://localhost:5173/models/exercises/squat.glb`

**Animation không chạy?**
- Kiểm tra file có animation data không (dùng Blender)
- Console sẽ log tên animation nếu có
- Nếu không có animation, sẽ dùng keyframe animation thay thế

**Model không hiển thị?**
- File có thể bị corrupt
- Thử mở trong Blender hoặc online viewer
- Kiểm tra file format (phải là binary GLB)
