// src/pages/Onboarding.jsx
import React from "react";
import { useNavigate } from "react-router-dom";
import { updateProfile } from "../api/services/profileService.js";
import { useAuth } from "../context/AuthContext.jsx";

const experienceOptions = [
  { value: "beginner", label: "Beginner – mới tập" },
  { value: "intermediate", label: "Intermediate – 6-18 tháng" },
  { value: "advanced", label: "Advanced – >18 tháng" },
];

const goalOptions = [
  "Giảm mỡ toàn thân",
  "Tăng cơ & sức mạnh",
  "Cải thiện tư thế",
  "Tăng độ dẻo dai / Yoga",
  "Chuẩn bị thi đấu",
];

function commaStringToArray(value) {
  if (!value) return [];
  return String(value)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export default function Onboarding() {
  const navigate = useNavigate();
  const { refreshProfile } = useAuth();
  const [step, setStep] = React.useState(1);
  const [form, setForm] = React.useState({
    goal: "",
    experience_level: "beginner",
    preferred_modalities: "",
    injuries: "",
    equipment: "",
  });
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState(null);

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setError(null);
  }

  function canProceed() {
    if (step === 1) return form.goal !== "";
    if (step === 2) return form.experience_level !== "";
    return true;
  }

  async function handleFinish() {
    if (!canProceed()) {
      setError("Vui lòng điền đầy đủ thông tin.");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const payload = {
        goal: form.goal,
        experience_level: form.experience_level,
        preferred_modalities: commaStringToArray(form.preferred_modalities),
        injuries: commaStringToArray(form.injuries),
        equipment: commaStringToArray(form.equipment),
      };
      await updateProfile(payload);
      await refreshProfile();
      navigate("/dashboard");
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || "Không lưu được hồ sơ.");
    } finally {
      setSaving(false);
    }
  }

  function handleSkip() {
    navigate("/dashboard");
  }

  return (
    <div className="min-h-[calc(100vh-80px)] flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 md:p-8 w-full max-w-2xl shadow-xl">
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-white">Thiết lập hồ sơ của bạn</h2>
            <span className="text-sm text-gray-400">
              Bước {step}/3
            </span>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-2">
            <div
              className="bg-emerald-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${(step / 3) * 100}%` }}
            />
          </div>
        </div>

        {error && (
          <div className="mb-4 text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">
            {error}
          </div>
        )}

        {/* Step 1: Goal */}
        {step === 1 && (
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold text-white mb-2">
                Mục tiêu tập luyện của bạn là gì?
              </h3>
              <p className="text-sm text-gray-400 mb-4">
                Chọn mục tiêu chính để AI tạo workout plan phù hợp nhất
              </p>
              <select
                name="goal"
                value={form.goal}
                onChange={handleChange}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="">-- Chọn mục tiêu --</option>
                {goalOptions.map((goal) => (
                  <option key={goal} value={goal}>
                    {goal}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* Step 2: Experience */}
        {step === 2 && (
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold text-white mb-2">
                Kinh nghiệm tập luyện của bạn?
              </h3>
              <p className="text-sm text-gray-400 mb-4">
                Giúp chúng tôi điều chỉnh độ khó của bài tập
              </p>
              <select
                name="experience_level"
                value={form.experience_level}
                onChange={handleChange}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                {experienceOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* Step 3: Additional Info */}
        {step === 3 && (
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold text-white mb-2">
                Thông tin bổ sung (tùy chọn)
              </h3>
              <p className="text-sm text-gray-400 mb-4">
                Giúp AI tư vấn chính xác hơn
              </p>
            </div>
            <div>
              <label className="block text-sm text-gray-300 mb-1">
                Bộ môn ưa thích
              </label>
              <input
                name="preferred_modalities"
                value={form.preferred_modalities}
                onChange={handleChange}
                placeholder="VD: gym, yoga, pilates"
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-300 mb-1">
                Chấn thương / vùng đau
              </label>
              <input
                name="injuries"
                value={form.injuries}
                onChange={handleChange}
                placeholder="VD: đau vai, thoát vị đĩa đệm"
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-300 mb-1">
                Dụng cụ sẵn có
              </label>
              <input
                name="equipment"
                value={form.equipment}
                onChange={handleChange}
                placeholder="VD: bands, dumbbell, thảm yoga"
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>
        )}

        <div className="mt-6 flex items-center justify-between gap-3">
          <div>
            {step > 1 && (
              <button
                type="button"
                onClick={() => setStep(step - 1)}
                className="px-4 py-2 rounded-lg border border-slate-600 text-gray-300 hover:bg-slate-800 transition-colors"
              >
                Quay lại
              </button>
            )}
          </div>
          <div className="flex gap-3">
            {step < 3 ? (
              <button
                type="button"
                onClick={() => setStep(step + 1)}
                disabled={!canProceed()}
                className="px-4 py-2 rounded-lg bg-emerald-500 text-white font-semibold disabled:opacity-60 disabled:cursor-not-allowed hover:bg-emerald-400 transition-colors"
              >
                Tiếp theo
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={handleSkip}
                  className="px-4 py-2 rounded-lg border border-slate-600 text-gray-300 hover:bg-slate-800 transition-colors"
                >
                  Bỏ qua
                </button>
                <button
                  type="button"
                  onClick={handleFinish}
                  disabled={saving || !canProceed()}
                  className="px-4 py-2 rounded-lg bg-emerald-500 text-white font-semibold disabled:opacity-60 disabled:cursor-not-allowed hover:bg-emerald-400 transition-colors"
                >
                  {saving ? "Đang lưu..." : "Hoàn thành"}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}


