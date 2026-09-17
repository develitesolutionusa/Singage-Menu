import { CampaignEditorClient } from "@/components/campaigns/campaign-editor-client";

type Props = { params: Promise<{ id: string }> };

export default async function CampaignDetailPage({ params }: Props) {
  const { id } = await params;
  return <CampaignEditorClient campaignId={id} />;
}
