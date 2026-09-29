"use client";

import React from "react";
import Link from "next/link";
import type { GradeActionCard } from "@intellia360/shared/types/student";

interface ExtendedCard extends GradeActionCard {
  isCompleted?: boolean;
  activityType?: string;
}

interface LearningGridContainerProps {
  cards: ExtendedCard[];
  onCardClick?: (card: ExtendedCard) => void;
  lessonId?: string;
}

export default function LearningGridContainer({
  cards,
  onCardClick,
  lessonId,
}: LearningGridContainerProps) {
  return (
    <section className="learning-grid-container">
      {cards.map((card) => {
        const isVideo = card.activityType === "video";

        const isExternal =
          !isVideo && card.targetUrl?.startsWith("http");

        const handleClick = (
          e: React.MouseEvent
        ) => {
          if (onCardClick) {
            onCardClick(card);
          }
        };

        const sharedProps = {
          onClick: handleClick,
          className: `action-card card-color-${card.buttonColor} ${card.isCompleted
              ? "completed-activity"
              : ""
            }`,
          style: {
            textDecoration: "none" as const,
            opacity: card.enabled ? 1 : 0.5,
            pointerEvents: (card.enabled
              ? "auto"
              : "none") as React.CSSProperties[
              "pointerEvents"
              ],
            position: "relative" as const,
          },
          "aria-disabled": !card.enabled,
        };

        const inner = (
          <>
            <div className="card-header-group">
              <span className="card-icon-placeholder">
                {card.isCompleted
                  ? "✅"
                  : card.icon}
              </span>

              <div className="card-titles">
                <h3 className="card-main-title">
                  {card.title}

                  {card.isCompleted && (
                    <span
                      style={{
                        marginLeft: "8px",
                        fontSize: "0.85rem",
                        color:
                          "var(--color-success)",
                        fontWeight: "bold",
                      }}
                    >
                      ✓ Completed
                    </span>
                  )}
                </h3>

                <span className="card-sub-title">
                  {card.isCompleted
                    ? "Activity Done (+Rewards Claimed)"
                    : card.subtitle}
                </span>
              </div>
            </div>

            <p className="card-description">
              {card.description}
            </p>

            <div className="card-footer-action">
              <button
                type="button"
                className="card-circle-arrow-btn"
              >
                {card.isCompleted
                  ? "✓"
                  : "→"}
              </button>
            </div>
          </>
        );

        /*
         * =====================================================
         * VIDEO CARD
         * =====================================================
         *
         * YouTube URL will NOT open YouTube.
         *
         * It will open:
         *
         * /student/lesson/video
         *
         * inside Intellia.
         */

        if (isVideo) {
          let videoId = "";

          if (card.targetUrl) {
            const match =
              card.targetUrl.match(
                /(?:youtube\.com\/shorts\/|youtube\.com\/watch\?v=|youtu\.be\/)([^?&/]+)/
              );

            if (match) {
              videoId = match[1];
            }
          }

          const videoPageUrl =
            `/student/lesson/video` +
            `?lessonId=${encodeURIComponent(
              lessonId ?? ""
            )}` +
            `&videoId=${encodeURIComponent(
              videoId
            )}`;

          return (
            <Link
              key={card.id}
              href={
                card.enabled
                  ? videoPageUrl
                  : "#"
              }
              {...sharedProps}
            >
              {inner}
            </Link>
          );
        }

        /*
         * =====================================================
         * OTHER EXTERNAL LINKS
         * =====================================================
         */

        if (isExternal) {
          return (
            <a
              key={card.id}
              href={card.targetUrl}
              target="_blank"
              rel="noopener noreferrer"
              {...sharedProps}
            >
              {inner}
            </a>
          );
        }

        /*
         * =====================================================
         * NORMAL INTERNAL LINKS
         * =====================================================
         */

        return (
          <Link
            key={card.id}
            href={
              card.enabled
                ? card.targetUrl
                : "#"
            }
            {...sharedProps}
          >
            {inner}
          </Link>
        );
      })}
    </section>
  );
}