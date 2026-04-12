import React from 'react';
import { motion } from 'motion/react';

interface PulseCircleProps {
  status: number; // 0-100
  size?: number;
  color?: string;
  label?: string;
}

export const PulseCircle: React.FC<PulseCircleProps> = ({ status, size = 120, color = '#10b981', label }) => {
  const radius = size / 2 - 10;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (status / 100) * circumference;

  return (
    <div className="relative flex flex-col items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        {/* Background Circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#e5e7eb"
          strokeWidth="8"
          fill="transparent"
        />
        {/* Progress Circle */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth="8"
          fill="transparent"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1, ease: "easeOut" }}
          strokeLinecap="round"
        />
      </svg>
      
      {/* Pulse Animation */}
      <motion.div
        className="absolute rounded-full"
        style={{ backgroundColor: color, width: size - 30, height: size - 30, opacity: 0.1 }}
        animate={{
          scale: [1, 1.1, 1],
          opacity: [0.1, 0.2, 0.1],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />

      <div className="absolute flex flex-col items-center">
        <span className="text-xl font-bold" style={{ color }}>{status}%</span>
        {label && <span className="text-[10px] uppercase tracking-wider text-gray-500 font-medium">{label}</span>}
      </div>
    </div>
  );
};
