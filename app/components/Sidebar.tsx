"use client";
import { Plus, PanelLeftClose, PanelRightClose, Sun, Moon } from "lucide-react";
import { useTheme } from "../context/ThemeContext";
import { SidebarProps } from "../types/index";

export default function Sidebar({
  onNewChat,
  isExpanded,
  setIsExpanded,
}: SidebarProps) {
  const { isDarkMode, toggleDarkMode } = useTheme();

  return (
    <div
      className={`fixed sm:relative h-full transition-all duration-300 ease-in-out ${
        isExpanded
          ? typeof window !== "undefined" && window.innerWidth <= 640
            ? "w-0"
            : "w-64"
          : "w-0"
      } ${
        isDarkMode
          ? "bg-black/80"
          : `bg-white shadow-sm ${isExpanded ? "border-r border-gray-300" : ""}`
      }`}
    >
      <div className="hidden md:flex flex-col h-full">
        <div className="p-4 flex items-center justify-between">
          <button
            onClick={toggleDarkMode}
            className={`p-2 rounded-lg hover:cursor-pointer transition-colors ${
              isDarkMode
                ? "hover:bg-gray-800/50 text-gray-400"
                : "hover:bg-gray-300 text-gray-600"
            }`}
          >
            {isDarkMode ? (
              <Sun className="h-5 w-5" />
            ) : (
              <Moon className="h-5 w-5" />
            )}
          </button>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className={`p-2 rounded-lg hover:cursor-pointer transition-colors ${
              isDarkMode
                ? "hover:bg-gray-800/50 text-gray-400"
                : "hover:bg-gray-300 text-gray-600"
            }`}
          >
            {isExpanded ? (
              <PanelLeftClose className="h-5 w-5" />
            ) : (
              <PanelRightClose className="h-5 w-5" />
            )}
          </button>
        </div>

        <div className="flex-1 p-4">
          <button
            onClick={onNewChat}
            className={`w-full flex hover:cursor-pointer items-center gap-3 p-3 rounded-lg transition-colors ${
              isDarkMode
                ? "text-gray-300 hover:bg-white/30"
                : "text-gray-700 hover:bg-black/20"
            }`}
          >
            {isExpanded && <Plus className="h-5 w-5" />}
            {isExpanded && <span>New Chat</span>}
          </button>
        </div>

        {/* HIDDEN BECAUSE OF SIZE ISSUE WHEN SIDEBAR IS EXPANDED */}
        {/* <div
          className={`p-4 border-t ${
            isDarkMode ? "border-gray-800/50" : "border-gray-200"
          }`}
        >
          <button
            onClick={toggleDarkMode}
            className={`w-full flex items-center ${
              isExpanded ? "gap-3" : "justify-center"
            } hover:cursor-pointer p-3 rounded-lg transition-colors ${
              isDarkMode
                ? "text-gray-300 hover:bg-gray-800/50"
                : "text-gray-700 hover:bg-gray-300"
            }`}
          >
            {isDarkMode ? (
              <Sun className="h-5 w-5" />
            ) : (
              <Moon className="h-5 w-5" />
            )}
            {isExpanded && <span>{isDarkMode ? "Dark" : "Light"}</span>}
          </button>
        </div> */}
      </div>
    </div>
  );
}
