import Image from "next/image";

type Size = "sm" | "md" | "lg";

/** Dimensions en px — ratio ~4.4:1 correspondant au logo recadré (1446×329px). */
const sizeMap: Record<Size, { width: number; height: number }> = {
  sm: { width: 120, height: 27 },   // mobile header
  md: { width: 160, height: 36 },   // desktop header
  lg: { width: 220, height: 50 },   // pages login/register
};

interface LogoProps {
  size?: Size;
  className?: string;
}

export function Logo({ size = "md", className = "" }: LogoProps) {
  const { width, height } = sizeMap[size];
  return (
    <Image
      src="/logo-germanpass.png"
      alt="GermanPass"
      width={width}
      height={height}
      className={className}
      priority
      style={{ objectFit: "contain" }}
    />
  );
}
