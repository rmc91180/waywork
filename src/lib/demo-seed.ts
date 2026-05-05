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

type LimehomeSample = {
  title: string;
  slug: string;
  description: string;
  workspaceType: WorkspaceType;
  address: string;
  city: string;
  state: string;
  country: string;
  postalCode: string;
  lat: number;
  lng: number;
  maxGuests: number;
  bedroomCount: number;
  bedSize: BedSize;
  propertySizeSqm: number;
  pricePerDay: number;
  cleaningFee: number;
  currency: string;
  cancellationPolicy: CancellationPolicy;
  pmsExternalPropertyId: string;
  pmsExternalListingId: string;
  pmsExternalUnitGroupId: string;
  pmsExternalRatePlanId: string;
  connectivity: {
    declaredDownloadMbps: number;
    declaredUploadMbps: number;
    networkType: "WIFI" | "WIRED" | "BOTH";
    hasBackupConnection: boolean;
    backupType?: string;
    verified: boolean;
  };
  amenities: Array<{ category: AmenityCategory; name: string; quantity: number }>;
  activities: Array<{
    title: string;
    category: string;
    description: string;
    durationMinutes: number;
    distanceKm: number;
    indoor: boolean;
  }>;
  images: Array<{ url: string; alt: string }>;
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
export const LIMEHOME_MADRID_SAMPLES: LimehomeSample[] = [
  {
    title: "Limehome Madrid Doctor Fleming Team Apartment",
    slug: "limehome-madrid-doctor-fleming-team-apartment",
    description:
      "Large Chamartin apartment set up for focused work trips and small team offsites, with strong WiFi, a dining-work table, and quiet bedrooms.",
    workspaceType: "HYBRID_SPACE",
    address: "Calle del Doctor Fleming 37",
    city: "Madrid",
    state: "Community of Madrid",
    country: "Spain",
    postalCode: "28036",
    lat: 40.4586,
    lng: -3.6863,
    maxGuests: 6,
    bedroomCount: 3,
    bedSize: "QUEEN",
    propertySizeSqm: 108,
    pricePerDay: 21500,
    cleaningFee: 4500,
    currency: "EUR",
    cancellationPolicy: "MODERATE",
    pmsExternalPropertyId: "limehome-madrid-chamartin",
    pmsExternalListingId: "limehome-madrid-doctor-fleming-team-apartment",
    pmsExternalUnitGroupId: "ug-doctor-fleming-team-apartment",
    pmsExternalRatePlanId: "rp-doctor-fleming-flex",
    connectivity: {
      declaredDownloadMbps: 420,
      declaredUploadMbps: 120,
      networkType: "BOTH",
      hasBackupConnection: true,
      backupType: "5G backup router",
      verified: true,
    },
    // Score target ~91: connectivity 30 + desk 20 + meeting 15 + quiet 15 + ergonomics 8 + av 3
    amenities: [
      { category: "DESK", name: "Dedicated desk", quantity: 2 },
      { category: "DESK", name: "Standing desk option", quantity: 1 },
      { category: "MONITOR", name: "External monitor 27\"", quantity: 1 },
      { category: "MEETING", name: "Conference table for team working sessions", quantity: 1 },
      { category: "MEETING", name: "Whiteboard", quantity: 1 },
      { category: "CONNECTIVITY", name: "High-speed WiFi", quantity: 1 },
      { category: "QUIET", name: "Quiet bedrooms", quantity: 3 },
      { category: "ERGONOMICS", name: "Ergonomic chair", quantity: 2 },
      { category: "ERGONOMICS", name: "Adjustable desk lamp", quantity: 2 },
      { category: "AV", name: "Smart TV for presentations", quantity: 1 },
      { category: "KITCHEN", name: "Full kitchen", quantity: 1 },
    ],
    activities: [
      {
        title: "Bernabeu evening walk",
        category: "Culture",
        description: "Easy neighborhood reset after work near Chamartin.",
        durationMinutes: 70,
        distanceKm: 1.4,
        indoor: false,
      },
      {
        title: "Team tapas dinner",
        category: "Food",
        description: "Casual group dinner option within a short taxi ride.",
        durationMinutes: 100,
        distanceKm: 2.1,
        indoor: true,
      },
    ],
    images: [
      {
        url: "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?auto=format&fit=crop&w=1200&q=80",
        alt: "Limehome Madrid Doctor Fleming Team Apartment workspace",
      },
      {
        url: "https://images.unsplash.com/photo-1560448204-603b3fc33ddc?auto=format&fit=crop&w=1200&q=80",
        alt: "Limehome Madrid Doctor Fleming Team Apartment lounge",
      },
      {
        url: "https://images.unsplash.com/photo-1484154218962-a197022b5858?auto=format&fit=crop&w=1200&q=80",
        alt: "Limehome Madrid Doctor Fleming Team Apartment kitchen",
      },
    ],
  },
  {
    title: "Limehome Madrid Plaza de Espana Residence",
    slug: "limehome-madrid-plaza-de-espana-residence",
    description:
      "Central Madrid apartment with a calm residential feel, strong connectivity, and enough room for a pair or compact project team.",
    workspaceType: "HOME_OFFICE",
    address: "Calle de Leganitos 32",
    city: "Madrid",
    state: "Community of Madrid",
    country: "Spain",
    postalCode: "28013",
    lat: 40.4237,
    lng: -3.7122,
    maxGuests: 3,
    bedroomCount: 1,
    bedSize: "QUEEN",
    propertySizeSqm: 58,
    pricePerDay: 17200,
    cleaningFee: 3200,
    currency: "EUR",
    cancellationPolicy: "FLEXIBLE",
    pmsExternalPropertyId: "limehome-madrid-centro",
    pmsExternalListingId: "limehome-madrid-plaza-de-espana-residence",
    pmsExternalUnitGroupId: "ug-plaza-de-espana-residence",
    pmsExternalRatePlanId: "rp-plaza-de-espana-flex",
    connectivity: {
      declaredDownloadMbps: 310,
      declaredUploadMbps: 90,
      networkType: "WIFI",
      hasBackupConnection: false,
      verified: true,
    },
    // Score target ~68: connectivity 30 + desk 10 + meeting 0 + quiet 15 + ergonomics 8 + av 5
    amenities: [
      { category: "DESK", name: "Window-side desk", quantity: 1 },
      { category: "ERGONOMICS", name: "Ergonomic chair", quantity: 1 },
      { category: "ERGONOMICS", name: "Adjustable task light", quantity: 1 },
      { category: "CONNECTIVITY", name: "High-speed WiFi", quantity: 1 },
      { category: "QUIET", name: "Quiet sleeping area", quantity: 1 },
      { category: "AV", name: "Webcam for video calls", quantity: 1 },
      { category: "KITCHEN", name: "Kitchenette", quantity: 1 },
    ],
    activities: [
      {
        title: "Plaza de Espana sunset walk",
        category: "Nature",
        description: "Quick decompression loop after a focused work block.",
        durationMinutes: 45,
        distanceKm: 0.6,
        indoor: false,
      },
    ],
    images: [
      {
        url: "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=1200&q=80",
        alt: "Limehome Madrid Plaza de Espana Residence workspace",
      },
      {
        url: "https://images.unsplash.com/photo-1493809842364-78817add7ffb?auto=format&fit=crop&w=1200&q=80",
        alt: "Limehome Madrid Plaza de Espana Residence lounge",
      },
      {
        url: "https://images.unsplash.com/photo-1554995207-c18c203602cb?auto=format&fit=crop&w=1200&q=80",
        alt: "Limehome Madrid Plaza de Espana Residence bedroom",
      },
    ],
  },
  {
    title: "Limehome Madrid Delicias Offsite Flat",
    slug: "limehome-madrid-delicias-offsite-flat",
    description:
      "Bright apartment for small offsite stays with a large table, kitchen access, and strong internet near Atocha and Delicias.",
    workspaceType: "HOME_OFFICE",
    address: "Paseo de las Delicias 82",
    city: "Madrid",
    state: "Community of Madrid",
    country: "Spain",
    postalCode: "28045",
    lat: 40.3988,
    lng: -3.6937,
    maxGuests: 5,
    bedroomCount: 2,
    bedSize: "QUEEN",
    propertySizeSqm: 84,
    pricePerDay: 18800,
    cleaningFee: 3900,
    currency: "EUR",
    cancellationPolicy: "MODERATE",
    pmsExternalPropertyId: "limehome-madrid-centro",
    pmsExternalListingId: "limehome-madrid-delicias-offsite-flat",
    pmsExternalUnitGroupId: "ug-delicias-offsite-flat",
    pmsExternalRatePlanId: "rp-delicias-standard",
    connectivity: {
      declaredDownloadMbps: 360,
      declaredUploadMbps: 110,
      networkType: "BOTH",
      hasBackupConnection: true,
      backupType: "Secondary ISP",
      verified: true,
    },
    // Score target ~83: connectivity 30 + desk 15 + meeting 11 + quiet 15 + ergonomics 5 + av 7
    amenities: [
      { category: "DESK", name: "Dedicated desk", quantity: 2 },
      { category: "DESK", name: "Standing desk option", quantity: 1 },
      { category: "MEETING", name: "Large table for workshops", quantity: 1 },
      { category: "CONNECTIVITY", name: "High-speed WiFi", quantity: 1 },
      { category: "QUIET", name: "Separate quiet bedrooms", quantity: 2 },
      { category: "ERGONOMICS", name: "Ergonomic chair", quantity: 1 },
      { category: "AV", name: "Webcam for video calls", quantity: 1 },
      { category: "AV", name: "Bluetooth speaker", quantity: 1 },
      { category: "KITCHEN", name: "Full kitchen", quantity: 1 },
      { category: "OTHER", name: "Self check-in", quantity: 1 },
    ],
    activities: [
      {
        title: "Matadero Madrid visit",
        category: "Culture",
        description: "Creative venue for after-work downtime nearby.",
        durationMinutes: 80,
        distanceKm: 1.2,
        indoor: true,
      },
    ],
    images: [
      {
        url: "https://images.unsplash.com/photo-1515263487990-61b07816b324?auto=format&fit=crop&w=1200&q=80",
        alt: "Limehome Madrid Delicias Offsite Flat living area",
      },
      {
        url: "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1200&q=80",
        alt: "Limehome Madrid Delicias Offsite Flat workspace",
      },
      {
        url: "https://images.unsplash.com/photo-1502672023488-70e25813eb80?auto=format&fit=crop&w=1200&q=80",
        alt: "Limehome Madrid Delicias Offsite Flat bedroom",
      },
    ],
  },
  {
    title: "Limehome Madrid Quevedo Work Loft",
    slug: "limehome-madrid-quevedo-work-loft",
    description:
      "Quiet loft-style stay in Chamberi with a focused desk setup and enough flexibility for a productive work trip for two.",
    workspaceType: "PRIVATE_OFFICE",
    address: "Calle de Bravo Murillo 14",
    city: "Madrid",
    state: "Community of Madrid",
    country: "Spain",
    postalCode: "28015",
    lat: 40.4335,
    lng: -3.7046,
    maxGuests: 2,
    bedroomCount: 1,
    bedSize: "DOUBLE",
    propertySizeSqm: 41,
    pricePerDay: 16500,
    cleaningFee: 2800,
    currency: "EUR",
    cancellationPolicy: "FLEXIBLE",
    pmsExternalPropertyId: "limehome-madrid-chamberi",
    pmsExternalListingId: "limehome-madrid-quevedo-work-loft",
    pmsExternalUnitGroupId: "ug-quevedo-work-loft",
    pmsExternalRatePlanId: "rp-quevedo-flex",
    connectivity: {
      declaredDownloadMbps: 330,
      declaredUploadMbps: 95,
      networkType: "WIFI",
      hasBackupConnection: false,
      verified: true,
    },
    // Score target ~58: connectivity 30 + desk 10 + meeting 0 + quiet 15 + ergonomics 3 + av 0
    amenities: [
      { category: "DESK", name: "Dedicated desk", quantity: 1 },
      { category: "ERGONOMICS", name: "Ergonomic chair", quantity: 1 },
      { category: "CONNECTIVITY", name: "High-speed WiFi", quantity: 1 },
      { category: "QUIET", name: "Private room", quantity: 1 },
      { category: "KITCHEN", name: "Kitchenette", quantity: 1 },
    ],
    activities: [
      {
        title: "Chamberi coffee break route",
        category: "Food",
        description: "A short loop of neighborhood cafes for meetings and resets.",
        durationMinutes: 60,
        distanceKm: 0.9,
        indoor: true,
      },
    ],
    images: [
      {
        url: "https://images.unsplash.com/photo-1524758631624-e2822e304c36?auto=format&fit=crop&w=1200&q=80",
        alt: "Limehome Madrid Quevedo Work Loft desk setup",
      },
      {
        url: "https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?auto=format&fit=crop&w=1200&q=80",
        alt: "Limehome Madrid Quevedo Work Loft bedroom",
      },
      {
        url: "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?auto=format&fit=crop&w=1200&q=80",
        alt: "Limehome Madrid Quevedo Work Loft kitchen",
      },
    ],
  },
  {
    title: "Limehome Madrid Julian Camarillo Studio",
    slug: "limehome-madrid-julian-camarillo-studio",
    description:
      "Compact east-Madrid studio for solo work trips, with a strong desk setup, kitchen access, and reliable internet.",
    workspaceType: "STUDIO",
    address: "Calle de Julian Camarillo 19",
    city: "Madrid",
    state: "Community of Madrid",
    country: "Spain",
    postalCode: "28037",
    lat: 40.4349,
    lng: -3.6324,
    maxGuests: 2,
    bedroomCount: 1,
    bedSize: "DOUBLE",
    propertySizeSqm: 34,
    pricePerDay: 14200,
    cleaningFee: 2400,
    currency: "EUR",
    cancellationPolicy: "FLEXIBLE",
    pmsExternalPropertyId: "limehome-madrid-east",
    pmsExternalListingId: "limehome-madrid-julian-camarillo-studio",
    pmsExternalUnitGroupId: "ug-julian-camarillo-studio",
    pmsExternalRatePlanId: "rp-julian-camarillo-flex",
    connectivity: {
      declaredDownloadMbps: 290,
      declaredUploadMbps: 80,
      networkType: "WIFI",
      hasBackupConnection: false,
      verified: false,
    },
    // Score target ~45: connectivity 22 + desk 10 + meeting 0 + quiet 15 + ergonomics 0 + av 0
    // (290 Mbps = 22pts, no ergonomic chair, no AV)
    amenities: [
      { category: "DESK", name: "Dedicated desk", quantity: 1 },
      { category: "CONNECTIVITY", name: "High-speed WiFi", quantity: 1 },
      { category: "QUIET", name: "Private room", quantity: 1 },
      { category: "KITCHEN", name: "Kitchenette", quantity: 1 },
    ],
    activities: [
      {
        title: "Parque Quinta de los Molinos walk",
        category: "Nature",
        description: "Simple outdoor reset close to the apartment.",
        durationMinutes: 50,
        distanceKm: 1.3,
        indoor: false,
      },
    ],
    images: [
      {
        url: "https://images.unsplash.com/photo-1536376072261-38c75010e6c9?auto=format&fit=crop&w=1200&q=80",
        alt: "Limehome Madrid Julian Camarillo Studio overview",
      },
      {
        url: "https://images.unsplash.com/photo-1505691938895-1758d7feb511?auto=format&fit=crop&w=1200&q=80",
        alt: "Limehome Madrid Julian Camarillo Studio workspace",
      },
      {
        url: "https://images.unsplash.com/photo-1486304873000-235643847519?auto=format&fit=crop&w=1200&q=80",
        alt: "Limehome Madrid Julian Camarillo Studio kitchen",
      },
    ],
  },
];

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

// Curated Unsplash photo pools per workspace type — 12 per pool so index variation
// gives different photos across listings without repeating.
const WORKSPACE_PHOTO_POOLS: Record<string, string[]> = {
  HOME_OFFICE: [
    "photo-1593642632559-0c6d3fc62b89", // bright home office corner
    "photo-1527192491265-7e15c55b1ed2", // desk by window sunlight
    "photo-1524758631624-e2822e304c36", // minimal white desk setup
    "photo-1585771724684-38269d6639fd", // modern home workspace
    "photo-1499750310107-5fef28a66643", // laptop on clean desk
    "photo-1432888498266-38ffec3eaf0a", // notebook and coffee desk
    "photo-1616587226960-4a03badbe8bf", // cozy home office natural light
    "photo-1505330622279-bf7d7fc918f4", // wooden desk warm light
    "photo-1547393947-1849a9bc0e7e", // home office plant corner
    "photo-1610465299996-30f240ac2b1c", // laptop and notepad bright
    "photo-1486312338219-ce68d2c6f44d", // home desk setup wide
    "photo-1497366858526-0766cadbe8fa", // clean minimal workspace
  ],
  PRIVATE_OFFICE: [
    "photo-1497366216548-37526070297c", // corporate glass office
    "photo-1497366811353-6870744d04b2", // clean open office space
    "photo-1504384308090-c894fdcc538d", // bright private office
    "photo-1568992687947-868a62a9f521", // modern office interior
    "photo-1497215728101-856f4ea42174", // private workspace setup
    "photo-1462826303086-329426d1aef5", // small conference room
    "photo-1541746972996-4e0b0f43e02a", // desk in private room
    "photo-1434626881859-194d67b2b86f", // laptop focused workspace
    "photo-1423666639041-f56000c27a9a", // office whiteboard wall
    "photo-1522202176988-66273c2fd55f", // collaborative office space
    "photo-1531482615713-2afd69097998", // modern office lounge
    "photo-1513128034602-7814ccaddd4e", // sleek private desk
  ],
  MEETING_ROOM: [
    "photo-1524178232363-1fb2b075b655", // conference table setup
    "photo-1553877522-43269d4ea984", // modern boardroom
    "photo-1582719471384-894fbb16e074", // whiteboard meeting room
    "photo-1515187029135-18ee286d815b", // team around table
    "photo-1517502884422-41eaead166d4", // glass-walled meeting room
    "photo-1491438590914-bc09fcaaf77a", // collaborative session
    "photo-1542744173-8e7e53415bb0", // digital nomad meeting
    "photo-1537151608828-ea2b11777ee8", // small team workspace
    "photo-1560250097-0b93528c311a", // video call setup
    "photo-1546074177-ffdda98d214f", // modern cowork meeting
    "photo-1583321500900-82807e458f3c", // bright conference space
    "photo-1559136555-9303baea8ebd", // startup meeting room
  ],
  HYBRID_SPACE: [
    "photo-1556909114-f6e7ad7d3136", // hybrid living-work space
    "photo-1600607687920-4e2a09cf159d", // open plan apartment work
    "photo-1560448204-603b3fc33ddc", // living room work corner
    "photo-1555041469-a586c61ea9bc", // sofa with work desk area
    "photo-1600566752355-35792bedcfea", // bright hybrid flat
    "photo-1584622650111-993a426fbf0a", // apartment work nook
    "photo-1565182999561-18d7dc61c393", // hybrid workspace kitchen
    "photo-1617806118233-18e1de247200", // loft work lounge mix
    "photo-1602872030490-4a484a7b3ba6", // scandinavian home office
    "photo-1600210492486-724fe5c67fb0", // modern flat desk setup
    "photo-1615874959474-d609969a20ed", // apartment workspace light
    "photo-1598928506311-c55ded91a20c", // cozy work corner
  ],
  STUDIO: [
    "photo-1536376072261-38c75010e6c9", // studio apartment overview
    "photo-1505691938895-1758d7feb511", // compact studio workspace
    "photo-1522771739844-6a9f6d5f14af", // studio bedroom/office
    "photo-1583847268964-b28dc8f51f92", // studio efficient layout
    "photo-1574362848149-11496d93a7c7", // open studio creative
    "photo-1598928506311-c55ded91a20c", // studio desk corner
    "photo-1550957565-b9210aced1c9", // minimalist studio
    "photo-1493663284031-b7e3aefcae8e", // bright studio interior
    "photo-1587815073078-f636169821e3", // small studio flat
    "photo-1587993444290-5dd8e0e30b46", // studio work nook
    "photo-1507652313519-d4e9174996dd", // neat studio apartment
    "photo-1486304873000-235643847519", // studio kitchen workspace
  ],
};

const LOUNGE_PHOTOS = [
  "photo-1555041469-a586c61ea9bc",
  "photo-1555041469-a586c61ea9bc",
  "photo-1493809842364-78817add7ffb",
  "photo-1484101403633-562f891dc89a",
  "photo-1556228453-efd6c1ff04f6",
  "photo-1560185007-c5ca9d2c014d",
  "photo-1598928506311-c55ded91a20c",
  "photo-1555985900-8cfe0ea9f283",
];

function buildImages(seed: string, title: string, workspaceType?: string) {
  // Use a numeric hash of the slug for deterministic but varied pool indexing
  const hashCode = seed.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const pool = WORKSPACE_PHOTO_POOLS[workspaceType ?? "HOME_OFFICE"] ?? WORKSPACE_PHOTO_POOLS.HOME_OFFICE;
  const primary = pool[hashCode % pool.length];
  const secondary = pool[(hashCode + 3) % pool.length];
  const lounge = LOUNGE_PHOTOS[(hashCode + 1) % LOUNGE_PHOTOS.length];
  return [
    { url: `https://images.unsplash.com/${primary}?auto=format&fit=crop&w=1200&q=80`, alt: `${title} - workspace` },
    { url: `https://images.unsplash.com/${secondary}?auto=format&fit=crop&w=1200&q=80`, alt: `${title} - details` },
    { url: `https://images.unsplash.com/${lounge}?auto=format&fit=crop&w=1200&q=80`, alt: `${title} - lounge` },
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
    images: buildImages(slug, title, workspaceType),
  };
}

export interface DemoSeedResult {
  users: number;
  listingsCreated: number;
  listingsUpdated: number;
}

export interface LimehomePilotSeedResult {
  hostEmail: string;
  listingsCreated: number;
  listingsUpdated: number;
}

export async function seedLimehomeMadridPilot(
  prisma: PrismaClient
): Promise<LimehomePilotSeedResult> {
  const host = await prisma.user.upsert({
    where: { email: "limehome-samples@waywork.com" },
    update: {
      name: "Limehome Madrid Samples",
      role: "HOST",
      emailVerified: new Date(),
    },
    create: {
      email: "limehome-samples@waywork.com",
      name: "Limehome Madrid Samples",
      role: "HOST",
      emailVerified: new Date(),
      bio: "Pilot sample host profile for Limehome Madrid inventory.",
      defaultBookingCommissionBps: 1200,
    },
    select: { id: true },
  });

  const pmsConnection = await prisma.pmsConnection.upsert({
    where: {
      userId_provider: {
        userId: host.id,
        provider: "APALEO",
      },
    },
    update: {
      enabled: false,
      bookingCommissionBps: 1200,
    },
    create: {
      userId: host.id,
      provider: "APALEO",
      enabled: false,
      bookingCommissionBps: 1200,
      apaleoAccountCode: "limehome-madrid-samples",
    },
    select: { id: true },
  });

  let listingsCreated = 0;
  let listingsUpdated = 0;

  for (const sample of LIMEHOME_MADRID_SAMPLES) {
    const workScore = computeWorkScore({
      amenities: sample.amenities,
      connectivity: sample.connectivity,
    }).total;

    const existing = await prisma.listing.findUnique({
      where: { slug: sample.slug },
      select: { id: true },
    });

    const listing = existing
      ? await prisma.listing.update({
          where: { id: existing.id },
          data: {
            hostId: host.id,
            pmsConnectionId: pmsConnection.id,
            status: "ACTIVE",
            curationStatus: "PUBLISHABLE",
            title: sample.title,
            description: sample.description,
            workspaceType: sample.workspaceType,
            address: sample.address,
            city: sample.city,
            state: sample.state,
            country: sample.country,
            postalCode: sample.postalCode,
            lat: sample.lat,
            lng: sample.lng,
            maxGuests: sample.maxGuests,
            bedroomCount: sample.bedroomCount,
            bedSize: sample.bedSize,
            propertySizeSqm: sample.propertySizeSqm,
            pricePerDay: sample.pricePerDay,
            cleaningFee: sample.cleaningFee,
            currency: sample.currency,
            cancellationPolicy: sample.cancellationPolicy,
            workScore,
            pmsExternalPropertyId: sample.pmsExternalPropertyId,
            pmsExternalListingId: sample.pmsExternalListingId,
            pmsExternalUnitGroupId: sample.pmsExternalUnitGroupId,
            pmsExternalRatePlanId: sample.pmsExternalRatePlanId,
            pmsSyncStatus: "SYNCED",
            pmsLastSyncedAt: new Date(),
          },
          select: { id: true },
        })
      : await prisma.listing.create({
          data: {
            hostId: host.id,
            pmsConnectionId: pmsConnection.id,
            status: "ACTIVE",
            curationStatus: "PUBLISHABLE",
            title: sample.title,
            description: sample.description,
            slug: sample.slug,
            workspaceType: sample.workspaceType,
            address: sample.address,
            city: sample.city,
            state: sample.state,
            country: sample.country,
            postalCode: sample.postalCode,
            lat: sample.lat,
            lng: sample.lng,
            maxGuests: sample.maxGuests,
            bedroomCount: sample.bedroomCount,
            bedSize: sample.bedSize,
            propertySizeSqm: sample.propertySizeSqm,
            pricePerDay: sample.pricePerDay,
            cleaningFee: sample.cleaningFee,
            currency: sample.currency,
            cancellationPolicy: sample.cancellationPolicy,
            workScore,
            pmsExternalPropertyId: sample.pmsExternalPropertyId,
            pmsExternalListingId: sample.pmsExternalListingId,
            pmsExternalUnitGroupId: sample.pmsExternalUnitGroupId,
            pmsExternalRatePlanId: sample.pmsExternalRatePlanId,
            pmsSyncStatus: "SYNCED",
            pmsLastSyncedAt: new Date(),
          },
          select: { id: true },
        });

    if (existing) listingsUpdated += 1;
    else listingsCreated += 1;

    await prisma.listingAmenity.deleteMany({ where: { listingId: listing.id } });
    await prisma.listingAmenity.createMany({
      data: sample.amenities.map((amenity) => ({ listingId: listing.id, ...amenity })),
    });

    await prisma.connectivityProfile.upsert({
      where: { listingId: listing.id },
      create: { listingId: listing.id, ...sample.connectivity },
      update: sample.connectivity,
    });

    await prisma.listingImage.deleteMany({ where: { listingId: listing.id } });
    await prisma.listingImage.createMany({
      data: sample.images.map((image, index) => ({
        listingId: listing.id,
        url: image.url,
        alt: image.alt,
        order: index,
        isPrimary: index === 0,
      })),
    });

    await prisma.listingActivity.deleteMany({ where: { listingId: listing.id } });
    await prisma.listingActivity.createMany({
      data: sample.activities.map((activity) => ({
        listingId: listing.id,
        ...activity,
      })),
    });

    await prisma.availabilityRule.deleteMany({ where: { listingId: listing.id } });
    await prisma.availabilityRule.createMany({
      data: Array.from({ length: 7 }, (_, dayOfWeek) => ({
        listingId: listing.id,
        dayOfWeek,
        available: true,
      })),
    });
  }

  return {
    hostEmail: "limehome-samples@waywork.com",
    listingsCreated,
    listingsUpdated,
  };
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

  const limehomePilot = await seedLimehomeMadridPilot(prisma);

  console.log("Seed complete!");
  return {
    users: hostProfiles.length + 3,
    listingsCreated: listingsCreated + limehomePilot.listingsCreated,
    listingsUpdated: listingsUpdated + limehomePilot.listingsUpdated,
  };
}
