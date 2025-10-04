'use client';

import { useState } from 'react';
import { EdgeProps, getBezierPath } from 'reactflow';

export function AddNodeEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
  data,
}: EdgeProps) {
  const [isHovered, setIsHovered] = useState(false);

  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const handleAddClick = (event: React.MouseEvent) => {
    event.stopPropagation();
    if (data?.onAddNode) {
      data.onAddNode(id, { x: labelX, y: labelY });
    }
  };

  return (
    <>
      {/* Edge Path */}
      <path
        id={id}
        style={style}
        className="react-flow__edge-path stroke-2"
        d={edgePath}
        markerEnd={markerEnd}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      />

      {/* Add Button */}
      {isHovered && (
        <g transform={`translate(${labelX}, ${labelY})`}>
          {/* Background Circle */}
          <circle
            r={16}
            fill="white"
            stroke="#9333ea"
            strokeWidth={2}
            className="cursor-pointer"
            onClick={handleAddClick}
          />
          
          {/* Plus Icon - SVG path */}
          <g transform="translate(-6, -6)">
            <line
              x1="6"
              y1="0"
              x2="6"
              y2="12"
              stroke="#9333ea"
              strokeWidth={2}
              strokeLinecap="round"
            />
            <line
              x1="0"
              y1="6"
              x2="12"
              y2="6"
              stroke="#9333ea"
              strokeWidth={2}
              strokeLinecap="round"
            />
          </g>
        </g>
      )}
    </>
  );
}

