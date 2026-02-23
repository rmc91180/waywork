"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

interface AdminUserRoleSelectProps {
  userId: string;
  currentRole: string;
  isCurrentUser: boolean;
}

export function AdminUserRoleSelect({
  userId,
  currentRole,
  isCurrentUser,
}: AdminUserRoleSelectProps) {
  const router = useRouter();
  const [updating, setUpdating] = useState(false);

  async function handleChange(newRole: string) {
    if (newRole === currentRole) return;
    setUpdating(true);
    try {
      const { updateUserRole } = await import("@/actions/admin");
      await updateUserRole(userId, newRole as "GUEST" | "HOST" | "ADMIN");
      toast.success(`Role updated to ${newRole}`);
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to update role"
      );
    } finally {
      setUpdating(false);
    }
  }

  if (isCurrentUser) {
    return (
      <span className="text-xs text-gray-400 italic">You</span>
    );
  }

  return (
    <select
      value={currentRole}
      onChange={(e) => handleChange(e.target.value)}
      disabled={updating}
      className="text-xs border rounded px-2 py-1 bg-white disabled:opacity-50"
    >
      <option value="GUEST">Guest</option>
      <option value="HOST">Host</option>
      <option value="ADMIN">Admin</option>
    </select>
  );
}
