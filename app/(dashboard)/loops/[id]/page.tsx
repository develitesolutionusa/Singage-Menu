import { Suspense } from "react";
import { LoopEditorClient } from "@/components/loops/loop-editor-client";

type Props = { params: Promise<{ id: string }> };

export default async function LoopEditorPage({ params }: Props) {
  const { id } = await params;
  return (
    <Suspense
      fallback={
        <div className="py-16 text-center text-sm text-zinc-500">
          Loading loop editor…
        </div>
      }
    >
      <LoopEditorClient loopId={id} />
    </Suspense>
  );
}
