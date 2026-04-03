"use client";

import { useState, useRef, useCallback, useEffect } from "react";

interface ImageEditorProps {
  file: File;
  onComplete: (editedFile: File) => void;
  onCancel: () => void;
}

interface CropArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

type DragHandle =
  | "move"
  | "nw"
  | "ne"
  | "sw"
  | "se"
  | "n"
  | "s"
  | "e"
  | "w"
  | null;

const MIN_CROP_SIZE = 30;

export default function ImageEditor({
  file,
  onComplete,
  onCancel,
}: ImageEditorProps) {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const [displaySize, setDisplaySize] = useState({ width: 0, height: 0 });
  const [rotation, setRotation] = useState(0);
  const [crop, setCrop] = useState<CropArea | null>(null);
  const [isCropping, setIsCropping] = useState(false);
  const [dragHandle, setDragHandle] = useState<DragHandle>(null);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [cropStart, setCropStart] = useState<CropArea>({
    x: 0,
    y: 0,
    width: 0,
    height: 0,
  });
  const [processing, setProcessing] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  // Load image from file
  useEffect(() => {
    const url = URL.createObjectURL(file);
    setImageSrc(url);
    const img = new window.Image();
    img.onload = () => {
      setImageSize({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.src = url;
    return () => URL.revokeObjectURL(url);
  }, [file]);

  // Calculate display size whenever image or rotation changes
  useEffect(() => {
    if (!imageSize.width || !containerRef.current) return;

    const containerRect = containerRef.current.getBoundingClientRect();
    const maxW = containerRect.width - 40;
    const maxH = containerRect.height - 40;

    // After rotation, effective dimensions swap for 90/270
    const isRotated = rotation % 180 !== 0;
    const srcW = isRotated ? imageSize.height : imageSize.width;
    const srcH = isRotated ? imageSize.width : imageSize.height;

    const scale = Math.min(maxW / srcW, maxH / srcH, 1);
    setDisplaySize({
      width: Math.round(srcW * scale),
      height: Math.round(srcH * scale),
    });

    // Reset crop when rotation changes
    setCrop(null);
    setIsCropping(false);
  }, [imageSize, rotation]);

  const handleRotate = useCallback(
    (direction: "cw" | "ccw") => {
      setRotation((r) => {
        const delta = direction === "cw" ? 90 : -90;
        return (r + delta + 360) % 360;
      });
    },
    []
  );

  const enableCrop = useCallback(() => {
    if (!displaySize.width) return;
    const padding = Math.min(displaySize.width, displaySize.height) * 0.1;
    setCrop({
      x: padding,
      y: padding,
      width: displaySize.width - padding * 2,
      height: displaySize.height - padding * 2,
    });
    setIsCropping(true);
  }, [displaySize]);

  const disableCrop = useCallback(() => {
    setCrop(null);
    setIsCropping(false);
  }, []);

  // --- Crop drag logic ---
  const getPointerPos = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      const rect = (
        e.currentTarget as HTMLElement
      ).getBoundingClientRect();
      const clientX =
        "touches" in e ? e.touches[0].clientX : e.clientX;
      const clientY =
        "touches" in e ? e.touches[0].clientY : e.clientY;
      return { x: clientX - rect.left, y: clientY - rect.top };
    },
    []
  );

  const hitTestHandle = useCallback(
    (pos: { x: number; y: number }, c: CropArea): DragHandle => {
      const handleSize = 18;
      const hx = pos.x;
      const hy = pos.y;

      // Corner handles
      if (
        Math.abs(hx - c.x) < handleSize &&
        Math.abs(hy - c.y) < handleSize
      )
        return "nw";
      if (
        Math.abs(hx - (c.x + c.width)) < handleSize &&
        Math.abs(hy - c.y) < handleSize
      )
        return "ne";
      if (
        Math.abs(hx - c.x) < handleSize &&
        Math.abs(hy - (c.y + c.height)) < handleSize
      )
        return "sw";
      if (
        Math.abs(hx - (c.x + c.width)) < handleSize &&
        Math.abs(hy - (c.y + c.height)) < handleSize
      )
        return "se";

      // Edge handles
      if (
        Math.abs(hy - c.y) < handleSize &&
        hx > c.x + handleSize &&
        hx < c.x + c.width - handleSize
      )
        return "n";
      if (
        Math.abs(hy - (c.y + c.height)) < handleSize &&
        hx > c.x + handleSize &&
        hx < c.x + c.width - handleSize
      )
        return "s";
      if (
        Math.abs(hx - c.x) < handleSize &&
        hy > c.y + handleSize &&
        hy < c.y + c.height - handleSize
      )
        return "w";
      if (
        Math.abs(hx - (c.x + c.width)) < handleSize &&
        hy > c.y + handleSize &&
        hy < c.y + c.height - handleSize
      )
        return "e";

      // Inside crop = move
      if (
        hx >= c.x &&
        hx <= c.x + c.width &&
        hy >= c.y &&
        hy <= c.y + c.height
      )
        return "move";

      return null;
    },
    []
  );

  const handlePointerDown = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      if (!crop || !isCropping) return;
      const pos = getPointerPos(e);
      const handle = hitTestHandle(pos, crop);
      if (!handle) return;
      e.preventDefault();
      setDragHandle(handle);
      setDragStart(pos);
      setCropStart({ ...crop });
    },
    [crop, isCropping, getPointerPos, hitTestHandle]
  );

  const handlePointerMove = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      if (!dragHandle || !crop) return;
      e.preventDefault();
      const pos = getPointerPos(e);
      const dx = pos.x - dragStart.x;
      const dy = pos.y - dragStart.y;

      const maxW = displaySize.width;
      const maxH = displaySize.height;

      const newCrop = { ...cropStart };

      switch (dragHandle) {
        case "move":
          newCrop.x = Math.max(
            0,
            Math.min(cropStart.x + dx, maxW - cropStart.width)
          );
          newCrop.y = Math.max(
            0,
            Math.min(cropStart.y + dy, maxH - cropStart.height)
          );
          break;
        case "nw":
          newCrop.x = Math.max(
            0,
            Math.min(cropStart.x + dx, cropStart.x + cropStart.width - MIN_CROP_SIZE)
          );
          newCrop.y = Math.max(
            0,
            Math.min(cropStart.y + dy, cropStart.y + cropStart.height - MIN_CROP_SIZE)
          );
          newCrop.width = cropStart.x + cropStart.width - newCrop.x;
          newCrop.height = cropStart.y + cropStart.height - newCrop.y;
          break;
        case "ne":
          newCrop.y = Math.max(
            0,
            Math.min(cropStart.y + dy, cropStart.y + cropStart.height - MIN_CROP_SIZE)
          );
          newCrop.width = Math.max(
            MIN_CROP_SIZE,
            Math.min(cropStart.width + dx, maxW - cropStart.x)
          );
          newCrop.height = cropStart.y + cropStart.height - newCrop.y;
          break;
        case "sw":
          newCrop.x = Math.max(
            0,
            Math.min(cropStart.x + dx, cropStart.x + cropStart.width - MIN_CROP_SIZE)
          );
          newCrop.width = cropStart.x + cropStart.width - newCrop.x;
          newCrop.height = Math.max(
            MIN_CROP_SIZE,
            Math.min(cropStart.height + dy, maxH - cropStart.y)
          );
          break;
        case "se":
          newCrop.width = Math.max(
            MIN_CROP_SIZE,
            Math.min(cropStart.width + dx, maxW - cropStart.x)
          );
          newCrop.height = Math.max(
            MIN_CROP_SIZE,
            Math.min(cropStart.height + dy, maxH - cropStart.y)
          );
          break;
        case "n":
          newCrop.y = Math.max(
            0,
            Math.min(cropStart.y + dy, cropStart.y + cropStart.height - MIN_CROP_SIZE)
          );
          newCrop.height = cropStart.y + cropStart.height - newCrop.y;
          break;
        case "s":
          newCrop.height = Math.max(
            MIN_CROP_SIZE,
            Math.min(cropStart.height + dy, maxH - cropStart.y)
          );
          break;
        case "w":
          newCrop.x = Math.max(
            0,
            Math.min(cropStart.x + dx, cropStart.x + cropStart.width - MIN_CROP_SIZE)
          );
          newCrop.width = cropStart.x + cropStart.width - newCrop.x;
          break;
        case "e":
          newCrop.width = Math.max(
            MIN_CROP_SIZE,
            Math.min(cropStart.width + dx, maxW - cropStart.x)
          );
          break;
      }

      setCrop(newCrop);
    },
    [dragHandle, crop, dragStart, cropStart, displaySize, getPointerPos]
  );

  const handlePointerUp = useCallback(() => {
    setDragHandle(null);
  }, []);

  // Apply edits and produce final file
  const applyEdits = useCallback(async () => {
    if (!imageSrc || !imageSize.width) return;
    setProcessing(true);

    try {
      const img = new window.Image();
      img.crossOrigin = "anonymous";
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = reject;
        img.src = imageSrc;
      });

      const isRotated = rotation % 180 !== 0;
      const srcW = img.naturalWidth;
      const srcH = img.naturalHeight;

      // Step 1: Draw the full rotated image onto a temp canvas
      const rotCanvas = document.createElement("canvas");
      rotCanvas.width = isRotated ? srcH : srcW;
      rotCanvas.height = isRotated ? srcW : srcH;
      const rotCtx = rotCanvas.getContext("2d")!;
      rotCtx.translate(rotCanvas.width / 2, rotCanvas.height / 2);
      rotCtx.rotate((rotation * Math.PI) / 180);
      rotCtx.drawImage(img, -srcW / 2, -srcH / 2, srcW, srcH);

      // Step 2: If no crop, use full display bounds
      const cropArea = crop || {
        x: 0,
        y: 0,
        width: displaySize.width,
        height: displaySize.height,
      };

      // Scale from display coords to rotated image coords
      const scaleX = rotCanvas.width / displaySize.width;
      const scaleY = rotCanvas.height / displaySize.height;

      // Step 3: Crop from the rotated canvas
      const finalCanvas = document.createElement("canvas");
      finalCanvas.width = Math.round(cropArea.width * scaleX);
      finalCanvas.height = Math.round(cropArea.height * scaleY);
      const finalCtx = finalCanvas.getContext("2d")!;
      finalCtx.drawImage(
        rotCanvas,
        Math.round(cropArea.x * scaleX),
        Math.round(cropArea.y * scaleY),
        finalCanvas.width,
        finalCanvas.height,
        0,
        0,
        finalCanvas.width,
        finalCanvas.height
      );

      const blob = await new Promise<Blob>((resolve, reject) => {
        finalCanvas.toBlob(
          (b) => (b ? resolve(b) : reject(new Error("Canvas export failed"))),
          file.type === "image/png" ? "image/png" : "image/jpeg",
          0.92
        );
      });

      const ext = file.type === "image/png" ? ".png" : ".jpg";
      const editedFile = new File(
        [blob],
        file.name.replace(/\.[^.]+$/, "") + "_edited" + ext,
        { type: blob.type }
      );

      onComplete(editedFile);
    } catch (err) {
      console.error("Image editor error:", err);
      // Fallback: return original file
      onComplete(file);
    } finally {
      setProcessing(false);
    }
  }, [imageSrc, imageSize, rotation, crop, displaySize, file, onComplete]);

  const getCursorForHandle = (handle: DragHandle): string => {
    switch (handle) {
      case "nw":
      case "se":
        return "nwse-resize";
      case "ne":
      case "sw":
        return "nesw-resize";
      case "n":
      case "s":
        return "ns-resize";
      case "e":
      case "w":
        return "ew-resize";
      case "move":
        return "move";
      default:
        return "default";
    }
  };

  if (!imageSrc) {
    return (
      <div className="ie-overlay">
        <div className="ie-modal">
          <div className="ie-loading">
            <svg className="animate-spin" width="36" height="36" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <span>Loading image...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="ie-overlay" onClick={onCancel}>
      <div className="ie-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="ie-header">
          <div className="ie-header-left">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="ie-header-icon">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <polyline points="21 15 16 10 5 21" />
            </svg>
            <h3>Edit Image</h3>
          </div>
          <button onClick={onCancel} className="ie-close-btn" title="Close">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Canvas area */}
        <div className="ie-canvas" ref={containerRef}>
          {/* Checkerboard hint behind image */}
          <div
            className="ie-image-wrapper"
            style={{ width: displaySize.width, height: displaySize.height }}
            onMouseDown={handlePointerDown}
            onMouseMove={handlePointerMove}
            onMouseUp={handlePointerUp}
            onMouseLeave={handlePointerUp}
            onTouchStart={handlePointerDown}
            onTouchMove={handlePointerMove}
            onTouchEnd={handlePointerUp}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              ref={imageRef}
              src={imageSrc}
              alt="Edit preview"
              draggable={false}
              style={{
                width: displaySize.width,
                height: displaySize.height,
                transform: `rotate(${rotation}deg)`,
                transformOrigin: "center center",
                ...(rotation % 180 !== 0
                  ? {
                      width: displaySize.height,
                      height: displaySize.width,
                      margin: `${(displaySize.height - displaySize.width) / 2}px ${(displaySize.width - displaySize.height) / 2}px`,
                    }
                  : {}),
              }}
              className="ie-img"
            />

            {/* Crop overlay */}
            {isCropping && crop && (
              <>
                {/* Darkened mask outside crop */}
                <div
                  className="ie-crop-mask"
                  style={{
                    clipPath: `polygon(
                      0% 0%, 100% 0%, 100% 100%, 0% 100%, 0% 0%,
                      ${crop.x}px ${crop.y}px,
                      ${crop.x}px ${crop.y + crop.height}px,
                      ${crop.x + crop.width}px ${crop.y + crop.height}px,
                      ${crop.x + crop.width}px ${crop.y}px,
                      ${crop.x}px ${crop.y}px
                    )`,
                  }}
                />
                {/* Crop selection box */}
                <div
                  className="ie-crop-box"
                  style={{
                    left: crop.x,
                    top: crop.y,
                    width: crop.width,
                    height: crop.height,
                    cursor: dragHandle ? getCursorForHandle(dragHandle) : "move",
                  }}
                >
                  {/* Rule of thirds grid */}
                  <div className="ie-crop-grid">
                    <div className="ie-grid-h" style={{ top: "33.33%" }} />
                    <div className="ie-grid-h" style={{ top: "66.66%" }} />
                    <div className="ie-grid-v" style={{ left: "33.33%" }} />
                    <div className="ie-grid-v" style={{ left: "66.66%" }} />
                  </div>

                  {/* Corner handles */}
                  <div className="ie-handle ie-h-nw" />
                  <div className="ie-handle ie-h-ne" />
                  <div className="ie-handle ie-h-sw" />
                  <div className="ie-handle ie-h-se" />
                  {/* Edge handles */}
                  <div className="ie-handle ie-h-n" />
                  <div className="ie-handle ie-h-s" />
                  <div className="ie-handle ie-h-w" />
                  <div className="ie-handle ie-h-e" />
                </div>

                {/* Size badge */}
                <div
                  className="ie-crop-size"
                  style={{
                    left: crop.x + crop.width / 2,
                    top: crop.y + crop.height + 12,
                  }}
                >
                  {Math.round(crop.width)} × {Math.round(crop.height)}
                </div>
              </>
            )}
          </div>

          {/* Rotation indicator badge */}
          {rotation !== 0 && (
            <div className="ie-rotation-badge">
              {rotation}°
            </div>
          )}
        </div>

        {/* Toolbar */}
        <div className="ie-toolbar">
          <div className="ie-tools">
            {/* Rotate Left */}
            <button
              onClick={() => handleRotate("ccw")}
              className="ie-tool-btn"
              title="Rotate left 90°"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M2.5 2v6h6" />
                <path d="M2.66 15.57a10 10 0 1 0 .57-8.38L2.5 8" />
              </svg>
              <span>Rotate Left</span>
            </button>

            {/* Rotate Right */}
            <button
              onClick={() => handleRotate("cw")}
              className="ie-tool-btn"
              title="Rotate right 90°"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21.5 2v6h-6" />
                <path d="M21.34 15.57a10 10 0 1 1-.57-8.38L21.5 8" />
              </svg>
              <span>Rotate Right</span>
            </button>

            <div className="ie-divider" />

            {/* Crop toggle */}
            <button
              onClick={isCropping ? disableCrop : enableCrop}
              className={`ie-tool-btn ${isCropping ? "ie-tool-active" : ""}`}
              title={isCropping ? "Cancel crop" : "Crop image"}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 2v14a2 2 0 002 2h14" />
                <path d="M18 22V8a2 2 0 00-2-2H2" />
              </svg>
              <span>{isCropping ? "Cancel Crop" : "Crop"}</span>
            </button>

            {/* Reset */}
            {(rotation !== 0 || isCropping) && (
              <button
                onClick={() => {
                  setRotation(0);
                  setCrop(null);
                  setIsCropping(false);
                }}
                className="ie-tool-btn ie-tool-reset"
                title="Reset all edits"
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                  <path d="M3 3v5h5" />
                </svg>
                <span>Reset</span>
              </button>
            )}
          </div>

          <div className="ie-actions">
            <button
              onClick={onCancel}
              className="ie-btn-cancel"
              disabled={processing}
            >
              Cancel
            </button>
            <button
              onClick={applyEdits}
              className="ie-btn-apply"
              disabled={processing}
            >
              {processing ? (
                <>
                  <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Processing...
                </>
              ) : (
                <>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  Apply &amp; Upload
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
