"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import styles from "./admin.module.css";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function AdminUsersPage() {
    const router = useRouter();
    const [user, setUser] = useState(null);
    const [pendingUsers, setPendingUsers] = useState([]);
    const [allUsers, setAllUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState("pending");
    const [actionLoading, setActionLoading] = useState(null);

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
            .then((u) => {
                if (u.role !== "admin") { router.replace("/dashboard"); return; }
                setUser(u);
                fetchUsers(token);
            })
            .catch(() => { });
    }, [router]);

    const fetchUsers = async (token) => {
        setLoading(true);
        try {
            const [pendingRes, allRes] = await Promise.all([
                fetch(`${API_BASE}/api/auth/admin/pending-users`, {
                    headers: { Authorization: `Bearer ${token}` },
                }),
                fetch(`${API_BASE}/api/auth/admin/all-users`, {
                    headers: { Authorization: `Bearer ${token}` },
                }),
            ]);
            if (pendingRes.ok) setPendingUsers(await pendingRes.json());
            if (allRes.ok) setAllUsers(await allRes.json());
        } catch { /* ignore */ }
        finally { setLoading(false); }
    };

    const handleApprove = async (userId) => {
        setActionLoading(userId);
        const token = localStorage.getItem("token");
        try {
            const res = await fetch(`${API_BASE}/api/auth/admin/approve/${userId}`, {
                method: "POST",
                headers: { Authorization: `Bearer ${token}` },
            });
            if (res.ok) fetchUsers(token);
        } catch { /* ignore */ }
        finally { setActionLoading(null); }
    };

    const handleReject = async (userId) => {
        if (!confirm("Are you sure you want to reject and remove this user?")) return;
        setActionLoading(userId);
        const token = localStorage.getItem("token");
        try {
            const res = await fetch(`${API_BASE}/api/auth/admin/reject/${userId}`, {
                method: "POST",
                headers: { Authorization: `Bearer ${token}` },
            });
            if (res.ok) fetchUsers(token);
        } catch { /* ignore */ }
        finally { setActionLoading(null); }
    };

    const handleDeleteUser = async (userId) => {
        if (!confirm("Are you sure you want to completely delete this user?")) return;
        setActionLoading(userId);
        const token = localStorage.getItem("token");
        try {
            const res = await fetch(`${API_BASE}/api/auth/admin/users/${userId}`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${token}` },
            });
            if (res.ok) fetchUsers(token);
        } catch { /* ignore */ }
        finally { setActionLoading(null); }
    };

    if (!user) {
        return (
            <div className={styles.page}>
                <Navbar userName="" userRole="" />
                <div className={styles.loadingContainer}>
                    <div className={styles.spinner} />
                    <div className={styles.loadingText}>Loading...</div>
                </div>
            </div>
        );
    }

    const displayUsers = activeTab === "pending" ? pendingUsers : allUsers;

    return (
        <div className={styles.page}>
            <Navbar userName={user?.name} userRole={user?.role} />
            <div className={styles.container}>
                <div className={styles.header}>
                    <h1 className={styles.title}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
                            <circle cx="8.5" cy="7" r="4" />
                            <path d="M20 8v6M23 11h-6" />
                        </svg>
                        Manage Users
                    </h1>
                    <p className={styles.subtitle}>Approve or reject user signup requests</p>
                </div>

                {/* Tabs */}
                <div className={styles.tabs}>
                    <button
                        className={`${styles.tab} ${activeTab === "pending" ? styles.tabActive : ""}`}
                        onClick={() => setActiveTab("pending")}
                    >
                        Pending Approval
                        {pendingUsers.length > 0 && (
                            <span className={styles.tabBadge}>{pendingUsers.length}</span>
                        )}
                    </button>
                    <button
                        className={`${styles.tab} ${activeTab === "all" ? styles.tabActive : ""}`}
                        onClick={() => setActiveTab("all")}
                    >
                        All Users
                    </button>
                </div>

                {/* Table */}
                {loading ? (
                    <div className={styles.loadingContainer}>
                        <div className={styles.spinner} />
                    </div>
                ) : displayUsers.length === 0 ? (
                    <div className={styles.emptyState}>
                        {activeTab === "pending"
                            ? "No pending signup requests"
                            : "No users found"}
                    </div>
                ) : (
                    <div className={styles.tableWrapper}>
                        <table className={styles.table}>
                            <thead>
                                <tr>
                                    <th>Name</th>
                                    <th>Email</th>
                                    <th>Role</th>
                                    {activeTab === "pending" && <th>Status</th>}
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {displayUsers.map((u) => (
                                    <tr key={u.id}>
                                        <td className={styles.cellName}>{u.name || "—"}</td>
                                        <td className={styles.cellEmail}>{u.email}</td>
                                        <td>
                                            <span className={`${styles.roleBadge} ${u.role === "admin" ? styles.roleAdmin : styles.roleUser}`}>
                                                {u.role}
                                            </span>
                                        </td>
                                        {activeTab === "pending" && (
                                            <td>
                                                <span className={`${styles.statusBadge} ${u.is_approved ? styles.statusApproved : styles.statusPending}`}>
                                                    {u.is_approved ? "Approved" : "Pending"}
                                                </span>
                                            </td>
                                        )}
                                        <td className={styles.actionsCell}>
                                            {activeTab === "pending" ? (
                                                <>
                                                    <button
                                                        className={styles.approveBtn}
                                                        onClick={() => handleApprove(u.id)}
                                                        disabled={actionLoading === u.id}
                                                    >
                                                        {actionLoading === u.id ? "..." : "Approve"}
                                                    </button>
                                                    <button
                                                        className={styles.rejectBtn}
                                                        onClick={() => handleReject(u.id)}
                                                        disabled={actionLoading === u.id}
                                                    >
                                                        Reject
                                                    </button>
                                                </>
                                            ) : (
                                                u.role !== "admin" ? (
                                                    <button
                                                        className={styles.rejectBtn}
                                                        onClick={() => handleDeleteUser(u.id)}
                                                        disabled={actionLoading === u.id}
                                                    >
                                                        {actionLoading === u.id ? "..." : "Delete"}
                                                    </button>
                                                ) : (
                                                    <span className={styles.noAction}>—</span>
                                                )
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
