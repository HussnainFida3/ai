"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, AreaChart, Area, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";

export interface DonutSlice {
  label: string;
  value: number;
  color: string;
}

export function Donut({ data, size = 148, thickness = 20 }: { data: DonutSlice[]; size?: number; thickness?: number }) {
  const radius = size / 2;
  return (
    <ResponsiveContainer width={size} height={size}>
      <PieChart>
        <Pie
          data={data}
          dataKey="value"
          nameKey="label"
          cx="50%"
          cy="50%"
          innerRadius={radius - thickness}
          outerRadius={radius}
          paddingAngle={2}
          stroke="none"
          startAngle={90}
          endAngle={-270}
        >
          {data.map((slice) => (
            <Cell key={slice.label} fill={slice.color} />
          ))}
        </Pie>
      </PieChart>
    </ResponsiveContainer>
  );
}

const TASKS_PERFORMANCE = [
  { t: "12 AM", tasks: 112, success: 82 },
  { t: "1:30 AM", tasks: 95, success: 85 },
  { t: "3 AM", tasks: 150, success: 88 },
  { t: "4:30 AM", tasks: 210, success: 90 },
  { t: "6 AM", tasks: 240, success: 92 },
  { t: "7:30 AM", tasks: 195, success: 90 },
  { t: "9 AM", tasks: 290, success: 93 },
  { t: "10:30 AM", tasks: 250, success: 91 },
  { t: "12 PM", tasks: 180, success: 94 },
  { t: "1:30 PM", tasks: 150, success: 96 },
  { t: "3 PM", tasks: 220, success: 95 },
  { t: "4:30 PM", tasks: 285, success: 97 },
  { t: "6 PM", tasks: 295, success: 96 },
  { t: "7:30 PM", tasks: 230, success: 98 },
  { t: "9 PM", tasks: 155, success: 97 },
];

export function TasksPerformanceChart() {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <AreaChart data={TASKS_PERFORMANCE} margin={{ top: 4, right: 8, left: -18, bottom: 0 }}>
        <defs>
          <linearGradient id="tasksFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#22d3ee" stopOpacity={0.35} />
            <stop offset="100%" stopColor="#22d3ee" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
        <XAxis
          dataKey="t"
          ticks={["12 AM", "3 AM", "6 AM", "9 AM", "12 PM", "3 PM", "6 PM", "9 PM"]}
          tick={{ fill: "#5b6780", fontSize: 11 }}
          axisLine={{ stroke: "rgba(255,255,255,0.08)" }}
          tickLine={false}
        />
        <YAxis
          yAxisId="tasks"
          domain={[0, 400]}
          ticks={[0, 100, 200, 300, 400]}
          tick={{ fill: "#5b6780", fontSize: 11 }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          yAxisId="success"
          orientation="right"
          domain={[70, 100]}
          ticks={[70, 80, 90, 100]}
          tickFormatter={(v) => `${v}%`}
          tick={{ fill: "#5b6780", fontSize: 11 }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          contentStyle={{ background: "#0d1526", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, fontSize: 12 }}
          labelStyle={{ color: "#94a3b8" }}
        />
        <Area
          yAxisId="tasks"
          type="monotone"
          dataKey="tasks"
          stroke="#22d3ee"
          strokeWidth={2}
          fill="url(#tasksFill)"
          dot={false}
          name="Tasks"
        />
        <Line
          yAxisId="success"
          type="monotone"
          dataKey="success"
          stroke="#a855f7"
          strokeWidth={2}
          dot={false}
          name="Success Rate"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function Sparkline({ data, color }: { data: number[]; color: string }) {
  const points = data.map((v, i) => ({ i, v }));
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={points} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
        <Line type="monotone" dataKey="v" stroke={color} strokeWidth={1.75} dot={false} isAnimationActive={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}
