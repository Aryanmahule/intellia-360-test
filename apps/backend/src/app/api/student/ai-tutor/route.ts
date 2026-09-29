import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireStudentSession } from "@/lib/student/require-student-session";
import { db } from "@/lib/db";
import type { AuthResponse } from "@intellia360/shared/types/auth";
import type {
  AiTutorRequest,
  AiTutorResponse,
} from "@intellia360/shared/types/api/aiTutor";
import { getTutorResponse } from "@/lib/ai/groqProvider";

/**
 * POST /api/student/ai-tutor
 *
 * Secure AI Tutor endpoint.
 *
 * Flow:
 * 1. Authenticate student
 * 2. Get student's actual grade from database
 * 3. Validate requested grade
 * 4. Send current lesson + topic + conversation to Groq
 * 5. Return AI response
 */
export async function POST(request: NextRequest) {
  // --------------------------------------------------
  // 1. Authenticate student
  // --------------------------------------------------

  const { session, errorResponse } =
    await requireStudentSession();

  if (errorResponse) {
    return errorResponse;
  }

  // --------------------------------------------------
  // 2. Parse request body
  // --------------------------------------------------

  let body: AiTutorRequest;

  try {
    body = (await request.json()) as AiTutorRequest;
  } catch {
    return NextResponse.json<AuthResponse>(
      {
        success: false,
        message: "Invalid JSON payload",
      },
      {
        status: 400,
      }
    );
  }

  const {
    message,
    grade: requestedGrade,
    lessonId,
    lessonTitle = "",
    topic,
    conversationHistory = [],
  } = body;

  // --------------------------------------------------
  // 3. Basic message validation
  // --------------------------------------------------

  if (!message || !message.trim()) {
    return NextResponse.json<AiTutorResponse>(
      {
        success: false,
        answer: "Please type a question for your AI Tutor. 🤖",
        accessAllowed: true,
      },
      {
        status: 400,
      }
    );
  }

  // --------------------------------------------------
  // 4. Get student's REAL grade from database
  // --------------------------------------------------

  const profile = await db.studentProfile.findUnique({
    where: {
      userId: session.userId,
    },
    select: {
      grade: true,
    },
  });

  const studentGrade = profile?.grade ?? "grade1";

  // --------------------------------------------------
  // 5. Grade access validation
  // --------------------------------------------------
  //
  // Never trust the grade coming from the browser.
  // The database grade is authoritative.
  //

  if (
    requestedGrade &&
    requestedGrade !== studentGrade
  ) {
    const response: AiTutorResponse = {
      success: true,

      answer:
        "🔒 This grade is locked for your account. " +
        "Please log in or purchase this grade to continue learning. 🎓",

      grade: studentGrade,

      lessonId,

      accessAllowed: false,

      requiresPurchase: true,
    };

    return NextResponse.json(response);
  }

  // --------------------------------------------------
  // 6. Limit conversation history
  // --------------------------------------------------

  const trimmedHistory =
    conversationHistory.slice(-10);

  // --------------------------------------------------
  // 7. Call Groq AI Tutor
  // --------------------------------------------------

  try {
    const answer = await getTutorResponse({
      grade: studentGrade,

      lessonTitle,

      topic,

      userMessage: message.trim(),

      history: trimmedHistory,
    });

    // --------------------------------------------------
    // 8. Return successful response
    // --------------------------------------------------

    const response: AiTutorResponse = {
      success: true,

      answer,

      grade: studentGrade,

      lessonId,

      accessAllowed: true,
    };

    return NextResponse.json(response);
  } catch (error) {
    // IMPORTANT:
    // This is Groq, not OpenAI.

    console.error(
      "[AI Tutor] Groq provider error:",
      error
    );

    // --------------------------------------------------
    // 9. Friendly fallback response
    // --------------------------------------------------

    const response: AiTutorResponse = {
      success: false,

      answer:
        "🤖 Oops! I couldn't connect to your AI Tutor right now. " +
        "Please try again in a moment.",
    };

    return NextResponse.json(response, {
      status: 500,
    });
  }
}