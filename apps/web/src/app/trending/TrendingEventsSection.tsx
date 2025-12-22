import React from "react";
import { CheckCircle, TrendingUp } from "lucide-react";
import EmptyState from "@/components/EmptyState";
import FilterSort, { type FilterSortState } from "@/components/FilterSort";
import type { TrendingEvent } from "./trendingModel";
import { TrendingEventCard } from "./TrendingEventCard";

type TrendingEventsSectionProps = {
  loading: boolean;
  error: unknown;
  filters: FilterSortState;
  onFilterChange: (state: FilterSortState) => void;
  followError: string | null;
  sortedEvents: TrendingEvent[];
  visibleEvents: TrendingEvent[];
  followedEvents: Set<number>;
  isAdmin: boolean;
  deleteBusyId: number | null;
  hasMore: boolean;
  loadingMore: boolean;
  observerTargetRef: React.Ref<HTMLDivElement>;
  toggleFollow: (predictionId: number, event: React.MouseEvent) => void | Promise<void>;
  createCategoryParticlesAtCardClick: (event: React.MouseEvent, category?: string) => void;
  openEdit: (p: any) => void;
  deleteEvent: (id: number) => void;
  onCreatePrediction: () => void;
  tTrending: (key: string) => string;
  tTrendingAdmin: (key: string) => string;
  tEvents: (key: string) => string;
};

type TrendingEventsLoadingProps = {
  message: string;
};

function TrendingEventsLoading({ message }: TrendingEventsLoadingProps) {
  return (
    <div className="text-center py-12">
      <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600" />
      <p className="mt-4 text-gray-600">{message}</p>
    </div>
  );
}

type TrendingEventsErrorProps = {
  error: unknown;
  title: string;
  reloadLabel: string;
};

function TrendingEventsError({ error, title, reloadLabel }: TrendingEventsErrorProps) {
  return (
    <div className="text-center py-12">
      <div className="text-red-500 text-lg mb-2">{title}</div>
      <p className="text-gray-600">{(error as any)?.message || String(error)}</p>
      <button
        onClick={() => window.location.reload()}
        className="mt-4 px-4 py-2 bg-purple-600 text-white rounded-full hover:bg-purple-700 transition-colors"
      >
        {reloadLabel}
      </button>
    </div>
  );
}

type TrendingEventsEmptyProps = {
  title: string;
  description: string;
  actionLabel: string;
  onCreatePrediction: () => void;
};

function TrendingEventsEmpty({
  title,
  description,
  actionLabel,
  onCreatePrediction,
}: TrendingEventsEmptyProps) {
  return (
    <EmptyState
      icon={TrendingUp}
      title={title}
      description={description}
      action={{
        label: actionLabel,
        onClick: onCreatePrediction,
      }}
    />
  );
}

type TrendingEventsGridProps = {
  visibleEvents: TrendingEvent[];
  followedEvents: Set<number>;
  isAdmin: boolean;
  deleteBusyId: number | null;
  createCategoryParticlesAtCardClick: (event: React.MouseEvent, category?: string) => void;
  toggleFollow: (predictionId: number, event: React.MouseEvent) => void | Promise<void>;
  openEdit: (p: any) => void;
  deleteEvent: (id: number) => void;
  tTrending: (key: string) => string;
  tTrendingAdmin: (key: string) => string;
  tEvents: (key: string) => string;
};

function TrendingEventsGrid({
  visibleEvents,
  followedEvents,
  isAdmin,
  deleteBusyId,
  createCategoryParticlesAtCardClick,
  toggleFollow,
  openEdit,
  deleteEvent,
  tTrending,
  tTrendingAdmin,
  tEvents,
}: TrendingEventsGridProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {visibleEvents.map((product) => {
        const eventId = Number(product.id);
        const isValidId = Number.isFinite(eventId);
        const isFollowed = isValidId && followedEvents.has(eventId);

        return (
          <TrendingEventCard
            key={isValidId ? eventId : product.title}
            product={product}
            eventId={isValidId ? eventId : null}
            isFollowed={isFollowed}
            isAdmin={isAdmin}
            deleteBusyId={deleteBusyId}
            onCardClick={(e, category) => {
              createCategoryParticlesAtCardClick(e, category);
            }}
            onToggleFollow={(e, id) => {
              toggleFollow(id, e);
            }}
            onEdit={(_, p) => {
              openEdit(p);
            }}
            onDelete={(_, id) => {
              deleteEvent(id);
            }}
            tTrending={tTrending}
            tTrendingAdmin={tTrendingAdmin}
            tEvents={tEvents}
          />
        );
      })}
    </div>
  );
}

