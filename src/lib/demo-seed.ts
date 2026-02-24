import type { PrismaClient } from "../generated/prisma";
import { computeWorkScore } from "./work-score";

type WorkspaceType =
  | "PRIVATE_OFFICE"
  | "STUDIO"
  | "MEETING_ROOM"
  | "HOME_OFFICE"
  | "HYBRID_SPACE";
type CancellationPolicy = "FLEXIBLE" | "MODERATE" | "STRICT";
type BedSize = "TWIN" | "DOUBLE" | "QUEEN" | "KING";

type AmenityCategory =
  | "DESK"
  | "MONITOR"
  | "MEETING"
  | "CONNECTIVITY"
  | "ERGONOMICS"
  | "QUIET"
  | "AV"
  | "KITCHEN"
  | "BATHROOM"
  | "PARKING"
  | "OTHER";

type Hub = {
  city: string;
  state?: string;
  countryCode: string;
  district: string;
  lat: number;
  lng: number;
  landmarks: [string, string];
  activities: [string, string, string];
};

const HUBS: Hub[] = [
  { city: "San Francisco", state: "CA", countryCode: "US", district: "SoMa", lat: 37.7749, lng: -122.4194, landmarks: ["Golden Gate Bridge", "Ferry Building"], activities: ["Sunset bay walk", "Coffee cupping", "Live jazz lounge"] },
  { city: "New York", state: "NY", countryCode: "US", district: "Midtown", lat: 40.7128, lng: -74.006, landmarks: ["Times Square", "Central Park"], activities: ["Rooftop social hour", "Museum late entry", "Hudson bike route"] },
  { city: "Austin", state: "TX", countryCode: "US", district: "South Congress", lat: 30.2672, lng: -97.7431, landmarks: ["Lady Bird Lake", "South Congress"], activities: ["Paddleboard session", "Live music crawl", "BBQ tasting tour"] },
  { city: "London", countryCode: "GB", district: "South Bank", lat: 51.5072, lng: -0.1276, landmarks: ["Big Ben", "Tower Bridge"], activities: ["Thames riverside walk", "West End show", "Tea tasting"] },
  { city: "Paris", countryCode: "FR", district: "Le Marais", lat: 48.8566, lng: 2.3522, landmarks: ["Eiffel Tower", "Louvre"], activities: ["Seine cruise", "Boulangerie route", "Evening gallery visit"] },
  { city: "Berlin", countryCode: "DE", district: "Mitte", lat: 52.52, lng: 13.405, landmarks: ["Brandenburg Gate", "Museum Island"], activities: ["Canal bike ride", "Design district walk", "Coffee lab class"] },
  { city: "Barcelona", countryCode: "ES", district: "Eixample", lat: 41.3874, lng: 2.1686, landmarks: ["Sagrada Familia", "La Rambla"], activities: ["Beachfront run", "Tapas trail", "Gaudi walk"] },
  { city: "Lisbon", countryCode: "PT", district: "Baixa", lat: 38.7223, lng: -9.1393, landmarks: ["Alfama", "Belem Tower"], activities: ["Miradouro circuit", "Fado dinner", "Pastry workshop"] },
  { city: "Amsterdam", countryCode: "NL", district: "Jordaan", lat: 52.3676, lng: 4.9041, landmarks: ["Rijksmuseum", "Canal Belt"], activities: ["Canal cruise", "Market bike loop", "Cheese tasting"] },
  { city: "Dubai", countryCode: "AE", district: "Downtown", lat: 25.2048, lng: 55.2708, landmarks: ["Burj Khalifa", "Dubai Marina"], activities: ["Desert safari", "Marina yacht hour", "Global food hall"] },
  { city: "Singapore", countryCode: "SG", district: "Marina Bay", lat: 1.3521, lng: 103.8198, landmarks: ["Marina Bay Sands", "Gardens by the Bay"], activities: ["Skyline garden walk", "Hawker tasting", "Waterfront run"] },
  { city: "Tokyo", countryCode: "JP", district: "Shibuya", lat: 35.6762, lng: 139.6503, landmarks: ["Shibuya Crossing", "Tokyo Station"], activities: ["Ramen night route", "Shrine stroll", "Arcade challenge"] },
  { city: "Seoul", countryCode: "KR", district: "Gangnam", lat: 37.5665, lng: 126.978, landmarks: ["N Seoul Tower", "Han River"], activities: ["Han river picnic", "Korean BBQ social", "Night market walk"] },
  { city: "Sydney", countryCode: "AU", district: "Darling Harbour", lat: -33.8688, lng: 151.2093, landmarks: ["Sydney Opera House", "Bondi Beach"], activities: ["Harbour kayaking", "Coastal walk", "Seafood tasting"] },
  { city: "Melbourne", countryCode: "AU", district: "Southbank", lat: -37.8136, lng: 144.9631, landmarks: ["Federation Square", "Yarra River"], activities: ["Laneway espresso crawl", "Riverside jog", "Street art tour"] },
  { city: "Toronto", countryCode: "CA", district: "King West", lat: 43.6532, lng: -79.3832, landmarks: ["CN Tower", "Distillery District"], activities: ["Waterfront cycle", "Chef table dinner", "Comedy night"] },
  { city: "Vancouver", countryCode: "CA", district: "Gastown", lat: 49.2827, lng: -123.1207, landmarks: ["Stanley Park", "Canada Place"], activities: ["Seawall run", "Sushi night", "Mountain gondola"] },
  { city: "Mexico City", countryCode: "MX", district: "Roma Norte", lat: 19.4326, lng: -99.1332, landmarks: ["Zocalo", "Chapultepec"], activities: ["Historic center walk", "Taco tasting", "Lucha libre night"] },
  { city: "Sao Paulo", countryCode: "BR", district: "Pinheiros", lat: -23.5505, lng: -46.6333, landmarks: ["Paulista Avenue", "Ibirapuera Park"], activities: ["Park recovery walk", "Churrasco dinner", "Samba venue"] },
  { city: "Buenos Aires", countryCode: "AR", district: "Palermo", lat: -34.6037, lng: -58.3816, landmarks: ["Obelisco", "Recoleta"], activities: ["Tango session", "Parrilla route", "Rose garden stroll"] },
  { city: "Cape Town", countryCode: "ZA", district: "City Bowl", lat: -33.9249, lng: 18.4241, landmarks: ["Table Mountain", "V&A Waterfront"], activities: ["Cable car sunset", "Harbor seafood", "Beach drive"] },
  { city: "Nairobi", countryCode: "KE", district: "Westlands", lat: -1.2921, lng: 36.8219, landmarks: ["Karura Forest", "Nairobi National Park"], activities: ["Forest trail ride", "Coffee tasting", "Art center visit"] },
  { city: "Istanbul", countryCode: "TR", district: "Beyoglu", lat: 41.0082, lng: 28.9784, landmarks: ["Bosphorus", "Grand Bazaar"], activities: ["Ferry loop", "Meze dinner", "Hammam recovery"] },
  { city: "Bangkok", countryCode: "TH", district: "Sukhumvit", lat: 13.7563, lng: 100.5018, landmarks: ["Grand Palace", "Chao Phraya"], activities: ["River dinner cruise", "Muay Thai intro", "Night market route"] },
  { city: "Auckland", countryCode: "NZ", district: "CBD", lat: -36.8485, lng: 174.7633, landmarks: ["Sky Tower", "Viaduct Harbour"], activities: ["Harbor sailing", "Coastal trail walk", "Fusion tasting menu"] },
];

