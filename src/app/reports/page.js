"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import styles from "./reports.module.css";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function ReportsPage() {
    const router = useRouter();
    const [user, setUser] = useState(null);
    const [reports, setReports] = useState([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const token = localStorage.getItem("token");
        if (!token) {
            router.replace("/login");
            return;
        }

        fetch(`${API_BASE}/api/auth/me`, {
            headers: { Authorization: `Bearer ${token}` },
        })
            .then((res) => {
                if (res.status === 401) {
                    localStorage.removeItem("token");
                    router.replace("/login");
                    throw new Error("Unauthorized");
                }
                if (!res.ok) throw new Error("Failed");
                return res.json();
            })
            .then(setUser)
            .catch((err) => {
                if (err.message !== "Unauthorized") {
                    console.error("Auth check failed:", err);
                }
            });

        fetchReports(token);
    }, [router]);

    const fetchReports = async (token, search = "") => {
        setLoading(true);
        try {
            const url = search
                ? `${API_BASE}/api/apn/reports?search=${encodeURIComponent(search)}&limit=10`
                : `${API_BASE}/api/apn/reports?limit=10`;
            const res = await fetch(url, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (res.ok) {
                const data = await res.json();
                setReports(data);
            }
        } catch {
            // ignore
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = (e) => {
        e.preventDefault();
        const token = localStorage.getItem("token");
        fetchReports(token, searchQuery.trim());
    };

    const fmt = (v) => (v != null ? `$${Number(v).toLocaleString()}` : "—");

    return (
        <div className={styles.reportsPage}>
            <Navbar userName={user?.name} />

            <div className={styles.container}>
                <div className={styles.header}>
                    <h1 className={styles.title}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                            <polyline points="14 2 14 8 20 8" />
                            <line x1="16" y1="13" x2="8" y2="13" />
                            <line x1="16" y1="17" x2="8" y2="17" />
                        </svg>
                        Reports
                    </h1>
                    <p className={styles.subtitle}>
                        Browse completed due diligence reports. Search by APN to find specific parcels.
                    </p>
                </div>

                {/* Search Bar */}
                <form onSubmit={handleSearch} className={styles.searchForm}>
                    <div className={styles.searchRow}>
                        <svg className={styles.searchIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="11" cy="11" r="8" />
                            <path d="M21 21l-4.35-4.35" />
                        </svg>
                        <input
                            className={styles.searchInput}
                            type="text"
                            placeholder="Search by APN number..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                        <button className={styles.searchBtn} type="submit">Search</button>
                    </div>
                </form>

                {/* Reports List */}
                {loading ? (
                    <div className={styles.loadingState}>
                        <div className={styles.spinner} />
                        <p>Loading reports...</p>
                    </div>
                ) : reports.length === 0 ? (
                    <div className={styles.emptyState}>
                        <div className={styles.emptyIcon}>📋</div>
                        <p className={styles.emptyTitle}>
                            {searchQuery ? "No reports found" : "No reports yet"}
                        </p>
                        <p className={styles.emptySubtitle}>
                            {searchQuery
                                ? `No reports match APN "${searchQuery}". Try a different search.`
                                : "Run an APN analysis from the Dashboard to create your first report."}
                        </p>
                    </div>
                ) : (
                    <div className={styles.reportsList}>
                        {reports.map((report) => (
                            <div
                                key={report.id}
                                className={styles.reportCard}
                                onClick={() => router.push(`/report/${report.id}`)}
                            >
                                <div className={styles.reportLeft}>
                                    <div className={styles.reportIcon}>
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--primary-green)" strokeWidth="2">
                                            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
                                            <circle cx="12" cy="10" r="3" />
                                        </svg>
                                    </div>
                                    <div>
                                        <div className={styles.reportApn}>APN: {report.apn}</div>
                                        <div className={styles.reportMeta}>
                                            {report.county}, {report.state} · {report.acreage ? `${report.acreage} acres` : "—"}
                                            {report.created_at && (
                                                <> · {new Date(report.created_at).toLocaleDateString()}</>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className={styles.reportRight}>
                                    <div className={styles.reportStat}>
                                        <div className={styles.reportStatLabel}>Deal Score</div>
                                        <div className={styles.reportStatValue} style={{
                                            color: report.deal_score >= 70 ? "var(--success)" :
                                                report.deal_score >= 40 ? "var(--warning)" : "var(--error)"
                                        }}>
                                            {report.deal_score || "—"}
                                        </div>
                                    </div>
                                    <div className={styles.reportStat}>
                                        <div className={styles.reportStatLabel}>Bid Ceiling</div>
                                        <div className={styles.reportStatValue}>
                                            {fmt(report.bid_ceiling)}
                                        </div>
                                    </div>
                                    <div className={styles.reportStat}>
                                        <div className={styles.reportStatLabel}>Market Value</div>
                                        <div className={styles.reportStatValue} style={{ color: "var(--accent-gold)" }}>
                                            {fmt(report.estimated_market_value)}
                                        </div>
                                    </div>
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2">
                                        <path d="M9 18l6-6-6-6" />
                                    </svg>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
