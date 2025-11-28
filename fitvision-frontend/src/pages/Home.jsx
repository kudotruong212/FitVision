// src/pages/Home.jsx
import React from "react";
import { Link } from "react-router-dom";
import { fetchScanStats } from "../api/client";

const onboarding = [
  {
    title: "1. Đăng nhập & giới thiệu mục tiêu",
    desc: "Chia sẻ mục tiêu (giảm mỡ, cải thiện tư thế, tăng sức mạnh) để AI tinh chỉnh gợi ý.",
  },
  {
    title: "2. Tải ảnh toàn thân chuẩn",
    desc: "Đứng thẳng, đủ sáng, background rõ. AI phân tích posture, body-shape và nhóm cơ yếu.",
  },
  {
    title: "3. Nhận plan + hỏi AI Coach",
    desc: "Xem dashboard tiến bộ, thực hiện plan cá nhân và hỏi AI Coach mọi thắc mắc.",
  },
];

const testimonials = [
  {
    name: "Huyền – Yoga Instructor",
    quote:
      "FitVision giúp học viên của tôi chỉnh posture nhanh hơn hẳn. Dashboard trực quan nên ai cũng thấy tiến bộ.",
  },
  {
    name: "Đức – PT tại HCMC",
    quote:
      "Plan AI đưa ra khá hợp lý, tôi chỉ cần tinh chỉnh chút xíu. Khách hàng thích vì có thể chat hỏi ngay.",
  },
  {
    name: "Linh – Runner",
    quote:
      "Sau 4 tuần làm theo plan core/posture, điểm tư thế tăng từ 52 → 78. Tự tin hơn khi chạy dài.",
  },
];

