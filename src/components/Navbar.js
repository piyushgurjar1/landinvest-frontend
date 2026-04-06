"use client";
import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Image from "next/image";
import styles from "./Navbar.module.css";

export default function Navbar({ userName }) {
    const router = useRouter();
    const pathname = usePathname();
    const [menuOpen, setMenuOpen] = useState(false);

    const initials = userName
        ? userName.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
        : "U";

    const handleLogout = () => {
        localStorage.removeItem("token");
        router.push("/login");
    };

    const closeMenu = () => setMenuOpen(false);

    return (
        <>
            <nav className={styles.navbar}>
                <div className={styles.navLeft}>
                    <a href="/dashboard" className={styles.logo} onClick={closeMenu}>
                        <div className={styles.logoIconSmall}>
                            <Image
                                src="https://land-invest.io/wp-content/uploads/2025/10/Asset-22.svg"
                                alt="LandInvestAI Logo"
                                width={32}
                                height={32}
                            />
                        </div>
                        <span className={styles.logoText}>
                            LandInvest <span className={styles.logoTextAccent}>AI</span>
                        </span>
                    </a>

                    {/* Desktop nav links */}
                    <ul className={styles.navLinks}>
                        <li>
                            <a
                                href="/dashboard"
                                className={`${styles.navLink} ${pathname === "/dashboard" ? styles.navLinkActive : ""}`}
                            >
                                Dashboard
                            </a>
                        </li>
                        <li>
                            <a
                                href="/reports"
                                className={`${styles.navLink} ${pathname === "/reports" ? styles.navLinkActive : ""}`}
                            >
                                Reports
                            </a>
                        </li>
                    </ul>
                </div>

                <div className={styles.navRight}>
                    {/* Desktop user menu */}
                    <div className={styles.userMenu}>
                        <div className={styles.userAvatar}>{initials}</div>
                        <span className={styles.userName}>{userName || "User"}</span>
                    </div>
                    <button className={styles.logoutBtn} onClick={handleLogout}>
                        Sign Out
                    </button>

                    {/* Hamburger — mobile only */}
                    <button
                        className={styles.hamburger}
                        onClick={() => setMenuOpen((prev) => !prev)}
                        aria-label="Toggle menu"
                        aria-expanded={menuOpen}
                    >
                        <span className={`${styles.hamburgerLine} ${menuOpen ? styles.hamburgerLineTop : ""}`} />
                        <span className={`${styles.hamburgerLine} ${menuOpen ? styles.hamburgerLineMid : ""}`} />
                        <span className={`${styles.hamburgerLine} ${menuOpen ? styles.hamburgerLineBot : ""}`} />
                    </button>
                </div>
            </nav>

            {/* Mobile dropdown drawer */}
            <div className={`${styles.mobileMenu} ${menuOpen ? styles.mobileMenuOpen : ""}`}>
                {/* User info row */}
                <div className={styles.mobileUserRow}>
                    <div className={styles.userAvatar}>{initials}</div>
                    <span className={styles.mobileUserName}>{userName || "User"}</span>
                </div>

                <div className={styles.mobileDivider} />

                {/* Nav links */}
                <ul className={styles.mobileNavLinks}>
                    <li>
                        <a
                            href="/dashboard"
                            className={`${styles.mobileNavLink} ${pathname === "/dashboard" ? styles.mobileNavLinkActive : ""}`}
                            onClick={closeMenu}
                        >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <rect x="3" y="3" width="7" height="7" />
                                <rect x="14" y="3" width="7" height="7" />
                                <rect x="14" y="14" width="7" height="7" />
                                <rect x="3" y="14" width="7" height="7" />
                            </svg>
                            Dashboard
                        </a>
                    </li>
                    <li>
                        <a
                            href="/reports"
                            className={`${styles.mobileNavLink} ${pathname === "/reports" ? styles.mobileNavLinkActive : ""}`}
                            onClick={closeMenu}
                        >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                                <polyline points="14 2 14 8 20 8" />
                                <line x1="16" y1="13" x2="8" y2="13" />
                                <line x1="16" y1="17" x2="8" y2="17" />
                                <polyline points="10 9 9 9 8 9" />
                            </svg>
                            Reports
                        </a>
                    </li>
                </ul>

                <div className={styles.mobileDivider} />

                {/* Sign out */}
                <button className={styles.mobileLogoutBtn} onClick={() => { handleLogout(); closeMenu(); }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
                        <polyline points="16 17 21 12 16 7" />
                        <line x1="21" y1="12" x2="9" y2="12" />
                    </svg>
                    Sign Out
                </button>
            </div>

            {/* Backdrop — closes menu on outside tap */}
            {menuOpen && (
                <div className={styles.mobileBackdrop} onClick={closeMenu} aria-hidden="true" />
            )}
        </>
    );
}