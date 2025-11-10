// relayer/src/config.ts
import { z } from "zod";

// 环境变量校验与读取
const EnvSchema = z.object({
  // 支持从 BUNDLER_PRIVATE_KEY 或 PRIVATE_KEY 读取；必须为 64 字节十六进制私钥
  BUNDLER_PRIVATE_KEY: z
    .string()
    .regex(/^0x[0-9a-fA-F]{64}$/),
  // RPC 地址，默认本地 Hardhat
  RPC_URL: z
    .string()
    .url()
    .default("http://127.0.0.1:8545"),
  // Relayer 端口（可选），用于启动时读取
  PORT: z
    .preprocess((v) => (typeof v === "string" && v.length > 0 ? Number(v) : v), z.number().int().positive())
    .optional(),
});

const rawEnv = {
  BUNDLER_PRIVATE_KEY: process.env.BUNDLER_PRIVATE_KEY || process.env.PRIVATE_KEY,
  RPC_URL: process.env.RPC_URL,
  PORT: process.env.PORT,
};

const parsed = EnvSchema.safeParse(rawEnv);
if (!parsed.success) {
  // 将错误信息打印为易读格式，避免无提示失败
  console.error("Relayer config validation failed:", parsed.error.flatten());
  throw new Error("Invalid relayer environment configuration");
}

export const BUNDLER_PRIVATE_KEY = parsed.data.BUNDLER_PRIVATE_KEY;
export const RPC_URL = parsed.data.RPC_URL;
export const RELAYER_PORT = parsed.data.PORT ?? 3001;
import express from "express";
import { ethers, Contract } from "ethers";
import EntryPointAbi from './abi/EntryPoint.json' with { type: 'json' };

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;

const provider = new ethers.JsonRpcProvider(RPC_URL);
const bundlerWallet = new ethers.Wallet(BUNDLER_PRIVATE_KEY, provider);

console.log(`Bundler address: ${bundlerWallet.address}`);

app.get("/", (req, res) => {
  res.send("Foresight Relayer is running!");
});

app.post("/", async (req, res) => {
  try {
    const { userOp, entryPointAddress } = req.body;

    if (!userOp || !entryPointAddress) {
      return res.status(400).json({
        jsonrpc: "2.0",
        id: req.body.id,
        error: {
          code: -32602,
          message: "Invalid params: userOp and entryPointAddress are required.",
        },
      });
    }

    console.log("Received UserOperation:");
    console.log(userOp);
    console.log("EntryPoint Address:", entryPointAddress);

    const entryPoint = new Contract(
      entryPointAddress,
      EntryPointAbi,
      bundlerWallet
    );

    // For simplicity, we are bundling a single UserOperation.
    // A production bundler would aggregate multiple UserOperations.
    const tx = await entryPoint.handleOps([userOp], bundlerWallet.address);

    console.log("Transaction sent, waiting for confirmation...");
    const receipt = await tx.wait();
    console.log("Transaction confirmed! Hash:", receipt.hash);

    res.json({
      jsonrpc: "2.0",
      id: req.body.id,
      result: receipt.hash,
    });
  } catch (error: any) {
    console.error("Error processing UserOperation:", error);
    res.status(500).json({
      jsonrpc: "2.0",
      id: req.body.id,
      error: {
        code: -32602,
        message: "Internal error",
        data: error.message,
      },
    });
  }
});

app.listen(PORT, () => {
  console.log(`Relayer server listening on port ${PORT}`);
});
