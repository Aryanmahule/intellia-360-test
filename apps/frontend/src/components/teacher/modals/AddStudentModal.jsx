"use client";

import { useState } from "react";
import Modal from "../Modal";
import { Button, Input, Label, Select } from "../ui";
import { useData } from "@/context/TeacherDataContext";
import { UserPlus } from "lucide-react";

export default function AddStudentModal({ open, onClose, defaultClassId }) {
  const { classes, addStudent, notify } = useData();
  const [name, setName] = useState("");
  const [classId, setClassId] = useState(defaultClassId || classes[0]?.id);

  const submit = (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    addStudent({ name: name.trim(), classId });
    notify(`${name.trim()} was added to the class`);
    setName("");
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title="Add a student" subtitle="They'll appear in the roster right away.">
      <form onSubmit={submit} className="space-y-4">
        <div>
          <Label>Full name</Label>
          <Input placeholder="e.g. Arjun Mehta" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
        </div>
        <div>
          <Label>Class</Label>
          <Select value={classId} onChange={(e) => setClassId(e.target.value)}>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </Select>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit"><UserPlus size={15} /> Add student</Button>
        </div>
      </form>
    </Modal>
  );
}
