import { FlattenedSource } from "@/interfaces/processSteps";
import { removePunctuation } from "@/lib/utils";
import React, { useRef, useState, useEffect } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/esm/Page/AnnotationLayer.css";
import "react-pdf/dist/esm/Page/TextLayer.css";
import styles from "./HighlightPdfViewer.module.css";
import { Loader2 } from "lucide-react";

// Define types for the highlight source
interface HighlightCoordinate {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface PdfViewerProps {
  file: string;
  highlightSources: FlattenedSource[];
}

const HighlightPdfViewer: React.FC<PdfViewerProps> = ({
  file,
  highlightSources,
}) => {
  const [numPages, setNumPages] = useState<number | null>(null);
  const [onScrolled, setOnScrolled] = useState<boolean>(false);
  const [visiblePages, setVisiblePages] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const viewerRef = useRef<HTMLDivElement>(null);

  const activePage =
    highlightSources && highlightSources.length > 0
      ? highlightSources[0].page_number
      : 1;

  useEffect(() => {
    if (typeof window !== "undefined") {
      pdfjs.GlobalWorkerOptions.workerSrc = `/pdf.worker.mjs`;
    }
  }, []);

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setVisiblePages([activePage]);
    setIsLoading(false);
  };

  const scrollToPage = (pageNumber: number) => {
    const pageElement = document.querySelector(`#page_${pageNumber}`);
    if (pageElement) {
      pageElement.scrollIntoView({ behavior: "smooth" });
    }
  };

  // Highlighting logic for both custom coordinates and text
  const highlightText = (
    pageNumber: number,
    sources: HighlightCoordinate[]
  ) => {
    const pageContainer = document.querySelector<HTMLDivElement>(
      `#page_${pageNumber}`
    );

    if (!pageContainer) {
      return;
    }

    const highlightLayer = document.createElement("div");
    highlightLayer.className = styles.highlightLayer;
    pageContainer.appendChild(highlightLayer);

    sources.forEach((source) => {
      const highlightDiv = document.createElement("div");

      // Set the position and size of the highlight
      highlightDiv.style.position = "absolute";
      highlightDiv.style.left = `${source.x / 2}px`;
      highlightDiv.style.top = `${source.y / 2}px`;
      highlightDiv.style.width = `${source.width / 2}px`;
      highlightDiv.style.height = `${source.height / 2}px`;
      highlightDiv.style.backgroundColor = "rgba(255, 255, 0, 0.3)"; // Yellow highlight
      highlightDiv.style.pointerEvents = "none"; // Allow interactions with underlying text
      highlightDiv.classList.add(styles.highlightDiv);

      highlightLayer.appendChild(highlightDiv);
    });
  };

  function findOverlap(sentence1: string, sentence2: string) {
    // Split both sentences into words
    const words1 = sentence1.split(" ");
    const words2 = sentence2.split(" ");

    let longestOverlap: { overlap: string; position: null | string } = {
      overlap: "No overlap found",
      position: null,
    };

    let maxLength = 0;

    // Loop over each possible starting point in sentence1
    for (let i = 0; i < words1.length; i++) {
      for (let j = 0; j < words2.length; j++) {
        let overlapLength = 0;

        // Compare words from both sentences starting at words1[i] and words2[j]
        while (
          i + overlapLength < words1.length &&
          j + overlapLength < words2.length &&
          words1[i + overlapLength] === words2[j + overlapLength]
        ) {
          overlapLength++;
        }

        // If we found an overlap longer than what we've seen, update longestOverlap
        if (overlapLength > maxLength) {
          maxLength = overlapLength;

          // Determine the position of the overlap in sentence1
          let position;
          if (i === 0) {
            position = "start";
          } else if (i + overlapLength === words1.length) {
            position = "end";
          } else {
            position = "middle";
          }

          longestOverlap = {
            overlap: words1.slice(i, i + overlapLength).join(" "),
            position: position,
          };
        }
      }
    }

    return longestOverlap;
  }

  const constructCoordinates = (
    item: any,
    viewHeight: number,
    viewWidth: number
  ) => {
    const { transform, width, height } = item;
    const x = 2 * transform[4];
    const y = viewHeight - 2 * transform[5] - 2 * height;
    return {
      x: x,
      y: y,
      width: 2 * width,
      height: 2 * height,
    };
  };

