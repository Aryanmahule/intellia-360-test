"use client";

import { useState } from "react";
import { Bell, Lock } from "lucide-react";
import { useData } from "@/context/TeacherDataContext";
import { Card, CardHeader, Avatar, Input, Label, Button } from "@/components/teacher/ui";

function Toggle({ checked, onChange, label }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`w-10 h-6 rounded-full relative transition-colors ${checked ? "bg-violet" : "bg-black/15"}`}
    >
      <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${checked ? "translate-x-4" : ""}`} />
    </button>
  );
}

export default function Settings() {
  const { teacher, notify } = useData();
  const [prefs, setPrefs] = useState({ email: true, digest: true, parentMsgs: true, sound: false });

  // AuthContext restores the session after mount, so these fields track the
  // signed-in teacher until the user types — deriving rather than mirroring
  // into state means there is nothing to re-sync when the session lands.
  const [nameDraft, setNameDraft] = useState(null);
  const [schoolDraft, setSchoolDraft] = useState(null);
  const name = nameDraft ?? teacher.name;
  const school = schoolDraft ?? teacher.school;

  const save = (e) => {
    e.preventDefault();
    notify("Profile settings saved");
  };

  return (
    <div className="space-y-5 max-w-2xl">
      <Card>
        <CardHeader eyebrow="Profile" title="Your details" />
        <form onSubmit={save} className="px-5 pb-5 space-y-4">
          <div className="flex items-center gap-3">
            <Avatar name={name} initials={teacher.initials} size={56} />
            <Button type="button" variant="secondary" size="sm">Change photo</Button>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <Label>Full name</Label>
              <Input value={name} onChange={(e) => setNameDraft(e.target.value)} />
            </div>
            <div>
              <Label>School</Label>
              <Input value={school} onChange={(e) => setSchoolDraft(e.target.value)} />
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <Label>Account email</Label>
              <Input value={teacher.email ?? "—"} disabled className="opacity-60" />
            </div>
            <div>
              <Label>Class code</Label>
              <Input value={teacher.classCode} disabled className="opacity-60" />
            </div>
          </div>
          <Button type="submit">Save changes</Button>
        </form>
      </Card>

      <Card>
        <CardHeader eyebrow="Preferences" title="Notifications" />
        <div className="px-5 pb-5 divide-y divide-black/[0.05]">
          {[
            { key: "email", label: "Email me daily class summaries", icon: Bell },
            { key: "digest", label: "Weekly progress digest", icon: Bell },
            { key: "parentMsgs", label: "Alert me on new parent messages", icon: Bell },
            { key: "sound", label: "Notification sounds", icon: Bell },
          ].map(({ key, label, icon: Icon }) => (
            <div key={key} className="flex items-center justify-between py-3">
              <div className="flex items-center gap-2.5">
                <Icon size={15} className="text-ink/40" />
                <span className="text-[13px]">{label}</span>
              </div>
              <Toggle label={label} checked={prefs[key]} onChange={(v) => setPrefs((p) => ({ ...p, [key]: v }))} />
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <CardHeader eyebrow="Security" title="Account" />
        <div className="px-5 pb-5 space-y-2.5">
          <Button variant="secondary" className="w-full justify-center"><Lock size={14} /> Change password</Button>
          <Button variant="ghost" className="w-full justify-center text-coral">Sign out of all devices</Button>
        </div>
      </Card>
    </div>
  );
}
