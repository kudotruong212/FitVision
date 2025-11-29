import React from "react";
import { updateProfile } from "../api/services/profileService.js";
import { resendVerificationEmail } from "../api/services/authService.js";
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

function profileToForm(profile) {
  if (!profile) {
    return {
      goal: "",
      experience_level: "beginner",
      preferred_modalities: "",
      injuries: "",
      equipment: "",
      nutrition_style: "",
      height_cm: "",
      weight_kg: "",
      weekly_sessions_target: "",
      notes: "",
    };
  }
  return {
    goal: profile.goal || "",
    experience_level: profile.experience_level || "beginner",
    preferred_modalities: (profile.preferred_modalities || []).join(", "),
    injuries: (profile.injuries || []).join(", "),
    equipment: (profile.equipment || []).join(", "),
    nutrition_style: profile.nutrition_style || "",
    height_cm: profile.height_cm ?? "",
    weight_kg: profile.weight_kg ?? "",
    weekly_sessions_target: profile.weekly_sessions_target ?? "",
    notes: profile.notes || "",
  };
}

function commaStringToArray(value) {
  if (!value) return [];
  return String(value)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export default function ProfilePage() {
  const { user, profile, profileLoading, refreshProfile } = useAuth();
  const [form, setForm] = React.useState(profileToForm(profile));
  const [saving, setSaving] = React.useState(false);
  const [status, setStatus] = React.useState(null);
  const [resending, setResending] = React.useState(false);

  React.useEffect(() => {
    setForm(profileToForm(profile));
  }, [profile]);

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setStatus(null);
    try {
      const payload = {
        goal: form.goal,
        experience_level: form.experience_level,
        preferred_modalities: commaStringToArray(form.preferred_modalities),
        injuries: commaStringToArray(form.injuries),
        equipment: commaStringToArray(form.equipment),
        nutrition_style: form.nutrition_style,
        height_cm: form.height_cm ? Number(form.height_cm) : null,
        weight_kg: form.weight_kg ? Number(form.weight_kg) : null,
        weekly_sessions_target: form.weekly_sessions_target
          ? Number(form.weekly_sessions_target)
          : null,
        notes: form.notes,
      };
      await updateProfile(payload);
      await refreshProfile();
      setStatus({ type: "success", message: "Đã lưu hồ sơ mục tiêu." });
    } catch (err) {
      console.error(err);
      setStatus({
        type: "error",
        message: err.response?.data?.error || "Không lưu được hồ sơ.",
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleResendVerification() {
    if (!user?.email) return;
    setResending(true);
    try {
      await resendVerificationEmail(user.email);
      setStatus({ type: "success", message: "Email xác nhận đã được gửi lại. Vui lòng kiểm tra hộp thư." });
    } catch (err) {
      setStatus({ type: "error", message: err.response?.data?.error || "Không gửi được email." });
    } finally {
      setResending(false);
    }
  }

  const emailVerified = user?.email_verified !== false;

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <p className="text-xs uppercase tracking-widest text-emerald-300 mb-1">
          Personalization
        </p>
        <h2 className="text-3xl font-bold">Hồ sơ mục tiêu</h2>
        <p className="text-gray-300 text-sm">
          Cập nhật mục tiêu, chấn thương và dụng cụ sẵn có để AI tư vấn chính xác
          hơn cho Workout Plan và Coach Chat.
        </p>
      </div>

      {!emailVerified && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-amber-400 text-lg">⚠️</span>
              <h3 className="text-amber-300 font-semibold">Email chưa được xác nhận</h3>
            </div>
            <p className="text-amber-200/80 text-sm">
              Vui lòng xác nhận email {user?.email} để đảm bảo tài khoản an toàn.
            </p>
          </div>
          <button
            onClick={handleResendVerification}
            disabled={resending}
            className="px-3 py-1.5 rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-300 text-sm font-medium hover:bg-amber-500/30 disabled:opacity-60 transition-colors"
          >
            {resending ? "Đang gửi..." : "Gửi lại email"}
          </button>
        </div>
      )}

      {emailVerified && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-3 flex items-center gap-2">
          <span className="text-emerald-400">✓</span>
          <span className="text-emerald-300 text-sm">Email đã được xác nhận</span>
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 space-y-4"
      >
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Mục tiêu</label>
            <select
              name="goal"
              value={form.goal}
              onChange={handleChange}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white"
            >
              <option value="">-- Chọn mục tiêu --</option>
              {goalOptions.map((goal) => (
                <option key={goal} value={goal}>
                  {goal}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">
              Kinh nghiệm tập luyện
            </label>
            <select
              name="experience_level"
              value={form.experience_level}
              onChange={handleChange}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white"
            >
              {experienceOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <FieldInput
            label="Bộ môn ưa thích"
            name="preferred_modalities"
            value={form.preferred_modalities}
            placeholder="VD: gym, yoga, pilates"
            onChange={handleChange}
          />
          <FieldInput
            label="Chấn thương / vùng đau"
            name="injuries"
            value={form.injuries}
            placeholder="VD: đau vai, thoát vị đĩa đệm"
            onChange={handleChange}
          />
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <FieldInput
            label="Dụng cụ sẵn có"
            name="equipment"
            value={form.equipment}
            placeholder="VD: bands, dumbbell, thảm yoga"
            onChange={handleChange}
          />
          <FieldInput
            label="Phong cách dinh dưỡng"
            name="nutrition_style"
            value={form.nutrition_style}
            placeholder="Eat clean, low-carb..."
            onChange={handleChange}
          />
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          <FieldInput
            label="Chiều cao (cm)"
            name="height_cm"
            value={form.height_cm}
            onChange={handleChange}
          />
          <FieldInput
            label="Cân nặng (kg)"
            name="weight_kg"
            value={form.weight_kg}
            onChange={handleChange}
          />
          <FieldInput
            label="Số buổi/tuần mong muốn"
            name="weekly_sessions_target"
            value={form.weekly_sessions_target}
            onChange={handleChange}
          />
        </div>

        <div>
          <label className="block text-sm text-gray-400 mb-1">Ghi chú thêm</label>
          <textarea
            name="notes"
            rows={4}
            value={form.notes}
            onChange={handleChange}
            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white"
            placeholder="VD: công việc ngồi nhiều, cần bài kéo giãn cổ - vai..."
          />
        </div>

        {status && (
          <div
            className={`text-sm ${
              status.type === "success" ? "text-emerald-300" : "text-amber-300"
            }`}
          >
            {status.message}
          </div>
        )}

        <button
          type="submit"
          disabled={saving || profileLoading}
          className="px-4 py-2 rounded-xl bg-emerald-500 text-slate-900 font-semibold text-sm disabled:opacity-60"
        >
          {saving ? "Đang lưu..." : "Lưu hồ sơ"}
        </button>
      </form>
    </div>
  );
}

function FieldInput({ label, ...rest }) {
  return (
    <div>
      <label className="block text-sm text-gray-400 mb-1">{label}</label>
      <input
        {...rest}
        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white"
      />
    </div>
  );
}



