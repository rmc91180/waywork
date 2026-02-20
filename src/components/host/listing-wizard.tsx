"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { WizardSteps } from "@/components/host/wizard-steps";
import { StepBasics } from "@/components/host/step-basics";
import { StepLocation } from "@/components/host/step-location";
import { StepPricing } from "@/components/host/step-pricing";
import { StepAmenities } from "@/components/host/step-amenities";
import { StepConnectivity } from "@/components/host/step-connectivity";
import { StepPhotos } from "@/components/host/step-photos";
import { StepAvailability } from "@/components/host/step-availability";
import { StepReview } from "@/components/host/step-review";
import { useListingForm, type ListingFormData } from "@/hooks/use-listing-form";
import { saveCompleteListing, updateCompleteListing } from "@/actions/listing";
import { toast } from "sonner";
import type {
  CancellationPolicy,
  WorkspaceType,
} from "@/generated/prisma";

interface ListingWizardProps {
  mode: "create" | "edit";
  listingId?: string;
  initialData?: Partial<ListingFormData>;
}

export function ListingWizard({
  mode,
  listingId,
  initialData,
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

  const handleSaveDraft = () => {
    setSaving(true);
    startTransition(async () => {
      try {
        if (mode === "edit" && listingId) {
          await updateCompleteListing(listingId, {
            listing: {
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
              pricePerDay: formData.pricePerDay,
              cleaningFee: formData.cleaningFee,
              currency: "USD",
              cancellationPolicy:
                formData.cancellationPolicy as CancellationPolicy,
            },
            connectivity: formData.connectivity,
            amenities: formData.amenities,
            images: formData.images,
            availability: formData.availability,
            blockedDates: formData.blockedDates,
          });
        } else {
          await saveCompleteListing({
            listing: {
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
              pricePerDay: formData.pricePerDay,
              cleaningFee: formData.cleaningFee,
              currency: "USD",
              cancellationPolicy:
                formData.cancellationPolicy as CancellationPolicy,
            },
            connectivity: formData.connectivity,
            amenities: formData.amenities,
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
    setSaving(true);
    startTransition(async () => {
      try {
        await saveCompleteListing({
          listing: {
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
            pricePerDay: formData.pricePerDay,
            cleaningFee: formData.cleaningFee,
            currency: "USD",
            cancellationPolicy:
              formData.cancellationPolicy as CancellationPolicy,
          },
          connectivity: formData.connectivity,
          amenities: formData.amenities,
          images: formData.images,
          availability: formData.availability,
          blockedDates: formData.blockedDates,
          submitForReview: true,
        });
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

  const renderStep = () => {
    switch (step) {
      case 0:
        return <StepBasics data={formData} onChange={updateFormData} />;
      case 1:
        return <StepLocation data={formData} onChange={updateFormData} />;
      case 2:
        return <StepPricing data={formData} onChange={updateFormData} />;
      case 3:
        return <StepAmenities data={formData} onChange={updateFormData} />;
      case 4:
        return <StepConnectivity data={formData} onChange={updateFormData} />;
      case 5:
        return <StepPhotos data={formData} onChange={updateFormData} />;
      case 6:
        return <StepAvailability data={formData} onChange={updateFormData} />;
      case 7:
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
            <Button onClick={nextStep} disabled={isPending}>
              Continue
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
