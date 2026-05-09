'use client';

import * as React from 'react';
import { Stage, Layer, Image as KonvaImage, Rect, Text as KonvaText, Group, Transformer, Line } from 'react-konva';
import useImage from 'use-image';
import { Prediction } from '@/types';
import { ZoomIn, ZoomOut, MousePointer2, Move, Square, Trash2, Edit2, RotateCcw, Activity } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface ImageViewerProps {
    imageUrl: string;
    annotations: Prediction[];
    lungSegmentation?: number[][][]; // New: List of polygons [x, y][]
    mode: 'edit' | 'view';
    onAnnotationsChange?: (annotations: Prediction[]) => void;
    showAnnotations?: boolean;
    showScores?: boolean;
}

const CLASS_COLORS: Record<string, string> = {
    'Pneumonia': '#ef4444', // red-500
    'Tuberculosis': '#eab308', // yellow-500
    'Lung Tumor': '#f97316', // orange-500
    'Normal': '#22c55e', // green-500
    'Other': '#3b82f6', // blue-500
};

export function ImageViewer({
    imageUrl,
    annotations,
    lungSegmentation,
    mode,
    onAnnotationsChange,
    showAnnotations = true,
    showScores = true
}: ImageViewerProps) {
    const containerRef = React.useRef<HTMLDivElement>(null);
    const stageRef = React.useRef<any>(null);
    const transformerRef = React.useRef<any>(null);

    const [image, imageStatus] = useImage(imageUrl || 'https://placehold.co/800x1000/111827/ffffff?text=X-Ray+Placeholder', 'anonymous');
    const [dimensions, setDimensions] = React.useState({ width: 800, height: 600 });

    // Viewport states
    const [scale, setScale] = React.useState(1);
    const [position, setPosition] = React.useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = React.useState(false);

    // Tools state (only relevant in edit mode)
    type ToolType = 'select' | 'pan' | 'draw';
    const [activeTool, setActiveTool] = React.useState<ToolType>('pan');
    const [selectedId, setSelectedId] = React.useState<string | null>(null);
    const [newAnnotation, setNewAnnotation] = React.useState<{ x: number, y: number, w: number, h: number } | null>(null);
    const [showLungs, setShowLungs] = React.useState(true);

    // Helper: Flatten [[x,y], [x,y]] to [x,y,x,y] for Konva Line
    const getPoints = (poly: number[][]) => poly.reduce((acc, pt) => acc.concat(pt), [] as number[]);

    React.useEffect(() => {
        // Resize observer to keep canvas responsive
        if (!containerRef.current) return;

        const unobserver = new ResizeObserver((entries) => {
            for (let entry of entries) {
                setDimensions({
                    width: entry.contentRect.width,
                    height: entry.contentRect.height,
                });
            }
        });

        unobserver.observe(containerRef.current);
        return () => unobserver.disconnect();
    }, []);

    // Sync transformer
    React.useEffect(() => {
        if (mode === 'edit' && activeTool === 'select' && selectedId && transformerRef.current) {
            const node = stageRef.current.findOne(`#${selectedId}`);
            if (node) {
                transformerRef.current.nodes([node]);
                transformerRef.current.getLayer().batchDraw();
            }
        } else if (transformerRef.current) {
            transformerRef.current.nodes([]);
        }
    }, [selectedId, activeTool, mode, annotations]);

    const handleWheel = (e: any) => {
        e.evt.preventDefault();
        const scaleBy = 1.1;
        const stage = e.target.getStage();
        const oldScale = stage.scaleX();

        const pointer = stage.getPointerPosition();
        if (!pointer) return;

        const mousePointTo = {
            x: (pointer.x - stage.x()) / oldScale,
            y: (pointer.y - stage.y()) / oldScale,
        };

        const newScale = e.evt.deltaY < 0 ? oldScale * scaleBy : oldScale / scaleBy;
        // Limit zoom out to initial scale (1), limit zoom in to 5x
        const boundedScale = Math.min(Math.max(newScale, 0.25), 5);

        setScale(boundedScale);
        setPosition({
            x: pointer.x - mousePointTo.x * boundedScale,
            y: pointer.y - mousePointTo.y * boundedScale,
        });
    };

    const handleZoomIn = () => setScale(prev => Math.min(prev * 1.2, 5));
    const handleZoomOut = () => setScale(prev => Math.max(prev / 1.2, 0.25));
    const handleReset = () => {
        setScale(1);
        setPosition({ x: 0, y: 0 });
    };

    const checkDeselect = (e: any) => {
        const clickedOnEmpty = e.target === e.target.getStage() || e.target.name() === 'image';
        if (clickedOnEmpty) {
            setSelectedId(null);
        }
    };

    const handleStageMouseDown = (e: any) => {
        if (activeTool === 'pan' || mode === 'view') {
            const stage = e.target.getStage();
            stage.container().style.cursor = 'grabbing';
            checkDeselect(e);
            return;
        }

        if (activeTool === 'select') {
            checkDeselect(e);
            return;
        }

        if (activeTool === 'draw') {
            const pos = e.target.getStage().getRelativePointerPosition();
            if (pos) {
                setNewAnnotation({ x: pos.x, y: pos.y, w: 0, h: 0 });
            }
        }
    };

    const handleStageMouseMove = (e: any) => {
        if (activeTool === 'draw' && newAnnotation) {
            const pos = e.target.getStage().getRelativePointerPosition();
            if (pos) {
                setNewAnnotation(prev => prev ? ({
                    ...prev,
                    w: pos.x - prev.x,
                    h: pos.y - prev.y
                }) : null);
            }
        }
    };

    const handleStageMouseUp = (e: any) => {
        if (activeTool === 'pan' || mode === 'view') {
            const stage = e.target.getStage();
            stage.container().style.cursor = 'grab';
            return;
        }

        if (activeTool === 'draw' && newAnnotation) {
            // Prevent creating tiny accidental boxes
            if (Math.abs(newAnnotation.w) > 10 && Math.abs(newAnnotation.h) > 10) {

                // Normalize box (width/height can be negative during drawing)
                const normalizedBox = {
                    x: newAnnotation.w < 0 ? newAnnotation.x + newAnnotation.w : newAnnotation.x,
                    y: newAnnotation.h < 0 ? newAnnotation.y + newAnnotation.h : newAnnotation.y,
                    w: Math.abs(newAnnotation.w),
                    h: Math.abs(newAnnotation.h)
                };

                const newPred: Prediction = {
                    id: `new-${Date.now()}`,
                    disease_class: 'Other',
                    confidence_score: 1.0,
                    bounding_box: normalizedBox
                };

                if (onAnnotationsChange) {
                    onAnnotationsChange([...annotations, newPred]);
                    setSelectedId(newPred.id || null);
                    setActiveTool('select');
                }
            }
            setNewAnnotation(null);
        }
    };

    const handleBoxTransformEnd = (e: any, id: string) => {
        const node = stageRef.current.findOne(`#${id}`);
        const scaleX = node.scaleX();
        const scaleY = node.scaleY();

        node.scaleX(1);
        node.scaleY(1);

        if (onAnnotationsChange) {
            const updated = annotations.map(a => {
                if (a.id === id) {
                    return {
                        ...a,
                        bounding_box: {
                            x: node.x(),
                            y: node.y(),
                            w: Math.max(5, node.width() * scaleX),
                            h: Math.max(5, node.height() * scaleY)
                        }
                    };
                }
                return a;
            });
            onAnnotationsChange(updated);
        }
    };

    const handleBoxDragEnd = (e: any, id: string) => {
        if (onAnnotationsChange) {
            const updated = annotations.map(a => {
                if (a.id === id) {
                    return {
                        ...a,
                        bounding_box: { ...a.bounding_box, x: e.target.x(), y: e.target.y() }
                    };
                }
                return a;
            });
            onAnnotationsChange(updated);
        }
    };

    return (
        <div className="relative w-full h-full flex flex-col bg-zinc-950 rounded-lg overflow-hidden border border-border group" ref={containerRef}>

            {/* Loading / Error overlays */}
            {imageStatus === 'loading' && (
                <div className="absolute inset-0 z-20 flex items-center justify-center bg-zinc-950/80">
                    <div className="flex flex-col items-center gap-3">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400" />
                        <span className="text-zinc-400 text-sm">Loading X-ray image…</span>
                    </div>
                </div>
            )}
            {imageStatus === 'failed' && (
                <div className="absolute inset-0 z-20 flex items-center justify-center bg-zinc-950/80">
                    <div className="flex flex-col items-center gap-2 text-center px-4">
                        <span className="text-red-400 text-sm font-medium">Failed to load image</span>
                        <span className="text-zinc-500 text-xs">The X-ray could not be retrieved. Please try refreshing the page.</span>
                    </div>
                </div>
            )}

            {/* Zoom and Tools Overlay */}
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 flex items-center p-1.5 bg-zinc-900/80 backdrop-blur border border-zinc-700 rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity">
                <TooltipProvider>

                    {(mode === 'edit') && (
                        <>
                            <div className="flex bg-zinc-800 rounded-md overflow-hidden mr-3">
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button
                                            variant={activeTool === 'pan' ? 'default' : 'ghost'}
                                            size="icon"
                                            aria-label="Pan Tool"
                                            className={`h-8 w-8 rounded-none ${activeTool === 'pan' ? 'bg-blue-600 text-white' : 'text-zinc-400'}`}
                                            onClick={() => setActiveTool('pan')}
                                        >
                                            <Move className="h-4 w-4" />
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Pan Tool</TooltipContent>
                                </Tooltip>

                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button
                                            variant={activeTool === 'select' ? 'default' : 'ghost'}
                                            size="icon"
                                            aria-label="Select Tool"
                                            className={`h-8 w-8 rounded-none ${activeTool === 'select' ? 'bg-blue-600 text-white' : 'text-zinc-400'}`}
                                            onClick={() => setActiveTool('select')}
                                        >
                                            <MousePointer2 className="h-4 w-4" />
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Select Tool</TooltipContent>
                                </Tooltip>

                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button
                                            variant={activeTool === 'draw' ? 'default' : 'ghost'}
                                            size="icon"
                                            aria-label="Draw Bounding Box"
                                            className={`h-8 w-8 rounded-none ${activeTool === 'draw' ? 'bg-blue-600 text-white' : 'text-zinc-400'}`}
                                            onClick={() => { setActiveTool('draw'); setSelectedId(null); }}
                                        >
                                            <Square className="h-4 w-4" />
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Draw Bounding Box</TooltipContent>
                                </Tooltip>
                            </div>
                            <div className="w-px h-5 bg-zinc-700 mr-3" />
                        </>
                    )}

                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                variant="ghost"
                                size="icon"
                                className={`h-8 w-8 mr-1 ${showLungs ? 'text-blue-400' : 'text-zinc-400'}`}
                                onClick={() => setShowLungs(!showLungs)}
                                disabled={!lungSegmentation?.length}
                            >
                                <Activity className="h-4 w-4" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>{showLungs ? 'Hide Lung Mask' : 'Show Lung Mask'}</TooltipContent>
                    </Tooltip>

                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" aria-label="Zoom Out" className="h-8 w-8 text-zinc-400 hover:text-white" onClick={handleZoomOut}>
                                <ZoomOut className="h-4 w-4" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>Zoom Out</TooltipContent>
                    </Tooltip>

                    <div className="text-xs font-mono text-zinc-400 px-2 min-w-[50px] text-center">
                        {Math.round(scale * 100)}%
                    </div>

                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" aria-label="Zoom In" className="h-8 w-8 text-zinc-400 hover:text-white" onClick={handleZoomIn}>
                                <ZoomIn className="h-4 w-4" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>Zoom In</TooltipContent>
                    </Tooltip>

                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" aria-label="Reset View" className="h-8 w-8 text-zinc-400 hover:text-white ml-1" onClick={handleReset}>
                                <RotateCcw className="h-4 w-4" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>Reset View</TooltipContent>
                    </Tooltip>

                </TooltipProvider>
            </div>

            <div className="flex-1 overflow-hidden" style={{ cursor: activeTool === 'pan' || mode === 'view' ? 'grab' : activeTool === 'draw' ? 'crosshair' : 'default' }}>
                <Stage
                    width={dimensions.width}
                    height={dimensions.height}
                    onWheel={handleWheel}
                    scaleX={scale}
                    scaleY={scale}
                    x={position.x}
                    y={position.y}
                    draggable={activeTool === 'pan' || mode === 'view'}
                    onDragStart={(e) => {
                        if (e.target.name() === 'box') {
                            e.cancelBubble = true;
                            return;
                        }
                        const stage = e.target.getStage();
                        if (stage) stage.container().style.cursor = 'grabbing';
                    }}
                    onDragEnd={(e) => {
                        const stage = e.target.getStage();
                        if (stage) {
                            setPosition({ x: stage.x(), y: stage.y() });
                            if (activeTool === 'pan' || mode === 'view') {
                                stage.container().style.cursor = 'grab';
                            }
                        }
                    }}
                    onMouseDown={handleStageMouseDown}
                    onMouseMove={handleStageMouseMove}
                    onMouseUp={handleStageMouseUp}
                    ref={stageRef}
                >
                    <Layer>
                        {/* Image Background */}
                        <KonvaImage image={image} x={0} y={0} name="image" />

                        {/* Lung Segmentation Overlay */}
                        {showLungs && lungSegmentation && lungSegmentation.map((poly, i) => (
                            <Line
                                key={`lung-${i}`}
                                points={getPoints(poly)}
                                closed={true}
                                stroke="rgba(34, 197, 94, 0.5)"
                                strokeWidth={2 / scale}
                                fill="rgba(34, 197, 94, 0.1)"
                                listening={false}
                            />
                        ))}

                        {/* Annotations */}
                        {showAnnotations && annotations.filter(a => !a.is_false_positive).map((ann, i) => {
                            const color = CLASS_COLORS[ann.disease_class] || CLASS_COLORS['Other'];
                            const isSelected = selectedId === ann.id;

                            return (
                                <Group
                                    key={ann.id || i}
                                    draggable={mode === 'edit' && activeTool === 'select'}
                                    onDragEnd={(e) => handleBoxDragEnd(e, ann.id!)}
                                    onClick={() => {
                                        if (mode === 'edit' && activeTool === 'select') setSelectedId(ann.id!);
                                    }}
                                    name="boxgroup"
                                >
                                    {/* The Bounding Box */}
                                    <Rect
                                        x={ann.bounding_box.x}
                                        y={ann.bounding_box.y}
                                        width={ann.bounding_box.w}
                                        height={ann.bounding_box.h}
                                        stroke={color}
                                        strokeWidth={isSelected ? 3 / scale : 2 / scale}
                                        fill={isSelected ? `${color}1A` : 'transparent'}
                                        id={ann.id}
                                        name="box"
                                    />

                                    {/* The Segmentation Mask (Polygon) if available */}
                                    {ann.segmentation && (
                                        <Line
                                            points={getPoints(ann.segmentation)}
                                            closed={true}
                                            stroke={color}
                                            strokeWidth={1 / scale}
                                            fill={`${color}33`}
                                            listening={false}
                                        />
                                    )}

                                    {/* Label & Score */}
                                    {showScores && (
                                        <Group x={ann.bounding_box.x} y={ann.bounding_box.y - 24 / scale}>
                                            <Rect
                                                width={(ann.disease_class.length * 8 + 45) / scale}
                                                height={20 / scale}
                                                fill={color}
                                                cornerRadius={2 / scale}
                                            />
                                            <KonvaText
                                                text={`${ann.disease_class} ${(ann.confidence_score * 100).toFixed(0)}%`}
                                                fontSize={12 / scale}
                                                fill="white"
                                                padding={4 / scale}
                                                fontFamily="sans-serif"
                                                fontStyle="bold"
                                            />
                                        </Group>
                                    )}
                                </Group>
                            )
                        })}

                        {/* New drawing box placeholder */}
                        {activeTool === 'draw' && newAnnotation && (
                            <Rect
                                x={newAnnotation.x}
                                y={newAnnotation.y}
                                width={newAnnotation.w}
                                height={newAnnotation.h}
                                stroke="#3b82f6"
                                strokeWidth={2 / scale}
                                dash={[5 / scale, 5 / scale]}
                                fill="rgba(59, 130, 246, 0.1)"
                            />
                        )}

                        {/* Transformer for Selection Edit Mode */}
                        {mode === 'edit' && (
                            <Transformer
                                ref={transformerRef}
                                boundBoxFunc={(oldBox, newBox) => {
                                    if (newBox.width < 5 || newBox.height < 5) return oldBox;
                                    return newBox;
                                }}
                                rotateEnabled={false}
                                ignoreStroke={true}
                                borderStroke="#2563eb"
                                anchorStroke="#2563eb"
                                anchorFill="white"
                                anchorSize={8 / scale}
                                borderDash={[4 / scale, 4 / scale]}
                                onTransformEnd={(e) => selectedId && handleBoxTransformEnd(e, selectedId)}
                            />
                        )}
                    </Layer>
                </Stage>
            </div>

            {/* NFR-24: Screen reader support for diagnostic regions */}
            <div role="status" aria-live="polite" className="sr-only">
                {annotations.length} detection{annotations.length !== 1 ? 's' : ''} found
                {annotations.length > 0 && ': '}
                {annotations.map((a, i) =>
                    `${a.disease_class} at ${Math.round((a.confidence_score || 0) * 100)}% confidence`
                ).join(', ')}
            </div>
        </div>
    );
}
