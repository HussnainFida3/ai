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

export interface CallVolumePoint {
  /** Real calendar-date label, e.g. "3 Sep" — never a fabricated time-of-day bucket. */
  label: string;
  calls: number;
  costUsd: number;
}

/**
 * Real daily AI call volume + spend, dual-axis. Callers pass real data (see
 * src/lib/credit-usage-data.ts's `dailyTrend`, sourced from GhrFix's GET
 * /ai-agents/master/trend) — this component no longer carries any hardcoded
 * series of its own.
 */
export function TasksPerformanceChart({ data }: { data: CallVolumePoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <AreaChart data={data} margin={{ top: 4, right: 8, left: -18, bottom: 0 }}>
        <defs>
          <linearGradient id="tasksFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#22d3ee" stopOpacity={0.35} />
            <stop offset="100%" stopColor="#22d3ee" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
        <XAxis
          dataKey="label"
          tick={{ fill: "#5b6780", fontSize: 11 }}
          axisLine={{ stroke: "rgba(255,255,255,0.08)" }}
          tickLine={false}
          minTickGap={20}
        />
        <YAxis
          yAxisId="calls"
          allowDecimals={false}
          tick={{ fill: "#5b6780", fontSize: 11 }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          yAxisId="cost"
          orientation="right"
          tickFormatter={(v) => `$${v}`}
          tick={{ fill: "#5b6780", fontSize: 11 }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          contentStyle={{ background: "#0d1526", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, fontSize: 12 }}
          labelStyle={{ color: "#94a3b8" }}
          formatter={(value, name) => (name === "Spend (USD)" ? [`$${Number(value).toFixed(2)}`, name] : [value, name])}
        />
        <Area
          yAxisId="calls"
          type="monotone"
          dataKey="calls"
          stroke="#22d3ee"
          strokeWidth={2}
          fill="url(#tasksFill)"
          dot={false}
          name="AI Calls"
        />
        <Line
          yAxisId="cost"
          type="monotone"
          dataKey="costUsd"
          stroke="#a855f7"
          strokeWidth={2}
          dot={false}
          name="Spend (USD)"
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
