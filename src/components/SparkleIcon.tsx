import { Sparkles } from 'lucide-react';

const SparkleIcon = ({ className }: { className?: string }) => (
  <span className={`inline-block animate-float ${className || ''}`}>
    <Sparkles className="w-8 h-8 fill-current stroke-[2.5]" />
  </span>
);

export default SparkleIcon;
