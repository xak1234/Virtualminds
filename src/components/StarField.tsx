import React, { useEffect, useRef } from 'react';

interface Star {
  x: number;
  y: number;
  size: number;
  opacity: number;
  speed: number;
  layer: number;
  twinklePhase: number;
  twinklePeriod: number;
}

interface Nebula {
  x: number;
  y: number;
  radius: number;
  color: string;
}

interface ShootingStar {
  x: number;
  y: number;
  length: number;
  speed: number;
  opacity: number;
  angle: number;
}

interface StarFieldProps {
  enabled: boolean;
  starCount?: number; // Multiplier: 0.5 - 2.0 (default 1.0)
  speedMultiplier?: number; // Multiplier: 0.5 - 3.0 (default 1.0)
  shootingStarsEnabled?: boolean;
}

export const StarField: React.FC<StarFieldProps> = ({ 
  enabled, 
  starCount = 1.0, 
  speedMultiplier = 1.0,
  shootingStarsEnabled = false 
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const starsRef = useRef<Star[]>([]);
  const nebulaeRef = useRef<Nebula[]>([]);
  const shootingStarsRef = useRef<ShootingStar[]>([]);
  const animationFrameRef = useRef<number>();
  const startTimeRef = useRef<number>(Date.now());
  const lastShootingStarRef = useRef<number>(Date.now());

  useEffect(() => {
    if (!enabled) {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    // Set canvas size
    const resizeCanvas = () => {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      ctx.scale(dpr, dpr);
    };

    // Initialize stars
    const initStars = () => {
      const isMobile = window.innerWidth < 768;
      const baseCount = isMobile ? 800 : 1750;
      const adjustedCount = Math.floor(baseCount * starCount);
      starsRef.current = [];

      for (let i = 0; i < adjustedCount; i++) {
        const layer = Math.random() < 0.33 ? 0 : Math.random() < 0.5 ? 1 : 2;
        let speed: number;
        let opacity: number;

        // Layer-based properties for parallax (apply speed multiplier)
        if (layer === 0) {
          // Distant layer
          speed = (0.1 + Math.random() * 0.15) * speedMultiplier;
          opacity = 0.3 + Math.random() * 0.3;
        } else if (layer === 1) {
          // Mid layer
          speed = (0.2 + Math.random() * 0.2) * speedMultiplier;
          opacity = 0.5 + Math.random() * 0.3;
        } else {
          // Near layer
          speed = (0.3 + Math.random() * 0.2) * speedMultiplier;
          opacity = 0.7 + Math.random() * 0.3;
        }

        starsRef.current.push({
          x: Math.random() * window.innerWidth,
          y: Math.random() * window.innerHeight,
          size: 1 + Math.random() * 2,
          opacity,
          speed,
          layer,
          twinklePhase: Math.random() * Math.PI * 2,
          twinklePeriod: 1000 + Math.random() * 2000, // 1-3 seconds
        });
      }
    };

    // Initialize nebulae
    const initNebulae = () => {
      nebulaeRef.current = [];
      const nebulaColors = [
        'rgba(75, 0, 130, 0.1)',    // Indigo
        'rgba(138, 43, 226, 0.08)',  // Blue Violet
        'rgba(147, 112, 219, 0.09)', // Medium Purple
        'rgba(123, 104, 238, 0.07)', // Medium Slate Blue
        'rgba(72, 61, 139, 0.1)',    // Dark Slate Blue
      ];

      for (let i = 0; i < 4; i++) {
        nebulaeRef.current.push({
          x: Math.random() * window.innerWidth,
          y: Math.random() * window.innerHeight,
          radius: 150 + Math.random() * 250,
          color: nebulaColors[Math.floor(Math.random() * nebulaColors.length)],
        });
      }
    };

    // Create shooting star
    const createShootingStar = () => {
      const angle = -Math.PI / 4 + (Math.random() - 0.5) * 0.3; // Mostly diagonal
      shootingStarsRef.current.push({
        x: Math.random() * window.innerWidth * 0.5, // Start from left half
        y: Math.random() * window.innerHeight * 0.5, // Start from top half
        length: 50 + Math.random() * 100,
        speed: (8 + Math.random() * 4) * speedMultiplier,
        opacity: 1.0,
        angle
      });
    };

    // Initialize
    resizeCanvas();
    initStars();
    initNebulae();

    // Handle window resize
    const handleResize = () => {
      resizeCanvas();
      initStars();
      initNebulae();
    };
    window.addEventListener('resize', handleResize);

    // Animation loop
    const animate = () => {
      const now = Date.now();
      const elapsed = now - startTimeRef.current;

      // Clear canvas with black background
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);

      // Draw nebulae (fixed background)
      nebulaeRef.current.forEach((nebula) => {
        const gradient = ctx.createRadialGradient(
          nebula.x,
          nebula.y,
          0,
          nebula.x,
          nebula.y,
          nebula.radius
        );
        gradient.addColorStop(0, nebula.color);
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);
      });

      // Update and draw shooting stars if enabled
      if (shootingStarsEnabled) {
        // Create new shooting star occasionally (every 2-5 seconds)
        if (now - lastShootingStarRef.current > 2000 + Math.random() * 3000) {
          createShootingStar();
          lastShootingStarRef.current = now;
        }

        // Update and draw shooting stars
        shootingStarsRef.current = shootingStarsRef.current.filter((shootingStar) => {
          shootingStar.x += Math.cos(shootingStar.angle) * shootingStar.speed;
          shootingStar.y += Math.sin(shootingStar.angle) * shootingStar.speed;
          shootingStar.opacity -= 0.01;

          // Remove if off screen or faded
          if (shootingStar.opacity <= 0 || 
              shootingStar.x > window.innerWidth || 
              shootingStar.y > window.innerHeight) {
            return false;
          }

          // Draw shooting star with trail
          const gradient = ctx.createLinearGradient(
            shootingStar.x,
            shootingStar.y,
            shootingStar.x - Math.cos(shootingStar.angle) * shootingStar.length,
            shootingStar.y - Math.sin(shootingStar.angle) * shootingStar.length
          );
          gradient.addColorStop(0, `rgba(255, 255, 255, ${shootingStar.opacity})`);
          gradient.addColorStop(0.5, `rgba(173, 216, 230, ${shootingStar.opacity * 0.7})`);
          gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

          ctx.strokeStyle = gradient;
          ctx.lineWidth = 2;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(shootingStar.x, shootingStar.y);
          ctx.lineTo(
            shootingStar.x - Math.cos(shootingStar.angle) * shootingStar.length,
            shootingStar.y - Math.sin(shootingStar.angle) * shootingStar.length
          );
          ctx.stroke();

          // Add glow effect at the head
          ctx.save();
          ctx.globalCompositeOperation = 'screen';
          ctx.shadowBlur = 15;
          ctx.shadowColor = `rgba(255, 255, 255, ${shootingStar.opacity})`;
          ctx.fillStyle = `rgba(255, 255, 255, ${shootingStar.opacity})`;
          ctx.beginPath();
          ctx.arc(shootingStar.x, shootingStar.y, 2, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();

          return true;
        });
      }

      // Update and draw stars
      starsRef.current.forEach((star) => {
        // Diagonal movement (down-right)
        star.x += star.speed * 0.7;
        star.y += star.speed * 0.7;

        // Toroidal wrapping
        if (star.x > window.innerWidth) star.x = 0;
        if (star.y > window.innerHeight) star.y = 0;

        // Twinkle calculation using sine wave
        const twinkleOffset = Math.sin(
          star.twinklePhase + (elapsed / star.twinklePeriod) * Math.PI * 2
        );
        const currentOpacity = star.opacity + twinkleOffset * 0.2;

        // Determine star color (white or pale blue)
        const isBlue = Math.random() > 0.7;
        const color = isBlue
          ? `rgba(173, 216, 230, ${Math.max(0, Math.min(1, currentOpacity))})`
          : `rgba(255, 255, 255, ${Math.max(0, Math.min(1, currentOpacity))})`;

        // Draw star with bloom effect for brighter stars
        if (star.layer === 2 && star.opacity > 0.8) {
          // Add bloom for near, bright stars
          ctx.save();
          ctx.globalCompositeOperation = 'screen';
          ctx.shadowBlur = star.size * 3;
          ctx.shadowColor = color;
          ctx.fillStyle = color;
          ctx.beginPath();
          ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        } else {
          // Regular star
          ctx.fillStyle = color;
          ctx.beginPath();
          ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
          ctx.fill();
        }
      });

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', handleResize);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [enabled, starCount, speedMultiplier, shootingStarsEnabled]);

  if (!enabled) {
    return null;
  }

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none"
      style={{ zIndex: 0 }}
    />
  );
};

