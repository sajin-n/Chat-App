import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import ChatContainer from "@/components/ChatContainer";

// Force dynamic rendering to prevent caching issues with authentication
export const dynamic = "force-dynamic";

export default async function Home() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  // Developer should be on dashboard, not chat app
  if ((session.user as any).role === "developer") {
    redirect("/dashboard");
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <ChatContainer userId={session.user.id!} />
    </div>
  );
}

