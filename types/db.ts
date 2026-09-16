export type Orientation = "landscape" | "portrait";
export type FileType = "image" | "video";
export type PlayerStatus = "unpaired" | "online" | "offline";
export type PlayerRotation = 0 | 90 | 180 | 270;

export type LibraryFolder = {
  id: string;
  clerk_org_id: string;
  name: string;
  parent_id: string | null;
  created_at: string;
  updated_at: string;
};

export type LibraryItem = {
  id: string;
  clerk_org_id: string;
  folder_id: string | null;
  name: string;
  mime_type: string;
  file_type: FileType;
  storage_path: string;
  public_url: string | null;
  size_bytes: number;
  duration_seconds: number | null;
  width: number | null;
  height: number | null;
  created_at: string;
  updated_at: string;
};

export type Loop = {
  id: string;
  clerk_org_id: string;
  name: string;
  orientation: Orientation;
  created_at: string;
  updated_at: string;
};

export type LoopItem = {
  id: string;
  clerk_org_id: string;
  loop_id: string;
  library_item_id: string;
  position: number;
  duration_seconds: number;
  created_at: string;
  library_item?: LibraryItem | null;
};

export type Player = {
  id: string;
  clerk_org_id: string | null;
  name: string;
  description: string | null;
  location: string | null;
  timezone: string;
  rotation: PlayerRotation;
  loop_id: string | null;
  pairing_code: string | null;
  status: PlayerStatus;
  last_seen_at: string | null;
  created_at: string;
  updated_at: string;
};

export type ActivityLog = {
  id: string;
  clerk_org_id: string;
  actor_id: string | null;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
};

export type Announcement = {
  id: string;
  clerk_org_id: string | null;
  title: string;
  body: string;
  published_at: string;
  created_at: string;
};

type Tables = {
  library_folders: {
    Row: LibraryFolder;
    Insert: {
      id?: string;
      clerk_org_id: string;
      name: string;
      parent_id?: string | null;
      created_at?: string;
      updated_at?: string;
    };
    Update: Partial<LibraryFolder>;
    Relationships: [];
  };
  library_items: {
    Row: LibraryItem;
    Insert: {
      id?: string;
      clerk_org_id: string;
      folder_id?: string | null;
      name: string;
      mime_type: string;
      file_type: FileType;
      storage_path: string;
      public_url?: string | null;
      size_bytes?: number;
      duration_seconds?: number | null;
      width?: number | null;
      height?: number | null;
      created_at?: string;
      updated_at?: string;
    };
    Update: Partial<LibraryItem>;
    Relationships: [];
  };
  loops: {
    Row: Loop;
    Insert: {
      id?: string;
      clerk_org_id: string;
      name: string;
      orientation?: Orientation;
      created_at?: string;
      updated_at?: string;
    };
    Update: Partial<Loop>;
    Relationships: [];
  };
  loop_items: {
    Row: {
      id: string;
      clerk_org_id: string;
      loop_id: string;
      library_item_id: string;
      position: number;
      duration_seconds: number;
      created_at: string;
    };
    Insert: {
      id?: string;
      clerk_org_id: string;
      loop_id: string;
      library_item_id: string;
      position?: number;
      duration_seconds?: number;
      created_at?: string;
    };
    Update: Partial<{
      id: string;
      clerk_org_id: string;
      loop_id: string;
      library_item_id: string;
      position: number;
      duration_seconds: number;
      created_at: string;
    }>;
    Relationships: [];
  };
  players: {
    Row: Player;
    Insert: {
      id?: string;
      clerk_org_id?: string | null;
      name?: string;
      description?: string | null;
      location?: string | null;
      timezone?: string;
      rotation?: PlayerRotation;
      loop_id?: string | null;
      pairing_code?: string | null;
      status?: PlayerStatus;
      last_seen_at?: string | null;
      created_at?: string;
      updated_at?: string;
    };
    Update: Partial<Player>;
    Relationships: [];
  };
  activity_logs: {
    Row: ActivityLog;
    Insert: {
      id?: string;
      clerk_org_id: string;
      actor_id?: string | null;
      action: string;
      entity_type?: string | null;
      entity_id?: string | null;
      metadata?: Record<string, unknown>;
      created_at?: string;
    };
    Update: Partial<ActivityLog>;
    Relationships: [];
  };
  announcements: {
    Row: Announcement;
    Insert: {
      id?: string;
      clerk_org_id?: string | null;
      title: string;
      body: string;
      published_at?: string;
      created_at?: string;
    };
    Update: Partial<Announcement>;
    Relationships: [];
  };
};

export type Database = {
  public: {
    Tables: Tables;
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
