import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      new URL(
        `https://${process.env.S3_BUCKET_NAME ?? "portfolio-assets"}.s3.${process.env.AWS_REGION ?? "us-east-1"}.amazonaws.com/**`,
      ),
    ],
  },
};

export default nextConfig;
