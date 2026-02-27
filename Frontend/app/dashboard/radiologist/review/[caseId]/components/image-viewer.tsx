"use client"

interface Detection {
  id: string
  class: "pneumonia" | "tuberculosis" | "tumor"
  confidence: number
  bbox: { x: number; y: number; width: number; height: number }
}

interface ImageViewerProps {
  detections: Detection[]
  showConfidenceScores: boolean
  zoom: number
  selectedDetection: Detection | null
  onSelectDetection: (detection: Detection) => void
}

const classColors = {
  pneumonia: "rgb(239, 68, 68)",
  tuberculosis: "rgb(234, 179, 8)",
  tumor: "rgb(249, 115, 22)",
}

export default function ImageViewer({
  detections,
  showConfidenceScores,
  zoom,
  selectedDetection,
  onSelectDetection,
}: ImageViewerProps) {
  return (
    <div className="relative w-full h-full flex items-center justify-center p-4">
      {/* Mock X-ray Image */}
      <div
        className="relative bg-gradient-to-br from-gray-700 to-gray-900 rounded"
        style={{
          width: "400px",
          height: "500px",
          transform: `scale(${zoom / 100})`,
          transformOrigin: "center",
        }}
      >
        {/* Simulated X-ray content */}
        <div className="absolute inset-0 opacity-30">
          <div className="w-full h-full bg-gradient-radial from-gray-600 to-gray-900" />
        </div>

        {/* Bounding Boxes */}
        {detections.map((detection) => (
          <div
            key={detection.id}
            className="absolute cursor-pointer transition-all"
            style={{
              left: `${detection.bbox.x}px`,
              top: `${detection.bbox.y}px`,
              width: `${detection.bbox.width}px`,
              height: `${detection.bbox.height}px`,
              border: `2px solid ${classColors[detection.class]}`,
              opacity: selectedDetection?.id === detection.id ? 1 : 0.7,
              boxShadow: selectedDetection?.id === detection.id ? `0 0 10px ${classColors[detection.class]}` : "none",
            }}
            onClick={() => onSelectDetection(detection)}
          >
            {/* Label */}
            <div
              className="absolute top-0 left-0 text-xs font-bold text-white px-2 py-1 whitespace-nowrap"
              style={{
                backgroundColor: classColors[detection.class],
              }}
            >
              {detection.class.charAt(0).toUpperCase() + detection.class.slice(1)}
              {showConfidenceScores && ` ${detection.confidence}%`}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
