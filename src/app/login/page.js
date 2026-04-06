"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import styles from "./login.module.css";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function LoginPage() {
    const router = useRouter();
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [fullName, setFullName] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [checking, setChecking] = useState(true);

    // Auth guard: if token exists and is valid, redirect to dashboard
    useEffect(() => {
        const token = localStorage.getItem("token");
        if (!token) {
            setChecking(false);
            return;
        }
        fetch(`${API_BASE}/api/auth/me`, {
            headers: { Authorization: `Bearer ${token}` },
        })
            .then((res) => {
                if (res.ok) {
                    router.replace("/dashboard");
                } else {
                    localStorage.removeItem("token");
                    setChecking(false);
                }
            })
            .catch(() => {
                localStorage.removeItem("token");
                setChecking(false);
            });
    }, [router]);

    if (checking) {
        return (
            <div className={styles.loginContainer}>
                <div style={{ textAlign: "center", padding: 60, color: "var(--text-muted)" }}>
                    Checking session...
                </div>
            </div>
        );
    }

    const handleSubmit = async () => {
        setError("");
        setLoading(true);

        try {
            if (isLogin) {
                const res = await fetch(`${API_BASE}/api/auth/login`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ email, password }),
                });

                if (!res.ok) {
                    const data = await res.json();
                    throw new Error(data.detail || "Invalid credentials");
                }

                const data = await res.json();
                localStorage.setItem("token", data.access_token);
                window.location.href = "/dashboard";
            } else {
                const res = await fetch(`${API_BASE}/api/auth/register`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ email, password, name: fullName }),
                });

                if (!res.ok) {
                    const data = await res.json();
                    throw new Error(data.detail || "Registration failed");
                }

                const loginRes = await fetch(`${API_BASE}/api/auth/login`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ email, password }),
                });

                if (loginRes.ok) {
                    const loginData = await loginRes.json();
                    localStorage.setItem("token", loginData.access_token);
                    window.location.href = "/dashboard";
                } else {
                    setIsLogin(true);
                    setError("Registered successfully! Please log in.");
                }
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === "Enter" && !loading) handleSubmit();
    };

    return (
        <div className={styles.loginContainer}>
            <div className={styles.loginCard}>
                {/* Logo */}
                <div className={styles.logoSection}>
                    <div className={styles.logoIcon}>
                        {/* ✅ Correct: <img> with src, not <svg> with xmlns */}
                        <img
                            src="https://land-invest.io/wp-content/uploads/2025/10/Asset-22.svg"
                            alt="LandInvestAI Logo"
                        />
                    </div>
                    <h1 className={styles.logoTitle}>
                        LandInvest<span className={styles.logoTitleAccent}>AI</span>
                    </h1>
                    <p className={styles.logoSubtitle}>
                        {isLogin ? "Sign in to your account" : "Create your account"}
                    </p>
                </div>

                {/* Error */}
                {error && <div className={styles.errorMsg}>{error}</div>}

                {/* div instead of form — prevents Chrome breach popup */}
                <div className={styles.form}>
                    {!isLogin && (
                        <div className={styles.inputGroup}>
                            <label className={styles.inputLabel}>Full Name</label>
                            <div className={styles.inputWrapper}>
                                <svg className={styles.inputIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
                                    <circle cx="12" cy="7" r="4" />
                                </svg>
                                <input
                                    className={styles.input}
                                    type="text"
                                    placeholder="John Doe"
                                    value={fullName}
                                    onChange={(e) => setFullName(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    autoComplete="off"
                                />
                            </div>
                        </div>
                    )}

                    <div className={styles.inputGroup}>
                        <label className={styles.inputLabel}>Email Address</label>
                        <div className={styles.inputWrapper}>
                            <svg className={styles.inputIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <rect x="2" y="4" width="20" height="16" rx="2" />
                                <path d="M22 4L12 13L2 4" />
                            </svg>
                            <input
                                className={styles.input}
                                type="email"
                                placeholder="you@example.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                onKeyDown={handleKeyDown}
                                autoComplete="off"
                            />
                        </div>
                    </div>

                    <div className={styles.inputGroup}>
                        <label className={styles.inputLabel}>Password</label>
                        <div className={styles.inputWrapper}>
                            <svg className={styles.inputIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                                <path d="M7 11V7a5 5 0 0110 0v4" />
                            </svg>
                            <input
                                className={styles.input}
                                type={showPassword ? "text" : "password"}
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                onKeyDown={handleKeyDown}
                                autoComplete="new-password"
                                minLength={6}
                            />
                            <button
                                type="button"
                                className={styles.eyeBtn}
                                onClick={() => setShowPassword((prev) => !prev)}
                                tabIndex={-1}
                                aria-label={showPassword ? "Hide password" : "Show password"}
                            >
                                {showPassword ? (
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94" />
                                        <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19" />
                                        <line x1="1" y1="1" x2="23" y2="23" />
                                    </svg>
                                ) : (
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                                        <circle cx="12" cy="12" r="3" />
                                    </svg>
                                )}
                            </button>
                        </div>
                    </div>

                    {isLogin && (
                        <a href="#" className={styles.forgotLink}>
                            Forgot password?
                        </a>
                    )}

                    <button
                        className={styles.submitBtn}
                        type="button"
                        onClick={handleSubmit}
                        disabled={loading}
                    >
                        <span className={styles.submitBtnText}>
                            {loading && <span className={styles.spinner}></span>}
                            {loading
                                ? isLogin ? "Signing in..." : "Creating account..."
                                : isLogin ? "Sign In" : "Create Account"}
                            {!loading && (
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                    <path d="M5 12h14M12 5l7 7-7 7" />
                                </svg>
                            )}
                        </span>
                    </button>

                    <div className={styles.divider}>or</div>

                    <p className={styles.registerLink}>
                        {isLogin ? (
                            <>
                                Don&apos;t have an account?{" "}
                                <a href="#" onClick={(e) => { e.preventDefault(); setIsLogin(false); setError(""); }}>
                                    Sign up
                                </a>
                            </>
                        ) : (
                            <>
                                Already have an account?{" "}
                                <a href="#" onClick={(e) => { e.preventDefault(); setIsLogin(true); setError(""); }}>
                                    Sign in
                                </a>
                            </>
                        )}
                    </p>
                </div>
            </div>
        </div>
    );
}
