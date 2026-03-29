export type LimehomePilotMeta = {
  slug: string;
  neighborhood: string;
  bestFor: string;
  stayStyle: string;
  summary: string;
  badge: string;
};

const LIMEHOME_PILOT_BY_SLUG: Record<string, LimehomePilotMeta> = {
  "limehome-madrid-doctor-fleming-team-apartment": {
    slug: "limehome-madrid-doctor-fleming-team-apartment",
    neighborhood: "Chamartin",
    bestFor: "Compact offsites and project teams",
    stayStyle: "Multi-bedroom team apartment",
    summary: "Best for compact offsites that want proper accommodation, not just beds.",
    badge: "Madrid pilot",
  },
  "limehome-madrid-plaza-de-espana-residence": {
    slug: "limehome-madrid-plaza-de-espana-residence",
    neighborhood: "Plaza de Espana",
    bestFor: "Project pairs and flexible city stays",
    stayStyle: "Central one-bedroom residence",
    summary: "A central Madrid base for pair stays or small work trips.",
    badge: "Madrid pilot",
  },
  "limehome-madrid-delicias-offsite-flat": {
    slug: "limehome-madrid-delicias-offsite-flat",
    neighborhood: "Delicias",
    bestFor: "Small teams staying close to Atocha",
    stayStyle: "Two-bedroom offsite flat",
    summary: "A practical offsite stay with a large table and strong work setup.",
    badge: "Madrid pilot",
  },
  "limehome-madrid-quevedo-work-loft": {
    slug: "limehome-madrid-quevedo-work-loft",
    neighborhood: "Chamberi",
    bestFor: "Focused solo or duo work trips",
    stayStyle: "Quiet loft stay",
    summary: "Quiet Chamberi loft for focused work trips and simple city access.",
    badge: "Madrid pilot",
  },
  "limehome-madrid-julian-camarillo-studio": {
    slug: "limehome-madrid-julian-camarillo-studio",
    neighborhood: "Julian Camarillo",
    bestFor: "Solo work trips",
    stayStyle: "Compact studio stay",
    summary: "A compact, reliable studio for short solo stays in east Madrid.",
    badge: "Madrid pilot",
  },
};

export function getLimehomePilotMeta(input: { slug?: string | null }) {
  const slug = input.slug || "";
  return LIMEHOME_PILOT_BY_SLUG[slug] || null;
}

export function isLimehomePilotListing(input: {
  slug?: string | null;
  city?: string | null;
  title?: string | null;
}) {
  if (getLimehomePilotMeta({ slug: input.slug })) return true;
  return input.city === "Madrid" && Boolean(input.title?.startsWith("Limehome Madrid"));
}

export function getAllLimehomePilotSlugs() {
  return Object.keys(LIMEHOME_PILOT_BY_SLUG);
}
