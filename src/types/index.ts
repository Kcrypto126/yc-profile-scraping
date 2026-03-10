export type AuthContextProps = {
  isLoading: boolean;
  isAuthenticated: boolean;
  user: { id?: string; email: string; name?: string | null; role: "admin" | "user" } | null;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
};

export type ProfileModel = {
  _id?: string;
  userId: string;
  name: string;
  location: string;
  age: number | null;
  lastSeen: string;
  videoUrl?: string;
  avatar?: string;
  sumary: string;
  intro: string;
  lifeStory: string;
  freeTime: string;
  other: string;
  accomplishments: string;
  education: string[] | null;
  employment: string[] | null;
  startup?: {
    name?: string;
    description?: string;
    progress?: string;
    funding?: string;
  };
  cofounderPreferences: {
    requirements: string[];
    idealPersonality: string;
    equity: string;
  };
  interests: {
    shared: string[] | null;
    personal: string[] | null;
  };
  linkedIn?: string;
  /** true = technical, false = non-technical, null = unknown */
  technical?: boolean | null;
  idea?: "committed" | "potential" | "other" | null;
  updatedAt?: string | null;
  sentByAccount?: string | null;
  sentAt?: Date | null;
  sentWithTemplate?: string | null;
  visitedAt?: Date | null;
  visited?: boolean;
  /** Single status: "visited" | "new" | "sent" */
  badge?: "visited" | "new" | "sent";
  createdAt?: Date | string | null;
};

export type FilterModel = {
  name?: string;
  age?: number;
  location?: string;
  sumary?: string;
  startupName?: string;
  funding?: string;
  filterSent?: boolean;
  filterVisited?: boolean;
  filterNew?: boolean;
  filterTechnical?: boolean;
  filterNonTechnical?: boolean;
};
