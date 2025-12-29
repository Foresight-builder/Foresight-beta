import { createClient } from "@supabase/supabase-js";
import { ethers } from "ethers";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

// Initialize dotenv
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, "../.env.local") });

// 从环境变量读取配置
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase URL or Service Role Key");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

function parseUnits(value, decimals = 18) {
  return ethers.parseUnits(value.toString(), decimals).toString();
}

async function seedTradesAndOrders() {
  console.log("Connecting to Supabase:", supabaseUrl);

  // 0. Fetch all users from DB to use as makers/takers
  const { data: users, error: usersError } = await supabase
    .from("user_profiles")
    .select("wallet_address");

  if (usersError || !users || users.length === 0) {
    console.error("Error fetching users or no users found:", usersError);
    return;
  }

  const allUserAddresses = users.map((u) => u.wallet_address);
  console.log(`Loaded ${allUserAddresses.length} users for seeding trades.`);

  function randomUser() {
    return allUserAddresses[Math.floor(Math.random() * allUserAddresses.length)];
  }

  // 1. 获取所有市场映射
  const { data: markets, error: marketError } = await supabase.from("markets_map").select("*");

  if (marketError) {
    console.error("Error fetching markets:", marketError);
    return;
  }

  if (!markets || markets.length === 0) {
    console.log("No markets found in markets_map table.");
    return;
  }

  console.log(`Found ${markets.length} markets. Generating data...`);

  // 2. 获取所有 outcomes
  const { data: outcomes, error: outcomeError } = await supabase
    .from("prediction_outcomes")
    .select("*");

  if (outcomeError) {
    console.error("Error fetching outcomes:", outcomeError);
    return;
  }

  const tradesToInsert = [];
  const ordersToInsert = [];

  // 辅助函数：生成随机价格 (0.3 - 0.7)
  const randomPrice = () => 0.3 + Math.random() * 0.4;

  // 辅助函数：生成随机数量 (1 - 100)
  const randomAmount = () => 1 + Math.random() * 99;

  for (const market of markets) {
    const eventOutcomes = outcomes.filter((o) => o.prediction_id === market.event_id);
    if (eventOutcomes.length === 0) continue;

    // 为每个 outcome 生成数据
    for (const outcome of eventOutcomes) {
      // --- 生成 Trades (历史成交) ---
      // 每个 outcome 生成 20-30 条成交 (Increased from 3-5)
      const tradeCount = 20 + Math.floor(Math.random() * 11);
      for (let i = 0; i < tradeCount; i++) {
        const price = randomPrice();
        const amount = randomAmount();
        const isBuy = Math.random() > 0.5;
        const maker = randomUser();
        let taker = randomUser();
        while (taker === maker) taker = randomUser(); // 确保 maker != taker

        tradesToInsert.push({
          network_id: market.chain_id,
          market_address: market.market,
          outcome_index: outcome.outcome_index,
          price: price.toFixed(4), // Numeric
          amount: amount.toFixed(4), // Numeric
          taker_address: taker,
          maker_address: maker,
          is_buy: isBuy,
          tx_hash: `0xseed_trade_${market.event_id}_${outcome.outcome_index}_${i}_${Date.now()}_${Math.random().toString(36).substring(7)}`,
          log_index: 0,
          block_number: 1000000 + i,
          block_timestamp: new Date(
            Date.now() - Math.floor(Math.random() * 30 * 24 * 60 * 60 * 1000) // Increased to past 30 days
          ).toISOString(),
          created_at: new Date().toISOString(),
        });
      }

      // --- 生成 Orders (订单簿深度) ---
      // 买单 (Bids): 价格较低，从 0.1 到 0.45
      // Increased to 10-20 bids (from 3-6)
      const bidCount = 10 + Math.floor(Math.random() * 11);
      for (let i = 0; i < bidCount; i++) {
        const price = 0.1 + Math.random() * 0.35; // 0.1 - 0.45
        const amount = randomAmount();
        const maker = randomUser();

        ordersToInsert.push({
          verifying_contract: market.market,
          chain_id: market.chain_id,
          market_key: `${market.chain_id}:${market.event_id}`,
          maker_address: maker,
          maker_salt: Math.floor(Math.random() * 1e15).toString(),
          outcome_index: outcome.outcome_index,
          is_buy: true,
          price: parseUnits(price.toFixed(4)), // uint256 string
          amount: parseUnits(amount.toFixed(4)), // uint256 string
          remaining: parseUnits(amount.toFixed(4)), // 全额剩余
          expiry: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30天后过期
          signature: "0xseed_signature",
          status: "open",
        });
      }

      // 卖单 (Asks): 价格较高，从 0.55 到 0.9
      // Increased to 10-20 asks (from 3-6)
      const askCount = 10 + Math.floor(Math.random() * 11);
      for (let i = 0; i < askCount; i++) {
        const price = 0.55 + Math.random() * 0.35; // 0.55 - 0.9
        const amount = randomAmount();
        const maker = randomUser();

        ordersToInsert.push({
          verifying_contract: market.market,
          chain_id: market.chain_id,
          market_key: `${market.chain_id}:${market.event_id}`,
          maker_address: maker,
          maker_salt: Math.floor(Math.random() * 1e15).toString(),
          outcome_index: outcome.outcome_index,
          is_buy: false,
          price: parseUnits(price.toFixed(4)), // uint256 string
          amount: parseUnits(amount.toFixed(4)), // uint256 string
          remaining: parseUnits(amount.toFixed(4)), // 全额剩余
          expiry: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30天后过期
          signature: "0xseed_signature",
          status: "open",
        });
      }
    }
  }

  // 批量插入 Trades
  if (tradesToInsert.length > 0) {
    const { error } = await supabase.from("trades").insert(tradesToInsert);
    if (error) console.error("Error inserting trades:", error);
    else console.log(`Successfully inserted ${tradesToInsert.length} trades.`);
  }

  // 批量插入 Orders
  if (ordersToInsert.length > 0) {
    const { error } = await supabase.from("orders").insert(ordersToInsert);
    if (error) console.error("Error inserting orders:", error);
    else console.log(`Successfully inserted ${ordersToInsert.length} orders.`);
  }
}

seedTradesAndOrders();
