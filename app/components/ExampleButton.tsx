import { ExampleButtonProps } from "../types/index";

export default function ExampleButton({
  question,
  onClick,
  disabled,
  isDarkMode,
}: ExampleButtonProps) {
  return (
    <button
      onClick={() => onClick(question)}
      disabled={disabled}
      className={`w-full p-4 text-left rounded-lg transition-colors duration-200 ease-in-out hover:cursor-pointer ${
        disabled
          ? "opacity-50 cursor-not-allowed"
          : isDarkMode
          ? "hover:bg-black/70"
          : "hover:bg-black/90"
      } ${isDarkMode ? "bg-black/85 text-gray-300" : "bg-black/95 text-white"}`}
    >
      {question}
    </button>
  );
}