export default function Home() {
  const [stats, setStats] = React.useState(null);
  const [loadingStats, setLoadingStats] = React.useState(true);

  React.useEffect(() => {
    loadStats();
  }, []);

  async function loadStats() {
    try {
      setLoadingStats(true);
      const data = await fetchScanStats();
      setStats(data);
    } catch (e) {
      console.error("Không tải được stats trên Home:", e);
    } finally {
      setLoadingStats(false);
    }
  }

  const totalScans = stats?.totalScans ?? 0;
  const avgScore = stats?.avgScore ?? 0;
  const lastScore = stats?.lastScore ?? 0;

  return (
    <div className="px-4 py-8 sm:px-6 lg:px-8 space-y-12">
      {/* HERO */}
      <section className="max-w-6xl mx-auto grid lg:grid-cols-[1.2fr,0.8fr] gap-10 items-center">
        <div>
          <div className="inline-flex items-center gap-2 text-xs font-semibold bg-emerald-500/10 text-emerald-300 px-3 py-1 rounded-full border border-emerald-500/30 mb-4">
            <span className="text-lg">✨</span> AI Gym & Yoga Copilot
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight mb-5">
            Xây body chuẩn, sửa tư thế sai với{" "}
            <span className="bg-gradient-to-r from-emerald-400 to-sky-400 bg-clip-text text-transparent">
              FitVision AI
            </span>
          </h1>
          <p className="text-gray-300 text-base sm:text-lg leading-relaxed mb-6">
            Phân tích posture chỉ từ 1 bức ảnh toàn thân, nhận ngay{" "}
            <span className="text-emerald-300 font-semibold">
              plan tập cá nhân hóa
            </span>{" "}
            và dashboard theo dõi điểm tư thế, nhóm cơ yếu, vùng mỡ thừa.
          </p>

          <div className="flex flex-wrap gap-3">
            <Link
              to="/scan"
              className="px-5 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-sm font-semibold text-slate-900 shadow-xl shadow-emerald-500/40"
            >
              🚀 Bắt đầu AI Body Scan
            </Link>
            <Link
              to="/auth"
              className="px-4 py-3 rounded-xl border border-slate-600 hover:border-emerald-500 text-sm font-semibold text-gray-200"
            >
              Đăng nhập / tạo tài khoản
            </Link>
          </div>

          <div className="mt-8 grid sm:grid-cols-3 gap-3">
            <StatBadge
              label="Tổng số lần scan"
              value={loadingStats ? "…" : totalScans}
              hint="Lượt đánh giá tư thế đã chạy"
            />
            <StatBadge
              label="Điểm tư thế TB"
              value={loadingStats ? "…" : avgScore}
              hint="Tính trên toàn hệ thống"
            />
            <StatBadge
              label="Điểm mới nhất"
              value={loadingStats ? "…" : lastScore}
              hint="Từ lần scan gần nhất của bạn"
            />
          </div>
        </div>

        <div className="relative">
          <div className="absolute -inset-6 bg-emerald-500/10 blur-3xl rounded-full" />
          <div className="relative border border-slate-700 rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6 shadow-2xl shadow-emerald-500/20">
            <div className="text-sm uppercase tracking-widest text-emerald-300">
              Lộ trình FitVision
            </div>
            <ol className="mt-4 space-y-6 text-sm text-gray-200">
              <HeroStep
                index="01"
                title="AI Body Scan"
                desc="Upload ảnh toàn thân, AI phân tích posture, body-shape, điểm số."
              />
              <HeroStep
                index="02"
                title="Workout plan cá nhân"
                desc="Hệ thống tự sinh plan theo nhóm cơ yếu, vùng mỡ thừa, level tập."
              />
              <HeroStep
                index="03"
                title="Dashboard + AI Coach"
                desc="Theo dõi tiến bộ, chat với AI coach để tối ưu dinh dưỡng & recovery."
              />
            </ol>
            <div className="mt-6 border-t border-slate-700 pt-4 text-xs text-gray-400">
              Tip: Hãy scan 1-2 lần/tuần để thấy đường trend rõ ràng nhất.
            </div>
          </div>
        </div>
      </section>

      {/* Onboarding */}
      <section className="max-w-6xl mx-auto grid gap-6 lg:grid-cols-[1fr,1fr]">
        <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6">
          <h2 className="text-2xl font-semibold mb-2">Onboarding 3 bước</h2>
          <p className="text-gray-400 text-sm mb-5">
            Flow rõ ràng giúp bạn sẵn sàng AI body scan chỉ trong 2 phút.
          </p>
          <div className="space-y-4">
            {onboarding.map((step) => (
              <StepCard key={step.title} {...step} />
            ))}
          </div>
        </div>

        <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border border-slate-700 rounded-3xl p-6 flex flex-col justify-between">
          <div>
            <h3 className="text-xl font-semibold mb-2">
              FitVision dành cho ai?
            </h3>
            <ul className="space-y-3 text-gray-300 text-sm">
              <li>• Người làm văn phòng muốn sửa tư thế và giảm đau lưng.</li>
              <li>• Gymer/Yogi cần theo dõi tiến bộ khoa học.</li>
              <li>• PT/Coach muốn có báo cáo để huấn luyện học viên.</li>
            </ul>
          </div>
          <Link
            to="/dashboard"
            className="mt-6 inline-flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-slate-50 text-slate-900 text-sm font-semibold"
          >
            Xem Dashboard mẫu
            <span aria-hidden>→</span>
          </Link>
        </div>
      </section>

      {/* Feature grid */}
      <section className="max-w-6xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-6">
          <div>
            <p className="text-sm uppercase tracking-wide text-emerald-300">
              Tính năng chính
            </p>
            <h2 className="text-3xl font-bold">Trợ lý toàn diện cho Gym & Yoga</h2>
          </div>
          <Link
            to="/coach"
            className="text-sm text-emerald-300 hover:text-emerald-200 underline-offset-4 underline"
          >
            Hỏi thử AI Coach →
          </Link>
        </div>
        <div className="grid md:grid-cols-3 gap-4">
          <FeatureCard
            title="AI Body Scan"
            emoji="🧍‍♂️"
            desc="Phân tích posture, nhóm cơ yếu, vùng mỡ thừa chỉ trong 15 giây."
            linkText="Thử ngay"
            to="/scan"
          />
          <FeatureCard
            title="Workout Plan cá nhân"
            emoji="📋"
            desc="Tự động sinh plan dựa trên điểm tư thế và mục tiêu của bạn."
            linkText="Xem plan mới nhất"
            to="/plan"
          />
          <FeatureCard
            title="Thư viện bài tập + 3D"
            emoji="🏋️‍♀️"
            desc="Lọc bài tập theo nhóm cơ/level, xem 3D demo để tập đúng kỹ thuật."
            linkText="Xem bài tập"
            to="/exercises"
          />
        </div>
      </section>

      {/* Testimonials */}
      <section className="max-w-6xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-8 h-[2px] bg-emerald-400" />
          <p className="text-sm uppercase tracking-widest text-gray-400">
            Người dùng nói gì
          </p>
        </div>
        <div className="grid md:grid-cols-3 gap-4">
          {testimonials.map((t) => (
            <TestimonialCard key={t.name} {...t} />
          ))}
        </div>
      </section>

      {/* Quick links */}
      <section className="max-w-6xl mx-auto border border-slate-800 rounded-3xl p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
          <div>
            <h3 className="text-2xl font-semibold mb-1">
              Bắt đầu hành trình với FitVision
            </h3>
            <p className="text-gray-400 text-sm">
              Chọn khu vực bạn muốn khám phá đầu tiên.
            </p>
          </div>
          <Link
            to="/auth"
            className="px-4 py-2 rounded-lg bg-emerald-500 text-slate-900 font-semibold text-sm text-center"
          >
            Đăng nhập để lưu tiến độ
          </Link>
        </div>
        <div className="flex flex-wrap gap-3 text-xs sm:text-sm">
          {[
            { to: "/scan", label: "AI Scan" },
            { to: "/dashboard", label: "Dashboard" },
            { to: "/coach", label: "AI Coach" },
            { to: "/history", label: "Lịch sử Scan" },
            { to: "/plan", label: "Workout Plan" },
            { to: "/3d-lab", label: "3D Lab" },
          ].map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className="px-3 py-1.5 rounded-full bg-slate-800 border border-slate-600 text-gray-200 hover:border-emerald-400 hover:text-white"
            >
              ➜ {link.label}
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}

function StatBadge({ label, value, hint }) {
  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-2xl px-4 py-3">
      <div className="text-xs text-gray-400">{label}</div>
      <div className="text-2xl font-semibold text-white">{value}</div>
      <div className="text-[11px] text-gray-500">{hint}</div>
    </div>
  );
}

function HeroStep({ index, title, desc }) {
  return (
    <li className="flex gap-4">
      <span className="text-lg font-mono text-emerald-300">{index}</span>
      <div>
        <p className="text-base font-semibold">{title}</p>
        <p className="text-sm text-gray-400">{desc}</p>
      </div>
    </li>
  );
}

function StepCard({ title, desc }) {
  return (
    <div className="border border-slate-800 rounded-2xl p-4 bg-slate-900/40">
      <p className="text-base font-semibold mb-1">{title}</p>
      <p className="text-sm text-gray-400">{desc}</p>
    </div>
  );
}

function FeatureCard({ title, emoji, desc, linkText, to }) {
  return (
    <div className="bg-slate-800 rounded-2xl border border-slate-700 p-5 flex flex-col justify-between">
      <div>
        <div className="text-3xl mb-3">{emoji}</div>
        <h3 className="text-lg font-semibold mb-2">{title}</h3>
        <p className="text-sm text-gray-300">{desc}</p>
      </div>
      {to && (
        <Link
          to={to}
          className="mt-4 inline-flex items-center text-xs text-emerald-300 hover:text-emerald-200 gap-1"
        >
          {linkText} <span aria-hidden>→</span>
        </Link>
      )}
    </div>
  );
}

function TestimonialCard({ name, quote }) {
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-2xl p-4 flex flex-col gap-3">
      <p className="text-sm text-gray-200 italic">“{quote}”</p>
      <div className="text-xs text-emerald-300 font-semibold">{name}</div>
    </div>
  );
}
