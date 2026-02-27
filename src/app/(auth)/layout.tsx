import Link from "next/link";
import { BrandLogo } from "@/components/shared/brand-logo";
import { BRAND } from "@/lib/brand";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-white via-[#f9f7ef] to-[#f5faf8] px-4 py-10">
      <div className="mb-8 text-center">
        <Link href="/" className="inline-flex">
          <BrandLogo />
        </Link>
        <p className="mt-3 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--ww-secondary-green)]">
          {BRAND.descriptor}
        </p>
      </div>
      {children}
    </div>
  );
}
