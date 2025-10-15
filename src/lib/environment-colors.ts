import { cn } from "@/lib/utils";

const environmentColors = [
  {
    bg: "bg-emerald-100",
    text: "text-emerald-800",
    border: "border-emerald-200",
  },
  { bg: "bg-blue-100", text: "text-blue-800", border: "border-blue-200" },
  { bg: "bg-purple-100", text: "text-purple-800", border: "border-purple-200" },
  { bg: "bg-orange-100", text: "text-orange-800", border: "border-orange-200" },
  { bg: "bg-pink-100", text: "text-pink-800", border: "border-pink-200" },
  { bg: "bg-yellow-100", text: "text-yellow-800", border: "border-yellow-200" },
  { bg: "bg-red-100", text: "text-red-800", border: "border-red-200" },
  { bg: "bg-indigo-100", text: "text-indigo-800", border: "border-indigo-200" },
];

const darkEnvironmentColors = [
  {
    bg: "dark:bg-emerald-900/20",
    text: "dark:text-emerald-300",
    border: "dark:border-emerald-800",
  },
  {
    bg: "dark:bg-blue-900/20",
    text: "dark:text-blue-300",
    border: "dark:border-blue-800",
  },
  {
    bg: "dark:bg-purple-900/20",
    text: "dark:text-purple-300",
    border: "dark:border-purple-800",
  },
  {
    bg: "dark:bg-orange-900/20",
    text: "dark:text-orange-300",
    border: "dark:border-orange-800",
  },
  {
    bg: "dark:bg-pink-900/20",
    text: "dark:text-pink-300",
    border: "dark:border-pink-800",
  },
  {
    bg: "dark:bg-yellow-900/20",
    text: "dark:text-yellow-300",
    border: "dark:border-yellow-800",
  },
  {
    bg: "dark:bg-red-900/20",
    text: "dark:text-red-300",
    border: "dark:border-red-800",
  },
  {
    bg: "dark:bg-indigo-900/20",
    text: "dark:text-indigo-300",
    border: "dark:border-indigo-800",
  },
];

export function getEnvironmentColor(index: number) {
  const colorIndex = index % environmentColors.length;
  const lightColors = environmentColors[colorIndex];
  const darkColors = darkEnvironmentColors[colorIndex];

  return {
    bg: cn(lightColors.bg, darkColors.bg),
    text: cn(lightColors.text, darkColors.text),
    border: cn(lightColors.border, darkColors.border),
  };
}
