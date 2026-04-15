"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import styles from "./dashboard.module.css";


const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";


const TRUST_ITEMS = [
    { icon: "📊", text: "Market Value & Resale Range Calculated" },
    { icon: "🎯", text: "Max Bid Strategy Built for 40%+ Margins" },
    { icon: "⚠️", text: "Risk Scoring & Red Flags Identified" },
    { icon: "🗺️", text: "Comps, Access, Zoning & Utilities Analyzed" },
    { icon: "🏛️", text: "Built for Tax-Defaulted Auction Properties" },
];

const CSV_OPTIONAL_COLUMNS = [
    "State", "County", "Latitude", "Longitude", "Address",
    "Lot Size", "Zoning", "Assessment Year", "Total Assessed Value",
    "Market Value Year", "Total Market Value", "Flood Risk",
    "Environmental Hazard Status", "Bidding Start Value",
];


export default function DashboardPage() {
    const router = useRouter();
    const [user, setUser] = useState(null);
    const [apnInput, setApnInput] = useState("");
    const [countyInput, setCountyInput] = useState("");
    const [stateInput, setStateInput] = useState("");
    const [searchLoading, setSearchLoading] = useState(false);
    const [error, setError] = useState("");
    const [successMsg, setSuccessMsg] = useState("");
    const [csvFile, setCsvFile] = useState(null);
    const [csvUploading, setCsvUploading] = useState(false);
    const [csvResult, setCsvResult] = useState(null);
    const [modal, setModal] = useState(null);


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
                if (err.message !== "Unauthorized") console.error("Auth check failed:", err);
            });
    }, [router]);


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


    const handleSearch = async (e) => {
        e.preventDefault();
        if (!apnInput.trim()) return;
        setError("");
        setSuccessMsg("");
        setSearchLoading(true);
        const token = localStorage.getItem("token");
        try {
            const checkRes = await fetch(
                `${API_BASE}/api/apn/check/${encodeURIComponent(apnInput.trim())}`,
                { headers: { Authorization: `Bearer ${token}` } }
            );
            if (!checkRes.ok) throw new Error("Pre-check failed");
            const checkData = await checkRes.json();

            if (checkData.parcel_county && !countyInput.trim()) setCountyInput(checkData.parcel_county);
            if (checkData.parcel_state && !stateInput.trim()) setStateInput(checkData.parcel_state);

            if (checkData.has_existing_report) {
                setSearchLoading(false);
                setModal({
                    type: "existing_report",
                    message: `A report for APN "${apnInput.trim()}" already exists. Do you want to view the existing report or run a new analysis?`,
                    onView: () => { setModal(null); router.push(`/report/${checkData.existing_report_id}`); },
                    onNew: () => { setModal(null); runAnalysis(token); },
                });
                return;
            }

            if (!checkData.has_parcel_data) {
                setSearchLoading(false);
                setModal({
                    type: "no_data",
                    message: `APN "${apnInput.trim()}" does not exist in your uploaded parcel data. The analysis will rely entirely on AI research. Proceed?`,
                    onConfirm: () => { setModal(null); runAnalysis(token); },
                });
                return;
            }

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

            {/* Modal */}
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
                                    <button className={styles.modalBtnSecondary} onClick={modal.onView}>View Existing</button>
                                    <button className={styles.modalBtnPrimary} onClick={modal.onNew}>Run New Analysis</button>
                                </>
                            ) : (
                                <>
                                    <button className={styles.modalBtnSecondary} onClick={() => setModal(null)}>Cancel</button>
                                    <button className={styles.modalBtnPrimary} onClick={modal.onConfirm}>Yes, Proceed</button>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}

            <div className={styles.mainContainer}>

                {/* ── Hero Card ── */}
                <section className={styles.heroCard}>
                    <div className={styles.heroContent}>

                        <div className={styles.heroTag}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
                            </svg>
                            TaxAuction.ai &bull; Powered by Land Invest Corp
                        </div>

                        <h1 className={styles.heroTitle}>
                            AI-Powered Due Diligence for{" "}
                            <span className={styles.heroTitleAccent}>Tax-Defaulted Land Auctions</span>
                        </h1>

                        <div className={styles.heroSubtitleContainer}>
                            <p className={styles.heroSubtitle}>
                                Instantly analyze vacant land deals, determine true market value, and calculate a precise max bid—so every purchase is backed by data and built to hit your target profit margin.
                            </p>
                            <p className={styles.heroSubtitleBold}>
                                Stop guessing. Stop overbidding. Start buying like a professional.
                            </p>
                        </div>

                        <div className={styles.heroFeaturesBox}>
                            <p className={styles.heroFeaturesTitle}>
                                Trusted by land investors to evaluate deals with precision
                            </p>
                            <div className={styles.heroFeaturesGrid}>
                                {TRUST_ITEMS.map((item) => (
                                    <div key={item.text} className={styles.heroFeatureCard}>
                                        <span className={styles.heroFeatureIcon}>{item.icon}</span>
                                        <span className={styles.heroFeatureText}>{item.text}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                    </div>
                </section>

                {/* ── Two-column action grid ── */}
                <div className={styles.actionGrid}>

                    {/* LEFT — APN Lookup */}
                    <div className={styles.panelCard}>
                        <div className={styles.panelHeader}>
                            <span className={styles.panelIconWrap}>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                    <circle cx="11" cy="11" r="8" />
                                    <path d="M21 21l-4.35-4.35" />
                                </svg>
                            </span>
                            <div>
                                <p className={styles.panelTitle}>Single APN Lookup</p>
                                <p className={styles.panelSubtitle}>Enter a parcel number for instant AI analysis</p>
                            </div>
                        </div>

                        <form onSubmit={handleSearch} className={styles.apnForm}>
                            <input
                                className={styles.apnInput}
                                type="text"
                                placeholder="Enter APN (e.g., 123-456-789)"
                                value={apnInput}
                                onChange={(e) => setApnInput(e.target.value)}
                                required
                            />
                            <div className={styles.apnRowSmall}>
                                <input
                                    className={styles.apnInputHalf}
                                    type="text"
                                    placeholder="County"
                                    value={countyInput}
                                    onChange={(e) => setCountyInput(e.target.value)}
                                />
                                <input
                                    className={styles.apnInputHalf}
                                    type="text"
                                    placeholder="State"
                                    value={stateInput}
                                    onChange={(e) => setStateInput(e.target.value)}
                                />
                            </div>
                            <button className={styles.analyzeBtn} type="submit" disabled={searchLoading}>
                                {searchLoading ? (
                                    <><span className={styles.spinner} /> Analyzing...</>
                                ) : (
                                    <>
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                            <circle cx="11" cy="11" r="8" />
                                            <path d="M21 21l-4.35-4.35" />
                                        </svg>
                                        Run Analysis
                                    </>
                                )}
                            </button>
                        </form>

                        {error && <div className={styles.errorMessage}>{error}</div>}
                        {successMsg && <div className={styles.successMessage}>{successMsg}</div>}
                    </div>

                    {/* RIGHT — CSV Upload */}
                    <div className={styles.panelCard}>
                        <div className={styles.panelHeader}>
                            <span className={styles.panelIconWrap}>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                                    <polyline points="17 8 12 3 7 8" />
                                    <line x1="12" y1="3" x2="12" y2="15" />
                                </svg>
                            </span>
                            <div>
                                <p className={styles.panelTitle}>Bulk CSV Upload</p>
                                <p className={styles.panelSubtitle}>Upload parcel data for enriched APN analysis</p>
                            </div>
                        </div>

                        <div className={styles.csvUploadArea}>

                            {/* ── Column Reference (above dropzone) ── */}
                            <div className={styles.csvColumnRef}>
                                <span className={styles.csvColumnRefLabel}>
                                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                        <polyline points="14 2 14 8 20 8" />
                                    </svg>
                                    CSV Columns
                                </span>
                                <div className={styles.csvColumnTags}>
                                    <span className={styles.csvColRequired}>
                                        APN# <em>required</em>
                                    </span>
                                    {CSV_OPTIONAL_COLUMNS.map((col) => (
                                        <span key={col} className={styles.csvColOptional}>{col}</span>
                                    ))}
                                </div>
                            </div>

                            {/* ── Dropzone (compact horizontal strip) ── */}
                            <label className={styles.csvDropzone}>
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
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className={styles.csvDropzoneIcon}>
                                    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                                    <polyline points="17 8 12 3 7 8" />
                                    <line x1="12" y1="3" x2="12" y2="15" />
                                </svg>
                                {csvFile ? (
                                    <span className={styles.csvFileName}>{csvFile.name}</span>
                                ) : (
                                    <span className={styles.csvDropzoneText}>
                                        Click to choose a CSV file
                                        <span className={styles.csvDropzoneHint}> · or drag and drop</span>
                                    </span>
                                )}
                            </label>

                            {/* ── Upload Button ── */}
                            <button
                                className={styles.csvUploadBtn}
                                onClick={handleCsvUpload}
                                disabled={!csvFile || csvUploading}
                            >
                                {csvUploading ? (
                                    <><span className={styles.spinner} /> Uploading...</>
                                ) : (
                                    <>
                                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                                            <polyline points="17 8 12 3 7 8" />
                                            <line x1="12" y1="3" x2="12" y2="15" />
                                        </svg>
                                        Upload Data
                                    </>
                                )}
                            </button>

                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
}