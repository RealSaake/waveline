'use client';

import { useEffect, useRef } from 'react';

interface VisualDNA {
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  particleShape: string;
  particleSpeed: number;
  particleSize: number;
  flowPattern: string;
  complexity: number;
  brightness: number;
}

interface AudioData {
  frequencies: Uint8Array;
  volume: number;
  bassLevel: number;
  midLevel: number;
  trebleLevel: number;
}

interface GenerativeVisualizerProps {
  audioData: AudioData | null;
  visualDNA: VisualDNA;
  width: number;
  height: number;
}

class GenerativeArtSystem {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private particles: Particle[] = [];
  private time = 0;
  private visualDNA: VisualDNA;

  constructor(canvas: HTMLCanvasElement, visualDNA: VisualDNA) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.visualDNA = visualDNA;
    this.initializeParticles();
  }

  private initializeParticles() {
    const particleCount = Math.floor(this.visualDNA.complexity * 50);
    this.particles = [];
    
    for (let i = 0; i < particleCount; i++) {
      this.particles.push(new Particle(
        Math.random() * this.canvas.width,
        Math.random() * this.canvas.height,
        this.visualDNA
      ));
    }
  }

  public render(audioData: AudioData | null) {
    this.time += 0.016; // ~60fps
    
    // Clear with dynamic background
    const bgAlpha = audioData ? audioData.volume * 0.1 : 0.05;
    this.ctx.fillStyle = `rgba(0, 0, 0, ${bgAlpha})`;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Update and render particles
    this.particles.forEach(particle => {
      particle.update(audioData, this.time, this.canvas.width, this.canvas.height);
      particle.render(this.ctx);
    });

    // Add generative effects based on audio
    if (audioData) {
      this.renderAudioReactiveEffects(audioData);
    }
  }

  private renderAudioReactiveEffects(audioData: AudioData) {
    const { frequencies, bassLevel, midLevel, trebleLevel } = audioData;
    
    // Bass-driven background pulses
    if (bassLevel > 0.6) {
      this.ctx.save();
      this.ctx.globalAlpha = (bassLevel - 0.6) * 0.5;
      this.ctx.fillStyle = this.visualDNA.primaryColor;
      this.ctx.beginPath();
      this.ctx.arc(
        this.canvas.width / 2,
        this.canvas.height / 2,
        bassLevel * 200,
        0,
        Math.PI * 2
      );
      this.ctx.fill();
      this.ctx.restore();
    }

    // Mid-frequency particle spawning
    if (midLevel > 0.7) {
      for (let i = 0; i < 3; i++) {
        this.particles.push(new Particle(
          Math.random() * this.canvas.width,
          Math.random() * this.canvas.height,
          this.visualDNA,
          true // burst particle
        ));
      }
    }

    // Treble-driven lightning effects
    if (trebleLevel > 0.8) {
      this.renderLightning(trebleLevel);
    }
  }

  private renderLightning(intensity: number) {
    this.ctx.save();
    this.ctx.strokeStyle = this.visualDNA.accentColor;
    this.ctx.lineWidth = intensity * 3;
    this.ctx.globalAlpha = intensity * 0.7;
    
    const startX = Math.random() * this.canvas.width;
    const startY = Math.random() * this.canvas.height;
    
    this.ctx.beginPath();
    this.ctx.moveTo(startX, startY);
    
    for (let i = 0; i < 5; i++) {
      const x = startX + (Math.random() - 0.5) * 200;
      const y = startY + (Math.random() - 0.5) * 200;
      this.ctx.lineTo(x, y);
    }
    
    this.ctx.stroke();
    this.ctx.restore();
  }

  public updateVisualDNA(newDNA: VisualDNA) {
    this.visualDNA = newDNA;
    this.particles.forEach(particle => particle.updateDNA(newDNA));
  }
}

class Particle {
  private x: number;
  private y: number;
  private vx: number;
  private vy: number;
  private size: number;
  private life: number;
  private maxLife: number;
  private color: string;
  private shape: string;
  private isBurst: boolean;

  constructor(x: number, y: number, visualDNA: VisualDNA, isBurst = false) {
    this.x = x;
    this.y = y;
    this.vx = (Math.random() - 0.5) * visualDNA.particleSpeed;
    this.vy = (Math.random() - 0.5) * visualDNA.particleSpeed;
    this.size = visualDNA.particleSize * (0.5 + Math.random() * 0.5);
    this.maxLife = isBurst ? 60 : 300 + Math.random() * 200;
    this.life = this.maxLife;
    this.shape = visualDNA.particleShape;
    this.isBurst = isBurst;
    
    // Color selection based on particle type
    const colors = [visualDNA.primaryColor, visualDNA.secondaryColor, visualDNA.accentColor];
    this.color = colors[Math.floor(Math.random() * colors.length)];
  }

