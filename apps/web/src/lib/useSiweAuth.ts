"use client";
import { ethers } from "ethers";
import { t } from "./i18n";

type Params = {
  providerRef: React.RefObject<any>;
  account: string | null;
  chainIdHex?: string | null;
};

export function useSiweAuth(params: Params) {
  const siweLogin = async (): Promise<{ success: boolean; address?: string; error?: string }> => {
    try {
      const rawProvider =
        params.providerRef.current ||
        (typeof window !== "undefined"
          ? (window as any).ethereum || (window as any).BinanceChain
          : null);
      if (!rawProvider) {
        return { success: false, error: t("wallet.noWallet") };
      }

      const browserProvider = new ethers.BrowserProvider(rawProvider);
      const signer = await browserProvider.getSigner();
      const signerAddress = await signer.getAddress().catch(() => null);
      const net = await browserProvider.getNetwork();
      const address = signerAddress || params.account;
      if (!address) return { success: false, error: t("auth.connectWallet") };

      const nonceRes = await fetch("/api/siwe/nonce", { method: "GET" });
      const nonceJson = await nonceRes.json();
      const nonce: string = nonceJson?.nonce;
      if (!nonce) return { success: false, error: t("errors.somethingWrong") };

      const { SiweMessage } = await import("siwe");
      const chainIdNum = Number(net?.chainId?.toString?.() || params.chainIdHex || "1");
      const message = new SiweMessage({
        domain: typeof window !== "undefined" ? window.location.host : "localhost",
        address,
        statement: t("auth.siweStatement"),
        uri: typeof window !== "undefined" ? window.location.origin : "http://localhost",
        version: "1",
        chainId: Number.isFinite(chainIdNum) ? chainIdNum : 1,
        nonce,
      });
      const prepared = message.prepareMessage();

      let signature: string;
      try {
        signature = await signer.signMessage(prepared);
      } catch {
        if (typeof (rawProvider as any)?.request === "function") {
          try {
            signature = await (rawProvider as any).request({
              method: "personal_sign",
              params: [prepared, address],
            });
          } catch {
            signature = await (rawProvider as any).request({
              method: "personal_sign",
              params: [address, prepared],
            });
          }
        } else {
          return { success: false, error: t("errors.somethingWrong") };
        }
      }

      const verifyRes = await fetch("/api/siwe/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: prepared,
          signature,
          domain: typeof window !== "undefined" ? window.location.host : undefined,
          uri: typeof window !== "undefined" ? window.location.origin : undefined,
        }),
      });
      const verifyJson = await verifyRes.json();
      if (!verifyRes.ok || !verifyJson?.success) {
        return {
          success: false,
          error: verifyJson?.message || t("errors.somethingWrong"),
        };
      }

      return { success: true, address };
    } catch (err: any) {
      return { success: false, error: t("errors.somethingWrong") };
    }
  };

  return { siweLogin };
}
