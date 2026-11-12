import type { MenuBoardContent, TemplateTheme } from "@/lib/menu-board/types";

export const SEASONAL_THEME: TemplateTheme = {
  bg: "#0E4A4A",
  panel: "#FFFFFF",
  text: "#FFFFFF",
  muted: "rgba(255,255,255,0.82)",
  accent: "#F05A28",
  badge: "#E23B2E",
  panelText: "#14213D",
  tickerBg: "#F05A28",
  tickerText: "#FFFFFF",
};

export const SEASONAL_CONTENT: MenuBoardContent = {
  brandName: "PINCHER'S DINNER",
  logoUrl: "/templates/good-food-logo.svg",
  badge: "NEW!",
  heroTitle: "SUMMER FLAVOURS!",
  heroSubtitle:
    "Discover our exclusive summer dishes, crafted with the freshest seasonal ingredients.",
  panelTitle: "SEASONAL MENU",
  panelTagline: "Embrace the flavors of Summer.",
  items: [
    {
      id: "1",
      name: "GRILLED PEACH SALAD",
      description: "Arugula, goat cheese, candied pecans, balsamic glaze",
      price: "$14.00",
    },
    {
      id: "2",
      name: "CAPRESE STUFFED TOMATOES",
      description: "Mozzarella, basil pesto, heirloom tomatoes",
      price: "$12.50",
    },
    {
      id: "3",
      name: "CITRUS GLAZED SALMON",
      description: "Orange-honey glaze, quinoa, charred broccoli",
      price: "$24.00",
    },
    {
      id: "4",
      name: "WATERMELON FETA BOWL",
      description: "Mint, lime zest, toasted almonds",
      price: "$11.00",
    },
    {
      id: "5",
      name: "CHILLED CORN CHOWDER",
      description: "Sweet corn, smoked paprika, crème fraîche",
      price: "$10.00",
    },
    {
      id: "6",
      name: "LEMON HERB CHICKEN",
      description: "Roasted vegetables, pan jus, fresh thyme",
      price: "$19.00",
    },
    {
      id: "7",
      name: "BURRATA & STONE FRUIT",
      description: "Nectarines, prosciutto, aged balsamic",
      price: "$16.00",
    },
    {
      id: "8",
      name: "SUMMER BERRY TART",
      description: "Vanilla custard, mixed berries, mint",
      price: "$9.00",
    },
  ],
  qrLabel: "FREE WIFI!",
  qrHint: "Scan here to connect automatically",
  qrUrl: "https://example.com/wifi",
  ticker:
    "Exclusive summer offer! Enjoy a culinary journey that captures the essence of the season with a delightful 3-course meal.",
  heroImageUrl: "/templates/mix-salad.jpg",
  accentImageUrl: "/templates/elegant-appetizer.jpg",
};
