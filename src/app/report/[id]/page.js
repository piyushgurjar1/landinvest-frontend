"use client";
import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Navbar from "@/components/Navbar";
import styles from "./report.module.css";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

function FlagPill({ label, value }) {
    if (typeof value === "boolean") {
        return (
            <div className={`${styles.flagPill} ${value ? styles.flagYes : styles.flagNo}`}>
                <span className={styles.flagIcon}>{value ? "✓" : "✗"}</span>
                {label}
            </div>
        );
    }
    return (
        <div className={`${styles.flagPill} ${styles.flagNeutral}`}>
            <span className={styles.flagIcon}>●</span>
            {label}: {String(value ?? "—")}
        </div>
    );
}

function Section({ title, subtitle, icon, children, defaultOpen = false }) {
    const [open, setOpen] = useState(defaultOpen);
    return (
        <div className={styles.section}>
            <div className={styles.sectionHeader} onClick={() => setOpen(!open)}>
                <div className={styles.sectionHeaderLeft}>
                    <div className={styles.sectionIcon}>{icon}</div>
                    <div>
                        <div className={styles.sectionTitle}>{title}</div>
                        {subtitle && <div className={styles.sectionSubtitle}>{subtitle}</div>}
                    </div>
                </div>
                <svg
                    className={`${styles.sectionChevron} ${open ? styles.sectionChevronOpen : ""}`}
                    viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                >
                    <path d="M6 9l6 6 6-6" />
                </svg>
            </div>
            {open && <div className={styles.sectionBody}>{children}</div>}
        </div>
    );
}

function FormulaNote({ note }) {
    if (!note) return null;
    return (
        <div className={styles.formulaNote}>
            📐 {note}
        </div>
    );
}

// ─────────────────────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────────────────────

