import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function VerifyPage() {
  return (
    <Card className="w-full max-w-md border-slate-200 bg-white/95 shadow-lg">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl text-[var(--ww-primary-blue)]">Check your email</CardTitle>
        <CardDescription>We sent a secure magic link to complete sign in.</CardDescription>
      </CardHeader>
      <CardContent className="text-center">
        <p className="text-[var(--ww-text-primary)]">
          Click the link in your email to sign in to WayWork.
          The link will expire in 24 hours.
        </p>
        <p className="mt-4 text-sm text-gray-500">
          Didn&apos;t receive the email? Check your spam folder or try again.
        </p>
      </CardContent>
    </Card>
  );
}
