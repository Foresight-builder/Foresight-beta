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
import { supabaseAdmin } from './supabase'
import { placeSignedOrder, cancelSalt, getDepth, getQueue, getOrderTypes } from './orderbook'

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

// Off-chain orderbook API
app.post("/orderbook/orders", async (req, res) => {
  try {
    if (!supabaseAdmin) return res.status(500).json({ message: 'Supabase not configured' })
    const body = req.body || {}
    const data = await placeSignedOrder(body)
    res.json({ message: 'ok', data })
  } catch (e: any) {
    res.status(400).json({ message: 'place order failed', detail: String(e?.message || e) })
  }
})

app.post("/orderbook/cancel-salt", async (req, res) => {
  try {
    if (!supabaseAdmin) return res.status(500).json({ message: 'Supabase not configured' })
    const body = req.body || {}
    const data = await cancelSalt(body)
    res.json({ message: 'ok', data })
  } catch (e: any) {
    res.status(400).json({ message: 'cancel salt failed', detail: String(e?.message || e) })
  }
})

app.get("/orderbook/depth", async (req, res) => {
  try {
    if (!supabaseAdmin) return res.status(500).json({ message: 'Supabase not configured' })
    const vc = String(req.query.contract || '')
    const chainId = Number(req.query.chainId || 0)
    const outcome = Number(req.query.outcome || 0)
    const side = String(req.query.side || 'buy').toLowerCase() === 'buy'
    const levels = Math.max(1, Math.min(50, Number(req.query.levels || 10)))
    const data = await getDepth(vc, chainId, outcome, side, levels)
    res.json({ message: 'ok', data })
  } catch (e: any) {
    res.status(400).json({ message: 'depth query failed', detail: String(e?.message || e) })
  }
})

app.get("/orderbook/queue", async (req, res) => {
  try {
    if (!supabaseAdmin) return res.status(500).json({ message: 'Supabase not configured' })
    const vc = String(req.query.contract || '')
    const chainId = Number(req.query.chainId || 0)
    const outcome = Number(req.query.outcome || 0)
    const side = String(req.query.side || 'buy').toLowerCase() === 'buy'
    const price = BigInt(String(req.query.price || '0'))
    const limit = Math.max(1, Math.min(200, Number(req.query.limit || 50)))
    const offset = Math.max(0, Number(req.query.offset || 0))
    const data = await getQueue(vc, chainId, outcome, side, price, limit, offset)
    res.json({ message: 'ok', data })
  } catch (e: any) {
    res.status(400).json({ message: 'queue query failed', detail: String(e?.message || e) })
  }
})

app.get('/orderbook/types', (req, res) => {
  res.json({ types: getOrderTypes() })
})

app.listen(PORT, () => {
  console.log(`Relayer server listening on port ${PORT}`);
});
