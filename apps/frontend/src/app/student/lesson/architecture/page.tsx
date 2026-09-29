"use client";

import { Suspense, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";

/*
 * Architecture is rendered by the lesson screen (/student/lesson/[id]) from the
 * lesson's own data. This older route only forwards there, so any saved link
 * still works without a hard-coded lesson URL or a nested student layout.
 */
function ArchitectureContent() {
    const searchParams = useSearchParams();
    const router = useRouter();

    const lessonId = searchParams.get("lessonId");
    const grade = searchParams.get("grade");

    useEffect(() => {
        if (!lessonId) return;
        const query = grade ? `?grade=${encodeURIComponent(grade)}` : "";
        router.replace(`/student/lesson/${encodeURIComponent(lessonId)}${query}`);
    }, [lessonId, grade, router]);

    if (!lessonId) {
        return (
            <main className="lesson-error">
                <h1>Architecture not available</h1>
                <button onClick={() => router.back()}>
                    ← Back to Lesson
                </button>
            </main>
        );
    }

    return <ArchitectureLoading />;
}

function ArchitectureLoading() {
    return (
        <main
            style={{
                minHeight: "100vh",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
            }}
        >
            <h2>Loading architecture...</h2>
        </main>
    );
}

export default function ArchitecturePage() {
    return (
        <Suspense fallback={<ArchitectureLoading />}>
            <ArchitectureContent />
        </Suspense>
    );
}
