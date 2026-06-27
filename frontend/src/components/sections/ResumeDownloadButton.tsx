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
      {isLoading ? "Downloading…" : "Download Resume"}
    </Button>
  );
}
