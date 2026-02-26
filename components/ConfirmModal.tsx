"use client";

import { useEffect, useCallback } from "react";

interface ConfirmModalProps {
    isOpen: boolean;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    variant?: "default" | "danger";
    onConfirm: () => void;
    onCancel: () => void;
}

export default function ConfirmModal({
    isOpen,
    title,
    message,
    confirmText = "Confirm",
    cancelText = "Cancel",
    variant = "default",
    onConfirm,
    onCancel,
}: ConfirmModalProps) {
    // Handle escape key
    const handleKeyDown = useCallback(
        (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                onCancel();
            }
        },
        [onCancel]
    );

    useEffect(() => {
        if (isOpen) {
            document.addEventListener("keydown", handleKeyDown);
            document.body.style.overflow = "hidden";
        }
        return () => {
            document.removeEventListener("keydown", handleKeyDown);
            document.body.style.overflow = "";
        };
    }, [isOpen, handleKeyDown]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-100 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-[fadeIn_0.2s_ease-out]"
                onClick={onCancel}
            />

            {/* Modal */}
            <div
                className="relative w-full max-w-sm bg-linear-to-b from-white to-zinc-50 dark:from-zinc-900 dark:to-zinc-950 rounded-2xl shadow-2xl border border-zinc-200/50 dark:border-zinc-800/50 overflow-hidden animate-[modalIn_0.25s_cubic-bezier(0.16,1,0.3,1)]"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="px-6 pt-6 pb-2">
                    <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                        {title}
                    </h3>
                </div>

                {/* Content */}
                <div className="px-6 pb-4">
                    <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
                        {message}
                    </p>
                </div>

                {/* Actions */}
                <div className="px-6 pb-6 flex gap-3 justify-end">
                    <button
                        onClick={onCancel}
                        className="px-4 py-2.5 text-sm font-medium text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-xl transition-colors"
                    >
                        {cancelText}
                    </button>
                    <button
                        onClick={onConfirm}
                        className={`px-4 py-2.5 text-sm font-semibold rounded-xl transition-all shadow-sm hover:shadow ${variant === "danger"
                                ? "bg-red-500 hover:bg-red-600 text-white"
                                : "bg-zinc-900 dark:bg-zinc-100 hover:bg-zinc-800 dark:hover:bg-zinc-200 text-white dark:text-zinc-900"
                            }`}
                    >
                        {confirmText}
                    </button>
                </div>
            </div>

        </div>
    );
}
