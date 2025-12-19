import { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Foresight - 去中心化预测市场",
    short_name: "Foresight",
    description: "基于区块链的去中心化预测市场平台，参与各种事件预测，赢取收益",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#6b21a8",
    orientation: "portrait-primary",
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    categories: ["finance", "blockchain", "web3"],
  };
}
