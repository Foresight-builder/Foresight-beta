import { ethers } from "ethers";
import type { MarketInfo } from "../marketTypes";
import {
  createBrowserProvider,
  ensureNetwork,
  getCollateralTokenContract,
  parseUnitsByDecimals,
} from "../wallet";

export async function mintAction(args: {
  amountStr: string;
  market: MarketInfo;
  account: string;
  walletProvider: any;
  switchNetwork: (chainId: number) => Promise<any>;
  erc20Abi: any;
  marketAbi: any;
  setOrderMsg: (msg: string | null) => void;
}) {
  const {
    amountStr,
    market,
    account,
    walletProvider,
    switchNetwork,
    erc20Abi,
    marketAbi,
    setOrderMsg,
  } = args;
  try {
    setOrderMsg("准备铸币...");

    const provider = await createBrowserProvider(walletProvider);
    await ensureNetwork(provider, market.chain_id, switchNetwork);
    const signer = await provider.getSigner();

    const { tokenContract } = await getCollateralTokenContract(market, signer, erc20Abi);
    // amount is in shares (1e18)
    const amount18 = parseUnitsByDecimals(amountStr, 18);
    if (amount18 % 1_000_000_000_000n !== 0n) {
      throw new Error("数量精度过高：最多支持 6 位小数");
    }
    // USDC deposit is amount18 * 1e6 / 1e18
    const deposit6 = (amount18 * 1_000_000n) / 1_000_000_000_000_000_000n;

    const allowance = await tokenContract.allowance(account, market.market);
    if (allowance < deposit6) {
      setOrderMsg("请授权 USDC...");
      const txApp = await tokenContract.approve(market.market, ethers.MaxUint256);
      await txApp.wait();
    }

    setOrderMsg("正在铸币...");
    const marketContract = new ethers.Contract(market.market, marketAbi, signer);

    try {
      await marketContract.mintCompleteSet.estimateGas(amount18);
    } catch (err: any) {
      throw new Error("铸币交易预估失败，请检查余额或权限: " + (err.reason || err.message));
    }

    const tx = await marketContract.mintCompleteSet(amount18);
    await tx.wait();

    setOrderMsg("铸币成功！您现在可以出售代币了。");
  } catch (e: any) {
    setOrderMsg("铸币失败: " + (e.message || "未知错误"));
  }
}
