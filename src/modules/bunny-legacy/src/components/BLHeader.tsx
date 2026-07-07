/**
 * BLHeader - Application header for Bunny Legacy Book Builder.
 *
 * Displays the app title, an AI config trigger button, and a logout button
 * that navigates to root "/".
 */

"use client";

import React from "react";
import { Button } from "@heroui/react";
import { Settings2, LogOut, BookOpen } from "lucide-react";

/** Teal: lab(44.7267% -21.5987 -26.118) ≈ #007399 */
const TEAL = "#007399";
const TEAL_DARK = "#00557a";

const btnSolid = {
  background: `linear-gradient(135deg, ${TEAL}, ${TEAL_DARK})`,
  color: "#fff",
  border: "none",
};

const btnOutline = {
  borderColor: TEAL,
  color: TEAL,
  background: "#f0f0f0",
};

export interface IBLHeaderProps {
  onOpenAIConfig: () => void;
}

export const BLHeader: React.FC<IBLHeaderProps> = ({ onOpenAIConfig }) => {
  const handleLogout = () => {
    window.location.href = "/";
  };

  return (
    <header
      className="w-full rounded-xl px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between"
      style={{
        background: `linear-gradient(135deg, ${TEAL}, ${TEAL_DARK})`,
      }}
    >
      {/* Left: Title */}
      <div className="flex items-center gap-3">
        <div
          className="p-1.5 rounded-lg"
          style={{ background: "#ffffff26" }}
        >
          <BookOpen className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-lg sm:text-xl font-bold text-white">
            Bunny Legacy — Book Builder
          </h1>
          <p className="text-xs text-white/70 hidden sm:block">
            AI-powered chapter generation & editing
          </p>
        </div>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          onPress={onOpenAIConfig}
          style={btnOutline}
          className="whitespace-nowrap"
        >
          <Settings2 className="w-4 h-4 sm:mr-1" />
          <span className="hidden sm:inline">AI Config</span>
        </Button>
        <Button
          size="sm"
          onPress={handleLogout}
          className="whitespace-nowrap"
          style={{
            background: "#ffffff26",
            color: "#fff",
            border: "1px solid #ffffff40",
          }}
        >
          <LogOut className="w-4 h-4 sm:mr-1" />
          <span className="hidden sm:inline">Logout</span>
        </Button>
      </div>
    </header>
  );
};

export default BLHeader;
