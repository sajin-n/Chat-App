import { redirect } from "next/navigation";
import { auth, signOut } from "@/lib/auth";
import ChatContainer from "@/components/ChatContainer";

export default async function Home() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  return (
    <div className="h-screen flex flex-col">
      <header className="p-3 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center" role="banner">
        <span className="font-bold">Chat</span>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-600">{session.user.name}</span>
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/login" });
            }}
          >
            <button className="text-sm underline" aria-label="Sign out">Logout</button>
          </form>
        </div>
      </header>
      <ChatContainer userId={session.user.id!} />
    </div>
  );
}

