import { UserProfile } from "@clerk/nextjs";
import { PageHeader } from "@/components/ui";

export default function AccountPage() {
  return (
    <div>
      <PageHeader
        title="Account"
        description="Manage your profile and security settings."
      />
      <div className="overflow-hidden rounded-lg border border-zinc-200">
        <UserProfile
          appearance={{
            elements: {
              rootBox: "w-full",
              cardBox: "w-full shadow-none",
            },
          }}
        />
      </div>
    </div>
  );
}
