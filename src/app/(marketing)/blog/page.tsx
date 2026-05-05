import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

const posts = [
  {
    title: "Top 10 Workation Cities for 2026",
    excerpt: "Explore the best cities balancing reliable internet, lifestyle, and team-friendly stays.",
    href: "/search?sortBy=recommended",
  },
  {
    title: "How to Plan a Team Offsite That Actually Works",
    excerpt: "A practical framework for agendas, space setup, and post-offsite follow-through.",
    href: "/search?workspaceTypes=MEETING_ROOM,HYBRID_SPACE&guests=6",
  },
  {
    title: "What Makes a Residential Space Work-Ready?",
    excerpt: "The key signals behind Work Score, trust badges, and high-performing bookings.",
    href: "/about",
  },
];

export const metadata = {
  title: "Blog",
  description: "Way Work insights on workations, team offsites, and remote productivity trends.",
};

export default function BlogPage() {
  return (
    <div className="waywork-shell py-12">
      <h1 className="text-4xl font-semibold text-[var(--ww-ink)]">Way Work Journal</h1>
      <p className="mt-2 max-w-2xl text-[var(--ww-celadon)]">
        Practical ideas and destination inspiration for remote professionals, team leads, and hosts.
      </p>
      <div className="mt-8 grid gap-4 md:grid-cols-3">
        {posts.map((post) => (
          <article key={post.title} className="rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="text-xl font-semibold text-[var(--ww-ink)]">{post.title}</h2>
            <p className="mt-2 text-sm text-[var(--ww-celadon)]">{post.excerpt}</p>
            <Link
              href={post.href}
              className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--ww-ink)]"
            >
              Read article
              <ArrowUpRight className="size-3.5" />
            </Link>
          </article>
        ))}
      </div>
    </div>
  );
}

