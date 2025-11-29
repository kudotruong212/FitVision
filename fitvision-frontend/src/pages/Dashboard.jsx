// src/pages/Dashboard.jsx
import React from "react";
import { fetchScanStats, downloadWeeklyReport } from "../api/client";
import { Link } from "react-router-dom";

export default function Dashboard() {
  const [stats, setStats] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(null);
  const [exporting, setExporting] = React.useState(false);

  React.useEffect(() => {
    loadStats();
  }, []);

  async function loadStats() {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchScanStats();
      setStats(data);
    } catch (e) {
      console.error(e);
      setError("Không tải được thống kê từ server.");
    } finally {
      setLoading(false);
    }
  }

  async function handleExport() {
    try {
      setExporting(true);
      const blob = await downloadWeeklyReport();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "fitvision-weekly-report.csv";
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
      setError("Không xuất được báo cáo tuần.");
    } finally {
      setExporting(false);
    }
  }

  if (loading) {
    return (
      <div className="p-6">
        <p className="text-sm text-gray-400">Đang tải Dashboard...</p>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="p-6 space-y-3">
        <p className="text-sm text-red-400">{error || "Không có dữ liệu."}</p>
        <button
          onClick={loadStats}
          className="px-3 py-1 text-sm bg-slate-700 rounded text-white"
        >
          Thử lại
        </button>
      </div>
    );
  }

  const {
    totalScans,
    avgScore,
    lastScore,
    lastScanAt,
    byDay,
    rolling = {},
    focusSummary = [],
    fatAreas = [],
  } = stats;
  const rollingAvg = rolling.avg7 ?? avgScore;
  const rollingMonthly = rolling.avg30 ?? avgScore;
  const volatility = rolling.volatility7 ?? 0;
  const last7Usage = byDay.slice(-7).reduce((sum, d) => sum + (d.count || 0), 0);
  const quotaUsagePercent = Math.min(
    100,
    Math.round((last7Usage / (7 * 20 || 1)) * 100)
  );
  const bestDay = byDay.reduce(
    (best, day) => ((day.avgScore || 0) > (best?.avgScore || 0) ? day : best),
    byDay[0] || null
  );
  const recentTwo = byDay.slice(-2);
  const trend =
    recentTwo.length === 2
      ? Math.round((recentTwo[1].avgScore - recentTwo[0].avgScore) * 10) / 10
      : 0;
  const weeklyWindow = byDay.slice(-7);
  const weeklyAvg =
    weeklyWindow.length > 0
      ? Math.round(
          (weeklyWindow.reduce((sum, d) => sum + (d.avgScore || 0), 0) /
            weeklyWindow.length) *
            10
        ) / 10
      : 0;

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-widest text-emerald-300 mb-1">
            Progress Command Center
          </p>
          <h2 className="text-3xl font-bold mb-1">Dashboard tiến bộ</h2>
          <p className="text-gray-300 text-sm">
            Theo dõi điểm tư thế, so sánh các tuần và nhận gợi ý hành động tiếp
            theo.
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={loadStats}
            className="px-3 py-2 rounded-xl border border-slate-600 text-sm"
          >
            Refresh
          </button>
          <button
            onClick={handleExport}
            disabled={exporting}
            className="px-3 py-2 rounded-xl border border-emerald-500/50 text-sm text-emerald-200 disabled:opacity-60"
          >
            {exporting ? "Đang xuất..." : "Xuất CSV tuần"}
          </button>
          <Link
            to="/scan"
            className="px-4 py-2 rounded-xl bg-emerald-500 text-slate-900 text-sm font-semibold"
          >
            + Scan mới
          </Link>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid md:grid-cols-5 gap-4">
        <StatCard
          label="Tổng số lần scan"
          value={totalScans}
          subtitle="Số lần AI đánh giá"
        />
        <StatCard
          label="Điểm trung bình"
          value={avgScore}
          subtitle="Tất cả phiên"
        />
        <StatCard
          label="Điểm gần nhất"
          value={lastScore}
          subtitle={
            lastScanAt
              ? `Lúc ${new Date(lastScanAt).toLocaleString()}`
              : "Chưa có scan"
          }
        />
        <StatCard
          label="Điểm cao nhất"
          value={bestDay?.avgScore ?? "—"}
          subtitle={
            bestDay ? `Ngày ${bestDay.date}` : "Cần thêm dữ liệu để so sánh"
          }
        />
        <StatCard
          label="Trung bình 7 ngày"
          value={rollingAvg}
          subtitle="Xu hướng gần nhất"
        />
        <StatCard
          label="Biến động 7 ngày"
          value={`${volatility} pts`}
          subtitle="Độ dao động điểm"
        />
      </div>

      <div className="grid lg:grid-cols-[2fr,1fr] gap-6">
        {/* Chart + trend */}
        <div className="bg-slate-800 rounded-2xl border border-slate-700 p-5 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold">Trend 14 ngày</h3>
              <p className="text-xs text-gray-400">
                Mỗi cột là điểm trung bình trong ngày. Màu đậm = cao hơn mức
                trung bình tuần.
              </p>
            </div>
            <TrendBadge trend={trend} weeklyAvg={weeklyAvg} />
          </div>

          {byDay.length === 0 ? (
            <p className="text-sm text-gray-400">
              Chưa có dữ liệu. Hãy thực hiện ít nhất 1 lần AI Scan.
            </p>
          ) : (
            <ScoreBarChart data={byDay} weeklyAvg={weeklyAvg} />
          )}
        </div>

        {/* Insights */}
        <div className="space-y-4">
          <InsightCard
            title="Focus tuần này"
            body={
              lastScore >= 80
                ? "Duy trì kỹ thuật và tăng độ khó cho bài core/back."
                : "Tập trung kéo giãn cổ – vai, thêm bài core chống võng."
            }
            cta={{ to: "/plan", label: "Xem plan đề xuất" }}
          />
          <InsightCard
            title="Nhắc nhở"
            body={`Đặt lịch scan cố định (ví dụ thứ 3 & thứ 6). Tuần qua bạn dùng ${quotaUsagePercent}% quota (≈${last7Usage} lần).`}
            cta={{ to: "/history", label: "Xem lịch sử gần đây" }}
          />
          <InsightCard
            title="Hỏi AI Coach"
            body="Bạn có thể gửi điểm + vùng cơ yếu hiện tại để được gợi ý bài tập hỗ trợ."
            cta={{ to: "/coach", label: "Mở AI Coach" }}
          />
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <FocusList data={focusSummary} />
        <FatBreakdown data={fatAreas} monthlyAvg={rollingMonthly} />
      </div>

      {/* Recent logs */}
      <div className="bg-slate-800 rounded-2xl border border-slate-700 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="text-lg font-semibold">Nhật ký scan gần đây</h3>
            <p className="text-xs text-gray-400">
              So sánh nhanh điểm số & tần suất trong 7 ngày cuối.
            </p>
          </div>
          <Link
            to="/history"
            className="text-sm text-emerald-300 hover:text-emerald-200 underline"
          >
            Mở toàn bộ lịch sử →
          </Link>
        </div>
        <RecentDayList data={byDay.slice(-7)} />
      </div>
    </div>
  );
}

