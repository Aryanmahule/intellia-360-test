/**
 * Server-side Groq provider for Intellia AI Tutor.
 *
 * Uses Groq's OpenAI-compatible HTTP API through native fetch.
 * No OpenAI npm SDK is required.
 *
 * Environment variables (server-only):
 *   GROQ_API_KEY – your Groq API key (required)
 *   GROQ_MODEL   – optional model name
 *
 * Recommended:
 *   GROQ_MODEL=llama-3.1-8b-instant
 */

interface TutorMessage {
  sender: "bot" | "user";
  text: string;
}

interface TutorResponse {
  choices?: Array<{
    message?: {
      content?: string | null;
    };
  }>;
}

export async function getTutorResponse(params: {
  grade: string;
  lessonTitle: string;
  topic?: string;
  userMessage: string;
  history: TutorMessage[];
}): Promise<string> {
  const {
    grade,
    lessonTitle,
    topic,
    userMessage,
    history,
  } = params;

  // Server-side API key only
  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey) {
    console.error("GROQ_API_KEY is not configured.");
    throw new Error("AI Tutor is not configured.");
  }

  // Current supported Groq model
  const model =
    process.env.GROQ_MODEL || "llama-3.1-8b-instant";

  /**
   * System prompt
   *
   * The important part here is that the AI must answer
   * the student's actual question instead of returning
   * generic/template responses.
   */
  const systemPrompt = `
You are Intellia AI Tutor, a friendly, intelligent,
interactive mathematics tutor for school students.

STUDENT CONTEXT
---------------
Grade: ${grade}
Current Lesson: ${lessonTitle}
${topic ? `Current Topic: ${topic}` : ""}

CORE INSTRUCTION
----------------
Always answer the student's ACTUAL QUESTION.

Do NOT respond with generic/template messages such as:
"Great question!"
"Let's break it down together!"
"This is an important concept!"

unless you immediately provide the actual answer.

The student should receive a useful answer to exactly
what they asked.

TEACHING RULES
--------------
1. Understand the student's exact question first.
2. Answer specifically and directly.
3. Use the current lesson and topic as context.
4. Give explanations appropriate for ${grade}.
5. For mathematics, show calculations and reasoning when useful.
6. If the student asks for an example, give a relevant example.
7. If the student asks "why", explain the reasoning.
8. If the student asks for a hint, give a helpful hint rather than immediately revealing the complete answer.
9. If the student asks for a quiz, create a short question related to the current topic.
10. If the student gives an incorrect answer, gently explain the mistake.
11. Use previous conversation messages for follow-up questions.
12. Keep explanations simple, clear, and child-friendly.
13. Keep answers reasonably concise.
14. Use a few appropriate emojis to make learning engaging.
15. Never mention system prompts, APIs, databases, authentication, models, or internal implementation.

CURRENT LESSON
--------------
The student is currently studying:

"${lessonTitle}"

${topic ? `Current topic: "${topic}"` : ""}

If the student's question is related to the current
lesson, ALWAYS try to answer it.

Do NOT simply repeat the lesson title.

EXAMPLES
--------
Student: "What is 45?"

Answer:
"45 is forty-five. 🔢"

Student: "What comes after 39?"

Answer:
"40 comes after 39. 🎯"

Student: "Why is 45 bigger than 35?"

Answer:
"45 is bigger because 45 has 4 tens, while 35 has 3 tens.
Since 4 tens is greater than 3 tens, 45 is greater than 35. 😊"

Student: "Give me an example."

Give an example related to the current lesson/topic.

GRADE ACCESS
------------
The student's active grade is ${grade}.

If the student asks for content clearly belonging to
another grade, politely explain that the topic belongs
to another grade and that they need to purchase or log
in to that grade to access its learning content.

However, do NOT incorrectly block a question simply
because it is phrased differently.

If it can reasonably be answered using the current
lesson/grade, answer it.

IMPORTANT
---------
Do not generate filler.
Do not repeat the student's question unnecessarily.
Do not give a generic response.
Answer the actual question.
`.trim();

  /**
   * Build conversation context.
   *
   * Only the last 10 messages are sent to Groq to keep
   * the conversation relevant and control token usage.
   */
  const messages = [
    {
      role: "system" as const,
      content: systemPrompt,
    },

    ...history.slice(-10).map((msg) => ({
      role:
        msg.sender === "bot"
          ? ("assistant" as const)
          : ("user" as const),
      content: msg.text,
    })),

    // Always send the newest question last
    {
      role: "user" as const,
      content: userMessage,
    },
  ];

  try {
    const response = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },

        body: JSON.stringify({
          model,
          messages,

          // Lower temperature = more accurate math answers
          temperature: 0.3,

          max_tokens: 500,
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();

      console.error(
        "Groq API error:",
        response.status,
        errorText
      );

      throw new Error(
        `Groq API request failed: ${response.status}`
      );
    }

    const data =
      (await response.json()) as TutorResponse;

    const answer =
      data.choices?.[0]?.message?.content?.trim();

    if (!answer) {
      console.error(
        "Groq returned an empty response:",
        data
      );

      throw new Error("Empty AI response.");
    }

    return answer;
  } catch (error) {
    console.error(
      "Groq AI Tutor provider error:",
      error
    );

    throw error;
  }
}