'use client';

import { useEffect, useRef } from 'react';

export const AnimatedBackground = ({ className = '' }: { className?: string }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number>();
  const particlesRef = useRef<Particle[]>([]);

  class Particle {
    x: number;
    y: number;
    size: number;
    speedX: number;
    speedY: number;
    color: string;
    opacity: number;
    direction: number;
    glow: number;
    shape: number;

    constructor(width: number, height: number) {
      this.x = Math.random() * width;
      this.y = Math.random() * height;
      this.size = Math.random() * 3.5 + 1.5;
      this.speedX = (Math.random() - 0.5) * 1.5;
      this.speedY = (Math.random() - 0.5) * 1.5;
      // Randomly choose from palette: #74f0ed (teal), #ea445a (red), #fff (white)
      const palette = [
        'rgba(116, 240, 237, 0.82)', // #74f0ed
        'rgba(234, 68, 90, 0.82)',   // #ea445a
        'rgba(255,255,255,0.88)'
      ];
      this.color = palette[Math.floor(Math.random() * palette.length)];
      this.opacity = Math.random() * 0.45 + 0.45;
      this.direction = Math.random() * Math.PI * 2;
      this.glow = Math.random() * 16 + 8;
      this.shape = Math.random() < 0.7 ? 0 : 1; // 0: circle, 1: star
    }

    update(width: number, height: number) {
      this.x += this.speedX + Math.cos(this.direction) * 1.18;
      this.y += this.speedY + Math.sin(this.direction) * 1.18;
      this.direction += 0.005;

      if (this.x > width) this.x = 0;
      if (this.x < 0) this.x = width;
      if (this.y > height) this.y = 0;
      if (this.y < 0) this.y = height;
    }

    draw(ctx: CanvasRenderingContext2D) {
      ctx.save();
      ctx.globalAlpha = this.opacity;
      ctx.shadowColor = this.color;
      ctx.shadowBlur = this.glow;
      ctx.beginPath();
      if (this.shape === 0) {
        // Circle
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
      } else {
        // Star
        const spikes = 5;
        const outerRadius = this.size;
        const innerRadius = this.size * 0.5;
        let rot = Math.PI / 2 * 3;
        let step = Math.PI / spikes;
        ctx.moveTo(this.x, this.y - outerRadius);
        for (let i = 0; i < spikes; i++) {
          ctx.lineTo(
            this.x + Math.cos(rot) * outerRadius,
            this.y + Math.sin(rot) * outerRadius
          );
          rot += step;
          ctx.lineTo(
            this.x + Math.cos(rot) * innerRadius,
            this.y + Math.sin(rot) * innerRadius
          );
          rot += step;
        }
        ctx.lineTo(this.x, this.y - outerRadius);
      }
      ctx.closePath();
      ctx.fillStyle = this.color;
      ctx.fill();
      ctx.restore();
      ctx.globalAlpha = 1;
    }
  }

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;

    const resizeCanvas = () => {
      const { width, height } = canvas.getBoundingClientRect();
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.setTransform(1, 0, 0, 1, 0, 0); // Reset previous scaling
      ctx.scale(dpr, dpr);
    };

    const createParticles = (count: number) => {
      const { width, height } = canvas;
      particlesRef.current = [];
      for (let i = 0; i < count; i++) {
        particlesRef.current.push(new Particle(width / dpr, height / dpr));
      }
    };

    const animate = () => {
      const { width, height } = canvas.getBoundingClientRect();
      ctx.fillStyle = 'rgba(0, 0, 0, 0.13)'; // Softer dark overlay
      ctx.fillRect(0, 0, width, height);

      particlesRef.current.forEach((particle) => {
        particle.update(width, height);
        particle.draw(ctx);
      });

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    resizeCanvas();
    createParticles(30);
    animate();

    window.addEventListener('resize', () => {
      resizeCanvas();
      createParticles(30);
    });

    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      window.removeEventListener('resize', () => {
        resizeCanvas();
        createParticles(30);
      });
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className={className + ' pointer-events-none'}
      style={{
        width: '100%',
        height: '100%',
        filter: 'blur(2px)',
        background: 'linear-gradient(to bottom, hsl(var(--background)), hsl(var(--background) / 0.8))'
      }}
    />
  );
};
