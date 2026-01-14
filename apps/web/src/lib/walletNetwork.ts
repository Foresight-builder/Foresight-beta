"use client";
import { ethers } from "ethers";
import { t } from "./i18n";
import { getConfiguredRpcUrl } from "./runtimeConfig";

export async function switchNetwork(provider: any, chainId: number): Promise<void> {
  if (!provider) {
    throw new Error(t("errors.wallet.providerUnavailable"));
  }

  const chainIdHex = "0x" + chainId.toString(16);

  try {
    await provider.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: chainIdHex }],
    });
  } catch (switchError: any) {
    if (switchError.code === 4902) {
      let chainParams = null;
      if (chainId === 80002) {
        chainParams = {
          chainId: "0x13882",
          chainName: "Polygon Amoy Testnet",
          nativeCurrency: { name: "MATIC", symbol: "MATIC", decimals: 18 },
          rpcUrls: [getConfiguredRpcUrl(80002)],
          blockExplorerUrls: ["https://amoy.polygonscan.com/"],
        };
      } else if (chainId === 137) {
        chainParams = {
          chainId: "0x89",
          chainName: "Polygon Mainnet",
          nativeCurrency: { name: "MATIC", symbol: "MATIC", decimals: 18 },
          rpcUrls: [getConfiguredRpcUrl(137)],
          blockExplorerUrls: ["https://polygonscan.com/"],
        };
      } else if (chainId === 11155111) {
        chainParams = {
          chainId: "0xaa36a7",
          chainName: "Sepolia",
          nativeCurrency: { name: "Sepolia Ether", symbol: "ETH", decimals: 18 },
          rpcUrls: [getConfiguredRpcUrl(11155111)],
          blockExplorerUrls: ["https://sepolia.etherscan.io"],
        };
      }

      if (chainParams) {
        try {
          await provider.request({
            method: "wallet_addEthereumChain",
            params: [chainParams],
          });
          await provider.request({
            method: "wallet_switchEthereumChain",
            params: [{ chainId: chainIdHex }],
          });
        } catch (addError: any) {
          console.error("[Wallet] Failed to add network:", addError);
          throw new Error(t("errors.wallet.addNetworkFailed"));
        }
      } else {
        throw new Error(t("errors.wallet.networkNotConfigured"));
      }
    } else if (switchError.code === 4001) {
      throw new Error(t("errors.wallet.switchRejected"));
    } else {
      throw switchError;
    }
  }

  try {
    const browserProvider = new ethers.BrowserProvider(provider);
    const network = await browserProvider.getNetwork();
    const hexChainId =
      typeof network.chainId === "bigint"
        ? "0x" + network.chainId.toString(16)
        : "0x" + Number(network.chainId).toString(16);
    const accounts = await provider.request({ method: "eth_accounts" });
    if (accounts && accounts.length > 0) {
      accounts[0];
    }
  } catch {}
}
