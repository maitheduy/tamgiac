/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Play, Pause, RotateCcw, ZoomIn, ZoomOut, Download, 
  Settings, HelpCircle, Sliders, Sparkles, Palette, 
  Info, RefreshCw, Maximize2, Layers, Check, Copy
} from 'lucide-react';

// Color Palettes
interface PaletteOption {
  id: string;
  name: string;
  colors: string[];
}

const PALETTES: PaletteOption[] = [
  { 
    id: 'function-map', 
    name: 'Phân màu Hàm (f1-f4 theo yêu cầu)', 
    colors: ['#030712', '#22c55e', '#ff2a2a', '#7c3aed', '#ff7a00'] // Background, f1: Xanh lá, f2: Đỏ tươi, f3: Tím đậm, f4: Cam
  },
  { 
    id: 'cyberpunk', 
    name: 'Cyberpunk Neon', 
    colors: ['#050510', '#00f2fe', '#4facfe', '#7f00ff', '#ff007f'] 
  },
  { 
    id: 'emerald', 
    name: 'Emerald Matrix', 
    colors: ['#02150d', '#00ff87', '#60efff', '#0061ff', '#00264d'] 
  },
  { 
    id: 'fire', 
    name: 'Solar Flare', 
    colors: ['#1a0500', '#ff4b1f', '#ff9068', '#f9d423', '#ff4e50'] 
  },
  { 
    id: 'cosmic', 
    name: 'Deep Cosmic', 
    colors: ['#050814', '#3a1c71', '#d76d77', '#ffaf7b', '#ffffff'] 
  }
];