const BED_SIZES: BedSize[] = ["TWIN", "DOUBLE", "QUEEN", "KING"];
const WORKSPACE_TYPES: WorkspaceType[] = [
  "PRIVATE_OFFICE",
  "STUDIO",
  "MEETING_ROOM",
  "HOME_OFFICE",
  "HYBRID_SPACE",
];
const POLICIES: CancellationPolicy[] = ["FLEXIBLE", "MODERATE", "STRICT"];

function random(seed: number) {
  const x = Math.sin(seed * 12.9898 + seed * seed * 0.007) * 43758.5453;
  return x - Math.floor(x);
}

function pick<T>(items: T[], seed: number) {
  return items[Math.floor(random(seed) * items.length) % items.length];
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function buildImages(seed: string, title: string) {
  return [
    { url: `https://picsum.photos/seed/${seed}-1/1600/1066`, alt: `${title} - workspace` },
    { url: `https://picsum.photos/seed/${seed}-2/1600/1066`, alt: `${title} - lounge` },
    { url: `https://picsum.photos/seed/${seed}-3/1600/1066`, alt: `${title} - amenities` },
  ];
}

function buildAmenities(params: {
  maxGuests: number;
  workspaceType: WorkspaceType;
  hasJacuzzi: boolean;
  hasSwimmingPool: boolean;
  hasBackyard: boolean;
  hasPingPongTable: boolean;
  hasPoolTable: boolean;
}) {
  const amenities: Array<{ category: AmenityCategory; name: string; quantity: number }> = [
    { category: "DESK", name: "Dedicated Desk", quantity: Math.max(1, Math.min(6, params.maxGuests)) },
    { category: "MONITOR", name: "External Monitor", quantity: Math.max(1, Math.ceil(params.maxGuests / 2)) },
    { category: "ERGONOMICS", name: "Ergonomic Chair", quantity: Math.max(1, Math.min(8, params.maxGuests)) },
    { category: "CONNECTIVITY", name: "High-Speed WiFi", quantity: 1 },
    { category: "CONNECTIVITY", name: "Multiple Power Outlets", quantity: 1 },
    { category: "KITCHEN", name: "Coffee Machine", quantity: 1 },
    { category: "KITCHEN", name: "Kitchen Access", quantity: 1 },
  ];

  if (params.workspaceType === "MEETING_ROOM" || params.workspaceType === "HYBRID_SPACE") {
    amenities.push(
      { category: "MEETING", name: "Conference Table", quantity: 1 },
      { category: "MEETING", name: "Whiteboard", quantity: 2 },
      { category: "AV", name: "Video Conference Setup", quantity: 1 }
    );
  }

  if (params.workspaceType === "PRIVATE_OFFICE" || params.workspaceType === "HOME_OFFICE") {
    amenities.push(
      { category: "QUIET", name: "Private Room", quantity: 1 },
      { category: "QUIET", name: "Soundproofing", quantity: 1 }
    );
  }

  if (params.hasBackyard) amenities.push({ category: "OTHER", name: "Backyard Lounge", quantity: 1 });
  if (params.hasSwimmingPool) amenities.push({ category: "OTHER", name: "Swimming Pool", quantity: 1 });
  if (params.hasJacuzzi) amenities.push({ category: "OTHER", name: "Jacuzzi", quantity: 1 });
  if (params.hasPingPongTable) amenities.push({ category: "OTHER", name: "Ping Pong Table", quantity: 1 });
  if (params.hasPoolTable) amenities.push({ category: "OTHER", name: "Pool Table", quantity: 1 });

  return amenities;
}

function generateListing(index: number, hub: Hub, hostId: string) {
  const workspaceType = pick(WORKSPACE_TYPES, index + 1);
  const bedSize = pick(BED_SIZES, index + 2);
  const cancellationPolicy = pick(POLICIES, index + 3);

  const maxGuests = 1 + Math.floor(random(index + 4) * 8);
  const bedroomCount = Math.max(1, Math.min(6, Math.floor(maxGuests / 2) + 1));
  const propertySizeSqm = 35 + Math.floor(random(index + 5) * 320);

  const hasJacuzzi = random(index + 6) > 0.7;
  const hasSwimmingPool = random(index + 7) > 0.63;
  const hasBackyard = random(index + 8) > 0.48;
  const hasPingPongTable = random(index + 9) > 0.65;
  const hasPoolTable = random(index + 10) > 0.68;

  const declaredDownloadMbps = 120 + Math.floor(random(index + 11) * 900);
  const declaredUploadMbps = 60 + Math.floor(random(index + 12) * 500);
  const pricePerDay = 6500 + Math.floor((propertySizeSqm / 3 + declaredDownloadMbps / 2) * 10);
  const cleaningFee = 1200 + Math.floor(random(index + 13) * 4500);

  const landmark = pick(Array.from(hub.landmarks), index + 14);
  const unit =
    workspaceType === "MEETING_ROOM"
      ? "team suite"
      : workspaceType === "HYBRID_SPACE"
        ? "work-and-stay loft"
        : workspaceType === "STUDIO"
          ? "creative studio"
          : "productivity suite";
  const title = `${hub.city} ${unit} near ${landmark}`;
  const slug = slugify(`${hub.city}-${unit}-${index + 1}`);

  const description = `This ${workspaceType.toLowerCase().replace("_", " ")} in ${hub.city} is optimized for distributed teams that need focus by day and quality downtime after hours. You get fast connectivity, ergonomic workstations, practical meeting zones, and curated local experiences around ${hub.district}. Ideal for leadership retreats, strategy sprints, and remote collaboration weeks.`;

  const lat = Number((hub.lat + (random(index + 15) - 0.5) * 0.08).toFixed(6));
  const lng = Number((hub.lng + (random(index + 16) - 0.5) * 0.08).toFixed(6));
  const address = `${120 + ((index * 13) % 760)} ${hub.district} Ave`;

  const amenities = buildAmenities({
    maxGuests,
    workspaceType,
    hasJacuzzi,
    hasSwimmingPool,
    hasBackyard,
    hasPingPongTable,
    hasPoolTable,
  });

  const connectivity = {
    declaredDownloadMbps,
    declaredUploadMbps,
    networkType: declaredDownloadMbps > 350 ? ("BOTH" as const) : random(index + 17) > 0.3 ? ("WIFI" as const) : ("WIRED" as const),
    hasBackupConnection: random(index + 18) > 0.45,
    backupType: random(index + 19) > 0.5 ? "Mobile hotspot" : "Secondary ISP",
    verified: random(index + 20) > 0.35,
  };

  const activities = hub.activities.map((titleText, activityIndex) => ({
    title: titleText,
    category: activityIndex === 0 ? "Nature" : activityIndex === 1 ? "Food" : "Culture",
    description: `${titleText} around ${hub.district}, a popular offsite option for guests.`,
    durationMinutes: 60 + activityIndex * 25 + Math.floor(random(index + 30 + activityIndex) * 30),
    distanceKm: Number((0.8 + random(index + 40 + activityIndex) * 5.6).toFixed(1)),
    indoor: activityIndex !== 0,
  }));

  activities.push({
    title: "Team dinner reservation",
    category: "Food",
    description: `Recommended local restaurants near ${hub.district} for evening team wind-down.`,
    durationMinutes: 100,
    distanceKm: Number((1.2 + random(index + 44) * 2.3).toFixed(1)),
    indoor: true,
  });

  return {
    hostId,
    title,
    description,
    slug,
    workspaceType,
    address,
    city: hub.city,
    state: hub.state,
    country: hub.countryCode,
    postalCode: `${10000 + ((index * 77) % 89999)}`,
    lat,
    lng,
    maxGuests,
    bedroomCount,
    bedSize,
    propertySizeSqm,
    pricePerDay,
    cleaningFee,
    cancellationPolicy,
    status: "ACTIVE" as const,
    hasJacuzzi,
    hasSwimmingPool,
    hasBackyard,
    hasPingPongTable,
    hasPoolTable,
    amenities,
    connectivity,
    activities,
    images: buildImages(slug, title),
  };
}

export interface DemoSeedResult {
  users: number;
  listingsCreated: number;
  listingsUpdated: number;
}

export async function seedDemoData(prisma: PrismaClient): Promise<DemoSeedResult> {
  console.log("Seeding database...");

  await prisma.user.upsert({
    where: { email: "admin@waywork.com" },
    update: { name: "WayWork Admin", role: "ADMIN", emailVerified: new Date() },
    create: { email: "admin@waywork.com", name: "WayWork Admin", role: "ADMIN", emailVerified: new Date() },
  });

  const hostProfiles = [
    { email: "host1@example.com", name: "Sarah Chen", image: "https://i.pravatar.cc/300?img=32" },
    { email: "host2@example.com", name: "Marcus Johnson", image: "https://i.pravatar.cc/300?img=59" },
    { email: "host3@example.com", name: "Emma Wilson", image: "https://i.pravatar.cc/300?img=47" },
    { email: "host4@example.com", name: "Diego Alvarez", image: "https://i.pravatar.cc/300?img=15" },
    { email: "host5@example.com", name: "Aisha Patel", image: "https://i.pravatar.cc/300?img=68" },
    { email: "host6@example.com", name: "Lena Hoffman", image: "https://i.pravatar.cc/300?img=21" },
  ];

  const hosts: Array<{ id: string }> = [];
  for (const host of hostProfiles) {
    const upserted = await prisma.user.upsert({
      where: { email: host.email },
      update: {
        name: host.name,
        role: "HOST",
        image: host.image,
        bio: "Global offsite host focused on reliable workspaces with strong guest experiences.",
        emailVerified: new Date(),
      },
      create: {
        email: host.email,
        name: host.name,
        role: "HOST",
        image: host.image,
        bio: "Global offsite host focused on reliable workspaces with strong guest experiences.",
        emailVerified: new Date(),
      },
      select: { id: true },
    });
    hosts.push(upserted);
  }

  await prisma.user.upsert({
    where: { email: "guest@example.com" },
    update: { name: "Alex Rivera", role: "GUEST", image: "https://i.pravatar.cc/300?img=12", emailVerified: new Date() },
    create: { email: "guest@example.com", name: "Alex Rivera", role: "GUEST", image: "https://i.pravatar.cc/300?img=12", emailVerified: new Date() },
  });

  const generatedListings = Array.from({ length: 100 }, (_, index) => {
    const hub = HUBS[index % HUBS.length];
    const host = hosts[index % hosts.length];
    return generateListing(index, hub, host.id);
  });

  const generatedSlugs = new Set(generatedListings.map((listing) => listing.slug));
  await prisma.listing.deleteMany({
    where: {
      hostId: { in: hosts.map((host) => host.id) },
      slug: { notIn: Array.from(generatedSlugs) },
    },
  });

  let listingsCreated = 0;
  let listingsUpdated = 0;

  for (const listingData of generatedListings) {
    const { amenities, connectivity, images, activities, ...listingCore } = listingData;
    const workScore = computeWorkScore({ amenities, connectivity }).total;

    const existing = await prisma.listing.findUnique({
      where: { slug: listingCore.slug },
      select: { id: true },
    });

    const listing = existing
      ? await prisma.listing.update({
          where: { id: existing.id },
          data: { ...listingCore, workScore },
          select: { id: true, title: true },
        })
      : await prisma.listing.create({
          data: { ...listingCore, workScore },
          select: { id: true, title: true },
        });

    if (existing) listingsUpdated += 1;
    else listingsCreated += 1;

    await prisma.listingAmenity.deleteMany({ where: { listingId: listing.id } });
    await prisma.listingAmenity.createMany({
      data: amenities.map((amenity) => ({ listingId: listing.id, ...amenity })),
    });

    await prisma.connectivityProfile.upsert({
      where: { listingId: listing.id },
      create: { listingId: listing.id, ...connectivity },
      update: connectivity,
    });

    await prisma.listingImage.deleteMany({ where: { listingId: listing.id } });
    await prisma.listingImage.createMany({
      data: images.map((image, idx) => ({
        listingId: listing.id,
        url: image.url,
        alt: image.alt,
        order: idx,
        isPrimary: idx === 0,
      })),
    });

    await prisma.listingActivity.deleteMany({ where: { listingId: listing.id } });
    await prisma.listingActivity.createMany({
      data: activities.map((activity) => ({
        listingId: listing.id,
        title: activity.title,
        category: activity.category,
        description: activity.description,
        durationMinutes: activity.durationMinutes,
        distanceKm: activity.distanceKm,
        indoor: activity.indoor,
      })),
    });

    console.log(`${existing ? "Updated" : "Created"} listing: ${listing.title} (Work Score: ${workScore})`);
  }

  console.log("Seed complete!");
  return {
    users: hostProfiles.length + 2,
    listingsCreated,
    listingsUpdated,
  };
}
