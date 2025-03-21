export interface Example {
  question: string;
  color: "blue" | "green" | "purple" | "red";
}

export interface Message {
  id: string;
  content: string;
  role: "user" | "assistant";
  isEditing?: boolean;
  isCommand?: boolean;
}

export interface Toast {
  id: string;
  message: string;
  type: "success" | "error";
}

export interface Command {
  name: string;
  description: string;
  icon: React.ReactNode;
  execute: () => string;
}

export interface ExampleButtonProps {
  question: string;
  onClick: (question: string) => void;
  disabled?: boolean;
  isDarkMode: boolean;
}

export interface SidebarProps {
  onNewChat: () => void;
  isExpanded: boolean;
  setIsExpanded: (isExpanded: boolean) => void;
}

export interface ThemeContextType {
  isDarkMode: boolean;
  toggleDarkMode: () => void;
}
