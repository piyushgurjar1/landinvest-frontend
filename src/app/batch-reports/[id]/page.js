"use client";
import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Navbar from "@/components/Navbar";
import styles from "./batchdetail.module.css";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function BatchDetailPage() {
    const router = useRouter();
    const params = useParams();
    const [user, setUser] = useState(null);
    const [batch, setBatch] = useState(null);
    const [loading, setLoading] = useState(true);
    const [retrying, setRetrying] = useState(false);

    const fetchBatch = async (token) => {
        try {
            const res = await fetch(`${API_BASE}/api/apn/batches/${params.id}`, {
                headers: { Authorization: `Bearer ${token}` },
                cache: "no-store",
            });
            if (!res.ok) { router.replace("/batch-reports"); return; }
            setBatch(await res.json());
        } catch { router.replace("/batch-reports"); }
        finally { setLoading(false); }
    };

    useEffect(() => {
        const token = localStorage.getItem("token");
        if (!token) { router.replace("/login"); return; }

        fetch(`${API_BASE}/api/auth/me`, {
            headers: { Authorization: `Bearer ${token}` },
        })
            .then((res) => {
                if (res.status === 401) { localStorage.removeItem("token"); router.replace("/login"); throw new Error("Unauthorized"); }
                if (!res.ok) throw new Error("Failed");
                return res.json();
            })
            .then(setUser)
            .catch(() => { });

        fetchBatch(token);
    }, [params.id, router]);

    // Auto-refresh while processing
    useEffect(() => {
        if (!batch || batch.status !== "processing") return;
        const timer = setInterval(() => {
            const token = localStorage.getItem("token");
            if (token) fetchBatch(token);
        }, 8000);
        return () => clearInterval(timer);
    }, [batch]);

    const statusColor = (s) =>
        s === "completed" ? "var(--success)" :
            s === "processing" ? "var(--warning)" :
                s === "pending" || s === "interrupted" ? "var(--text-muted)" :
                    "var(--error)";

    const statusIcon = (s) =>
        s === "completed" ? "✓" :
            s === "processing" ? "⟳" :
                s === "pending" ? "⏳" :
                    s === "interrupted" ? "⏸" :
                        "✗";

    if (loading || !batch) {
        return (
            <div className={styles.page}>
                <Navbar userName={user?.name} userRole={user?.role} />
                <div className={styles.loadingContainer}>
                    <div className={styles.spinner} />
                    <div className={styles.loadingText}>Loading batch details…</div>
                </div>
            </div>
        );
    }

    const items = batch.items || [];

    // Dynamically calculate processed count from individual items
    const activeProcessedCount = items.filter(i => i.status === "completed" || i.status === "failed").length;
    const progress = batch.total_properties > 0
        ? Math.round((activeProcessedCount / batch.total_properties) * 100)
        : 0;

    const isInterrupted = batch.status === "completed" && activeProcessedCount < batch.total_properties;
    const displayStatus = isInterrupted ? "interrupted" : batch.status;

    return (
        <div className={styles.page}>
            <Navbar userName={user?.name} userRole={user?.role} />
            <div className={styles.container}>
                {/* Back link */}
                <button className={styles.backBtn} onClick={() => router.push("/batch-reports")}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M15 18l-6-6 6-6" />
                    </svg>
                    Back to Batch Reports
                </button>

                {/* Header */}
                <div className={styles.header}>
                    <div className={styles.headerTop}>
                        <h1 className={styles.title}>{batch.filename}</h1>
                        <div
                            className={styles.statusBadge}
                            style={{ color: statusColor(displayStatus), borderColor: statusColor(displayStatus) }}
                        >
                            {statusIcon(displayStatus)} {displayStatus}
                        </div>
                    </div>
                    <div className={styles.headerMeta}>
                        {batch.total_properties} properties ·
                        {activeProcessedCount} processed ·
                        {batch.created_at && <> {new Date(batch.created_at).toLocaleString()}</>}
                    </div>
                    <div className={styles.progressBarLarge}>
                        <div
                            className={styles.progressFillLarge}
                            style={{
                                width: `${progress}%`,
                                background: statusColor(displayStatus),
                            }}
                        />
                    </div>
                    <div className={styles.progressPercent}>{progress}% complete</div>
                </div>

                {/* Retry / Resume Button */}
                {batch.status !== "processing" && items.some(i => i.status === "failed" || i.status === "pending") && (
                    <button
                        className={styles.retryBtn}
                        disabled={retrying}
                        onClick={async () => {
                            setRetrying(true);
                            try {
                                const token = localStorage.getItem("token");
                                const res = await fetch(`${API_BASE}/api/apn/batches/${params.id}/retry-failed`, {
                                    method: "POST",
                                    headers: { Authorization: `Bearer ${token}` },
                                });
                                if (res.ok) {
                                    // Optimistic UI update to instantly show processing & hide button 
                                    setBatch(prev => prev ? { ...prev, status: "processing" } : null);

                                    // Await the fresh data fetch so finally block waits
                                    await fetchBatch(token);
                                }
                            } catch { /* ignore */ }
                            finally { setRetrying(false); }
                        }}
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M1 4v6h6M23 20v-6h-6" />
                            <path d="M20.49 9A9 9 0 005.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 013.51 15" />
                        </svg>
                        {retrying ? "Resuming..." : "Retry Failed Reports"}
                    </button>
                )}

                {/* Items table */}
                <div className={styles.tableWrapper}>
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>APN</th>
                                <th>Address</th>
                                <th>County</th>
                                <th>State</th>
                                <th>Deal Score</th>
                                <th>Bid Ceiling</th>
                                <th>Market Value</th>
                                <th>Status</th>
                                <th>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {items.map((item, idx) => (
                                <tr key={item.id} className={item.status === "failed" ? styles.rowFailed : ""}>
                                    <td className={styles.cellNum}>{idx + 1}</td>
                                    <td className={styles.cellApn}>{item.apn}</td>
                                    <td>{item.address || "—"}</td>
                                    <td>{item.county || "—"}</td>
                                    <td>{item.state || "—"}</td>
                                    <td className={styles.cellScore}>
                                        {item.deal_score != null ? (
                                            <span style={{
                                                color: item.deal_score >= 70 ? 'var(--success)' : item.deal_score >= 40 ? 'var(--warning)' : 'var(--error)',
                                                fontWeight: 600
                                            }}>
                                                {item.deal_score}
                                            </span>
                                        ) : "—"}
                                    </td>
                                    <td>{item.bid_ceiling != null ? `$${Number(item.bid_ceiling).toLocaleString()}` : "—"}</td>
                                    <td>{item.estimated_market_value != null ? `$${Number(item.estimated_market_value).toLocaleString()}` : "—"}</td>
                                    <td>
                                        <span
                                            className={styles.itemStatus}
                                            style={{ color: statusColor(item.status) }}
                                        >
                                            {statusIcon(item.status)} {item.status}
                                        </span>
                                        {item.error_message && (
                                            <div className={styles.errorMsg}>{item.error_message}</div>
                                        )}
                                    </td>
                                    <td>
                                        {item.report_id ? (
                                            <button
                                                className={styles.viewBtn}
                                                onClick={() => router.push(`/report/${item.report_id}`)}
                                            >
                                                View Report
                                            </button>
                                        ) : (
                                            <span className={styles.noReport}>—</span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
