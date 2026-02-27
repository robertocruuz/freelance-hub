import { Sparkles } from 'lucide-react';

const SparkleIcon = ({ className }: { className?: string }) => (
  <span className={`inline-block glow-sparkle animate-pulse-glow ${className || ''}`}>
    <Sparkles className="w-8 h-8" />
  </span>
);

export default SparkleIcon;
