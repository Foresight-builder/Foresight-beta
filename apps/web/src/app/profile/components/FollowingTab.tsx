"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Heart, Users, Target } from "lucide-react";
import EmptyState from "@/components/EmptyState";
import { useTranslations, formatTranslation, useLocale } from "@/lib/i18n";
import { formatDate } from "@/lib/format";
import { UserHoverCard } from "@/components/ui/UserHoverCard";
import { useFollowingUsers, useFollowingEvents } from "@/hooks/useQueries";
import { formatAddress, normalizeAddress } from "@/lib/address";
import type { FollowingItem } from "@/app/api/following/_lib/types";

type TabType = "events" | "users";

const EVENTS_PAGE_SIZE = 6;
const USERS_PAGE_SIZE = 9;

export function FollowingTab({ address }: { address: string | null }) {
  const [activeTab, setActiveTab] = useState<TabType>("events");
  const [visibleEventsCount, setVisibleEventsCount] = useState(EVENTS_PAGE_SIZE);
  const tEvents = useTranslations();
  const tProfile = useTranslations("profile");
  const tCommon = useTranslations("common");
  const { locale } = useLocale();

  const normalizedAddress = useMemo(() => (address ? normalizeAddress(address) : null), [address]);

  useEffect(() => {
    setVisibleEventsCount(EVENTS_PAGE_SIZE);
  }, [normalizedAddress]);

  const eventsQuery = useFollowingEvents(normalizedAddress);
  const usersQuery = useFollowingUsers(normalizedAddress, USERS_PAGE_SIZE);

  const loading = activeTab === "events" ? eventsQuery.isLoading : usersQuery.isLoading;

  const renderTabs = () => (
    <div className="flex gap-2 mb-8 bg-gray-50 p-1.5 rounded-2xl w-fit">
      <button
        type="button"
        onClick={() => setActiveTab("events")}
        className={`px-6 py-2.5 rounded-xl text-sm font-black transition-all flex items-center gap-2 ${
          activeTab === "events"
            ? "bg-white text-purple-600 shadow-sm"
            : "text-gray-500 hover:text-gray-700"
        }`}
      >
        <Target className="w-4 h-4" />
        {tProfile("following.tabEvents")}
      </button>
      <button
        type="button"
        onClick={() => setActiveTab("users")}
        className={`px-6 py-2.5 rounded-xl text-sm font-black transition-all flex items-center gap-2 ${
          activeTab === "users"
            ? "bg-white text-purple-600 shadow-sm"
            : "text-gray-500 hover:text-gray-700"
        }`}
      >
        <Users className="w-4 h-4" />
        {tProfile("following.tabUsers")}
      </button>
    </div>
  );

  if (!normalizedAddress) {
    return (
      <div>
        {renderTabs()}
        <EmptyState
          icon={activeTab === "events" ? Target : Users}
          title={tProfile("following.empty.title")}
          description={tProfile("following.empty.description")}
        />
      </div>
    );
  }

  if (loading) {
    return (
      <div>
        {renderTabs()}
        {activeTab === "events" ? <FollowingEventsSkeleton /> : <FollowingUsersSkeleton />}
      </div>
    );
  }

  const activeQuery = activeTab === "events" ? eventsQuery : usersQuery;
  if (activeQuery.isError) {
    return (
      <div>
        {renderTabs()}
        <div className="bg-white rounded-[2rem] p-6 border border-gray-100 shadow-sm">
          <div className="text-sm font-bold text-gray-700">{tCommon("loadFailed")}</div>
          <button
            type="button"
            onClick={() => activeQuery.refetch()}
            className="mt-4 inline-flex items-center justify-center px-4 py-2 rounded-xl font-bold text-sm bg-gray-100 hover:bg-gray-200 text-gray-700"
          >
            {tCommon("retry")}
          </button>
        </div>
      </div>
    );
  }

  const events: FollowingItem[] = eventsQuery.data ?? [];
  const users = usersQuery.data ?? [];
  const currentData = activeTab === "events" ? events : users;

  if (currentData.length === 0) {
    return (
      <div>
        {renderTabs()}
        <EmptyState
          icon={activeTab === "events" ? Target : Users}
          title={tProfile("following.empty.title")}
          description={tProfile("following.empty.description")}
        />
      </div>
    );
  }

  const visibleEvents = events.slice(0, visibleEventsCount);

  return (
    <div>
      {renderTabs()}

      {activeTab === "events" ? (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {visibleEvents.map((item) => (
              <Link href={`/prediction/${item.id}`} key={item.id}>
                <div className="bg-white rounded-[2rem] p-5 border border-gray-100 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all cursor-pointer group h-full flex flex-col">
                  <div className="flex justify-between items-start mb-4">
                    <img
                      src={
                        item.image_url || `https://api.dicebear.com/7.x/shapes/svg?seed=${item.id}`
                      }
                      alt={item.title || tProfile("following.alt.cover")}
                      className="w-10 h-10 rounded-full bg-gray-100 object-cover"
                    />
                    <div className="p-2 rounded-full bg-red-50 text-red-500">
                      <Heart className="w-4 h-4 fill-current" />
                    </div>
                  </div>
                  <h4 className="font-bold text-gray-900 mb-2 line-clamp-2 group-hover:text-purple-600 transition-colors">
                    {tEvents(item.title)}
                  </h4>
                  <div className="mt-auto text-xs text-gray-500 flex items-center gap-2">
                    <span className="bg-gray-100 px-2 py-1 rounded-md">
                      {formatTranslation(tProfile("following.labels.followers"), {
                        count: item.followers_count,
                      })}
                    </span>
                    {item.deadline && (
                      <span>
                        {formatTranslation(tProfile("following.labels.deadline"), {
                          date: formatDate(item.deadline, locale),
                        })}
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
          {events.length > visibleEventsCount && (
            <div className="flex justify-center mt-6">
              <button
                type="button"
                onClick={() => setVisibleEventsCount((prev) => prev + EVENTS_PAGE_SIZE)}
                className="px-6 py-2.5 rounded-xl text-sm font-bold bg-gray-100 hover:bg-gray-200 text-gray-700"
              >
                {tCommon("more")}
              </button>
            </div>
          )}
        </>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {users.map((user) => (
              <UserHoverCard key={user.wallet_address} user={user}>
                <div className="bg-white rounded-[2rem] p-5 border border-gray-100 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all cursor-pointer group flex items-center gap-4">
                  <div className="relative">
                    <img
                      src={user.avatar}
                      alt={user.username}
                      className="w-12 h-12 rounded-2xl object-cover bg-gray-50"
                    />
                    <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-white rounded-full flex items-center justify-center border border-gray-100 shadow-sm">
                      <Heart className="w-2.5 h-2.5 text-red-500 fill-current" />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-black text-gray-900 truncate group-hover:text-purple-600 transition-colors">
                      {user.username}
                    </h4>
                    <p className="text-xs text-gray-400 font-bold">
                      {formatAddress(user.wallet_address)}
                    </p>
                  </div>
                </div>
              </UserHoverCard>
            ))}
          </div>
          {!!usersQuery.hasNextPage && (
            <div className="flex justify-center mt-6">
              <button
                type="button"
                onClick={() => usersQuery.fetchNextPage()}
                disabled={usersQuery.isFetchingNextPage}
                className="px-6 py-2.5 rounded-xl text-sm font-bold bg-gray-100 hover:bg-gray-200 text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {tCommon("more")}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function FollowingEventsSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {Array.from({ length: 4 }).map((_, index) => (
        <div
          key={index}
          className="bg-white rounded-[2rem] p-5 border border-gray-100 shadow-sm animate-pulse h-full flex flex-col"
        >
          <div className="flex justify-between items-start mb-4">
            <div className="w-10 h-10 rounded-full bg-gray-100" />
            <div className="w-8 h-8 rounded-full bg-red-50" />
          </div>
          <div className="space-y-2 mb-4">
            <div className="h-4 bg-gray-100 rounded-md w-3/4" />
            <div className="h-4 bg-gray-100 rounded-md w-1/2" />
          </div>
          <div className="mt-auto flex items-center gap-2 text-xs text-gray-500">
            <div className="h-6 bg-gray-100 rounded-md w-20" />
            <div className="h-4 bg-gray-100 rounded-md w-24" />
          </div>
        </div>
      ))}
    </div>
  );
}

function FollowingUsersSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: 6 }).map((_, index) => (
        <div
          key={index}
          className="bg-white rounded-[2rem] p-5 border border-gray-100 shadow-sm animate-pulse flex items-center gap-4"
        >
          <div className="relative">
            <div className="w-12 h-12 rounded-2xl bg-gray-100" />
            <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-gray-100 border border-gray-100" />
          </div>
          <div className="flex-1 min-w-0 space-y-2">
            <div className="h-4 bg-gray-100 rounded-md w-3/4" />
            <div className="h-3 bg-gray-100 rounded-md w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}