  // Function to search for text and highlight it
  const highlightTextInPdf = async (pageNumber: number, text: string) => {
    console.log(`Searching for text on page ${pageNumber}:`, text); // Add this line

    const loadingTask = pdfjs.getDocument(file);
    const pdfDocument = await loadingTask.promise;

    const page = await pdfDocument.getPage(pageNumber);
    const textContent = await page.getTextContent();
    const pageCanvas = document.querySelector<HTMLCanvasElement>(
      `#page_${pageNumber} canvas`
    );

    if (!pageCanvas) return;

    let viewHeight = pageCanvas?.height;
    let viewWidth = pageCanvas?.width;

    if (!viewWidth || !viewHeight || !numPages) {
      console.log("No view width or height found");
      return;
    }

    let copyText = removePunctuation(text.toLowerCase());

    let highlightCoordinates: HighlightCoordinate[] = [];
    let found = false;

    textContent.items.forEach((item) => {
      if ("str" in item && typeof item.str === "string") {
        const pdfText = removePunctuation(item.str.toLowerCase().trim());

        if (pdfText.length == 0 || copyText.length == 0) return;

        let overlap = findOverlap(pdfText, copyText);
        if (overlap.overlap === "No overlap found") {
          overlap = findOverlap(copyText, item.str.toLowerCase());
          if (overlap.overlap === "No overlap found") {
            return;
          }
        }

        if (copyText.length == 0) {
          return;
        }

        const isOverlapAtStart = copyText.startsWith(overlap.overlap);
        const isOverlapEqualToPdf = overlap.overlap.length === pdfText.length;
        const isOverlapEqualToCopy = overlap.overlap.length === copyText.length;

        if (isOverlapEqualToPdf && isOverlapEqualToCopy && isOverlapAtStart) {
          const highlightCoord = constructCoordinates(
            item,
            viewHeight,
            viewWidth
          );
          highlightCoordinates.push(highlightCoord);
          copyText = copyText.replace(overlap.overlap, "").trim();
        } else if (
          !isOverlapEqualToPdf &&
          isOverlapEqualToCopy &&
          isOverlapAtStart
        ) {
          const highlightCoord = constructCoordinates(
            item,
            viewHeight,
            viewWidth
          );
          highlightCoordinates.push(highlightCoord);
          copyText = copyText.replace(overlap.overlap, "").trim();
        } else if (
          isOverlapEqualToPdf &&
          !isOverlapEqualToCopy &&
          isOverlapAtStart
        ) {
          found = true;
          const highlightCoord = constructCoordinates(
            item,
            viewHeight,
            viewWidth
          );
          highlightCoordinates.push(highlightCoord);
          copyText = copyText.replace(overlap.overlap, "").trim();
        } else if (
          !isOverlapEqualToPdf &&
          !isOverlapEqualToCopy &&
          isOverlapAtStart
        ) {
          found = true;
          const highlightCoord = constructCoordinates(
            item,
            viewHeight,
            viewWidth
          );
          highlightCoordinates.push(highlightCoord);
          copyText = copyText.replace(overlap.overlap, "").trim();
        } else if (found && copyText.length > 1 && !isOverlapEqualToCopy) {
          highlightCoordinates = [];
          copyText = removePunctuation(text.toLowerCase());
          found = false;
        }
      }
    });

    highlightText(pageNumber, highlightCoordinates);
  };

  useEffect(() => {
    if (numPages !== null) {
      const timer = setTimeout(() => {
        scrollToPage(activePage);
        setOnScrolled(true);
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [numPages]);

  useEffect(() => {
    const highlightAllSources = async () => {
      for (const highlightSource of highlightSources) {
        await highlightTextInPdf(
          highlightSource.page_number,
          highlightSource.source
        );
      }
    };
    highlightAllSources();
  }, [onScrolled]);

  const handleIntersection = (entries: IntersectionObserverEntry[]) => {
    entries.forEach((entry) => {
      const pageNumber = parseInt(entry.target.id.split("_")[1]);
      if (entry.isIntersecting) {
        setVisiblePages((prev) =>
          prev.includes(pageNumber) ? prev : [...prev, pageNumber]
        );
      }
    });
  };

  useEffect(() => {
    const observer = new IntersectionObserver(handleIntersection, {
      root: null,
      rootMargin: "0px",
      threshold: 0.1,
    });

    document.querySelectorAll('[id^="page_"]').forEach((el) => {
      observer.observe(el);
    });

    return () => observer.disconnect();
  }, [numPages]);

  return (
    <div ref={viewerRef} className={styles.pdfViewer}>
      {isLoading && (
        <div className={styles.loaderContainer}>
          <Loader2 className={styles.loader} />
        </div>
      )}
      <Document
        file={file}
        onLoadSuccess={onDocumentLoadSuccess}
        loading={<div className={styles.hidden}></div>}
      >
        {Array.from(new Array(numPages || 0), (el, index) => {
          const pageNumber = index + 1;
          return (
            <div
              id={`page_${pageNumber}`}
              key={`page_${pageNumber}`}
              className={styles.pageContainer}
            >
              {visiblePages.includes(pageNumber) && (
                <Page
                  pageNumber={pageNumber}
                  loading={<div className={styles.hidden}></div>}
                  className={styles.pdfPage}
                />
              )}
            </div>
          );
        })}
      </Document>
    </div>
  );
};

export default HighlightPdfViewer;