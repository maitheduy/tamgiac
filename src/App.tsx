/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
} from 'react';

import {
  Play,
  Pause,
  RotateCcw,
  ZoomIn,
  ZoomOut,
  Download,
  Sliders,
  Sparkles,
  Palette,
  Info,
  Layers,
  Check,
  Copy,
  Grid3X3,
  GitBranch,
} from 'lucide-react';

/* =========================================================
   TYPES
========================================================= */

interface PaletteOption {
  id: string;
  name: string;
  colors: string[];
}

interface Point {
  x: number;
  y: number;
}

interface Triangle {
  address: string;
  level: number;
  vertices: [Point, Point, Point];
  color: string;
  functionIndex: number;
}

type Mode = 'chaos' | 'address';

/* =========================================================
   PALETTES
========================================================= */

const PALETTES: PaletteOption[] = [
  {
    id: 'function-map',
    name: 'Phân màu Hàm (f1-f4)',
    colors: [
      '#030712',
      '#22c55e',
      '#ff2a2a',
      '#7c3aed',
      '#ff7a00',
    ],
  },
  {
    id: 'cyberpunk',
    name: 'Cyberpunk Neon',
    colors: [
      '#050510',
      '#00f2fe',
      '#4facfe',
      '#7f00ff',
      '#ff007f',
    ],
  },
  {
    id: 'emerald',
    name: 'Emerald Matrix',
    colors: [
      '#02150d',
      '#00ff87',
      '#60efff',
      '#0061ff',
      '#00264d',
    ],
  },
  {
    id: 'fire',
    name: 'Solar Flare',
    colors: [
      '#1a0500',
      '#ff4b1f',
      '#ff9068',
      '#f9d423',
      '#ff4e50',
    ],
  },
  {
    id: 'cosmic',
    name: 'Deep Cosmic',
    colors: [
      '#050814',
      '#3a1c71',
      '#d76d77',
      '#ffaf7b',
      '#ffffff',
    ],
  },
];

/* =========================================================
   FUNCTION COLORS
========================================================= */

const FUNCTION_COLORS = [
  '#22c55e', // f1 green
  '#ff2a2a', // f2 red
  '#7c3aed', // f3 purple
  '#ff7a00', // f4 orange
];

/* =========================================================
   BASE TRIANGLE
========================================================= */

/*
   Tam giác gốc:

   A(0,0)
   |\
   | \
   |  \
   C(0,-1)----B(1,-1)

   T₀ = △((0,0),(1,-1),(0,-1))

   Quan trọng:
   KHÔNG giả định tam giác con là tam giác vuông cân.

   Mỗi phép biến đổi affine được áp dụng trực tiếp
   lên cả ba đỉnh của tam giác.
*/

const BASE_TRIANGLE: [Point, Point, Point] = [
  { x: 0, y: 0 },
  { x: 1, y: -1 },
  { x: 0, y: -1 },
];

/* =========================================================
   AFFINE MAPS
========================================================= */

function f1(p: Point, alpha: number): Point {
  return {
    x: -(p.x + p.y) / 2 + alpha,
    y: p.y / 2,
  };
}

function f2(p: Point): Point {
  return {
    x: -(p.x + p.y) / 2,
    y: p.y / 2 - 0.5,
  };
}

function f3(p: Point): Point {
  return {
    x: -(p.x + p.y) / 2 + 0.5,
    y: p.y / 2 - 0.5,
  };
}

function f4(p: Point, beta: number): Point {
  return {
    x: (p.x + p.y) / 2 + 0.5 + beta,
    y: -p.y / 2 - 1,
  };
}

/*
   Áp dụng một hàm lên toàn bộ tam giác.

   Đây là điểm quan trọng nhất của phiên bản này:
   chúng ta biến đổi 3 đỉnh thực sự của tam giác,
   không dựng lại một tam giác vuông cân mới.
*/

function transformTriangle(
  triangle: [Point, Point, Point],
  functionIndex: number,
  alpha: number,
  beta: number,
): [Point, Point, Point] {
  return triangle.map((p) => {
    if (functionIndex === 1) return f1(p, alpha);
    if (functionIndex === 2) return f2(p);
    if (functionIndex === 3) return f3(p);
    return f4(p, beta);
  }) as [Point, Point, Point];
}

/* =========================================================
   RECURSIVE ADDRESS GENERATOR
========================================================= */

/*
   Level 0:
   ""

   Address Tree chỉ dùng f₁, f₂, f₃.

   Level 1:
   1
   2
   3
   4

   Level 2:
   11
   12
   13
   14
   21
   22
   23
   24
   31
   32
   33
   34
   41
   42
   43
   44

   Level 3:
   111
   112
   113
   114
   121
   122
   123
   124
   ...

   Level n:
   4ⁿ địa chỉ.

   Lưu ý: f₁, f₂, f₃, f₄ đều thuộc cây địa chỉ 4-nhánh.

   Quy ước:
   hàm mới được nối vào BÊN PHẢI.
*/

function generateTriangles(
  level: number,
  alpha: number,
  beta: number,
): Triangle[] {
  let current: Triangle[] = [
    {
      address: '',
      level: 0,
      vertices: BASE_TRIANGLE,
      color: '#ffffff',
      functionIndex: 0,
    },
  ];

  for (let currentLevel = 1; currentLevel <= level; currentLevel++) {
    const next: Triangle[] = [];

    for (const parent of current) {
      for (let fn = 1; fn <= 4; fn++) {
        const vertices = transformTriangle(
          parent.vertices,
          fn,
          alpha,
          beta,
        );

        next.push({
          address: `${parent.address}${fn}`,
          level: currentLevel,
          vertices,
          color: FUNCTION_COLORS[fn - 1],
          functionIndex: fn,
        });
      }
    }

    current = next;
  }

  return current;
}

/* =========================================================
   GEOMETRY HELPERS
========================================================= */

function centroid(
  vertices: [Point, Point, Point],
): Point {
  return {
    x: (vertices[0].x + vertices[1].x + vertices[2].x) / 3,
    y: (vertices[0].y + vertices[1].y + vertices[2].y) / 3,
  };
}

function distance(a: Point, b: Point): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;

  return Math.sqrt(dx * dx + dy * dy);
}

function triangleSize(
  vertices: [Point, Point, Point],
): number {
  return Math.max(
    distance(vertices[0], vertices[1]),
    distance(vertices[1], vertices[2]),
    distance(vertices[2], vertices[0]),
  );
}

/* =========================================================
   APP
========================================================= */

