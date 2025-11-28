// src/pages/Auth.jsx
import React from "react";
import { loginUser, registerUser } from "../api/client";
import { useAuth } from "../context/AuthContext.jsx";

export default function AuthPage() {
    const [mode, setMode] = React.useState("login"); // "login" | "register"
    const [name, setName] = React.useState("");
    const [email, setEmail] = React.useState("");
    const [password, setPassword] = React.useState("");
    const [loading, setLoading] = React.useState(false);
    const [error, setError] = React.useState(null);
    const [success, setSuccess] = React.useState(null);
    const { setUser } = useAuth();

    async function handleSubmit(e) {
        e.preventDefault();
        setError(null);
        setSuccess(null);
        setLoading(true);

        try {
            if (mode === "register") {
                const user = await registerUser({ name, email, password });
                setUser(user);
                setSuccess(`Đăng ký thành công. Xin chào ${user.name || user.email}!`);
            } else {
                const user = await loginUser({ email, password });
                setUser(user);
                setSuccess(`Đăng nhập thành công. Xin chào ${user.name || user.email}!`);
            }
        } catch (err) {
            console.error(err);
            const msg =
                err.response?.data?.error || "Có lỗi xảy ra. Vui lòng thử lại.";
            setError(msg);
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="min-h-[calc(100vh-80px)] flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-md">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl font-bold text-white">
                        {mode === "login" ? "Đăng nhập" : "Đăng ký tài khoản"}
                    </h2>
                    <button
                        type="button"
                        onClick={() => {
                            setMode(mode === "login" ? "register" : "login");
                            setError(null);
                            setSuccess(null);
                        }}
                        className="text-sm text-emerald-400 hover:text-emerald-300"
                    >
                        {mode === "login" ? "Chưa có tài khoản?" : "Đã có tài khoản?"}
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-3">
                    {mode === "register" && (
                        <div>
                            <label className="block text-sm text-gray-300 mb-1">
                                Họ tên (tuỳ chọn)
                            </label>
                            <input
                                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Nhập tên của bạn"
                            />
                        </div>
                    )}

                    <div>
                        <label className="block text-sm text-gray-300 mb-1">
                            Email
                        </label>
                        <input
                            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white"
                            type="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="you@example.com"
                        />
                    </div>

                    <div>
                        <label className="block text-sm text-gray-300 mb-1">
                            Mật khẩu
                        </label>
                        <input
                            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white"
                            type="password"
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                        />
                    </div>

                    {error && (
                        <div className="text-sm text-red-400">{error}</div>
                    )}
                    {success && (
                        <div className="text-sm text-emerald-400">{success}</div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full mt-2 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-60 text-white font-semibold py-2 rounded-lg text-sm"
                    >
                        {loading
                            ? "Đang xử lý..."
                            : mode === "login"
                                ? "Đăng nhập"
                                : "Đăng ký"}
                    </button>
                </form>
            </div>
        </div>
    );
}
