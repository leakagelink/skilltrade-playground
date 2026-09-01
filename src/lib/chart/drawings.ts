export type DrawingMode =
  // lines
  | "trendline"
  | "ray"
  | "extended"
  | "arrowline"
  | "hline"
  | "hray"
  | "vline"
  | "crossline"
  // channels
  | "parallel"
  | "flatchannel"
  // fibonacci
  | "fibretracement"
  | "fibextension"
  | "fibfan"
  | "fibtimezones"
  // shapes
  | "rectangle"
  | "ellipse"
  | "triangle"
  | "polyline"
  // freehand
  | "pen"
  | "brush"
  | "highlighter"
  // annotations
  | "text"
  | "pricelabel"
  | "arrowup"
  | "arrowdown"
  | "flag"
  // measurement
  | "pricerange"
  | "daterange"
  | "long"
  | "short";

export type ToolCategory =
  | "Lines"
  | "Channels"
  | "Fibonacci"
  | "Shapes"
  | "Freehand"
  | "Annotations"
  | "Measure";

export interface ToolDef {
  mode: DrawingMode;
  label: string;
  category: ToolCategory;
  /** number of anchor points captured before the drawing is finished; 0 = freehand path */
  points: 1 | 2 | 3 | 0;
}

export const TOOLS: ToolDef[] = [
  { mode: "trendline", label: "Trend Line", category: "Lines", points: 2 },
  { mode: "ray", label: "Ray", category: "Lines", points: 2 },
  { mode: "extended", label: "Extended Line", category: "Lines", points: 2 },
  { mode: "arrowline", label: "Arrow Line", category: "Lines", points: 2 },
  { mode: "hline", label: "Horizontal Line", category: "Lines", points: 1 },
  { mode: "hray", label: "Horizontal Ray", category: "Lines", points: 2 },
  { mode: "vline", label: "Vertical Line", category: "Lines", points: 1 },
  { mode: "crossline", label: "Cross Line", category: "Lines", points: 1 },

  { mode: "parallel", label: "Parallel Channel", category: "Channels", points: 3 },
  { mode: "flatchannel", label: "Flat Channel", category: "Channels", points: 2 },

  { mode: "fibretracement", label: "Fib Retracement", category: "Fibonacci", points: 2 },
  { mode: "fibextension", label: "Fib Extension", category: "Fibonacci", points: 2 },
  { mode: "fibfan", label: "Fib Fan", category: "Fibonacci", points: 2 },
  { mode: "fibtimezones", label: "Fib Time Zones", category: "Fibonacci", points: 2 },

  { mode: "rectangle", label: "Rectangle", category: "Shapes", points: 2 },
  { mode: "ellipse", label: "Ellipse", category: "Shapes", points: 2 },
  { mode: "triangle", label: "Triangle", category: "Shapes", points: 3 },
  { mode: "polyline", label: "Polyline", category: "Shapes", points: 0 },

  { mode: "pen", label: "Pen", category: "Freehand", points: 0 },
  { mode: "brush", label: "Brush", category: "Freehand", points: 0 },
  { mode: "highlighter", label: "Highlighter", category: "Freehand", points: 0 },

  { mode: "text", label: "Text", category: "Annotations", points: 1 },
  { mode: "pricelabel", label: "Price Label", category: "Annotations", points: 1 },
  { mode: "arrowup", label: "Arrow Up", category: "Annotations", points: 1 },
  { mode: "arrowdown", label: "Arrow Down", category: "Annotations", points: 1 },
  { mode: "flag", label: "Flag", category: "Annotations", points: 1 },

  { mode: "pricerange", label: "Price Range", category: "Measure", points: 2 },
  { mode: "daterange", label: "Date Range", category: "Measure", points: 2 },
  { mode: "long", label: "Long Position", category: "Measure", points: 3 },
  { mode: "short", label: "Short Position", category: "Measure", points: 3 },
];

export const TOOL_BY_MODE: Record<DrawingMode, ToolDef> = Object.fromEntries(
  TOOLS.map((t) => [t.mode, t]),
) as Record<DrawingMode, ToolDef>;

export const CATEGORIES: ToolCategory[] = [
  "Lines",
  "Channels",
  "Fibonacci",
  "Shapes",
  "Freehand",
  "Annotations",
  "Measure",
];

export interface DrawingPoint {
  time: number;
  price: number;
}

export interface Drawing {
  id: string;
  type: DrawingMode;
  points: DrawingPoint[];
  color: string;
  lineWidth: number;
  opacity: number;
  text?: string;
  locked?: boolean;
  visible?: boolean;
}

export const FIB_RETRACEMENT = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1];
export const FIB_EXTENSION = [0, 0.618, 1, 1.382, 1.618, 2, 2.618];

export const FIB_COLORS: Record<string, string> = {
  "0": "#94a3b8",
  "0.236": "#f97316",
  "0.382": "#eab308",
  "0.5": "#22c55e",
  "0.618": "#06b6d4",
  "0.786": "#8b5cf6",
  "1": "#94a3b8",
  "1.382": "#eab308",
  "1.618": "#06b6d4",
  "2": "#8b5cf6",
  "2.618": "#f43f5e",
};

export const DRAW_COLORS = [
  "#22d3ee",
  "#34d399",
  "#f43f5e",
  "#fbbf24",
  "#a78bfa",
  "#f8fafc",
];
