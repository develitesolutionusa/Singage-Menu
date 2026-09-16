import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-100">
      <SignUp forceRedirectUrl="/overview" signInUrl="/sign-in" />
    </div>
  );
}
