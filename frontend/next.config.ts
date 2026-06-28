import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: `${process.env.S3_BUCKET_NAME ?? "portfolio-assets"}.s3.${process.env.AWS_REGION ?? "us-east-1"}.amazonaws.com`,
        pathname: "/**",
      },
      // Support S3_PUBLIC_URL pointing to a custom domain (e.g., CloudFront)
      ...(process.env.S3_PUBLIC_URL
        ? [
            {
              protocol: "https" as const,
              hostname: new URL(process.env.S3_PUBLIC_URL).hostname,
              pathname: "/**",
            },
          ]
        : []),
    ],
  },
};

export default nextConfig;
