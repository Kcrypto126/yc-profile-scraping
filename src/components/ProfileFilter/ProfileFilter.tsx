import { FilterModel } from "@/types";

const ProfileFilter = ({
  filter,
  handleChange,
  onBadgeFilterChange,
  onTechnicalFilterChange,
}: {
  filter: FilterModel;
  handleChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onBadgeFilterChange?: (key: "filterSent" | "filterVisited" | "filterNew", checked: boolean) => void;
  onTechnicalFilterChange?: (key: "filterTechnical" | "filterNonTechnical", checked: boolean) => void;
}) => {
  return (
    <div className="bg-white dark:bg-gray-900 p-6 rounded-lg shadow-sm">
      {/* Badge filters: Sent / Visited / New – applied to all pages */}
      <div className="flex flex-wrap items-center gap-4 mb-4 pb-4 border-b border-gray-200 dark:border-gray-700">
        <span className="text-sm font-semibold text-gray-500 dark:text-gray-400">Show:</span>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={!!filter?.filterSent}
            onChange={(e) => onBadgeFilterChange?.("filterSent", e.target.checked)}
            className="w-4 h-4 rounded border-gray-300 text-green-600 focus:ring-green-500"
          />
          <span className="px-2 py-0.5 rounded text-sm font-medium bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-200">
            Sent
          </span>
          <span className="text-xs text-gray-500">only</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={!!filter?.filterVisited}
            onChange={(e) => onBadgeFilterChange?.("filterVisited", e.target.checked)}
            className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <span className="px-2 py-0.5 rounded text-sm font-medium bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-200">
            Visited
          </span>
          <span className="text-xs text-gray-500">only</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={!!filter?.filterNew}
            onChange={(e) => onBadgeFilterChange?.("filterNew", e.target.checked)}
            className="w-4 h-4 rounded border-gray-300 text-amber-600 focus:ring-amber-500"
          />
          <span className="px-2 py-0.5 rounded text-sm font-medium bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-200">
            New
          </span>
          <span className="text-xs text-gray-500">only (last 7 days)</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={!!filter?.filterTechnical}
            onChange={(e) => onTechnicalFilterChange?.("filterTechnical", e.target.checked)}
            className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
          />
          <span className="px-2 py-0.5 rounded text-sm font-medium bg-indigo-100 dark:bg-indigo-900/40 text-indigo-800 dark:text-indigo-200">
            Technical
          </span>
          <span className="text-xs text-gray-500">only</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={!!filter?.filterNonTechnical}
            onChange={(e) => onTechnicalFilterChange?.("filterNonTechnical", e.target.checked)}
            className="w-4 h-4 rounded border-gray-300 text-slate-600 focus:ring-slate-500"
          />
          <span className="px-2 py-0.5 rounded text-sm font-medium bg-slate-100 dark:bg-slate-700/40 text-slate-800 dark:text-slate-200">
            Non-technical
          </span>
          <span className="text-xs text-gray-500">only</span>
        </label>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="flex flex-row items-center gap-2">
          <label
            htmlFor="name"
            className="block text-sm font-semibold text-nowrap text-gray-500"
          >
            User Name:
          </label>
          <input
            type="text"
            name="name"
            id="name"
            value={filter?.name}
            onChange={handleChange}
            className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 sm:text-sm"
            placeholder="Enter name"
          />
        </div>
        <div className="flex flex-row items-center gap-2">
          <label
            htmlFor="age"
            className="block text-sm font-semibold text-nowrap text-gray-500"
          >
            Age(over):
          </label>
          <input
            type="number"
            name="age"
            id="age"
            value={filter?.age}
            onChange={handleChange}
            className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 sm:text-sm"
            placeholder="Enter Age"
          />
        </div>
        <div className="flex flex-row items-center gap-2">
          <label
            htmlFor="location"
            className="block text-sm font-semibold text-nowrap text-gray-500"
          >
            Location:
          </label>
          <input
            type="text"
            name="location"
            id="location"
            value={filter?.location}
            onChange={handleChange}
            className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 sm:text-sm"
            placeholder="Enter location"
          />
        </div>
        <div className="flex flex-row items-center gap-2">
          <label
            htmlFor="startup"
            className="block text-sm font-semibold text-nowrap text-gray-500"
          >
            Funding Status:
          </label>
          <input
            type="text"
            name="funding"
            id="funding"
            value={filter?.funding}
            onChange={handleChange}
            className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 sm:text-sm"
            placeholder="Enter funding"
          />
        </div>
      </div>
    </div>
  );
};

export default ProfileFilter;
