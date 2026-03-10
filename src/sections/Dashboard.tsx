"use client";
import React, { useCallback, useEffect } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { ProfileModel, FilterModel } from "@/types";
import ProfileOverview from "@/sections/ProfileOverview";
import ProfileFilter from "@/components/ProfileFilter/ProfileFilter";
import ProfileTable from "@/components/ProfileTable/ProfileTable";
import ProfileFooter from "@/components/ProfileFooter/ProfileFooter";

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 100;

const Dashboard = () => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const pageFromUrl = Math.max(1, parseInt(searchParams.get("page") ?? String(DEFAULT_PAGE), 10) || DEFAULT_PAGE);
  const limitFromUrl = [10, 20, 50, 100].includes(Number(searchParams.get("limit")))
    ? Number(searchParams.get("limit"))
    : DEFAULT_LIMIT;

  const [total, setTotal] = React.useState(0);
  const [matched, setMatched] = React.useState(0);
  const [curPage, setCurPage] = React.useState(pageFromUrl);
  const [limit, setLimit] = React.useState(limitFromUrl);
  const [profile, setProfile] = React.useState<ProfileModel | null>(null);
  const [overview, setOverview] = React.useState<boolean>(false);
  const [loading, setLoading] = React.useState(false);
  const [profiles, setProfiles] = React.useState<ProfileModel[]>([]);
  const [filter, setFilter] = React.useState<FilterModel>({
    name: searchParams.get("name") ?? "",
    age: Number(searchParams.get("age")) || 0,
    location: searchParams.get("location") ?? "",
    funding: searchParams.get("funding") ?? "",
    filterSent: searchParams.get("filterSent") === "1" || searchParams.get("filterSent") === "true",
    filterVisited: searchParams.get("filterVisited") === "1" || searchParams.get("filterVisited") === "true",
    filterNew: searchParams.get("filterNew") === "1" || searchParams.get("filterNew") === "true",
    filterTechnical: searchParams.get("filterTechnical") === "1" || searchParams.get("filterTechnical") === "true",
    filterNonTechnical: searchParams.get("filterNonTechnical") === "1" || searchParams.get("filterNonTechnical") === "true",
  });

  // Sync state from URL when URL changes (e.g. browser back/forward) – keeps badge filters applied on all pages
  useEffect(() => {
    setCurPage(pageFromUrl);
    setLimit(limitFromUrl);
    setFilter((prev) => ({
      ...prev,
      name: searchParams.get("name") ?? prev.name,
      age: Number(searchParams.get("age")) || prev.age,
      location: searchParams.get("location") ?? prev.location,
      funding: searchParams.get("funding") ?? prev.funding,
      filterSent: searchParams.get("filterSent") === "1" || searchParams.get("filterSent") === "true",
      filterVisited: searchParams.get("filterVisited") === "1" || searchParams.get("filterVisited") === "true",
      filterNew: searchParams.get("filterNew") === "1" || searchParams.get("filterNew") === "true",
      filterTechnical: searchParams.get("filterTechnical") === "1" || searchParams.get("filterTechnical") === "true",
      filterNonTechnical: searchParams.get("filterNonTechnical") === "1" || searchParams.get("filterNonTechnical") === "true",
    }));
  }, [pageFromUrl, limitFromUrl, searchParams]);

  const updateUrl = useCallback(
    (updates: {
      page?: number | null;
      limit?: number;
      name?: string;
      age?: number;
      location?: string;
      funding?: string;
      filterSent?: boolean;
      filterVisited?: boolean;
      filterNew?: boolean;
      filterTechnical?: boolean;
      filterNonTechnical?: boolean;
    }) => {
      const params = new URLSearchParams(searchParams.toString());
      if (updates.page !== undefined) (updates.page === null ? params.delete("page") : params.set("page", String(updates.page)));
      if (updates.limit !== undefined) params.set("limit", String(updates.limit));
      if (updates.name !== undefined) (updates.name ? params.set("name", updates.name) : params.delete("name"));
      if (updates.age !== undefined) (updates.age ? params.set("age", String(updates.age)) : params.delete("age"));
      if (updates.location !== undefined) (updates.location ? params.set("location", updates.location) : params.delete("location"));
      if (updates.funding !== undefined) (updates.funding ? params.set("funding", updates.funding) : params.delete("funding"));
      if (updates.filterSent !== undefined) (updates.filterSent ? params.set("filterSent", "1") : params.delete("filterSent"));
      if (updates.filterVisited !== undefined) (updates.filterVisited ? params.set("filterVisited", "1") : params.delete("filterVisited"));
      if (updates.filterNew !== undefined) (updates.filterNew ? params.set("filterNew", "1") : params.delete("filterNew"));
      if (updates.filterTechnical !== undefined) (updates.filterTechnical ? params.set("filterTechnical", "1") : params.delete("filterTechnical"));
      if (updates.filterNonTechnical !== undefined) (updates.filterNonTechnical ? params.set("filterNonTechnical", "1") : params.delete("filterNonTechnical"));
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams]
  );

  const hasBadgeFilter = !!(filter?.filterSent || filter?.filterVisited || filter?.filterNew || filter?.filterTechnical || filter?.filterNonTechnical);

  const fetchProfiles = useCallback(async () => {
    setLoading(true);
    try {
      const filterParams = filter
        ? Object.entries(filter).reduce(
            (acc: Record<string, string>, [key, value]) => {
              if (key === "filterSent" || key === "filterVisited" || key === "filterNew" || key === "filterTechnical" || key === "filterNonTechnical") {
                if (value) acc[key] = "1";
                return acc;
              }
              if (value) {
                acc[key] = value.toString();
              }
              return acc;
            },
            {}
          )
        : {};

      const queryParams = new URLSearchParams({
        ...filterParams,
      }).toString();

      const response = await fetch(
        `/api/profiles?page=${curPage}&limit=${limit}&${queryParams}`,
        {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        }
      );
      const data = await response.json();
      setProfiles(data.data);
      setTotal(data.total);
      setMatched(data.matched);
    } catch (error) {
      console.error("Error fetching profiles:", error);
    } finally {
      setLoading(false);
    }
  }, [curPage, limit, filter]);

  useEffect(() => {
    fetchProfiles();
  }, [fetchProfiles]);

  const handlePageChange = useCallback(
    (page: number) => {
      setCurPage(page);
      updateUrl({ page: hasBadgeFilter && page === 1 ? null : page });
    },
    [updateUrl, hasBadgeFilter]
  );

  const handleLimitChange = useCallback(
    (newLimit: number) => {
      setLimit(newLimit);
      setCurPage(1);
      updateUrl({ limit: newLimit, page: hasBadgeFilter ? null : 1 });
    },
    [updateUrl, hasBadgeFilter]
  );

  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.name as keyof FilterModel;
    const value = e.target.name === "age" ? Number(e.target.value) || 0 : e.target.value;
    const nextFilter = { ...filter, [name]: value };
    setFilter(nextFilter);
    setCurPage(1);
    updateUrl({
      page: 1,
      name: nextFilter.name || undefined,
      age: nextFilter.age ?? undefined,
      location: nextFilter.location || undefined,
      funding: nextFilter.funding || undefined,
    });
  };

  const handleBadgeFilterChange = (key: "filterSent" | "filterVisited" | "filterNew", checked: boolean) => {
    const nextFilter = { ...filter, [key]: checked };
    setFilter(nextFilter);
    updateUrl({ [key]: checked, ...(checked ? { page: null } : {}) });
  };

  const handleTechnicalFilterChange = (key: "filterTechnical" | "filterNonTechnical", checked: boolean) => {
    const nextFilter = { ...filter, [key]: checked };
    setFilter(nextFilter);
    updateUrl({ [key]: checked, ...(checked ? { page: null } : {}) });
  };

  const handleUpdate = (profile: ProfileModel) => {
    setProfiles(
      profiles.map((p) => (p.userId === profile.userId ? profile : p))
    );
    setProfile(profile);
  };

  const handleOverview = (profile: ProfileModel) => {
    setProfile(profile);
    setOverview(true);
  };

  const handleOverviewClose = () => {
    setOverview(false);
  };

  return (
    <>
      <div className="relative p-5 flex flex-1 flex-col gap-6 overflow-auto">
        <ProfileOverview
          profile={profile}
          show={overview}
          handleUpdate={handleUpdate}
          handleClose={handleOverviewClose}
          onMessageSent={fetchProfiles}
          onProfileVisited={fetchProfiles}
        />
        <ProfileFilter
          filter={filter}
          handleChange={handleFilterChange}
          onBadgeFilterChange={handleBadgeFilterChange}
          onTechnicalFilterChange={handleTechnicalFilterChange}
        />
        <ProfileTable
          loading={loading}
          profiles={profiles}
          handleOverview={handleOverview}
        />
        <ProfileFooter
          total={total}
          matched={matched}
          curPage={curPage}
          limit={limit}
          setCurPage={handlePageChange}
          setLimit={handleLimitChange}
          showAllMode={hasBadgeFilter && matched <= limit}
        />
      </div>
    </>
  );
};

export default Dashboard;