type TrendingEventsLoadMoreSentinelProps = {
  hasMore: boolean;
  loadingMore: boolean;
  observerTargetRef: React.Ref<HTMLDivElement>;
  loadMoreLabel: string;
  scrollHintLabel: string;
};

function TrendingEventsLoadMoreSentinel({
  hasMore,
  loadingMore,
  observerTargetRef,
  loadMoreLabel,
  scrollHintLabel,
}: TrendingEventsLoadMoreSentinelProps) {
  if (!hasMore) return null;

  return (
    <div ref={observerTargetRef} className="flex justify-center py-8">
      {loadingMore ? (
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 border-3 border-purple-600 border-t-transparent rounded-full animate-spin" />
          <span className="text-gray-600 text-sm font-medium">{loadMoreLabel}</span>
        </div>
      ) : (
        <div className="text-gray-400 text-sm">{scrollHintLabel}</div>
      )}
    </div>
  );
}

type TrendingEventsAllLoadedNoticeProps = {
  totalCount: number;
  prefixLabel: string;
  suffixLabel: string;
};

function TrendingEventsAllLoadedNotice({
  totalCount,
  prefixLabel,
  suffixLabel,
}: TrendingEventsAllLoadedNoticeProps) {
  if (totalCount <= 0) return null;

  return (
    <div className="text-center py-8">
      <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gray-100 text-gray-600 text-sm">
        <CheckCircle className="w-4 h-4" />
        <span>
          {prefixLabel}
          {totalCount}
          {suffixLabel}
        </span>
      </div>
    </div>
  );
}

export function TrendingEventsSection({
  loading,
  error,
  filters,
  onFilterChange,
  followError,
  sortedEvents,
  visibleEvents,
  followedEvents,
  isAdmin,
  deleteBusyId,
  hasMore,
  loadingMore,
  observerTargetRef,
  toggleFollow,
  createCategoryParticlesAtCardClick,
  openEdit,
  deleteEvent,
  onCreatePrediction,
  tTrending,
  tTrendingAdmin,
  tEvents,
}: TrendingEventsSectionProps) {
  return (
    <>
      {!loading && !error && (
        <div className="mb-8">
          <FilterSort onFilterChange={onFilterChange} initialFilters={filters} showStatus />
        </div>
      )}

      {loading && <TrendingEventsLoading message={tTrending("state.loading")} />}

      {error && (
        <TrendingEventsError
          error={error}
          title={tTrending("state.errorTitle")}
          reloadLabel={tTrending("state.reload")}
        />
      )}

      {!loading && !error && (
        <>
          {followError && (
            <div className="mb-4 px-4 py-2 bg-red-100 text-red-700 rounded">{followError}</div>
          )}
          {sortedEvents.length === 0 ? (
            <TrendingEventsEmpty
              title={tTrending("empty.title")}
              description={tTrending("empty.description")}
              actionLabel={tTrending("actions.createPrediction")}
              onCreatePrediction={onCreatePrediction}
            />
          ) : (
            <>
              <TrendingEventsGrid
                visibleEvents={visibleEvents}
                followedEvents={followedEvents}
                isAdmin={isAdmin}
                deleteBusyId={deleteBusyId}
                createCategoryParticlesAtCardClick={createCategoryParticlesAtCardClick}
                toggleFollow={toggleFollow}
                openEdit={openEdit}
                deleteEvent={deleteEvent}
                tTrending={tTrending}
                tTrendingAdmin={tTrendingAdmin}
                tEvents={tEvents}
              />

              <TrendingEventsLoadMoreSentinel
                hasMore={hasMore}
                loadingMore={loadingMore}
                observerTargetRef={observerTargetRef}
                loadMoreLabel={tTrending("state.loadMore")}
                scrollHintLabel={tTrending("state.scrollHint")}
              />

              {!hasMore && sortedEvents.length > 0 && (
                <TrendingEventsAllLoadedNotice
                  totalCount={sortedEvents.length}
                  prefixLabel={tTrending("state.allLoadedPrefix")}
                  suffixLabel={tTrending("state.allLoadedSuffix")}
                />
              )}
            </>
          )}
        </>
      )}
    </>
  );
}
