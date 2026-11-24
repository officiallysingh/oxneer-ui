'use client';

import { useState, useRef, useEffect, useImperativeHandle, useCallback, type Ref } from 'react';
import { RefreshCw } from 'lucide-react';
import { Input, Label, cn } from '@oxneer/ui';

const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
const CAPTCHA_LENGTH = 6;

function generateCode() {
  return Array.from(
    { length: CAPTCHA_LENGTH },
    () => CHARS[Math.floor(Math.random() * CHARS.length)],
  ).join('');
}

function drawCaptcha(canvas: HTMLCanvasElement, code: string) {
  const W = canvas.width;
  const H = canvas.height;
  const ctx = canvas.getContext('2d')!;

  // Background
  ctx.fillStyle = '#f0f4ff';
  ctx.fillRect(0, 0, W, H);

  // Background noise dots
  for (let i = 0; i < 80; i++) {
    ctx.beginPath();
    ctx.arc(Math.random() * W, Math.random() * H, Math.random() * 1.5, 0, Math.PI * 2);
    ctx.fillStyle = `hsl(${Math.random() * 360},60%,70%)`;
    ctx.fill();
  }

  // Noise lines
  for (let i = 0; i < 5; i++) {
    ctx.beginPath();
    ctx.moveTo(Math.random() * W, Math.random() * H);
    ctx.bezierCurveTo(
      Math.random() * W,
      Math.random() * H,
      Math.random() * W,
      Math.random() * H,
      Math.random() * W,
      Math.random() * H,
    );
    ctx.strokeStyle = `hsl(${Math.random() * 360},50%,60%)`;
    ctx.lineWidth = 1 + Math.random();
    ctx.stroke();
  }

  // Characters
  const charW = W / (CAPTCHA_LENGTH + 1);
  const fonts = ['Arial', 'Georgia', 'Verdana', 'Courier New', 'Trebuchet MS'];
  for (let i = 0; i < code.length; i++) {
    ctx.save();
    const x = charW * (i + 0.8) + charW * 0.1;
    const y = H / 2 + 6;
    ctx.translate(x, y);
    ctx.rotate((Math.random() - 0.5) * 0.5);
    ctx.font = `bold ${22 + Math.floor(Math.random() * 8)}px ${fonts[i % fonts.length]}`;
    ctx.fillStyle = `hsl(${Math.random() * 60 + 200},70%,35%)`;
    ctx.fillText(code[i]!, 0, 0);
    ctx.restore();
  }
}

export interface TextCaptchaHandle {
  validate: () => boolean;
  reset: () => void;
}

export interface TextCaptchaProps {
  className?: string;
  /** Exposes validate()/reset() to the parent form (React 19: ref is a regular prop). */
  ref?: Ref<TextCaptchaHandle>;
}

export function TextCaptcha({ className, ref }: TextCaptchaProps) {
  const [code, setCode] = useState(() => generateCode());
  const [value, setValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const refresh = useCallback(() => {
    setCode(generateCode());
    setValue('');
    setError(null);
  }, []);

  // Redraw whenever code changes
  useEffect(() => {
    if (canvasRef.current && code) {
      drawCaptcha(canvasRef.current, code);
    }
  }, [code]);

  useImperativeHandle(ref, () => ({
    validate() {
      if (value.trim() === code) {
        setError(null);
        return true;
      }
      setError('Incorrect CAPTCHA. Please try again.');
      refresh();
      return false;
    },
    reset() {
      refresh();
    },
  }));

  return (
    <div className={cn('space-y-5', className ?? '')}>
      {/* <Label className={error ? 'text-destructive' : ''}>
        Security check <span className="text-destructive">*</span>
      </Label> */}
      <div className="flex items-center gap-2">
        <div className="rounded-md border border-border overflow-hidden select-none">
          <canvas ref={canvasRef} width={200} height={52} />
        </div>
        <button
          type="button"
          onClick={refresh}
          className="text-muted-foreground hover:text-foreground transition-colors"
          title="Refresh CAPTCHA"
        >
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>
      {/* <Label className={error ? 'text-destructive' : ''}>
        Enter Characters shown above <span className="text-destructive">*</span>
      </Label> */}
      <Input
        placeholder="Enter the characters shown above"
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          if (error) setError(null);
        }}
        className={error ? 'border-destructive focus-visible:ring-destructive' : ''}
        autoComplete="off"
        maxLength={CAPTCHA_LENGTH}
      />
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
