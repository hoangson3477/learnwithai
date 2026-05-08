'use client';

export function TypingIndicator() {
  return (
    <div className="flex items-center gap-1 px-4 py-2 bg-white shadow-sm border border-slate-200 rounded-2xl">
      <span className="text-sm text-slate-500">AI đang nhập</span>
      <div className="flex gap-0.5">
        <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
        <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
        <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
      </div>
    </div>
  );
}

export default TypingIndicator;
