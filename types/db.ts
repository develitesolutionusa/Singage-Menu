export type Orientation = "landscape" | "portrait";
export type FileType = "image" | "video";
export type PlayerStatus = "unpaired" | "online" | "offline";
export type PlayerRotation = 0 | 90 | 180 | 270;
export type LoopItemType = "media" | "design";

export type TemplateIndustry =
  | "Restaurant & Food"
  | "Retail"
  | "Healthcare"
  | "Education"
  | "Hospitality"
  | "Corporate"
  | "Real Estate"
  | "Fitness"
  | "Automotive"
  | "Custom";

export type DesignMenuItem = { name: string; price?: string };
export type DesignSection = { title: string; items?: DesignMenuItem[] };

export type DesignData = {
  layout?: string;
  theme?: {
    bg?: string;
    accent?: string;
    text?: string;
    muted?: string;
    panel?: string;
  };
  badge?: string;
  headline?: string;
  subheadline?: string;
  body?: string;
  price?: string;
  cta?: string;
  items?: DesignMenuItem[];
  sections?: DesignSection[];
  [key: string]: unknown;
};

export type Template = {
  id: string;
  clerk_org_id: string | null;
  name: string;
  industry: TemplateIndustry;
  category: string;
  tags: string[];
  orientation: Orientation;
  default_duration_seconds: number;
  design_data: DesignData;
  sort_order: number;
  is_published: boolean;
  created_at: string;
  updated_at: string;
};

export type TemplateFavorite = {
  id: string;
  clerk_org_id: string;
  clerk_user_id: string;
  template_id: string;
  created_at: string;
};

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
  library_item_id: string | null;
  item_type: LoopItemType;
  source_template_id: string | null;
  design_data: DesignData | null;
  slide_name: string | null;
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
  /** @deprecated Phase 1 shortcut — use campaign_id */
  loop_id: string | null;
  campaign_id: string | null;
  pairing_code: string | null;
  status: PlayerStatus;
  last_seen_at: string | null;
  created_at: string;
  updated_at: string;
};

export type Campaign = {
  id: string;
  clerk_org_id: string;
  name: string;
  created_at: string;
  updated_at: string;
};

export type CampaignLoop = {
  id: string;
  clerk_org_id: string;
  campaign_id: string;
  loop_id: string;
  position: number;
  created_at: string;
  loop?: Loop | null;
};

export type CampaignPlayer = {
  id: string;
  clerk_org_id: string;
  campaign_id: string;
  player_id: string;
  created_at: string;
  player?: Player | null;
};

export type CampaignException = {
  id: string;
  clerk_org_id: string;
  campaign_id: string;
  name: string;
  override_loop_id: string;
  start_date: string | null;
  end_date: string | null;
  days_of_week: number[] | null;
  enabled: boolean;
  created_at: string;
  updated_at: string;
  override_loop?: Loop | null;
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
      library_item_id: string | null;
      item_type: LoopItemType;
      source_template_id: string | null;
      design_data: DesignData | null;
      slide_name: string | null;
      position: number;
      duration_seconds: number;
      created_at: string;
    };
    Insert: {
      id?: string;
      clerk_org_id: string;
      loop_id: string;
      library_item_id?: string | null;
      item_type?: LoopItemType;
      source_template_id?: string | null;
      design_data?: DesignData | null;
      slide_name?: string | null;
      position?: number;
      duration_seconds?: number;
      created_at?: string;
    };
    Update: Partial<{
      id: string;
      clerk_org_id: string;
      loop_id: string;
      library_item_id: string | null;
      item_type: LoopItemType;
      source_template_id: string | null;
      design_data: DesignData | null;
      slide_name: string | null;
      position: number;
      duration_seconds: number;
      created_at: string;
    }>;
    Relationships: [];
  };
  templates: {
    Row: Template;
    Insert: {
      id?: string;
      clerk_org_id?: string | null;
      name: string;
      industry: TemplateIndustry;
      category: string;
      tags?: string[];
      orientation?: Orientation;
      default_duration_seconds?: number;
      design_data?: DesignData;
      sort_order?: number;
      is_published?: boolean;
      created_at?: string;
      updated_at?: string;
    };
    Update: Partial<Template>;
    Relationships: [];
  };
  template_favorites: {
    Row: TemplateFavorite;
    Insert: {
      id?: string;
      clerk_org_id: string;
      clerk_user_id: string;
      template_id: string;
      created_at?: string;
    };
    Update: Partial<TemplateFavorite>;
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
      campaign_id?: string | null;
      pairing_code?: string | null;
      status?: PlayerStatus;
      last_seen_at?: string | null;
      created_at?: string;
      updated_at?: string;
    };
    Update: Partial<Player>;
    Relationships: [];
  };
  campaigns: {
    Row: Campaign;
    Insert: {
      id?: string;
      clerk_org_id: string;
      name: string;
      created_at?: string;
      updated_at?: string;
    };
    Update: Partial<Campaign>;
    Relationships: [];
  };
  campaign_loops: {
    Row: {
      id: string;
      clerk_org_id: string;
      campaign_id: string;
      loop_id: string;
      position: number;
      created_at: string;
    };
    Insert: {
      id?: string;
      clerk_org_id: string;
      campaign_id: string;
      loop_id: string;
      position?: number;
      created_at?: string;
    };
    Update: Partial<{
      id: string;
      clerk_org_id: string;
      campaign_id: string;
      loop_id: string;
      position: number;
      created_at: string;
    }>;
    Relationships: [];
  };
  campaign_players: {
    Row: {
      id: string;
      clerk_org_id: string;
      campaign_id: string;
      player_id: string;
      created_at: string;
    };
    Insert: {
      id?: string;
      clerk_org_id: string;
      campaign_id: string;
      player_id: string;
      created_at?: string;
    };
    Update: Partial<{
      id: string;
      clerk_org_id: string;
      campaign_id: string;
      player_id: string;
      created_at: string;
    }>;
    Relationships: [];
  };
  campaign_exceptions: {
    Row: {
      id: string;
      clerk_org_id: string;
      campaign_id: string;
      name: string;
      override_loop_id: string;
      start_date: string | null;
      end_date: string | null;
      days_of_week: number[] | null;
      enabled: boolean;
      created_at: string;
      updated_at: string;
    };
    Insert: {
      id?: string;
      clerk_org_id: string;
      campaign_id: string;
      name?: string;
      override_loop_id: string;
      start_date?: string | null;
      end_date?: string | null;
      days_of_week?: number[] | null;
      enabled?: boolean;
      created_at?: string;
      updated_at?: string;
    };
    Update: Partial<{
      id: string;
      clerk_org_id: string;
      campaign_id: string;
      name: string;
      override_loop_id: string;
      start_date: string | null;
      end_date: string | null;
      days_of_week: number[] | null;
      enabled: boolean;
      created_at: string;
      updated_at: string;
    }>;
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
