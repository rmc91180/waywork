export interface CityData {
  slug: string;
  name: string;
  country: string;
  countryCode: string;
  region: string;
  timezone: string;
  currency: string;
  heroTagline: string;
  heroDescription: string;
  whyWork: string;
  climate: string;
  bestMonths: string[];
  avgWorkScore: number;
  listingCount: number;
  avgPricePerNight: number; // in USD equivalent
  internetTier: "Basic" | "Good" | "Excellent";
  coworkingCount: number;
  highlights: { icon: string; title: string; detail: string }[];
  neighborhoods: { name: string; vibe: string; bestFor: string }[];
  practicalInfo: { label: string; value: string }[];
  nearbyActivities: string[];
  heroImage: string;
  mapLat: number;
  mapLng: number;
}

export const CITIES: CityData[] = [
  {
    slug: "madrid",
    name: "Madrid",
    country: "Spain",
    countryCode: "ES",
    region: "Europe",
    timezone: "CET (UTC+1)",
    currency: "EUR",
    heroTagline: "Work sharp. Eat late. Repeat.",
    heroDescription:
      "Madrid is Europe's most underrated workation city — fast fiber everywhere, a startup scene that punches above its weight, and a lifestyle that reminds you why you went remote in the first place.",
    whyWork:
      "Madrid has some of the fastest residential broadband in Europe. The city runs on a late schedule that suits async teams — mornings are calm and productive, evenings are long and social. A growing tech corridor around Chamartin and Tetuan means good coffee and coworking options are easy to find.",
    climate: "Hot dry summers, mild winters. March–June and September–November are ideal.",
    bestMonths: ["Mar", "Apr", "May", "Sep", "Oct", "Nov"],
    avgWorkScore: 74,
    listingCount: 18,
    avgPricePerNight: 215,
    internetTier: "Excellent",
    coworkingCount: 40,
    highlights: [
      { icon: "⚡", title: "Fiber everywhere", detail: "Spain's national fiber rollout means even residential apartments regularly hit 300–600 Mbps." },
      { icon: "🏙️", title: "Tech-friendly culture", detail: "Growing startup scene, English widely spoken in professional circles, excellent transport within the city." },
      { icon: "🍽️", title: "The 2pm lunch effect", detail: "Locals eat at 2–3pm, making midday perfect for uninterrupted deep work. Restaurants empty by lunchtime." },
      { icon: "✈️", title: "Gateway city", detail: "Barajas is one of Europe's best-connected airports. Easy to get teams in from across Europe and Latin America." },
    ],
    neighborhoods: [
      { name: "Chamartin", vibe: "Business district meets residential calm", bestFor: "Solo work trips and small teams" },
      { name: "Chamberi", vibe: "Upscale, quiet, walkable", bestFor: "Focus sprints and couples" },
      { name: "Malasaña", vibe: "Creative and caffeinated", bestFor: "Design and product teams" },
      { name: "Salamanca", vibe: "Polished and central", bestFor: "Client-facing offsites" },
    ],
    practicalInfo: [
      { label: "Best airport", value: "Adolfo Suárez Madrid–Barajas (MAD)" },
      { label: "City transport", value: "Metro is excellent — 12 lines, clean, frequent" },
      { label: "Power sockets", value: "Type F (Schuko) — bring an adapter if coming from UK/US" },
      { label: "Time zone", value: "CET — good overlap with UK, US East, and East Asia mornings" },
      { label: "Language", value: "Spanish — English widely understood in business contexts" },
      { label: "SIM/data", value: "Orange and Vodafone offer affordable data-heavy plans" },
    ],
    nearbyActivities: ["El Retiro Park", "Prado Museum", "Mercado de San Miguel", "Casa de Campo cycling", "Bernabeu tour"],
    heroImage: "https://images.unsplash.com/photo-1539037116277-4db20889f2d4?auto=format&fit=crop&w=1600&q=80",
    mapLat: 40.4168,
    mapLng: -3.7038,
  },
  {
    slug: "lisbon",
    name: "Lisbon",
    country: "Portugal",
    countryCode: "PT",
    region: "Europe",
    timezone: "WET (UTC+0)",
    currency: "EUR",
    heroTagline: "Sun, tiles, and 500 Mbps.",
    heroDescription:
      "Lisbon has become Europe's workation capital for good reason — NHR tax scheme, 300 days of sun, strong fiber infrastructure, and a city that's genuinely beautiful to live in.",
    whyWork:
      "Portugal's NHR tax regime attracts skilled workers and remote professionals from across the world, creating a vibrant international community. Lisbon's rolling hills and pastel architecture give you something beautiful to look at between calls, and the startup ecosystem (Web Summit is here for a reason) means there's professional energy alongside the lifestyle draw.",
    climate: "Mediterranean — warm year-round, best avoided in July–August when tourists peak.",
    bestMonths: ["Mar", "Apr", "May", "Jun", "Sep", "Oct"],
    avgWorkScore: 71,
    listingCount: 12,
    avgPricePerNight: 185,
    internetTier: "Excellent",
    coworkingCount: 55,
    highlights: [
      { icon: "🌞", title: "300 days of sun", detail: "Natural light makes every workspace feel better. Lisbon's west-facing apartments catch afternoon sun until 8pm in summer." },
      { icon: "🌍", title: "International community", detail: "A large English-speaking expat and remote worker community means you're never isolated, even for long stays." },
      { icon: "💸", title: "Price advantage", detail: "Still meaningfully cheaper than London, Paris or Amsterdam for equivalent quality." },
      { icon: "🚋", title: "Compact and walkable", detail: "The city center is small enough to walk across. Tram 28 covers most tourist spots, Uber covers the rest." },
    ],
    neighborhoods: [
      { name: "Príncipe Real", vibe: "Refined, leafy, creative", bestFor: "Solo stays and couples" },
      { name: "Mouraria", vibe: "Authentic, hilly, characterful", bestFor: "Long stays wanting local feel" },
      { name: "Parque das Nações", vibe: "Modern, business-facing, near airport", bestFor: "Teams needing conference access" },
      { name: "LX Factory area", vibe: "Industrial-creative, lively", bestFor: "Design and creative teams" },
    ],
    practicalInfo: [
      { label: "Best airport", value: "Humberto Delgado Airport (LIS) — 20 min from center" },
      { label: "City transport", value: "Metro, tram, and Uber all reliable" },
      { label: "Power sockets", value: "Type F — same as most of Europe" },
      { label: "Time zone", value: "WET/WEST — excellent overlap with UK, good for US East mornings" },
      { label: "Language", value: "Portuguese — English very widely spoken" },
      { label: "SIM/data", value: "NOS and Vodafone PT have strong coverage" },
    ],
    nearbyActivities: ["Sintra day trip", "Belém Tower", "LX Factory Sunday market", "Arrábida Natural Park", "Cascais coast"],
    heroImage: "https://images.unsplash.com/photo-1555881400-74d7acaacd8b?auto=format&fit=crop&w=1600&q=80",
    mapLat: 38.7223,
    mapLng: -9.1393,
  },
  {
    slug: "bangkok",
    name: "Bangkok",
    country: "Thailand",
    countryCode: "TH",
    region: "Asia",
    timezone: "ICT (UTC+7)",
    currency: "THB",
    heroTagline: "Insane internet. Insane food. Insane value.",
    heroDescription:
      "Bangkok is the undisputed capital of long-stay remote work in Asia — fiber in every modern condo, food within arm's reach at every hour, and a cost of living that stretches your daily rate further than anywhere else.",
    whyWork:
      "AIS and True Move's fiber networks mean Bangkok condos routinely offer 500–1000 Mbps. The city never stops, which means you can work any hours that suit your timezone overlap — or food appears at 3am when you're pushing to a deadline. The air-conditioned co-working scene is world-class.",
    climate: "Hot year-round. Cool season (Nov–Feb) is the sweet spot — 28°C, low humidity.",
    bestMonths: ["Nov", "Dec", "Jan", "Feb"],
    avgWorkScore: 79,
    listingCount: 9,
    avgPricePerNight: 110,
    internetTier: "Excellent",
    coworkingCount: 120,
    highlights: [
      { icon: "🚀", title: "Gigabit fiber in condos", detail: "Modern Bangkok condos are wired for fiber as standard. 500–1000 Mbps is routine. Your video calls will be flawless." },
      { icon: "🍜", title: "Food at every budget", detail: "Street food at €1.50, Michelin-starred Thai at €30. You'll never eat badly or expensively." },
      { icon: "💰", title: "Extreme value", detail: "A premium work-ready condo in Sukhumvit costs the same as a basic room in London or Paris." },
      { icon: "🌐", title: "Time zone sweet spot", detail: "UTC+7 overlaps well with Singapore, India (mornings), and European late afternoons." },
    ],
    neighborhoods: [
      { name: "Sukhumvit (Ekkamai/Thong Lo)", vibe: "Modern, expat-heavy, excellent transport", bestFor: "Long stays and team offsites" },
      { name: "Silom", vibe: "Business district, central", bestFor: "Solo professionals and short sprints" },
      { name: "Ari", vibe: "Local, calm, cafe culture", bestFor: "Focused long stays" },
      { name: "Sathorn", vibe: "Corporate, quiet, leafy", bestFor: "Executive retreats" },
    ],
    practicalInfo: [
      { label: "Best airport", value: "Suvarnabhumi (BKK) — 30 min from center by express train" },
      { label: "City transport", value: "BTS Skytrain covers main areas; Grab (Uber equivalent) everywhere else" },
      { label: "Power sockets", value: "Type A/B/C — most condos accept universal plugs" },
      { label: "Time zone", value: "ICT (UTC+7) — great for Asia-Pacific teams" },
      { label: "Language", value: "Thai — English widely spoken in business and expat areas" },
      { label: "SIM/data", value: "AIS tourist SIMs available at airport — affordable and fast" },
    ],
    nearbyActivities: ["Wat Pho", "Chatuchak Weekend Market", "Chao Phraya river cruise", "Kanchanaburi day trip", "Asiatique night market"],
    heroImage: "https://images.unsplash.com/photo-1508009603885-50cf7c8dd0d5?auto=format&fit=crop&w=1600&q=80",
    mapLat: 13.7563,
    mapLng: 100.5018,
  },
  {
    slug: "mexico-city",
    name: "Mexico City",
    country: "Mexico",
    countryCode: "MX",
    region: "Americas",
    timezone: "CST (UTC-6)",
    currency: "MXN",
    heroTagline: "Culture, altitude, and a 9-hour US timezone overlap.",
    heroDescription:
      "Mexico City is the Americas' answer to Lisbon — vast, vibrant, surprisingly affordable, and increasingly wired for remote work. The colonia-by-colonia character means there's a neighbourhood for every working style.",
    whyWork:
      "CDMX sits at UTC-6, giving you full business-day overlap with US East and West Coast. The city's creative economy has driven a café and coworking scene that rivals any European capital. Fiber penetration in upscale colonias (Condesa, Roma, Polanco) is excellent.",
    climate: "Mild year-round due to altitude (2,240m). Rainy season June–October brings afternoon showers.",
    bestMonths: ["Nov", "Dec", "Jan", "Feb", "Mar", "Apr"],
    avgWorkScore: 68,
    listingCount: 7,
    avgPricePerNight: 145,
    internetTier: "Good",
    coworkingCount: 70,
    highlights: [
      { icon: "🕐", title: "US timezone alignment", detail: "Perfect overlap with US East and West Coast — great for US-based remote teams who want to travel without losing sync." },
      { icon: "🎨", title: "World-class culture", detail: "Frida Kahlo, Aztec ruins, Lucha Libre, 60 Michelin-recommended restaurants — the city rewards exploration." },
      { icon: "💸", title: "Strong value vs US cities", detail: "A premium apartment in Condesa costs significantly less than equivalent quality in LA or NYC." },
      { icon: "☕", title: "Café culture", detail: "Roma and Condesa have some of the finest specialty coffee scenes in Latin America — productive mornings are guaranteed." },
    ],
    neighborhoods: [
      { name: "Condesa", vibe: "Art deco, leafy, café culture", bestFor: "Creative and product teams" },
      { name: "Roma Norte", vibe: "Bohemian, walkable, lively", bestFor: "Long individual stays" },
      { name: "Polanco", vibe: "Upscale, corporate, secure", bestFor: "Executive teams and client offsites" },
      { name: "Juárez", vibe: "Up-and-coming, artsy, diverse", bestFor: "Budget-conscious longer stays" },
    ],
    practicalInfo: [
      { label: "Best airport", value: "AIFA or AICM — Uber takes 30–60 min depending on traffic" },
      { label: "City transport", value: "Metro is cheap and extensive; Uber safe and affordable" },
      { label: "Power sockets", value: "Type A/B — same as US, no adapter needed" },
      { label: "Time zone", value: "CST (UTC-6) — full overlap with US business hours" },
      { label: "Language", value: "Spanish — English spoken in business/expat areas" },
      { label: "SIM/data", value: "Telcel offers the best coverage nationwide" },
    ],
    nearbyActivities: ["Teotihuacan pyramids", "Frida Kahlo Museum", "Chapultepec Park", "Xochimilco", "Oaxaca weekend trip"],
    heroImage: "https://images.unsplash.com/photo-1585464231875-d9ef1f5ad396?auto=format&fit=crop&w=1600&q=80",
    mapLat: 19.4326,
    mapLng: -99.1332,
  },
  {
    slug: "bali",
    name: "Bali",
    country: "Indonesia",
    countryCode: "ID",
    region: "Asia",
    timezone: "WITA (UTC+8)",
    currency: "IDR",
    heroTagline: "Jungle mornings. Ocean evenings. Deadlines met.",
    heroDescription:
      "Bali is the original digital nomad destination and still the best. Ubud for focus, Canggu for community, Seminyak for teams who want to combine work and retreat. The infrastructure has caught up with the hype.",
    whyWork:
      "Canggu and Ubud now have fiber-backed coworking options and private villas with dedicated fiber drops. The community of remote workers is dense enough that you'll never feel isolated, and the cost structure means you can work from a private pool villa for less than a hotel room in most European cities.",
    climate: "Tropical. Dry season May–September is ideal. Avoid January–March (heavy rains).",
    bestMonths: ["May", "Jun", "Jul", "Aug", "Sep"],
    avgWorkScore: 65,
    listingCount: 6,
    avgPricePerNight: 130,
    internetTier: "Good",
    coworkingCount: 45,
    highlights: [
      { icon: "🌴", title: "The original workation", detail: "Bali invented the digital nomad lifestyle. The infrastructure and community have had 10 years to mature." },
      { icon: "🏊", title: "Private pool villas", detail: "A 3-bedroom private pool villa for an offsite team costs less than a small hotel suite in Amsterdam." },
      { icon: "🧘", title: "Wellness built in", detail: "Yoga, surf, rice terrace walks — the restorative activities are built into the daily rhythm of the place." },
      { icon: "👥", title: "Remote worker density", detail: "Canggu alone has one of the highest concentrations of location-independent workers in the world." },
    ],
    neighborhoods: [
      { name: "Canggu", vibe: "Surf, cafés, digital nomad hub", bestFor: "Teams and long solo stays" },
      { name: "Ubud", vibe: "Jungle, spiritual, quiet", bestFor: "Focus sprints and deep work" },
      { name: "Seminyak", vibe: "Upscale, beach, social", bestFor: "Team retreat + R&R combo" },
      { name: "Sanur", vibe: "Calm, residential, family-friendly", bestFor: "Quiet solo or couple stays" },
    ],
    practicalInfo: [
      { label: "Best airport", value: "Ngurah Rai International (DPS) — 30 min from Seminyak, 1h to Ubud" },
      { label: "City transport", value: "Grab (motorbike or car) is cheap and ubiquitous; scooter rental for longer stays" },
      { label: "Power sockets", value: "Type C/F — European-style, bring a universal adapter" },
      { label: "Time zone", value: "WITA (UTC+8) — good for Australia, SE Asia, and East Asia teams" },
      { label: "Language", value: "Balinese/Indonesian — English very widely spoken in nomad areas" },
      { label: "SIM/data", value: "Telkomsel for best coverage across the island; buy at airport" },
    ],
    nearbyActivities: ["Tegallalang rice terraces", "Tanah Lot temple", "Uluwatu sunset", "Mount Batur hike", "Nusa Penida day trip"],
    heroImage: "https://images.unsplash.com/photo-1537996194471-e657df975ab4?auto=format&fit=crop&w=1600&q=80",
    mapLat: -8.4095,
    mapLng: 115.1889,
  },
];

export const CITY_SLUGS = CITIES.map((c) => c.slug);

export function getCityBySlug(slug: string): CityData | undefined {
  return CITIES.find((c) => c.slug === slug);
}
