import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function VerifyPage() {
  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">Check your email</CardTitle>
        <CardDescription>
          We sent you a magic link to sign in
        </CardDescription>
      </CardHeader>
      <CardContent className="text-center">
        <p className="text-gray-600">
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
