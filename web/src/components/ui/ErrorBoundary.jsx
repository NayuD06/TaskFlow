import { Component } from 'react';
import { RotateCcw, TriangleAlert } from 'lucide-react';
import { reportError } from '../../lib/monitoring.js';
import { tr } from '../../lib/i18n.js';

/** Bắt lỗi giao diện để cả app không bị trắng trang, và gửi lỗi lên Sentry nếu đã bật. */
export default class ErrorBoundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    reportError(error, { componentStack: info?.componentStack });
  }

  render() {
    if (!this.state.error) return this.props.children;
    // Bản build mới vừa deploy làm file JS cũ không còn: tải lại trang là xong
    const stale = /dynamically imported module|Importing a module script failed|ChunkLoadError/i.test(String(this.state.error?.message));
    return (
      <div className="grid min-h-dvh place-items-center bg-canvas px-6" role="alert">
        <div className="max-w-md rounded-[22px] border border-line bg-surface p-6 text-center sm:p-8">
          <div className="tone-danger mx-auto grid size-12 place-items-center rounded-2xl">
            <TriangleAlert className="size-6" aria-hidden="true" />
          </div>
          <h1 className="mt-4 font-display text-lg font-bold">{stale ? tr('TaskFlow vừa được cập nhật') : tr('Có lỗi xảy ra')}</h1>
          <p className="mt-2 text-[13px] leading-relaxed text-muted">
            {stale
              ? tr('Tải lại trang để dùng phiên bản mới nhất nhé.')
              : tr('Giao diện gặp lỗi ngoài ý muốn. Dữ liệu của bạn vẫn an toàn trên máy chủ, hãy tải lại trang.')}
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-5 inline-flex h-10 items-center gap-2 rounded-xl bg-accent px-4 text-[13px] font-semibold text-white hover:brightness-110"
          >
            <RotateCcw className="size-4" aria-hidden="true" /> {tr('Tải lại trang')}
          </button>
        </div>
      </div>
    );
  }
}
