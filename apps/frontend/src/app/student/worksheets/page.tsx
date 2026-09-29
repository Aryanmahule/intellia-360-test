import Link from "next/link";

// Worksheets have no content source yet. The route used to render an empty
// panel; it now says so and points to where students' work does live.
export default function StudentWorksheetsPage() {
  return (
    <section
      style={{
        maxWidth: 560,
        margin: "48px auto",
        padding: "36px 32px",
        borderRadius: 24,
        background: "#ffffff",
        border: "1px solid #e2e8f0",
        boxShadow: "0 18px 45px rgba(15, 23, 42, 0.06)",
        textAlign: "center",
      }}
    >
      <div aria-hidden="true" style={{ fontSize: 40 }}>📝</div>
      <h1 style={{ margin: "12px 0 0", color: "#172554", fontSize: 26, fontWeight: 800 }}>
        Worksheets are coming soon
      </h1>
      <p style={{ margin: "10px 0 0", color: "#64748b", fontSize: 15, lineHeight: 1.6 }}>
        Printable practice sheets for your lessons will appear here. Until then, work from
        your teacher is in Assignments and extra practice is in Quizzes.
      </p>
      <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 10, marginTop: 22 }}>
        <Link
          href="/student/assignments"
          style={{ padding: "11px 18px", borderRadius: 12, background: "#2563eb", color: "#ffffff", fontWeight: 700, textDecoration: "none" }}
        >
          Go to Assignments
        </Link>
        <Link
          href="/student/quiz"
          style={{ padding: "11px 18px", borderRadius: 12, border: "1px solid #bfdbfe", color: "#2563eb", fontWeight: 700, textDecoration: "none" }}
        >
          Practice Quizzes
        </Link>
      </div>
    </section>
  );
}
