"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { createReview } from "@/actions/review";

interface ReviewFormProps {
  bookingId: string;
}

function StarRating({
  label,
  value,
  onChange,
  required,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  required?: boolean;
}) {
  const [hover, setHover] = useState(0);

  return (
    <div className="flex items-center justify-between">
      <Label className="text-sm">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </Label>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            aria-label={`${label}: ${star} star${star > 1 ? "s" : ""}`}
            aria-pressed={star <= value}
            onClick={() => onChange(star)}
            onMouseEnter={() => setHover(star)}
            onMouseLeave={() => setHover(0)}
            className={`text-2xl transition-colors ${
              star <= (hover || value)
                ? "text-yellow-400"
                : "text-gray-200"
            }`}
          >
            ★
          </button>
        ))}
      </div>
    </div>
  );
}

export function ReviewForm({ bookingId }: ReviewFormProps) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [overallRating, setOverallRating] = useState(0);
  const [wifiAccuracy, setWifiAccuracy] = useState(0);
  const [quietness, setQuietness] = useState(0);
  const [deskSetup, setDeskSetup] = useState(0);
  const [cleanliness, setCleanliness] = useState(0);
  const [comment, setComment] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (overallRating === 0) {
      toast.error("Please provide an overall rating");
      return;
    }

    setSubmitting(true);
    try {
      await createReview({
        bookingId,
        targetType: "LISTING",
        overallRating,
        wifiAccuracy: wifiAccuracy || undefined,
        quietness: quietness || undefined,
        deskSetup: deskSetup || undefined,
        cleanliness: cleanliness || undefined,
        comment: comment.trim() || undefined,
      });

      toast.success("Review submitted! Thank you for your feedback.");
      router.push(`/bookings/${bookingId}`);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to submit review"
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Overall Rating</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <StarRating
            label="Overall Experience"
            value={overallRating}
            onChange={setOverallRating}
            required
          />

          <Separator />

          <div>
            <h3 className="font-medium mb-4 text-sm text-gray-500 uppercase tracking-wide">
              Work-Specific Ratings (Optional)
            </h3>
            <div className="space-y-4">
              <StarRating
                label="WiFi Accuracy"
                value={wifiAccuracy}
                onChange={setWifiAccuracy}
              />
              <StarRating
                label="Quietness"
                value={quietness}
                onChange={setQuietness}
              />
              <StarRating
                label="Desk Setup"
                value={deskSetup}
                onChange={setDeskSetup}
              />
              <StarRating
                label="Cleanliness"
                value={cleanliness}
                onChange={setCleanliness}
              />
            </div>
          </div>

          <Separator />

          <div className="space-y-2">
            <Label htmlFor="comment">Your Review (Optional)</Label>
            <Textarea
              id="comment"
              placeholder="Tell others about your experience working here..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={4}
            />
            <p className="text-xs text-gray-500">
              {comment.length}/2000 characters
            </p>
          </div>

          <Button
            type="submit"
            className="w-full"
            size="lg"
            disabled={submitting || overallRating === 0}
          >
            {submitting ? "Submitting..." : "Submit Review"}
          </Button>
        </CardContent>
      </Card>
    </form>
  );
}
