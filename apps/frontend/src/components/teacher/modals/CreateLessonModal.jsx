"use client";

import { useState } from "react";
import Modal from "../Modal";
import { Button, Input, Label, Select } from "../ui";
import { useData } from "@/context/TeacherDataContext";
import { BookOpen } from "lucide-react";

export default function CreateLessonModal({ open, onClose, onCreate }) {
  const { courses } = useData();
  const [title, setTitle] = useState("");
  const [courseId, setCourseId] = useState(courses[0]?.id);
  const [type, setType] = useState("video");
  const [duration, setDuration] = useState("10 min");

  const submit = (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    onCreate({
      id: `custom-${Date.now()}`,
      title: title.trim(),
      type,
      duration,
      status: "draft",
      grade: courses.find((c) => c.id === courseId)?.grade,
      chapter: "My Lessons",
    });
    setTitle("");
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title="Create a lesson" subtitle="Draft it now, publish it to the class when ready.">
      <form onSubmit={submit} className="space-y-4">
        <div>
          <Label>Lesson title</Label>
          <Input placeholder="e.g. Comparing Fractions" value={title} onChange={(e) => setTitle(e.target.value)} autoFocus />
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-2">
            <Label>Course</Label>
            <Select value={courseId} onChange={(e) => setCourseId(e.target.value)}>
              {courses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
            </Select>
          </div>
          <div>
            <Label>Format</Label>
            <Select value={type} onChange={(e) => setType(e.target.value)}>
              <option value="video">Video</option>
              <option value="interactive">Interactive</option>
              <option value="text">Text</option>
            </Select>
          </div>
        </div>
        <div>
          <Label>Estimated duration</Label>
          <Input value={duration} onChange={(e) => setDuration(e.target.value)} />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit"><BookOpen size={15} /> Save as draft</Button>
        </div>
      </form>
    </Modal>
  );
}
