"use client";

import React, { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useStudentContext } from "@/context/StudentContext";
import { apiFetch } from "@/lib/api";

interface ChatMessage {
  sender: "bot" | "user";
  text: string;
}

interface AITutorResponse {
  success?: boolean;
  answer?: string;
  accessAllowed?: boolean;
  grade?: string;
  lessonId?: string;
  topic?: string;
}

export default function StickyBottomContainer() {
  const { activeLessonData, xpPoints, learningGems } = useStudentContext();
  const searchParams = useSearchParams();

  const [isOpen, setIsOpen] = useState(false);
  const [inputQuery, setInputQuery] = useState("");
  const [isTyping, setIsTyping] = useState(false);

  const lessonTitle =
    activeLessonData?.title || "Your Current Lesson";

  const lessonId =
    (activeLessonData as any)?.lessonId ||
    (activeLessonData as any)?.id ||
    searchParams.get("lessonId") ||
    "";

  const topic =
    (activeLessonData as any)?.topic ||
    (activeLessonData as any)?.topicTitle ||
    "";

  const grade =
    (activeLessonData as any)?.grade ||
    searchParams.get("grade") ||
    "grade1";

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      sender: "bot",
      text: `Hey there! 👋 I'm your Intellia AI Tutor. Ask me anything about ${lessonTitle}! 🚀`,
    },
  ]);

  const popupRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  /* -------------------------------
     Reset when lesson changes
  -------------------------------- */
  useEffect(() => {
    setMessages([
      {
        sender: "bot",
        text: `Hey there! 👋 I'm your Intellia AI Tutor. Ask me anything about ${lessonTitle}! 🚀`,
      },
    ]);
  }, [lessonTitle]);

  /* -------------------------------
     Auto scroll
  -------------------------------- */
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
    });
  }, [messages, isTyping]);

  /* -------------------------------
     Outside click
  -------------------------------- */
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!popupRef.current) return;

      const target = event.target as Node;
      const floatingButton = document.getElementById(
        "ai-tutor-floating-btn"
      );

      if (
        !popupRef.current.contains(target) &&
        !floatingButton?.contains(target)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  /* -------------------------------
     REAL AI SEND
  -------------------------------- */
  const handleSend = async (textToSend?: string) => {
    const text = (textToSend ?? inputQuery).trim();

    if (!text || isTyping) return;

    const previousMessages = messages.slice(-10);

    const userMessage: ChatMessage = {
      sender: "user",
      text,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputQuery("");
    setIsTyping(true);

    try {
      const response = await apiFetch("/api/student/ai-tutor", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: text,
          grade,
          lessonId,
          lessonTitle,
          topic,
          conversationHistory: previousMessages,
        }),
      });

      const data: AITutorResponse = await response.json();

      if (!response.ok || !data.answer) {
        throw new Error("AI Tutor response unavailable");
      }

      setMessages((prev) => [
        ...prev,
        {
          sender: "bot",
          text: data.answer as string,
        },
      ]);
    } catch (error) {
      console.error("AI Tutor error:", error);

      setMessages((prev) => [
        ...prev,
        {
          sender: "bot",
          text:
            "Oops! 🤖 I couldn't connect right now. Please try again in a moment. 💫",
        },
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyDown = (
    event: React.KeyboardEvent<HTMLInputElement>
  ) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="ai-tutor-floating-container">

      {/* =====================================================
          CHAT WINDOW
      ====================================================== */}
      {isOpen && (
        <div
          ref={popupRef}
          className="ai-tutor-popup gamified-ai-popup"
        >

          {/* =================================================
              HEADER
          ================================================== */}
          <header className="ai-gamified-header">

            <div className="ai-header-background-glow" />

            <div className="ai-header-main">

              {/* Robot */}
              <div className="ai-header-robot">
                <RobotMascotSvg />
                <span className="ai-online-dot" />
                <span className="robot-sparkle sparkle-1">✦</span>
                <span className="robot-sparkle sparkle-2">✦</span>
              </div>

              {/* Title */}
              <div className="ai-header-title">
                <h2>
                  Intellia AI Tutor
                  <span>✨</span>
                </h2>

                <p>
                  Your learning buddy 🚀
                  <span className="ai-live">
                    ● Online
                  </span>
                </p>
              </div>

              {/* Close */}
              <button
                className="ai-close-button"
                onClick={() => setIsOpen(false)}
                aria-label="Close AI Tutor"
              >
                ×
              </button>
            </div>

            {/* Stats */}
            <div className="ai-stats-row">

              <div className="ai-stat level-stat">
                <span>🏆</span>
                <div>
                  <small>Level</small>
                  <strong>2</strong>
                </div>
              </div>

              <div className="ai-stat">
                <span>⭐</span>
                <div>
                  <small>XP</small>
                  <strong>{xpPoints}</strong>
                </div>
              </div>

              <div className="ai-stat">
                <span>💎</span>
                <div>
                  <small>Gems</small>
                  <strong>{learningGems}</strong>
                </div>
              </div>

            </div>

            {/* Current lesson */}
            <div className="ai-current-lesson">

              <div className="lesson-icon">
                📚
              </div>

              <div className="lesson-info">
                <span>Currently learning</span>

                <strong title={lessonTitle}>
                  {lessonTitle}
                </strong>

                {topic && (
                  <small>
                    Topic: {topic}
                  </small>
                )}
              </div>

              <div className="lesson-progress">
                <div />
              </div>

            </div>
          </header>


          {/* =================================================
              CHAT BODY
          ================================================== */}
          <main className="ai-chat-body">

            {/* Decorative stars */}
            <div className="chat-star star-a">✦</div>
            <div className="chat-star star-b">✧</div>
            <div className="chat-star star-c">✦</div>
            <div className="chat-star star-d">✧</div>

            <div className="ai-messages">

              {messages.map((msg, idx) => (
                <div
                  key={`${msg.sender}-${idx}`}
                  className={`ai-message-row ${msg.sender}`}
                >

                  {/* AI avatar */}
                  {msg.sender === "bot" && (
                    <div className="ai-message-avatar">
                      <RobotMascotSvg />
                    </div>
                  )}

                  <div className="ai-message-wrapper">

                    <div className="ai-message-name">
                      {msg.sender === "bot"
                        ? "Intellia AI"
                        : "You"}
                    </div>

                    <div
                      className={`ai-message-bubble ${msg.sender === "bot"
                          ? "ai-bubble"
                          : "user-bubble"
                        }`}
                    >
                      {msg.text}
                    </div>

                  </div>

                  {/* User avatar */}
                  {msg.sender === "user" && (
                    <div className="user-message-avatar">
                      👦
                    </div>
                  )}

                </div>
              ))}


              {/* =================================================
                  TYPING
              ================================================== */}
              {isTyping && (
                <div className="ai-message-row bot">

                  <div className="ai-message-avatar">
                    <RobotMascotSvg />
                  </div>

                  <div className="ai-message-wrapper">

                    <div className="ai-message-name">
                      Intellia AI is thinking...
                    </div>

                    <div className="ai-message-bubble ai-bubble typing-bubble">

                      <span />
                      <span />
                      <span />

                    </div>

                  </div>

                </div>
              )}

              <div ref={messagesEndRef} />

            </div>
          </main>


          {/* =================================================
              INPUT
          ================================================== */}
          <footer className="ai-chat-footer">

            <div className="ai-input-container">

              <span className="input-sparkle">
                ✨
              </span>

              <input
                type="text"
                value={inputQuery}
                onChange={(e) =>
                  setInputQuery(e.target.value)
                }
                onKeyDown={handleKeyDown}
                disabled={isTyping}
                placeholder={
                  isTyping
                    ? "Intellia is thinking..."
                    : "Ask your question..."
                }
              />

              <button
                className="ai-send-button"
                onClick={() => handleSend()}
                disabled={
                  !inputQuery.trim() || isTyping
                }
                aria-label="Send"
              >
                {isTyping ? "⏳" : "➤"}
              </button>

            </div>

            <div className="ai-footer-text">
              <span>🧠 Learn</span>
              <i>•</i>
              <span>💡 Ask</span>
              <i>•</i>
              <span>🚀 Grow</span>
            </div>

          </footer>

        </div>
      )}


      {/* =====================================================
          FLOATING BUTTON
      ====================================================== */}
      <button
        id="ai-tutor-floating-btn"
        className="ai-tutor-toggle-btn gamified-ai-toggle"
        onClick={() => setIsOpen((prev) => !prev)}
        title="Open Intellia AI Tutor"
        aria-label="Open Intellia AI Tutor"
      >

        <span className="toggle-robot">
          🤖
        </span>

        <span className="toggle-glow" />

        <span className="notification-badge">
          1
        </span>

        <span className="ai-tutor-toggle-label">
          Chat with Intellia AI Tutor
        </span>

      </button>

    </div>
  );
}


/* =========================================================
   ROBOT MASCOT
========================================================= */

function RobotMascotSvg() {
  return (
    <svg
      viewBox="0 0 36 36"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      width="42"
      height="42"
    >

      {/* Antenna */}
      <line
        x1="18"
        y1="4"
        x2="18"
        y2="8"
        stroke="#ffffff"
        strokeWidth="2"
        strokeLinecap="round"
      />

      <circle
        cx="18"
        cy="3"
        r="2"
        fill="#facc15"
      />

      {/* Head */}
      <rect
        x="6"
        y="8"
        width="24"
        height="18"
        rx="6"
        fill="#ffffff"
      />

      {/* Screen */}
      <rect
        x="9"
        y="11"
        width="18"
        height="10"
        rx="3"
        fill="#121b4d"
      />

      {/* Eyes */}
      <circle
        cx="14"
        cy="16"
        r="2"
        fill="#38bdf8"
      />

      <circle
        cx="22"
        cy="16"
        r="2"
        fill="#38bdf8"
      />

      {/* Eye highlights */}
      <circle
        cx="14.5"
        cy="15.5"
        r="0.7"
        fill="#ffffff"
      />

      <circle
        cx="22.5"
        cy="15.5"
        r="0.7"
        fill="#ffffff"
      />

      {/* Smile */}
      <path
        d="M15 19 Q18 21 21 19"
        stroke="#38bdf8"
        strokeWidth="1"
        fill="none"
        strokeLinecap="round"
      />

      {/* Cheeks */}
      <rect
        x="7"
        y="15"
        width="1.5"
        height="4"
        rx="0.7"
        fill="#818cf8"
      />

      <rect
        x="27.5"
        y="15"
        width="1.5"
        height="4"
        rx="0.7"
        fill="#818cf8"
      />

      {/* Body */}
      <path
        d="M11 26 L25 26 L27 32 L9 32 Z"
        fill="#ffffff"
        fillOpacity="0.9"
      />

    </svg>
  );
}