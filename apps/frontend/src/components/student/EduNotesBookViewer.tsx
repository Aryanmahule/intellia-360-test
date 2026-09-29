"use client";

import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Document,
  Page,
  pdfjs,
} from "react-pdf";

import styles from "./EduNotesBookViewer.module.css";

/* =========================================================
   PDF WORKER
========================================================= */

if (typeof window !== "undefined") {
  pdfjs.GlobalWorkerOptions.workerSrc =
    "/pdf.worker.min.mjs";
}

// The PDF is served by the API on another origin; send the session cookie.
// Module-level so react-pdf sees the same object on every render.
const PDF_OPTIONS = { withCredentials: true };

/* =========================================================
   PROPS
========================================================= */

interface EduNotesBookViewerProps {
  pdfUrl: string;
  lessonId: string;
}

type Direction = "next" | "prev";

type Spread =
  | {
    type: "cover";
  }
  | {
    type: "pages";
    left: number;
    right: number | null;
  }
  | {
    type: "back";
  };

/* =========================================================
   COVER IMAGES
========================================================= */

const FRONT_COVER =
  "/edunotes/front-cover.png";

const BACK_COVER =
  "/edunotes/back-cover.png";

/* =========================================================
   COMPONENT
========================================================= */

export default function EduNotesBookViewer({
  pdfUrl,
  lessonId,
}: EduNotesBookViewerProps) {
  const [numPages, setNumPages] =
    useState<number>(0);

  const [spreadIndex, setSpreadIndex] =
    useState<number>(0);

  const [zoom, setZoom] =
    useState<number>(1);

  const [isFlipping, setIsFlipping] =
    useState<boolean>(false);

  const [direction, setDirection] =
    useState<Direction>("next");

  const [bookmarked, setBookmarked] =
    useState<number[]>([]);

  const [fullscreen, setFullscreen] =
    useState<boolean>(false);

  const [pageWidth, setPageWidth] =
    useState<number>(430);

  const [pdfError, setPdfError] =
    useState<boolean>(false);

  const flipTimer =
    useRef<number | null>(null);

  /* =========================================================
     RESPONSIVE PAGE WIDTH
  ========================================================= */

  useEffect(() => {
    const updateWidth = () => {
      const width = window.innerWidth;

      if (width < 600) {
        setPageWidth(270);
      } else if (width < 900) {
        setPageWidth(340);
      } else if (width < 1200) {
        setPageWidth(390);
      } else {
        setPageWidth(470);
      }
    };

    updateWidth();

    window.addEventListener(
      "resize",
      updateWidth
    );

    return () =>
      window.removeEventListener(
        "resize",
        updateWidth
      );
  }, []);

  /* =========================================================
     CLEANUP
  ========================================================= */

  useEffect(() => {
    return () => {
      if (flipTimer.current) {
        window.clearTimeout(
          flipTimer.current
        );
      }
    };
  }, []);

  /* =========================================================
     BUILD BOOK SPREADS

     0       = Front Cover
     1       = PDF 2-3
     2       = PDF 4-5
     3       = PDF 6-7
     ...
     last    = Back Cover
  ========================================================= */

  const spreads = useMemo<Spread[]>(() => {
    if (!numPages) {
      return [
        { type: "cover" },
      ];
    }

    const result: Spread[] = [];

    /* Front cover */
    result.push({
      type: "cover",
    });

    /*
      PDF page 1 is intentionally skipped
      because front cover is our custom image.
    */

    for (
      let page = 2;
      page <= numPages;
      page += 2
    ) {
      result.push({
        type: "pages",
        left: page,
        right:
          page + 1 <= numPages
            ? page + 1
            : null,
      });
    }

    /* Back cover */
    result.push({
      type: "back",
    });

    return result;
  }, [numPages]);

  const totalSpreads =
    spreads.length;

  const currentSpread =
    spreads[spreadIndex];

  const previousSpread =
    spreads[spreadIndex - 1];

  const nextSpreadData =
    spreads[spreadIndex + 1];

  const isCover =
    currentSpread?.type === "cover";

  const isBackCover =
    currentSpread?.type === "back";

  /* =========================================================
     DISPLAY PAGE
  ========================================================= */

  const displayPage = useMemo(() => {
    if (!currentSpread) {
      return 1;
    }

    if (currentSpread.type === "cover") {
      return 1;
    }

    if (currentSpread.type === "back") {
      return numPages + 1;
    }

    return (
      currentSpread.right ??
      currentSpread.left
    );
  }, [currentSpread, numPages]);

  const physicalPageCount =
    numPages > 0
      ? numPages + 1
      : 0;

  const completion =
    physicalPageCount > 0
      ? Math.min(
        100,
        Math.round(
          (displayPage /
            physicalPageCount) *
          100
        )
      )
      : 0;

  const canGoNext =
    !isFlipping &&
    spreadIndex <
    totalSpreads - 1 &&
    !pdfError;

  const canGoPrevious =
    !isFlipping &&
    spreadIndex > 0 &&
    !pdfError;

  /* =========================================================
     FLIP
  ========================================================= */

  const beginFlip = (
    nextIndex: number,
    nextDirection: Direction
  ) => {
    if (
      isFlipping ||
      nextIndex < 0 ||
      nextIndex >= totalSpreads
    ) {
      return;
    }

    setDirection(
      nextDirection
    );

    setIsFlipping(true);

    flipTimer.current =
      window.setTimeout(() => {
        setSpreadIndex(
          nextIndex
        );

        setIsFlipping(false);
      }, 900);
  };

  const nextPage = () => {
    if (canGoNext) {
      beginFlip(
        spreadIndex + 1,
        "next"
      );
    }
  };

  const previousPage = () => {
    if (canGoPrevious) {
      beginFlip(
        spreadIndex - 1,
        "prev"
      );
    }
  };

  const goFirst = () => {
    if (!isFlipping) {
      setSpreadIndex(0);
    }
  };

  const goLast = () => {
    if (
      !isFlipping &&
      totalSpreads > 0
    ) {
      setSpreadIndex(
        totalSpreads - 1
      );
    }
  };

  /* =========================================================
     KEYBOARD
  ========================================================= */

  useEffect(() => {
    const handleKeyboard = (
      event: KeyboardEvent
    ) => {
      if (
        event.key === "ArrowRight"
      ) {
        event.preventDefault();
        nextPage();
      }

      if (
        event.key === "ArrowLeft"
      ) {
        event.preventDefault();
        previousPage();
      }

      if (
        event.key === "Escape" &&
        document.fullscreenElement
      ) {
        document
          .exitFullscreen()
          .catch(() => { });

        setFullscreen(false);
      }
    };

    window.addEventListener(
      "keydown",
      handleKeyboard
    );

    return () =>
      window.removeEventListener(
        "keydown",
        handleKeyboard
      );
  }, [
    spreadIndex,
    totalSpreads,
    isFlipping,
    pdfError,
  ]);

  /* =========================================================
     PDF LOAD
  ========================================================= */

  const onDocumentLoadSuccess = ({
    numPages: pages,
  }: {
    numPages: number;
  }) => {
    setNumPages(pages);
    setSpreadIndex(0);
    setPdfError(false);
  };

  const onDocumentLoadError = (
    error: Error
  ) => {
    console.error(
      "EduNotes PDF loading error:",
      error
    );

    setPdfError(true);
  };

  /* =========================================================
     BOOKMARK
  ========================================================= */

  const toggleBookmark = () => {
    setBookmarked(
      (previous) =>
        previous.includes(displayPage)
          ? previous.filter(
            (page) =>
              page !== displayPage
          )
          : [
            ...previous,
            displayPage,
          ]
    );
  };

  /* =========================================================
     ZOOM
  ========================================================= */

  const zoomIn = () => {
    setZoom((value) =>
      Math.min(
        Number(
          (value + 0.1).toFixed(2)
        ),
        1.35
      )
    );
  };

  const zoomOut = () => {
    setZoom((value) =>
      Math.max(
        Number(
          (value - 0.1).toFixed(2)
        ),
        0.75
      )
    );
  };

  const resetZoom = () => {
    setZoom(1);
  };

  /* =========================================================
     FULLSCREEN
  ========================================================= */

  const toggleFullscreen =
    async () => {
      try {
        if (
          !document.fullscreenElement
        ) {
          await document.documentElement.requestFullscreen();

          setFullscreen(true);
        } else {
          await document.exitFullscreen();

          setFullscreen(false);
        }
      } catch (error) {
        console.error(
          "Fullscreen error:",
          error
        );
      }
    };

  /* =========================================================
     PDF PAGE RENDERER
  ========================================================= */

  const renderPdfPage = (
    pageNumber: number | null,
    extraClass?: string
  ) => {
    if (!pageNumber) {
      return (
        <div
          className={`${styles.blankPage} ${extraClass || ""
            }`}
        />
      );
    }

    return (
      <div
        className={`${styles.pdfPageWrapper} ${extraClass || ""
          }`}
      >
        <Page
          pageNumber={pageNumber}
          width={pageWidth}
          renderTextLayer={false}
          renderAnnotationLayer={false}
          className={styles.pdfPage}
        />
      </div>
    );
  };

  /* =========================================================
     CURRENT SPREAD
  ========================================================= */

  const renderCurrentSpread =
    () => {
      if (
        currentSpread?.type ===
        "cover"
      ) {
        return (
          <div
            className={
              styles.fullCoverPage
            }
          >
            <img
              src={FRONT_COVER}
              alt="EduNotes Front Cover"
              className={
                styles.coverImage
              }
            />

            <button
              type="button"
              className={
                styles.coverOpenButton
              }
              onClick={
                nextPage
              }
              disabled={!canGoNext}
            >
              Open Book →
            </button>
          </div>
        );
      }

      if (
        currentSpread?.type ===
        "back"
      ) {
        return (
          <div
            className={
              styles.fullCoverPage
            }
          >
            <img
              src={BACK_COVER}
              alt="EduNotes Back Cover"
              className={
                styles.coverImage
              }
            />
          </div>
        );
      }

      return (
        <div
          className={
            styles.openBook
          }
        >
          {/* LEFT PAGE */}

          <div
            className={`${styles.bookPage} ${styles.leftPage}`}
          >
            {renderPdfPage(
              currentSpread.left
            )}

            <span
              className={
                styles.pageNumber
              }
            >
              {currentSpread.left}
            </span>
          </div>

          {/* SPINE */}

          <div
            className={
              styles.spine
            }
          >
            <div
              className={
                styles.spineHighlight
              }
            />
          </div>

          {/* RIGHT PAGE */}

          <div
            className={`${styles.bookPage} ${styles.rightPage}`}
          >
            {renderPdfPage(
              currentSpread.right
            )}

            {currentSpread.right && (
              <span
                className={
                  styles.pageNumber
                }
              >
                {
                  currentSpread.right
                }
              </span>
            )}
          </div>
        </div>
      );
    };

  /* =========================================================
     TURNING PAGE
  ========================================================= */

  const renderTurningPage =
    () => {
      if (!isFlipping) {
        return null;
      }

      /*
       * FRONT COVER → 2-3
       */

      if (
        currentSpread?.type ===
        "cover" &&
        direction === "next"
      ) {
        return (
          <div
            className={
              styles.coverTurnNext
            }
          >
            <div
              className={
                styles.coverTurnFace
              }
            >
              <img
                src={FRONT_COVER}
                alt=""
                className={
                  styles.coverImage
                }
              />
            </div>

            <div
              className={
                styles.coverTurnBack
              }
            >
              <div
                className={
                  styles.paperBack
                }
              />
            </div>
          </div>
        );
      }

      /*
       * BACK COVER → LAST PAGES
       */

      if (
        currentSpread?.type ===
        "back" &&
        direction === "prev"
      ) {
        const target =
          previousSpread;

        return (
          <div
            className={
              styles.coverTurnPrev
            }
          >
            <div
              className={
                styles.coverTurnFace
              }
            >
              <img
                src={BACK_COVER}
                alt=""
                className={
                  styles.coverImage
                }
              />
            </div>

            <div
              className={
                styles.coverTurnBack
              }
            >
              <div
                className={
                  styles.paperBack
                }
              />
            </div>
          </div>
        );
      }

      /*
       * NORMAL NEXT PAGE

       * 2-3 → 4-5

       * Page 3 front
       * Page 4 back
       */

      if (
        direction === "next" &&
        currentSpread?.type ===
        "pages" &&
        nextSpreadData?.type ===
        "pages"
      ) {
        return (
          <div
            className={
              styles.turningPageNext
            }
          >
            <div
              className={
                styles.turningFront
              }
            >
              {renderPdfPage(
                currentSpread.right
              )}
            </div>

            <div
              className={
                styles.turningBack
              }
            >
              {renderPdfPage(
                nextSpreadData.left
              )}
            </div>

            <div
              className={
                styles.pageCurl
              }
            />
          </div>
        );
      }

      /*
       * LAST PDF SPREAD → BACK COVER
       */

      if (
        direction === "next" &&
        currentSpread?.type ===
        "pages" &&
        nextSpreadData?.type ===
        "back"
      ) {
        return (
          <div
            className={
              styles.turningBackCoverNext
            }
          >
            <div
              className={
                styles.turningBackCoverFace
              }
            >
              <img
                src={BACK_COVER}
                alt=""
                className={
                  styles.coverImage
                }
              />
            </div>
          </div>
        );
      }

      /*
       * NORMAL PREVIOUS

       * 4-5 → 2-3

       * Page 4 front
       * Page 3 back
       */

      if (
        direction === "prev" &&
        currentSpread?.type ===
        "pages" &&
        previousSpread?.type ===
        "pages"
      ) {
        return (
          <div
            className={
              styles.turningPagePrev
            }
          >
            <div
              className={
                styles.turningFront
              }
            >
              {renderPdfPage(
                currentSpread.left
              )}
            </div>

            <div
              className={
                styles.turningBack
              }
            >
              {renderPdfPage(
                previousSpread.right
              )}
            </div>

            <div
              className={
                styles.pageCurlPrev
              }
            />
          </div>
        );
      }

      /*
       * 2-3 → FRONT COVER
       */

      if (
        direction === "prev" &&
        currentSpread?.type ===
        "pages" &&
        previousSpread?.type ===
        "cover"
      ) {
        return (
          <div
            className={
              styles.coverTurnPrev
            }
          >
            <div
              className={
                styles.coverTurnFace
              }
            >
              {renderPdfPage(
                currentSpread.left
              )}
            </div>

            <div
              className={
                styles.coverTurnBack
              }
            >
              <img
                src={FRONT_COVER}
                alt=""
                className={
                  styles.coverImage
                }
              />
            </div>
          </div>
        );
      }

      return null;
    };

  /* =========================================================
     RETURN
  ========================================================= */

  return (
    <div
      className={`${styles.bookApp} ${fullscreen
          ? styles.fullscreen
          : ""
        }`}
    >
      {/* =====================================================
          TOOLBAR
      ===================================================== */}

      <header
        className={
          styles.toolbar
        }
      >
        <div
          className={
            styles.toolbarBrand
          }
        >
          <div
            className={
              styles.logo
            }
          >
            📚
          </div>

          <div>
            <h1>
              EduNotes
            </h1>

            <p>
              Interactive Learning
              Book ✨
            </p>
          </div>
        </div>

        <div
          className={
            styles.topPageCounter
          }
        >
          <span>
            {displayPage}
          </span>

          <b>/</b>

          <span>
            {physicalPageCount ||
              "--"}
          </span>
        </div>

        <div
          className={
            styles.toolbarActions
          }
        >
          <button
            type="button"
            className={`${styles.toolButton} ${bookmarked.includes(
              displayPage
            )
                ? styles.activeTool
                : ""
              }`}
            onClick={
              toggleBookmark
            }
            title="Bookmark"
          >
            {bookmarked.includes(
              displayPage
            )
              ? "★"
              : "☆"}
          </button>

          <button
            type="button"
            className={
              styles.toolButton
            }
            onClick={
              zoomOut
            }
            title="Zoom out"
          >
            −
          </button>

          <button
            type="button"
            className={
              styles.zoomButton
            }
            onClick={
              resetZoom
            }
            title="Reset zoom"
          >
            {Math.round(
              zoom * 100
            )}
            %
          </button>

          <button
            type="button"
            className={
              styles.toolButton
            }
            onClick={
              zoomIn
            }
            title="Zoom in"
          >
            +
          </button>

          <button
            type="button"
            className={
              styles.toolButton
            }
            onClick={
              toggleFullscreen
            }
            title="Fullscreen"
          >
            ⛶
          </button>
        </div>
      </header>

      {/* =====================================================
          BOOK STAGE
      ===================================================== */}

      <main
        className={
          styles.stage
        }
      >
        <div
          className={`${styles.sparkle} ${styles.sparkleOne}`}
        >
          ✦
        </div>

        <div
          className={`${styles.sparkle} ${styles.sparkleTwo}`}
        >
          ✧
        </div>

        <button
          type="button"
          className={`${styles.sideArrow} ${styles.leftArrow}`}
          onClick={
            previousPage
          }
          disabled={
            !canGoPrevious
          }
          aria-label="Previous page"
        >
          ‹
        </button>

        <button
          type="button"
          className={`${styles.sideArrow} ${styles.rightArrow}`}
          onClick={nextPage}
          disabled={
            !canGoNext
          }
          aria-label="Next page"
        >
          ›
        </button>

        <Document
          file={pdfUrl}
          options={PDF_OPTIONS}
          onLoadSuccess={
            onDocumentLoadSuccess
          }
          onLoadError={
            onDocumentLoadError
          }
          loading={
            <div
              className={
                styles.loadingState
              }
            >
              <div
                className={
                  styles.loadingBook
                }
              >
                📖
              </div>

              <h2>
                Opening your
                learning book...
              </h2>

              <p>
                Preparing your
                EduNotes ✨
              </p>
            </div>
          }
          error={
            <div
              className={
                styles.errorState
              }
            >
              <div>
                😕
              </div>

              <h2>
                Unable to open
                EduNotes
              </h2>

              <p>
                Please refresh the
                page and try again.
              </p>

              <button
                type="button"
                onClick={() =>
                  window.location.reload()
                }
              >
                🔄 Reload
              </button>
            </div>
          }
          className={
            styles.pdfDocument
          }
        >
          <div
            className={
              styles.bookScene
            }
            style={{
              transform: `scale(${zoom})`,
            }}
          >
            <div
              className={
                styles.bookShadow
              }
            />

            <div
              className={
                styles.book
              }
            >
              {/* STATIC CURRENT BOOK */}

              {renderCurrentSpread()}

              {/* CENTER SPINE */}

              {!isCover &&
                !isBackCover && (
                  <div
                    className={
                      styles.centerSpine
                    }
                  />
                )}

              {/* ACTUAL TURNING SHEET */}

              {renderTurningPage()}
            </div>
          </div>
        </Document>
      </main>

      {/* =====================================================
          FOOTER
      ===================================================== */}

      <footer
        className={
          styles.footer
        }
      >
        <button
          type="button"
          className={
            styles.footerButton
          }
          onClick={goFirst}
          disabled={
            spreadIndex === 0 ||
            isFlipping
          }
        >
          ⏮
          <span>
            First
          </span>
        </button>

        <button
          type="button"
          className={
            styles.footerButton
          }
          onClick={
            previousPage
          }
          disabled={
            !canGoPrevious
          }
        >
          ←
          <span>
            Previous
          </span>
        </button>

        <div
          className={
            styles.progressArea
          }
        >
          <strong>
            Page {displayPage} of{" "}
            {physicalPageCount ||
              "--"}
          </strong>

          <div
            className={
              styles.progressTrack
            }
          >
            <div
              className={
                styles.progressFill
              }
              style={{
                width: `${completion}%`,
              }}
            />

            <div
              className={
                styles.progressStar
              }
              style={{
                left: `${completion}%`,
              }}
            >
              ⭐
            </div>
          </div>

          <span>
            {completion}% Complete
          </span>
        </div>

        <button
          type="button"
          className={`${styles.footerButton} ${styles.nextButton}`}
          onClick={nextPage}
          disabled={
            !canGoNext
          }
        >
          <span>
            Next
          </span>
          →
        </button>

        <button
          type="button"
          className={
            styles.footerButton
          }
          onClick={goLast}
          disabled={
            spreadIndex >=
            totalSpreads - 1 ||
            isFlipping
          }
        >
          <span>
            Last
          </span>
          ⏭
        </button>
      </footer>

      <span
        className={
          styles.hiddenLessonId
        }
      >
        {lessonId}
      </span>
    </div>
  );
}