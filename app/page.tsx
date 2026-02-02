import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import ChatContainer from "@/components/ChatContainer";

export default async function Home() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  return (
    <div className="h-screen flex flex-col">
      <ChatContainer userId={session.user.id!} />
    </div>
  );
}

