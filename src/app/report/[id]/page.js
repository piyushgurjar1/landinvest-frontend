"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import Navbar from "@/components/Navbar";
import ChatBot from "@/components/ChatBot";
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
            {label}: {value != null ? String(value) : <span className={styles.notFound}>Data not found</span>}
        </div>
    );
}

function Section({ title, subtitle, icon, children, defaultOpen = true }) {
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
            {open && <div className={styles.sectionBody} data-section-body>{children}</div>}
        </div>
    );
}

function FormulaNote({ note }) {
    if (!note) return null;
    return <div className={styles.formulaNote}>📐 {note}</div>;
}

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

    const d = report.report_data || {};
    const summary = d.quick_summary || {};
    const parcel = d.basic_parcel_info || {};
    const accessLoc = d.access_and_location || {};
    const zoning = accessLoc.zoning || {};
    const utilities = accessLoc.utilities || {};
    const terrain = d.terrain_overview || {};
    const soldComps = d.sold_comps || [];
    const activeListings = d.active_listings || [];
    const marketValue = d.estimated_market_value || {};
    const resale = d.resale_price_range || {};
    const bidCeiling = d.auction_bid_ceiling || {};
    const dom = d.days_on_market || {};
    const dealScore = d.deal_score || {};
    const redFlags = d.red_flags || [];
    const nextStep = d.next_learning_step || "";
    const sources = d.sources_checked || [];
    const disclaimer = d.compliance_disclaimer || "This report is for educational purposes only. Not financial or legal advice.";

    const NF = <span className={styles.notFound}>Data not found</span>;
    const NA = <span className={styles.notAvailable}>Not available</span>;
    const fmt = (v) => typeof v === "number" ? `$${v.toLocaleString()}` : (v ? String(v) : NF);
    const fmtNum = (v) => typeof v === "number" ? v.toLocaleString() : (v ? String(v) : NF);
    const nf = (v) => v ? v : NF;

    const fullAddress = [parcel.street_address, parcel.county, parcel.state].filter(Boolean).join(", ");

    const parseGps = (gps) => {
        if (!gps) return null;
        const parts = gps.split(",").map(s => s.trim());
        if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) return { lat: parts[0], lng: parts[1] };
        return null;
    };
    const gps = parseGps(parcel.gps_coordinates);

    const calcResaleGrossProfit = (resalePrice) => {
        const bidRef = bidCeiling.mid_bid_threshold ?? bidCeiling.max_bid_ceiling;
        if (typeof resalePrice === "number" && typeof bidRef === "number") return resalePrice - bidRef;
        return null;
    };

    const downloadCsv = () => {
        const cols = [
            ["APN", report.apn], ["County", report.county], ["State", report.state],
            ["Full Address", fullAddress], ["Acreage", parcel.acreage], ["Sq Ft", parcel.sq_ft],
            ["GPS Coordinates", parcel.gps_coordinates], ["Legal Description", parcel.legal_description],
            ["Owner Name", parcel.owner_name], ["Assessed Value", parcel.county_assessed_value],
            ["Assessed Year", parcel.assessed_year], ["Tax Status", parcel.tax_status],
            ["Nearest City", accessLoc.nearest_city], ["Distance to City", accessLoc.distance_to_nearest_city],
            ["Distance to Highway", accessLoc.distance_to_highway], ["Distance to Water", accessLoc.distance_to_lake_or_water],
            ["Distance to Attraction", accessLoc.distance_to_major_attraction],
            ["Nearby Housing", accessLoc.nearby_housing_development],
            ["Population Growth", accessLoc.population_growth_trend],
            ["County Growth Rate", accessLoc.county_growth_rate],
            ["Building Permit Growth", accessLoc.building_permit_growth],
            ["Road Type", accessLoc.road_type], ["Legal Access", accessLoc.legal_access_status],
            ["Road Description", accessLoc.road_description], ["Easements", accessLoc.easements],
            ["Nearby Structures", accessLoc.nearby_structures], ["Zoning Code", zoning.zoning_code],
            ["Zoning Description", zoning.zoning_description], ["Min Buildable Lot Size", zoning.minimum_lot_size],
            ["Allowed Uses", zoning.allowed_uses], ["Buildable", zoning.buildable],
            ["Electric", utilities.electric], ["Water", utilities.water],
            ["Sewer / Septic", utilities.sewer_or_septic], ["Internet", utilities.internet],
            ["Terrain Description", terrain.terrain_description], ["Slope", terrain.slope_classification],
            ["Washes / Arroyos", terrain.washes_or_arroyos], ["Nearby Parcel Usage", terrain.nearby_parcel_usage],
            ["Flood Zone", terrain.flood_zone != null ? (terrain.flood_zone ? "Yes" : "No") : ""],
            ["Fire Risk", terrain.fire_risk], ["Landslide Risk", terrain.landslide_risk],
            ["Soil Suitability", terrain.soil_suitability],
            ["Market Value Low", marketValue.low_estimated_value],
            ["Market Value Mid", marketValue.mid_estimated_value],
            ["Market Value High", marketValue.high_estimated_value],
            ["Conservative Resale", resale.conservative_resale],
            ["Suggested Resale", resale.suggested_resale_price],
            ["Aggressive Resale", resale.aggressive_resale],
            ["Low Bid Threshold", bidCeiling.low_bid_threshold],
            ["Mid Bid Threshold", bidCeiling.mid_bid_threshold],
            ["Max Bid Ceiling", bidCeiling.max_bid_ceiling],
            ["Market Classification", dom.market_classification],
            ["Median DOM", dom.median_dom], ["Est DOM Range", dom.estimated_dom_range],
            ["Deal Score", dealScore.score], ["Verdict", summary.verdict],
            ["Key Strengths", (summary.key_strengths || []).join("; ")],
            ["Key Concerns", (summary.key_concerns || []).join("; ")],
            ["Red Flags", (redFlags || []).join("; ")],
            ["Scoring Factors", (dealScore.scoring_factors || []).join("; ")],
            ["Sources Checked", (sources || []).join("; ")],
            ["Next Learning Step", nextStep],
        ];
        const headers = cols.map(c => `"${String(c[0]).replace(/"/g, '""')}"`);
        const values = cols.map(c => `"${String(c[1] ?? "").replace(/"/g, '""')}"`);
        const csv = headers.join(",") + "\n" + values.join(",");
        const blob = new Blob([csv], { type: "text/csv" });
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = `report_${report.apn}.csv`;
        a.click();
    };

    const downloadPdf = () => {
        const details = document.querySelectorAll("[data-section-body]");
        const wasHidden = [];
        details.forEach(el => { wasHidden.push(el.style.display); el.style.display = "block"; });
        window.print();
        details.forEach((el, i) => { el.style.display = wasHidden[i]; });
    };

    const verdictClass =
        summary.verdict === "STRONG BUY" ? styles.verdictBannerStrongBuy :
        summary.verdict === "BUY"        ? styles.verdictBannerBuy :
        summary.verdict === "HOLD"       ? styles.verdictBannerHold :
                                           styles.verdictBannerPass;

    const workflowStatusColor = (status) =>
        status === "Complete" ? "var(--success)" :
        status === "Partial"  ? "var(--warning)" : "var(--text-muted)";

    const workflowStatusIcon = (status) =>
        status === "Complete" ? "✓" : status === "Partial" ? "◑" : "✗";

    return (
        <div className={styles.reportPage}>
            <Navbar userName={user?.name} />

            {/* ── Download Bar ── */}
            <div className={styles.downloadBar}>
                <button className={styles.downloadBtn} onClick={downloadCsv}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                        <polyline points="7 10 12 15 17 10" />
                        <line x1="12" y1="15" x2="12" y2="3" />
                    </svg>
                    Download CSV
                </button>
                <button className={styles.downloadBtn} onClick={downloadPdf}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                        <polyline points="14 2 14 8 20 8" />
                        <line x1="16" y1="13" x2="8" y2="13" />
                        <line x1="16" y1="17" x2="8" y2="17" />
                    </svg>
                    Download PDF
                </button>
            </div>

            <div className={styles.reportContainer}>

                {/* ── Report Header ── */}
                <div className={styles.reportHeader}>
                    <h1 className={styles.reportTitle}>APN: {report.apn}</h1>
                    <div className={styles.reportMeta}>
                        {fullAddress && <span className={styles.reportMetaItem}>📍 {fullAddress}</span>}
                        <span className={styles.reportMetaItem}>
                            📐 {parcel.acreage || report.acreage || "N/A"} acres ({fmtNum(parcel.sq_ft)} sq ft)
                        </span>
                    </div>
                </div>

                {/* ── Summary Grid ── */}
                <div className={styles.summaryRow}>
                    <div className={styles.signalCard}>
                        <div className={styles.signalLabel}>Assessed Value</div>
                        <div className={styles.signalValue}>{fmt(parcel.county_assessed_value)}</div>
                        <div className={styles.signalSub}>{nf(parcel.assessed_year)}</div>
                    </div>
                    <div className={styles.signalCard}>
                        <div className={styles.signalLabel}>Market Value (Mid)</div>
                        <div className={`${styles.signalValue} ${styles.signalValueGold}`}>{fmt(marketValue.mid_estimated_value)}</div>
                        <div className={styles.signalSub}>{fmt(marketValue.mid_price_per_acre)}/acre</div>
                    </div>
                    <div className={styles.signalCard}>
                        <div className={styles.signalLabel}>Max Bid Ceiling</div>
                        <div className={`${styles.signalValue} ${styles.signalValueGreen}`}>{fmt(bidCeiling.max_bid_ceiling)}</div>
                        <div className={styles.signalSub}>Hard stop</div>
                    </div>
                    <div className={styles.signalCard}>
                        <div className={styles.signalLabel}>Suggested Resale</div>
                        <div className={styles.signalValue}>{fmt(resale.suggested_resale_price)}</div>
                        <div className={styles.signalSub}>90% of MMV</div>
                    </div>
                </div>

                <div className={styles.summaryRowTwo}>
                    <div className={styles.strengthsCard}>
                        <div className={styles.strengthsTitle}>✅ Key Strengths</div>
                        {(summary.key_strengths?.length > 0)
                            ? summary.key_strengths.map((s, i) => <div key={i} className={styles.strengthsItem}>• {s}</div>)
                            : <div className={styles.strengthsItem} style={{ color: "var(--text-muted)" }}>No strengths identified</div>}
                    </div>
                    <div className={styles.concernsCard}>
                        <div className={styles.concernsTitle}>⚠️ Key Concerns</div>
                        {(summary.key_concerns?.length > 0)
                            ? summary.key_concerns.map((c, i) => <div key={i} className={styles.concernsItem}>• {c}</div>)
                            : <div className={styles.concernsItem} style={{ color: "var(--text-muted)" }}>No concerns identified</div>}
                    </div>
                </div>

                {/* ── Embedded Maps ── */}
                {gps ? (
                    <div className={styles.mapEmbedRow}>
                        <div className={styles.mapEmbedWrap}>
                            <div className={styles.mapEmbedLabel}>📍 Satellite View</div>
                            <iframe className={styles.mapEmbed} loading="lazy" allowFullScreen
                                src={`https://maps.google.com/maps?q=${gps.lat},${gps.lng}&t=k&z=15&output=embed`} />
                        </div>
                        <div className={styles.mapEmbedWrap}>
                            <div className={styles.mapEmbedLabel}>🚗 Street View</div>
                            <iframe className={styles.mapEmbed} loading="lazy" allowFullScreen
                                referrerPolicy="no-referrer-when-downgrade"
                                src={`https://maps.google.com/maps?q=${gps.lat},${gps.lng}&layer=c&cbll=${gps.lat},${gps.lng}&cbp=12,0,,0,0&output=svembed`} />
                        </div>
                    </div>
                ) : (
                    <div className={styles.mapLinksBar}>
                        <span className={styles.mapLinksLabel}>📌 {nf(parcel.gps_coordinates)}</span>
                    </div>
                )}

                <div className={styles.sectionsGrid}>

                    {/* ── SECTION 1 — Basic Parcel Info ── */}
                    <Section title="Basic Parcel Info" subtitle="Step 1 — Confirm Parcel Details"
                        icon={<svg viewBox="0 0 24 24"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" /><circle cx="12" cy="10" r="3" /></svg>}
                    >
                        <div className={styles.dataGrid}>
                            <div className={styles.dataItem}><div className={styles.dataLabel}>APN</div><div className={styles.dataValue}>{parcel.apn}</div></div>
                            <div className={styles.dataItem}><div className={styles.dataLabel}>County / State</div><div className={styles.dataValue}>{parcel.county}, {parcel.state}</div></div>
                            <div className={styles.dataItem}><div className={styles.dataLabel}>Address</div><div className={styles.dataValue}>{parcel.street_address || "Unaddressed"}</div></div>
                            <div className={styles.dataItem}><div className={styles.dataLabel}>Acreage</div><div className={styles.dataValue}>{parcel.acreage} acres ({fmtNum(parcel.sq_ft)} sq ft)</div></div>
                            <div className={styles.dataItem}><div className={styles.dataLabel}>GPS Coordinates</div><div className={styles.dataValue}>{parcel.gps_coordinates || NF}</div></div>
                            <div className={styles.dataItem}><div className={styles.dataLabel}>Legal Description</div><div className={styles.dataValue}>{parcel.legal_description || NF}</div></div>
                            <div className={styles.dataItem}>
                                <div className={styles.dataLabel}>Assessed Value</div>
                                <div className={styles.dataValue}>{fmt(parcel.county_assessed_value)} ({parcel.assessed_year || NF})</div>
                            </div>
                            <div className={styles.dataItem}><div className={styles.dataLabel}>Owner</div><div className={styles.dataValue}>{parcel.owner_name || NF}</div></div>
                            <div className={styles.dataItem}>
                                <div className={styles.dataLabel}>Tax Status</div>
                                <div className={styles.dataValue} style={{ color: parcel.tax_status === "Delinquent" ? "var(--error)" : parcel.tax_status === "Current" ? "var(--success)" : "var(--text-primary)" }}>
                                    {parcel.tax_status || NF}
                                </div>
                            </div>
                            <div className={styles.dataItem}>
                                <div className={styles.dataLabel}>Liens Beyond Tax</div>
                                <div className={styles.dataValue} style={{ color: parcel.liens_beyond_tax === "None identified" ? "var(--success)" : "var(--error)" }}>
                                    {parcel.liens_beyond_tax || "None identified"}
                                </div>
                            </div>
                        </div>
                    </Section>

                    {/* ── SECTION 2 — Access & Location ── */}
                    <Section title="Access & Location Snapshot" subtitle="Step 2 — Road Access, Zoning, Utilities"
                        icon={<svg viewBox="0 0 24 24"><path d="M3 12h18M12 3l9 9-9 9" /></svg>}
                    >
                        <div className={styles.subSectionBox}>
                            <div className={styles.subSectionBoxTitle}>📍 Location & Distance</div>
                            <div className={styles.dataGrid}>
                                <div className={styles.dataItem}><div className={styles.dataLabel}>Nearest City</div><div className={styles.dataValue}>{accessLoc.nearest_city || NF}</div></div>
                                <div className={styles.dataItem}><div className={styles.dataLabel}>Distance to City</div><div className={styles.dataValue}>{accessLoc.distance_to_nearest_city || NF}</div></div>
                                <div className={styles.dataItem}><div className={styles.dataLabel}>Distance to Highway</div><div className={styles.dataValue}>{accessLoc.distance_to_highway || NF}</div></div>
                                <div className={styles.dataItem}><div className={styles.dataLabel}>Distance to Water/Lake</div><div className={styles.dataValue}>{accessLoc.distance_to_lake_or_water || NF}</div></div>
                                <div className={styles.dataItem}><div className={styles.dataLabel}>Major Attraction</div><div className={styles.dataValue}>{accessLoc.distance_to_major_attraction || NF}</div></div>
                                <div className={styles.dataItem}><div className={styles.dataLabel}>Nearby Development</div><div className={styles.dataValue}>{accessLoc.nearby_housing_development || NF}</div></div>
                                <div className={styles.dataItem}><div className={styles.dataLabel}>Population Growth</div><div className={styles.dataValue}>{accessLoc.population_growth_trend || NF}</div></div>
                                <div className={styles.dataItem}><div className={styles.dataLabel}>County Growth Rate</div><div className={styles.dataValue}>{accessLoc.county_growth_rate || NF}</div></div>
                                <div className={styles.dataItem}><div className={styles.dataLabel}>Building Permits</div><div className={styles.dataValue}>{accessLoc.building_permit_growth || NF}</div></div>
                            </div>
                        </div>

                        <div className={styles.subSectionBox}>
                            <div className={styles.subSectionBoxTitle}>🛣️ Road Access</div>
                            <div className={styles.dataGrid} style={{ marginBottom: 14 }}>
                                <div className={styles.dataItem}><div className={styles.dataLabel}>Road Type</div><div className={styles.dataValue}>{accessLoc.road_type || NF}</div></div>
                                <div className={styles.dataItem}><div className={styles.dataLabel}>Legal Access</div><div className={styles.dataValue}>{accessLoc.legal_access_status || NF}</div></div>
                                <div className={styles.dataItem}><div className={styles.dataLabel}>Road Description</div><div className={styles.dataValue}>{accessLoc.road_description || NF}</div></div>
                                <div className={styles.dataItem}><div className={styles.dataLabel}>Easements</div><div className={styles.dataValue}>{accessLoc.easements || NF}</div></div>
                                <div className={styles.dataItem}><div className={styles.dataLabel}>Nearby Structures</div><div className={styles.dataValue}>{accessLoc.nearby_structures || NF}</div></div>
                                <div className={styles.dataItem}><div className={styles.dataLabel}>Power Lines</div><div className={styles.dataValue}>{accessLoc.power_lines_visible ? "Yes — visible" : "Not visible"}</div></div>
                            </div>
                            <div className={styles.flagsGrid}>
                                <FlagPill label="Not Landlocked" value={!accessLoc.landlocked} />
                                <FlagPill label="Power Lines Visible" value={accessLoc.power_lines_visible} />
                            </div>
                        </div>

                        <div className={styles.subSectionBox}>
                            <div className={styles.subSectionBoxTitle}>🏗️ Zoning & Land Use</div>
                            <div className={styles.dataGrid} style={{ marginBottom: 14 }}>
                                <div className={styles.dataItem}><div className={styles.dataLabel}>Zoning Code</div><div className={styles.dataValue}>{zoning.zoning_code || NF}</div></div>
                                <div className={styles.dataItem}><div className={styles.dataLabel}>Description</div><div className={styles.dataValue}>{zoning.zoning_description || NF}</div></div>
                                <div className={styles.dataItem}><div className={styles.dataLabel}>Min Buildable Lot Size</div><div className={styles.dataValue}>{zoning.minimum_lot_size || NF}</div></div>
                                <div className={styles.dataItem}><div className={styles.dataLabel}>Allowed Uses</div><div className={styles.dataValue}>{zoning.allowed_uses || NF}</div></div>
                                <div className={styles.dataItem}><div className={styles.dataLabel}>HOA Fees</div><div className={styles.dataValue}>{zoning.hoa_present ? (zoning.hoa_fees || "Yes — amount unknown") : "No HOA"}</div></div>
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
                        </div>

                        <div className={styles.subSectionBox}>
                            <div className={styles.subSectionBoxTitle}>⚡ Utilities & Infrastructure</div>
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
                        </div>
                    </Section>

                    {/* ── SECTION 3 — Terrain & Environmental ── */}
                    <Section title="Area & Terrain Overview" subtitle="Step 3 — Terrain, Flood, Environmental"
                        icon={<svg viewBox="0 0 24 24"><path d="M3 17l6-6 4 4 8-8" /><polyline points="14 7 21 7 21 14" /></svg>}
                    >
                        <div className={styles.dataGrid} style={{ marginBottom: 16 }}>
                            <div className={styles.dataItem}><div className={styles.dataLabel}>Terrain</div><div className={styles.dataValue}>{terrain.terrain_description || NF}</div></div>
                            <div className={styles.dataItem}><div className={styles.dataLabel}>Slope</div><div className={styles.dataValue}>{terrain.slope_classification || NF}</div></div>
                            <div className={styles.dataItem}><div className={styles.dataLabel}>Washes / Arroyos</div><div className={styles.dataValue}>{terrain.washes_or_arroyos || NF}</div></div>
                            <div className={styles.dataItem}><div className={styles.dataLabel}>Nearby Usage</div><div className={styles.dataValue}>{terrain.nearby_parcel_usage || NF}</div></div>
                            <div className={styles.dataItem}>
                                <div className={styles.dataLabel}>Flood Zone</div>
                                <div className={styles.dataValue} style={{ color: terrain.flood_zone ? "var(--error)" : "var(--success)" }}>
                                    {terrain.flood_zone ? `Yes — ${terrain.flood_zone_designation || "see FEMA"}` : "No"}
                                </div>
                            </div>
                            <div className={styles.dataItem}><div className={styles.dataLabel}>Landslide Risk</div><div className={styles.dataValue}>{terrain.landslide_risk || NF}</div></div>
                            <div className={styles.dataItem}><div className={styles.dataLabel}>Soil Suitability</div><div className={styles.dataValue}>{terrain.soil_suitability || NF}</div></div>
                            <div className={styles.dataItem}><div className={styles.dataLabel}>Protected Land</div><div className={styles.dataValue}>{terrain.protected_land_status || "None identified"}</div></div>
                            <div className={styles.dataItem}><div className={styles.dataLabel}>Env. Restrictions</div><div className={styles.dataValue}>{terrain.environmental_restrictions || "None identified"}</div></div>
                        </div>
                        <div className={styles.flagsGrid}>
                            <FlagPill label={`Flood Zone: ${terrain.flood_zone ? "Yes" : "No"}`} value={!terrain.flood_zone} />
                            <FlagPill label={`Wetlands: ${terrain.wetlands_risk ? "Yes" : "No"}`} value={!terrain.wetlands_risk} />
                            <FlagPill label={`Fire Risk: ${terrain.fire_risk || "Unknown"}`} value={terrain.fire_risk === "Low"} />
                            <FlagPill label={`Soil: ${terrain.soil_suitability || "Unknown"}`} value={terrain.soil_suitability === "Good"} />
                        </div>
                    </Section>

                    {/* ── SECTION 4 — Comparable Sales ── */}
                    <Section title="Comparable Sales" subtitle="Step 4 — Recent Sold Comps (last 24 months, within 15 miles)"
                        icon={<svg viewBox="0 0 24 24"><line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" /></svg>}
                    >
                        {soldComps.length > 0 ? (
                            <div className={styles.dataTableWrapper}>
                                <table className={styles.dataTable}>
                                    <thead>
                                        <tr>
                                            <th>APN</th><th>Price</th><th>$/Acre</th><th>Acres</th>
                                            <th>Location</th><th>Date</th><th>Zoning</th><th>Access</th><th>Source</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {soldComps.map((c, i) => (
                                            <tr key={i}>
                                                <td>{c.apn ? <span className={styles.apnBadge}>{c.apn}</span> : <span className={styles.notFound}>N/A</span>}</td>
                                                <td>{fmt(c.sold_price)}</td>
                                                <td>{fmt(c.price_per_acre)}</td>
                                                <td>{c.acreage}</td>
                                                <td>{c.distance_or_location}</td>
                                                <td>{c.sold_date}</td>
                                                <td>{c.zoning || NF}</td>
                                                <td>{c.access_notes || NF}</td>
                                                <td>{c.source_url ? <a href={c.source_url} target="_blank" rel="noopener noreferrer" className={styles.mapLink}>View ↗</a> : <span className={styles.notAvailable}>Not available</span>}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : <p style={{ color: "var(--text-muted)" }}>No comparable sales data available.</p>}
                        {marketValue.valuation_notes && (
                            <div className={styles.infoNote} style={{ marginTop: 12 }}>💡 {marketValue.valuation_notes}</div>
                        )}
                    </Section>

                    {/* ── SECTION 5 — Active Listings ── */}
                    <Section title="Active Listings" subtitle="Step 5 — Current Market Listings"
                        icon={<svg viewBox="0 0 24 24"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>}
                    >
                        {activeListings.length > 0 ? (
                            <div className={styles.dataTableWrapper}>
                                <table className={styles.dataTable}>
                                    <thead>
                                        <tr><th>APN</th><th>Price</th><th>$/Acre</th><th>Acres</th><th>DOM</th><th>Notes</th><th>Source</th></tr>
                                    </thead>
                                    <tbody>
                                        {activeListings.map((l, i) => (
                                            <tr key={i}>
                                                <td>{l.apn ? <span className={styles.apnBadge}>{l.apn}</span> : <span className={styles.notFound}>N/A</span>}</td>
                                                <td>{fmt(l.listing_price)}</td>
                                                <td>{fmt(l.price_per_acre)}</td>
                                                <td>{l.acreage}</td>
                                                <td>{l.days_on_market ?? NF}</td>
                                                <td>{l.terrain_and_access_notes || NF}</td>
                                                <td>{l.source_url ? <a href={l.source_url} target="_blank" rel="noopener noreferrer" className={styles.mapLink}>{l.source || "View ↗"}</a> : l.source ? <span>{l.source}</span> : <span className={styles.notAvailable}>Not available</span>}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : <p style={{ color: "var(--text-muted)" }}>No active listings data available.</p>}
                    </Section>

                    {/* ── SECTION 6 — Estimated Market Value ── */}
                    <Section title="Estimated Market Value Range" subtitle="Step 6 — MMV Price Per Acre Conversion"
                        icon={<svg viewBox="0 0 24 24"><rect x="1" y="4" width="22" height="16" rx="2" /><line x1="1" y1="10" x2="23" y2="10" /></svg>}
                    >
                        <div className={styles.valueRangeCards}>
                            <div className={styles.valueCard}>
                                <div className={styles.valueCardHeader} style={{ background: "linear-gradient(135deg, #f0fdf4, #dcfce7)" }}>
                                    <span className={styles.valueCardTag} style={{ color: "#15803d" }}>Low Estimate</span>
                                    <span style={{ fontSize: 11, color: "#166534" }}>85% of avg</span>
                                </div>
                                <div className={styles.valueCardBody}>
                                    <div className={styles.valueCardPrice}>{fmt(marketValue.low_estimated_value)}</div>
                                    <div className={styles.valueCardSub}>{fmt(marketValue.low_price_per_acre)}/acre</div>
                                </div>
                            </div>
                            <div className={styles.valueCard} style={{ border: "2px solid var(--primary-green)" }}>
                                <div className={styles.valueCardHeader} style={{ background: "linear-gradient(135deg, var(--deep-green), var(--primary-green))" }}>
                                    <span className={styles.valueCardTag} style={{ color: "white" }}>★ Mid (MMV)</span>
                                    <span style={{ fontSize: 11, color: "rgba(255,255,255,0.7)" }}>Comps avg</span>
                                </div>
                                <div className={styles.valueCardBody}>
                                    <div className={styles.valueCardPrice} style={{ color: "var(--accent-gold)" }}>{fmt(marketValue.mid_estimated_value)}</div>
                                    <div className={styles.valueCardSub}>{fmt(marketValue.mid_price_per_acre)}/acre</div>
                                </div>
                            </div>
                            <div className={styles.valueCard}>
                                <div className={styles.valueCardHeader} style={{ background: "linear-gradient(135deg, #fffbeb, #fef3c7)" }}>
                                    <span className={styles.valueCardTag} style={{ color: "#92400e" }}>High Estimate</span>
                                    <span style={{ fontSize: 11, color: "#a16207" }}>115% of avg</span>
                                </div>
                                <div className={styles.valueCardBody}>
                                    <div className={styles.valueCardPrice}>{fmt(marketValue.high_estimated_value)}</div>
                                    <div className={styles.valueCardSub}>{fmt(marketValue.high_price_per_acre)}/acre</div>
                                </div>
                            </div>
                        </div>
                    </Section>

                    {/* ── SECTION 7 — Auction Bid Ceiling ── */}
                    <Section title="Auction Bid Ceiling Engine" subtitle="Step 8 — Prevent Overbidding · MMV-Based Formula"
                        icon={<svg viewBox="0 0 24 24"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>}
                    >
                        <div className={styles.valueRangeCards}>
                            <div className={styles.valueCard}>
                                <div className={styles.valueCardHeader} style={{ background: "linear-gradient(135deg, #f0fdf4, #dcfce7)" }}>
                                    <span className={styles.valueCardTag} style={{ color: "#15803d" }}>Low Threshold</span>
                                    <span style={{ fontSize: 11, color: "#166534" }}>Conservative</span>
                                </div>
                                <div className={styles.valueCardBody}>
                                    <div className={styles.valueCardPrice}>{fmt(bidCeiling.low_bid_threshold)}</div>
                                    <div className={styles.valueCardSub}>Max safety buffer</div>
                                </div>
                            </div>
                            <div className={styles.valueCard} style={{ border: "2px solid var(--primary-green)" }}>
                                <div className={styles.valueCardHeader} style={{ background: "linear-gradient(135deg, var(--deep-green), var(--primary-green))" }}>
                                    <span className={styles.valueCardTag} style={{ color: "white" }}>★ Mid Threshold</span>
                                    <span style={{ fontSize: 11, color: "rgba(255,255,255,0.7)" }}>Balanced</span>
                                </div>
                                <div className={styles.valueCardBody}>
                                    <div className={styles.valueCardPrice} style={{ color: "var(--accent-gold)" }}>{fmt(bidCeiling.mid_bid_threshold)}</div>
                                    <div className={styles.valueCardSub}>Recommended target</div>
                                </div>
                            </div>
                            <div className={styles.valueCard}>
                                <div className={styles.valueCardHeader} style={{ background: "linear-gradient(135deg, #fef2f2, #fee2e2)" }}>
                                    <span className={styles.valueCardTag} style={{ color: "#991b1b" }}>🛑 Max Ceiling</span>
                                    <span style={{ fontSize: 11, color: "#991b1b", fontWeight: 700 }}>HARD STOP</span>
                                </div>
                                <div className={styles.valueCardBody}>
                                    <div className={styles.valueCardPrice} style={{ color: "#ef4444" }}>{fmt(bidCeiling.max_bid_ceiling)}</div>
                                    <div className={styles.valueCardSub}>Do not exceed</div>
                                </div>
                            </div>
                        </div>
                    </Section>

                    {/* ── SECTION 8 — Resale Price Range ── */}
                    <Section title="Resale Price Range" subtitle="Step 7 — What You Could List For"
                        icon={<svg viewBox="0 0 24 24"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18" /><polyline points="17 6 23 6 23 12" /></svg>}
                    >
                        <div className={styles.valueRangeCards}>
                            {[
                                { label: "Conservative", pct: "80% of MMV", value: resale.conservative_resale, sub: "Faster sale", style: { header: { background: "linear-gradient(135deg, #f0fdf4, #dcfce7)" }, tag: { color: "#15803d" }, tagPct: { color: "#166534" } } },
                                { label: "★ Suggested / Mid", pct: "90% of MMV", value: resale.suggested_resale_price, sub: "Standard listing", style: { card: { border: "2px solid var(--primary-green)" }, header: { background: "linear-gradient(135deg, var(--deep-green), var(--primary-green))" }, tag: { color: "white" }, tagPct: { color: "rgba(255,255,255,0.7)" }, price: { color: "var(--accent-gold)" } } },
                                { label: "Aggressive", pct: "95% of MMV", value: resale.aggressive_resale, sub: "Top of market", style: { header: { background: "linear-gradient(135deg, #fffbeb, #fef3c7)" }, tag: { color: "#92400e" }, tagPct: { color: "#a16207" } } },
                            ].map(({ label, pct, value, sub, style: s }, i) => {
                                const gp = calcResaleGrossProfit(value);
                                return (
                                    <div key={i} className={styles.valueCard} style={s.card || {}}>
                                        <div className={styles.valueCardHeader} style={s.header}>
                                            <span className={styles.valueCardTag} style={s.tag}>{label}</span>
                                            <span style={{ fontSize: 11, ...s.tagPct }}>{pct}</span>
                                        </div>
                                        <div className={styles.valueCardBody}>
                                            <div className={styles.valueCardPrice} style={s.price || {}}>{fmt(value)}</div>
                                            <div className={styles.valueCardSub}>{sub}</div>
                                            {gp !== null && (
                                                <div className={`${styles.grossProfitRow} ${gp >= 0 ? styles.grossProfitPositive : styles.grossProfitNegative}`}>
                                                    <span>Est. Gross Profit:</span>
                                                    <strong>{gp >= 0 ? "+" : ""}{fmt(gp)}</strong>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </Section>

                    {/* ── SECTION 9 — Days on Market ── */}
                    <Section title="Market Demand & Days on Market" subtitle="Step 9 — Sales Velocity & Market Liquidity"
                        icon={<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>}
                    >
                        <div className={styles.marketClassBadge} style={{
                            background: dom.market_classification === "Fast" ? "#f0fdf4" : dom.market_classification === "Normal" ? "#fffbeb" : dom.market_classification === "Slow" ? "#fff7ed" : "#fef2f2",
                            borderColor: dom.market_classification === "Fast" ? "#bbf7d0" : dom.market_classification === "Normal" ? "#fde68a" : dom.market_classification === "Slow" ? "#fed7aa" : "#fecaca",
                            color: dom.market_classification === "Fast" ? "#15803d" : dom.market_classification === "Normal" ? "#92400e" : dom.market_classification === "Slow" ? "#c2410c" : "#991b1b",
                        }}>
                            <strong>{dom.market_classification || NF}</strong>
                            {dom.estimated_dom_range && <span> · Est. DOM: {dom.estimated_dom_range}</span>}
                        </div>
                        <div className={`${styles.dataGrid} ${styles.dataGridThree}`} style={{ marginTop: 16 }}>
                            <div className={styles.dataItem}><div className={styles.dataLabel}>Median DOM</div><div className={styles.dataValue}>{dom.median_dom ?? NF} days</div></div>
                            <div className={styles.dataItem}><div className={styles.dataLabel}>Sales Last 6 Mo</div><div className={styles.dataValue}>{dom.land_sales_last_6_months ?? NF}</div></div>
                            <div className={styles.dataItem}><div className={styles.dataLabel}>Sales Last 12 Mo</div><div className={styles.dataValue}>{dom.land_sales_last_12_months ?? NF}</div></div>
                            <div className={styles.dataItem}><div className={styles.dataLabel}>Active Listings</div><div className={styles.dataValue}>{dom.active_listings_count ?? NF}</div></div>
                            <div className={styles.dataItem}><div className={styles.dataLabel}>Sold/Active Ratio</div><div className={styles.dataValue}>{dom.sold_to_active_ratio || NF}</div></div>
                            <div className={styles.dataItem}><div className={styles.dataLabel}>Sales Velocity</div><div className={styles.dataValue}>{dom.sales_velocity || NF}</div></div>
                            <div className={styles.dataItem}><div className={styles.dataLabel}>Turnover 6 Mo</div><div className={styles.dataValue}>{dom.zip_turnover_rate_6mo || NF}</div></div>
                            <div className={styles.dataItem}><div className={styles.dataLabel}>Turnover 12 Mo</div><div className={styles.dataValue}>{dom.zip_turnover_rate_12mo || NF}</div></div>
                            <div className={styles.dataItem}><div className={styles.dataLabel}>Inventory Count</div><div className={styles.dataValue}>{dom.inventory_count ?? NF}</div></div>
                        </div>
                    </Section>

                    {/* ── SECTION 10 — Deal Score (Compact) ── */}
                    <Section title="Deal Score" subtitle="Step 10 — Investment Quality Rating"
                        icon={<svg viewBox="0 0 24 24"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>}
                    >
                        <div className={styles.dealScoreCompact}>

                            {/* Left: ring + verdict + explanation */}
                            <div className={styles.dealScoreLeft}>
                                {(() => {
                                    const val = typeof dealScore.score === "number"
                                        ? Math.min(Math.max(dealScore.score, 0), 100) : 0;
                                    const r = 36;
                                    const circ = 2 * Math.PI * r;
                                    const offset = circ - (val / 100) * circ;
                                    const ringColor = val >= 70 ? "#16a34a" : val >= 45 ? "var(--accent-gold)" : "#dc2626";
                                    return (
                                        <div className={styles.dealMiniRing}>
                                            <svg width="96" height="96" viewBox="0 0 96 96"
                                                style={{ transform: "rotate(-90deg)" }}>
                                                <circle cx="48" cy="48" r={r} fill="none"
                                                    stroke="rgba(0,0,0,0.06)" strokeWidth="9" />
                                                <circle cx="48" cy="48" r={r} fill="none"
                                                    stroke={ringColor} strokeWidth="9"
                                                    strokeLinecap="round"
                                                    strokeDasharray={circ}
                                                    strokeDashoffset={offset}
                                                    style={{ transition: "stroke-dashoffset 1s ease-out" }} />
                                            </svg>
                                            <div className={styles.dealMiniRingInner}>
                                                <span className={styles.dealMiniScore} style={{ color: ringColor }}>
                                                    {dealScore.score ?? "—"}
                                                </span>
                                                <span className={styles.dealMiniDenom}>/100</span>
                                            </div>
                                        </div>
                                    );
                                })()}
                                {summary.verdict && (
                                    <div className={`${styles.dealVerdictChip} ${verdictClass}`}>
                                        {summary.verdict}
                                    </div>
                                )}
                                {dealScore.explanation && (
                                    <p className={styles.dealExplanation}>{dealScore.explanation}</p>
                                )}
                            </div>

                            {/* Right: progress bar + factors */}
                            <div className={styles.dealScoreRight}>
                                <div className={styles.dealScoreBarWrap}>
                                    <div className={styles.dealScoreBarTrack}>
                                        <div className={styles.dealScoreBarFill} style={{
                                            width: `${dealScore.score ?? 0}%`,
                                            background: (dealScore.score ?? 0) >= 70
                                                ? "linear-gradient(90deg, #16a34a, #4ade80)"
                                                : (dealScore.score ?? 0) >= 45
                                                    ? "linear-gradient(90deg, #d97706, var(--accent-gold))"
                                                    : "linear-gradient(90deg, #dc2626, #f87171)"
                                        }} />
                                    </div>
                                    <span className={styles.dealScoreBarLabel}>
                                        {(dealScore.score ?? 0) >= 70 ? "Strong" :
                                            (dealScore.score ?? 0) >= 45 ? "Moderate" : "Weak"}
                                    </span>
                                </div>
                                {dealScore.scoring_factors?.length > 0 && (
                                    <div className={styles.dealFactorsList}>
                                        {dealScore.scoring_factors.map((f, i) => (
                                            <div key={i} className={styles.dealFactorRow}>
                                                <span className={styles.dealFactorDot} />
                                                <span className={styles.dealFactorText}>{f}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </Section>

                    {/* ── SECTION 11 — Red Flags ── */}
                    <Section title="Red Flags" subtitle="Step 11 — Critical Issues"
                        icon={<svg viewBox="0 0 24 24"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>}
                    >
                        {redFlags.length > 0 ? (
                            <div className={styles.redFlagsList}>
                                {redFlags.map((flag, i) => (
                                    <div key={i} className={styles.redFlagItem}><span>🚩</span> {flag}</div>
                                ))}
                            </div>
                        ) : (
                            <div className={styles.noFlags}>✅ No red flags identified for this parcel.</div>
                        )}
                    </Section>

                    {/* ── SECTION 12 — Next Step ── */}
                    {nextStep && (
                        <Section title="Next Learning Step" subtitle="Step 12 — Educational Guidance"
                            icon={<svg viewBox="0 0 24 24"><path d="M5 12h14M12 5l7 7-7 7" /></svg>}
                        >
                            <div className={styles.infoNote} style={{ lineHeight: 1.7 }}>📘 {nextStep}</div>
                        </Section>
                    )}

                    {/* ── SECTION 13 — Sources ── */}
                    {sources.length > 0 && (
                        <Section title="Sources Checked" subtitle="Step 13 — All URLs Searched During Research"
                            icon={<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>}
                        >
                            <div className={styles.sourcesList}>
                                {sources.map((s, i) => (
                                    s.startsWith("http")
                                        ? <a key={i} href={s} target="_blank" rel="noopener noreferrer" className={styles.sourceTag}>{s}</a>
                                        : <span key={i} className={styles.sourceTag}>{s}</span>
                                ))}
                            </div>
                        </Section>
                    )}
                </div>

                <div className={styles.disclaimer}>
                    <strong>⚖️ Disclaimer:</strong> {disclaimer}
                </div>
            </div>

            <ChatBot reportId={report.id} />
        </div>
    );
}