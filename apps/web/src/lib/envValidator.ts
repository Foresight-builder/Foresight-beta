/**
 * 环境变量验证工具
 * 确保所有必需的环境变量都已配置
 */

import { log } from "./logger";

interface EnvConfig {
  key: string;
  required: boolean;
  description: string;
  defaultValue?: string;
}

// 定义所有环境变量配置
const ENV_CONFIGS: EnvConfig[] = [
  // Supabase
  {
    key: "NEXT_PUBLIC_SUPABASE_URL",
    required: true,
    description: "Supabase 项目 URL",
  },
  {
    key: "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    required: true,
    description: "Supabase 匿名密钥（前端使用）",
  },
  {
    key: "SUPABASE_SERVICE_ROLE_KEY",
    required: true,
    description: "Supabase 服务角色密钥（服务端使用）",
  },

  // 区块链
  {
    key: "NEXT_PUBLIC_CHAIN_ID",
    required: true,
    description: "区块链网络 ID",
    defaultValue: "80002",
  },
  {
    key: "NEXT_PUBLIC_RPC_URL",
    required: true,
    description: "区块链 RPC URL",
  },
  {
    key: "NEXT_PUBLIC_USDC_ADDRESS",
    required: true,
    description: "USDC 代币合约地址",
  },
  {
    key: "NEXT_PUBLIC_MARKET_FACTORY_ADDRESS",
    required: false,
    description: "市场工厂合约地址",
  },

  // 应用配置
  {
    key: "NEXT_PUBLIC_APP_URL",
    required: true,
    description: "应用 URL",
    defaultValue: "http://localhost:3000",
  },
  {
    key: "JWT_SECRET",
    required: true,
    description: "JWT 密钥（至少 32 字符）",
  },

  // Sentry（可选）
  {
    key: "SENTRY_DSN",
    required: false,
    description: "Sentry DSN（错误监控）",
  },
  {
    key: "SENTRY_ORG",
    required: false,
    description: "Sentry 组织",
  },
  {
    key: "SENTRY_PROJECT",
    required: false,
    description: "Sentry 项目",
  },

  // 邮件（可选）
  {
    key: "SMTP_HOST",
    required: false,
    description: "SMTP 服务器地址",
  },
  {
    key: "SMTP_PORT",
    required: false,
    description: "SMTP 端口",
  },
  {
    key: "SMTP_USER",
    required: false,
    description: "SMTP 用户名",
  },
  {
    key: "SMTP_PASSWORD",
    required: false,
    description: "SMTP 密码",
  },

  // Google 验证（可选）
  {
    key: "NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION",
    required: false,
    description: "Google 站点验证码",
  },
];

interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  missing: string[];
}

/**
 * 验证环境变量
 */
export function validateEnv(): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const missing: string[] = [];

  for (const config of ENV_CONFIGS) {
    const value = process.env[config.key];

    if (!value) {
      if (config.required) {
        errors.push(`❌ 缺少必需的环境变量: ${config.key} - ${config.description}`);
        missing.push(config.key);
      } else {
        warnings.push(`⚠️ 缺少可选的环境变量: ${config.key} - ${config.description}`);
      }
    } else {
      // 特殊验证
      if (config.key === "JWT_SECRET" && value.length < 32) {
        errors.push(`❌ JWT_SECRET 长度不足（当前: ${value.length}，要求: 至少 32 字符）`);
      }

      if (config.key.includes("URL") && !value.startsWith("http")) {
        warnings.push(`⚠️ ${config.key} 可能不是有效的 URL: ${value}`);
      }
    }
  }

  const valid = errors.length === 0;

  return { valid, errors, warnings, missing };
}

/**
 * 打印环境变量验证结果
 */
export function printEnvValidation(result: ValidationResult) {
  console.log("\n=== 环境变量验证 ===\n");

  if (result.valid) {
    console.log("✅ 所有必需的环境变量已配置\n");
  } else {
    console.log("❌ 环境变量配置不完整\n");
  }

  if (result.errors.length > 0) {
    console.log("错误:");
    result.errors.forEach((error) => console.log(`  ${error}`));
    console.log("");
  }

  if (result.warnings.length > 0) {
    console.log("警告:");
    result.warnings.forEach((warning) => console.log(`  ${warning}`));
    console.log("");
  }

  if (result.missing.length > 0) {
    console.log("缺少的环境变量:");
    result.missing.forEach((key) => console.log(`  - ${key}`));
    console.log("");
  }

  if (!result.valid) {
    console.log("请在 .env.local 文件中配置缺少的环境变量\n");
    console.log("参考 .env.example 文件获取更多信息\n");
  }

  console.log("===================\n");
}

/**
 * 生成 .env.example 文件内容
 */
export function generateEnvExample(): string {
  const lines = ["# Foresight 环境变量配置", "# 复制此文件为 .env.local 并填写实际值", ""];

  let currentSection = "";

  for (const config of ENV_CONFIGS) {
    // 根据 key 前缀分组
    let section = "";
    if (config.key.includes("SUPABASE")) section = "Supabase";
    else if (config.key.includes("CHAIN") || config.key.includes("RPC")) section = "区块链";
    else if (config.key.includes("SENTRY")) section = "Sentry";
    else if (config.key.includes("SMTP")) section = "邮件";
    else section = "应用配置";

    if (section !== currentSection) {
      lines.push("", `# ${section}`);
      currentSection = section;
    }

    const required = config.required ? "[必需]" : "[可选]";
    lines.push(`# ${required} ${config.description}`);

    const value = config.defaultValue || "";
    lines.push(`${config.key}=${value}`);
  }

  return lines.join("\n");
}

/**
 * 在应用启动时验证环境变量
 */
export function validateEnvOnStartup() {
  const result = validateEnv();

  if (process.env.NODE_ENV === "development") {
    printEnvValidation(result);
  }

  if (!result.valid) {
    if (process.env.NODE_ENV === "production") {
      log.error("环境变量配置不完整", new Error("Missing required env vars"));
      // 在生产环境，缺少必需的环境变量应该导致应用无法启动
      throw new Error("Missing required environment variables");
    } else {
      log.warn("环境变量配置不完整，请检查 .env.local 文件");
    }
  }

  return result;
}

// 导出类型
export type { EnvConfig, ValidationResult };
