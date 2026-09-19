type AuthButtonProps = {
  type?: "submit" | "button";
  disabled?: boolean;
  isLoading?: boolean;
  loadingText?: string;
  children: React.ReactNode;
  onClick?: () => void;
};

export function AuthButton({
  type = "submit",
  disabled = false,
  isLoading = false,
  loadingText = "Loading...",
  children,
  onClick,
}: AuthButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || isLoading}
      onClick={onClick}
      className="w-full rounded-md bg-yellow-400 px-4 py-2.5 text-sm font-semibold text-gray-900 hover:bg-yellow-500 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
    >
      {isLoading ? loadingText : children}
    </button>
  );
}
