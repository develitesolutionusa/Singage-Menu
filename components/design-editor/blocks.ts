import type { LucideIcon } from "lucide-react";
import {
  BadgeDollarSign,
  Clock,
  Contact,
  Image as ImageIcon,
  LayoutTemplate,
  MapPin,
  Megaphone,
  QrCode,
  RectangleHorizontal,
  Share2,
  Shapes,
  SplitSquareHorizontal,
  Square,
  Type,
  Video,
  Database,
} from "lucide-react";

export type DesignBlockType =
  | "text"
  | "image"
  | "video"
  | "menu-card"
  | "button"
  | "shape"
  | "qr-code"
  | "logo"
  | "social-icons"
  | "divider"
  | "dynamic-data"
  | "price-badge"
  | "promotion-card"
  | "contact"
  | "hours"
  | "location";

export type DesignBlockDefinition = {
  type: DesignBlockType;
  label: string;
  description: string;
  icon: LucideIcon;
  category: "content" | "media" | "commerce" | "brand" | "data";
};

export const DESIGN_BLOCKS: DesignBlockDefinition[] = [
  {
    type: "text",
    label: "Text",
    description: "Headlines and body copy",
    icon: Type,
    category: "content",
  },
  {
    type: "image",
    label: "Image",
    description: "Photos and artwork",
    icon: ImageIcon,
    category: "media",
  },
  {
    type: "video",
    label: "Video",
    description: "Short looping clips",
    icon: Video,
    category: "media",
  },
  {
    type: "menu-card",
    label: "Menu Card",
    description: "Item name, description, price",
    icon: LayoutTemplate,
    category: "commerce",
  },
  {
    type: "button",
    label: "Button",
    description: "Call-to-action control",
    icon: RectangleHorizontal,
    category: "content",
  },
  {
    type: "shape",
    label: "Shape",
    description: "Rectangles, circles, accents",
    icon: Shapes,
    category: "brand",
  },
  {
    type: "qr-code",
    label: "QR Code",
    description: "Scan-to-link codes",
    icon: QrCode,
    category: "brand",
  },
  {
    type: "logo",
    label: "Logo",
    description: "Brand mark placement",
    icon: Square,
    category: "brand",
  },
  {
    type: "social-icons",
    label: "Social Icons",
    description: "Network icon row",
    icon: Share2,
    category: "brand",
  },
  {
    type: "divider",
    label: "Divider",
    description: "Section separators",
    icon: SplitSquareHorizontal,
    category: "content",
  },
  {
    type: "dynamic-data",
    label: "Dynamic Data",
    description: "Bound live field values",
    icon: Database,
    category: "data",
  },
  {
    type: "price-badge",
    label: "Price Badge",
    description: "Highlighted price chip",
    icon: BadgeDollarSign,
    category: "commerce",
  },
  {
    type: "promotion-card",
    label: "Promotion Card",
    description: "Offer / promo block",
    icon: Megaphone,
    category: "commerce",
  },
  {
    type: "contact",
    label: "Contact",
    description: "Phone and email",
    icon: Contact,
    category: "content",
  },
  {
    type: "hours",
    label: "Hours",
    description: "Business hours block",
    icon: Clock,
    category: "content",
  },
  {
    type: "location",
    label: "Location",
    description: "Address and map cue",
    icon: MapPin,
    category: "content",
  },
];

export function getBlockDefinition(
  type: DesignBlockType,
): DesignBlockDefinition | undefined {
  return DESIGN_BLOCKS.find((block) => block.type === type);
}
