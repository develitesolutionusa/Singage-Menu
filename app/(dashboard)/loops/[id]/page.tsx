import { LoopEditorClient } from "@/components/loops/loop-editor-client";

type Props = { params: Promise<{ id: string }> };

export default async function LoopEditorPage({ params }: Props) {
  const { id } = await params;
  return <LoopEditorClient loopId={id} />;
}
