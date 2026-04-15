"use client";
import { useState, useEffect, useRef } from "react";
import styles from "./ChatBot.module.css";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function ChatBot({ reportId }) {
    const [open, setOpen]         = useState(false);
    const [messages, setMessages] = useState([
        { role: "bot", text: "Hi! Ask me anything about this property." },
    ]);
    const [chatHistory, setChatHistory] = useState([]);
    const [input, setInput]             = useState("");
    const [loading, setLoading]         = useState(false);
    const [pendingSearch, setPendingSearch] = useState(null);

    const messagesEndRef = useRef(null);
    const textareaRef    = useRef(null);  // ← ref for auto-resize

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    // Auto-resize textarea: grow up to 4 lines, then scroll
    useEffect(() => {
        const el = textareaRef.current;
        if (!el) return;
        el.style.height = "auto";                    // reset first
        const lineHeight   = parseInt(getComputedStyle(el).lineHeight) || 20;
        const maxHeight    = lineHeight * 4 + 24;    // 4 lines + padding
        el.style.height    = Math.min(el.scrollHeight, maxHeight) + "px";
        el.style.overflowY = el.scrollHeight > maxHeight ? "auto" : "hidden";
    }, [input]);

    const addMessage    = (role, text) => setMessages(prev => [...prev, { role, text }]);
    const appendHistory = (role, text) => setChatHistory(prev => [...prev, { role, text }]);

    const sendMessage = async (userText, useSearch = false) => {
        const token = localStorage.getItem("token");
        if (!token || !userText.trim()) return;
        setLoading(true);

        try {
            const res = await fetch(`${API_BASE}/api/chat`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    report_id: reportId,
                    message: userText.trim(),
                    use_search: useSearch,
                    history: chatHistory,
                }),
            });

            if (!res.ok) throw new Error("Chat request failed");
            const data = await res.json();

            const botReply = data.reply?.trim() ||
                "I couldn't generate a response. Please try again.";

            if (data.needs_search) {
                setPendingSearch(userText.trim());
                addMessage("bot", botReply);
                appendHistory("user", userText.trim());
                appendHistory("bot", botReply);
            } else {
                setPendingSearch(null);
                addMessage("bot", botReply);
                appendHistory("user", userText.trim());
                appendHistory("bot", botReply);
            }
        } catch {
            addMessage("bot", "⚠️ Something went wrong. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const handleSend = () => {
        const trimmed = input.trim();
        if (!trimmed || loading) return;
        setInput("");
        addMessage("user", trimmed);
        sendMessage(trimmed, false);
    };

    const handleConfirmSearch = (confirmed) => {
        if (!pendingSearch) return;
        if (confirmed) {
            addMessage("user", "Yes");
            addMessage("bot", "Searching the web…");
            appendHistory("user", "Yes");
            appendHistory("bot", "Searching the web…");
            sendMessage(pendingSearch, true);
        } else {
            addMessage("user", "No");
            addMessage("bot", "No problem! Ask me anything else about this property.");
            appendHistory("user", "No");
            appendHistory("bot", "No problem! Ask me anything else about this property.");
        }
        setPendingSearch(null);
    };

    // Enter sends, Shift+Enter adds a new line
    const handleKeyDown = (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const formatText = (text) =>
        text
            .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
            .replace(/^[-•]\s+(.+)$/gm, "<li>$1</li>")
            .replace(/(<li>.*<\/li>)/gs, "<ul>$1</ul>")
            .replace(/\n{2,}/g, "<br/><br/>")
            .replace(/\n/g, "<br/>");

    return (
        <>
            <button
                className={`${styles.chatToggle} ${open ? styles.chatToggleOpen : ""}`}
                onClick={() => setOpen(!open)}
                aria-label={open ? "Close chat" : "Open property assistant"}
            >
                {open ? (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
                        stroke="currentColor" strokeWidth="2.5"
                        strokeLinecap="round" strokeLinejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                ) : (
                    <svg width="26" height="26" viewBox="0 0 24 24" fill="none"
                        stroke="currentColor" strokeWidth="1.7"
                        strokeLinecap="round" strokeLinejoin="round">
                        <line x1="12" y1="6" x2="12" y2="3" />
                        <circle cx="12" cy="2.5" r="1" fill="currentColor" stroke="none" />
                        <rect x="3" y="6" width="18" height="13" rx="3" />
                        <circle cx="9" cy="11.5" r="1.3" fill="currentColor" stroke="none" />
                        <circle cx="15" cy="11.5" r="1.3" fill="currentColor" stroke="none" />
                        <path d="M9 15.5h6" strokeWidth="1.8" />
                        <line x1="3" y1="12" x2="1" y2="12" />
                        <line x1="21" y1="12" x2="23" y2="12" />
                    </svg>
                )}
            </button>

            {open && (
                <div className={styles.chatPanel}>
                    <div className={styles.chatHeader}>
                        <span>🤖 Property Assistant</span>
                        <button
                            className={styles.chatClose}
                            onClick={() => setOpen(false)}
                            aria-label="Close chat"
                        >✕</button>
                    </div>

                    <div className={styles.chatMessages}>
                        {messages.map((msg, i) => (
                            <div
                                key={i}
                                className={`${styles.chatBubble} ${
                                    msg.role === "user" ? styles.chatUser : styles.chatBot
                                }`}
                                dangerouslySetInnerHTML={{ __html: formatText(msg.text) }}
                            />
                        ))}

                        {pendingSearch && !loading && (
                            <div className={styles.searchConfirm}>
                                <span>Search the web for this?</span>
                                <div className={styles.searchConfirmButtons}>
                                    <button onClick={() => handleConfirmSearch(true)}>Yes</button>
                                    <button onClick={() => handleConfirmSearch(false)}>No</button>
                                </div>
                            </div>
                        )}

                        {loading && (
                            <div className={`${styles.chatBubble} ${styles.chatBot}`}>
                                <span className={styles.chatTyping}>●●●</span>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    <div className={styles.chatInputBar}>
                        {/* ← textarea replaces input */}
                        <textarea
                            ref={textareaRef}
                            className={styles.chatInput}
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Ask about this property"
                            disabled={loading}
                            autoFocus
                            rows={1}
                        />
                        <button
                            className={styles.chatSend}
                            onClick={handleSend}
                            disabled={loading || !input.trim()}
                            aria-label="Send message"
                        >➤</button>
                    </div>
                </div>
            )}
        </>
    );
}