function StatCard({ label, value, subtitle }) {
  return (
    <div className="bg-slate-800 rounded-2xl border border-slate-700 p-4">
      <div className="text-xs text-gray-400 mb-1">{label}</div>
      <div className="text-2xl font-bold text-white">{value}</div>
      {subtitle && (
        <div className="mt-1 text-[11px] text-gray-400">{subtitle}</div>
      )}
    </div>
  );
}

function ScoreBarChart({ data, weeklyAvg }) {
  const maxScore = Math.max(...data.map((d) => d.avgScore || 0), 100);

  return (
    <div className="space-y-2">
      <div className="flex items-end gap-2 h-40 border-b border-slate-700 pb-2">
        {data.map((d) => {
          const score = d.avgScore || 0;
          const h = (score / maxScore) * 100;
          const aboveWeekly = score >= weeklyAvg;
          return (
            <div
              key={d.date}
              className="flex-1 flex flex-col items-center justify-end gap-2"
            >
              <div
                className={`w-3 rounded-t ${aboveWeekly ? "bg-emerald-400" : "bg-slate-600"}`}
                style={{ height: `${h}%` }}
                title={`${d.date}: ${score}`}
              />
            </div>
          );
        })}
      </div>
      <div className="flex gap-2 mt-1 text-[10px] text-gray-400">
        {data.map((d) => (
          <div key={d.date} className="flex-1 text-center truncate">
            {d.date.slice(5)}
          </div>
        ))}
      </div>
    </div>
  );
}

