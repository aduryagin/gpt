import { memo, useEffect } from 'react';

const Notification = memo(function Notification({
  message,
  setNotificationMessage,
}: {
  message: string;
  setNotificationMessage: (value: string) => void;
}) {
  useEffect(() => {
    if (message) {
      setTimeout(() => {
        setNotificationMessage('');
      }, 5000);
    } else {
      setNotificationMessage('');
    }
  }, [message, setNotificationMessage]);

  if (!message) return null;

  return (
    <div className="toast toast-end">
      <div className="alert alert-error">
        <div>
          <span>{message}</span>
        </div>
      </div>
    </div>
  );
});

export default Notification;
