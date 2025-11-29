# Troubleshooting Guide - AI Analysis Flow

## Luồng xử lý request phân tích ảnh

### 1. Frontend → Backend
- **File**: `fitvision-frontend/src/pages/BodyScan.jsx`
- **Function**: `handleAnalyze()`
- **API Call**: `analyzeBody(formData)` từ `api/services/scanService.js`
- **Endpoint**: `POST /api/ai/analyze`
- **Base URL**: `http://localhost:5000` (hoặc từ `VITE_API_BASE_URL`)

### 2. Backend → AI Service
- **File**: `fitvision-backend/routes/scan.js`
- **Route**: `POST /api/ai/analyze`
- **Middleware**: `authRequired`, `upload.single('image')`, `validateUpload`
- **Service**: `forwardImageToAI()` từ `services/aiService.js`
- **AI Service URL**: `http://localhost:8001` (từ `AI_SERVICE_URL` env var)
- **Forward to**: `POST ${AI_SERVICE_URL}/ai/analyze`

### 3. AI Service → OpenAI
- **File**: `fitvision-ai/routes/analysis.py`
- **Route**: `POST /ai/analyze`
- **Service**: `analyze_body_image()` từ `services/analysis_service.py`
- **OpenAI API**: `gpt-4o-mini` với Vision API
- **Pose Estimation**: MediaPipe (nếu available)

## Các điểm cần kiểm tra khi có lỗi

### 1. Kiểm tra AI Service có chạy không
```bash
curl http://localhost:8001/ai/health
# Hoặc từ browser: http://localhost:8001/ai/health
```

### 2. Kiểm tra Backend có kết nối được AI Service không
- Xem logs của backend khi gọi AI service
- Kiểm tra `AI_SERVICE_URL` trong `.env` của backend
- Mặc định: `http://localhost:8001`

### 3. Kiểm tra OpenAI API Key
- Kiểm tra `OPENAI_API_KEY` trong `.env` của AI service
- Key phải bắt đầu với `sk-`

### 4. Kiểm tra Error Logs
- **Backend logs**: Xem console output của backend server
- **AI Service logs**: Xem console output của AI service (uvicorn)
- **Frontend console**: Xem browser console để biết error message chi tiết

### 5. Kiểm tra Network
- Backend có thể reach AI service tại `http://localhost:8001`?
- Firewall có block port 8001 không?

## Common Errors

### "Cannot reach AI service"
- AI service không chạy
- `AI_SERVICE_URL` sai
- Network issue

### "AI_analysis_failed"
- OpenAI API key không đúng hoặc hết hạn
- OpenAI API rate limit
- Image format không được support

### "No image uploaded"
- Frontend không gửi file đúng cách
- Upload middleware có vấn đề

