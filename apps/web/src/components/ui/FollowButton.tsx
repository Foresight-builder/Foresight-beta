"use client";

import React from "react";
import { motion } from "framer-motion";
import { Heart } from "lucide-react";

type FollowButtonProps = {
  isFollowed: boolean;
  onClick: (event: React.MouseEvent<HTMLButtonElement>) => void;
  dataEventId?: number | string;
  className?: string;
};

export function FollowButton({ isFollowed, onClick, dataEventId, className }: FollowButtonProps) {
  return (
    <motion.button
      data-event-index={dataEventId}
      onClick={onClick}
      className={`p-2 bg-white/90 backdrop-blur-sm rounded-full shadow-md overflow-hidden ${className || ""}`}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.9 }}
      animate={isFollowed ? "liked" : "unliked"}
      variants={{
        liked: {
          backgroundColor: "rgba(239, 68, 68, 0.1)",
          transition: { duration: 0.3 },
        },
        unliked: {
          backgroundColor: "rgba(255, 255, 255, 0.9)",
          transition: { duration: 0.3 },
        },
      }}
    >
      <motion.div
        animate={isFollowed ? "liked" : "unliked"}
        variants={{
          liked: {
            scale: [1, 1.2, 1],
            transition: {
              duration: 0.6,
              ease: "easeInOut",
            },
          },
          unliked: {
            scale: 1,
            transition: { duration: 0.3 },
          },
        }}
      >
        <Heart
          className={`w-5 h-5 ${isFollowed ? "fill-red-500 text-red-500" : "text-gray-500"}`}
        />
      </motion.div>
    </motion.button>
  );
}
