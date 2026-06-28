"use client";

import { useCallback, useState } from "react";
import { Button } from "@/components/ui/Button";

/**
 * Client component that fetches a presigned URL from the preferred resume
 * endpoint and triggers a file download with the original filename.
 */
export function ResumeDownloadButton() {
  const [isLoading, setIsLoading] = useState(false);

  const handleDownload = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/resumes/preferred");
      const result = await response.json();

      if (!result.success || !result.data?.downloadUrl) {
        return;
      }

      // Create a temporary link to trigger the download
      const link = document.createElement("a");
      link.href = result.data.downloadUrl;
      link.download = result.data.filename ?? "resume.pdf";
      link.rel = "noopener noreferrer";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error("Failed to download resume:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return (
    <Button
      variant="primary"
      size="md"
      onClick={handleDownload}
      disabled={isLoading}
      aria-label="Download resume PDF"
    >
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-4 mr-1.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
      </svg>
      {isLoading ? "Downloading…" : "Download Resume"}
    </Button>
  );
}
