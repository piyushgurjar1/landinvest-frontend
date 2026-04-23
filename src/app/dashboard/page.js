"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import styles from "./dashboard.module.css";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const GOOGLE_MAPS_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY;

const TRUST_ITEMS = [
    { icon: "📊", text: "Market Value & Resale Range Calculated" },
    { icon: "🎯", text: "Max Bid Strategy Built for 40%+ Margins" },
    { icon: "⚠️", text: "Risk Scoring & Red Flags Identified" },
    { icon: "🗺️", text: "Comps, Access, Zoning & Utilities Analyzed" },
    { icon: "🏛️", text: "Built for Tax-Defaulted Auction Properties" },
];

const CSV_COLUMNS = [
    { label: "County" },
    { label: "State" },
    { label: "Latitude" },
    { label: "Longitude" },
    { label: "Address" },
];

export default function DashboardPage() {
    const router = useRouter();
    const [user, setUser] = useState(null);
    const [apnInput, setApnInput] = useState("");
    const [countyInput, setCountyInput] = useState("");
    const [stateInput, setStateInput] = useState("");
    const [latInput, setLatInput] = useState("");
    const [lngInput, setLngInput] = useState("");
    const [addressInput, setAddressInput] = useState("");

    // Autocomplete dropdown state
    const [suggestions, setSuggestions] = useState([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [addressFocused, setAddressFocused] = useState(false);
    const [activeSuggestion, setActiveSuggestion] = useState(-1);

    const [searchLoading, setSearchLoading] = useState(false);
    const [error, setError] = useState("");
    const [successMsg, setSuccessMsg] = useState("");
    const [csvFile, setCsvFile] = useState(null);
    const [csvUploading, setCsvUploading] = useState(false);
    const [csvResult, setCsvResult] = useState(null);
    const [modal, setModal] = useState(null);

    const addressInputRef = useRef(null);
    const suggestionsRef = useRef(null);
    const debounceRef = useRef(null);

    // ── Auth check ──
    useEffect(() => {
        const token = localStorage.getItem("token");
        if (!token) { router.replace("/login"); return; }
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

    // ── Close dropdown when clicking outside ──
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (
                addressInputRef.current &&
                !addressInputRef.current.contains(e.target) &&
                suggestionsRef.current &&
                !suggestionsRef.current.contains(e.target)
            ) {
                setShowSuggestions(false);
                setAddressFocused(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // ── Fetch autocomplete suggestions from Places REST API ──
    const fetchSuggestions = useCallback(async (input) => {
        if (!input || input.trim().length < 2) {
            setSuggestions([]);
            setShowSuggestions(false);
            return;
        }
        if (!GOOGLE_MAPS_KEY) return;

        try {
            const res = await fetch(
                "https://places.googleapis.com/v1/places:autocomplete",
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "X-Goog-Api-Key": GOOGLE_MAPS_KEY,
                    },
                    body: JSON.stringify({
                        input: input.trim(),
                        includedPrimaryTypes: ["geocode"],
                    }),
                }
            );

            if (!res.ok) {
                // Fallback to legacy Autocomplete API if new API fails
                fetchSuggestionsLegacy(input);
                return;
            }

            const data = await res.json();
            const results = (data.suggestions || []).map((s) => ({
                placeId: s.placePrediction?.placeId || "",
                mainText: s.placePrediction?.structuredFormat?.mainText?.text || s.placePrediction?.text?.text || "",
                secondaryText: s.placePrediction?.structuredFormat?.secondaryText?.text || "",
                fullText: s.placePrediction?.text?.text || "",
            }));
            setSuggestions(results);
            setShowSuggestions(results.length > 0);
            setActiveSuggestion(-1);
        } catch (err) {
            console.error("Places autocomplete error:", err);
            fetchSuggestionsLegacy(input);
        }
    }, []);

    // ── Fallback: legacy Places Autocomplete API ──
    const fetchSuggestionsLegacy = useCallback(async (input) => {
        if (!GOOGLE_MAPS_KEY) return;
        try {
            const res = await fetch(
                `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(input)}&types=geocode&key=${GOOGLE_MAPS_KEY}`
            );
            if (!res.ok) return;
            const data = await res.json();
            const results = (data.predictions || []).map((p) => ({
                placeId: p.place_id || "",
                mainText: p.structured_formatting?.main_text || "",
                secondaryText: p.structured_formatting?.secondary_text || "",
                fullText: p.description || "",
            }));
            setSuggestions(results);
            setShowSuggestions(results.length > 0);
            setActiveSuggestion(-1);
        } catch (err) {
            console.error("Legacy autocomplete error:", err);
        }
    }, []);

    // ── Fetch place details (lat/lng + address components) ──
    const fetchPlaceDetails = useCallback(async (placeId, fullText) => {
        if (!GOOGLE_MAPS_KEY || !placeId) {
            setAddressInput(fullText);
            setShowSuggestions(false);
            return;
        }

        try {
            // Try new Places API first
            const res = await fetch(
                `https://places.googleapis.com/v1/places/${placeId}`,
                {
                    headers: {
                        "X-Goog-Api-Key": GOOGLE_MAPS_KEY,
                        "X-Goog-FieldMask": "formattedAddress,location,addressComponents",
                    },
                }
            );

            if (res.ok) {
                const place = await res.json();

                setAddressInput(place.formattedAddress || fullText);

                if (place.location) {
                    setLatInput(place.location.latitude.toFixed(6));
                    setLngInput(place.location.longitude.toFixed(6));
                }

                const components = place.addressComponents || [];
                let county = "";
                let stateCode = "";
                for (const comp of components) {
                    if (comp.types?.includes("administrative_area_level_2")) {
                        county = (comp.longText || "").replace(/ County$/i, "").trim();
                    }
                    if (comp.types?.includes("administrative_area_level_1")) {
                        stateCode = comp.shortText || "";
                    }
                }
                if (county) setCountyInput(county);
                if (stateCode) setStateInput(stateCode);
            } else {
                // Fallback: legacy Place Details API
                await fetchPlaceDetailsLegacy(placeId, fullText);
            }
        } catch (err) {
            console.error("Place details error:", err);
            setAddressInput(fullText);
        }

        setShowSuggestions(false);
        setSuggestions([]);
        setActiveSuggestion(-1);
    }, []);

    // ── Fallback: legacy Place Details API ──
    const fetchPlaceDetailsLegacy = useCallback(async (placeId, fullText) => {
        try {
            const res = await fetch(
                `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=formatted_address,geometry,address_components&key=${GOOGLE_MAPS_KEY}`
            );
            if (!res.ok) { setAddressInput(fullText); return; }
            const data = await res.json();
            const place = data.result || {};

            setAddressInput(place.formatted_address || fullText);

            if (place.geometry?.location) {
                setLatInput(place.geometry.location.lat.toFixed(6));
                setLngInput(place.geometry.location.lng.toFixed(6));
            }

            const components = place.address_components || [];
            let county = "";
            let stateCode = "";
            for (const comp of components) {
                if (comp.types?.includes("administrative_area_level_2")) {
                    county = (comp.long_name || "").replace(/ County$/i, "").trim();
                }
                if (comp.types?.includes("administrative_area_level_1")) {
                    stateCode = comp.short_name || "";
                }
            }
            if (county) setCountyInput(county);
            if (stateCode) setStateInput(stateCode);
        } catch (err) {
            console.error("Legacy place details error:", err);
            setAddressInput(fullText);
        }
    }, []);

    // ── Address input change handler (debounced) ──
    const handleAddressChange = (e) => {
        const val = e.target.value;
        setAddressInput(val);
        setActiveSuggestion(-1);

        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => {
            fetchSuggestions(val);
        }, 300);
    };

    // ── Keyboard navigation in dropdown ──
    const handleAddressKeyDown = (e) => {
        if (!showSuggestions || suggestions.length === 0) return;

        if (e.key === "ArrowDown") {
            e.preventDefault();
            setActiveSuggestion((prev) => Math.min(prev + 1, suggestions.length - 1));
        } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActiveSuggestion((prev) => Math.max(prev - 1, -1));
        } else if (e.key === "Enter") {
            e.preventDefault();
            if (activeSuggestion >= 0 && suggestions[activeSuggestion]) {
                const s = suggestions[activeSuggestion];
                fetchPlaceDetails(s.placeId, s.fullText);
            }
        } else if (e.key === "Escape") {
            setShowSuggestions(false);
            setActiveSuggestion(-1);
        }
    };

    // ── CSV Upload → Batch Analysis ──
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
            setSuccessMsg(`✅ Batch started — ${data.total_properties} properties queued for analysis.`);
            // Navigate to batch reports after short delay
            setTimeout(() => router.push("/batch-reports"), 1500);
        } catch (err) {
            setError(err.message);
        } finally {
            setCsvUploading(false);
        }
    };

    // ── APN Search ──
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
                    latitude: latInput.trim() || null,
                    longitude: lngInput.trim() || null,
                    address: addressInput.trim() || null,
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
                            <p className={styles.heroFeaturesTitle}>Trusted by land investors to evaluate deals with precision</p>
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

                <div className={styles.actionGrid}>
                    {/* LEFT PANEL */}
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
                                placeholder="APN (e.g., 123-456-789) *"
                                value={apnInput}
                                onChange={(e) => setApnInput(e.target.value)}
                                required
                            />
                            {/* ── Address field with custom dropdown ── */}
                            <div className={styles.addressFieldGroup}>
                                <div className={styles.addressAutoWrap}>
                                    <div className={`${styles.addressInputWrap} ${addressFocused ? styles.addressInputWrapFocused : ""}`}>
                                        <svg className={styles.addressPinIcon} width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                                            <circle cx="12" cy="10" r="3" />
                                        </svg>
                                        <input
                                            id="address-input"
                                            ref={addressInputRef}
                                            className={styles.addressInput}
                                            type="text"
                                            placeholder="Search address…"
                                            value={addressInput}
                                            onChange={handleAddressChange}
                                            onFocus={() => {
                                                setAddressFocused(true);
                                                if (suggestions.length > 0) setShowSuggestions(true);
                                            }}
                                            onBlur={() => setAddressFocused(false)}
                                            onKeyDown={handleAddressKeyDown}
                                            autoComplete="off"
                                        />
                                        {addressInput && (
                                            <button
                                                type="button"
                                                className={styles.addressClearBtn}
                                                onMouseDown={(e) => {
                                                    e.preventDefault();
                                                    setAddressInput("");
                                                    setSuggestions([]);
                                                    setShowSuggestions(false);
                                                    addressInputRef.current?.focus();
                                                }}
                                                aria-label="Clear address"
                                            >
                                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                                    <line x1="18" y1="6" x2="6" y2="18" />
                                                    <line x1="6" y1="6" x2="18" y2="18" />
                                                </svg>
                                            </button>
                                        )}
                                    </div>

                                    {/* Custom dropdown */}
                                    {showSuggestions && suggestions.length > 0 && (
                                        <ul ref={suggestionsRef} className={styles.suggestionsList} role="listbox">
                                            {suggestions.map((s, i) => (
                                                <li
                                                    key={s.placeId || i}
                                                    className={`${styles.suggestionItem} ${i === activeSuggestion ? styles.suggestionItemActive : ""}`}
                                                    role="option"
                                                    aria-selected={i === activeSuggestion}
                                                    onMouseDown={(e) => {
                                                        e.preventDefault();
                                                        fetchPlaceDetails(s.placeId, s.fullText);
                                                    }}
                                                    onMouseEnter={() => setActiveSuggestion(i)}
                                                >
                                                    <span className={styles.suggestionPin}>
                                                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                                                            <circle cx="12" cy="10" r="3" />
                                                        </svg>
                                                    </span>
                                                    <span className={styles.suggestionText}>
                                                        <span className={styles.suggestionMain}>{s.mainText}</span>
                                                        {s.secondaryText && (
                                                            <span className={styles.suggestionSub}>{s.secondaryText}</span>
                                                        )}
                                                    </span>
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </div>
                            </div>
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
                            <div className={styles.apnRowSmall}>
                                <input
                                    className={styles.apnInputHalf}
                                    type="text"
                                    placeholder="Latitude"
                                    value={latInput}
                                    onChange={(e) => setLatInput(e.target.value)}
                                />
                                <input
                                    className={styles.apnInputHalf}
                                    type="text"
                                    placeholder="Longitude"
                                    value={lngInput}
                                    onChange={(e) => setLngInput(e.target.value)}
                                />
                            </div>


                            <p className={styles.optionalHint}>
                                * APN is required. Providing GPS coordinates and address enhances analysis quality.
                            </p>

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

                    {/* RIGHT PANEL */}
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
                            <div className={styles.csvColumnRef}>
                                <span className={styles.csvColumnRefLabel}>
                                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                        <polyline points="14 2 14 8 20 8" />
                                    </svg>
                                    CSV Columns
                                </span>
                                <div className={styles.csvColumnTags}>
                                    <span className={styles.csvColRequired}>APN# <em>required</em></span>
                                    {CSV_COLUMNS.map((col) => (
                                        <span key={col.label} className={styles.csvColOptional}>{col.label}</span>
                                    ))}
                                </div>
                                <p className={styles.csvOptionalHint}>* Only APN is required. Providing Latitude, Longitude, or Address enhances analysis quality.</p>
                            </div>
                            <label className={styles.csvDropzone}>
                                <input
                                    type="file"
                                    accept=".csv"
                                    style={{ display: "none" }}
                                    onChange={(e) => { setCsvFile(e.target.files[0] || null); setCsvResult(null); setError(""); }}
                                />
                                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className={styles.csvDropzoneIcon}>
                                    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                                    <polyline points="17 8 12 3 7 8" />
                                    <line x1="12" y1="3" x2="12" y2="15" />
                                </svg>
                                {csvFile ? (
                                    <span className={styles.csvFileName}>{csvFile.name}</span>
                                ) : (
                                    <div className={styles.csvDropzoneContent}>
                                        <span className={styles.csvDropzoneText}>Click to choose a CSV file</span>
                                        <span className={styles.csvDropzoneHint}>or drag and drop</span>
                                    </div>
                                )}
                            </label>
                            <button className={styles.csvUploadBtn} onClick={handleCsvUpload} disabled={!csvFile || csvUploading}>
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
                            {csvResult && <div className={styles.successMessage}>✅ {csvResult.message}</div>}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
