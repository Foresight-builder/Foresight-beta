import { ethers } from "ethers";
import { formatTranslation, t } from "@/lib/i18n";
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
    setOrderMsg(t("trading.redeemFlow.prepare"));

    const provider = await createBrowserProvider(walletProvider);
    await ensureNetwork(provider, market.chain_id, switchNetwork);
    const signer = await provider.getSigner();

    const amount18 = parseUnitsByDecimals(amountStr, 18);
    if (amount18 % 1_000_000_000_000n !== 0n) {
      throw new Error(t("trading.orderFlow.invalidAmountPrecision"));
    }

    const marketContract = new ethers.Contract(market.market, marketAbi, signer);
    const outcomeTokenAddress = await marketContract.outcomeToken();
    const outcome1155 = new ethers.Contract(outcomeTokenAddress, erc1155Abi, signer);

    const isApproved = await outcome1155.isApprovedForAll(account, market.market);
    if (!isApproved) {
      setOrderMsg(t("trading.redeemFlow.approveOutcomeToken"));
      const txApp = await outcome1155.setApprovalForAll(market.market, true);
      await txApp.wait();
    }

    setOrderMsg(t("trading.redeemFlow.redeeming"));
    const state = Number(await marketContract.state());
    let tx;
    if (state === 1) {
      tx = await marketContract.redeem(amount18);
    } else if (state === 2) {
      tx = await marketContract.redeemCompleteSetOnInvalid(amount18);
    } else {
      throw new Error(t("trading.redeemFlow.marketNotResolved"));
    }
    await tx.wait();

    setOrderMsg(t("trading.redeemFlow.success"));
  } catch (e: any) {
    setOrderMsg(
      formatTranslation(t("trading.redeemFlow.failed"), {
        reason: String(e?.message || t("trading.redeemFlow.unknownError")),
      })
    );
  }
}
