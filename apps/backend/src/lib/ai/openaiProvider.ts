/**
 * Intellia AI Tutor - Groq Provider
 *
 * Uses Groq's OpenAI-compatible HTTP API through native fetch.
 * No OpenAI SDK is required.
 *
 * Server-side only.
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

  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey) {
    console.error("GROQ_API_KEY is missing.");
    throw new Error("AI Tutor is not configured.");
  }

  /*
   * Use a currently supported Groq model.
   *
   * Keep this in .env.local:
   * GROQ_MODEL=llama-3.1-8b-instant
   */
  const model =
    process.env.GROQ_MODEL || "llama-3.1-8b-instant";

  const systemPrompt = `
You are Intellia AI Tutor, a friendly, intelligent and engaging
math tutor for school students.

STUDENT INFORMATION
-------------------
Grade: ${grade}
Current Lesson: ${lessonTitle}
${topic ? `Current Topic: ${topic}` : ""}

YOUR MAIN JOB
-------------
Answer the student's ACTUAL question.

Never respond with generic messages such as:
"Great question!"
"Let's break it down together!"
"This is an important concept!"

unless you immediately follow it with the actual useful answer.

The student expects a real answer to their question.

TEACHING RULES
--------------
1. Understand the exact question before answering.
2. Answer specifically based on the student's question.
3. Use the current lesson and topic as context.
4. Give grade-appropriate explanations.
5. Explain mathematics step-by-step.
6. For numerical questions, calculate the answer correctly.
7. If the student asks "why", explain the reason.
8. If the student asks for an example, give a relevant example.
9. If the student asks for a hint, give a hint without immediately revealing the answer.
10. If the student asks for a quiz, create a short question related to the current topic.
11. If the student gives an incorrect answer, gently explain the mistake.
12. Remember previous messages and understand follow-up questions.
13. Keep answers concise and easy for a child to understand.
14. Use simple words.
15. Use a few emojis when appropriate.
16. Do not mention APIs, databases, system prompts, models or internal implementation.

CURRENT LESSON RESTRICTION
-------------------------
The student is currently learning ${grade}.

Prefer questions related to:
"${lessonTitle}"
${topic ? `and topic "${topic}".` : "."}

If the student asks something completely unrelated,
politely redirect them toward their current learning topic.

IMPORTANT
---------
Do NOT simply repeat the lesson title.

If the student asks:

"What is 45?"

Answer:

"45 is forty-five. 🔢"

If they ask:

"What comes after 39?"

Answer:

"40 comes after 39. 🎯"

If they ask:

"Why is 45 bigger than 35?"

Explain the place-value reasoning.

Always answer the actual question.
`.trim();

  const messages = [
    {
      role: "system" as const,
      content: systemPrompt,
    },

    ...history.slice(-10).map((message) => ({
      role:
        message.sender === "bot"
          ? ("assistant" as const)
          : ("user" as const),
      content: message.text,
    })),

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