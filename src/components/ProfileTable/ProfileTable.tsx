import Image from "next/image";
import { ProfileModel } from "@/types";

const formatDateTime = (value?: string | Date | null) => {
  if (!value) return "N/A";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "N/A";
  // MM/DD format
  return date.toLocaleDateString("en-US", {
    month: "2-digit",
    day: "2-digit",
  });
};

/** Badge from DB: "visited" | "new" | "sent". Display as Sent / Visited / New. */
function getProfileStatus(
  profile: ProfileModel,
): "Sent" | "Visited" | "New" | null {
  const b = profile.badge;
  if (b === "sent") return "Sent";
  if (b === "visited") return "Visited";
  if (b === "new") return "New";
  return "New";
}

const ProfileTable = ({
  loading,
  profiles,
  handleOverview,
}: {
  loading: boolean;
  profiles: ProfileModel[];
  handleOverview: (profile: ProfileModel) => void;
}) => {
  return (
    <div className="flex-1 overflow-hidden">
      <div className="h-full overflow-auto scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-100">
        <table className="min-w-full divide-y divide-gray-200 relative">
          <thead className="text-left bg-gray-50 dark:bg-gray-800 shadow-lg sticky top-0 z-10">
            <tr className="font-semibold text-gray-600 dark:text-gray-400 uppercase">
              <th className="p-4"></th>
              <th className="p-4">Name</th>
              <th className="p-4">Age</th>
              <th className="p-4">Location</th>
              <th className="p-4">Technical</th>
              <th className="p-4">Idea</th>
              <th className="p-4">Funding Status</th>
              <th className="p-4">Last Seen</th>
              <th className="p-4 text-right">Created At</th>
              <th className="p-4 text-right">Updated At</th>
              <th className="p-4">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {loading
              ? Array(12)
                  .fill(null)
                  .map((_, index) => (
                    <tr key={`loading-${index}`}>
                      <td colSpan={9} className="text-center p-4">
                        <div className="animate-pulse bg-gray-200 dark:bg-gray-700 h-4 rounded"></div>
                      </td>
                    </tr>
                  ))
              : profiles.map((profile, index) => {
                  const rawAvatar = profile.avatar || "";
                  const avatarSrc =
                    rawAvatar.startsWith("//")
                      ? `https:${rawAvatar}`
                      : rawAvatar || "/cutestar.png";

                  return (
                    <tr
                      key={profile.userId || index}
                      className="even:bg-gray-100 dark:even:bg-gray-800 hover:bg-gray-300 dark:hover:bg-gray-600 hover:cursor-pointer"
                      onClick={handleOverview.bind(null, profile)}
                    >
                      <td className="p-2">
                        <Image
                          src={avatarSrc}
                          alt="Profile"
                          width={70}
                          height={70}
                          className="rounded-full"
                        />
                      </td>
                    <td className="p-2 max-w-40 text-ellipsis overflow-hidden whitespace-nowrap">
                      <div className="overflow-hidden text-ellipsis whitespace-nowrap">
                        {profile.name || "N/A"}
                        {profile.sentByAccount && (
                          <div>
                            <span className="px-2 py-1 mr-2 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded text-sm">
                              {profile.sentByAccount}
                            </span>

                            {formatDateTime(profile.sentAt ?? null)}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="">{profile.age}</td>
                    <td className="p-2 max-w-48 text-ellipsis overflow-hidden whitespace-nowrap">
                      {profile.location || "N/A"}
                    </td>
                    <td className="p-2 text-center">
                      {profile.technical === true
                        ? "Yes"
                        : profile.technical === false
                          ? "No"
                          : "—"}
                    </td>
                    <td className="p-2 text-center">
                      {profile.idea === "committed"
                        ? "Committed"
                        : profile.idea === "potential"
                          ? "Potential"
                          : "Other"}
                    </td>
                    <td className="p-2 max-w-72 text-ellipsis overflow-hidden whitespace-nowrap">
                      {profile.startup?.funding || "N/A"}
                    </td>
                    <td className="p-2 whitespace-nowrap">
                      {profile.lastSeen ? profile.lastSeen : "N/A"}
                    </td>
                    <td className="p-2 max-w-36 whitespace-nowrap text-right">
                      {formatDateTime(profile.createdAt ?? null)}
                    </td>
                    <td className="p-2 max-w-36 whitespace-nowrap text-right">
                      {formatDateTime(profile.updatedAt ?? null)}
                    </td>
                    <td className="p-2 text-center">
                      {(() => {
                        const status = getProfileStatus(profile);
                        if (status === "Sent")
                          return (
                            <span className="inline-flex items-center px-2 py-1 rounded text-sm font-medium bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-200">
                              Sent
                            </span>
                          );
                        if (status === "Visited")
                          return (
                            <span className="inline-flex items-center px-2 py-1 rounded text-sm font-medium bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200">
                              Visited
                            </span>
                          );
                        if (status === "New")
                          return (
                            <span className="inline-flex items-center px-2 py-1 rounded text-sm font-medium bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-200">
                              New
                            </span>
                          );
                        return <span className="text-gray-400 text-xs">-</span>;
                      })()}
                    </td>
                  </tr>
                  );
                })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ProfileTable;
