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

// 为了配合之前生成的交易数据，前5个地址必须固定
// 但我们给它们起一些好听的名字，看起来像真实用户
const fixedUsers = [
  {
    wallet_address: "0x1111111111111111111111111111111111111111",
    username: "Alice_Alpha",
    email: "alice.alpha@foresight.demo",
    is_admin: false,
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30).toISOString(), // 30天前
  },
  {
    wallet_address: "0x2222222222222222222222222222222222222222",
    username: "Bob_The_Builder",
    email: "bob.builder@foresight.demo",
    is_admin: false,
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 25).toISOString(),
  },
  {
    wallet_address: "0x3333333333333333333333333333333333333333",
    username: "Crypto_Carol",
    email: "carol.crypto@foresight.demo",
    is_admin: false,
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 20).toISOString(),
  },
  {
    wallet_address: "0x4444444444444444444444444444444444444444",
    username: "DeFi_Dave",
    email: "dave.defi@foresight.demo",
    is_admin: false,
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 15).toISOString(),
  },
  {
    wallet_address: "0x5555555555555555555555555555555555555555",
    username: "Erin_Admin",
    email: "erin.admin@foresight.demo",
    is_admin: true,
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 60).toISOString(),
  },
];

// 再加几个看起来很真实的随机用户
const realisticUsers = [
  {
    wallet_address: "0x71C7656EC7ab88b098defB751B7401B5f6d8976F",
    username: "Satoshi_Fan_2024",
    email: "satoshi.fan@gmail.com",
    is_admin: false,
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5).toISOString(),
  },
  {
    wallet_address: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266", // Hardhat default account 0
    username: "Local_Whale",
    email: "whale@localhost.dev",
    is_admin: false,
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(),
  },
  {
    wallet_address: "0x90F79bf6EB2c4f870365E785982E1f101E93b906", // Faucet address often used
    username: "Prediction_Oracle",
    email: "oracle@chain.link",
    is_admin: false,
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 10).toISOString(),
  },
];

// 生成更多随机用户，总数达到 30+
const userPrefixes = [
  "Crypto",
  "DeFi",
  "NFT",
  "Moon",
  "Hodl",
  "Diamond",
  "Golden",
  "Silver",
  "Bronze",
  "Paper",
  "Smart",
  "Dumb",
  "Fast",
  "Slow",
  "Alpha",
  "Beta",
  "Gamma",
  "Omega",
  "Meta",
  "Cyber",
];
const userSuffixes = [
  "Trader",
  "Investor",
  "Whale",
  "Shrimp",
  "Hands",
  "Bull",
  "Bear",
  "Wolf",
  "Ape",
  "Degen",
  "King",
  "Queen",
  "Prince",
  "Princess",
  "Knight",
  "Wizard",
  "Ninja",
  "Robot",
  "Punk",
  "Gamer",
];

function generateRandomUser() {
  const prefix = userPrefixes[Math.floor(Math.random() * userPrefixes.length)];
  const suffix = userSuffixes[Math.floor(Math.random() * userSuffixes.length)];
  const num = Math.floor(Math.random() * 9999);
  const username = `${prefix}_${suffix}_${num}`;

  const wallet = ethers.Wallet.createRandom();

  return {
    wallet_address: wallet.address,
    username: username,
    email: `${username.toLowerCase()}@example.com`,
    is_admin: false,
    created_at: new Date(
      Date.now() - Math.floor(Math.random() * 1000 * 60 * 60 * 24 * 90)
    ).toISOString(), // Past 90 days
  };
}

async function seed() {
  console.log("Connecting to Supabase:", supabaseUrl);
  console.log("Inserting user profiles...");

  const randomUsersCount = 35; // Generate 35 more users
  const randomUsers = Array.from({ length: randomUsersCount }, generateRandomUser);

  const allUsers = [...fixedUsers, ...realisticUsers, ...randomUsers];

  console.log(`Prepared ${allUsers.length} users for insertion.`);

  const { data, error } = await supabase
    .from("user_profiles")
    .upsert(allUsers, { onConflict: "wallet_address" })
    .select();

  if (error) {
    console.error("Error seeding users:", error);
  } else {
    console.log(`Successfully inserted/updated ${data.length} users.`);
    // data.forEach((u) => console.log(` - ${u.username} (${u.wallet_address.slice(0, 6)}...)`));
    console.log("First 10 users:");
    data
      .slice(0, 10)
      .forEach((u) => console.log(` - ${u.username} (${u.wallet_address.slice(0, 6)}...)`));
  }
}

seed();
