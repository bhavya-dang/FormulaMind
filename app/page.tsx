"use client";
import React, { useState, useRef, useEffect } from "react";
import { Message, Command, Toast } from "./types/index";
import Sidebar from "./components/Sidebar";
import ExampleButton from "./components/ExampleButton";
import {
  Edit2,
  Copy,
  Check,
  X,
  Send,
  XCircle,
  Command as CommandIcon,
  HelpCircle,
  Trash2,
  CheckCircle,
  StopCircle,
} from "lucide-react";
import { exampleQuestions } from "./constants/index";
import { useTheme } from "./context/ThemeContext";
import Link from "next/link";

export default function Home() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(true);
  const abortControllerRef = useRef<AbortController | null>(null);
  const { isDarkMode } = useTheme();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);

  function onClick() {
    window.location.href = "/";
  }

  const addToast = (message: string, type: "success" | "error") => {
    const toast: Toast = {
      id: Date.now().toString(),
      message,
      type,
    };
    setToasts((prev) => [...prev, toast]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== toast.id));
    }, 3000);
  };

  const commands: Command[] = [
    {
      name: "help",
      description: "Show available commands",
      icon: <HelpCircle className="text-white h-5 w-5" />,
      execute: () => {
        const helpMessage = commands
          .map((cmd) => `${cmd.name}: ${cmd.description}`)
          .join("\n");
        return helpMessage;
      },
    },
    {
      name: "clear",
      description: "Clear chat history",
      icon: <Trash2 className="text-white h-5 w-5" />,
      execute: () => {
        setMessages([]);
        addToast("Chat history cleared", "success");
        return "Chat history has been cleared.";
      },
    },
  ];

  const filteredCommands = input.startsWith("@")
    ? commands.filter((cmd) =>
        cmd.name.toLowerCase().startsWith(input.slice(1).toLowerCase())
      )
    : [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: crypto.randomUUID(),
      content: input,
      role: "user",
      isCommand: input.startsWith("@"),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    // Check if it's a command
    if (input.startsWith("@")) {
      const commandName = input.slice(1).toLowerCase();
      const command = commands.find((cmd) => cmd.name === commandName);

      if (command) {
        const assistantMessage: Message = {
          id: crypto.randomUUID(),
          content: command.execute(),
          role: "assistant",
          isCommand: true,
        };
        setMessages((prev) => [...prev, assistantMessage]);
        setIsLoading(false);
        return;
      }
    }

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: [...messages, userMessage].map(({ role, content }) => ({
            role,
            content,
          })),
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (!data || !data.choices || !data.choices[0]?.message?.content) {
        throw new Error("Invalid response format");
      }

      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        content: data.choices[0].message.content,
        role: "assistant",
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error("Error:", error);
      const errorMessage: Message = {
        id: crypto.randomUUID(),
        content: "Sorry, I encountered an error. Please try again.",
        role: "assistant",
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInput(value);
    setShowSuggestions(value.startsWith("@"));
    setSelectedSuggestionIndex(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showSuggestions) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedSuggestionIndex((prev) =>
        prev < filteredCommands.length - 1 ? prev + 1 : prev
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedSuggestionIndex((prev) => (prev > 0 ? prev - 1 : prev));
    } else if (e.key === "Enter" && selectedSuggestionIndex >= 0) {
      e.preventDefault();
      const selectedCommand = filteredCommands[selectedSuggestionIndex];
      setInput(`@${selectedCommand.name}`);
      setShowSuggestions(false);
      setSelectedSuggestionIndex(-1);
    } else if (e.key === "Escape") {
      setShowSuggestions(false);
      setSelectedSuggestionIndex(-1);
    }
  };

  const handlePrompt = async (question: string) => {
    setInput(question);
    // Trigger form submission
    const event = new Event("submit", { bubbles: true });
    document.querySelector("form")?.dispatchEvent(event);
  };

  const handleEditMessage = (messageId: string) => {
    setMessages((prev) =>
      prev.map((msg) =>
        msg.id === messageId ? { ...msg, isEditing: true } : msg
      )
    );
  };

  const handleEditContent = (messageId: string, newContent: string) => {
    setMessages((prev) =>
      prev.map((msg) =>
        msg.id === messageId ? { ...msg, content: newContent } : msg
      )
    );
  };

  const handleSaveEdit = async (messageId: string) => {
    // Find the edited message and its index
    const editedMessageIndex = messages.findIndex(
      (msg) => msg.id === messageId
    );
    if (editedMessageIndex === -1) return;

    // Set isEditing to false first
    setMessages((prev) =>
      prev.map((msg) =>
        msg.id === messageId ? { ...msg, isEditing: false } : msg
      )
    );

    // Remove all messages after the edited message
    setMessages((prev) => prev.slice(0, editedMessageIndex + 1));

    // Generate new response
    setIsLoading(true);
    abortControllerRef.current = new AbortController();

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: messages.slice(0, editedMessageIndex + 1),
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        content: data.choices[0].message.content,
        role: "assistant",
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        console.log("Request aborted");
        return;
      }
      console.error("Chat error:", err);
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  };

  const handleCancelEdit = (messageId: string) => {
    setMessages((prev) =>
      prev.map((msg) =>
        msg.id === messageId ? { ...msg, isEditing: false } : msg
      )
    );
  };

  const handleCopyMessage = async (content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      const toast: Toast = {
        id: crypto.randomUUID(),
        message: "Message copied to clipboard",
        type: "success",
      };
      setToasts((prev) => [...prev, toast]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== toast.id));
      }, 3000);
    } catch (err) {
      console.error("Failed to copy text:", err);
      const toast: Toast = {
        id: crypto.randomUUID(),
        message: "Failed to copy message",
        type: "error",
      };
      setToasts((prev) => [...prev, toast]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== toast.id));
      }, 3000);
    }
  };

  const noMessages = !messages || messages.length === 0;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  return (
    <div
      className={`flex h-screen transition-colors duration-300 ${
        isDarkMode ? "bg-black/95" : "bg-white"
      }`}
    >
      <Sidebar
        onNewChat={() => setMessages([])}
        isExpanded={isSidebarExpanded}
        setIsExpanded={setIsSidebarExpanded}
      />

      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        {!noMessages && (
          <div className="p-4">
            <div className="max-w-3xl ml-20 flex items-center">
              <p
                className={`text-2xl font-bold mb-4 ${
                  isDarkMode
                    ? "bg-gradient-to-r from-white to-gray-300"
                    : "bg-gradient-to-r from-gray-900 to-gray-700"
                } bg-clip-text text-transparent`}
              >
                <Link href={""} onClick={onClick}>
                  FormulaMind
                </Link>
              </p>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto">
          <div className="max-w-3xl mx-auto px-4 py-6">
            {noMessages ? (
              <div className="space-y-6">
                <div className="text-center">
                  <h2
                    className={`text-3xl sm:text-4xl font-bold mb-4 ${
                      isDarkMode
                        ? "bg-gradient-to-r from-white to-gray-300"
                        : "bg-gradient-to-r from-gray-900 to-gray-700"
                    } bg-clip-text text-transparent`}
                  >
                    FormulaMind
                  </h2>
                  <p
                    className={`text-lg font-inter ${
                      isDarkMode ? "text-gray-300" : "text-gray-700"
                    }`}
                  >
                    Your AI-powered Formula 1 companion
                  </p>
                </div>

                <div className="text-center">
                  <p
                    className={`mb-8 ${
                      isDarkMode ? "text-gray-400" : "text-gray-600"
                    }`}
                  >
                    Ask me anything about Formula 1! From race results and
                    driver statistics to team information and championship
                    history. I&apos;m here to help you explore the world of F1.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {exampleQuestions.map((example, index) => (
                    <ExampleButton
                      key={index}
                      question={example.question}
                      onClick={handlePrompt}
                      disabled={isLoading}
                      isDarkMode={isDarkMode}
                    />
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`group flex ${
                      message.role === "user" ? "justify-end" : "justify-start"
                    }`}
                  >
                    <div className="flex items-start gap-2 max-w-[85%] sm:max-w-[80%]">
                      {message.role === "assistant" && (
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-r from-red-600 to-red-400 flex items-center justify-center">
                          <span className="text-white font-bold">F1</span>
                        </div>
                      )}
                      <div className="flex flex-col gap-2">
                        <div className={`flex items-start gap-2`}>
                          {!message.isEditing && (
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              {message.role === "user" && (
                                <button
                                  onClick={() => handleEditMessage(message.id)}
                                  className={`p-2 rounded-full transition-colors hover:cursor-pointer ${
                                    isDarkMode
                                      ? "hover:bg-gray-800/50 text-gray-300"
                                      : "hover:bg-gray-100 text-gray-600"
                                  }`}
                                >
                                  <Edit2 className="h-4 w-4" />
                                </button>
                              )}
                              {message.role === "user" && (
                                <button
                                  onClick={() =>
                                    handleCopyMessage(message.content)
                                  }
                                  className={`p-2 rounded-full transition-colors hover:cursor-pointer ${
                                    isDarkMode
                                      ? "hover:bg-gray-800/50 text-gray-300"
                                      : "hover:bg-gray-100 text-gray-600"
                                  }`}
                                >
                                  <Copy className="h-4 w-4" />
                                </button>
                              )}
                            </div>
                          )}
                          <div
                            className={`rounded-lg p-4 ${
                              message.role === "user"
                                ? message.isCommand
                                  ? isDarkMode
                                    ? "bg-violet-500"
                                    : "bg-violet-500"
                                  : isDarkMode
                                  ? "bg-white/85"
                                  : "bg-black"
                                : isDarkMode
                                ? "bg-black/30"
                                : "bg-gray-50"
                            }`}
                          >
                            {message.isEditing ? (
                              <textarea
                                value={message.content}
                                onChange={(e) =>
                                  handleEditContent(message.id, e.target.value)
                                }
                                className={`w-full bg-transparent resize-none focus:outline-none ${
                                  isDarkMode ? "text-white" : "text-gray-900"
                                }`}
                                rows={3}
                              />
                            ) : (
                              <p
                                className={`whitespace-pre-wrap ${
                                  isDarkMode
                                    ? message.role === "user"
                                      ? "text-black"
                                      : "text-white"
                                    : message.role === "user"
                                    ? "text-white"
                                    : "text-gray-700"
                                }`}
                              >
                                {message.content}
                              </p>
                            )}
                          </div>{" "}
                          {!message.isEditing && (
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity text-gray-300">
                              {message.role === "assistant" && (
                                <button
                                  onClick={() =>
                                    handleCopyMessage(message.content)
                                  }
                                  className={`p-2 rounded-full transition-colors hover:cursor-pointer ${
                                    isDarkMode
                                      ? "hover:bg-gray-800/50 text-gray-300"
                                      : "hover:bg-gray-100 text-gray-600"
                                  }`}
                                >
                                  <Copy className="h-4 w-4" />
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                        {message.role === "user" && message.isEditing && (
                          <div className="flex gap-2 justify-end">
                            <button
                              onClick={() => handleSaveEdit(message.id)}
                              className={`p-1 rounded-full transition-colors ${
                                isDarkMode
                                  ? "hover:bg-gray-800/50 text-gray-300"
                                  : "hover:bg-gray-100 text-gray-600"
                              }`}
                            >
                              <Check className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleCancelEdit(message.id)}
                              className={`p-1 rounded-full transition-colors ${
                                isDarkMode
                                  ? "hover:bg-gray-800/50 text-gray-300"
                                  : "hover:bg-gray-100 text-gray-600"
                              }`}
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                {isLoading && (
                  <div className="flex justify-start">
                    <div className="bg-black/80 rounded-lg p-4">
                      <div className="flex items-center gap-4">
                        <div className="flex space-x-2">
                          <div className="w-2 h-2 bg-white/70 rounded-full animate-bounce"></div>
                          <div className="w-2 h-2 bg-white/70 rounded-full animate-bounce delay-100"></div>
                          <div className="w-2 h-2 bg-white/70 rounded-full animate-bounce delay-200"></div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>
        </div>

        <div className={`p-4`}>
          <div className="max-w-3xl mx-auto">
            <form onSubmit={handleSubmit} className="relative">
              <div className="flex gap-4">
                <div className="flex-1 relative">
                  {input.startsWith("@") && (
                    <div
                      className={`absolute inset-0 rounded-lg opacity-20 pointer-events-none ${
                        isDarkMode ? "bg-gray-800/50" : "bg-gray-100"
                      }`}
                    />
                  )}
                  <div className="relative flex items-center">
                    {input.startsWith("@") && (
                      <div
                        className={`absolute left-3 ${
                          isDarkMode ? "text-gray-400" : "text-gray-500"
                        }`}
                      >
                        <CommandIcon className="h-4 w-4 text-violet-500" />
                      </div>
                    )}
                    <input
                      type="text"
                      value={input}
                      onChange={handleInputChange}
                      onKeyDown={handleKeyDown}
                      placeholder="Ask anything about Formula 1"
                      className={`w-full rounded-lg px-4 py-3 focus:outline-none focus:ring-2 ${
                        isDarkMode
                          ? "bg-black/30 text-white placeholder-gray-400 focus:ring-white/10"
                          : "bg-gray-100 text-gray-900 placeholder-gray-500 focus:ring-gray-300 border border-gray-300"
                      } ${input.startsWith("@") ? "pl-10" : ""}`}
                      disabled={isLoading}
                    />
                  </div>
                  {showSuggestions && filteredCommands.length > 0 && (
                    <div
                      className={`absolute left-0 right-0 bottom-full mb-1 rounded-lg shadow-lg overflow-hidden z-10 ${
                        isDarkMode ? "bg-gray-800" : "bg-white"
                      }`}
                    >
                      {filteredCommands.map((cmd, index) => (
                        <button
                          key={cmd.name}
                          onClick={() => {
                            setInput(`@${cmd.name}`);
                            setShowSuggestions(false);
                            setSelectedSuggestionIndex(-1);
                          }}
                          className={`w-full px-4 py-2 text-left flex items-center gap-2 ${
                            index === selectedSuggestionIndex
                              ? isDarkMode
                                ? "bg-gray-700"
                                : "bg-gray-100"
                              : isDarkMode
                              ? "hover:bg-gray-700"
                              : "hover:bg-gray-50"
                          }`}
                        >
                          {cmd.icon}
                          <span
                            className={
                              isDarkMode ? "text-gray-200" : "text-gray-900"
                            }
                          >
                            {cmd.name}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <button
                  type="submit"
                  disabled={isLoading ? false : !input.trim()}
                  onClick={isLoading ? handleStopGeneration : undefined}
                  className={`flex items-center justify-center mx-auto px-6 py-3 rounded-lg font-medium focus:outline-none focus:ring-2 disabled:opacity-25 disabled:cursor-not-allowed transition-colors ${
                    isDarkMode
                      ? `bg-black/30 text-white ${
                          !isLoading
                            ? "hover:bg-black/70 focus:ring-white/10"
                            : ""
                        }`
                      : "bg-gray-100 text-gray-900 hover:bg-gray-200 focus:ring-gray-300"
                  }`}
                >
                  {isLoading ? (
                    <>
                      <StopCircle className="h-5 w-5" />
                    </>
                  ) : (
                    <>
                      <Send className="h-5 w-5 mr-2" />
                      Send
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </main>

      <div className="fixed bottom-4 right-4 space-y-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg shadow-lg ${
              toast.type === "success"
                ? isDarkMode
                  ? "bg-green-500/20 text-green-400"
                  : "bg-green-100 text-green-600"
                : isDarkMode
                ? "bg-red-500/20 text-red-400"
                : "bg-red-100 text-red-600"
            }`}
          >
            {toast.type === "success" ? (
              <CheckCircle className="h-5 w-5" />
            ) : (
              <XCircle className="h-5 w-5" />
            )}
            <span>{toast.message}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
