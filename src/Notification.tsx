import { memo } from 'react';

const Notification = memo(function Notification({
  message,
  setNotificationMessage,
}: {
  message: string;
  setNotificationMessage: (value: string) => void;
}) {
  if (!message) return null;

  return (
    <div className="toast toast-end">
      <div className="alert alert-error">
        <div>
          <button className="btn btn-sm btn-circle absolute right-2 top-2" onClick={() => setNotificationMessage('')}>
            ✕
          </button>
          <span>{message}</span>
        </div>
      </div>
    </div>
  );
});

export default Notification;
