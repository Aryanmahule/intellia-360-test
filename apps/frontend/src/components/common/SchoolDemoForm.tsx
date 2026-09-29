"use client";

import { useState, type ChangeEvent, type FormEvent } from "react";

const CONTACT_EMAIL = "contact@intellia360.com";

const ROLES = [
  "Principal / School Leader",
  "Teacher",
  "School Administrator",
  "Coaching Centre",
  "Parent",
  "Other",
];

interface DemoRequest {
  name: string;
  email: string;
  phone: string;
  school: string;
  role: string;
  grades: string;
  message: string;
}

type Field = keyof DemoRequest;
type Errors = Partial<Record<Field, string>>;

const EMPTY: DemoRequest = {
  name: "",
  email: "",
  phone: "",
  school: "",
  role: ROLES[0],
  grades: "",
  message: "",
};

function validate(values: DemoRequest): Errors {
  const errors: Errors = {};
  if (!values.name.trim()) errors.name = "Please enter your name.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())) {
    errors.email = "Please enter a valid email address.";
  }
  if (!values.school.trim()) errors.school = "Please enter your school or organisation.";
  return errors;
}

/**
 * Book-a-demo form for /schools.
 *
 * There is no lead-capture endpoint yet, so the form validates the request
 * and hands it to the visitor's email app, addressed and filled in, rather
 * than pretending to submit somewhere.
 */
export default function SchoolDemoForm() {
  const [values, setValues] = useState<DemoRequest>(EMPTY);
  const [errors, setErrors] = useState<Errors>({});
  const [handedOff, setHandedOff] = useState(false);

  const update =
    (field: Field) =>
    (event: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      const { value } = event.target;
      setValues((prev) => ({ ...prev, [field]: value }));
      setErrors((prev) => (prev[field] ? { ...prev, [field]: undefined } : prev));
    };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const found = validate(values);
    setErrors(found);
    const firstInvalid = Object.keys(found)[0];
    if (firstInvalid) {
      document.getElementById(`demo-${firstInvalid}`)?.focus();
      return;
    }

    const details = [
      `Name: ${values.name.trim()}`,
      `Email: ${values.email.trim()}`,
      ...(values.phone.trim() ? [`Phone: ${values.phone.trim()}`] : []),
      `School / organisation: ${values.school.trim()}`,
      `Role: ${values.role}`,
      ...(values.grades.trim() ? [`Grades of interest: ${values.grades.trim()}`] : []),
    ];
    const note = values.message.trim() || "We would like to book a demo of Intellia360 for our school.";
    const subject = `Demo request — ${values.school.trim()}`;

    window.location.href =
      `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(subject)}` +
      `&body=${encodeURIComponent(`${details.join("\n")}\n\n${note}`)}`;
    setHandedOff(true);
  };

  const fieldProps = (field: Field) => ({
    id: `demo-${field}`,
    name: field,
    value: values[field],
    onChange: update(field),
    "aria-invalid": Boolean(errors[field]),
    "aria-describedby": errors[field] ? `demo-${field}-error` : undefined,
  });

  const errorFor = (field: Field) =>
    errors[field] ? (
      <span id={`demo-${field}-error`} className="site-field-error">
        {errors[field]}
      </span>
    ) : null;

  return (
    <form className="site-form" onSubmit={submit} noValidate aria-describedby="demo-form-note">
      <div className="site-field">
        <label htmlFor="demo-name">Your name *</label>
        <input type="text" autoComplete="name" {...fieldProps("name")} />
        {errorFor("name")}
      </div>

      <div className="site-field">
        <label htmlFor="demo-email">Work email *</label>
        <input type="email" autoComplete="email" {...fieldProps("email")} />
        {errorFor("email")}
      </div>

      <div className="site-field">
        <label htmlFor="demo-school">School or organisation *</label>
        <input type="text" autoComplete="organization" {...fieldProps("school")} />
        {errorFor("school")}
      </div>

      <div className="site-field">
        <label htmlFor="demo-phone">Phone (optional)</label>
        <input type="tel" autoComplete="tel" {...fieldProps("phone")} />
      </div>

      <div className="site-field">
        <label htmlFor="demo-role">Your role</label>
        <select {...fieldProps("role")}>
          {ROLES.map((role) => (
            <option key={role} value={role}>
              {role}
            </option>
          ))}
        </select>
      </div>

      <div className="site-field">
        <label htmlFor="demo-grades">Grades of interest (optional)</label>
        <input type="text" placeholder="e.g. Grades 1–5" {...fieldProps("grades")} />
      </div>

      <div className="site-field is-wide">
        <label htmlFor="demo-message">Anything we should know? (optional)</label>
        <textarea
          placeholder="Number of students, preferred dates, questions…"
          {...fieldProps("message")}
        />
      </div>

      <div className="site-form-actions">
        <button type="submit" className="site-btn site-btn--primary">
          Request a Demo →
        </button>
        <p id="demo-form-note" className="site-form-note">
          Opens your email app with the request filled in, addressed to {CONTACT_EMAIL}.
        </p>
      </div>

      {handedOff && (
        <p className="site-form-success" role="status">
          Your email app should now be open with the request ready to send. If nothing
          opened, email us at <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
        </p>
      )}
    </form>
  );
}
