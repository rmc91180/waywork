import { z } from "zod";

// ============================================================================
// LISTING
// ============================================================================

export const workspaceTypeSchema = z.enum([
  "PRIVATE_OFFICE",
  "STUDIO",
  "MEETING_ROOM",
  "HOME_OFFICE",
  "HYBRID_SPACE",
]);

export const cancellationPolicySchema = z.enum([
  "FLEXIBLE",
  "MODERATE",
  "STRICT",
]);

export const amenityCategorySchema = z.enum([
  "DESK",
  "MONITOR",
  "MEETING",
  "CONNECTIVITY",
  "ERGONOMICS",
  "QUIET",
  "AV",
  "KITCHEN",
  "BATHROOM",
  "PARKING",
  "OTHER",
]);

export const networkTypeSchema = z.enum(["WIFI", "WIRED", "BOTH"]);

export const createListingSchema = z.object({
  title: z.string().min(5, "Title must be at least 5 characters").max(100),
  description: z
    .string()
    .min(20, "Description must be at least 20 characters")
    .max(5000),
  workspaceType: workspaceTypeSchema,
  address: z.string().min(5),
  city: z.string().min(1),
  state: z.string().optional(),
  country: z.string().min(1),
  postalCode: z.string().optional(),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  maxGuests: z.number().int().min(1).max(10),
  pricePerDay: z.number().int().min(100, "Minimum price is $1.00"),
  cleaningFee: z.number().int().min(0).default(0),
  currency: z.string().default("USD"),
  cancellationPolicy: cancellationPolicySchema.default("FLEXIBLE"),
});

export const updateListingSchema = createListingSchema.partial();

export const connectivityProfileSchema = z.object({
  declaredDownloadMbps: z.number().min(1, "Download speed must be at least 1 Mbps"),
  declaredUploadMbps: z.number().min(1, "Upload speed must be at least 1 Mbps"),
  networkType: networkTypeSchema.default("WIFI"),
  speedTestScreenshotUrl: z.string().url().optional(),
  speedTestDate: z.string().datetime().optional(),
  hasBackupConnection: z.boolean().default(false),
  backupType: z.string().optional(),
});

export const listingAmenitySchema = z.object({
  category: amenityCategorySchema,
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  quantity: z.number().int().min(1).default(1),
});

export const listingImageSchema = z.object({
  url: z.string().url(),
  alt: z.string().max(200).optional(),
  order: z.number().int().min(0).default(0),
  isPrimary: z.boolean().default(false),
});

// ============================================================================
// BOOKING
// ============================================================================

export const createBookingSchema = z
  .object({
    listingId: z.string().min(1),
    checkIn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Must be YYYY-MM-DD"),
    checkOut: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Must be YYYY-MM-DD"),
    numberOfGuests: z.number().int().min(1).max(10).default(1),
    specialRequests: z.string().max(1000).optional(),
    attendeeEmails: z.array(z.string().email()).max(9).optional(),
  })
  .refine(
    (data) => new Date(data.checkOut) > new Date(data.checkIn),
    { message: "Check-out must be after check-in" }
  );

// ============================================================================
// REVIEW
// ============================================================================

export const createReviewSchema = z.object({
  bookingId: z.string().min(1),
  targetType: z.enum(["LISTING", "GUEST"]),
  overallRating: z.number().int().min(1).max(5),
  wifiAccuracy: z.number().int().min(1).max(5).optional(),
  quietness: z.number().int().min(1).max(5).optional(),
  deskSetup: z.number().int().min(1).max(5).optional(),
  cleanliness: z.number().int().min(1).max(5).optional(),
  comment: z.string().max(2000).optional(),
});

export const hostResponseSchema = z.object({
  reviewId: z.string().min(1),
  hostResponse: z.string().min(1).max(1000),
});

// ============================================================================
// MESSAGING
// ============================================================================

export const createThreadSchema = z.object({
  listingId: z.string().min(1),
  message: z.string().min(1).max(5000),
});

export const sendMessageSchema = z.object({
  threadId: z.string().min(1),
  content: z.string().min(1).max(5000),
});

// ============================================================================
// SEARCH
// ============================================================================

export const searchListingsSchema = z.object({
  query: z.string().optional(),
  city: z.string().optional(),
  country: z.string().optional(),
  lat: z.number().optional(),
  lng: z.number().optional(),
  radius: z.number().optional(), // km
  checkIn: z.string().optional(),
  checkOut: z.string().optional(),
  guests: z.number().int().min(1).optional(),
  workspaceTypes: z.array(workspaceTypeSchema).optional(),
  minWorkScore: z.number().int().min(0).max(100).optional(),
  minSpeed: z.number().optional(),
  minPrice: z.number().int().optional(),
  maxPrice: z.number().int().optional(),
  cancellationPolicy: cancellationPolicySchema.optional(),
  amenities: z.array(z.string()).optional(),
  sortBy: z.enum(["workScore", "price", "distance", "createdAt"]).optional(),
  sortOrder: z.enum(["asc", "desc"]).optional(),
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(50).default(20),
});

// ============================================================================
// UPLOAD
// ============================================================================

export const presignUploadSchema = z.object({
  contentType: z.string().regex(/^image\/(jpeg|png|webp|gif)$/),
  folder: z.enum(["listings", "speed-tests", "avatars"]),
});

// ============================================================================
// AVAILABILITY
// ============================================================================

export const availabilityRuleSchema = z.object({
  dayOfWeek: z.number().int().min(0).max(6).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  available: z.boolean().default(true),
});

export const blockedDateSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  source: z.enum(["MANUAL", "ICAL", "BOOKING"]).default("MANUAL"),
});
