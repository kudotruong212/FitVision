// src/pages/Auth.jsx
import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { loginUser, registerUser, requestPasswordReset, resetPassword } from "../api/client";
import { useAuth } from "../context/AuthContext.jsx";

export default function AuthPage() {
    const [mode, setMode] = React.useState("login"); // "login" | "register" | "forgot-password" | "reset-password"
    const [name, setName] = React.useState("");
    const [email, setEmail] = React.useState("");
    const [password, setPassword] = React.useState("");
    const [newPassword, setNewPassword] = React.useState("");
    const [resetToken, setResetToken] = React.useState("");
    const [rememberMe, setRememberMe] = React.useState(false);
    const [loading, setLoading] = React.useState(false);
    const [error, setError] = React.useState(null);
    const [success, setSuccess] = React.useState(null);
    const { setUser, isAuthenticated, authLoading } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    // Check for reset token in URL
    React.useEffect(() => {
        const params = new URLSearchParams(location.search);
        const token = params.get("token");
        if (token) {
            setMode("reset-password");
            setResetToken(token);
        }
    }, [location.search]);

    // Nếu đã đăng nhập, redirect ngay lập tức
    React.useEffect(() => {
        if (isAuthenticated) {
            const from = location.state?.from || "/dashboard";
            navigate(from, { replace: true });
        }
    }, [isAuthenticated, navigate, location.state]);

    // Check for email verification token in URL
    React.useEffect(() => {
        const params = new URLSearchParams(location.search);
        const verifyToken = params.get("verify");
        if (verifyToken && isAuthenticated) {
            // Handle email verification
            import("../api/client").then(({ verifyEmail }) => {
                verifyEmail(verifyToken)
                    .then(() => {
                        setSuccess("Email đã được xác nhận thành công!");
                        // Refresh user data
                        setUser((prev) => (prev ? { ...prev, email_verified: true } : prev));
                    })
                    .catch((err) => {
                        setError(err.response?.data?.error || "Không xác nhận được email.");
                    });
            });
        }
    }, [location.search, isAuthenticated, setUser]);

    function validatePassword(pwd) {
        if (pwd.length < 8) return "Mật khẩu phải có ít nhất 8 ký tự";
        if (!/[a-z]/.test(pwd)) return "Mật khẩu phải có ít nhất 1 chữ thường";
        if (!/[A-Z]/.test(pwd)) return "Mật khẩu phải có ít nhất 1 chữ hoa";
        if (!/\d/.test(pwd)) return "Mật khẩu phải có ít nhất 1 số";
        return null;
    }

    function getPasswordStrength(pwd) {
        if (!pwd) return { strength: 0, label: "", color: "" };
        let strength = 0;
        if (pwd.length >= 8) strength++;
        if (/[a-z]/.test(pwd)) strength++;
        if (/[A-Z]/.test(pwd)) strength++;
        if (/\d/.test(pwd)) strength++;
        if (/[^a-zA-Z0-9]/.test(pwd)) strength++;

        if (strength <= 2) return { strength, label: "Yếu", color: "red" };
        if (strength <= 3) return { strength, label: "Trung bình", color: "yellow" };
        if (strength <= 4) return { strength, label: "Mạnh", color: "emerald" };
        return { strength, label: "Rất mạnh", color: "emerald" };
    }

    const passwordStrength = mode === "register" ? getPasswordStrength(password) : null;

    async function handleSubmit(e) {
        e.preventDefault();
        setError(null);
        setSuccess(null);

        setLoading(true);

        try {
            if (mode === "forgot-password") {
                await requestPasswordReset(email);
                setSuccess("Nếu email tồn tại, bạn sẽ nhận được link đặt lại mật khẩu trong email.");
                setEmail("");
            } else if (mode === "reset-password") {
                const pwdError = validatePassword(newPassword);
                if (pwdError) {
                    setError(pwdError);
                    setLoading(false);
                    return;
                }
                await resetPassword(resetToken, newPassword);
                setSuccess("Mật khẩu đã được đặt lại thành công. Bạn có thể đăng nhập ngay.");
                setTimeout(() => {
                    setMode("login");
                    setResetToken("");
                    setNewPassword("");
                }, 2000);
            } else if (mode === "register") {
                const pwdError = validatePassword(password);
                if (pwdError) {
                    setError(pwdError);
                    setLoading(false);
                    return;
                }
                const user = await registerUser({ name, email, password, rememberMe });
                setUser(user);
                setSuccess(`Đăng ký thành công. Xin chào ${user.name || user.email}!`);
                // Check if profile needs onboarding
                if (!user.profile?.goal) {
                    setTimeout(() => {
                        navigate("/onboarding", { replace: true });
                    }, 500);
                    return;
                }
                // Redirect sẽ được xử lý bởi useEffect khi isAuthenticated thay đổi
            } else {
                const user = await loginUser({ email, password, rememberMe });
                setUser(user);
                setSuccess(`Đăng nhập thành công. Xin chào ${user.name || user.email}!`);
                // Redirect sẽ được xử lý bởi useEffect khi isAuthenticated thay đổi
            }
        } catch (err) {
            console.error(err);
            let msg = "Có lỗi xảy ra. Vui lòng thử lại.";
            
            if (err.response?.data?.error) {
                msg = err.response.data.error;
            } else if (err.response?.status === 401) {
                msg = "Sai email hoặc mật khẩu. Vui lòng kiểm tra lại.";
            } else if (err.response?.status === 409) {
                msg = "Email này đã được đăng ký. Vui lòng đăng nhập hoặc dùng email khác.";
            } else if (err.response?.status === 400) {
                msg = "Thông tin không hợp lệ. Vui lòng kiểm tra lại.";
            } else if (err.response?.status === 429) {
                msg = "Bạn đã thử quá nhiều lần. Vui lòng đợi vài phút rồi thử lại.";
            } else if (err.response?.status >= 500) {
                msg = "Lỗi máy chủ. Vui lòng thử lại sau.";
            } else if (!err.response) {
                msg = "Không thể kết nối đến máy chủ. Vui lòng kiểm tra kết nối mạng.";
            }
            
            setError(msg);
        } finally {
            setLoading(false);
        }
    }

    if (authLoading) {
        return (
            <div className="min-h-[calc(100vh-80px)] flex items-center justify-center p-4">
                <div className="flex flex-col items-center gap-4">
                    <svg
                        className="animate-spin h-8 w-8 text-emerald-500"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                    >
                        <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                        />
                        <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        />
                    </svg>
                    <p className="text-gray-400 text-sm">Đang tải...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-[calc(100vh-80px)] flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 md:p-8 w-full max-w-md shadow-xl">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-white">
                        {mode === "login" && "Đăng nhập"}
                        {mode === "register" && "Đăng ký tài khoản"}
                        {mode === "forgot-password" && "Quên mật khẩu"}
                        {mode === "reset-password" && "Đặt lại mật khẩu"}
                    </h2>
                    <div className="flex items-center justify-between">
                        {mode === "login" && (
                            <button
                                type="button"
                                onClick={() => {
                                    setMode("forgot-password");
                                    setError(null);
                                    setSuccess(null);
                                    setPassword("");
                                }}
                                className="text-sm text-gray-400 hover:text-emerald-300 transition-colors"
                            >
                                Quên mật khẩu?
                            </button>
                        )}
                        {mode !== "forgot-password" && mode !== "reset-password" && (
                            <button
                                type="button"
                                onClick={() => {
                                    setMode(mode === "login" ? "register" : "login");
                                    setError(null);
                                    setSuccess(null);
                                    setPassword("");
                                    setEmail("");
                                    setName("");
                                }}
                                className="text-sm text-emerald-400 hover:text-emerald-300 underline underline-offset-2 transition-colors"
                            >
                                {mode === "login" ? "Chưa có tài khoản? Đăng ký" : "Đã có tài khoản? Đăng nhập"}
                            </button>
                        )}
                        {(mode === "forgot-password" || mode === "reset-password") && (
                            <button
                                type="button"
                                onClick={() => {
                                    setMode("login");
                                    setError(null);
                                    setSuccess(null);
                                    setEmail("");
                                    setPassword("");
                                    setNewPassword("");
                                    setResetToken("");
                                }}
                                className="text-sm text-emerald-400 hover:text-emerald-300 underline underline-offset-2 transition-colors"
                            >
                                Quay lại đăng nhập
                            </button>
                        )}
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-3">
                    {mode === "register" && (
                        <div>
                            <label className="block text-sm text-gray-300 mb-1">
                                Họ tên (tuỳ chọn)
                            </label>
                            <input
                                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Nhập tên của bạn"
                            />
                        </div>
                    )}

                    {(mode === "login" || mode === "register" || mode === "forgot-password") && (
                        <div>
                            <label className="block text-sm text-gray-300 mb-1">
                                Email
                            </label>
                            <input
                                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                                type="email"
                                required
                                value={email}
                                onChange={(e) => {
                                    setEmail(e.target.value);
                                    setError(null);
                                }}
                                placeholder="you@example.com"
                            />
                        </div>
                    )}

                    {mode === "reset-password" && (
                        <div>
                            <label className="block text-sm text-gray-300 mb-1">
                                Mật khẩu mới
                            </label>
                            <input
                                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                                type="password"
                                required
                                value={newPassword}
                                onChange={(e) => {
                                    setNewPassword(e.target.value);
                                    setError(null);
                                }}
                                placeholder="••••••••"
                            />
                            {newPassword && (
                                <div className="mt-2">
                                    <div className="flex items-center gap-2 mb-1">
                                        <div className="flex-1 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                                            <div
                                                className={`h-full transition-all duration-300 ${
                                                    getPasswordStrength(newPassword).color === "red"
                                                        ? "bg-red-500"
                                                        : getPasswordStrength(newPassword).color === "yellow"
                                                        ? "bg-yellow-500"
                                                        : "bg-emerald-500"
                                                }`}
                                                style={{
                                                    width: `${(getPasswordStrength(newPassword).strength / 5) * 100}%`,
                                                }}
                                            />
                                        </div>
                                        <span
                                            className={`text-xs ${
                                                getPasswordStrength(newPassword).color === "red"
                                                    ? "text-red-400"
                                                    : getPasswordStrength(newPassword).color === "yellow"
                                                    ? "text-yellow-400"
                                                    : "text-emerald-400"
                                            }`}
                                        >
                                            {getPasswordStrength(newPassword).label}
                                        </span>
                                    </div>
                                    <div className="text-xs text-gray-400">
                                        Mật khẩu phải ≥ 8 ký tự, có chữ hoa, chữ thường và số
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {(mode === "login" || mode === "register") && (
                        <div>
                            <label className="block text-sm text-gray-300 mb-1">
                                Mật khẩu
                            </label>
                            <input
                                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                                type="password"
                                required
                                value={password}
                                onChange={(e) => {
                                    setPassword(e.target.value);
                                    setError(null);
                                }}
                                placeholder="••••••••"
                            />
                            {mode === "register" && password && (
                                <div className="mt-2">
                                    <div className="flex items-center gap-2 mb-1">
                                    <div className="flex-1 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                                        <div
                                            className={`h-full transition-all duration-300 ${
                                                passwordStrength.color === "red"
                                                    ? "bg-red-500"
                                                    : passwordStrength.color === "yellow"
                                                    ? "bg-yellow-500"
                                                    : "bg-emerald-500"
                                            }`}
                                            style={{
                                                width: `${(passwordStrength.strength / 5) * 100}%`,
                                            }}
                                        />
                                    </div>
                                    <span
                                        className={`text-xs ${
                                            passwordStrength.color === "red"
                                                ? "text-red-400"
                                                : passwordStrength.color === "yellow"
                                                ? "text-yellow-400"
                                                : "text-emerald-400"
                                        }`}
                                    >
                                        {passwordStrength.label}
                                    </span>
                                    </div>
                                    <div className="text-xs text-gray-400">
                                        Mật khẩu phải ≥ 8 ký tự, có chữ hoa, chữ thường và số
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {error && (
                        <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">
                            {error}
                        </div>
                    )}
                    {success && (
                        <div className="text-sm text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 rounded-lg px-3 py-2">
                            {success}
                        </div>
                    )}

                    {(mode === "login" || mode === "register") && (
                        <div className="flex items-center">
                            <input
                                type="checkbox"
                                id="rememberMe"
                                checked={rememberMe}
                                onChange={(e) => setRememberMe(e.target.checked)}
                                className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-emerald-500 focus:ring-2 focus:ring-emerald-500 focus:ring-offset-0 focus:ring-offset-slate-900"
                            />
                            <label htmlFor="rememberMe" className="ml-2 text-sm text-gray-300 cursor-pointer">
                                Ghi nhớ đăng nhập
                            </label>
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full mt-2 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold py-2.5 rounded-lg text-sm transition-colors duration-200 flex items-center justify-center gap-2"
                    >
                        {loading ? (
                            <>
                                <svg
                                    className="animate-spin h-4 w-4"
                                    xmlns="http://www.w3.org/2000/svg"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                >
                                    <circle
                                        className="opacity-25"
                                        cx="12"
                                        cy="12"
                                        r="10"
                                        stroke="currentColor"
                                        strokeWidth="4"
                                    />
                                    <path
                                        className="opacity-75"
                                        fill="currentColor"
                                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                    />
                                </svg>
                                <span>Đang xử lý...</span>
                            </>
                        ) : mode === "login" ? (
                            "Đăng nhập"
                        ) : mode === "register" ? (
                            "Đăng ký"
                        ) : mode === "forgot-password" ? (
                            "Gửi link đặt lại mật khẩu"
                        ) : (
                            "Đặt lại mật khẩu"
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
}
