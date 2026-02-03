"use client";

import { useState } from "react";

interface ReportModalProps {
    isOpen: boolean;
    onClose: () => void;
    reportedType: "user" | "post" | "comment";
    reportedId: string;
    reportedName?: string; // For display (username, post preview, etc.)
}

export default function ReportModal({
    isOpen,
    onClose,
    reportedType,
    reportedId,
    reportedName,
}: ReportModalProps) {
    const [reason, setReason] = useState("");
    const [description, setDescription] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!reason || submitting) return;

        setSubmitting(true);
        try {
            const res = await fetch("/api/reports", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    reportedType,
                    reportedId,
                    reason,
                    description,
                }),
            });

            if (res.ok) {
                setSubmitted(true);
                setTimeout(() => {
                    onClose();
                    setSubmitted(false);
                    setReason("");
                    setDescription("");
                }, 2000);
            }
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-[fadeIn_0.2s_ease-out]">
            <div
                className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-[scaleIn_0.15s_ease-out] border border-zinc-200 dark:border-zinc-800"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-red-500">
                                <path d="M3 3l18 18M4 4l16 16" />
                                <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                            </svg>
                        </div>
                        <div>
                            <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">
                                Report {reportedType === "user" ? "User" : reportedType === "post" ? "Post" : "Comment"}
                            </h3>
                            {reportedName && (
                                <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate max-w-xs">
                                    {reportedName}
                                </p>
                            )}
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="18" y1="6" x2="6" y2="18" />
                            <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                    </button>
                </div>

                {submitted ? (
                    <div className="p-8 text-center">
                        <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center mx-auto mb-4">
                            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-green-500">
                                <polyline points="20 6 9 17 4 12" />
                            </svg>
                        </div>
                        <p className="font-medium text-zinc-900 dark:text-zinc-100 mb-1">Report Submitted</p>
                        <p className="text-sm text-zinc-500 dark:text-zinc-400">
                            Thank you for helping keep our community safe
                        </p>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit}>
                        {/* Body */}
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                                    Reason for report *
                                </label>
                                <select
                                    value={reason}
                                    onChange={(e) => setReason(e.target.value)}
                                    className="w-full px-4 py-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-zinc-300 dark:focus:ring-zinc-600"
                                    required
                                >
                                    <option value="">Select a reason...</option>
                                    <option value="Spam">Spam or Misleading</option>
                                    <option value="Harassment">Harassment or Bullying</option>
                                    <option value="Inappropriate Content">Inappropriate Content</option>
                                    <option value="Hate Speech">Hate Speech</option>
                                    <option value="Violence">Violence or Harmful Behavior</option>
                                    <option value="Other">Other</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                                    Additional details (optional)
                                </label>
                                <textarea
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    placeholder="Provide more context if needed..."
                                    maxLength={500}
                                    rows={4}
                                    className="w-full px-4 py-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-zinc-300 dark:focus:ring-zinc-600 resize-none"
                                />
                                <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1">
                                    {description.length}/500
                                </p>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 flex gap-3">
                            <button
                                type="button"
                                onClick={onClose}
                                className="flex-1 px-4 py-2.5 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg font-medium transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={!reason || submitting}
                                className="flex-1 px-4 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {submitting ? "Submitting..." : "Submit Report"}
                            </button>
                        </div>
                    </form>
                )}
            </div>
            {/* Backdrop click to close */}
            <div className="absolute inset-0 z-[-1]" onClick={onClose} />
        </div>
    );
}
