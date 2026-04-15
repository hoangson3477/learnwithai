export function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center py-12">
      <div className="flex flex-col items-center space-y-4">
        <div className="relative w-12 h-12">
          <div className="absolute inset-0 rounded-full border-4 border-gray-200"></div>
          <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-green-500 border-r-green-500 animate-spin"></div>
        </div>
        <p className="text-gray-600 font-medium">Đang tải...</p>
      </div>
    </div>
  );
}

export function EmptyState({ 
  title = 'Không có dữ liệu',
  message = 'Hãy thêm một số nội dung để bắt đầu',
  icon = '📭'
}: { 
  title?: string;
  message?: string;
  icon?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16">
      <div className="text-5xl mb-4">{icon}</div>
      <h3 className="text-xl font-semibold text-gray-800 mb-2">{title}</h3>
      <p className="text-gray-600 text-center max-w-sm">{message}</p>
    </div>
  );
}

export function ErrorMessage({
  message = 'Đã xảy ra lỗi. Vui lòng thử lại.',
  onRetry,
}: {
  message?: string;
  onRetry?: () => void;
}) {
  return (
    <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <span className="text-2xl">⚠️</span>
          <p className="text-red-800">{message}</p>
        </div>
        {onRetry && (
          <button
            onClick={onRetry}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-medium"
          >
            Thử lại
          </button>
        )}
      </div>
    </div>
  );
}
