import { Eraser } from 'lucide-react';
import { Message } from './App';

export default function StartNewConversation({ setMessages }: { setMessages: (messages: Message[]) => void }) {
  return (
    <div className="tooltip" data-tip="Start a new conversation">
      <button
        onClick={() => {
          setMessages([]);
        }}
        className="btn btn-square btn-outline"
      >
        <Eraser />
      </button>
    </div>
  );
}
