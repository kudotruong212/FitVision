# 3D Models Directory

Thư mục này chứa các mô hình 3D (GLTF/GLB) cho FitVision.

## Cách thêm mô hình 3D

### 1. Tải mô hình từ các nguồn miễn phí:

**Nguồn đề xuất:**
- **Mixamo** (Adobe): https://www.mixamo.com/
  - Human models với animations
  - Miễn phí, chất lượng cao
  - Có thể export GLTF/GLB

- **Sketchfab**: https://sketchfab.com/
  - Tìm kiếm "human body", "fitness", "exercise"
  - Nhiều mô hình miễn phí (CC license)
  - Download GLTF/GLB format

- **Poly Haven**: https://polyhaven.com/models
  - Mô hình miễn phí, chất lượng cao
  - CC0 license (public domain)

- **Three.js Examples**: 
  - https://threejs.org/examples/models/
  - Có sẵn một số mô hình demo

### 2. Đặt tên file:

- `human-body.glb` - Mô hình cơ thể người chính
- `exercises/[exercise-name].glb` - Mô hình cho từng bài tập cụ thể

### 3. Sử dụng trong code:

```javascript
// Trong component
<ExerciseViewer3D
  exerciseSlug="squat"
  modelUrl="/models/exercises/squat.glb"
  ...
/>

<BodyScanViewer3D
  scanData={data}
  modelUrl="/models/human-body.glb"
  ...
/>
```

## Tối ưu mô hình

1. **Giảm polygon count**: Sử dụng tool như Blender để decimate
2. **Compress textures**: Sử dụng KTX2 hoặc WebP
3. **Use Draco compression**: Giảm file size đáng kể
4. **LOD**: Tạo nhiều version với độ chi tiết khác nhau

## Tools hữu ích

- **Blender**: https://www.blender.org/ - Edit và export GLTF
- **glTF Pipeline**: https://github.com/CesiumGS/gltf-pipeline - Optimize GLTF files
- **glTF Transform**: https://gltf-transform.donmccurdy.com/ - Transform và optimize

## Lưu ý

- File size: Giữ mô hình < 5MB để load nhanh
- Format: Ưu tiên GLB (binary) thay vì GLTF (text)
- License: Đảm bảo mô hình có license phù hợp (CC0, CC-BY, etc.)

