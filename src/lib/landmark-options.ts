export interface LandmarkOption {
  label: string;
  lat: number;
  lng: number;
  aliases: string[];
}

export const LANDMARK_OPTIONS: LandmarkOption[] = [
  { label: "Eiffel Tower, Paris", lat: 48.8584, lng: 2.2945, aliases: ["eiffel tower", "paris center"] },
  { label: "Louvre Museum, Paris", lat: 48.8606, lng: 2.3376, aliases: ["louvre"] },
  { label: "Big Ben, London", lat: 51.5007, lng: -0.1246, aliases: ["big ben", "westminster"] },
  { label: "Tower Bridge, London", lat: 51.5055, lng: -0.0754, aliases: ["tower bridge"] },
  { label: "Times Square, New York", lat: 40.758, lng: -73.9855, aliases: ["times square", "midtown manhattan"] },
  { label: "Central Park, New York", lat: 40.7829, lng: -73.9654, aliases: ["central park"] },
  { label: "Golden Gate Bridge, San Francisco", lat: 37.8199, lng: -122.4783, aliases: ["golden gate", "san francisco"] },
  { label: "Fisherman's Wharf, San Francisco", lat: 37.808, lng: -122.4177, aliases: ["fishermans wharf"] },
  { label: "Colosseum, Rome", lat: 41.8902, lng: 12.4922, aliases: ["colosseum", "rome center"] },
  { label: "Trevi Fountain, Rome", lat: 41.9009, lng: 12.4833, aliases: ["trevi fountain"] },
  { label: "Sagrada Familia, Barcelona", lat: 41.4036, lng: 2.1744, aliases: ["sagrada familia", "barcelona center"] },
  { label: "La Rambla, Barcelona", lat: 41.3809, lng: 2.1736, aliases: ["la rambla"] },
  { label: "Brandenburg Gate, Berlin", lat: 52.5163, lng: 13.3777, aliases: ["brandenburg gate", "berlin center"] },
  { label: "Potsdamer Platz, Berlin", lat: 52.5096, lng: 13.376, aliases: ["potsdamer platz"] },
  { label: "Shibuya Crossing, Tokyo", lat: 35.6595, lng: 139.7005, aliases: ["shibuya", "tokyo"] },
  { label: "Tokyo Station, Tokyo", lat: 35.6812, lng: 139.7671, aliases: ["tokyo station"] },
  { label: "Marina Bay Sands, Singapore", lat: 1.2834, lng: 103.8607, aliases: ["marina bay", "singapore"] },
  { label: "Gardens by the Bay, Singapore", lat: 1.2816, lng: 103.8636, aliases: ["gardens by the bay"] },
  { label: "Sydney Opera House, Sydney", lat: -33.8568, lng: 151.2153, aliases: ["opera house", "sydney"] },
  { label: "Bondi Beach, Sydney", lat: -33.8915, lng: 151.2767, aliases: ["bondi beach"] },
  { label: "CN Tower, Toronto", lat: 43.6426, lng: -79.3871, aliases: ["cn tower", "toronto"] },
  { label: "Old Port, Montreal", lat: 45.5052, lng: -73.5539, aliases: ["old port montreal", "montreal"] },
  { label: "Burj Khalifa, Dubai", lat: 25.1972, lng: 55.2744, aliases: ["burj khalifa", "dubai"] },
  { label: "Dubai Marina, Dubai", lat: 25.0806, lng: 55.1404, aliases: ["dubai marina"] },
  { label: "Table Mountain, Cape Town", lat: -33.9628, lng: 18.4098, aliases: ["table mountain", "cape town"] },
  { label: "V&A Waterfront, Cape Town", lat: -33.9036, lng: 18.4219, aliases: ["waterfront cape town"] },
  { label: "Ipanema Beach, Rio de Janeiro", lat: -22.9839, lng: -43.2096, aliases: ["ipanema", "rio"] },
  { label: "Copacabana, Rio de Janeiro", lat: -22.9711, lng: -43.1822, aliases: ["copacabana"] },
  { label: "Bosphorus, Istanbul", lat: 41.0415, lng: 29.0072, aliases: ["bosphorus", "istanbul"] },
  { label: "Grand Bazaar, Istanbul", lat: 41.0107, lng: 28.968, aliases: ["grand bazaar"] },
  { label: "Acropolis, Athens", lat: 37.9715, lng: 23.7267, aliases: ["acropolis", "athens"] },
  { label: "Zocalo, Mexico City", lat: 19.4326, lng: -99.1332, aliases: ["zocalo", "mexico city"] },
  { label: "Obelisco, Buenos Aires", lat: -34.6037, lng: -58.3816, aliases: ["obelisco", "buenos aires"] },
];

export const LANDMARK_SUGGESTIONS = LANDMARK_OPTIONS.map((item) => item.label);
