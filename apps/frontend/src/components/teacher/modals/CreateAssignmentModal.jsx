"use client";

import { useState } from "react";
import Modal from "../Modal";
import { Button, Input, Label, Select } from "../ui";
import { useData } from "@/context/TeacherDataContext";
import { createAssignment } from "@/data/teacher/assignments";
import { ClipboardList } from "lucide-react";

const TYPES = ["Homework", "Worksheet", "Quiz", "Practice", "Project"];

/** Today in YYYY-MM-DD, for the date input's floor. */
function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

/**
 * `classes` are the teacher's real ClassGroup rows from /api/teacher/me — the
 * ids the API validates against. The previous version listed console seed data,
 * whose ids no class in the database has.
 */
export default function CreateAssignmentModal({
  open,
  onClose,
  classes = [],
  defaultClassId,
  onCreated,
}) {
  const { notify } = useData();

  const [title, setTitle] = useState("");
  const [chosenClassId, setChosenClassId] = useState("");
  const [type, setType] = useState("Homework");
  const [due, setDue] = useState("");
  const [description, setDescription] = useState("");
  const [totalQuestions, setTotalQuestions] = useState("");
  const [points, setPoints] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  // Classes load asynchronously, so the selection is derived rather than
  // copied into state by an effect: the teacher's explicit choice wins, then
  // the caller's default, then the first class once the list arrives.
  const classId = chosenClassId || defaultClassId || classes[0]?.id || "";

  const close = () => {
    setError(null);
    onClose();
  };

  const submit = async (e) => {
    e.preventDefault();
    if (saving) return;

    if (!title.trim()) return setError("Give the assignment a title.");
    if (!classId) return setError("Pick a class to assign it to.");
    if (!due) return setError("Pick a due date — students see it on their card.");

    setSaving(true);
    setError(null);

    const result = await createAssignment({
      title: title.trim(),
      classId,
      type,
      dueDate: due,
      ...(description.trim() ? { description: description.trim() } : {}),
      ...(totalQuestions ? { totalQuestions: Number(totalQuestions) } : {}),
      ...(points ? { points: Number(points) } : {}),
    });

    setSaving(false);

    if (!result.success) {
      setError(result.message);
      return;
    }

    notify(result.message);
    setTitle("");
    setDue("");
    setDescription("");
    setTotalQuestions("");
    setPoints("");
    onCreated?.();
    close();
  };

  return (
    <Modal
      open={open}
      onClose={close}
      title="Create assignment"
      subtitle="Assign homework, a worksheet, or a practice set. Students see it immediately."
    >
      <form onSubmit={submit} className="space-y-4">
        {error && (
          <p className="text-[12.5px] font-medium text-coral bg-coral-tint border border-coral/20 rounded-lg px-3 py-2">
            {error}
          </p>
        )}

        <div>
          <Label>Title</Label>
          <Input
            placeholder="e.g. Decimals Practice Set"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            autoFocus
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Class</Label>
            <Select value={classId} onChange={(e) => setChosenClassId(e.target.value)}>
              {classes.length === 0 && <option value="">No classes available</option>}
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.className}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Type</Label>
            <Select value={type} onChange={(e) => setType(e.target.value)}>
              {TYPES.map((t) => <option key={t}>{t}</option>)}
            </Select>
          </div>
        </div>

        {/* A real date, not free text: the student console sorts and flags
            overdue work by this value, which "Fri, Aug 14" cannot express. */}
        <div>
          <Label>Due date</Label>
          <Input type="date" min={todayISO()} value={due} onChange={(e) => setDue(e.target.value)} />
        </div>

        <div>
          <Label>Instructions <span className="font-normal text-ink/40">(optional)</span></Label>
          <Input
            placeholder="What should students do?"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Questions <span className="font-normal text-ink/40">(optional)</span></Label>
            <Input
              type="number"
              min="0"
              placeholder="e.g. 10"
              value={totalQuestions}
              onChange={(e) => setTotalQuestions(e.target.value)}
            />
          </div>
          <div>
            <Label>Points <span className="font-normal text-ink/40">(optional)</span></Label>
            <Input
              type="number"
              min="0"
              placeholder="e.g. 50"
              value={points}
              onChange={(e) => setPoints(e.target.value)}
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={close}>Cancel</Button>
          <Button type="submit" disabled={saving || classes.length === 0}>
            <ClipboardList size={15} /> {saving ? "Assigning…" : "Assign to class"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
