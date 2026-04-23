"use client";
import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Image from "next/image";
import styles from "./Navbar.module.css";

export default function Navbar({ userName }) {
    const router = useRouter();
    const pathname = usePathname();
    const [menuOpen, setMenuOpen] = useState(false);

    const handleLogout = () => {
        localStorage.removeItem("token");
        router.push("/login");
    };

    const closeMenu = () => setMenuOpen(false);

    return (
        <>
            {/* Backdrop rendered OUTSIDE navbarContainer so z-index is independent */}
            {menuOpen && (
                <div
                    className={styles.mobileBackdrop}
                    onClick={closeMenu}
                    aria-hidden="true"
                />
            )}

            <div className={styles.navbarContainer}>
                <nav className={styles.navbar}>
                    <div className={styles.navLeft}>
                        <a href="/dashboard" className={styles.logo} onClick={closeMenu}>
                            <Image
                                src="https://land-invest.io/wp-content/uploads/2025/10/Asset-22.svg"
                                alt="LandInvest Logo"
                                width={28}
                                height={28}
                            />
                            <span className={styles.logoText}>TaxAuction.ai</span>
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
                                    href="/batch-reports"
                                    className={`${styles.navLink} ${pathname.startsWith("/batch-reports") ? styles.navLinkActive : ""}`}
                                >
                                    Batch Reports
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
                        <div className={styles.userMenuBtn}>
                            {userName || "User Profile"}
                        </div>
                        <button className={styles.logoutBtn} onClick={handleLogout}>
                            SIGN OUT
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
                    <div className={styles.mobileUserRow}>
                        <span className={styles.mobileUserName}>{userName || "User Profile"}</span>
                    </div>

                    <div className={styles.mobileDivider} />

                    <ul className={styles.mobileNavLinks}>
                        <li>
                            <a
                                href="/dashboard"
                                className={`${styles.mobileNavLink} ${pathname === "/dashboard" ? styles.mobileNavLinkActive : ""}`}
                                onClick={closeMenu}
                            >
                                Dashboard
                            </a>
                        </li>
                        <li>
                            <a
                                href="/batch-reports"
                                className={`${styles.mobileNavLink} ${pathname.startsWith("/batch-reports") ? styles.mobileNavLinkActive : ""}`}
                                onClick={closeMenu}
                            >
                                Batch Reports
                            </a>
                        </li>
                        <li>
                            <a
                                href="/reports"
                                className={`${styles.mobileNavLink} ${pathname === "/reports" ? styles.mobileNavLinkActive : ""}`}
                                onClick={closeMenu}
                            >
                                Reports
                            </a>
                        </li>
                    </ul>

                    <div className={styles.mobileDivider} />

                    <button
                        className={styles.mobileLogoutBtn}
                        onClick={() => { handleLogout(); closeMenu(); }}
                    >
                        SIGN OUT
                    </button>
                </div>
            </div>
        </>
    );
}