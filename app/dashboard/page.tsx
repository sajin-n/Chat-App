import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import DeveloperDashboard from "@/components/DeveloperDashboard";

// Force dynamic rendering to prevent caching issues with authentication
export const dynamic = "force-dynamic";

export default async function DashboardPage() {
    const session = await auth();

    if (!session?.user) {
        redirect("/login");
    }

    // Only developer can access dashboard
    if ((session.user as any).role !== "developer") {
        redirect("/");
    }

    return <DeveloperDashboard />;
}