export default function App() {
  /* -------------------------------------------------------
     PARAMETERS
  ------------------------------------------------------- */

  const [alpha, setAlpha] = useState<number>(0);
  const [beta, setBeta] = useState<number>(0);

  const [iterations, setIterations] =
    useState<number>(200000);

  const [paletteId, setPaletteId] =
    useState<string>('function-map');

  const [isDarkMode] =
    useState<boolean>(true);

  /* -------------------------------------------------------
     MODES
  ------------------------------------------------------- */

  const [mode, setMode] =
    useState<Mode>('chaos');

  /* -------------------------------------------------------
     ADDRESS MODE
  ------------------------------------------------------- */

  const [addressLevel, setAddressLevel] =
    useState<number>(2);

  const [showAddresses, setShowAddresses] =
    useState<boolean>(true);

  const [showTriangleEdges, setShowTriangleEdges] =
    useState<boolean>(true);

  const [showBaseTriangle, setShowBaseTriangle] =
    useState<boolean>(true);

  const [fillTriangles, setFillTriangles] =
    useState<boolean>(true);

  /* -------------------------------------------------------
     ANIMATION
  ------------------------------------------------------- */

  const [isAnimating, setIsAnimating] =
    useState<boolean>(false);

  const [animSpeed, setAnimSpeed] =
    useState<number>(1);

  /* -------------------------------------------------------
     VIEW
  ------------------------------------------------------- */

  const [zoom, setZoom] =
    useState<number>(1);

  const [pan, setPan] =
    useState<{ x: number; y: number }>({
      x: 0,
      y: 0,
    });

  const [isDragging, setIsDragging] =
    useState<boolean>(false);

  const [dragStart, setDragStart] =
    useState<{ x: number; y: number }>({
      x: 0,
      y: 0,
    });

  /* -------------------------------------------------------
     UI
  ------------------------------------------------------- */

  const [showInfoModal, setShowInfoModal] =
    useState<boolean>(false);

  const [copiedNotification, setCopiedNotification] =
    useState<boolean>(false);

  const [renderStats, setRenderStats] =
    useState<{
      time: number;
      points: number;
    }>({
      time: 0,
      points: 0,
    });

  /* -------------------------------------------------------
     REFS
  ------------------------------------------------------- */

  const canvasRef =
    useRef<HTMLCanvasElement | null>(null);

  const animFrameRef =
    useRef<number | null>(null);

  const timeRef =
    useRef<number>(0);

  /* =======================================================
     PRESETS
  ======================================================= */

  const PRESETS = [
    {
      name: 'Mặc định',
      alpha: 0,
      beta: 0,
    },
    {
      name: 'Đối xứng A',
      alpha: 0.5,
      beta: -0.5,
    },
    {
      name: 'Xoắn ốc B',
      alpha: -0.8,
      beta: 0.8,
    },
    {
      name: 'Lượn sóng C',
      alpha: 1.2,
      beta: -1,
    },
    {
      name: 'Cánh hoa D',
      alpha: -1.5,
      beta: 1.5,
    },
    {
      name: 'Đặc biệt E',
      alpha: 0.2,
      beta: -1.8,
    },
  ];

  /* =======================================================
     ANIMATION
  ======================================================= */

  useEffect(() => {
    if (!isAnimating) {
      return;
    }

    let lastTime = performance.now();

    const updateAnimation = (
      now: number,
    ) => {
      const dt =
        (now - lastTime) / 1000;

      lastTime = now;

      timeRef.current +=
        dt * animSpeed * 0.8;

      const newAlpha =
        parseFloat(
          (
            Math.sin(
              timeRef.current * 0.7,
            ) * 1.5
          ).toFixed(3),
        );

      const newBeta =
        parseFloat(
          (
            Math.cos(
              timeRef.current * 0.5,
            ) * 1.5
          ).toFixed(3),
        );

      setAlpha(newAlpha);
      setBeta(newBeta);

      animFrameRef.current =
        requestAnimationFrame(
          updateAnimation,
        );
    };

    animFrameRef.current =
      requestAnimationFrame(
        updateAnimation,
      );

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(
          animFrameRef.current,
        );
      }
    };
  }, [isAnimating, animSpeed]);

  /* =======================================================
     CHAOS GAME RENDERER
  ======================================================= */

  const renderAttractor =
    useCallback(() => {
      const canvas =
        canvasRef.current;

      if (!canvas) return;

      const ctx =
        canvas.getContext('2d');

      if (!ctx) return;

      const width =
        canvas.width;

      const height =
        canvas.height;

      const startTime =
        performance.now();

      ctx.fillStyle =
        isDarkMode
          ? '#030712'
          : '#f8fafc';

      ctx.fillRect(
        0,
        0,
        width,
        height,
      );

      const imgData =
        ctx.createImageData(
          width,
          height,
        );

      const data =
        imgData.data;

      const density =
        new Float32Array(
          width * height,
        );

      const f1Hits =
        paletteId === 'function-map'
          ? new Float32Array(
              width * height,
            )
          : null;

      const f2Hits =
        paletteId === 'function-map'
          ? new Float32Array(
              width * height,
            )
          : null;

      const f3Hits =
        paletteId === 'function-map'
          ? new Float32Array(
              width * height,
            )
          : null;

      const f4Hits =
        paletteId === 'function-map'
          ? new Float32Array(
              width * height,
            )
          : null;

      let x = 0;
      let y = 0;

      const scale =
        Math.min(width, height) *
        0.22 *
        zoom;

      const centerX =
        width / 2 + pan.x;

      const centerY =
        height / 2 +
        50 +
        pan.y;

      for (let i = 0; i < 30; i++) {
        const r =
          Math.random();

        if (r < 0.25) {
          const p = f1(
            { x, y },
            alpha,
          );

          x = p.x;
          y = p.y;
        } else if (r < 0.5) {
          const p = f2({
            x,
            y,
          });

          x = p.x;
          y = p.y;
        } else if (r < 0.75) {
          const p = f3({
            x,
            y,
          });

          x = p.x;
          y = p.y;
        } else {
          const p = f4(
            { x, y },
            beta,
          );

          x = p.x;
          y = p.y;
        }
      }

      let maxDensity = 1;

      for (
        let i = 0;
        i < iterations;
        i++
      ) {
        const r =
          Math.random();

        let fnIdx = 1;

        if (r < 0.25) {
          const p = f1(
            { x, y },
            alpha,
          );

          x = p.x;
          y = p.y;
          fnIdx = 1;
        } else if (r < 0.5) {
          const p = f2({
            x,
            y,
          });

          x = p.x;
          y = p.y;
          fnIdx = 2;
        } else if (r < 0.75) {
          const p = f3({
            x,
            y,
          });

          x = p.x;
          y = p.y;
          fnIdx = 3;
        } else {
          const p = f4(
            { x, y },
            beta,
          );

          x = p.x;
          y = p.y;
          fnIdx = 4;
        }

        const px =
          Math.floor(
            centerX +
              x * scale,
          );

        const py =
          Math.floor(
            centerY -
              y * scale,
          );

        if (
          px >= 0 &&
          px < width &&
          py >= 0 &&
          py < height
        ) {
          const idx =
            py * width + px;

          density[idx] += 1;

          if (
            density[idx] >
            maxDensity
          ) {
            maxDensity =
              density[idx];
          }

          if (
            fnIdx === 1 &&
            f1Hits
          ) {
            f1Hits[idx] += 1;
          } else if (
            fnIdx === 2 &&
            f2Hits
          ) {
            f2Hits[idx] += 1;
          } else if (
            fnIdx === 3 &&
            f3Hits
          ) {
            f3Hits[idx] += 1;
          } else if (
            fnIdx === 4 &&
            f4Hits
          ) {
            f4Hits[idx] += 1;
          }
        }
      }

      const palette =
        PALETTES.find(
          (p) =>
            p.id === paletteId,
        ) ||
        PALETTES[0];

      const hexToRgb =
        (hex: string) => {
          const bigint =
            parseInt(
              hex.replace('#', ''),
              16,
            );

          return [
            (bigint >> 16) & 255,
            (bigint >> 8) & 255,
            bigint & 255,
          ];
        };

      const rgbColors =
        palette.colors.map(
          hexToRgb,
        );

      const logMax =
        Math.log(
          maxDensity + 1,
        );

      for (
        let py = 0;
        py < height;
        py++
      ) {
        for (
          let px = 0;
          px < width;
          px++
        ) {
          const i =
            py * width + px;

          const d =
            density[i];

          if (d <= 0) continue;

          const idx =
            i * 4;

          const intensity =
            Math.min(
              1,
              Math.log(
                d + 1,
              ) / logMax,
            );

          const boosted =
            Math.pow(
              intensity,
              0.6,
            );

          if (
            paletteId ===
              'function-map' &&
            f1Hits &&
            f2Hits &&
            f3Hits &&
            f4Hits
          ) {
            const h1 =
              f1Hits[i];

            const h2 =
              f2Hits[i];

            const h3 =
              f3Hits[i];

            const h4 =
              f4Hits[i];

            const total =
              h1 +
              h2 +
              h3 +
              h4;

            if (total > 0) {
              const r =
                (
                  h1 * 34 +
                  h2 * 255 +
                  h3 * 124 +
                  h4 * 255
                ) / total;

              const g =
                (
                  h1 * 197 +
                  h2 * 42 +
                  h3 * 58 +
                  h4 * 122
                ) / total;

              const b =
                (
                  h1 * 94 +
                  h2 * 42 +
                  h3 * 237 +
                  h4 * 0
                ) / total;

              const hitIntensity =
                Math.min(
                  1,
                  Math.log(
                    total + 1,
                  ) / logMax,
                );

              const hitBoosted =
                Math.pow(
                  hitIntensity,
                  0.6,
                );

              data[idx] =
                Math.floor(
                  r *
                    hitBoosted,
                );

              data[idx + 1] =
                Math.floor(
                  g *
                    hitBoosted,
                );

              data[idx + 2] =
                Math.floor(
                  b *
                    hitBoosted,
                );

              data[idx + 3] = 255;
            }
          } else {
            const colorPos =
              boosted *
              (rgbColors.length - 1);

            const c1Idx =
              Math.floor(
                colorPos,
              );

            const c2Idx =
              Math.min(
                rgbColors.length - 1,
                c1Idx + 1,
              );

            const t =
              colorPos -
              c1Idx;

            const c1 =
              rgbColors[c1Idx];

            const c2 =
              rgbColors[c2Idx];

            data[idx] =
              Math.floor(
                c1[0] *
                  (1 - t) +
                  c2[0] * t,
              );

            data[idx + 1] =
              Math.floor(
                c1[1] *
                  (1 - t) +
                  c2[1] * t,
              );

            data[idx + 2] =
              Math.floor(
                c1[2] *
                  (1 - t) +
                  c2[2] * t,
              );

            data[idx + 3] = 255;
          }
        }
      }

      ctx.putImageData(
        imgData,
        0,
        0,
      );

      /* -----------------------------
         GRID
      ----------------------------- */

      ctx.save();

      const tickStep =
        scale < 80
          ? 1
          : scale < 200
            ? 0.5
            : 0.25;

      for (
        let v = -10;
        v <= 10;
        v += 0.25
      ) {
        if (
          tickStep === 1 &&
          Math.abs(
            v % 1,
          ) > 0.001
        ) {
          continue;
        }

        if (
          tickStep === 0.5 &&
          Math.abs(
            (v * 2) % 1,
          ) > 0.001
        ) {
          continue;
        }

        const px =
          Math.round(
            centerX +
              v * scale,
          );

        const py =
          Math.round(
            centerY -
              v * scale,
          );

        const isZero =
          Math.abs(v) <
          0.0001;

        const isMajor =
          Math.abs(v % 1) <
            0.001 ||
          Math.abs(
            v % 0.5,
          ) < 0.001;

        if (
          px >= 0 &&
          px <= width
        ) {
          ctx.beginPath();

          ctx.strokeStyle =
            isZero
              ? 'rgba(255,255,255,0.35)'
              : isMajor
                ? 'rgba(255,255,255,0.08)'
                : 'rgba(255,255,255,0.03)';

          ctx.lineWidth =
            isZero
              ? 1.5
              : 1;

          ctx.moveTo(
            px,
            0,
          );

          ctx.lineTo(
            px,
            height,
          );

          ctx.stroke();
        }

        if (
          py >= 0 &&
          py <= height
        ) {
          ctx.beginPath();

          ctx.strokeStyle =
            isZero
              ? 'rgba(255,255,255,0.35)'
              : isMajor
                ? 'rgba(255,255,255,0.08)'
                : 'rgba(255,255,255,0.03)';

          ctx.lineWidth =
            isZero
              ? 1.5
              : 1;

          ctx.moveTo(
            0,
            py,
          );

          ctx.lineTo(
            width,
            py,
          );

          ctx.stroke();
        }
      }

      ctx.restore();

      setRenderStats({
        time: Math.round(
          performance.now() -
            startTime,
        ),
        points: iterations,
      });
    }, [
      alpha,
      beta,
      iterations,
      paletteId,
      zoom,
      pan,
      isDarkMode,
    ]);

  /* =======================================================
     ADDRESS MODE RENDERER
  ======================================================= */

  const renderAddressMode =
    useCallback(() => {
      const canvas =
        canvasRef.current;

      if (!canvas) return;

      const ctx =
        canvas.getContext('2d');

      if (!ctx) return;

      const width =
        canvas.width;

      const height =
        canvas.height;

      const startTime =
        performance.now();

      ctx.fillStyle =
        isDarkMode
          ? '#030712'
          : '#f8fafc';

      ctx.fillRect(
        0,
        0,
        width,
        height,
      );

      /* ---------------------------------------------------
         GENERATE TRUE AFFINE TRIANGLES
      --------------------------------------------------- */

      const triangles =
        generateTriangles(
          addressLevel,
          alpha,
          beta,
        );

      /*
         Determine bounding box from ALL triangles.

         This is important because alpha/beta can move
         f1/f4 outside the original central region.
      */

      const allPoints =
        triangles.flatMap(
          (triangle) =>
            triangle.vertices,
        );

      if (
        showBaseTriangle
      ) {
        allPoints.push(
          ...BASE_TRIANGLE,
        );
      }

      let minX = Infinity;
      let maxX = -Infinity;
      let minY = Infinity;
      let maxY = -Infinity;

      for (const p of allPoints) {
        minX =
          Math.min(
            minX,
            p.x,
          );

        maxX =
          Math.max(
            maxX,
            p.x,
          );

        minY =
          Math.min(
            minY,
            p.y,
          );

        maxY =
          Math.max(
            maxY,
            p.y,
          );
      }

      const rangeX =
        Math.max(
          0.001,
          maxX - minX,
        );

      const rangeY =
        Math.max(
          0.001,
          maxY - minY,
        );

      const padding = 80;

      const scale =
        Math.min(
          (width -
            padding * 2) /
            rangeX,
          (height -
            padding * 2) /
            rangeY,
        ) * zoom;

      const centerMathX =
        (minX + maxX) / 2;

      const centerMathY =
        (minY + maxY) / 2;

      const centerX =
        width / 2 +
        pan.x;

      const centerY =
        height / 2 +
        pan.y;

      const project =
        (p: Point): Point => ({
          x:
            centerX +
            (p.x -
              centerMathX) *
              scale,

          y:
            centerY -
            (p.y -
              centerMathY) *
              scale,
        });

      /* ---------------------------------------------------
         GRID
      --------------------------------------------------- */

      ctx.save();

      ctx.strokeStyle =
        'rgba(255,255,255,0.16)';

      ctx.lineWidth = 1;

      const gridStep =
        scale > 150
          ? 0.5
          : 1;

      const gridMinX =
        Math.floor(
          minX - 2,
        );

      const gridMaxX =
        Math.ceil(
          maxX + 2,
        );

      const gridMinY =
        Math.floor(
          minY - 2,
        );

      const gridMaxY =
        Math.ceil(
          maxY + 2,
        );

      for (
        let x = gridMinX;
        x <= gridMaxX;
        x += gridStep
      ) {
        const a =
          project({
            x,
            y: minY - 2,
          });

        const b =
          project({
            x,
            y: maxY + 2,
          });

        ctx.beginPath();

        ctx.moveTo(
          a.x,
          a.y,
        );

        ctx.lineTo(
          b.x,
          b.y,
        );

        ctx.stroke();
      }

      for (
        let y = gridMinY;
        y <= gridMaxY;
        y += gridStep
      ) {
        const a =
          project({
            x: minX - 2,
            y,
          });

        const b =
          project({
            x: maxX + 2,
            y,
          });

        ctx.beginPath();

        ctx.moveTo(
          a.x,
          a.y,
        );

        ctx.lineTo(
          b.x,
          b.y,
        );

        ctx.stroke();
      }

      ctx.restore();

      /* ---------------------------------------------------
         BASE TRIANGLE
      --------------------------------------------------- */

      if (
        showBaseTriangle
      ) {
        const p0 =
          project(
            BASE_TRIANGLE[0],
          );

        const p1 =
          project(
            BASE_TRIANGLE[1],
          );

        const p2 =
          project(
            BASE_TRIANGLE[2],
          );

        ctx.save();

        ctx.beginPath();

        ctx.moveTo(
          p0.x,
          p0.y,
        );

        ctx.lineTo(
          p1.x,
          p1.y,
        );

        ctx.lineTo(
          p2.x,
          p2.y,
        );

        ctx.closePath();

        ctx.strokeStyle =
          'rgba(255,255,255,0.65)';

        ctx.lineWidth = 2;

        ctx.setLineDash([
          8,
          6,
        ]);

        ctx.stroke();

        ctx.restore();
      }

      /* ---------------------------------------------------
         DRAW RECURSIVE TRIANGLES
      --------------------------------------------------- */

      for (
        const triangle of triangles
      ) {
        const p0 =
          project(
            triangle.vertices[0],
          );

        const p1 =
          project(
            triangle.vertices[1],
          );

        const p2 =
          project(
            triangle.vertices[2],
          );

        ctx.save();

        ctx.beginPath();

        ctx.moveTo(
          p0.x,
          p0.y,
        );

        ctx.lineTo(
          p1.x,
          p1.y,
        );

        ctx.lineTo(
          p2.x,
          p2.y,
        );

        ctx.closePath();

        if (
          fillTriangles
        ) {
          ctx.fillStyle =
            `${triangle.color}30`;

          ctx.fill();
        }

        if (
          showTriangleEdges
        ) {
          ctx.strokeStyle =
            triangle.color;

          ctx.lineWidth =
            addressLevel <= 2
              ? 2
              : 1;

          ctx.stroke();
        }

        /* -----------------------------------------------
           ADDRESS LABEL
        ------------------------------------------------ */

        if (
          showAddresses
        ) {
          const c =
            centroid(
              triangle.vertices,
            );

          const cp =
            project(c);

          const size =
            triangleSize(
              triangle.vertices,
            ) * scale;

          /*
             Không viết địa chỉ nếu tam giác quá nhỏ,
             tránh chồng chữ ở level cao.
          */

          const fontSize =
            Math.max(
              8,
              Math.min(
                18,
                size * 0.12,
              ),
            );

          if (
            size > 35
          ) {
            ctx.font =
              `600 ${fontSize}px Inter, Arial, sans-serif`;

            ctx.textAlign =
              'center';

            ctx.textBaseline =
              'middle';

            ctx.lineWidth = 3;

            ctx.strokeStyle =
              'rgba(0,0,0,0.85)';

            ctx.strokeText(
              triangle.address,
              cp.x,
              cp.y,
            );

            ctx.fillStyle =
              '#ffffff';

            ctx.fillText(
              triangle.address,
              cp.x,
              cp.y,
            );
          }
        }

        ctx.restore();
      }

      /* ---------------------------------------------------
         STATISTICS
      --------------------------------------------------- */

      setRenderStats({
        time: Math.round(
          performance.now() -
            startTime,
        ),
        points:
          triangles.length,
      });
    }, [
      addressLevel,
      alpha,
      beta,
      zoom,
      pan,
      showAddresses,
      showTriangleEdges,
      showBaseTriangle,
      fillTriangles,
      isDarkMode,
    ]);

  /* =======================================================
     MAIN RENDER DISPATCH
  ======================================================= */

  const render =
    useCallback(() => {
      if (
        mode === 'chaos'
      ) {
        renderAttractor();
      } else {
        renderAddressMode();
      }
    }, [
      mode,
      renderAttractor,
      renderAddressMode,
    ]);

  /* =======================================================
     RENDER WHEN STATE CHANGES
  ======================================================= */

  useEffect(() => {
    render();
  }, [render]);

  /* =======================================================
     CANVAS RESIZE
  ======================================================= */

  useEffect(() => {
    const handleResize =
      () => {
        const canvas =
          canvasRef.current;

        if (!canvas) return;

        const parent =
          canvas.parentElement;

        if (!parent) return;

        canvas.width =
          parent.clientWidth;

        canvas.height =
          parent.clientHeight;

        render();
      };

    handleResize();

    window.addEventListener(
      'resize',
      handleResize,
    );

    return () => {
      window.removeEventListener(
        'resize',
        handleResize,
      );
    };
  }, [render]);

  /* =======================================================
     MOUSE
  ======================================================= */

  const handleMouseDown =
    (
      e: React.MouseEvent,
    ) => {
      setIsDragging(true);

      setDragStart({
        x:
          e.clientX -
          pan.x,

        y:
          e.clientY -
          pan.y,
      });
    };

  const handleMouseMove =
    (
      e: React.MouseEvent,
    ) => {
      if (!isDragging) {
        return;
      }

      setPan({
        x:
          e.clientX -
          dragStart.x,

        y:
          e.clientY -
          dragStart.y,
      });
    };

  const handleMouseUp =
    () => {
      setIsDragging(false);
    };

  const handleWheel =
    (
      e: React.WheelEvent,
    ) => {
      e.preventDefault();

      const factor =
        e.deltaY < 0
          ? 1.15
          : 0.85;

      setZoom(
        (prev) =>
          Math.max(
            0.2,
            Math.min(
              20,
              prev * factor,
            ),
          ),
      );
    };

  /* =======================================================
     RESET
  ======================================================= */

  const handleResetView =
    () => {
      setZoom(1);
      setPan({
        x: 0,
        y: 0,
      });

      setAlpha(0);
      setBeta(0);
    };

  /* =======================================================
     DOWNLOAD
  ======================================================= */

  const handleDownload =
    () => {
      const canvas =
        canvasRef.current;

      if (!canvas) return;

      const link =
        document.createElement(
          'a',
        );

      link.download =
        mode === 'chaos'
          ? `ifs-attractor-alpha_${alpha}-beta_${beta}.png`
          : `ifs-address-level-${addressLevel}-alpha_${alpha}-beta_${beta}.png`;

      link.href =
        canvas.toDataURL(
          'image/png',
        );

      link.click();
    };

  /* =======================================================
     COPY CONFIG
  ======================================================= */

  const handleCopyConfig =
    () => {
      const config = {
        mode,
        alpha,
        beta,
        iterations,
        addressLevel,
        paletteId,
        zoom,
      };

      navigator.clipboard.writeText(
        JSON.stringify(
          config,
          null,
          2,
        ),
      );

      setCopiedNotification(
        true,
      );

      setTimeout(
        () =>
          setCopiedNotification(
            false,
          ),
        2000,
      );
    };

  /* =======================================================
     TRIANGLE COUNT
  ======================================================= */

  const triangleCount =
    Math.pow(
      4,
      addressLevel,
    );

  /* =======================================================
     RETURN
  ======================================================= */

  return (
    <div
      className={`min-h-screen flex flex-col ${
        isDarkMode
          ? 'bg-slate-950 text-slate-100'
          : 'bg-slate-50 text-slate-900'
      }`}
    >

      {/* =================================================
          HEADER
      ================================================= */}

      <header
        className={`border-b ${
          isDarkMode
            ? 'border-slate-800 bg-slate-900/80'
            : 'border-slate-200 bg-white/80'
        } backdrop-blur-md sticky top-0 z-30 px-4 lg:px-8 py-3 flex items-center justify-between`}
      >
        <div className="flex items-center space-x-3">

          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-indigo-500/25">
            <Sparkles className="w-5 h-5 text-white" />
          </div>

          <div>
            <h1 className="font-bold text-lg tracking-tight bg-gradient-to-r from-indigo-400 via-purple-300 to-pink-400 bg-clip-text text-transparent">
              IFS Attractor Explorer
            </h1>

            <p className="text-xs text-slate-400">
              IFS · Chaos Game · Address Geometry
            </p>
          </div>

        </div>

        <div className="flex items-center space-x-2">

          <button
            onClick={() =>
              setShowInfoModal(true)
            }
            className="px-3 py-2 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center space-x-1.5"
          >
            <Info className="w-4 h-4 text-indigo-400" />

            <span className="hidden sm:inline">
              Công thức
            </span>
          </button>

          <button
            onClick={
              handleCopyConfig
            }
            className="px-3 py-2 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center space-x-1.5"
          >
            {copiedNotification ? (
              <Check className="w-4 h-4 text-emerald-400" />
            ) : (
              <Copy className="w-4 h-4" />
            )}

            <span className="hidden sm:inline">
              {copiedNotification
                ? 'Đã sao chép'
                : 'Sao chép'}
            </span>
          </button>

          <button
            onClick={
              handleDownload
            }
            className="px-3.5 py-2 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white flex items-center space-x-1.5"
          >
            <Download className="w-4 h-4" />

            <span>
              Tải PNG
            </span>
          </button>

        </div>
      </header>

      {/* =================================================
          MAIN
      ================================================= */}

      <main className="flex-1 flex flex-col lg:flex-row overflow-hidden">

        {/* =================================================
            CANVAS
        ================================================= */}

        <div
          className="flex-1 relative flex items-center justify-center overflow-hidden cursor-crosshair select-none bg-slate-950 min-h-[55vh] lg:min-h-0"
          onMouseDown={
            handleMouseDown
          }
          onMouseMove={
            handleMouseMove
          }
          onMouseUp={
            handleMouseUp
          }
          onMouseLeave={
            handleMouseUp
          }
          onWheel={
            handleWheel
          }
        >

          <canvas
            ref={canvasRef}
            className="w-full h-full block absolute inset-0"
          />

          {/* MODE BADGE */}

          <div className="absolute top-5 left-5 z-10 bg-slate-900/80 backdrop-blur-md border border-slate-800 px-3 py-2 rounded-xl text-xs">

            {mode === 'chaos' ? (
              <div className="flex items-center space-x-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                <span className="font-semibold">
                  Chaos Game
                </span>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <GitBranch className="w-3.5 h-3.5 text-orange-400" />

                <span className="font-semibold">
                  Address Mode
                </span>

                <span className="text-slate-400">
                  Level {addressLevel}
                </span>
              </div>
            )}

          </div>

          {/* STATS */}

          <div className="absolute top-16 left-5 z-10 pointer-events-none bg-slate-900/70 backdrop-blur-md border border-slate-800/80 px-3 py-2 rounded-xl text-xs text-slate-400 space-y-1">

            {mode === 'address' && (
              <div>
                Mảnh:{' '}
                <span className="text-orange-400 font-mono">
                  {triangleCount.toLocaleString()}
                </span>
              </div>
            )}

            <div>
              Điểm:
              {' '}
              <span className="text-slate-200 font-mono">
                {renderStats.points.toLocaleString()}
              </span>
            </div>

            <div>
              Render:
              {' '}
              <span className="text-slate-200 font-mono">
                {renderStats.time} ms
              </span>
            </div>

            <div>
              Zoom:
              {' '}
              <span className="text-slate-200 font-mono">
                {(zoom * 100).toFixed(0)}%
              </span>
            </div>

          </div>

          {/* CANVAS TOOLBAR */}

          <div className="absolute bottom-6 left-6 z-10 flex items-center space-x-2 bg-slate-900/80 backdrop-blur-md border border-slate-800 p-1.5 rounded-xl shadow-2xl">

            <button
              onClick={() =>
                setZoom(
                  (prev) =>
                    Math.min(
                      20,
                      prev * 1.25,
                    ),
                )
              }
              className="p-2 rounded-lg hover:bg-slate-800 text-slate-300"
              title="Phóng to"
            >
              <ZoomIn className="w-4 h-4" />
            </button>

            <button
              onClick={() =>
                setZoom(
                  (prev) =>
                    Math.max(
                      0.2,
                      prev / 1.25,
                    ),
                )
              }
              className="p-2 rounded-lg hover:bg-slate-800 text-slate-300"
              title="Thu nhỏ"
            >
              <ZoomOut className="w-4 h-4" />
            </button>

            <div className="w-px h-4 bg-slate-800" />

            <button
              onClick={
                handleResetView
              }
              className="p-2 rounded-lg hover:bg-slate-800 text-slate-300"
              title="Đặt lại"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

          </div>

        </div>

        {/* =================================================
            CONTROL PANEL
        ================================================= */}

        <aside
          className={`w-full lg:w-96 xl:w-[420px] border-t lg:border-t-0 lg:border-l ${
            isDarkMode
              ? 'border-slate-800 bg-slate-950'
              : 'border-slate-200 bg-white'
          } overflow-y-auto`}
        >

          <div className="p-5 lg:p-6 space-y-6">

            {/* =================================================
                MODE
            ================================================= */}

            <div>

              <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2.5 block">
                Chế độ hiển thị
              </label>

              <div className="grid grid-cols-2 gap-2">

                <button
                  onClick={() =>
                    setMode('chaos')
                  }
                  className={`p-3 rounded-xl border text-xs font-semibold ${
                    mode === 'chaos'
                      ? 'bg-indigo-600 border-indigo-500 text-white'
                      : 'bg-slate-900 border-slate-800 text-slate-400'
                  }`}
                >
                  Chaos Game
                </button>

                <button
                  onClick={() =>
                    setMode('address')
                  }
                  className={`p-3 rounded-xl border text-xs font-semibold ${
                    mode === 'address'
                      ? 'bg-orange-600 border-orange-500 text-white'
                      : 'bg-slate-900 border-slate-800 text-slate-400'
                  }`}
                >
                  Address Mode
                </button>

              </div>

            </div>

            {/* =================================================
                PRESETS
            ================================================= */}

            <div>

              <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2.5 block">
                Mẫu có sẵn
              </label>

              <div className="grid grid-cols-3 gap-2">

                {PRESETS.map(
                  (
                    preset,
                    idx,
                  ) => (
                    <button
                      key={idx}
                      onClick={() => {
                        setAlpha(
                          preset.alpha,
                        );

                        setBeta(
                          preset.beta,
                        );

                        setIsAnimating(
                          false,
                        );
                      }}
                      className={`px-3 py-2 rounded-xl text-xs font-medium border truncate ${
                        Math.abs(
                          alpha -
                            preset.alpha,
                        ) < 0.01 &&
                        Math.abs(
                          beta -
                            preset.beta,
                        ) < 0.01
                          ? 'bg-indigo-600/20 border-indigo-500 text-indigo-300'
                          : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      {
                        preset.name
                      }
                    </button>
                  ),
                )}

              </div>

            </div>

            {/* =================================================
                PARAMETERS
            ================================================= */}

            <div className="p-4 rounded-2xl border bg-slate-900/50 border-slate-800 space-y-5">

              <div className="flex items-center justify-between">

                <h3 className="text-sm font-semibold flex items-center space-x-2">
                  <Sliders className="w-4 h-4 text-indigo-400" />

                  <span>
                    Tham số
                  </span>
                </h3>

                <button
                  onClick={() =>
                    setIsAnimating(
                      !isAnimating,
                    )
                  }
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 ${
                    isAnimating
                      ? 'bg-rose-500/20 text-rose-300'
                      : 'bg-emerald-500/20 text-emerald-300'
                  }`}
                >
                  {isAnimating ? (
                    <Pause className="w-3.5 h-3.5" />
                  ) : (
                    <Play className="w-3.5 h-3.5" />
                  )}

                  <span>
                    {isAnimating
                      ? 'Dừng'
                      : 'Tự động'}
                  </span>
                </button>

              </div>

              {/* ALPHA */}

              <div className="space-y-2">

                <div className="flex justify-between text-xs">

                  <span>
                    Alpha (α)
                  </span>

                  <input
                    type="number"
                    step="0.01"
                    min="-3"
                    max="3"
                    value={alpha}
                    onChange={(e) => {
                      setAlpha(
                        parseFloat(
                          e.target.value,
                        ) || 0,
                      );

                      setIsAnimating(
                        false,
                      );
                    }}
                    className="w-20 px-2 py-1 rounded bg-slate-950 border border-slate-700 text-right font-mono text-indigo-300"
                  />

                </div>

                <input
                  type="range"
                  min="-3"
                  max="3"
                  step="0.005"
                  value={alpha}
                  onChange={(e) => {
                    setAlpha(
                      parseFloat(
                        e.target.value,
                      ),
                    );

                    setIsAnimating(
                      false,
                    );
                  }}
                  className="w-full accent-indigo-500"
                />

                <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                  <span>-3</span>
                  <span>0</span>
                  <span>+3</span>
                </div>

              </div>

              {/* BETA */}

              <div className="space-y-2">

                <div className="flex justify-between text-xs">

                  <span>
                    Beta (β)
                  </span>

                  <input
                    type="number"
                    step="0.01"
                    min="-3"
                    max="3"
                    value={beta}
                    onChange={(e) => {
                      setBeta(
                        parseFloat(
                          e.target.value,
                        ) || 0,
                      );

                      setIsAnimating(
                        false,
                      );
                    }}
                    className="w-20 px-2 py-1 rounded bg-slate-950 border border-slate-700 text-right font-mono text-orange-300"
                  />

                </div>

                <input
                  type="range"
                  min="-3"
                  max="3"
                  step="0.005"
                  value={beta}
                  onChange={(e) => {
                    setBeta(
                      parseFloat(
                        e.target.value,
                      ),
                    );

                    setIsAnimating(
                      false,
                    );
                  }}
                  className="w-full accent-orange-500"
                />

                <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                  <span>-3</span>
                  <span>0</span>
                  <span>+3</span>
                </div>

              </div>

              {/* ANIMATION SPEED */}

              {isAnimating && (
                <div className="pt-2 border-t border-slate-800">

                  <div className="flex justify-between text-xs text-slate-400">

                    <span>
                      Tốc độ
                    </span>

                    <span className="font-mono">
                      {animSpeed.toFixed(
                        1,
                      )}
                      x
                    </span>

                  </div>

                  <input
                    type="range"
                    min="0.2"
                    max="3"
                    step="0.1"
                    value={animSpeed}
                    onChange={(e) =>
                      setAnimSpeed(
                        parseFloat(
                          e.target.value,
                        ),
                      )
                    }
                    className="w-full accent-pink-500"
                  />

                </div>
              )}

            </div>

            {/* =================================================
                ADDRESS SETTINGS
            ================================================= */}

            {mode ===
              'address' && (
              <div className="p-4 rounded-2xl border bg-orange-950/20 border-orange-900/40 space-y-4">

                <div className="flex items-center space-x-2">

                  <GitBranch className="w-4 h-4 text-orange-400" />

                  <h3 className="text-sm font-semibold">
                    Đệ quy địa chỉ
                  </h3>

                </div>

                {/* LEVEL */}

                <div className="space-y-2">

                  <div className="flex justify-between text-xs">

                    <span>
                      Cấp độ
                    </span>

                    <span className="font-mono text-orange-400 font-bold">
                      Level{' '}
                      {addressLevel}
                    </span>

                  </div>

                  <div className="grid grid-cols-4 gap-2">

                    {[1, 2, 3, 4, 5, 6, 7].map(
                      (level) => (
                        <button
                          key={level}
                          onClick={() =>
                            setAddressLevel(
                              level,
                            )
                          }
                          className={`py-2 rounded-lg text-xs font-mono border ${
                            addressLevel ===
                            level
                              ? 'bg-orange-600 border-orange-500 text-white'
                              : 'bg-slate-900 border-slate-800 text-slate-400'
                          }`}
                        >
                          {level}
                        </button>
                      ),
                    )}

                  </div>

                  <div className="text-[11px] text-slate-500 font-mono">
                    Số mảnh:{' '}
                    {Math.pow(
                      4,
                      addressLevel,
                    )}
                    {' '}= 4
                    <sup>
                      {addressLevel}
                    </sup>
                  </div>

                </div>

                {/* ADDRESS */}

                <label className="flex items-center justify-between text-xs cursor-pointer">

                  <span>
                    Hiện địa chỉ
                  </span>

                  <input
                    type="checkbox"
                    checked={
                      showAddresses
                    }
                    onChange={(e) =>
                      setShowAddresses(
                        e.target
                          .checked,
                      )
                    }
                    className="accent-orange-500"
                  />

                </label>

                {/* EDGES */}

                <label className="flex items-center justify-between text-xs cursor-pointer">

                  <span>
                    Hiện cạnh tam giác
                  </span>

                  <input
                    type="checkbox"
                    checked={
                      showTriangleEdges
                    }
                    onChange={(e) =>
                      setShowTriangleEdges(
                        e.target
                          .checked,
                      )
                    }
                    className="accent-orange-500"
                  />

                </label>

                {/* FILL */}

                <label className="flex items-center justify-between text-xs cursor-pointer">

                  <span>
                    Tô màu các mảnh
                  </span>

                  <input
                    type="checkbox"
                    checked={
                      fillTriangles
                    }
                    onChange={(e) =>
                      setFillTriangles(
                        e.target
                          .checked,
                      )
                    }
                    className="accent-orange-500"
                  />

                </label>

                {/* BASE */}

                <label className="flex items-center justify-between text-xs cursor-pointer">

                  <span>
                    Hiện tam giác gốc
                  </span>

                  <input
                    type="checkbox"
                    checked={
                      showBaseTriangle
                    }
                    onChange={(e) =>
                      setShowBaseTriangle(
                        e.target
                          .checked,
                      )
                    }
                    className="accent-orange-500"
                  />

                </label>

              </div>
            )}

            {/* =================================================
                PALETTE
            ================================================= */}

            {mode ===
              'chaos' && (
              <div className="p-4 rounded-2xl border bg-slate-900/50 border-slate-800 space-y-4">

                <h3 className="text-sm font-semibold flex items-center space-x-2">

                  <Palette className="w-4 h-4 text-purple-400" />

                  <span>
                    Màu sắc
                  </span>

                </h3>

                {PALETTES.map(
                  (p) => (
                    <button
                      key={p.id}
                      onClick={() =>
                        setPaletteId(
                          p.id,
                        )
                      }
                      className={`w-full flex items-center justify-between p-2.5 rounded-xl border text-xs ${
                        paletteId ===
                        p.id
                          ? 'border-indigo-500 bg-indigo-500/10'
                          : 'border-slate-800 bg-slate-900'
                      }`}
                    >
                      <span>
                        {p.name}
                      </span>

                      <div className="flex space-x-1">

                        {p.colors
                          .slice(1)
                          .map(
                            (
                              c,
                              i,
                            ) => (
                              <div
                                key={
                                  i
                                }
                                className="w-3.5 h-3.5 rounded-full"
                                style={{
                                  backgroundColor:
                                    c,
                                }}
                              />
                            ),
                          )}

                      </div>

                    </button>
                  ),
                )}

                {/* ITERATIONS */}

                <div className="pt-3 border-t border-slate-800">

                  <div className="flex justify-between text-xs mb-2">

                    <span>
                      Iterations
                    </span>

                    <span className="font-mono text-indigo-400">
                      {(
                        iterations /
                        1000
                      ).toFixed(
                        0,
                      )}
                      k
                    </span>

                  </div>

                  <div className="grid grid-cols-4 gap-2">

                    {[
                      50000,
                      100000,
                      250000,
                      500000,
                    ].map(
                      (value) => (
                        <button
                          key={
                            value
                          }
                          onClick={() =>
                            setIterations(
                              value,
                            )
                          }
                          className={`py-1.5 rounded-lg text-xs font-mono border ${
                            iterations ===
                            value
                              ? 'bg-indigo-600 border-indigo-500 text-white'
                              : 'bg-slate-900 border-slate-800 text-slate-400'
                          }`}
                        >
                          {value /
                            1000}
                          k
                        </button>
                      ),
                    )}

                  </div>

                </div>

              </div>
            )}

            {/* =================================================
                MATHEMATICAL DEFINITION
            ================================================= */}

            <div className="p-4 rounded-2xl border bg-indigo-950/20 border-indigo-900/40 space-y-3">

              <div className="flex items-center space-x-2">

                <Layers className="w-4 h-4 text-indigo-400" />

                <h4 className="text-xs font-bold uppercase tracking-wider">
                  Hệ hàm co IFS
                </h4>

              </div>

              <div className="text-xs font-mono space-y-1.5 text-slate-300">

                <div>
                  <span className="text-green-400">
                    f₁
                  </span>
                  (x,y)
                  =
                  (
                  -(x+y)/2 + α,
                  y/2
                  )
                </div>

                <div>
                  <span className="text-red-400">
                    f₂
                  </span>
                  (x,y)
                  =
                  (
                  -(x+y)/2,
                  y/2 - ½
                  )
                </div>

                <div>
                  <span className="text-purple-400">
                    f₃
                  </span>
                  (x,y)
                  =
                  (
                  -(x+y)/2 + ½,
                  y/2 - ½
                  )
                </div>

                <div>
                  <span className="text-orange-400">
                    f₄
                  </span>
                  (x,y)
                  =
                  (
                  (x+y)/2 + ½ + β,
                  -y/2 - 1
                  )
                </div>

              </div>

              {mode ===
                'address' && (
                <div className="pt-3 border-t border-indigo-900/40 text-[11px] text-slate-400 leading-relaxed">

                  <p>
                    Mỗi địa chỉ được tạo bằng cách
                    nối chỉ số hàm mới vào bên phải.
                  </p>

                  <p className="mt-1 font-mono text-orange-300">
                    f₁ → 1
                    <br />
                    f₁ → f₂ → 12
                    <br />
                    f₁ → f₂ → f₄ → 124
                  </p>

                </div>
              )}

            </div>

          </div>

        </aside>

      </main>

      {/* =================================================
          INFO MODAL
      ================================================= */}

      {showInfoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">

          <div className="w-full max-w-2xl rounded-3xl p-6 lg:p-8 bg-slate-900 border border-slate-800 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">

            <div className="flex items-center justify-between">

              <div className="flex items-center space-x-3">

                <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">

                  <Info className="w-5 h-5" />

                </div>

                <div>

                  <h2 className="text-lg font-bold">
                    IFS & Address Geometry
                  </h2>

                  <p className="text-xs text-slate-400">
                    Hệ hàm co và cấu trúc địa chỉ
                  </p>

                </div>

              </div>

              <button
                onClick={() =>
                  setShowInfoModal(
                    false,
                  )
                }
                className="w-8 h-8 rounded-full hover:bg-slate-800 text-slate-400"
              >
                ✕
              </button>

            </div>

            <div className="space-y-5 text-sm text-slate-300 leading-relaxed">

              <p>
                Trong Address Mode, ứng dụng không
                dựng lại một tam giác vuông cân ở
                mỗi cấp. Thay vào đó, ba đỉnh của
                tam giác được đưa qua chính phép biến
                đổi affine tương ứng.
              </p>

              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 font-mono text-xs space-y-2">

                <div className="text-green-400">
                  f₁(x,y) = (-(x+y)/2 + α, y/2)
                </div>

                <div className="text-red-400">
                  f₂(x,y) = (-(x+y)/2, y/2 - 1/2)
                </div>

                <div className="text-purple-400">
                  f₃(x,y) = (-(x+y)/2 + 1/2, y/2 - 1/2)
                </div>

                <div className="text-orange-400">
                  f₄(x,y) = ((x+y)/2 + 1/2 + β, -y/2 - 1)
                </div>

              </div>

              <div className="p-4 rounded-xl bg-orange-950/30 border border-orange-900/50">

                <h3 className="font-semibold text-orange-300 mb-2">
                  Địa chỉ
                </h3>

                <p className="text-xs text-slate-400">
                  Nếu áp dụng f₁ rồi f₂ rồi f₄,
                  địa chỉ là:
                </p>

                <p className="font-mono text-xl text-orange-400 mt-2">
                  124
                </p>

                <p className="text-xs text-slate-400 mt-2">
                  Chỉ số của hàm mới luôn được
                  nối vào bên phải địa chỉ hiện tại.
                </p>

              </div>

              <div className="p-4 rounded-xl bg-indigo-950/30 border border-indigo-900/50">

                <h3 className="font-semibold text-indigo-300 mb-2">
                  Số lượng mảnh
                </h3>

                <div className="font-mono text-sm">

                  Level 1:
                  {' '}
                  4 = 4¹

                  <br />

                  Level 2:
                  {' '}
                  16 = 4²

                  <br />

                  Level 3:
                  {' '}
                  64 = 4³

                  <br />

                  Level n:
                  {' '}
                  4ⁿ

                </div>

              </div>

            </div>

            <div className="flex justify-end pt-4 border-t border-slate-800">

              <button
                onClick={() =>
                  setShowInfoModal(
                    false,
                  )
                }
                className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold"
              >
                Đã hiểu
              </button>

            </div>

          </div>

        </div>
      )}

    </div>
  );
}