export default function App() {
  // Parameters
  const [alpha, setAlpha] = useState<number>(0.0);
  const [beta, setBeta] = useState<number>(0.0);
  const [iterations, setIterations] = useState<number>(200000);
  const [paletteId, setPaletteId] = useState<string>('function-map');
  const [pointSize, setPointSize] = useState<number>(1.2);
  const [isDarkMode, setIsDarkMode] = useState<boolean>(true);

  // Animation / Morphing state
  const [isAnimating, setIsAnimating] = useState<boolean>(false);
  const [animSpeed, setAnimSpeed] = useState<number>(1.0);

  // Viewport state (Zoom & Pan)
  const [zoom, setZoom] = useState<number>(1.0);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // UI state
  const [showInfoModal, setShowInfoModal] = useState<boolean>(false);
  const [copiedNotification, setCopiedNotification] = useState<boolean>(false);
  const [renderStats, setRenderStats] = useState<{ time: number; points: number }>({ time: 0, points: 0 });

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const timeRef = useRef<number>(0);

  // Presets
  const PRESETS = [
    { name: 'Mặc định (0, 0)', alpha: 0.0, beta: 0.0 },
    { name: 'Đối xứng A', alpha: 0.5, beta: -0.5 },
    { name: 'Xoắn ốc B', alpha: -0.8, beta: 0.8 },
    { name: 'Lượn sóng C', alpha: 1.2, beta: -1.0 },
    { name: 'Cánh hoa D', alpha: -1.5, beta: 1.5 },
    { name: 'Đặc biệt E', alpha: 0.2, beta: -1.8 }
  ];

  // Animation loop for morphing alpha & beta
  useEffect(() => {
    if (!isAnimating) return;

    let lastTime = performance.now();
    const updateAnimation = (now: number) => {
      const dt = (now - lastTime) / 1000;
      lastTime = now;
      timeRef.current += dt * animSpeed * 0.8;

      // Lissajous curve or parametric oscillation for alpha & beta
      const newAlpha = parseFloat((Math.sin(timeRef.current * 0.7) * 1.5).toFixed(3));
      const newBeta = parseFloat((Math.cos(timeRef.current * 0.5) * 1.5).toFixed(3));

      setAlpha(newAlpha);
      setBeta(newBeta);

      animFrameRef.current = requestAnimationFrame(updateAnimation);
    };

    animFrameRef.current = requestAnimationFrame(updateAnimation);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isAnimating, animSpeed]);

  // Main Chaos Game rendering function
  const renderAttractor = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    const startTime = performance.now();

    // Clear background
    ctx.fillStyle = isDarkMode ? '#030712' : '#f8fafc';
    ctx.fillRect(0, 0, width, height);

    // Create ImageData buffer for high performance pixel plotting
    const imgData = ctx.createImageData(width, height);
    const data = imgData.data;

    // Density buffer for smooth lighting / heatmap
    const density = new Float32Array(width * height);
    
    // Function hit count buffers if palette is function-map (f1: green, f2: red, f3: purple, f4: orange)
    const f1Hits = paletteId === 'function-map' ? new Float32Array(width * height) : null;
    const f2Hits = paletteId === 'function-map' ? new Float32Array(width * height) : null;
    const f3Hits = paletteId === 'function-map' ? new Float32Array(width * height) : null;
    const f4Hits = paletteId === 'function-map' ? new Float32Array(width * height) : null;

    // IFS starting point
    let x = 0.0;
    let y = 0.0;

    // Auto bounding estimation or fixed scale
    const scale = Math.min(width, height) * 0.22 * zoom;
    const centerX = width / 2 + pan.x;
    const centerY = height / 2 + 50 + pan.y;

    // Skip first few transient points
    for (let i = 0; i < 30; i++) {
      const r = Math.random();
      if (r < 0.25) {
        x = -(x + y) / 2 + alpha;
        y = y / 2;
      } else if (r < 0.5) {
        x = -(x + y) / 2;
        y = y / 2 - 0.5;
      } else if (r < 0.75) {
        x = -(x + y) / 2 + 0.5;
        y = y / 2 - 0.5;
      } else {
        x = (x + y) / 2 + 0.5 + beta;
        y = -y / 2 - 1.0;
      }
    }

    let maxDensity = 1;

    // Chaos game main loop
    for (let i = 0; i < iterations; i++) {
      const r = Math.random();
      let fnIdx = 0;
      if (r < 0.25) {
        x = -(x + y) / 2 + alpha;
        y = y / 2;
        fnIdx = 1;
      } else if (r < 0.5) {
        x = -(x + y) / 2;
        y = y / 2 - 0.5;
        fnIdx = 2;
      } else if (r < 0.75) {
        x = -(x + y) / 2 + 0.5;
        y = y / 2 - 0.5;
        fnIdx = 3;
      } else {
        x = (x + y) / 2 + 0.5 + beta;
        y = -y / 2 - 1.0;
        fnIdx = 4;
      }

      // Project mathematical coordinates to canvas pixels
      const px = Math.floor(centerX + x * scale);
      const py = Math.floor(centerY - y * scale);

      if (px >= 0 && px < width && py >= 0 && py < height) {
        const idx = py * width + px;
        density[idx] += 1;
        if (density[idx] > maxDensity) {
          maxDensity = density[idx];
        }
        if (fnIdx === 1 && f1Hits) f1Hits[idx] += 1;
        else if (fnIdx === 2 && f2Hits) f2Hits[idx] += 1;
        else if (fnIdx === 3 && f3Hits) f3Hits[idx] += 1;
        else if (fnIdx === 4 && f4Hits) f4Hits[idx] += 1;
      }
    }

    // Color palette resolution
    const palette = PALETTES.find(p => p.id === paletteId) || PALETTES[0];

    // Helper to parse hex color to RGB
    const hexToRgb = (hex: string) => {
      const bigint = parseInt(hex.replace('#', ''), 16);
      return [(bigint >> 16) & 255, (bigint >> 8) & 255, bigint & 255];
    };

    const rgbColors = palette.colors.map(hexToRgb);

    // Render density buffer to ImageData
    const logMax = Math.log(maxDensity + 1);

    for (let py = 0; py < height; py++) {
      for (let px = 0; px < width; px++) {
        const i = py * width + px;
        const d = density[i];
        if (d > 0) {
          const idx = (py * width + px) * 4;
          const intensity = Math.min(1.0, Math.log(d + 1) / logMax);
          const boosted = Math.pow(intensity, 0.6);

          if (paletteId === 'function-map' && f1Hits && f2Hits && f3Hits && f4Hits) {
            const h1 = f1Hits[i];
            const h2 = f2Hits[i];
            const h3 = f3Hits[i];
            const h4 = f4Hits[i];
            const totalH = h1 + h2 + h3 + h4;
            if (totalH > 0) {
              // f1: green (34, 197, 94), f2: bright red (255, 42, 42), f3: dark purple (124, 58, 237), f4: orange (255, 122, 0)
              const r = (h1 * 34 + h2 * 255 + h3 * 124 + h4 * 255) / totalH;
              const g = (h1 * 197 + h2 * 42 + h3 * 58 + h4 * 122) / totalH;
              const b = (h1 * 94 + h2 * 42 + h3 * 237 + h4 * 0) / totalH;
              const hitIntensity = Math.min(1.0, Math.log(totalH + 1) / logMax);
              const hitBoosted = Math.pow(hitIntensity, 0.6);

              data[idx] = Math.floor(r * hitBoosted);
              data[idx + 1] = Math.floor(g * hitBoosted);
              data[idx + 2] = Math.floor(b * hitBoosted);
              data[idx + 3] = 255;
            }
          } else {
            const colorPos = boosted * (rgbColors.length - 1);
            const c1Idx = Math.floor(colorPos);
            const c2Idx = Math.min(rgbColors.length - 1, c1Idx + 1);
            const t = colorPos - c1Idx;

            const rColor = rgbColors[c1Idx];
            const gColor = rgbColors[c2Idx];

            const red = Math.floor(rColor[0] * (1 - t) + gColor[0] * t);
            const green = Math.floor(rColor[1] * (1 - t) + gColor[1] * t);
            const blue = Math.floor(rColor[2] * (1 - t) + gColor[2] * t);

            data[idx] = red;
            data[idx + 1] = green;
            data[idx + 2] = blue;
            data[idx + 3] = 255;
          }
        }
      }
    }

    ctx.putImageData(imgData, 0, 0);

    // Draw Coordinate Grid & Axis Labels (-1, -0.5, -0.25, 0, 0.25, 0.5, 1, etc.)
    ctx.save();
    const tickStep = scale < 80 ? 1.0 : scale < 200 ? 0.5 : 0.25;

    for (let v = -10; v <= 10; v += 0.25) {
      if (tickStep === 1.0 && Math.abs(v % 1) > 0.001) continue;
      if (tickStep === 0.5 && Math.abs((v * 2) % 1) > 0.001) continue;

      const px = Math.round(centerX + v * scale);
      const py = Math.round(centerY - v * scale);

      const isZero = Math.abs(v) < 0.0001;
      const isMajor = Math.abs(v % 1) < 0.001 || Math.abs(v % 0.5) < 0.001 || Math.abs((v * 4) % 1) < 0.001;

      // Vertical grid line & X-axis label
      if (px >= 0 && px <= width) {
        ctx.beginPath();
        ctx.strokeStyle = isZero 
          ? (isDarkMode ? 'rgba(255, 255, 255, 0.35)' : 'rgba(0, 0, 0, 0.3)')
          : isMajor 
            ? (isDarkMode ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)')
            : (isDarkMode ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.02)');
        ctx.lineWidth = isZero ? 1.5 : 1;
        ctx.moveTo(px, 0);
        ctx.lineTo(px, height);
        ctx.stroke();

        if (isMajor && px > 40 && px < width - 40) {
          ctx.fillStyle = isDarkMode ? 'rgba(156, 163, 175, 0.9)' : 'rgba(75, 85, 99, 0.9)';
          ctx.font = '10px Inter, monospace';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'top';
          const labelY = Math.min(height - 24, Math.max(20, centerY + 10));
          const labelStr = Number(v.toFixed(2)).toString();
          ctx.fillText(labelStr, px, labelY);
        }
      }

      // Horizontal grid line & Y-axis label
      if (py >= 0 && py <= height) {
        ctx.beginPath();
        ctx.strokeStyle = isZero 
          ? (isDarkMode ? 'rgba(255, 255, 255, 0.35)' : 'rgba(0, 0, 0, 0.3)')
          : isMajor 
            ? (isDarkMode ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)')
            : (isDarkMode ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.02)');
        ctx.lineWidth = isZero ? 1.5 : 1;
        ctx.moveTo(0, py);
        ctx.lineTo(width, py);
        ctx.stroke();

        if (isMajor && py > 20 && py < height - 20) {
          ctx.fillStyle = isDarkMode ? 'rgba(156, 163, 175, 0.9)' : 'rgba(75, 85, 99, 0.9)';
          ctx.font = '10px Inter, monospace';
          ctx.textAlign = 'right';
          ctx.textBaseline = 'middle';
          const labelX = Math.min(width - 24, Math.max(35, centerX - 10));
          const labelStr = Number(v.toFixed(2)).toString();
          if (labelStr !== '0') {
            ctx.fillText(labelStr, labelX, py);
          }
        }
      }
    }
    ctx.restore();

    const endTime = performance.now();
    setRenderStats({
      time: Math.round(endTime - startTime),
      points: iterations
    });

  }, [alpha, beta, iterations, paletteId, zoom, pan, isDarkMode]);

  // Trigger render on parameter changes
  useEffect(() => {
    renderAttractor();
  }, [renderAttractor]);

  // Handle canvas resize
  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const parent = canvas.parentElement;
      if (!parent) return;
      canvas.width = parent.clientWidth;
      canvas.height = parent.clientHeight;
      renderAttractor();
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [renderAttractor]);

  // Mouse pan & zoom handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPan({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.15 : 0.85;
    setZoom(prev => Math.max(0.2, Math.min(20.0, prev * zoomFactor)));
  };

  // Reset view
  const handleResetView = () => {
    setZoom(1.0);
    setPan({ x: 0, y: 0 });
    setAlpha(0.0);
    setBeta(0.0);
  };

  // Download image
  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `ifs-attractor-alpha_${alpha}-beta_${beta}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  // Copy config
  const handleCopyConfig = () => {
    const configStr = JSON.stringify({ alpha, beta, iterations, paletteId, zoom }, null, 2);
    navigator.clipboard.writeText(configStr);
    setCopiedNotification(true);
    setTimeout(() => setCopiedNotification(false), 2000);
  };

  return (
    <div className={`min-h-screen flex flex-col ${isDarkMode ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'}`}>
      
      {/* Top Navbar */}
      <header className={`border-b ${isDarkMode ? 'border-slate-800 bg-slate-900/80' : 'border-slate-200 bg-white/80'} backdrop-blur-md sticky top-0 z-30 px-4 lg:px-8 py-3 flex items-center justify-between`}>
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-indigo-500/25">
            <Sparkles className="w-5 h-5 text-white animate-pulse" />
          </div>
          <div>
            <h1 className="font-bold text-lg tracking-tight bg-gradient-to-r from-indigo-400 via-purple-300 to-pink-400 bg-clip-text text-transparent">
              IFS Attractor Explorer
            </h1>
            <p className="text-xs text-slate-400">Trình tạo Hệ Hàm Co & Chaos Game thời gian thực</p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowInfoModal(true)}
            className={`px-3 py-2 rounded-lg text-xs font-medium flex items-center space-x-1.5 transition-all ${
              isDarkMode ? 'bg-slate-800 hover:bg-slate-700 text-slate-300' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            <Info className="w-4 h-4 text-indigo-400" />
            <span className="hidden sm:inline">Công thức & Hướng dẫn</span>
          </button>

          <button
            onClick={handleCopyConfig}
            className={`px-3 py-2 rounded-lg text-xs font-medium flex items-center space-x-1.5 transition-all ${
              isDarkMode ? 'bg-slate-800 hover:bg-slate-700 text-slate-300' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
            title="Sao chép cấu hình"
          >
            {copiedNotification ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-slate-400" />}
            <span className="hidden sm:inline">{copiedNotification ? 'Đã sao chép!' : 'Sao chép'}</span>
          </button>

          <button
            onClick={handleDownload}
            className="px-3.5 py-2 rounded-lg text-xs font-semibold bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white shadow-lg shadow-indigo-500/20 flex items-center space-x-1.5 transition-all"
          >
            <Download className="w-4 h-4" />
            <span>Tải ảnh PNG</span>
          </button>
        </div>
      </header>

      {/* Main Split Layout */}
      <main className="flex-1 flex flex-col lg:flex-row overflow-hidden relative">
        
        {/* Left Side: Canvas Viewer */}
        <div 
          className="flex-1 relative flex items-center justify-center overflow-hidden cursor-crosshair select-none bg-slate-950"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onWheel={handleWheel}
        >
          <canvas 
            ref={canvasRef} 
            className="w-full h-full block absolute inset-0"
          />

          {/* Floating Canvas Toolbar */}
          <div className="absolute bottom-6 left-6 z-10 flex items-center space-x-2 bg-slate-900/80 backdrop-blur-md border border-slate-800 p-1.5 rounded-xl shadow-2xl">
            <button
              onClick={() => setZoom(prev => Math.min(20, prev * 1.25))}
              className="p-2 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white transition-colors"
              title="Phóng to (+)"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              onClick={() => setZoom(prev => Math.max(0.2, prev / 1.25))}
              className="p-2 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white transition-colors"
              title="Thu nhỏ (-)"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <div className="w-px h-4 bg-slate-800 mx-1" />
            <button
              onClick={handleResetView}
              className="p-2 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white transition-colors"
              title="Đặt lại khung nhìn & thông số"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>

          {/* Floating Stats Overlay */}
          <div className="absolute top-6 left-6 z-10 pointer-events-none bg-slate-900/70 backdrop-blur-md border border-slate-800/80 px-3 py-2 rounded-xl text-xs text-slate-300 flex flex-col space-y-1 shadow-lg">
            <div className="flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span className="font-semibold text-slate-200">Chaos Game Active</span>
            </div>
            <div className="text-slate-400">Điểm: {renderStats.points.toLocaleString()}</div>
            <div className="text-slate-400">Kết xuất: {renderStats.time} ms</div>
            <div className="text-slate-400">Thu phóng: {(zoom * 100).toFixed(0)}%</div>
          </div>

          {/* Animation status badge */}
          {isAnimating && (
            <div className="absolute top-6 right-6 lg:right-auto lg:left-1/2 lg:-translate-x-1/2 z-10 bg-purple-500/20 border border-purple-500/40 text-purple-300 px-4 py-2 rounded-full backdrop-blur-md text-xs font-semibold flex items-center space-x-2 animate-pulse shadow-lg">
              <span className="w-2.5 h-2.5 rounded-full bg-purple-400" />
              <span>Đang tự động biến đổi (Alpha & Beta)...</span>
              <button 
                onClick={() => setIsAnimating(false)}
                className="ml-2 underline text-white hover:text-purple-200 cursor-pointer"
              >
                Dừng
              </button>
            </div>
          )}
        </div>

        {/* Right Side: Control Panel */}
        <aside className={`w-full lg:w-96 xl:w-[420px] flex flex-col border-t lg:border-t-0 lg:border-l ${
          isDarkMode ? 'border-slate-800 bg-slate-950/90' : 'border-slate-200 bg-white'
        } overflow-y-auto max-h-[50vh] lg:max-h-none`}>
          
          <div className="p-5 lg:p-6 space-y-6">

            {/* Presets Bar */}
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2.5 block">
                Mẫu có sẵn (Presets)
              </label>
              <div className="grid grid-cols-3 gap-2">
                {PRESETS.map((preset, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setAlpha(preset.alpha);
                      setBeta(preset.beta);
                      setIsAnimating(false);
                    }}
                    className={`px-3 py-2 rounded-xl text-xs font-medium border transition-all text-center truncate ${
                      Math.abs(alpha - preset.alpha) < 0.01 && Math.abs(beta - preset.beta) < 0.01
                        ? 'bg-indigo-600/20 border-indigo-500 text-indigo-300 shadow-sm'
                        : isDarkMode
                          ? 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700 hover:bg-slate-850'
                          : 'bg-slate-50 border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    {preset.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Parameters Control Group */}
            <div className={`p-4 rounded-2xl border ${isDarkMode ? 'bg-slate-900/50 border-slate-800/80' : 'bg-slate-50 border-slate-200'} space-y-5`}>
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold flex items-center space-x-2">
                  <Sliders className="w-4 h-4 text-indigo-400" />
                  <span>Tham số điều khiển</span>
                </h3>
                <button
                  onClick={() => setIsAnimating(!isAnimating)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-all ${
                    isAnimating 
                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30 hover:bg-rose-500/30' 
                      : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/30'
                  }`}
                >
                  {isAnimating ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                  <span>{isAnimating ? 'Dừng động' : 'Tự động chạy'}</span>
                </button>
              </div>

              {/* Alpha Slider */}
              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-medium text-slate-300">Tham số Alpha (α)</span>
                  <div className="flex items-center space-x-1">
                    <input
                      type="number"
                      step="0.01"
                      min="-3.0"
                      max="3.0"
                      value={alpha}
                      onChange={(e) => setAlpha(parseFloat(e.target.value) || 0)}
                      className={`w-20 px-2 py-1 rounded text-right text-xs font-mono border ${
                        isDarkMode ? 'bg-slate-950 border-slate-700 text-indigo-300' : 'bg-white border-slate-300 text-indigo-600'
                      }`}
                    />
                  </div>
                </div>
                <input
                  type="range"
                  min="-3.0"
                  max="3.0"
                  step="0.005"
                  value={alpha}
                  onChange={(e) => {
                    setAlpha(parseFloat(e.target.value));
                    setIsAnimating(false);
                  }}
                  className="w-full accent-indigo-500 cursor-pointer h-2 bg-slate-700 rounded-lg"
                />
                <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                  <span>-3.0</span>
                  <span>0.0</span>
                  <span>+3.0</span>
                </div>
              </div>

              {/* Beta Slider */}
              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-medium text-slate-300">Tham số Beta (β)</span>
                  <div className="flex items-center space-x-1">
                    <input
                      type="number"
                      step="0.01"
                      min="-3.0"
                      max="3.0"
                      value={beta}
                      onChange={(e) => setBeta(parseFloat(e.target.value) || 0)}
                      className={`w-20 px-2 py-1 rounded text-right text-xs font-mono border ${
                        isDarkMode ? 'bg-slate-950 border-slate-700 text-purple-300' : 'bg-white border-slate-300 text-purple-600'
                      }`}
                    />
                  </div>
                </div>
                <input
                  type="range"
                  min="-3.0"
                  max="3.0"
                  step="0.005"
                  value={beta}
                  onChange={(e) => {
                    setBeta(parseFloat(e.target.value));
                    setIsAnimating(false);
                  }}
                  className="w-full accent-purple-500 cursor-pointer h-2 bg-slate-700 rounded-lg"
                />
                <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                  <span>-3.0</span>
                  <span>0.0</span>
                  <span>+3.0</span>
                </div>
              </div>

              {/* Animation Speed if animating */}
              {isAnimating && (
                <div className="space-y-1.5 pt-2 border-t border-slate-800">
                  <div className="flex justify-between text-xs text-slate-400">
                    <span>Tốc độ chuyển động</span>
                    <span className="font-mono text-slate-200">{animSpeed.toFixed(1)}x</span>
                  </div>
                  <input
                    type="range"
                    min="0.2"
                    max="3.0"
                    step="0.1"
                    value={animSpeed}
                    onChange={(e) => setAnimSpeed(parseFloat(e.target.value))}
                    className="w-full accent-pink-500 cursor-pointer h-1.5 bg-slate-700 rounded-lg"
                  />
                </div>
              )}
            </div>

            {/* Rendering Settings */}
            <div className={`p-4 rounded-2xl border ${isDarkMode ? 'bg-slate-900/50 border-slate-800/80' : 'bg-slate-50 border-slate-200'} space-y-4`}>
              <h3 className="text-sm font-semibold flex items-center space-x-2">
                <Palette className="w-4 h-4 text-purple-400" />
                <span>Màu sắc & Chất lượng</span>
              </h3>

              {/* Palette Selection */}
              <div className="space-y-2">
                <label className="text-xs text-slate-400 block font-medium">Bảng màu (Palette)</label>
                <div className="grid grid-cols-1 gap-2">
                  {PALETTES.map(p => (
                    <button
                      key={p.id}
                      onClick={() => setPaletteId(p.id)}
                      className={`flex items-center justify-between p-2.5 rounded-xl border text-xs transition-all ${
                        paletteId === p.id 
                          ? 'border-indigo-500 bg-indigo-500/10 text-white font-medium'
                          : isDarkMode ? 'border-slate-800 bg-slate-900 text-slate-300 hover:border-slate-700' : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                      }`}
                    >
                      <span>{p.name}</span>
                      <div className="flex space-x-1">
                        {p.colors.slice(1).map((c, i) => (
                          <div key={i} className="w-3.5 h-3.5 rounded-full shadow-sm" style={{ backgroundColor: c }} />
                        ))}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Iterations Selector */}
              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400 font-medium">Số điểm kết xuất (Iterations)</span>
                  <span className="font-mono text-indigo-400 font-semibold">{(iterations / 1000).toFixed(0)}k điểm</span>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {[50000, 100000, 250000, 500000].map(val => (
                    <button
                      key={val}
                      onClick={() => setIterations(val)}
                      className={`py-1.5 rounded-lg text-xs font-mono font-medium border transition-all ${
                        iterations === val
                          ? 'bg-indigo-600 text-white border-indigo-500'
                          : isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800' : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      {val / 1000}k
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Mathematical Definition Card */}
            <div className={`p-4 rounded-2xl border ${isDarkMode ? 'bg-indigo-950/20 border-indigo-900/40 text-indigo-200' : 'bg-indigo-50 border-indigo-200 text-indigo-900'} space-y-3`}>
              <div className="flex items-center space-x-2">
                <Layers className="w-4 h-4 text-indigo-400" />
                <h4 className="text-xs font-bold uppercase tracking-wider">Hệ hàm co (IFS) đang chạy</h4>
              </div>
              <div className="text-xs font-mono space-y-1 opacity-90">
                <div>f₁(x,y) = ( -(x+y)/2 + α, y/2 )</div>
                <div>f₂(x,y) = ( -(x+y)/2, y/2 - ½ )</div>
                <div>f₃(x,y) = ( -(x+y)/2 + ½, y/2 - ½ )</div>
                <div>f₄(x,y) = ( (x+y)/2 + ½ + β, -y/2 - 1 )</div>
              </div>
            </div>

          </div>
        </aside>

      </main>

      {/* Info Modal */}
      {showInfoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
          <div className={`w-full max-w-2xl rounded-3xl p-6 lg:p-8 shadow-2xl border ${
            isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
          } space-y-6 max-h-[90vh] overflow-y-auto`}>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                  <Info className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold">Về hệ hàm co IFS & Chaos Game</h2>
                  <p className="text-xs text-slate-400">Khám phá cấu trúc hình học Fractal</p>
                </div>
              </div>
              <button
                onClick={() => setShowInfoModal(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-slate-800 text-slate-400 hover:text-white transition-colors text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-sm text-slate-300 leading-relaxed">
              <p>
                Ứng dụng này sử dụng thuật toán <strong>Chaos Game</strong> để trực quan hóa các attractor fractal được tạo ra từ 4 phép biến đổi affine (hệ hàm co - Iterated Function System) do bạn cung cấp:
              </p>

              <div className={`p-4 rounded-xl font-mono text-xs space-y-2 ${isDarkMode ? 'bg-slate-950 text-indigo-300 border border-slate-800' : 'bg-slate-100 text-indigo-700 border border-slate-200'}`}>
                <div>f₁(x,y) = <span className="text-pink-400">( -(x+y)/2 + <strong>α</strong>, y/2 )</span></div>
                <div>f₂(x,y) = <span className="text-cyan-400">( -(x+y)/2, y/2 - 0.5 )</span></div>
                <div>f₃(x,y) = <span className="text-emerald-400">( -(x+y)/2 + 0.5, y/2 - 0.5 )</span></div>
                <div>f₄(x,y) = <span className="text-amber-400">( (x+y)/2 + 0.5 + <strong>β</strong>, -y/2 - 1 )</span></div>
              </div>

              <h3 className="font-semibold text-slate-200 pt-2">Cách thức hoạt động:</h3>
              <ul className="list-disc list-inside space-y-1.5 text-xs text-slate-400">
                <li>Ứng dụng chọn ngẫu nhiên 1 trong 4 hàm `f1`, `f2`, `f3`, `f4` với xác suất bằng nhau (25%).</li>
                <li>Áp dụng hàm được chọn lên điểm hiện tại để tính ra tọa độ mới `(nx, ny)`.</li>
                <li>Lặp lại quá trình này hàng trăm nghìn lần, các điểm sẽ hội tụ và phác họa nên cấu trúc hình học fractal (attractor) tuyệt đẹp.</li>
                <li>Các thanh trượt điều khiển <strong>Alpha (α)</strong> và <strong>Beta (β)</strong> làm biến dạng cấu trúc không gian theo thời gian thực.</li>
              </ul>
            </div>

            <div className="flex justify-end pt-4 border-t border-slate-800">
              <button
                onClick={() => setShowInfoModal(false)}
                className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/30 transition-all"
              >
                Đã hiểu, bắt đầu khám phá
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
