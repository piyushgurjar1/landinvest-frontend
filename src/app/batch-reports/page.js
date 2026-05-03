"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import styles from "./batch.module.css";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function BatchReportsPage() {
    const router = useRouter();
    const [user, setUser] = useState(null);
    const [batches, setBatches] = useState([]);
    const [loading, setLoading] = useState(true);

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

        fetchBatches(token);
    }, [router]);

    const fetchBatches = async (token) => {
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE}/api/apn/batches?limit=10`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (res.ok) setBatches(await res.json());
        } catch { /* ignore */ }
        finally { setLoading(false); }
    };

    // Stable auto-refresh: poll every 15s during processing, but only update state if data changed
    useEffect(() => {
        const hasProcessing = batches.some(b => b.status === "processing");
        if (!hasProcessing) return;

        const timer = setInterval(async () => {
            const token = localStorage.getItem("token");
            if (!token) return;
            try {
                const res = await fetch(`${API_BASE}/api/apn/batches?limit=10`, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                if (!res.ok) return;
                const fresh = await res.json();
                // Only update state if data actually changed — prevents UI flicker
                const freshStr = JSON.stringify(fresh);
                const currentStr = JSON.stringify(batches);
                if (freshStr !== currentStr) setBatches(fresh);
            } catch { /* ignore */ }
        }, 15000);
        return () => clearInterval(timer);
    }, [batches]);

    const statusColor = (s) => s === "completed" ? "var(--success)" : s === "processing" ? "var(--warning)" : "var(--error)";
    const statusIcon = (s) => s === "completed" ? "✓" : s === "processing" ? "⟳" : "✗";

    return (
        <div className={styles.page}>
            <Navbar userName={user?.name} userRole={user?.role} />
            <div className={styles.container}>
                <div className={styles.header}>
                    <h1 className={styles.title}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
                            <rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" />
                        </svg>
                        Batch Reports
                    </h1>
                    <p className={styles.subtitle}>
                        Track bulk CSV analysis jobs. Each batch processes properties one by one.
                    </p>
                </div>

                {loading ? (
                    <div className={styles.loadingState}>
                        <div className={styles.spinner} />
                        <p>Loading batches...</p>
                    </div>
                ) : batches.length === 0 ? (
                    <div className={styles.emptyState}>
                        <div className={styles.emptyIcon}>📦</div>
                        <p className={styles.emptyTitle}>No batch jobs yet</p>
                        <p className={styles.emptySubtitle}>
                            Upload a CSV with APN numbers from the Dashboard to start a batch analysis.
                        </p>
                    </div>
                ) : (
                    <div className={styles.batchList}>
                        {batches.map((batch) => {
                            const isInterrupted = batch.status === "completed" && batch.processed_count < batch.total_properties;
                            const displayStatus = isInterrupted ? "interrupted" : batch.status;

                            return (
                                <div
                                    key={batch.id}
                                    className={styles.batchCard}
                                    onClick={() => router.push(`/batch-reports/${batch.id}`)}
                                >
                                    <div className={styles.batchLeft}>
                                        <div className={styles.batchIcon}>
                                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--primary-green)" strokeWidth="2">
                                                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                                                <polyline points="14 2 14 8 20 8" />
                                            </svg>
                                        </div>
                                        <div>
                                            <div className={styles.batchName}>{batch.filename}</div>
                                            <div className={styles.batchMeta}>
                                                {batch.total_properties} properties
                                                {batch.created_at && (
                                                    <> · {new Date(batch.created_at).toLocaleDateString()}</>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <div className={styles.batchRight}>
                                        <div className={styles.progressInfo}>
                                            <div className={styles.progressLabel}>
                                                {batch.processed_count} / {batch.total_properties}
                                            </div>
                                            <div className={styles.progressBar}>
                                                <div
                                                    className={styles.progressFill}
                                                    style={{
                                                        width: `${batch.total_properties > 0 ? (batch.processed_count / batch.total_properties) * 100 : 0}%`,
                                                        background: statusColor(displayStatus),
                                                    }}
                                                />
                                            </div>
                                        </div>
                                        <div
                                            className={styles.statusBadge}
                                            style={{ color: statusColor(displayStatus), borderColor: statusColor(displayStatus) }}
                                        >
                                            <span>{statusIcon(displayStatus)}</span>
                                            {displayStatus}
                                        </div>
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2">
                                            <path d="M9 18l6-6-6-6" />
                                        </svg>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
