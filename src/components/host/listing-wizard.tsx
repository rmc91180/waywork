"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { WizardSteps } from "@/components/host/wizard-steps";
import { StepBasics } from "@/components/host/step-basics";
import { StepLocation } from "@/components/host/step-location";
import { StepPricing } from "@/components/host/step-pricing";
import { StepOffsite } from "@/components/host/step-offsite";
import { StepAmenities } from "@/components/host/step-amenities";
import { StepConnectivity } from "@/components/host/step-connectivity";
import { StepPhotos } from "@/components/host/step-photos";
import { StepAvailability } from "@/components/host/step-availability";
import { StepReview } from "@/components/host/step-review";
import { useListingForm, type ListingFormData } from "@/hooks/use-listing-form";
import {
  saveCompleteListing,
  submitListingForReview,
  updateCompleteListing,
} from "@/actions/listing";
import { toast } from "sonner";
import type {
  BedSize,
  CancellationPolicy,
  WorkspaceType,
} from "@/generated/prisma";

interface ListingWizardProps {
  mode: "create" | "edit";
  listingId?: string;
  initialData?: Partial<ListingFormData>;
  bookingCommissionBps: number;
}

export function ListingWizard({
  mode,
  listingId,
  initialData,
  bookingCommissionBps,
}: ListingWizardProps) {
  const {
    step,
    formData,
    updateFormData,
    nextStep,
    prevStep,
    goToStep,
    isFirstStep,
    isLastStep,
  } = useListingForm(initialData);

  const [isPending, startTransition] = useTransition();
  const [saving, setSaving] = useState(false);

  const validateStep = (stepIndex: number) => {
    if (stepIndex === 0) {
      if (formData.title.trim().length < 5) {
        toast.error("Add a title with at least 5 characters.");
        return false;
      }
      if (formData.description.trim().length < 20) {
        toast.error("Add a description with at least 20 characters.");
        return false;
      }
      return true;
    }

    if (stepIndex === 1) {
      if (!formData.address.trim() || !formData.city.trim() || !formData.country.trim()) {
        toast.error("Address, city, and country are required.");
        return false;
      }
      if (
        !Number.isFinite(formData.lat) ||
        !Number.isFinite(formData.lng) ||
        formData.lat === 0 ||
        formData.lng === 0
      ) {
        toast.error("Add valid latitude and longitude coordinates.");
        return false;
      }
      return true;
    }

    if (stepIndex === 2) {
      if (formData.maxGuests < 1 || formData.maxGuests > 10) {
        toast.error("Maximum guests must be between 1 and 10.");
        return false;
      }
      if (formData.pricePerDay < 100) {
        toast.error("Price per day must be at least $1.");
        return false;
      }
      if (formData.cleaningFee < 0) {
        toast.error("Cleaning fee cannot be negative.");
        return false;
      }
      return true;
    }

    if (stepIndex === 3) {
      if (formData.bedroomCount < 1) {
        toast.error("Bedrooms must be at least 1.");
        return false;
      }
      if (formData.propertySizeSqm > 0 && formData.propertySizeSqm < 10) {
        toast.error("Property size must be at least 10 sqm.");
        return false;
      }
      return true;
    }

    if (stepIndex === 4) {
      if (formData.amenities.length < 1) {
        toast.error("Select at least one amenity.");
        return false;
      }
      return true;
    }

    if (stepIndex === 5) {
      if (formData.connectivity.declaredDownloadMbps < 1) {
        toast.error("Download speed must be at least 1 Mbps.");
        return false;
      }
      if (formData.connectivity.declaredUploadMbps < 1) {
        toast.error("Upload speed must be at least 1 Mbps.");
        return false;
      }
      if (
        formData.connectivity.hasBackupConnection &&
        !formData.connectivity.backupType?.trim()
      ) {
        toast.error("Specify the backup connection type.");
        return false;
      }
      return true;
    }

    if (stepIndex === 6) {
      if (formData.images.length < 1) {
        toast.error("Add at least one photo before continuing.");
        return false;
      }
      return true;
    }

    if (stepIndex === 7) {
      if (formData.availability.length < 1) {
        toast.error("Add at least one availability rule.");
        return false;
      }
      if (!formData.availability.some((rule) => rule.available)) {
        toast.error("At least one day must be available.");
        return false;
      }
      return true;
    }

    return true;
  };

  const validateStepsBeforeSubmit = () => {
    for (let stepIndex = 0; stepIndex <= 7; stepIndex += 1) {
      if (!validateStep(stepIndex)) return false;
    }
    return true;
  };

  const listingPayload = {
    title: formData.title,
    description: formData.description,
    workspaceType: formData.workspaceType as WorkspaceType,
    address: formData.address,
    city: formData.city,
    state: formData.state,
    country: formData.country,
    postalCode: formData.postalCode,
    lat: formData.lat,
    lng: formData.lng,
    maxGuests: formData.maxGuests,
    bedroomCount: formData.bedroomCount,
    bedSize: formData.bedSize as BedSize,
    propertySizeSqm:
      formData.propertySizeSqm > 0 ? formData.propertySizeSqm : undefined,
    pricePerDay: formData.pricePerDay,
    cleaningFee: formData.cleaningFee,
    currency: "USD",
    cancellationPolicy: formData.cancellationPolicy as CancellationPolicy,
    hasJacuzzi: formData.hasJacuzzi,
    hasSwimmingPool: formData.hasSwimmingPool,
    hasBackyard: formData.hasBackyard,
    hasPingPongTable: formData.hasPingPongTable,
    hasPoolTable: formData.hasPoolTable,
  };

  const handleSaveDraft = () => {
    setSaving(true);
    startTransition(async () => {
      try {
        if (mode === "edit" && listingId) {
          await updateCompleteListing(listingId, {
            listing: listingPayload,
            connectivity: formData.connectivity,
            amenities: formData.amenities,
            activities: formData.activities,
            images: formData.images,
            availability: formData.availability,
            blockedDates: formData.blockedDates,
          });
        } else {
          await saveCompleteListing({
            listing: listingPayload,
            connectivity: formData.connectivity,
            amenities: formData.amenities,
            activities: formData.activities,
            images: formData.images,
            availability: formData.availability,
            blockedDates: formData.blockedDates,
            submitForReview: false,
          });
        }
        toast.success("Listing saved as draft!");
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Failed to save listing"
        );
      } finally {
        setSaving(false);
      }
    });
  };

  const handleSubmitForReview = () => {
    if (!validateStepsBeforeSubmit()) return;

    setSaving(true);
    startTransition(async () => {
      try {
        if (mode === "edit" && listingId) {
          await updateCompleteListing(listingId, {
            listing: listingPayload,
            connectivity: formData.connectivity,
            amenities: formData.amenities,
            activities: formData.activities,
            images: formData.images,
            availability: formData.availability,
            blockedDates: formData.blockedDates,
          });
          await submitListingForReview(listingId);
        } else {
          await saveCompleteListing({
            listing: listingPayload,
            connectivity: formData.connectivity,
            amenities: formData.amenities,
            activities: formData.activities,
            images: formData.images,
            availability: formData.availability,
            blockedDates: formData.blockedDates,
            submitForReview: true,
          });
        }
        toast.success("Listing submitted for review!");
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Failed to submit listing"
        );
      } finally {
        setSaving(false);
      }
    });
  };

  const handleContinue = () => {
    if (!validateStep(step)) return;
    nextStep();
  };

  const renderStep = () => {
    switch (step) {
      case 0:
        return <StepBasics data={formData} onChange={updateFormData} />;
      case 1:
        return <StepLocation data={formData} onChange={updateFormData} />;
      case 2:
        return (
          <StepPricing
            data={formData}
            onChange={updateFormData}
            bookingCommissionBps={bookingCommissionBps}
          />
        );
      case 3:
        return <StepOffsite data={formData} onChange={updateFormData} />;
      case 4:
        return <StepAmenities data={formData} onChange={updateFormData} />;
      case 5:
        return <StepConnectivity data={formData} onChange={updateFormData} />;
      case 6:
        return <StepPhotos data={formData} onChange={updateFormData} />;
      case 7:
        return <StepAvailability data={formData} onChange={updateFormData} />;
      case 8:
        return <StepReview data={formData} />;
      default:
        return null;
    }
  };

  return (
    <div>
      <WizardSteps currentStep={step} onStepClick={goToStep} />

      <div className="rounded-lg border bg-white p-6">{renderStep()}</div>

      {/* Navigation */}
      <div className="mt-6 flex items-center justify-between">
        <Button
          variant="outline"
          onClick={prevStep}
          disabled={isFirstStep || isPending}
        >
          Back
        </Button>

        <div className="flex gap-2">
          {isLastStep && (
            <>
              <Button
                variant="outline"
                onClick={handleSaveDraft}
                disabled={isPending || saving}
              >
                {saving ? "Saving..." : "Save as Draft"}
              </Button>
              <Button
                onClick={handleSubmitForReview}
                disabled={isPending || saving}
              >
                {saving ? "Submitting..." : "Submit for Review"}
              </Button>
            </>
          )}
          {!isLastStep && (
            <Button onClick={handleContinue} disabled={isPending}>
              Continue
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
