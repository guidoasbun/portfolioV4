/**
 * Message inbox page.
 *
 * Lists messages with pagination (20/page), sorted by timestamp descending.
 * Shows sender name, email, truncated body (100 chars), timestamp, and read/unread indicator.
 * Supports message detail view (marks as read), delete with confirmation, and empty state.
 *
 * Requirements: 11.1, 11.2, 11.3, 11.4, 11.5
 */

"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import type { Message } from "@/types/entities";
import type { ApiResponse, PaginatedResponse } from "@/types/api";

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatTimestamp(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function MessagesInboxPage() {
  // List state
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  // Detail view state
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);

  // Delete state
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // ─── Fetch messages ───────────────────────────────────────────────────

  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);

    fetch(`/api/messages?page=${page}&pageSize=20`)
      .then((res) => res.json())
      .then((json: ApiResponse<PaginatedResponse<Message>>) => {
        if (cancelled) return;
        if (json.success && json.data) {
          setMessages(json.data.items);
          setTotalPages(json.data.totalPages);
          setTotal(json.data.total);
          setPage(json.data.page);
        } else {
          setError("Failed to load messages.");
        }
      })
      .catch(() => {
        if (!cancelled) setError("Failed to load messages.");
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => { cancelled = true; };
  }, [page, refreshKey]);

  const refetchMessages = () => setRefreshKey((k) => k + 1);

  // ─── Detail view ──────────────────────────────────────────────────────

  const openMessage = async (msg: Message) => {
    setIsLoadingDetail(true);
    setSelectedMessage(msg);
    try {
      const res = await fetch(`/api/messages/${msg.id}`);
      const json: ApiResponse<Message> = await res.json();
      if (json.success && json.data) {
        setSelectedMessage(json.data);
        // Update the list to reflect the message is now read
        setMessages((prev) =>
          prev.map((m) => (m.id === msg.id ? { ...m, isRead: true } : m)),
        );
      }
    } catch {
      // Keep the truncated message visible but show an error
      setError("Failed to load full message.");
    } finally {
      setIsLoadingDetail(false);
    }
  };

  const closeDetail = () => {
    setSelectedMessage(null);
  };

  // ─── Delete handlers ──────────────────────────────────────────────────

  const confirmDelete = (id: string) => {
    setDeletingId(id);
  };

  const cancelDelete = () => {
    setDeletingId(null);
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/messages/${deletingId}`, {
        method: "DELETE",
      });
      const json: ApiResponse = await res.json();
      if (json.success) {
        // If we just deleted the currently selected message, close the detail view
        if (selectedMessage?.id === deletingId) {
          setSelectedMessage(null);
        }
        setDeletingId(null);
        refetchMessages();
      } else {
        setError("Failed to delete message.");
      }
    } catch {
      setError("Failed to delete message.");
    } finally {
      setIsDeleting(false);
    }
  };

  // ─── Pagination ───────────────────────────────────────────────────────

  const goToPage = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setPage(newPage);
      setSelectedMessage(null);
    }
  };

  // ─── Render ───────────────────────────────────────────────────────────

  return (
    <div>
      <div className="flex items-center justify-between mb-spacing-lg">
        <div>
          <h1 className="text-h3 font-bold text-foreground">Messages</h1>
          {!isLoading && total > 0 && (
            <p className="text-sm text-foreground-muted mt-spacing-xs">
              {total} message{total !== 1 ? "s" : ""} total
            </p>
          )}
        </div>
      </div>

      {error && (
        <div
          className="mb-spacing-md p-spacing-sm bg-surface border border-error rounded-md text-error text-sm"
          role="alert"
        >
          {error}
          <button
            type="button"
            className="ml-2 underline"
            onClick={() => setError(null)}
          >
            Dismiss
          </button>
        </div>
      )}

      {/* ─── Detail View ─────────────────────────────────────────────── */}
      {selectedMessage && (
        <div className="mb-spacing-lg p-spacing-lg bg-surface border border-border rounded-lg">
          <div className="flex items-start justify-between gap-spacing-md mb-spacing-md">
            <div>
              <h2 className="text-lg font-semibold text-foreground">
                {selectedMessage.name}
              </h2>
              <p className="text-sm text-foreground-muted">
                {selectedMessage.email}
              </p>
              <p className="text-xs text-foreground-subtle mt-spacing-xs">
                {formatTimestamp(selectedMessage.submittedAt)}
              </p>
            </div>
            <Button variant="ghost" size="sm" onClick={closeDetail}>
              Close
            </Button>
          </div>

          {isLoadingDetail ? (
            <p className="text-foreground-muted">Loading full message…</p>
          ) : (
            <div className="p-spacing-md bg-background border border-border rounded-md">
              <p className="text-foreground whitespace-pre-wrap">
                {selectedMessage.body}
              </p>
            </div>
          )}
        </div>
      )}

      {/* ─── Message List ────────────────────────────────────────────── */}
      {isLoading ? (
        <p className="text-foreground-muted">Loading…</p>
      ) : messages.length === 0 ? (
        <div className="text-center py-spacing-xl text-foreground-muted">
          <p className="text-lg mb-spacing-sm">No messages yet.</p>
          <p className="text-sm">
            Messages from the contact form will appear here.
          </p>
        </div>
      ) : (
        <>
          <ul className="space-y-spacing-sm" aria-label="Messages list">
            {messages.map((msg) => (
              <li
                key={msg.id}
                className={[
                  "p-spacing-md border rounded-lg transition-colors duration-200",
                  msg.isRead
                    ? "bg-surface border-border"
                    : "bg-surface-elevated border-primary/30",
                  selectedMessage?.id === msg.id
                    ? "ring-2 ring-primary"
                    : "",
                ].join(" ")}
              >
                <div className="flex items-start justify-between gap-spacing-md">
                  <button
                    type="button"
                    className="flex-1 min-w-0 text-left cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary rounded-sm"
                    onClick={() => openMessage(msg)}
                    aria-label={`View message from ${msg.name}${msg.isRead ? "" : " (unread)"}`}
                  >
                    <div className="flex items-center gap-spacing-sm">
                      {/* Read/Unread indicator */}
                      <span
                        className={[
                          "inline-block w-2.5 h-2.5 rounded-full shrink-0",
                          msg.isRead ? "bg-foreground-subtle/30" : "bg-primary",
                        ].join(" ")}
                        aria-label={msg.isRead ? "Read" : "Unread"}
                      />
                      <span
                        className={[
                          "text-base truncate",
                          msg.isRead
                            ? "font-normal text-foreground"
                            : "font-semibold text-foreground",
                        ].join(" ")}
                      >
                        {msg.name}
                      </span>
                      <span className="text-sm text-foreground-muted truncate hidden sm:inline">
                        {msg.email}
                      </span>
                    </div>
                    <p className="text-sm text-foreground-muted mt-1 truncate">
                      {msg.body}
                    </p>
                    <p className="text-xs text-foreground-subtle mt-1">
                      {formatTimestamp(msg.submittedAt)}
                    </p>
                  </button>

                  <div className="shrink-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => confirmDelete(msg.id)}
                    >
                      Delete
                    </Button>
                  </div>
                </div>

                {/* Delete confirmation */}
                {deletingId === msg.id && (
                  <div className="mt-spacing-sm p-spacing-sm bg-background border border-error rounded-md">
                    <p className="text-sm text-foreground mb-spacing-sm">
                      Are you sure you want to delete this message?
                    </p>
                    <div className="flex gap-spacing-xs">
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={handleDelete}
                        disabled={isDeleting}
                      >
                        {isDeleting ? "Deleting…" : "Confirm Delete"}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={cancelDelete}
                        disabled={isDeleting}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>

          {/* ─── Pagination Controls ───────────────────────────────────── */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-spacing-lg">
              <Button
                variant="outline"
                size="sm"
                onClick={() => goToPage(page - 1)}
                disabled={page <= 1}
              >
                Previous
              </Button>
              <span className="text-sm text-foreground-muted">
                Page {page} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => goToPage(page + 1)}
                disabled={page >= totalPages}
              >
                Next
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
