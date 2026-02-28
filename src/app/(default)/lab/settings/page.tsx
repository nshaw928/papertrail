"use client";

import { useEffect, useState } from "react";
import { Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useLab } from "../lab-context";

const PERMISSION_LABELS: Record<string, string> = {
  create_collection: "Create collections",
  post_announcement: "Post announcements",
  schedule_journal_club: "Schedule journal club",
  upload_files: "Upload files",
  create_lab_notes: "Create lab notes",
};

const PERMISSION_KEYS = Object.keys(PERMISSION_LABELS);

export default function LabSettingsPage() {
  const { lab } = useLab();
  const [labName, setLabName] = useState(lab.name);
  const [permissions, setPermissions] = useState<Record<string, Record<string, boolean>>>({
    admin: {},
    member: {},
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetchSettings();
  }, [lab.id]);

  async function fetchSettings() {
    setLoading(true);
    try {
      const res = await fetch(`/api/labs/${lab.id}/settings`);
      if (res.ok) {
        const data = await res.json();
        setLabName(data.name);
        if (data.role_permissions) {
          setPermissions(data.role_permissions);
        }
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    setMessage("");
    try {
      const res = await fetch(`/api/labs/${lab.id}/settings`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: labName.trim(),
          role_permissions: permissions,
        }),
      });
      if (res.ok) {
        setMessage("Settings saved");
      } else {
        const data = await res.json().catch(() => ({}));
        setMessage(data.error ?? "Failed to save");
      }
    } finally {
      setSaving(false);
    }
  }

  function togglePermission(role: string, permission: string) {
    setPermissions((prev) => ({
      ...prev,
      [role]: {
        ...prev[role],
        [permission]: !prev[role]?.[permission],
      },
    }));
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <h2 className="text-2xl font-bold tracking-tight">Lab Settings</h2>

      {/* Lab Info */}
      <Card>
        <CardHeader>
          <CardTitle>Lab Info</CardTitle>
          <CardDescription>Update your lab name.</CardDescription>
        </CardHeader>
        <CardContent>
          <Input
            value={labName}
            onChange={(e) => setLabName(e.target.value)}
            placeholder="Lab name"
            maxLength={200}
          />
        </CardContent>
      </Card>

      {/* Role Permissions */}
      <Card>
        <CardHeader>
          <CardTitle>Role Permissions</CardTitle>
          <CardDescription>
            Control what admins and members can do. Owners always have all permissions.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 pr-4 font-medium">Permission</th>
                  <th className="text-center py-2 px-4 font-medium">Admin</th>
                  <th className="text-center py-2 px-4 font-medium">Member</th>
                </tr>
              </thead>
              <tbody>
                {PERMISSION_KEYS.map((key) => (
                  <tr key={key} className="border-b last:border-0">
                    <td className="py-2 pr-4">{PERMISSION_LABELS[key]}</td>
                    <td className="text-center py-2 px-4">
                      <input
                        type="checkbox"
                        checked={permissions.admin?.[key] ?? false}
                        onChange={() => togglePermission("admin", key)}
                        className="h-4 w-4"
                      />
                    </td>
                    <td className="text-center py-2 px-4">
                      <input
                        type="checkbox"
                        checked={permissions.member?.[key] ?? false}
                        onChange={() => togglePermission("member", key)}
                        className="h-4 w-4"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Save */}
      <div className="flex items-center gap-4">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          Save Settings
        </Button>
        {message && (
          <p className="text-sm text-muted-foreground">{message}</p>
        )}
      </div>
    </div>
  );
}
