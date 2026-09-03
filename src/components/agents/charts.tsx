function smoothPath(points: Array<[number, number]>): string {
  if (points.length < 2) return "";
  let d = `M ${points[0][0]} ${points[0][1]}`;
  for (let i = 0; i < points.length - 1; i++) {
    const [x0, y0] = points[i];
    const [x1, y1] = points[i + 1];
    const mx = (x0 + x1) / 2;
    d += ` C ${mx} ${y0}, ${mx} ${y1}, ${x1} ${y1}`;
  }
  return d;
}

export function TrendLine({
  data,
  labels,
  color = "#8b5cf6",
  height = 200,
  width = 640,
}: {
  data: number[];
  labels?: string[];
  color?: string;
  height?: number;
  width?: number;
}) {
  const max = Math.max(1, ...data);
  const pad = 8;
  const step = (width - pad * 2) / Math.max(1, data.length - 1);
  const points: Array<[number, number]> = data.map((v, i) => [pad + i * step, height - pad - ((v / max) * (height - pad * 2))]);
  const linePath = smoothPath(points);
  const areaPath = `${linePath} L ${points[points.length - 1][0]} ${height} L ${points[0][0]} ${height} Z`;
  const gid = `ag-grad-${color.replace("#", "")}`;

  return (
    <div>
      <svg viewBox={`0 0 ${width} ${height}`} width="100%" height={height} preserveAspectRatio="none" style={{ overflow: "visible" }}>
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.35" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0.25, 0.5, 0.75].map((f) => (
          <line key={f} x1={0} x2={width} y1={height * f} y2={height * f} stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
        ))}
        <path d={areaPath} fill={`url(#${gid})`} />
        <path d={linePath} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        {points.map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r={i === points.length - 1 ? 4 : 2.5} fill={i === points.length - 1 ? color : "#0b1220"} stroke={color} strokeWidth={i === points.length - 1 ? 0 : 1.5} />
        ))}
      </svg>
      {labels && (
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9.5, color: "var(--ag-ink-faint)", marginTop: 8 }}>
          {labels.map((l, i) => <span key={i}>{l}</span>)}
        </div>
      )}
    </div>
  );
}

export function RadialGauge({
  value,
  max = 10,
  size = 130,
  stroke = 12,
  color = "#8b5cf6",
  label,
}: {
  value: number;
  max?: number;
  size?: number;
  stroke?: number;
  color?: string;
  label?: string;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(1, value / max));
  const gid = `ag-gauge-${color.replace("#", "")}`;
  return (
    <div style={{ width: size, height: size, position: "relative" }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.6" />
            <stop offset="100%" stopColor={color} />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={`url(#${gid})`}
          strokeWidth={stroke}
          strokeDasharray={`${pct * c} ${c}`}
          strokeLinecap="round"
          style={{ transition: "stroke-dasharray 0.6s cubic-bezier(.22,1,.36,1)" }}
        />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        <strong className="ag-display" style={{ fontSize: size > 110 ? 26 : 18, fontWeight: 750 }}>{value}</strong>
        {label && <span style={{ fontSize: 9.5, color: "var(--ag-ink-faint)", marginTop: 3 }}>{label}</span>}
      </div>
    </div>
  );
}
