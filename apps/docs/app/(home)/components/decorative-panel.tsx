interface DecorativePanelProps {
  variant: "left" | "right";
}

export function DecorativePanel({ variant }: DecorativePanelProps) {
  const isLeft = variant === "left";

  return (
    <div
      className={`hidden lg:flex flex-1 ${isLeft ? "border-r" : "border-l"} border-border relative overflow-hidden`}
    >
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `repeating-linear-gradient(
            ${isLeft ? "135deg" : "45deg"},
            transparent,
            transparent 16px,
            currentColor 16px,
            currentColor 17.5px
          )`,
          color: "hsl(var(--border))",
          opacity: 0.3,
        }}
      />
    </div>
  );
}
