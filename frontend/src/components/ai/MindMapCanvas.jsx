import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Focus, Maximize2, Minus, Network, Plus, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { NODE_HEIGHT, NODE_WIDTH, computeLayout, edgePath } from './mind-map-layout';

const MIN_ZOOM = 0.35;
const MAX_ZOOM = 2.2;
const ZOOM_STEP = 0.18;
const KEYBOARD_NUDGE = 16;

const clampZoom = (value) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, value));

/**
 * Interactive mind-map canvas.
 *
 * Interaction model:
 *  - drag empty canvas (or middle mouse) to pan
 *  - drag a node to move it; the drop position is reported once, on release
 *  - wheel scrolls, ctrl/cmd + wheel zooms toward the pointer
 *  - arrow keys nudge a focused node, so the map is operable without a mouse
 */
const MindMapCanvas = ({
  mindMap,
  compact = false,
  selectedNodeId,
  onSelectNode,
  onMoveNode,
  editable = false,
  className
}) => {
  const viewportRef = useRef(null);
  const [view, setView] = useState({ x: 0, y: 0, zoom: 1 });
  const [draft, setDraft] = useState(null);
  const [panning, setPanning] = useState(false);
  const pointerRef = useRef(null);
  const hasFitRef = useRef(false);

  const layout = useMemo(() => computeLayout(mindMap), [mindMap]);

  // While a node is being dragged its position comes from the drag state, so the
  // committed layout is never mutated mid-gesture.
  const positionOf = useCallback(
    (nodeId) => {
      if (draft?.id === nodeId) return { x: draft.x, y: draft.y };
      return layout?.positions.get(nodeId);
    },
    [draft, layout]
  );

  const fitToView = useCallback(() => {
    const viewport = viewportRef.current;
    if (!viewport || !layout) return;
    const { clientWidth, clientHeight } = viewport;
    if (!clientWidth || !clientHeight) return;

    const zoom = clampZoom(
      Math.min(clientWidth / layout.width, clientHeight / layout.height, 1)
    );
    setView({
      zoom,
      x: (clientWidth - layout.width * zoom) / 2,
      y: (clientHeight - layout.height * zoom) / 2
    });
  }, [layout]);

  // Fit once per map so the whole graph is visible without hunting for it.
  useEffect(() => {
    hasFitRef.current = false;
  }, [mindMap]);

  useEffect(() => {
    if (!layout || hasFitRef.current) return;
    hasFitRef.current = true;
    fitToView();
  }, [fitToView, layout]);

  const zoomBy = useCallback((delta, origin) => {
    setView((current) => {
      const nextZoom = clampZoom(current.zoom + delta);
      if (nextZoom === current.zoom) return current;
      const viewport = viewportRef.current;
      const anchorX = origin?.x ?? (viewport?.clientWidth ?? 0) / 2;
      const anchorY = origin?.y ?? (viewport?.clientHeight ?? 0) / 2;
      const ratio = nextZoom / current.zoom;
      return {
        zoom: nextZoom,
        x: anchorX - (anchorX - current.x) * ratio,
        y: anchorY - (anchorY - current.y) * ratio
      };
    });
  }, []);

  // Registered natively so preventDefault works: React's onWheel is passive.
  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return undefined;

    const onWheel = (event) => {
      if (event.ctrlKey || event.metaKey) {
        event.preventDefault();
        const bounds = viewport.getBoundingClientRect();
        zoomBy(event.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP, {
          x: event.clientX - bounds.left,
          y: event.clientY - bounds.top
        });
        return;
      }
      event.preventDefault();
      setView((current) => ({
        ...current,
        x: current.x - event.deltaX,
        y: current.y - event.deltaY
      }));
    };

    viewport.addEventListener('wheel', onWheel, { passive: false });
    return () => viewport.removeEventListener('wheel', onWheel);
  }, [zoomBy]);

  const startPan = (event) => {
    // Left button on empty canvas, or middle button anywhere.
    if (event.button !== 0 && event.button !== 1) return;
    pointerRef.current = {
      mode: 'pan',
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: view.x,
      originY: view.y
    };
    event.currentTarget.setPointerCapture(event.pointerId);
    setPanning(true);
  };

  const startNodeDrag = (event, node) => {
    if (!editable || event.button !== 0) return;
    const position = positionOf(node.id);
    if (!position) return;

    event.stopPropagation();
    pointerRef.current = {
      mode: 'node',
      pointerId: event.pointerId,
      nodeId: node.id,
      startX: event.clientX,
      startY: event.clientY,
      originX: position.x,
      originY: position.y,
      moved: false
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event) => {
    const pointer = pointerRef.current;
    if (!pointer || pointer.pointerId !== event.pointerId) return;

    const dx = event.clientX - pointer.startX;
    const dy = event.clientY - pointer.startY;

    if (pointer.mode === 'pan') {
      setView((current) => ({
        ...current,
        x: pointer.originX + dx,
        y: pointer.originY + dy
      }));
      return;
    }

    // A few pixels of slop keeps a click from registering as a drag.
    if (!pointer.moved && Math.hypot(dx, dy) < 3) return;
    pointer.moved = true;
    setDraft({
      id: pointer.nodeId,
      x: pointer.originX + dx / view.zoom,
      y: pointer.originY + dy / view.zoom
    });
  };

  const endPointer = (event) => {
    const pointer = pointerRef.current;
    if (!pointer || pointer.pointerId !== event.pointerId) return;
    pointerRef.current = null;
    setPanning(false);

    if (pointer.mode === 'node' && pointer.moved && draft) {
      onMoveNode?.(pointer.nodeId, { x: Math.round(draft.x), y: Math.round(draft.y) });
    }
    setDraft(null);
  };

  const nudge = (event, node) => {
    if (!editable) return;
    const deltas = {
      ArrowUp: [0, -KEYBOARD_NUDGE],
      ArrowDown: [0, KEYBOARD_NUDGE],
      ArrowLeft: [-KEYBOARD_NUDGE, 0],
      ArrowRight: [KEYBOARD_NUDGE, 0]
    };
    const delta = deltas[event.key];
    if (!delta) return;
    const position = positionOf(node.id);
    if (!position) return;
    event.preventDefault();
    onMoveNode?.(node.id, {
      x: Math.round(position.x + delta[0]),
      y: Math.round(position.y + delta[1])
    });
  };

  if (!layout) {
    return (
      <div
        className={cn(
          'grid min-h-72 place-items-center rounded-xl border border-dashed bg-card/50 text-center',
          className
        )}
      >
        <div>
          <span className="icon-chip mx-auto">
            <Network className="size-4" strokeWidth={1.8} />
          </span>
          <p className="mt-3 text-body font-medium">No mind-map data</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'relative isolate h-full min-h-[420px] overflow-hidden rounded-xl border bg-[hsl(var(--editor-canvas))]',
        className
      )}
    >
      <div className="mind-map-grid pointer-events-none absolute inset-0" aria-hidden="true" />

      <div
        ref={viewportRef}
        role="application"
        aria-label={`${mindMap?.title || 'Mind map'} canvas`}
        onPointerDown={startPan}
        onPointerMove={handlePointerMove}
        onPointerUp={endPointer}
        onPointerCancel={endPointer}
        className={cn(
          'absolute inset-0 touch-none',
          panning ? 'cursor-grabbing' : 'cursor-grab'
        )}
      >
        <div
          className="absolute left-0 top-0 origin-top-left will-change-transform"
          style={{
            transform: `translate3d(${view.x}px, ${view.y}px, 0) scale(${view.zoom})`,
            width: layout.width,
            height: layout.height
          }}
        >
          <svg
            className="pointer-events-none absolute inset-0 overflow-visible"
            width={layout.width}
            height={layout.height}
            aria-hidden="true"
          >
            {layout.edges.map((edge, index) => {
              const source = positionOf(edge.source);
              const target = positionOf(edge.target);
              if (!source || !target) return null;
              const active =
                selectedNodeId === edge.source || selectedNodeId === edge.target;
              return (
                <path
                  key={`${edge.source}-${edge.target}-${index}`}
                  d={edgePath(source, target)}
                  fill="none"
                  stroke={active ? 'hsl(var(--primary))' : 'hsl(var(--primary) / 0.26)'}
                  strokeWidth={active ? 2 : 1.5}
                  strokeLinecap="round"
                />
              );
            })}
          </svg>

          {layout.nodes.map((node) => {
            const position = positionOf(node.id);
            if (!position) return null;
            const isRoot = !node.parentId;
            const isSelected = node.id === selectedNodeId;
            const isDragging = draft?.id === node.id;

            return (
              <div
                key={node.id}
                role="button"
                tabIndex={0}
                aria-pressed={isSelected}
                onPointerDown={(event) => startNodeDrag(event, node)}
                onPointerMove={handlePointerMove}
                onPointerUp={endPointer}
                onPointerCancel={endPointer}
                onClick={() => onSelectNode?.(node)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    onSelectNode?.(node);
                    return;
                  }
                  nudge(event, node);
                }}
                style={{
                  left: position.x,
                  top: position.y,
                  width: NODE_WIDTH,
                  minHeight: NODE_HEIGHT
                }}
                className={cn(
                  'mind-map-node absolute flex flex-col rounded-xl border p-3 text-left',
                  isRoot
                    ? 'border-primary bg-primary text-primary-foreground shadow-lifted'
                    : 'border-border bg-card text-card-foreground shadow-raised',
                  editable && 'cursor-grab active:cursor-grabbing',
                  isDragging && 'z-30 scale-[1.02] cursor-grabbing shadow-floating',
                  isSelected && !isRoot && 'border-primary ring-2 ring-primary/20',
                  isSelected && isRoot && 'ring-2 ring-primary/40 ring-offset-2'
                )}
              >
                <p className="truncate text-caption font-semibold leading-tight">{node.label}</p>
                <p
                  className={cn(
                    'mt-1 line-clamp-2 text-meta',
                    isRoot ? 'text-primary-foreground/80' : 'text-muted-foreground'
                  )}
                >
                  {node.description}
                </p>
                {node.sourceChunks?.length > 0 && (
                  <span
                    className={cn(
                      'mt-auto pt-1.5 text-meta font-medium',
                      isRoot ? 'text-primary-foreground/70' : 'text-muted-foreground/80'
                    )}
                  >
                    {node.sourceChunks.length} source
                    {node.sourceChunks.length === 1 ? '' : 's'}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="absolute bottom-3 right-3 z-20 flex items-center gap-1 rounded-full border bg-card/95 p-1 shadow-floating backdrop-blur">
        <Button
          variant="ghost"
          size="icon"
          className="size-7 rounded-full"
          onClick={() => zoomBy(-ZOOM_STEP)}
          title="Zoom out"
          aria-label="Zoom out"
        >
          <Minus className="size-3.5" />
        </Button>
        <button
          type="button"
          onClick={() => setView((current) => ({ ...current, zoom: 1 }))}
          className="min-w-11 rounded-full px-1 text-meta font-medium tabular-nums text-muted-foreground transition-colors duration-control hover:bg-secondary"
          title="Reset zoom to 100%"
        >
          {Math.round(view.zoom * 100)}%
        </button>
        <Button
          variant="ghost"
          size="icon"
          className="size-7 rounded-full"
          onClick={() => zoomBy(ZOOM_STEP)}
          title="Zoom in"
          aria-label="Zoom in"
        >
          <Plus className="size-3.5" />
        </Button>
        <span className="mx-0.5 h-4 w-px bg-border" />
        <Button
          variant="ghost"
          size="icon"
          className="size-7 rounded-full"
          onClick={fitToView}
          title="Fit map to view"
          aria-label="Fit map to view"
        >
          <Maximize2 className="size-3.5" />
        </Button>
        {editable && (
          <Button
            variant="ghost"
            size="icon"
            className="size-7 rounded-full"
            onClick={() => onMoveNode?.(null, null)}
            title="Reset node positions"
            aria-label="Reset node positions"
          >
            <RotateCcw className="size-3.5" />
          </Button>
        )}
      </div>

      {!compact && (
        <p className="pointer-events-none absolute bottom-4 left-4 z-10 hidden items-center gap-1.5 text-meta text-muted-foreground/80 sm:flex">
          <Focus className="size-3" />
          Drag to pan · {editable ? 'drag a node to move it · ' : ''}⌘/Ctrl + scroll to zoom
        </p>
      )}
    </div>
  );
};

export default MindMapCanvas;