export default function ReportPage() {
    const router = useRouter();
    const params = useParams();
    const [report, setReport] = useState(null);
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const token = localStorage.getItem("token");
        if (!token) { router.replace("/login"); return; }

        fetch(`${API_BASE}/api/auth/me`, { headers: { Authorization: `Bearer ${token}` } })
            .then(r => r.ok ? r.json() : Promise.reject())
            .then(setUser)
            .catch(() => { });

        fetch(`${API_BASE}/api/apn/reports/${params.id}`, { headers: { Authorization: `Bearer ${token}` } })
            .then(r => { if (!r.ok) throw new Error("Not found"); return r.json(); })
            .then(data => { setReport(data); setLoading(false); })
            .catch(() => { router.replace("/dashboard"); });
    }, [params.id, router]);

    if (loading || !report) {
        return (
            <div className={styles.reportPage}>
                <Navbar userName={user?.name} />
                <div className={styles.loadingContainer}>
                    <div className={styles.spinner} />
                    <div className={styles.loadingText}>Generating due diligence report…</div>
                </div>
            </div>
        );
    }

    // ── Destructure all report sections ──────────────────────
    const d = report.report_data || {};
    const homepageSummary = d.homepage_summary || {};
    const summary = d.quick_summary || {};
    const parcel = d.basic_parcel_info || {};
    const accessLoc = d.access_and_location || {};
    const zoning = accessLoc.zoning || {};
    const utilities = accessLoc.utilities || {};
    const terrain = d.terrain_overview || {};
    const soldComps = d.sold_comps || [];
    const activeListings = d.active_listings || [];
    const marketValue = d.estimated_market_value || {};
    const offerRange = d.educational_offer_range || {};
    const resale = d.resale_price_range || {};
    const bidCeiling = d.auction_bid_ceiling || {};
    const dom = d.days_on_market || {};
    const dealScore = d.deal_score || {};
    const riskScore = d.risk_score || {};          // ← NEW separate section
    const workflowSteps = d.workflow_steps_completed || [];  // ← NEW
    const redFlags = d.red_flags || [];
    const nextStep = d.next_learning_step || "";
    const sources = d.sources_checked || [];
    const disclaimer = d.compliance_disclaimer || "This report is for educational purposes only. Not financial or legal advice.";

    // ── Helpers ──────────────────────────────────────────────
    const fmt = (v) => typeof v === "number" ? `$${v.toLocaleString()}` : (v || "—");
    const fmtNum = (v) => typeof v === "number" ? v.toLocaleString() : (v || "—");

    const verdictClass =
        summary.verdict === "STRONG BUY" ? styles.verdictBannerStrongBuy :
            summary.verdict === "BUY" ? styles.verdictBannerBuy :
                summary.verdict === "HOLD" ? styles.verdictBannerHold :
                    styles.verdictBannerPass;

    const workflowStatusColor = (status) =>
        status === "Complete" ? "var(--success)" :
            status === "Partial" ? "var(--warning)" : "var(--text-muted)";

    const workflowStatusIcon = (status) =>
        status === "Complete" ? "✓" : status === "Partial" ? "◑" : "✗";

    const riskScoreColor = (score) =>
        score <= 20 ? "var(--success)" :
            score <= 50 ? "var(--warning)" : "var(--error)";

    return (
        <div className={styles.reportPage}>
            <Navbar userName={user?.name} />

            {/* ── Verdict Banner ── */}
            <div className={`${styles.verdictBanner} ${verdictClass}`}>
                <div className={styles.verdictBadge}>
                    <span>{summary.verdict || "ANALYZING"}</span>
                </div>
                <div className={styles.verdictContent}>
                    <div className={styles.verdictText}>{summary.summary || "Analysis complete."}</div>
                    {summary.bid_recommendation && (
                        <div className={styles.bidRecommendation}>{summary.bid_recommendation}</div>
                    )}
                </div>
            </div>

            <div className={styles.reportContainer}>
                <div className={styles.backLink} onClick={() => router.push("/dashboard")}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M19 12H5M12 19l-7-7 7-7" />
                    </svg>
                    Back to Dashboard
                </div>

                {/* ── Report Header ── */}
                <div className={styles.reportHeader}>
                    <h1 className={styles.reportTitle}>APN: {report.apn}</h1>
                    <div className={styles.reportMeta}>
                        <span>📍 {report.county}, {report.state}</span>
                        <span>📐 {parcel.acreage || report.acreage || "—"} acres ({fmtNum(parcel.sq_ft)} sq ft)</span>
                        {parcel.street_address && <span>🏠 {parcel.street_address}</span>}
                        {parcel.county_assessed_value && (
                            <span>🏛️ Assessed: {fmt(parcel.county_assessed_value)} ({parcel.assessed_year || ""})</span>
                        )}
                    </div>
                </div>

                {/* ── Core Signals Grid — 12 cards ── */}
                <div className={styles.coreSignals}>
                    {/* 1 — Deal Score */}
                    <div className={`${styles.signalCard} ${styles.dealScoreCard}`}>
                        <div className={styles.signalLabel}>Deal Score</div>
                        <div className={styles.signalValue}>{dealScore.score ?? "—"}</div>
                        <div className={styles.signalSub}>out of 100</div>
                    </div>

                    {/* 2 — Risk Score (NEW standalone card) */}
                    <div className={`${styles.signalCard} ${styles.riskScoreCard}`}>
                        <div className={styles.signalLabel}>Risk Score</div>
                        <div className={styles.signalValue} style={{ color: riskScoreColor(riskScore.score ?? 50) }}>
                            {riskScore.score ?? "—"}
                        </div>
                        <div className={styles.signalSub}>lower = safer</div>
                    </div>

                    {/* 3 — Assessed Value */}
                    <div className={styles.signalCard}>
                        <div className={styles.signalLabel}>Assessed Value</div>
                        <div className={styles.signalValue}>{fmt(parcel.county_assessed_value)}</div>
                        <div className={styles.signalSub}>{parcel.assessed_year || "County"}</div>
                    </div>

                    {/* 4 — Market Value (Mid / MMV) */}
                    <div className={styles.signalCard}>
                        <div className={styles.signalLabel}>Market Value (Mid)</div>
                        <div className={`${styles.signalValue} ${styles.signalValueGold}`}>
                            {fmt(marketValue.mid_estimated_value)}
                        </div>
                        <div className={styles.signalSub}>{fmt(marketValue.mid_price_per_acre)}/acre</div>
                    </div>

                    {/* 5 — Suggested Resale (was typical_resale — UPDATED) */}
                    <div className={styles.signalCard}>
                        <div className={styles.signalLabel}>Suggested Resale</div>
                        <div className={styles.signalValue}>{fmt(resale.suggested_resale_price)}</div>
                        <div className={styles.signalSub}>90% of MMV</div>
                    </div>

                    {/* 6 — Bid Ceiling */}
                    <div className={styles.signalCard}>
                        <div className={styles.signalLabel}>Max Bid Ceiling</div>
                        <div className={`${styles.signalValue} ${styles.signalValueGreen}`}>
                            {fmt(bidCeiling.max_bid_ceiling)}
                        </div>
                        <div className={styles.signalSub}>Hard stop</div>
                    </div>

                    {/* 7 — Expected Profit */}
                    <div className={styles.signalCard}>
                        <div className={styles.signalLabel}>Expected Profit</div>
                        <div className={`${styles.signalValue} ${styles.signalValueGreen}`}>
                            {fmt(bidCeiling.expected_profit)}
                        </div>
                        <div className={styles.signalSub}>
                            {bidCeiling.profit_margin_pct ? `${bidCeiling.profit_margin_pct} margin` : "Resale − max bid"}
                        </div>
                    </div>

                    {/* 8 — Sold Comps $/Acre */}
                    <div className={styles.signalCard}>
                        <div className={styles.signalLabel}>Sold Comps $/Acre</div>
                        <div className={styles.signalValue}>{fmt(marketValue.avg_sold_price_per_acre)}</div>
                        <div className={styles.signalSub}>Avg sold price/acre</div>
                    </div>

                    {/* 9 — Active $/Acre */}
                    <div className={styles.signalCard}>
                        <div className={styles.signalLabel}>Active $/Acre</div>
                        <div className={styles.signalValue}>
                            {activeListings[0] ? fmt(activeListings[0].price_per_acre) : "—"}
                        </div>
                        <div className={styles.signalSub}>Current listings</div>
                    </div>

                    {/* 10 — Parcel Size */}
                    <div className={styles.signalCard}>
                        <div className={styles.signalLabel}>Parcel Size</div>
                        <div className={styles.signalValue}>{parcel.acreage || "—"} ac</div>
                        <div className={styles.signalSub}>{fmtNum(parcel.sq_ft)} sq ft</div>
                    </div>

                    {/* 11 — Access */}
                    <div className={styles.signalCard}>
                        <div className={styles.signalLabel}>Access</div>
                        <div className={styles.signalValue} style={{ fontSize: 16 }}>
                            {accessLoc.road_type || "—"}
                        </div>
                        <div className={styles.signalSub}>{accessLoc.legal_access_status || "Unknown"}</div>
                    </div>

                    {/* 12 — Market Speed */}
                    <div className={styles.signalCard}>
                        <div className={styles.signalLabel}>Market Speed</div>
                        <div className={styles.signalValue} style={{
                            fontSize: 18,
                            color: dom.market_classification === "Fast" ? "var(--success)" :
                                dom.market_classification === "Normal" ? "var(--warning)" :
                                    dom.market_classification === "Slow" ||
                                        dom.market_classification === "Very Slow" ? "var(--error)" : "var(--text-primary)"
                        }}>
                            {dom.market_classification || "—"}
                        </div>
                        <div className={styles.signalSub}>{dom.estimated_dom_range || ""}</div>
                    </div>
                </div>

                {/* ── GPS / Satellite Quick Links ── */}
                <div className={styles.mapLinksBar}>
                    <span className={styles.mapLinksLabel}>📌 {parcel.gps_coordinates || "GPS not available"}</span>
                    {parcel.google_maps_link && (
                        <a href={parcel.google_maps_link} target="_blank" rel="noopener noreferrer" className={styles.mapLink}>
                            🗺️ Maps
                        </a>
                    )}
                    {parcel.google_street_view_link && (
                        <a href={parcel.google_street_view_link} target="_blank" rel="noopener noreferrer" className={styles.mapLink}>
                            🚗 Street View
                        </a>
                    )}
                </div>

                {/* ── Key Strengths / Concerns ── */}
                {(summary.key_strengths?.length > 0 || summary.key_concerns?.length > 0) && (
                    <div className={styles.strengthsConcernsGrid}>
                        {summary.key_strengths?.length > 0 && (
                            <div className={styles.strengthsCard}>
                                <div className={styles.strengthsTitle}>✅ Key Strengths</div>
                                {summary.key_strengths.map((s, i) => (
                                    <div key={i} className={styles.strengthsItem}>• {s}</div>
                                ))}
                            </div>
                        )}
                        {summary.key_concerns?.length > 0 && (
                            <div className={styles.concernsCard}>
                                <div className={styles.concernsTitle}>⚠️ Key Concerns</div>
                                {summary.key_concerns.map((c, i) => (
                                    <div key={i} className={styles.concernsItem}>• {c}</div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* ── Expandable Sections ── */}
                <div className={styles.sectionsGrid}>

                    {/* ────────────────────────────────────────────
                        SECTION 1 — Basic Parcel Info
                    ──────────────────────────────────────────── */}
                    <Section
                        title="Basic Parcel Info"
                        subtitle="Step 1 — Confirm Parcel Details"
                        icon={
                            <svg viewBox="0 0 24 24">
                                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
                                <circle cx="12" cy="10" r="3" />
                            </svg>
                        }
                    >
                        <div className={styles.dataGrid}>
                            <div className={styles.dataItem}>
                                <div className={styles.dataLabel}>APN</div>
                                <div className={styles.dataValue}>{parcel.apn}</div>
                            </div>
                            <div className={styles.dataItem}>
                                <div className={styles.dataLabel}>County / State</div>
                                <div className={styles.dataValue}>{parcel.county}, {parcel.state}</div>
                            </div>
                            <div className={styles.dataItem}>
                                <div className={styles.dataLabel}>Address</div>
                                <div className={styles.dataValue}>{parcel.street_address || "Unaddressed"}</div>
                            </div>
                            <div className={styles.dataItem}>
                                <div className={styles.dataLabel}>Acreage</div>
                                <div className={styles.dataValue}>{parcel.acreage} acres ({fmtNum(parcel.sq_ft)} sq ft)</div>
                            </div>
                            <div className={styles.dataItem}>
                                <div className={styles.dataLabel}>GPS Coordinates</div>
                                <div className={styles.dataValue}>{parcel.gps_coordinates || "—"}</div>
                            </div>
                            <div className={styles.dataItem}>
                                <div className={styles.dataLabel}>Legal Description</div>
                                <div className={styles.dataValue}>{parcel.legal_description || "—"}</div>
                            </div>
                            <div className={styles.dataItem}>
                                <div className={styles.dataLabel}>Assessed Value</div>
                                <div className={styles.dataValue}>
                                    {fmt(parcel.county_assessed_value)} ({parcel.assessed_year || "—"})
                                </div>
                            </div>
                            <div className={styles.dataItem}>
                                <div className={styles.dataLabel}>Owner</div>
                                <div className={styles.dataValue}>{parcel.owner_name || "—"}</div>
                            </div>
                            <div className={styles.dataItem}>
                                <div className={styles.dataLabel}>Tax Status</div>
                                <div className={styles.dataValue} style={{
                                    color: parcel.tax_status === "Delinquent" ? "var(--error)" :
                                        parcel.tax_status === "Current" ? "var(--success)" : "var(--text-primary)"
                                }}>
                                    {parcel.tax_status || "—"}
                                </div>
                            </div>
                            <div className={styles.dataItem}>
                                <div className={styles.dataLabel}>Liens Beyond Tax</div>
                                <div className={styles.dataValue} style={{
                                    color: parcel.liens_beyond_tax === "None identified" ? "var(--success)" : "var(--error)"
                                }}>
                                    {parcel.liens_beyond_tax || "None identified"}
                                </div>
                            </div>

                            {/* Map Links — all 4 (UPDATED) */}
                            <div className={styles.dataItem} style={{ gridColumn: "1 / -1" }}>
                                <div className={styles.dataLabel}>Map Links</div>
                                <div className={styles.mapLinksInline}>
                                    {parcel.google_maps_link && (
                                        <a href={parcel.google_maps_link} target="_blank" rel="noopener noreferrer" className={styles.mapLink}>
                                            📍 Maps
                                        </a>
                                    )}
                                    {parcel.google_street_view_link && (
                                        <a href={parcel.google_street_view_link} target="_blank" rel="noopener noreferrer" className={styles.mapLink}>
                                            🚗 Street View
                                        </a>
                                    )}
                                </div>
                            </div>
                        </div>
                    </Section>

                    {/* ────────────────────────────────────────────
                        SECTION 2 — Access & Location
                    ──────────────────────────────────────────── */}
                    <Section
                        title="Access & Location Snapshot"
                        subtitle="Step 2 — Road Access, Zoning, Utilities"
                        icon={<svg viewBox="0 0 24 24"><path d="M3 12h18M12 3l9 9-9 9" /></svg>}
                    >
                        {/* Location distances */}
                        <div className={styles.subSectionTitle}>📍 Location & Distance</div>
                        <div className={styles.dataGrid} style={{ marginBottom: 20 }}>
                            <div className={styles.dataItem}>
                                <div className={styles.dataLabel}>Nearest City</div>
                                <div className={styles.dataValue}>{accessLoc.nearest_city || "—"}</div>
                            </div>
                            <div className={styles.dataItem}>
                                <div className={styles.dataLabel}>Distance to City</div>
                                <div className={styles.dataValue}>{accessLoc.distance_to_nearest_city || "—"}</div>
                            </div>
                            <div className={styles.dataItem}>
                                <div className={styles.dataLabel}>Distance to Highway</div>
                                <div className={styles.dataValue}>{accessLoc.distance_to_highway || "—"}</div>
                            </div>
                            <div className={styles.dataItem}>
                                <div className={styles.dataLabel}>Distance to Water/Lake</div>
                                <div className={styles.dataValue}>{accessLoc.distance_to_lake_or_water || "—"}</div>
                            </div>
                            <div className={styles.dataItem}>
                                <div className={styles.dataLabel}>Major Attraction</div>
                                <div className={styles.dataValue}>{accessLoc.distance_to_major_attraction || "—"}</div>
                            </div>
                            <div className={styles.dataItem}>
                                <div className={styles.dataLabel}>Nearby Development</div>
                                <div className={styles.dataValue}>{accessLoc.nearby_housing_development || "—"}</div>
                            </div>
                            <div className={styles.dataItem}>
                                <div className={styles.dataLabel}>Population Growth</div>
                                <div className={styles.dataValue}>{accessLoc.population_growth_trend || "—"}</div>
                            </div>
                            <div className={styles.dataItem}>
                                <div className={styles.dataLabel}>County Growth Rate</div>
                                <div className={styles.dataValue}>{accessLoc.county_growth_rate || "—"}</div>
                            </div>
                            <div className={styles.dataItem}>
                                <div className={styles.dataLabel}>Building Permits</div>
                                <div className={styles.dataValue}>{accessLoc.building_permit_growth || "—"}</div>
                            </div>
                        </div>

                        {/* Road Access */}
                        <div className={styles.subSectionTitle} style={{ borderTop: "1px solid var(--surface-mint)", paddingTop: 16 }}>
                            🛣️ Road Access
                        </div>
                        <div className={styles.dataGrid} style={{ marginBottom: 16 }}>
                            <div className={styles.dataItem}>
                                <div className={styles.dataLabel}>Road Type</div>
                                <div className={styles.dataValue}>{accessLoc.road_type || "—"}</div>
                            </div>
                            <div className={styles.dataItem}>
                                <div className={styles.dataLabel}>Legal Access</div>
                                <div className={styles.dataValue}>{accessLoc.legal_access_status || "—"}</div>
                            </div>
                            <div className={styles.dataItem}>
                                <div className={styles.dataLabel}>Road Description</div>
                                <div className={styles.dataValue}>{accessLoc.road_description || "—"}</div>
                            </div>
                            <div className={styles.dataItem}>
                                <div className={styles.dataLabel}>Easements</div>
                                <div className={styles.dataValue}>{accessLoc.easements || "—"}</div>
                            </div>
                            <div className={styles.dataItem}>
                                <div className={styles.dataLabel}>Nearby Structures</div>
                                <div className={styles.dataValue}>{accessLoc.nearby_structures || "—"}</div>
                            </div>
                            <div className={styles.dataItem}>
                                <div className={styles.dataLabel}>Power Lines</div>
                                <div className={styles.dataValue}>
                                    {accessLoc.power_lines_visible ? "Yes — visible" : "Not visible"}
                                </div>
                            </div>
                        </div>
                        <div className={styles.flagsGrid}>
                            <FlagPill label="Not Landlocked" value={!accessLoc.landlocked} />
                            <FlagPill label="Power Lines Visible" value={accessLoc.power_lines_visible} />
                        </div>

                        {/* Zoning */}
                        <div className={styles.subSectionTitle} style={{ borderTop: "1px solid var(--surface-mint)", paddingTop: 16, marginTop: 16 }}>
                            🏗️ Zoning & Land Use
                        </div>
                        <div className={styles.dataGrid} style={{ marginBottom: 12 }}>
                            <div className={styles.dataItem}>
                                <div className={styles.dataLabel}>Zoning Code</div>
                                <div className={styles.dataValue}>{zoning.zoning_code || "—"}</div>
                            </div>
                            <div className={styles.dataItem}>
                                <div className={styles.dataLabel}>Description</div>
                                <div className={styles.dataValue}>{zoning.zoning_description || "—"}</div>
                            </div>
                            <div className={styles.dataItem}>
                                <div className={styles.dataLabel}>Min Lot Size</div>
                                <div className={styles.dataValue}>{zoning.minimum_lot_size || "—"}</div>
                            </div>
                            <div className={styles.dataItem}>
                                <div className={styles.dataLabel}>Allowed Uses</div>
                                <div className={styles.dataValue}>{zoning.allowed_uses || "—"}</div>
                            </div>
                            <div className={styles.dataItem}>
                                <div className={styles.dataLabel}>HOA Fees</div>
                                <div className={styles.dataValue}>
                                    {zoning.hoa_present ? (zoning.hoa_fees || "Yes — amount unknown") : "No HOA"}
                                </div>
                            </div>
                        </div>
                        <div className={styles.flagsGrid}>
                            <FlagPill label="Buildable" value={zoning.buildable} />
                            <FlagPill label="Residential" value={zoning.residential_allowed} />
                            <FlagPill label="Mobile Home" value={zoning.mobile_homes_allowed} />
                            <FlagPill label="RV Allowed" value={zoning.rv_allowed} />
                            <FlagPill label="Tiny Homes" value={zoning.tiny_homes_allowed} />
                            <FlagPill label="Camping" value={zoning.camping_allowed} />
                            <FlagPill label="Off-Grid" value={zoning.off_grid_allowed} />
                            <FlagPill label="No HOA" value={!zoning.hoa_present} />
                        </div>

                        {/* Utilities */}
                        <div className={styles.subSectionTitle} style={{ borderTop: "1px solid var(--surface-mint)", paddingTop: 16, marginTop: 16 }}>
                            ⚡ Utilities & Infrastructure
                        </div>
                        <div className={styles.flagsGrid}>
                            <FlagPill label="Electricity" value={utilities.electricity_available} />
                            <FlagPill label="Water" value={utilities.water_available} />
                            <FlagPill label="Sewer" value={utilities.sewer_available} />
                            <FlagPill label="Gas" value={utilities.gas_available} />
                            <FlagPill label="At Street" value={utilities.utility_at_street} />
                            <FlagPill label={`Septic Required: ${utilities.septic_required ? "Yes" : "No"}`} value={!utilities.septic_required} />
                            <FlagPill label={`Well Required: ${utilities.well_required ? "Yes" : "No"}`} value={!utilities.well_required} />
                        </div>
                        {utilities.utility_cost_estimate && (
                            <div className={styles.infoNote} style={{ marginTop: 12 }}>
                                <strong>Est. Utility Install Cost:</strong> {utilities.utility_cost_estimate}
                            </div>
                        )}
                    </Section>

                    {/* ────────────────────────────────────────────
                        SECTION 3 — Terrain & Environmental
                    ──────────────────────────────────────────── */}
                    <Section
                        title="Area & Terrain Overview"
                        subtitle="Step 3 — Terrain, Flood, Environmental"
                        icon={
                            <svg viewBox="0 0 24 24">
                                <path d="M3 17l6-6 4 4 8-8" />
                                <polyline points="14 7 21 7 21 14" />
                            </svg>
                        }
                    >
                        <div className={styles.dataGrid} style={{ marginBottom: 16 }}>
                            <div className={styles.dataItem}>
                                <div className={styles.dataLabel}>Terrain</div>
                                <div className={styles.dataValue}>{terrain.terrain_description || "—"}</div>
                            </div>
                            <div className={styles.dataItem}>
                                <div className={styles.dataLabel}>Slope</div>
                                <div className={styles.dataValue}>{terrain.slope_classification || "—"}</div>
                            </div>
                            <div className={styles.dataItem}>
                                <div className={styles.dataLabel}>Washes / Arroyos</div>
                                <div className={styles.dataValue}>{terrain.washes_or_arroyos || "—"}</div>
                            </div>
                            <div className={styles.dataItem}>
                                <div className={styles.dataLabel}>Nearby Usage</div>
                                <div className={styles.dataValue}>{terrain.nearby_parcel_usage || "—"}</div>
                            </div>
                            <div className={styles.dataItem}>
                                <div className={styles.dataLabel}>Flood Zone</div>
                                <div className={styles.dataValue} style={{ color: terrain.flood_zone ? "var(--error)" : "var(--success)" }}>
                                    {terrain.flood_zone ? `Yes — ${terrain.flood_zone_designation || "see FEMA"}` : "No"}
                                </div>
                            </div>
                            <div className={styles.dataItem}>
                                <div className={styles.dataLabel}>Landslide Risk</div>
                                <div className={styles.dataValue}>{terrain.landslide_risk || "—"}</div>
                            </div>
                            <div className={styles.dataItem}>
                                <div className={styles.dataLabel}>Soil Suitability</div>
                                <div className={styles.dataValue}>{terrain.soil_suitability || "—"}</div>
                            </div>
                            <div className={styles.dataItem}>
                                <div className={styles.dataLabel}>Protected Land</div>
                                <div className={styles.dataValue}>{terrain.protected_land_status || "None identified"}</div>
                            </div>
                            <div className={styles.dataItem}>
                                <div className={styles.dataLabel}>Env. Restrictions</div>
                                <div className={styles.dataValue}>{terrain.environmental_restrictions || "None identified"}</div>
                            </div>
                        </div>
                        <div className={styles.flagsGrid}>
                            <FlagPill label={`Flood Zone: ${terrain.flood_zone ? "Yes" : "No"}`} value={!terrain.flood_zone} />
                            <FlagPill label={`Wetlands: ${terrain.wetlands_risk ? "Yes" : "No"}`} value={!terrain.wetlands_risk} />
                            <FlagPill label={`Fire Risk: ${terrain.fire_risk || "Unknown"}`} value={terrain.fire_risk === "Low"} />
                            <FlagPill label={`Soil: ${terrain.soil_suitability || "Unknown"}`} value={terrain.soil_suitability === "Good"} />
                        </div>
                    </Section>

                    {/* ────────────────────────────────────────────
                        SECTION 4 — Sold Comps
                    ──────────────────────────────────────────── */}
                    {/* ────────────────────────────────────────────
    SECTION 4 — Comparable Sales
──────────────────────────────────────────── */}
                    <Section
                        title="Comparable Sales"
                        subtitle="Step 4 — Recent Sold Comps (last 24 months, within 15 miles)"
                        icon={
                            <svg viewBox="0 0 24 24">
                                <line x1="12" y1="1" x2="12" y2="23" />
                                <path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
                            </svg>
                        }
                    >
                        {soldComps.length > 0 ? (
                            <div className={styles.dataTableWrapper}>
                                <table className={styles.dataTable}>
                                    <thead>
                                        <tr>
                                            <th>APN</th>
                                            <th>Price</th>
                                            <th>$/Acre</th>
                                            <th>Acres</th>
                                            <th>Location</th>
                                            <th>Date</th>
                                            <th>Zoning</th>
                                            <th>Access</th>
                                            <th>Source</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {soldComps.map((c, i) => (
                                            <tr key={i}>
                                                <td>
                                                    {c.apn
                                                        ? <span className={styles.apnBadge}>{c.apn}</span>
                                                        : <span style={{ color: "var(--text-muted)" }}>—</span>
                                                    }
                                                </td>
                                                <td>{fmt(c.sold_price)}</td>
                                                <td>{fmt(c.price_per_acre)}</td>
                                                <td>{c.acreage}</td>
                                                <td>{c.distance_or_location}</td>
                                                <td>{c.sold_date}</td>
                                                <td>{c.zoning || "—"}</td>
                                                <td>{c.access_notes || "—"}</td>
                                                <td>
                                                    {c.source_url
                                                        ? <a href={c.source_url} target="_blank" rel="noopener noreferrer" className={styles.mapLink}>View</a>
                                                        : "—"
                                                    }
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <p style={{ color: "var(--text-muted)" }}>No comparable sales data available.</p>
                        )}
                        {marketValue.valuation_notes && (
                            <div className={styles.infoNote} style={{ marginTop: 12 }}>
                                💡 {marketValue.valuation_notes}
                            </div>
                        )}
                    </Section>


                    {/* ────────────────────────────────────────────
    SECTION 5 — Estimated Market Value
──────────────────────────────────────────── */}
                    <Section
                        title="Estimated Market Value Range"
                        subtitle="Step 5 — MMV Price Per Acre Conversion"
                        icon={
                            <svg viewBox="0 0 24 24">
                                <rect x="1" y="4" width="22" height="16" rx="2" />
                                <line x1="1" y1="10" x2="23" y2="10" />
                            </svg>
                        }
                    >
                        <div style={{ marginBottom: 16, fontSize: 14, color: "var(--text-muted)" }}>
                            Avg Sold $/Acre:{" "}
                            <strong style={{ color: "var(--text-primary)" }}>
                                {fmt(marketValue.avg_sold_price_per_acre)}
                            </strong>
                            <span style={{ marginLeft: 16 }}>
                                MMV (Mid Market Value) = avg_sold_price_per_acre × acreage
                            </span>
                        </div>
                        <div className={styles.strategyGrid}>
                            <div className={`${styles.strategyCard} ${styles.strategyCardConservative}`}>
                                <div className={styles.strategyLabel}>Low</div>
                                <div className={styles.strategyBid}>{fmt(marketValue.low_estimated_value)}</div>
                                <div className={styles.strategyBidLabel}>{fmt(marketValue.low_price_per_acre)}/acre · 85% of avg</div>
                            </div>
                            <div className={`${styles.strategyCard} ${styles.strategyCardMid}`}>
                                <div className={styles.strategyLabel}>Mid (MMV)</div>
                                <div className={styles.strategyBid} style={{ color: "var(--accent-gold)" }}>
                                    {fmt(marketValue.mid_estimated_value)}
                                </div>
                                <div className={styles.strategyBidLabel}>{fmt(marketValue.mid_price_per_acre)}/acre · Comps avg</div>
                            </div>
                            <div className={`${styles.strategyCard} ${styles.strategyCardAggressive}`}>
                                <div className={styles.strategyLabel}>High</div>
                                <div className={styles.strategyBid}>{fmt(marketValue.high_estimated_value)}</div>
                                <div className={styles.strategyBidLabel}>{fmt(marketValue.high_price_per_acre)}/acre · 115% of avg</div>
                            </div>
                        </div>
                    </Section>


                    {/* ────────────────────────────────────────────
    SECTION 6 — Active Listings
──────────────────────────────────────────── */}
                    <Section
                        title="Active Listings"
                        subtitle="Step 6 — Current Market Listings"
                        icon={
                            <svg viewBox="0 0 24 24">
                                <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                                <polyline points="9 22 9 12 15 12 15 22" />
                            </svg>
                        }
                    >
                        {activeListings.length > 0 ? (
                            <div className={styles.dataTableWrapper}>
                                <table className={styles.dataTable}>
                                    <thead>
                                        <tr>
                                            <th>APN</th>
                                            <th>Price</th>
                                            <th>$/Acre</th>
                                            <th>Acres</th>
                                            <th>DOM</th>
                                            <th>Notes</th>
                                            <th>Source</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {activeListings.map((l, i) => (
                                            <tr key={i}>
                                                <td>
                                                    {l.apn
                                                        ? <span className={styles.apnBadge}>{l.apn}</span>
                                                        : <span style={{ color: "var(--text-muted)" }}>—</span>
                                                    }
                                                </td>
                                                <td>{fmt(l.listing_price)}</td>
                                                <td>{fmt(l.price_per_acre)}</td>
                                                <td>{l.acreage}</td>
                                                <td>{l.days_on_market ?? "—"}</td>
                                                <td>{l.terrain_and_access_notes || "—"}</td>
                                                <td>
                                                    {l.source_url
                                                        ? <a href={l.source_url} target="_blank" rel="noopener noreferrer" className={styles.mapLink}>{l.source}</a>
                                                        : (l.source || "—")
                                                    }
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <p style={{ color: "var(--text-muted)" }}>No active listings data available.</p>
                        )}
                    </Section>

                    {/* ────────────────────────────────────────────
                        SECTION 7 — Educational Offer Range
                    ──────────────────────────────────────────── */}
                    <Section
                        title="Educational Offer Range"
                        subtitle="Step 7 — How Investors Think About Offers"
                        icon={
                            <svg viewBox="0 0 24 24">
                                <path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z" />
                                <path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z" />
                            </svg>
                        }
                    >
                        <div className={styles.infoNote} style={{ marginBottom: 16, lineHeight: 1.7 }}>
                            {offerRange.explanation || "—"}
                        </div>
                        <div className={styles.dataGrid}>
                            <div className={styles.dataItem}>
                                <div className={styles.dataLabel}>Low Offer</div>
                                <div className={styles.dataValue} style={{ color: "var(--success)" }}>
                                    {fmt(offerRange.low_offer)}
                                </div>
                                <div style={{ fontSize: 12, color: "var(--text-muted)" }}>40% of MMV · 60% below market</div>
                            </div>
                            <div className={styles.dataItem}>
                                <div className={styles.dataLabel}>High Offer</div>
                                <div className={styles.dataValue} style={{ color: "var(--success)" }}>
                                    {fmt(offerRange.high_offer)}
                                </div>
                                <div style={{ fontSize: 12, color: "var(--text-muted)" }}>65% of MMV · 35% below market</div>
                            </div>
                            <div className={styles.dataItem}>
                                <div className={styles.dataLabel}>Discount Range</div>
                                <div className={styles.dataValue}>{offerRange.discount_percentage || "—"}</div>
                            </div>
                        </div>
                        <div style={{ marginTop: 12, fontSize: 12, color: "var(--text-muted)", fontStyle: "italic" }}>
                            ⚠️ For educational purposes only. Not a recommendation to offer any specific amount.
                        </div>
                    </Section>

                    {/* ────────────────────────────────────────────
                        SECTION 8 — Resale Price Range (UPDATED)
                    ──────────────────────────────────────────── */}
                    <Section
                        title="Resale Price Range"
                        subtitle="Step 8 — What You Could List For"
                        icon={
                            <svg viewBox="0 0 24 24">
                                <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
                                <polyline points="17 6 23 6 23 12" />
                            </svg>
                        }
                    >
                        {/* Suggested Resale highlight bar */}
                        <div className={styles.suggestedResaleBar}>
                            <div className={styles.suggestedResaleLabel}>Suggested Resale Price</div>
                            <div className={styles.suggestedResaleValue}>{fmt(resale.suggested_resale_price)}</div>
                            <div className={styles.suggestedResaleSub}>
                                (1 − DR) × MMV = 0.90 × MMV
                            </div>
                        </div>

                        {/* Three tier cards — UPDATED percentages */}
                        <div className={styles.strategyGrid} style={{ marginTop: 16 }}>
                            <div className={`${styles.strategyCard} ${styles.strategyCardConservative}`}>
                                <div className={styles.strategyLabel}>Conservative</div>
                                <div className={styles.strategyBid}>{fmt(resale.conservative_resale)}</div>
                                <div className={styles.strategyBidLabel}>80% of MMV · Faster sale</div>
                            </div>
                            <div className={`${styles.strategyCard} ${styles.strategyCardMid}`}>
                                <div className={styles.strategyLabel}>Suggested / Mid</div>
                                <div className={styles.strategyBid} style={{ color: "var(--accent-gold)" }}>
                                    {fmt(resale.suggested_resale_price)}
                                </div>
                                <div className={styles.strategyBidLabel}>90% of MMV · Standard listing</div>
                            </div>
                            <div className={`${styles.strategyCard} ${styles.strategyCardAggressive}`}>
                                <div className={styles.strategyLabel}>Aggressive</div>
                                <div className={styles.strategyBid}>{fmt(resale.aggressive_resale)}</div>
                                <div className={styles.strategyBidLabel}>95% of MMV · Top of market</div>
                            </div>
                        </div>

                        {/* Resale timeline (NEW) */}
                        {resale.resale_timeline && (
                            <div className={styles.infoNote} style={{ marginTop: 16 }}>
                                🕐 Estimated time to sell: <strong>{resale.resale_timeline}</strong>
                            </div>
                        )}

                        {/* Formula note */}
                        {resale.resale_formula_note && (
                            <FormulaNote note={resale.resale_formula_note} />
                        )}

                        {resale.recommended_tier_explanation && (
                            <div className={styles.infoNote} style={{ marginTop: 8 }}>
                                💡 {resale.recommended_tier_explanation}
                            </div>
                        )}
                    </Section>

                    {/* ────────────────────────────────────────────
                        SECTION 9 — Auction Bid Ceiling (UPDATED)
                    ──────────────────────────────────────────── */}
                    <Section
                        title="Auction Bid Ceiling Engine"
                        subtitle="Step 9 — Prevent Overbidding · MMV-Based Formula"
                        icon={
                            <svg viewBox="0 0 24 24">
                                <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                                <line x1="12" y1="9" x2="12" y2="13" />
                                <line x1="12" y1="17" x2="12.01" y2="17" />
                            </svg>
                        }
                    >
                        {/* Key metrics row */}
                        <div className={styles.dataGrid} style={{ marginBottom: 16 }}>
                            <div className={styles.dataItem}>
                                <div className={styles.dataLabel}>Risk Tier</div>
                                <div className={styles.dataValue}>{bidCeiling.risk_tier || "—"}</div>
                            </div>
                            <div className={styles.dataItem}>
                                <div className={styles.dataLabel}>Recovery %</div>
                                <div className={styles.dataValue}>{bidCeiling.recovery_percentage || "—"}</div>
                            </div>
                            <div className={styles.dataItem}>
                                <div className={styles.dataLabel}>Suggested Resale</div>
                                <div className={styles.dataValue} style={{ color: "var(--accent-gold)" }}>
                                    {fmt(bidCeiling.suggested_resale_price)}
                                </div>
                            </div>
                            <div className={styles.dataItem}>
                                <div className={styles.dataLabel}>Expected Profit</div>
                                <div className={styles.dataValue} style={{ color: "var(--success)", fontWeight: 700 }}>
                                    {fmt(bidCeiling.expected_profit)}
                                </div>
                            </div>
                            {/* NEW — profit margin % */}
                            {bidCeiling.profit_margin_pct && (
                                <div className={styles.dataItem}>
                                    <div className={styles.dataLabel}>Profit Margin</div>
                                    <div className={styles.dataValue} style={{ color: "var(--success)" }}>
                                        {bidCeiling.profit_margin_pct}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Three bid tiers — UPDATED labels */}
                        <div className={styles.strategyGrid}>
                            <div className={`${styles.strategyCard} ${styles.strategyCardConservative}`}>
                                <div className={styles.strategyLabel}>Low Threshold</div>
                                <div className={styles.strategyBid}>{fmt(bidCeiling.low_bid_threshold)}</div>
                                <div className={styles.strategyBidLabel}>max_bid × 0.85 · Safe buffer</div>
                            </div>
                            <div className={`${styles.strategyCard} ${styles.strategyCardMid}`}>
                                <div className={styles.strategyLabel}>Mid Threshold</div>
                                <div className={styles.strategyBid} style={{ color: "var(--accent-gold)" }}>
                                    {fmt(bidCeiling.mid_bid_threshold)}
                                </div>
                                <div className={styles.strategyBidLabel}>max_bid × 0.925 · Balanced</div>
                            </div>
                            <div className={`${styles.strategyCard} ${styles.strategyCardAggressive}`}>
                                <div className={styles.strategyLabel}>Max Ceiling 🛑</div>
                                <div className={styles.strategyBid}>{fmt(bidCeiling.max_bid_ceiling)}</div>
                                <div className={styles.strategyBidLabel}>(0.90÷1.40) × MMV · HARD STOP</div>
                            </div>
                        </div>

                        {/* Formula note (NEW) */}
                        {bidCeiling.bid_formula_note && (
                            <FormulaNote note={bidCeiling.bid_formula_note} />
                        )}

                        {/* Risk factors */}
                        {bidCeiling.risk_factors?.length > 0 && (
                            <div style={{ marginTop: 16 }}>
                                <div className={styles.subSectionTitle}>Risk Factors Considered</div>
                                {bidCeiling.risk_factors.map((f, i) => (
                                    <div key={i} className={styles.redFlagItem} style={{ marginBottom: 6 }}>
                                        ⚠ {f}
                                    </div>
                                ))}
                            </div>
                        )}
                    </Section>

                    {/* ────────────────────────────────────────────
                        SECTION 10 — Days on Market
                    ──────────────────────────────────────────── */}
                    <Section
                        title="Market Demand & Days on Market"
                        subtitle="Step 10 — Sales Velocity & Market Liquidity"
                        icon={
                            <svg viewBox="0 0 24 24">
                                <circle cx="12" cy="12" r="10" />
                                <polyline points="12 6 12 12 16 14" />
                            </svg>
                        }
                    >
                        {/* Market classification badge */}
                        <div className={styles.marketClassBadge} style={{
                            background:
                                dom.market_classification === "Fast" ? "#f0fdf4" :
                                    dom.market_classification === "Normal" ? "#fffbeb" :
                                        dom.market_classification === "Slow" ? "#fff7ed" : "#fef2f2",
                            borderColor:
                                dom.market_classification === "Fast" ? "#bbf7d0" :
                                    dom.market_classification === "Normal" ? "#fde68a" :
                                        dom.market_classification === "Slow" ? "#fed7aa" : "#fecaca",
                            color:
                                dom.market_classification === "Fast" ? "#15803d" :
                                    dom.market_classification === "Normal" ? "#92400e" :
                                        dom.market_classification === "Slow" ? "#c2410c" : "#991b1b",
                        }}>
                            <strong>{dom.market_classification || "—"}</strong>
                            {dom.estimated_dom_range && <span> · Est. DOM: {dom.estimated_dom_range}</span>}
                        </div>

                        <div className={`${styles.dataGrid} ${styles.dataGridThree}`} style={{ marginTop: 16 }}>
                            <div className={styles.dataItem}>
                                <div className={styles.dataLabel}>Median DOM</div>
                                <div className={styles.dataValue}>{dom.median_dom ?? "—"} days</div>
                            </div>
                            <div className={styles.dataItem}>
                                <div className={styles.dataLabel}>Sales Last 6 Mo</div>
                                <div className={styles.dataValue}>{dom.land_sales_last_6_months ?? "—"}</div>
                            </div>
                            <div className={styles.dataItem}>
                                <div className={styles.dataLabel}>Sales Last 12 Mo</div>
                                <div className={styles.dataValue}>{dom.land_sales_last_12_months ?? "—"}</div>
                            </div>
                            <div className={styles.dataItem}>
                                <div className={styles.dataLabel}>Active Listings</div>
                                <div className={styles.dataValue}>{dom.active_listings_count ?? "—"}</div>
                            </div>
                            <div className={styles.dataItem}>
                                <div className={styles.dataLabel}>Sold/Active Ratio</div>
                                <div className={styles.dataValue}>{dom.sold_to_active_ratio || "—"}</div>
                            </div>
                            <div className={styles.dataItem}>
                                <div className={styles.dataLabel}>Sales Velocity</div>
                                <div className={styles.dataValue}>{dom.sales_velocity || "—"}</div>
                            </div>
                            <div className={styles.dataItem}>
                                <div className={styles.dataLabel}>Turnover 6 Mo</div>
                                <div className={styles.dataValue}>{dom.zip_turnover_rate_6mo || "—"}</div>
                            </div>
                            <div className={styles.dataItem}>
                                <div className={styles.dataLabel}>Turnover 12 Mo</div>
                                <div className={styles.dataValue}>{dom.zip_turnover_rate_12mo || "—"}</div>
                            </div>
                            <div className={styles.dataItem}>
                                <div className={styles.dataLabel}>Inventory Count</div>
                                <div className={styles.dataValue}>{dom.inventory_count ?? "—"}</div>
                            </div>
                        </div>
                    </Section>

                    {/* ────────────────────────────────────────────
                        SECTION 11 — Deal Score + Risk Score (UPDATED)
                    ──────────────────────────────────────────── */}
                    <Section
                        title="Deal Score & Risk Score"
                        subtitle="Step 11 — Investment Quality Rating"
                        icon={
                            <svg viewBox="0 0 24 24">
                                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                            </svg>
                        }
                    >
                        {/* Score cards side by side */}
                        <div className={styles.scoreCardsRow}>
                            {/* Deal Score */}
                            <div className={styles.dealScoreDisplay}>
                                <div className={styles.scoreBigNumber} style={{ color: "var(--accent-gold)" }}>
                                    {dealScore.score ?? "—"}
                                </div>
                                <div className={styles.scoreBigLabel}>Deal Score</div>
                                <div className={styles.scoreBigSub}>out of 100 · higher = better</div>
                                <div className={`${styles.verdictBadgeSmall} ${summary.verdict === "STRONG BUY" ? styles.verdictBannerStrongBuy :
                                    summary.verdict === "BUY" ? styles.verdictBannerBuy :
                                        summary.verdict === "HOLD" ? styles.verdictBannerHold :
                                            styles.verdictBannerPass
                                    }`}>
                                    {summary.verdict}
                                </div>
                            </div>

                            {/* Risk Score (NEW standalone) */}
                            <div className={styles.riskScoreDisplay}>
                                <div className={styles.scoreBigNumber} style={{ color: riskScoreColor(riskScore.score ?? 50) }}>
                                    {riskScore.score ?? "—"}
                                </div>
                                <div className={styles.scoreBigLabel}>Risk Score</div>
                                <div className={styles.scoreBigSub}>out of 100 · lower = safer</div>
                                {riskScore.explanation && (
                                    <div className={styles.scoreExplanation}>{riskScore.explanation}</div>
                                )}
                            </div>
                        </div>

                        {/* Deal scoring factors */}
                        {dealScore.scoring_factors?.length > 0 && (
                            <div style={{ marginTop: 20 }}>
                                <div className={styles.subSectionTitle}>Deal Scoring Breakdown</div>
                                {dealScore.scoring_factors.map((f, i) => (
                                    <div key={i} className={styles.scoringFactor}>{f}</div>
                                ))}
                            </div>
                        )}

                        {dealScore.explanation && (
                            <div className={styles.infoNote} style={{ marginTop: 12 }}>
                                💡 {dealScore.explanation}
                            </div>
                        )}

                        {/* Risk factors applied (NEW) */}
                        {riskScore.risk_factors_applied?.length > 0 && (
                            <div style={{ marginTop: 20 }}>
                                <div className={styles.subSectionTitle}>Risk Factors Applied</div>
                                {riskScore.risk_factors_applied.map((f, i) => (
                                    <div key={i} className={styles.riskFactorItem}>⚠ {f}</div>
                                ))}
                            </div>
                        )}
                    </Section>

                    {/* ────────────────────────────────────────────
                        SECTION 13 — Red Flags
                    ──────────────────────────────────────────── */}
                    <Section
                        title="Red Flags"
                        subtitle="Step 12 — Critical Issues"
                        icon={
                            <svg viewBox="0 0 24 24">
                                <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                                <line x1="12" y1="9" x2="12" y2="13" />
                                <line x1="12" y1="17" x2="12.01" y2="17" />
                            </svg>
                        }
                    >
                        {redFlags.length > 0 ? (
                            <div className={styles.redFlagsList}>
                                {redFlags.map((flag, i) => (
                                    <div key={i} className={styles.redFlagItem}>
                                        <span>🚩</span> {flag}
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className={styles.noFlags}>✅ No red flags identified for this parcel.</div>
                        )}
                    </Section>

                    {/* ────────────────────────────────────────────
                        SECTION 14 — Next Step
                    ──────────────────────────────────────────── */}
                    {nextStep && (
                        <Section
                            title="Next Learning Step"
                            subtitle="Step 13 — Educational Guidance"
                            icon={<svg viewBox="0 0 24 24"><path d="M5 12h14M12 5l7 7-7 7" /></svg>}
                        >
                            <div className={styles.infoNote} style={{ lineHeight: 1.7 }}>
                                📘 {nextStep}
                            </div>
                        </Section>
                    )}

                    {/* ────────────────────────────────────────────
                        SECTION 15 — Sources
                    ──────────────────────────────────────────── */}
                    {sources.length > 0 && (
                        <Section
                            title="Sources Checked"
                            subtitle="Step 14 — All URLs Searched During Research"
                            icon={<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>}
                        >
                            <div className={styles.sourcesList}>
                                {sources.map((s, i) => (
                                    s.startsWith("http") ? (
                                        <a key={i} href={s} target="_blank" rel="noopener noreferrer" className={styles.sourceTag}>
                                            {s}
                                        </a>
                                    ) : (
                                        <span key={i} className={styles.sourceTag}>{s}</span>
                                    )
                                ))}
                            </div>
                        </Section>
                    )}
                </div>

                {/* ── Compliance Disclaimer ── */}
                <div className={styles.disclaimer}>
                    <strong>⚖️ Disclaimer:</strong> {disclaimer}
                </div>
            </div>
        </div>
    );
}