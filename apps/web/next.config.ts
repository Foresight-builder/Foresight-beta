import type { NextConfig } from "next";
import withBundleAnalyzer from "@next/bundle-analyzer";
import { withSentryConfig } from "@sentry/nextjs";

const bundleAnalyzer = withBundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

const nextConfig: NextConfig = {
  distDir: process.env.NEXT_DIST_DIR || ".next",

  // 启用 gzip 压缩
  compress: true,

  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "api.dicebear.com",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "avatar.vercel.sh",
      },
      {
        protocol: "https",
        hostname: "avatars.githubusercontent.com",
      },
      {
        protocol: "https",
        hostname: "www.transparenttextures.com",
      },
      {
        protocol: "https",
        hostname: "grainy-gradients.vercel.app",
      },
    ],
    // 图片优化配置
    formats: ["image/webp"],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },

  async redirects() {
    return [{ source: "/", destination: "/trending", permanent: false }];
  },

  // 生产环境优化
  productionBrowserSourceMaps: false,
  poweredByHeader: false,

  // 实验性特性
  experimental: {
    optimizePackageImports: ["lucide-react", "framer-motion"],
  },
};

// Sentry 配置选项
const sentryWebpackPluginOptions = {
  // 自动上传 source maps
  silent: true,
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
};

// 导出配置（先 bundle analyzer，再 Sentry）
export default withSentryConfig(bundleAnalyzer(nextConfig), sentryWebpackPluginOptions);
