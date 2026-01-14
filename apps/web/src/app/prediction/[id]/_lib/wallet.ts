import { ethers } from "ethers";
import { getChainAddresses } from "@/lib/runtimeConfig";

export async function createBrowserProvider(walletProvider: any) {
  return new ethers.BrowserProvider(walletProvider);
}

export async function ensureNetwork(
  provider: ethers.BrowserProvider,
  targetChainId: number,
  switchNetwork: (chainId: number) => Promise<void>
) {
  const network = await provider.getNetwork();
  if (Number(network.chainId) !== targetChainId) {
    await switchNetwork(targetChainId);
    await new Promise((r) => setTimeout(r, 1000));
  }
}

export function resolveAddresses(chainId: number): { foresight: string; usdc: string } {
  const a = getChainAddresses(chainId);
  return { foresight: String(a.foresightToken || "").trim(), usdc: String(a.usdc || "").trim() };
}

export function resolveMakerRewardAddresses(chainId: number): {
  foresight: string;
  usdc: string;
  lpFeeStaking: string;
} {
  const base = resolveAddresses(chainId);
  const a = getChainAddresses(chainId);
  return { ...base, lpFeeStaking: String(a.lpFeeStaking || "").trim() };
}

export async function getCollateralTokenContract(
  market: { market: string; chain_id: number; collateral_token?: string },
  signer: ethers.Signer,
  erc20Abi: readonly string[]
) {
  const addresses = resolveAddresses(market.chain_id);
  const collateralToken = market.collateral_token || addresses.usdc;
  const tokenContract = new ethers.Contract(collateralToken, erc20Abi, signer);
  const decimals = await tokenContract.decimals();
  return { tokenContract, decimals: Number(decimals) };
}

export function parseUnitsByDecimals(value: number | string, decimals: number): bigint {
  const str = typeof value === "number" ? String(value) : value;
  try {
    return ethers.parseUnits(str, decimals);
  } catch {
    const parts = str.split(".");
    if (parts.length === 1) {
      return BigInt(parts[0]) * BigInt(10) ** BigInt(decimals);
    }
    const [intPart, fracRaw] = parts;
    const frac = (fracRaw || "").slice(0, decimals).padEnd(decimals, "0");
    return BigInt(intPart || "0") * BigInt(10) ** BigInt(decimals) + BigInt(frac || "0");
  }
}
