"use client";

import { useEffect, useState } from "react";

export function useCategoryCounts() {
  const [categoryCounts, setCategoryCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    const fetchCategoryCounts = async () => {
      try {
        const controller = new AbortController();
        const response = await fetch("/api/categories/counts", {
          signal: controller.signal,
        });
        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            const countsObj: Record<string, number> = {};
            data.data.forEach((item: { category: string; count: number }) => {
              countsObj[item.category] = item.count;
            });
            setCategoryCounts(countsObj);
          }
        }
      } catch (error) {
        if ((error as any)?.name !== "AbortError") {
          return;
        }
      }
    };

    fetchCategoryCounts();
  }, []);

  return categoryCounts;
}
