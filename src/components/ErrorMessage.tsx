'use client';

import { AlertCircle, RefreshCw, WifiOff, ServerCrash, Lock } from 'lucide-react';

interface ErrorMessageProps {
  type?: 'network' | 'server' | 'auth' | 'generic';
  title?: string;
  message?: string;
  onRetry?: () => void;
  fullPage?: boolean;
}

const errorConfigs = {
  network: {
    icon: WifiOff,
    title: 'Mất kết nối',
    message: 'Không thể kết nối đến máy chủ. Vui lòng kiểm tra kết nối mạng và thử lại.',
    color: 'text-orange-600',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-200',
  },
  server: {
    icon: ServerCrash,
    title: 'Lỗi máy chủ',
    message: 'Máy chủ đang gặp sự cố. Vui lòng thử lại sau vài phút.',
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
  },
  auth: {
    icon: Lock,
    title: 'Phiên đăng nhập hết hạn',
    message: 'Vui lòng đăng nhập lại để tiếp tục.',
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200',
  },
  generic: {
    icon: AlertCircle,
    title: 'Đã xảy ra lỗi',
    message: 'Có lỗi không mong muốn xảy ra. Vui lòng thử lại.',
    color: 'text-slate-600',
    bgColor: 'bg-slate-50',
    borderColor: 'border-slate-200',
  },
};

export function ErrorMessage({
  type = 'generic',
  title,
  message,
  onRetry,
  fullPage = false,
}: ErrorMessageProps) {
  const config = errorConfigs[type];
  const Icon = config.icon;

  const content = (
    <div className={`${config.bgColor} ${config.borderColor} border rounded-xl p-6`}>
      <div className="flex items-start gap-4">
        <div className={`p-3 rounded-lg bg-white shadow-sm`}>
          <Icon className={`w-6 h-6 ${config.color}`} />
        </div>
        <div className="flex-1">
          <h3 className={`font-semibold ${config.color} mb-1`}>
            {title || config.title}
          </h3>
          <p className="text-slate-600 text-sm leading-relaxed">
            {message || config.message}
          </p>
          {onRetry && (
            <button
              onClick={onRetry}
              className={`mt-4 flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm
                transition-all duration-200 hover:shadow-md
                ${type === 'network' ? 'bg-orange-600 text-white hover:bg-orange-700' : ''}
                ${type === 'server' ? 'bg-red-600 text-white hover:bg-red-700' : ''}
                ${type === 'auth' ? 'bg-purple-600 text-white hover:bg-purple-700' : ''}
                ${type === 'generic' ? 'bg-slate-600 text-white hover:bg-slate-700' : ''}
              `}
            >
              <RefreshCw className="w-4 h-4" />
              <span>Thử lại</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );

  if (fullPage) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50 to-purple-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          {content}
        </div>
      </div>
    );
  }

  return content;
}

export default ErrorMessage;
