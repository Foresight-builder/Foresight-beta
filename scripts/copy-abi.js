#!/usr/bin/env node
/**
 * 复制合约ABI文件到relayer服务目录
 * 用于合约事件监听器
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");

// 源ABI目录
const artifactsDir = path.join(repoRoot, "artifacts");

// 目标ABI目录
const targetAbiDir = path.join(repoRoot, "services", "relayer", "src", "abi");

// 确保目标目录存在
if (!fs.existsSync(targetAbiDir)) {
  fs.mkdirSync(targetAbiDir, { recursive: true });
}

// 需要复制的合约
const contractsToCopy = [
  "MarketFactory",
  "OffchainBinaryMarket",
  "OffchainMultiMarket8",
  "OffchainMarketBase",
  "OutcomeToken1155",
  "ManualOracle",
  "UMAOracleAdapterV2",
];

// 复制ABI文件
console.log("开始复制合约ABI文件...");

for (const contractName of contractsToCopy) {
  // 查找源文件
  const sourceFiles = fs
    .readdirSync(artifactsDir, { recursive: true })
    .filter((filePath) => filePath.endsWith(`${contractName}.json`))
    .map((filePath) => path.join(artifactsDir, filePath));

  if (sourceFiles.length === 0) {
    console.warn(`⚠️  未找到合约 ${contractName} 的ABI文件`);
    continue;
  }

  // 选择第一个匹配的文件
  const sourceFile = sourceFiles[0];
  const targetFile = path.join(targetAbiDir, `${contractName}.json`);

  try {
    // 读取源文件
    const sourceContent = fs.readFileSync(sourceFile, "utf8");
    const sourceJson = JSON.parse(sourceContent);

    // 提取ABI
    const abi = sourceJson.abi;

    // 写入目标文件
    fs.writeFileSync(targetFile, JSON.stringify(abi, null, 2), "utf8");

    console.log(`✅  成功复制 ${contractName} ABI到 ${targetFile}`);
  } catch (error) {
    console.error(`❌  复制 ${contractName} ABI失败:`, error.message);
  }
}

console.log("\n🎉  合约ABI文件复制完成！");
