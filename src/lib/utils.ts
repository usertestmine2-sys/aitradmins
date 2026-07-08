import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number | string): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(typeof amount === 'string' ? parseFloat(amount) : amount);
}

export function formatPercent(value: number): string {
  return `${(value * 100).toFixed(2)}%`;
}

export const calculatePortfolioMetrics = (positions: any[], cash: number) => {
  const totalValue = positions.reduce((sum, pos) => {
    return sum + (parseFloat(pos.value || '0') || 0);
  }, cash);
  const riskScore = Math.min(85, Math.max(15, 45 + Math.random() * 30)); // simulated for demo
  return { totalValue, riskScore };
};
