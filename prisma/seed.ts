import { PrismaClient } from "../src/generated/prisma";
import { PrismaPg } from "@prisma/adapter-pg";
import { computeWorkScore } from "../src/lib/work-score";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Seeding database...");

  // Create admin user
  const admin = await prisma.user.upsert({
    where: { email: "admin@waywork.com" },
    update: {},
    create: {
      email: "admin@waywork.com",
      name: "WayWork Admin",
      role: "ADMIN",
      emailVerified: new Date(),
    },
  });

  // Create host users
  const host1 = await prisma.user.upsert({
    where: { email: "host1@example.com" },
    update: {},
    create: {
      email: "host1@example.com",
      name: "Sarah Chen",
      role: "HOST",
      emailVerified: new Date(),
      bio: "I run a creative studio in San Francisco with dedicated workspace for visiting professionals.",
    },
  });

  const host2 = await prisma.user.upsert({
    where: { email: "host2@example.com" },
    update: {},
    create: {
      email: "host2@example.com",
      name: "Marcus Johnson",
      role: "HOST",
      emailVerified: new Date(),
      bio: "Former tech executive offering premium home office space in Austin.",
    },
  });

  const host3 = await prisma.user.upsert({
    where: { email: "host3@example.com" },
    update: {},
    create: {
      email: "host3@example.com",
      name: "Emma Wilson",
      role: "HOST",
      emailVerified: new Date(),
      bio: "Converting my downtown loft into a productive workspace for remote teams.",
    },
  });

  // Create guest user
  await prisma.user.upsert({
    where: { email: "guest@example.com" },
    update: {},
    create: {
      email: "guest@example.com",
      name: "Alex Rivera",
      role: "GUEST",
      emailVerified: new Date(),
    },
  });

  // Listing data
  const listings = [
    {
      hostId: host1.id,
      title: "Bright Creative Studio with Dual Monitors",
      description:
        "A sun-filled creative studio in SoMa with two 27-inch monitors, standing desk, ergonomic chairs, and 500 Mbps fiber internet. Perfect for designers, developers, and focused solo work. Quiet neighborhood with great coffee shops nearby. Full kitchen access with espresso machine.",
      slug: "bright-creative-studio-sf",
      workspaceType: "STUDIO" as const,
      address: "456 Brannan St",
      city: "San Francisco",
      state: "CA",
      country: "US",
      postalCode: "94107",
      lat: 37.7749,
      lng: -122.4194,
      maxGuests: 2,
      pricePerDay: 7500, // $75
      cleaningFee: 2500, // $25
      cancellationPolicy: "FLEXIBLE" as const,
      status: "ACTIVE" as const,
      amenities: [
        { category: "DESK" as const, name: "Dedicated Desk", quantity: 2 },
        { category: "DESK" as const, name: "Standing Desk", quantity: 1 },
        { category: "MONITOR" as const, name: "External Monitor", quantity: 2 },
        { category: "ERGONOMICS" as const, name: "Ergonomic Chair", quantity: 2 },
        { category: "ERGONOMICS" as const, name: "Desk Lamp", quantity: 2 },
        { category: "QUIET" as const, name: "Quiet Zone", quantity: 1 },
        { category: "QUIET" as const, name: "Private Room", quantity: 1 },
        { category: "AV" as const, name: "Webcam", quantity: 1 },
        { category: "AV" as const, name: "External Speakers", quantity: 1 },
        { category: "CONNECTIVITY" as const, name: "High-Speed WiFi", quantity: 1 },
        { category: "KITCHEN" as const, name: "Coffee Machine", quantity: 1 },
        { category: "KITCHEN" as const, name: "Kitchen Access", quantity: 1 },
      ],
      connectivity: {
        declaredDownloadMbps: 500,
        declaredUploadMbps: 200,
        networkType: "BOTH" as const,
        hasBackupConnection: true,
        backupType: "Mobile hotspot",
        verified: true,
      },
    },
    {
      hostId: host2.id,
      title: "Premium Home Office Suite - South Austin",
      description:
        "Beautifully appointed home office with a dedicated room, large desk, 32-inch 4K display, and ultra-fast fiber internet. Private entrance, soundproofed walls, and a mini-fridge stocked with water and snacks. Great for deep focus work or important video calls.",
      slug: "premium-home-office-austin",
      workspaceType: "HOME_OFFICE" as const,
      address: "2100 S Lamar Blvd",
      city: "Austin",
      state: "TX",
      country: "US",
      postalCode: "78704",
      lat: 30.2472,
      lng: -97.7729,
      maxGuests: 1,
      pricePerDay: 6000, // $60
      cleaningFee: 1500,
      cancellationPolicy: "MODERATE" as const,
      status: "ACTIVE" as const,
      amenities: [
        { category: "DESK" as const, name: "Dedicated Desk", quantity: 1 },
        { category: "DESK" as const, name: "Large Work Surface", quantity: 1 },
        { category: "MONITOR" as const, name: "4K Display", quantity: 1 },
        { category: "ERGONOMICS" as const, name: "Ergonomic Chair", quantity: 1 },
        { category: "ERGONOMICS" as const, name: "Adjustable Desk", quantity: 1 },
        { category: "ERGONOMICS" as const, name: "Desk Lamp", quantity: 1 },
        { category: "QUIET" as const, name: "Soundproofing", quantity: 1 },
        { category: "QUIET" as const, name: "Private Room", quantity: 1 },
        { category: "AV" as const, name: "Webcam", quantity: 1 },
        { category: "CONNECTIVITY" as const, name: "High-Speed WiFi", quantity: 1 },
        { category: "CONNECTIVITY" as const, name: "Ethernet Port", quantity: 1 },
        { category: "KITCHEN" as const, name: "Mini Fridge", quantity: 1 },
        { category: "PARKING" as const, name: "Free Parking", quantity: 1 },
      ],
      connectivity: {
        declaredDownloadMbps: 300,
        declaredUploadMbps: 100,
        networkType: "BOTH" as const,
        hasBackupConnection: false,
        verified: true,
      },
    },
    {
      hostId: host3.id,
      title: "Downtown Loft Meeting Space - Team of 6",
      description:
        "Open-plan loft space in downtown with a large conference table seating 6, whiteboard walls, projector, and video conferencing setup. Ideal for team planning sessions, workshops, and collaborative work days. Fast WiFi, plenty of power outlets, and a fully stocked kitchen.",
      slug: "downtown-loft-meeting-nyc",
      workspaceType: "MEETING_ROOM" as const,
      address: "125 W 25th St",
      city: "New York",
      state: "NY",
      country: "US",
      postalCode: "10001",
      lat: 40.7448,
      lng: -73.9922,
      maxGuests: 6,
      pricePerDay: 15000, // $150
      cleaningFee: 5000,
      cancellationPolicy: "MODERATE" as const,
      status: "ACTIVE" as const,
      amenities: [
        { category: "DESK" as const, name: "Dedicated Desk", quantity: 6 },
        { category: "MEETING" as const, name: "Conference Table", quantity: 1 },
        { category: "MEETING" as const, name: "Whiteboard", quantity: 2 },
        { category: "MEETING" as const, name: "Presentation Screen", quantity: 1 },
        { category: "MONITOR" as const, name: "External Monitor", quantity: 2 },
        { category: "ERGONOMICS" as const, name: "Ergonomic Chair", quantity: 6 },
        { category: "QUIET" as const, name: "Private Room", quantity: 1 },
        { category: "AV" as const, name: "Video Conference Setup", quantity: 1 },
        { category: "AV" as const, name: "External Speakers", quantity: 1 },
        { category: "AV" as const, name: "Webcam", quantity: 1 },
        { category: "CONNECTIVITY" as const, name: "High-Speed WiFi", quantity: 1 },
        { category: "KITCHEN" as const, name: "Coffee Machine", quantity: 1 },
        { category: "KITCHEN" as const, name: "Kitchen Access", quantity: 1 },
      ],
      connectivity: {
        declaredDownloadMbps: 1000,
        declaredUploadMbps: 500,
        networkType: "BOTH" as const,
        hasBackupConnection: true,
        backupType: "Secondary ISP",
        verified: true,
      },
    },
    {
      hostId: host1.id,
      title: "Quiet Private Office in Mission District",
      description:
        "Minimal, focused private office in the heart of Mission District. One desk, one chair, perfect silence. Ideal for writers, researchers, or anyone who needs zero distractions. Includes a monitor and fast, reliable internet.",
      slug: "quiet-private-office-mission",
      workspaceType: "PRIVATE_OFFICE" as const,
      address: "3000 Mission St",
      city: "San Francisco",
      state: "CA",
      country: "US",
      postalCode: "94110",
      lat: 37.7485,
      lng: -122.4184,
      maxGuests: 1,
      pricePerDay: 4500, // $45
      cleaningFee: 1000,
      cancellationPolicy: "FLEXIBLE" as const,
      status: "ACTIVE" as const,
      amenities: [
        { category: "DESK" as const, name: "Dedicated Desk", quantity: 1 },
        { category: "MONITOR" as const, name: "External Monitor", quantity: 1 },
        { category: "ERGONOMICS" as const, name: "Ergonomic Chair", quantity: 1 },
        { category: "QUIET" as const, name: "Quiet Zone", quantity: 1 },
        { category: "QUIET" as const, name: "Soundproofing", quantity: 1 },
        { category: "QUIET" as const, name: "Private Room", quantity: 1 },
        { category: "CONNECTIVITY" as const, name: "High-Speed WiFi", quantity: 1 },
      ],
      connectivity: {
        declaredDownloadMbps: 200,
        declaredUploadMbps: 100,
        networkType: "WIFI" as const,
        hasBackupConnection: false,
        verified: false,
      },
    },
    {
      hostId: host2.id,
      title: "Hybrid Work + Stay Studio - East Austin",
      description:
        "Work and rest in one space. This converted garage studio has a dedicated work corner with sit/stand desk and monitor, plus a comfortable lounge area. Perfect for multi-day offsite work trips. Includes kitchenette and private bathroom.",
      slug: "hybrid-studio-east-austin",
      workspaceType: "HYBRID_SPACE" as const,
      address: "1800 E 6th St",
      city: "Austin",
      state: "TX",
      country: "US",
      postalCode: "78702",
      lat: 30.2607,
      lng: -97.7244,
      maxGuests: 2,
      pricePerDay: 9500, // $95
      cleaningFee: 3500,
      cancellationPolicy: "MODERATE" as const,
      status: "ACTIVE" as const,
      amenities: [
        { category: "DESK" as const, name: "Standing Desk", quantity: 1 },
        { category: "DESK" as const, name: "Dedicated Desk", quantity: 1 },
        { category: "MONITOR" as const, name: "External Monitor", quantity: 1 },
        { category: "ERGONOMICS" as const, name: "Ergonomic Chair", quantity: 1 },
        { category: "QUIET" as const, name: "Private Room", quantity: 1 },
        { category: "AV" as const, name: "Webcam", quantity: 1 },
        { category: "CONNECTIVITY" as const, name: "High-Speed WiFi", quantity: 1 },
        { category: "KITCHEN" as const, name: "Mini Fridge", quantity: 1 },
        { category: "KITCHEN" as const, name: "Microwave", quantity: 1 },
        { category: "BATHROOM" as const, name: "Private Bathroom", quantity: 1 },
        { category: "PARKING" as const, name: "Free Parking", quantity: 1 },
      ],
      connectivity: {
        declaredDownloadMbps: 150,
        declaredUploadMbps: 50,
        networkType: "WIFI" as const,
        hasBackupConnection: false,
        verified: false,
      },
    },
    {
      hostId: host3.id,
      title: "Rooftop Co-Working Deck - Brooklyn",
      description:
        "Open-air rooftop workspace in Williamsburg with covered and uncovered areas. Best for fair weather creative sessions with Manhattan skyline views. Equipped with outdoor-rated monitors, strong WiFi, and plenty of power. Seats up to 4.",
      slug: "rooftop-coworking-brooklyn",
      workspaceType: "STUDIO" as const,
      address: "200 N 14th St",
      city: "Brooklyn",
      state: "NY",
      country: "US",
      postalCode: "11249",
      lat: 40.7168,
      lng: -73.9583,
      maxGuests: 4,
      pricePerDay: 12000, // $120
      cleaningFee: 3000,
      cancellationPolicy: "FLEXIBLE" as const,
      status: "ACTIVE" as const,
      amenities: [
        { category: "DESK" as const, name: "Dedicated Desk", quantity: 4 },
        { category: "MONITOR" as const, name: "External Monitor", quantity: 2 },
        { category: "ERGONOMICS" as const, name: "Ergonomic Chair", quantity: 4 },
        { category: "CONNECTIVITY" as const, name: "High-Speed WiFi", quantity: 1 },
        { category: "CONNECTIVITY" as const, name: "Multiple Power Outlets", quantity: 1 },
        { category: "KITCHEN" as const, name: "Coffee Machine", quantity: 1 },
        { category: "KITCHEN" as const, name: "Water Dispenser", quantity: 1 },
      ],
      connectivity: {
        declaredDownloadMbps: 100,
        declaredUploadMbps: 50,
        networkType: "WIFI" as const,
        hasBackupConnection: true,
        backupType: "Mobile hotspot",
        verified: false,
      },
    },
    {
      hostId: host1.id,
      title: "Tech-Loaded Private Office - SoMa",
      description:
        "Premium private office with triple monitor setup, mechanical keyboard, studio microphone, and ring light. Built for content creators, developers, and video call warriors. Gigabit fiber with wired ethernet. Quiet floor in a converted warehouse.",
      slug: "tech-loaded-office-soma",
      workspaceType: "PRIVATE_OFFICE" as const,
      address: "888 Brannan St",
      city: "San Francisco",
      state: "CA",
      country: "US",
      postalCode: "94103",
      lat: 37.7717,
      lng: -122.4035,
      maxGuests: 1,
      pricePerDay: 8500, // $85
      cleaningFee: 2000,
      cancellationPolicy: "STRICT" as const,
      status: "ACTIVE" as const,
      amenities: [
        { category: "DESK" as const, name: "Dedicated Desk", quantity: 1 },
        { category: "DESK" as const, name: "Adjustable Desk", quantity: 1 },
        { category: "MONITOR" as const, name: "External Monitor", quantity: 3 },
        { category: "ERGONOMICS" as const, name: "Ergonomic Chair", quantity: 1 },
        { category: "ERGONOMICS" as const, name: "Desk Lamp", quantity: 1 },
        { category: "QUIET" as const, name: "Soundproofing", quantity: 1 },
        { category: "QUIET" as const, name: "Private Room", quantity: 1 },
        { category: "AV" as const, name: "Webcam", quantity: 1 },
        { category: "AV" as const, name: "Microphone", quantity: 1 },
        { category: "AV" as const, name: "External Speakers", quantity: 1 },
        { category: "CONNECTIVITY" as const, name: "High-Speed WiFi", quantity: 1 },
        { category: "CONNECTIVITY" as const, name: "Ethernet Port", quantity: 1 },
        { category: "KITCHEN" as const, name: "Coffee Machine", quantity: 1 },
      ],
      connectivity: {
        declaredDownloadMbps: 1000,
        declaredUploadMbps: 500,
        networkType: "BOTH" as const,
        hasBackupConnection: true,
        backupType: "Secondary fiber line",
        verified: true,
      },
    },
    {
      hostId: host2.id,
      title: "Team Workshop Space - South Congress",
      description:
        "Open workshop space perfect for team brainstorming and planning sessions. Large communal table, whiteboards on all walls, projector, and a breakout lounge. Seats up to 8 comfortably. Walking distance to great restaurants on South Congress.",
      slug: "team-workshop-south-congress",
      workspaceType: "MEETING_ROOM" as const,
      address: "1500 S Congress Ave",
      city: "Austin",
      state: "TX",
      country: "US",
      postalCode: "78704",
      lat: 30.2453,
      lng: -97.7487,
      maxGuests: 8,
      pricePerDay: 20000, // $200
      cleaningFee: 5000,
      cancellationPolicy: "STRICT" as const,
      status: "ACTIVE" as const,
      amenities: [
        { category: "DESK" as const, name: "Dedicated Desk", quantity: 8 },
        { category: "MEETING" as const, name: "Conference Table", quantity: 1 },
        { category: "MEETING" as const, name: "Whiteboard", quantity: 4 },
        { category: "MEETING" as const, name: "Presentation Screen", quantity: 1 },
        { category: "ERGONOMICS" as const, name: "Ergonomic Chair", quantity: 8 },
        { category: "AV" as const, name: "Video Conference Setup", quantity: 1 },
        { category: "AV" as const, name: "External Speakers", quantity: 1 },
        { category: "CONNECTIVITY" as const, name: "High-Speed WiFi", quantity: 1 },
        { category: "KITCHEN" as const, name: "Coffee Machine", quantity: 1 },
        { category: "KITCHEN" as const, name: "Kitchen Access", quantity: 1 },
        { category: "PARKING" as const, name: "Street Parking", quantity: 1 },
      ],
      connectivity: {
        declaredDownloadMbps: 250,
        declaredUploadMbps: 100,
        networkType: "WIFI" as const,
        hasBackupConnection: false,
        verified: false,
      },
    },
    {
      hostId: host3.id,
      title: "Compact Focus Pod - Midtown Manhattan",
      description:
        "Ultra-minimal focus pod in Midtown. Just you, a great desk, a monitor, and silence. No frills, maximum productivity. Ideal for intense work sessions when you need to escape distractions. Includes noise-cancelling headphones.",
      slug: "focus-pod-midtown",
      workspaceType: "PRIVATE_OFFICE" as const,
      address: "350 5th Ave",
      city: "New York",
      state: "NY",
      country: "US",
      postalCode: "10118",
      lat: 40.7484,
      lng: -73.9857,
      maxGuests: 1,
      pricePerDay: 5500, // $55
      cleaningFee: 1000,
      cancellationPolicy: "FLEXIBLE" as const,
      status: "ACTIVE" as const,
      amenities: [
        { category: "DESK" as const, name: "Dedicated Desk", quantity: 1 },
        { category: "MONITOR" as const, name: "External Monitor", quantity: 1 },
        { category: "ERGONOMICS" as const, name: "Ergonomic Chair", quantity: 1 },
        { category: "QUIET" as const, name: "Noise-Cancelling Environment", quantity: 1 },
        { category: "QUIET" as const, name: "Soundproofing", quantity: 1 },
        { category: "QUIET" as const, name: "Private Room", quantity: 1 },
        { category: "CONNECTIVITY" as const, name: "High-Speed WiFi", quantity: 1 },
        { category: "CONNECTIVITY" as const, name: "USB-C Power", quantity: 1 },
      ],
      connectivity: {
        declaredDownloadMbps: 400,
        declaredUploadMbps: 200,
        networkType: "WIFI" as const,
        hasBackupConnection: false,
        verified: true,
      },
    },
    {
      hostId: host1.id,
      title: "Garden Studio with Natural Light - Noe Valley",
      description:
        "Detached backyard studio surrounded by a garden in quiet Noe Valley. Filled with natural light, this space has a large desk, monitor, and a reading nook. Perfect for creative work, writing, or coding. Private entrance and bathroom.",
      slug: "garden-studio-noe-valley",
      workspaceType: "STUDIO" as const,
      address: "4000 24th St",
      city: "San Francisco",
      state: "CA",
      country: "US",
      postalCode: "94114",
      lat: 37.7513,
      lng: -122.4341,
      maxGuests: 2,
      pricePerDay: 6500, // $65
      cleaningFee: 2000,
      cancellationPolicy: "MODERATE" as const,
      status: "ACTIVE" as const,
      amenities: [
        { category: "DESK" as const, name: "Dedicated Desk", quantity: 1 },
        { category: "DESK" as const, name: "Large Work Surface", quantity: 1 },
        { category: "MONITOR" as const, name: "External Monitor", quantity: 1 },
        { category: "ERGONOMICS" as const, name: "Ergonomic Chair", quantity: 1 },
        { category: "ERGONOMICS" as const, name: "Desk Lamp", quantity: 1 },
        { category: "QUIET" as const, name: "Private Room", quantity: 1 },
        { category: "CONNECTIVITY" as const, name: "High-Speed WiFi", quantity: 1 },
        { category: "BATHROOM" as const, name: "Private Bathroom", quantity: 1 },
        { category: "KITCHEN" as const, name: "Coffee Machine", quantity: 1 },
      ],
      connectivity: {
        declaredDownloadMbps: 200,
        declaredUploadMbps: 100,
        networkType: "WIFI" as const,
        hasBackupConnection: false,
        verified: false,
      },
    },
  ];

  // Create listings (idempotent - skip if slug already exists)
  for (const listingData of listings) {
    const { amenities, connectivity, ...data } = listingData;

    // Check if listing already exists
    const existing = await prisma.listing.findFirst({
      where: { slug: data.slug },
    });
    if (existing) {
      console.log(`Skipping existing listing: ${data.title}`);
      continue;
    }

    // Compute work score
    const score = computeWorkScore({ amenities, connectivity });

    const listing = await prisma.listing.create({
      data: {
        ...data,
        workScore: score.total,
        amenities: {
          create: amenities,
        },
        connectivityProfile: {
          create: connectivity,
        },
      },
    });

    console.log(`Created listing: ${listing.title} (Work Score: ${score.total})`);
  }

  console.log("Seed complete!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