  public update(audioData: AudioData | null, time: number, canvasWidth: number, canvasHeight: number) {
    this.life--;
    
    if (audioData) {
      // Audio-reactive movement
      const frequencyIndex = Math.floor((this.x / canvasWidth) * audioData.frequencies.length);
      const frequency = audioData.frequencies[frequencyIndex] / 255;
      
      this.vx += (Math.random() - 0.5) * frequency * 0.1;
      this.vy += (Math.random() - 0.5) * frequency * 0.1;
      
      // Size pulsing based on audio
      this.size += Math.sin(time * 10 + this.x * 0.01) * audioData.volume * 0.5;
    }
    
    this.x += this.vx;
    this.y += this.vy;
    
    // Boundary wrapping
    if (this.x < 0) this.x = canvasWidth;
    if (this.x > canvasWidth) this.x = 0;
    if (this.y < 0) this.y = canvasHeight;
    if (this.y > canvasHeight) this.y = 0;
    
    // Velocity damping
    this.vx *= 0.99;
    this.vy *= 0.99;
  }

  public render(ctx: CanvasRenderingContext2D) {
    if (this.life <= 0) return;
    
    const alpha = this.life / this.maxLife;
    ctx.save();
    ctx.globalAlpha = alpha * (this.isBurst ? 0.8 : 0.6);
    ctx.fillStyle = this.color;
    
    ctx.translate(this.x, this.y);
    
    switch (this.shape) {
      case 'triangle':
        this.renderTriangle(ctx);
        break;
      case 'square':
        this.renderSquare(ctx);
        break;
      case 'star':
        this.renderStar(ctx);
        break;
      case 'hexagon':
        this.renderHexagon(ctx);
        break;
      default:
        this.renderCircle(ctx);
    }
    
    ctx.restore();
  }

  private renderCircle(ctx: CanvasRenderingContext2D) {
    ctx.beginPath();
    ctx.arc(0, 0, this.size, 0, Math.PI * 2);
    ctx.fill();
  }

  private renderTriangle(ctx: CanvasRenderingContext2D) {
    ctx.beginPath();
    ctx.moveTo(0, -this.size);
    ctx.lineTo(-this.size * 0.866, this.size * 0.5);
    ctx.lineTo(this.size * 0.866, this.size * 0.5);
    ctx.closePath();
    ctx.fill();
  }

  private renderSquare(ctx: CanvasRenderingContext2D) {
    ctx.fillRect(-this.size / 2, -this.size / 2, this.size, this.size);
  }

  private renderStar(ctx: CanvasRenderingContext2D) {
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
      const angle = (i * Math.PI * 2) / 5;
      const x = Math.cos(angle) * this.size;
      const y = Math.sin(angle) * this.size;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
      
      const innerAngle = ((i + 0.5) * Math.PI * 2) / 5;
      const innerX = Math.cos(innerAngle) * this.size * 0.5;
      const innerY = Math.sin(innerAngle) * this.size * 0.5;
      ctx.lineTo(innerX, innerY);
    }
    ctx.closePath();
    ctx.fill();
  }

  private renderHexagon(ctx: CanvasRenderingContext2D) {
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const angle = (i * Math.PI * 2) / 6;
      const x = Math.cos(angle) * this.size;
      const y = Math.sin(angle) * this.size;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
  }

  public updateDNA(visualDNA: VisualDNA) {
    this.shape = visualDNA.particleShape;
    const colors = [visualDNA.primaryColor, visualDNA.secondaryColor, visualDNA.accentColor];
    this.color = colors[Math.floor(Math.random() * colors.length)];
  }

  public isDead(): boolean {
    return this.life <= 0;
  }
}

export default function GenerativeVisualizer({ audioData, visualDNA, width, height }: GenerativeVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const artSystemRef = useRef<GenerativeArtSystem | null>(null);
  const animationRef = useRef<number>();

  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    canvas.width = width;
    canvas.height = height;

    artSystemRef.current = new GenerativeArtSystem(canvas, visualDNA);

    const animate = () => {
      if (artSystemRef.current) {
        artSystemRef.current.render(audioData);
      }
      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [width, height]);

  useEffect(() => {
    if (artSystemRef.current) {
      artSystemRef.current.updateVisualDNA(visualDNA);
    }
  }, [visualDNA]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full"
      style={{ background: 'transparent' }}
    />
  );
}