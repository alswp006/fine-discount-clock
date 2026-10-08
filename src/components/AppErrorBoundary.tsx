import { Component } from "react";
import type { ReactNode } from "react";
import StatusState from "@/components/StatusState";

interface State {
  hasError: boolean;
}

/**
 * 렌더 중 던져진 오류를 잡아 흰 화면 대신 안내를 보인다.
 * '다시 시도'는 앱을 통째로 다시 불러온다(window.location.reload).
 */
export default class AppErrorBoundary extends Component<{ children?: ReactNode }, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  private handleRetry = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <StatusState variant="renderError" actionLabel="다시 시도" onAction={this.handleRetry} />
      );
    }
    return this.props.children;
  }
}
