import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 允许通过环境变量自定义构建目录，便于并行预览
  distDir: process.env.NEXT_DIST_DIR || '.next',
  // 确保工作区共享包在 Next 构建中被正确转译
  transpilePackages: ['@forsight/shared'],
};

export default nextConfig;
