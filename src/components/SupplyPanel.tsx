"use client";

import { Package, TrendingUp, TrendingDown, AlertTriangle } from "lucide-react";

interface SupplyPanelProps {
  supply: number;
  facilityCount: number;
}

const SUPPLY_PER_FACILITY = 5;
const LOGISTICS_COST = 3;

export default function SupplyPanel({ supply, facilityCount }: SupplyPanelProps) {
  const income = facilityCount * SUPPLY_PER_FACILITY;
  const cost = LOGISTICS_COST;
  const net = income - cost;
  const isLow = supply < 30;

  const valueColor = isLow
    ? "text-alert-critical"
    : supply < 60
      ? "text-alert-warning"
      : "text-accent-cyan";

  const borderColor = isLow
    ? "border-alert-critical/20"
    : supply < 60
      ? "border-alert-warning/15"
      : "border-accent-cyan/12";

  const bgColor = isLow
    ? "bg-alert-critical/5"
    : supply < 60
      ? "bg-alert-warning/4"
      : "bg-accent-cyan/3";

  return (
    <div
      className={`flex items-center gap-3 ${bgColor} border ${borderColor} rounded-lg px-4 py-2 ${
        isLow ? "supply-low-pulse" : ""
      }`}
    >
      <div className="flex items-center gap-2">
        <Package className={`w-4 h-4 ${valueColor} shrink-0`} />
        <div>
          <div className="readout text-xs text-text-dim uppercase tracking-wider">
            補給
          </div>
          <div className="flex items-baseline gap-1 mt-0.5">
            <span className={`readout text-lg font-bold ${valueColor}`}>
              {supply}
            </span>
          </div>
        </div>
      </div>

      <div className="flex flex-col items-end gap-0.5 readout text-xs">
        <span className="text-alert-success flex items-center gap-0.5">
          <TrendingUp className="w-3 h-3" />+{income}/T
        </span>
        <span className="text-alert-critical flex items-center gap-0.5">
          <TrendingDown className="w-3 h-3" />-{cost}/T
        </span>
      </div>

      {net !== 0 && (
        <div className="h-5 w-px bg-border-subtle mx-0.5" />
      )}

      <div className="readout text-xs">
        {net > 0 ? (
          <span className="text-alert-success font-bold">+{net}/T</span>
        ) : net < 0 ? (
          <span className="text-alert-critical font-bold">{net}/T</span>
        ) : (
          <span className="text-text-dim">±0/T</span>
        )}
      </div>

      {isLow && (
        <AlertTriangle className="w-4 h-4 text-alert-critical animate-blink shrink-0" />
      )}
    </div>
  );
}
