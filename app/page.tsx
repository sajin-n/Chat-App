import { redirect } from "next/navigation";
import { auth, signOut } from "@/lib/auth";
import ChatList from "@/components/ChatList";
import ChatWindow from "@/components/ChatWindow";

export default async function Home() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  return (
    <div className="h-screen flex flex-col">
      <header className="p-3 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center">
        <span className="font-bold">Chat</span>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-600">{session.user.name}</span>
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/login" });
            }}
          >
            <button className="text-sm underline">Logout</button>
          </form>
        </div>
      </header>
      <div className="flex-1 flex overflow-hidden">
        <ChatList userId={session.user.id!} />
        <ChatWindow userId={session.user.id!} />
      </div>
    </div>
  );
}

