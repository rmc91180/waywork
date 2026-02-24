"use client";

import { useState, useCallback } from "react";
import type { z } from "zod";
import type {
  connectivityProfileSchema,
  listingAmenitySchema,
  listingImageSchema,
  availabilityRuleSchema,
  blockedDateSchema,
  listingActivitySchema,
} from "@/lib/validators";

export type ListingFormData = {
  // Step 1: Basics
  title: string;
  description: string;
  workspaceType: string;
  // Step 2: Location
  address: string;
  city: string;
  state: string;
  country: string;
  postalCode: string;
  lat: number;
  lng: number;
  // Step 3: Capacity & Pricing
  maxGuests: number;
  bedroomCount: number;
  bedSize: "TWIN" | "DOUBLE" | "QUEEN" | "KING";
  propertySizeSqm: number;
  pricePerDay: number; // in cents
  cleaningFee: number; // in cents
  cancellationPolicy: string;
  hasJacuzzi: boolean;
  hasSwimmingPool: boolean;
  hasBackyard: boolean;
  hasPingPongTable: boolean;
  hasPoolTable: boolean;
  activities: z.infer<typeof listingActivitySchema>[];
  // Step 4: Amenities
  amenities: z.infer<typeof listingAmenitySchema>[];
  // Step 5: Connectivity
  connectivity: z.infer<typeof connectivityProfileSchema>;
  // Step 6: Photos
  images: z.infer<typeof listingImageSchema>[];
  // Step 7: Availability
  availability: z.infer<typeof availabilityRuleSchema>[];
  blockedDates: z.infer<typeof blockedDateSchema>[];
};

const INITIAL_STATE: ListingFormData = {
  title: "",
  description: "",
  workspaceType: "PRIVATE_OFFICE",
  address: "",
  city: "",
  state: "",
  country: "",
  postalCode: "",
  lat: 0,
  lng: 0,
  maxGuests: 1,
  bedroomCount: 1,
  bedSize: "QUEEN",
  propertySizeSqm: 60,
  pricePerDay: 5000,
  cleaningFee: 0,
  cancellationPolicy: "FLEXIBLE",
  hasJacuzzi: false,
  hasSwimmingPool: false,
  hasBackyard: false,
  hasPingPongTable: false,
  hasPoolTable: false,
  activities: [
    {
      title: "Local team dinner",
      category: "Food",
      description: "Popular nearby restaurant option for after-work downtime.",
      durationMinutes: 90,
      distanceKm: 1.5,
      indoor: true,
    },
  ],
  amenities: [],
  connectivity: {
    declaredDownloadMbps: 100,
    declaredUploadMbps: 50,
    networkType: "WIFI",
    hasBackupConnection: false,
  },
  images: [],
  availability: [
    // Default: available Monday-Friday
    { dayOfWeek: 1, available: true },
    { dayOfWeek: 2, available: true },
    { dayOfWeek: 3, available: true },
    { dayOfWeek: 4, available: true },
    { dayOfWeek: 5, available: true },
    { dayOfWeek: 0, available: false },
    { dayOfWeek: 6, available: false },
  ],
  blockedDates: [],
};

export const WIZARD_STEPS = [
  { id: "basics", title: "Basics", description: "Type, title, and description" },
  { id: "location", title: "Location", description: "Where is your space?" },
  { id: "pricing", title: "Pricing", description: "Capacity and rates" },
  { id: "offsite", title: "Offsite", description: "Leisure and after-work activities" },
  { id: "amenities", title: "Amenities", description: "What do you offer?" },
  { id: "connectivity", title: "Connectivity", description: "Internet and network" },
  { id: "photos", title: "Photos", description: "Show your space" },
  { id: "availability", title: "Availability", description: "When is it available?" },
  { id: "review", title: "Review", description: "Review and publish" },
] as const;

export function useListingForm(initialData?: Partial<ListingFormData>) {
  const [step, setStep] = useState(0);
  const [formData, setFormData] = useState<ListingFormData>({
    ...INITIAL_STATE,
    ...initialData,
  });

  const updateFormData = useCallback(
    (updates: Partial<ListingFormData>) => {
      setFormData((prev) => ({ ...prev, ...updates }));
    },
    []
  );

  const nextStep = useCallback(() => {
    setStep((prev) => Math.min(prev + 1, WIZARD_STEPS.length - 1));
  }, []);

  const prevStep = useCallback(() => {
    setStep((prev) => Math.max(prev - 1, 0));
  }, []);

  const goToStep = useCallback((stepIndex: number) => {
    setStep(Math.max(0, Math.min(stepIndex, WIZARD_STEPS.length - 1)));
  }, []);

  const isFirstStep = step === 0;
  const isLastStep = step === WIZARD_STEPS.length - 1;
  const currentStep = WIZARD_STEPS[step];

  return {
    step,
    setStep,
    formData,
    setFormData,
    updateFormData,
    nextStep,
    prevStep,
    goToStep,
    isFirstStep,
    isLastStep,
    currentStep,
  };
}
