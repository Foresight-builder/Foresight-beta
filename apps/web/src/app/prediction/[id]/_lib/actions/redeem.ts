import { ethers } from "ethers";
import type { MarketInfo } from "../marketTypes";
import {
  createBrowserProvider,
  ensureNetwork,
  getCollateralTokenContract,
  parseUnitsByDecimals,
} from "../wallet";

export async function redeemAction(args: {
  amountStr: string;
  market: MarketInfo;
  account: string;
  walletProvider: any;
  switchNetwork: (chainId: number) => Promise<any>;
  erc20Abi: any;
  erc1155Abi: any;
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
    erc1155Abi,
    marketAbi,
    setOrderMsg,
  } = args;
  try {
    setOrderMsg("准备赎回...");

    const provider = await createBrowserProvider(walletProvider);
    await ensureNetwork(provider, market.chain_id, switchNetwork);
    const signer = await provider.getSigner();

    // amount is in shares (1e18)
    const amount18 = parseUnitsByDecimals(amountStr, 18);
    if (amount18 % 1_000_000_000_000n !== 0n) {
      throw new Error("数量精度过高：最多支持 6 位小数");
    }

    const marketContract = new ethers.Contract(market.market, marketAbi, signer);
    const outcomeTokenAddress = await marketContract.outcomeToken();
    const outcome1155 = new ethers.Contract(outcomeTokenAddress, erc1155Abi, signer);

    const isApproved = await outcome1155.isApprovedForAll(account, market.market);
    if (!isApproved) {
      setOrderMsg("请授权预测代币...");
      const txApp = await outcome1155.setApprovalForAll(market.market, true);
      await txApp.wait();
    }

    setOrderMsg("正在赎回...");
    const state = Number(await marketContract.state());
    // OffchainMarketBase.State: 0=TRADING, 1=RESOLVED, 2=INVALID
    let tx;
    if (state === 1) {
      tx = await marketContract.redeem(amount18);
    } else if (state === 2) {
      tx = await marketContract.redeemCompleteSetOnInvalid(amount18);
    } else {
      throw new Error("市场尚未结算，无法赎回");
    }
    await tx.wait();

    setOrderMsg("赎回成功！USDC 已退回。");
  } catch (e: any) {
    setOrderMsg("赎回失败: " + (e.message || "未知错误"));
  }
}
