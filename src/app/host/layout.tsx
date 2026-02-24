import { Header } from "@/components/shared/header";
import { HostShellNav } from "@/components/host/host-shell-nav";

export default function HostLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <HostShellNav />
      <main className="flex-1">{children}</main>
    </div>
  );
}
