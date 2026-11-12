import { MenuBoardDemo } from "@/components/menu-board/menu-board-demo";

export const metadata = {
  title: "Menu Board · Signage Menu",
  description: "Digital menu board — scale-to-fit any screen",
};

/**
 * Full-screen demo of the menu-board rendering engine.
 * Public route (no Clerk) so TVs / kiosks can load it directly.
 */
export default function MenuBoardPage() {
  return <MenuBoardDemo />;
}
