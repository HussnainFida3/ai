export function AgentOrb({ size = 64 }: { size?: number }) {
  return (
    <div className="ag-orb" style={{ width: size, height: size }}>
      <div className="ag-orb-core" />
      <span className="ag-orb-dot" />
    </div>
  );
}
