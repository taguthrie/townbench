import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export default async function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const session = cookieStore.get("townbench_session");

  if (!session || session.value !== "authenticated") {
    redirect("/login");
  }

  return <>{children}</>;
}
