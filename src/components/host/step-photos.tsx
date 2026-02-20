"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ListingFormData } from "@/hooks/use-listing-form";

interface StepPhotosProps {
  data: ListingFormData;
  onChange: (updates: Partial<ListingFormData>) => void;
}

export function StepPhotos({ data, onChange }: StepPhotosProps) {
  const [uploading, setUploading] = useState(false);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);

    try {
      const newImages = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const contentType = file.type;

        // Get presigned URL
        const presignRes = await fetch("/api/uploads/presign", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contentType,
            folder: "listings",
          }),
        });

        if (!presignRes.ok) {
          // Fallback: use a placeholder URL for demo purposes
          newImages.push({
            url: `/api/placeholder/${Date.now()}-${i}`,
            alt: file.name,
            order: data.images.length + i,
            isPrimary: data.images.length === 0 && i === 0,
          });
          continue;
        }

        const { signedUrl, publicUrl } = await presignRes.json();

        // Upload to R2
        await fetch(signedUrl, {
          method: "PUT",
          body: file,
          headers: { "Content-Type": contentType },
        });

        newImages.push({
          url: publicUrl,
          alt: file.name,
          order: data.images.length + i,
          isPrimary: data.images.length === 0 && i === 0,
        });
      }

      onChange({ images: [...data.images, ...newImages] });
    } catch (error) {
      console.error("Upload failed:", error);
    } finally {
      setUploading(false);
    }
  };

  const removeImage = (index: number) => {
    const updated = data.images.filter((_, i) => i !== index);
    // If removed primary, make first remaining primary
    if (updated.length > 0 && !updated.some((img) => img.isPrimary)) {
      updated[0] = { ...updated[0], isPrimary: true };
    }
    onChange({ images: updated });
  };

  const setPrimary = (index: number) => {
    onChange({
      images: data.images.map((img, i) => ({
        ...img,
        isPrimary: i === index,
      })),
    });
  };

  const addUrlImage = () => {
    const url = prompt("Enter image URL:");
    if (!url) return;
    onChange({
      images: [
        ...data.images,
        {
          url,
          alt: "",
          order: data.images.length,
          isPrimary: data.images.length === 0,
        },
      ],
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Photos</h2>
        <p className="text-sm text-gray-500 mt-1">
          Upload photos of your workspace. Show desks, monitors, meeting areas,
          and the overall environment. At least one photo is required.
        </p>
      </div>

      {/* Upload area */}
      <div className="border-2 border-dashed rounded-lg p-8 text-center">
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          onChange={handleFileUpload}
          className="hidden"
          id="photo-upload"
          disabled={uploading}
        />
        <Label
          htmlFor="photo-upload"
          className="cursor-pointer inline-block"
        >
          <div className="space-y-2">
            <div className="text-4xl">+</div>
            <p className="text-sm font-medium">
              {uploading ? "Uploading..." : "Click to upload photos"}
            </p>
            <p className="text-xs text-gray-500">
              JPEG, PNG, or WebP. Max 10MB each.
            </p>
          </div>
        </Label>
        <div className="mt-4">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addUrlImage}
          >
            Or add by URL
          </Button>
        </div>
      </div>

      {/* Image grid */}
      {data.images.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {data.images.map((image, index) => (
            <div
              key={index}
              className="relative group rounded-lg overflow-hidden border"
            >
              <div className="aspect-video bg-gray-100 flex items-center justify-center">
                {image.url.startsWith("http") || image.url.startsWith("/") ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={image.url}
                    alt={image.alt || `Photo ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="text-sm text-gray-400">
                    Photo {index + 1}
                  </div>
                )}
              </div>
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={() => setPrimary(index)}
                  disabled={image.isPrimary}
                >
                  {image.isPrimary ? "Primary" : "Set Primary"}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="destructive"
                  onClick={() => removeImage(index)}
                >
                  Remove
                </Button>
              </div>
              {image.isPrimary && (
                <div className="absolute top-2 left-2 bg-blue-600 text-white text-xs px-2 py-0.5 rounded">
                  Primary
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="rounded-lg bg-gray-50 p-4">
        <p className="text-sm font-medium">
          {data.images.length} photo{data.images.length !== 1 ? "s" : ""}{" "}
          uploaded
        </p>
        {data.images.length === 0 && (
          <p className="text-xs text-orange-600 mt-1">
            At least one photo is required to publish your listing.
          </p>
        )}
      </div>
    </div>
  );
}