function TrendBadge({ trend, weeklyAvg }) {
  const positive = trend >= 0;
  return (
    <div
      className={`px-3 py-2 rounded-xl text-xs font-semibold ${
        positive
          ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
          : "bg-amber-500/10 text-amber-200 border border-amber-500/30"
      }`}
    >
      {positive ? "↑" : "↓"} {Math.abs(trend)} điểm vs lần trước · TB tuần:{" "}
      {weeklyAvg}
    </div>
  );
}

function InsightCard({ title, body, cta }) {
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-2xl p-4 flex flex-col gap-3">
      <div>
        <p className="text-sm text-gray-400 uppercase tracking-wide mb-1">
          Gợi ý
        </p>
        <h4 className="text-lg font-semibold">{title}</h4>
      </div>
      <p className="text-sm text-gray-300 flex-1">{body}</p>
      {cta && (
        <Link
          to={cta.to}
          className="text-sm text-emerald-300 hover:text-emerald-200 underline"
        >
          {cta.label}
        </Link>
      )}
    </div>
  );
}

function RecentDayList({ data }) {
  if (data.length === 0) {
    return <p className="text-sm text-gray-400">Chưa có dữ liệu.</p>;
  }

  return (
    <div className="space-y-3">
      {data.map((d) => (
        <div
          key={d.date}
          className="flex flex-wrap items-center justify-between gap-3 border border-slate-700 rounded-xl px-4 py-3 bg-slate-900/40"
        >
          <div>
            <p className="text-sm font-semibold text-white">{d.date}</p>
            <p className="text-xs text-gray-400">
              {d.count} lần scan · TB {d.avgScore}
            </p>
          </div>
          <div className="text-sm text-emerald-300">+{d.avgScore - 50} pts</div>
        </div>
      ))}
    </div>
  );
}

function FocusList({ data }) {
  return (
    <div className="bg-slate-800 rounded-2xl border border-slate-700 p-5 space-y-3">
      <div>
        <h3 className="text-lg font-semibold">Focus cần ưu tiên</h3>
        <p className="text-xs text-gray-400">
          Dựa trên các nhóm cơ yếu xuất hiện nhiều nhất.
        </p>
      </div>
      {data.length === 0 ? (
        <p className="text-sm text-gray-400">Chưa đủ dữ liệu.</p>
      ) : (
        <ul className="space-y-2">
          {data.map((item) => (
            <li
              key={item.focus}
              className="flex items-center justify-between text-sm text-gray-200 border border-slate-700 rounded-xl px-3 py-2 bg-slate-900/40"
            >
              <div>
                <p className="font-semibold">{item.focus}</p>
                <p className="text-xs text-gray-400">
                  {item.sessions} lần xuất hiện · Δ {item.avgDelta} pts
                </p>
              </div>
              <span className="text-emerald-300 text-sm">
                Avg {item.avgScore}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function FatBreakdown({ data, monthlyAvg }) {
  return (
    <div className="bg-slate-800 rounded-2xl border border-slate-700 p-5 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Phân bố vùng mỡ</h3>
          <p className="text-xs text-gray-400">
            Theo thống kê tất cả phiên gần đây.
          </p>
        </div>
        <span className="text-xs text-emerald-300">
          Avg 30 ngày: {monthlyAvg}
        </span>
      </div>
      {data.length === 0 ? (
        <p className="text-sm text-gray-400">Chưa có dữ liệu vùng mỡ.</p>
      ) : (
        <div className="space-y-2">
          {data.slice(0, 5).map((item) => (
            <div
              key={item.area}
              className="flex items-center justify-between text-sm text-gray-200"
            >
              <span>{item.area}</span>
              <span className="text-emerald-300">{item.count} lần</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
