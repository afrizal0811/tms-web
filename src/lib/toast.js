import { useRef } from 'react';
import toast from 'react-hot-toast';

const DURATIONS = {
  success: 3000,
  info: 4000,
  warning: 5000,
  error: 7000,
};

const TYPE_STYLES = {
  success: { bar: '#16a34a', button: '#fff' },
  error: { bar: '#991b1b', button: '#fff' },
  warning: { bar: '#b45309', button: '#fff' },
  info: { bar: '#1d4ed8', button: '#fff' },
};

const ToastContent = ({ message, toastId, type }) => {
  const duration = DURATIONS[type];
  const styles = TYPE_STYLES[type];
  const barRef = useRef(null);

  const handleMouseEnter = () => {
    if (barRef.current) barRef.current.style.animationPlayState = 'paused';
  };

  const handleMouseLeave = () => {
    if (barRef.current) barRef.current.style.animationPlayState = 'running';
  };

  return (
    <div
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{
        position: 'relative',
        overflow: 'hidden',
        margin: '-4px -10px -4px -10px',
        padding: '4px 10px',
      }}
    >
      <style>{`
        @keyframes toast-progress {
          from { width: 100%; }
          to   { width: 0%; }
        }
        .toast-close-btn {
          background: rgba(255,255,255,0.25);
          border: 1px solid rgba(255,255,255,0.5);
          border-radius: 2px;
          cursor: pointer;
          font-size: 10.8px;
          font-weight: bold;
          line-height: 1;
          color: ${styles.button};
          flex-shrink: 0;
          transition: background 0.15s;
          padding: 3px 3px;
        }
        .toast-close-btn:hover {
          background: rgba(255,255,255,0.4);
        }
      `}</style>

      {/* Message + Close Button */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{ flex: 1 }}>{message}</span>
      </div>

      {/* Progress Bar */}
      <div style={{ paddingTop: '6px' }}>
        <div
          ref={barRef}
          style={{
            height: '3px',
            width: '100%',
            background: styles.bar,
            animation: `toast-progress ${duration}ms linear forwards`,
          }}
        />
      </div>
    </div>
  );
};

export const toastSuccess = (message) => {
  toast.success((t) => <ToastContent message={message} toastId={t.id} type="success" />, {
    className: 'my-toast-success',
    duration: DURATIONS.success,
  });
};

export const toastError = (message) => {
  toast.error((t) => <ToastContent message={message} toastId={t.id} type="error" />, {
    className: 'my-toast-error',
    duration: DURATIONS.error,
  });
};

export const toastWarning = (message) => {
  toast((t) => <ToastContent message={message} toastId={t.id} type="warning" />, {
    icon: '⚠️',
    className: 'my-toast-warning',
    duration: DURATIONS.warning,
  });
};

export const toastInfo = (message) => {
  toast((t) => <ToastContent message={message} toastId={t.id} type="info" />, {
    icon: 'ℹ️',
    className: 'my-toast-info',
    duration: DURATIONS.info,
  });
};
