"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import styles from "./dashboard.module.css";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function DashboardPage() {
    const router = useRouter();
    const [user, setUser] = useState(null);
    const [apnInput, setApnInput] = useState("");
    const [countyInput, setCountyInput] = useState("");
    const [stateInput, setStateInput] = useState("");
    const [searchLoading, setSearchLoading] = useState(false);
    const [error, setError] = useState("");
    const [successMsg, setSuccessMsg] = useState("");

    // CSV upload
    const [csvFile, setCsvFile] = useState(null);
    const [csvUploading, setCsvUploading] = useState(false);
    const [csvResult, setCsvResult] = useState(null);

    // Modal state
    const [modal, setModal] = useState(null); // { type, message, onConfirm }

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
    }, [router]);

    /* ── CSV Upload handler ── */
    const handleCsvUpload = async () => {
        if (!csvFile) return;
        setCsvUploading(true);
        setError("");
        setCsvResult(null);
        setSuccessMsg("");
        const token = localStorage.getItem("token");

        const formData = new FormData();
        formData.append("file", csvFile);

        try {
            const res = await fetch(`${API_BASE}/api/csv/upload`, {
                method: "POST",
                headers: { Authorization: `Bearer ${token}` },
                body: formData,
            });
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.detail || "Upload failed");
            }
            const data = await res.json();
            setCsvResult(data);
            setCsvFile(null);
            setSuccessMsg(`✅ ${data.message}`);
        } catch (err) {
            setError(err.message);
        } finally {
            setCsvUploading(false);
        }
    };

    /* ── Pre-analysis check + search ── */
    const handleSearch = async (e) => {
        e.preventDefault();
        if (!apnInput.trim()) return;

        setError("");
        setSuccessMsg("");
        setSearchLoading(true);
        const token = localStorage.getItem("token");

        try {
            // Step 1: Check if APN data exists and if report already done
            const checkRes = await fetch(`${API_BASE}/api/apn/check/${encodeURIComponent(apnInput.trim())}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!checkRes.ok) throw new Error("Pre-check failed");
            const checkData = await checkRes.json();

            // Auto-fill county/state from parcel_data if available
            if (checkData.parcel_county && !countyInput.trim()) {
                setCountyInput(checkData.parcel_county);
            }
            if (checkData.parcel_state && !stateInput.trim()) {
                setStateInput(checkData.parcel_state);
            }

            // If report already exists, ask user
            if (checkData.has_existing_report) {
                setSearchLoading(false);
                setModal({
                    type: "existing_report",
                    message: `A report for APN "${apnInput.trim()}" already exists (Report #${checkData.existing_report_id}). Do you want to view the existing report or run a new analysis?`,
                    existingReportId: checkData.existing_report_id,
                    onView: () => {
                        setModal(null);
                        router.push(`/report/${checkData.existing_report_id}`);
                    },
                    onNew: () => {
                        setModal(null);
                        runAnalysis(token);
                    },
                });
                return;
            }

            // If APN not in parcel_data, ask user
            if (!checkData.has_parcel_data) {
                setSearchLoading(false);
                setModal({
                    type: "no_data",
                    message: `APN "${apnInput.trim()}" does not exist in your uploaded parcel data. The analysis will rely entirely on AI research. Do you want to proceed?`,
                    onConfirm: () => {
                        setModal(null);
                        runAnalysis(token);
                    },
                });
                return;
            }

            // Both checks passed, run analysis directly
            await runAnalysis(token);

        } catch (err) {
            setError(err.message);
            setSearchLoading(false);
        }
    };

    const runAnalysis = async (token) => {
        setSearchLoading(true);
        setError("");
        try {
            const res = await fetch(`${API_BASE}/api/apn/lookup`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    apn: apnInput.trim(),
                    county: countyInput.trim() || null,
                    state: stateInput.trim() || null,
                }),
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.detail || "Lookup failed");
            }

            const report = await res.json();
            router.push(`/report/${report.id}`);
        } catch (err) {
            setError(err.message);
        } finally {
            setSearchLoading(false);
        }
    };

    return (
        <div className={styles.dashboardPage}>
            <Navbar userName={user?.name} />

            {/* Modal Overlay */}
            {modal && (
                <div className={styles.modalOverlay} onClick={() => setModal(null)}>
                    <div className={styles.modalCard} onClick={(e) => e.stopPropagation()}>
                        <div className={styles.modalIcon}>
                            {modal.type === "existing_report" ? "📋" : "⚠️"}
                        </div>
                        <p className={styles.modalMessage}>{modal.message}</p>
                        <div className={styles.modalActions}>
                            {modal.type === "existing_report" ? (
                                <>
                                    <button className={styles.modalBtnSecondary} onClick={modal.onView}>
                                        View Existing Report
                                    </button>
                                    <button className={styles.modalBtnPrimary} onClick={modal.onNew}>
                                        Run New Analysis
                                    </button>
                                </>
                            ) : (
                                <>
                                    <button className={styles.modalBtnSecondary} onClick={() => setModal(null)}>
                                        Cancel
                                    </button>
                                    <button className={styles.modalBtnPrimary} onClick={modal.onConfirm}>
                                        Yes, Proceed
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Hero */}
            <section className={styles.hero}>
                <div className={styles.heroContent}>
                    <div className={styles.heroTag}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
                        </svg>
                        AI-Powered Due Diligence
                    </div>
                    <h1 className={styles.heroTitle}>
                        Analyze Land Parcels with{" "}
                        <span className={styles.heroTitleAccent}>Confidence</span>
                    </h1>
                    <p className={styles.heroSubtitle}>
                        Enter a single APN for instant due diligence, or upload your parcel
                        data CSV for enriched analysis. Get deal scores, bid ceilings, and market
                        intelligence in seconds.
                    </p>
                </div>
            </section>

            {/* Search Card */}
            <div className={styles.searchSection}>
                <div className={styles.searchCard}>
                    <div className={styles.searchLabel}>
                        <svg className={styles.searchLabelIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="11" cy="11" r="8" />
                            <path d="M21 21l-4.35-4.35" />
                        </svg>
                        Single APN Lookup
                    </div>

                    <form onSubmit={handleSearch}>
                        <div className={styles.searchRow}>
                            <input
                                className={styles.searchInput}
                                type="text"
                                placeholder="Enter APN (e.g., 123-456-789)"
                                value={apnInput}
                                onChange={(e) => setApnInput(e.target.value)}
                                required
                            />
                            <input
                                className={styles.searchInput}
                                type="text"
                                placeholder="County"
                                value={countyInput}
                                onChange={(e) => setCountyInput(e.target.value)}
                                style={{ maxWidth: 200 }}
                            />
                            <input
                                className={styles.searchInput}
                                type="text"
                                placeholder="State"
                                value={stateInput}
                                onChange={(e) => setStateInput(e.target.value)}
                                style={{ maxWidth: 120 }}
                            />
                            <button
                                className={styles.searchBtn}
                                type="submit"
                                disabled={searchLoading}
                            >
                                <span className={styles.searchBtnText}>
                                    {searchLoading ? (
                                        "Analyzing..."
                                    ) : (
                                        <>
                                            <svg className={styles.searchBtnIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                                <circle cx="11" cy="11" r="8" />
                                                <path d="M21 21l-4.35-4.35" />
                                            </svg>
                                            Analyze
                                        </>
                                    )}
                                </span>
                            </button>
                        </div>
                    </form>

                    {error && (
                        <div style={{
                            marginTop: 16,
                            background: "var(--error-bg)",
                            color: "var(--error)",
                            padding: "10px 16px",
                            borderRadius: "var(--radius-md)",
                            fontSize: 13,
                            fontWeight: 500,
                        }}>
                            {error}
                        </div>
                    )}

                    {successMsg && (
                        <div style={{
                            marginTop: 16,
                            background: "rgba(46, 125, 50, 0.08)",
                            color: "var(--success)",
                            padding: "10px 16px",
                            borderRadius: "var(--radius-md)",
                            fontSize: 13,
                            fontWeight: 500,
                        }}>
                            {successMsg}
                        </div>
                    )}

                    <div className={styles.searchDivider}>or upload parcel data CSV</div>

                    {/* CSV Upload */}
                    <div className={styles.csvUploadArea}>
                        <div className={styles.csvUploadRow}>
                            <label className={styles.csvFileLabel}>
                                <input
                                    type="file"
                                    accept=".csv"
                                    style={{ display: "none" }}
                                    onChange={(e) => {
                                        setCsvFile(e.target.files[0] || null);
                                        setCsvResult(null);
                                        setError("");
                                    }}
                                />
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                                    <polyline points="17 8 12 3 7 8" />
                                    <line x1="12" y1="3" x2="12" y2="15" />
                                </svg>
                                {csvFile ? csvFile.name : "Choose CSV File"}
                            </label>
                            <button
                                className={styles.csvUploadBtn}
                                onClick={handleCsvUpload}
                                disabled={!csvFile || csvUploading}
                            >
                                {csvUploading ? "Uploading..." : "Upload"}
                            </button>
                        </div>
                        <div className={styles.csvHint}>
                            CSV columns: Apn, State, County, Latitude, Longitude, Address, Lot Size, Zoning, Assessment Year, Total Assessed Value, Market Value Year, Total Market Value, Flood Risk, Environmental Hazard Status, Bidding Start Value
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
