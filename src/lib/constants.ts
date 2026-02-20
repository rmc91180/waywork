export const WORKSPACE_TYPES = {
  PRIVATE_OFFICE: {
    label: "Private Office",
    description: "Enclosed room with 1-2 desks for focused solo work",
    icon: "🏢",
  },
  STUDIO: {
    label: "Studio",
    description: "Open creative space for work and collaboration",
    icon: "🎨",
  },
  MEETING_ROOM: {
    label: "Meeting Room",
    description: "Table + AV setup, team-oriented space",
    icon: "🤝",
  },
  HOME_OFFICE: {
    label: "Home Office",
    description: "Residential space with dedicated work setup",
    icon: "🏠",
  },
  HYBRID_SPACE: {
    label: "Hybrid Space",
    description: "Combined work + stay space",
    icon: "✨",
  },
} as const;

export const AMENITY_CATEGORIES = {
  DESK: { label: "Desk & Work Surfaces", icon: "desk" },
  MONITOR: { label: "Monitors & Displays", icon: "monitor" },
  MEETING: { label: "Meeting & Collaboration", icon: "users" },
  CONNECTIVITY: { label: "Connectivity", icon: "wifi" },
  ERGONOMICS: { label: "Ergonomics", icon: "armchair" },
  QUIET: { label: "Quiet & Privacy", icon: "volume-x" },
  AV: { label: "Audio/Video Equipment", icon: "video" },
  KITCHEN: { label: "Kitchen & Refreshments", icon: "coffee" },
  BATHROOM: { label: "Bathroom", icon: "bath" },
  PARKING: { label: "Parking", icon: "car" },
  OTHER: { label: "Other", icon: "plus" },
} as const;

export const CANCELLATION_POLICIES = {
  FLEXIBLE: {
    label: "Flexible",
    description: "Full refund up to 24 hours before check-in",
  },
  MODERATE: {
    label: "Moderate",
    description:
      "Full refund up to 5 days before check-in, 50% up to 24 hours",
  },
  STRICT: {
    label: "Strict",
    description: "50% refund up to 7 days before check-in, no refund after",
  },
} as const;

export const SUGGESTED_AMENITIES = [
  // Desk
  { category: "DESK" as const, name: "Dedicated Desk" },
  { category: "DESK" as const, name: "Standing Desk" },
  { category: "DESK" as const, name: "Adjustable Desk" },
  { category: "DESK" as const, name: "Large Work Surface" },
  // Monitor
  { category: "MONITOR" as const, name: "External Monitor" },
  { category: "MONITOR" as const, name: "Dual Monitor Setup" },
  { category: "MONITOR" as const, name: "4K Display" },
  // Meeting
  { category: "MEETING" as const, name: "Meeting Table" },
  { category: "MEETING" as const, name: "Conference Room" },
  { category: "MEETING" as const, name: "Whiteboard" },
  { category: "MEETING" as const, name: "Presentation Screen" },
  // Ergonomics
  { category: "ERGONOMICS" as const, name: "Ergonomic Chair" },
  { category: "ERGONOMICS" as const, name: "Adjustable Chair" },
  { category: "ERGONOMICS" as const, name: "Desk Lamp" },
  { category: "ERGONOMICS" as const, name: "Footrest" },
  // Quiet
  { category: "QUIET" as const, name: "Quiet Zone" },
  { category: "QUIET" as const, name: "Private Room" },
  { category: "QUIET" as const, name: "Soundproofing" },
  { category: "QUIET" as const, name: "Noise-Cancelling Environment" },
  // AV
  { category: "AV" as const, name: "Webcam" },
  { category: "AV" as const, name: "External Speakers" },
  { category: "AV" as const, name: "Video Conference Setup" },
  { category: "AV" as const, name: "Microphone" },
  // Connectivity
  { category: "CONNECTIVITY" as const, name: "High-Speed WiFi" },
  { category: "CONNECTIVITY" as const, name: "Ethernet Port" },
  { category: "CONNECTIVITY" as const, name: "Backup Internet" },
  { category: "CONNECTIVITY" as const, name: "USB-C Power" },
  { category: "CONNECTIVITY" as const, name: "Multiple Power Outlets" },
  // Kitchen
  { category: "KITCHEN" as const, name: "Coffee Machine" },
  { category: "KITCHEN" as const, name: "Kitchen Access" },
  { category: "KITCHEN" as const, name: "Microwave" },
  { category: "KITCHEN" as const, name: "Mini Fridge" },
  { category: "KITCHEN" as const, name: "Water Dispenser" },
  // Bathroom
  { category: "BATHROOM" as const, name: "Private Bathroom" },
  { category: "BATHROOM" as const, name: "Shared Bathroom" },
  // Parking
  { category: "PARKING" as const, name: "Free Parking" },
  { category: "PARKING" as const, name: "Street Parking" },
  { category: "PARKING" as const, name: "Garage Parking" },
] as const;
