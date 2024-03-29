import { useCallback, useEffect, useState } from 'react';
import './App.css';
import { ChatCompletionRequestMessageRoleEnum } from 'openai';
import PromptsModal, { modalId } from './PromptsModal';
import Transcription from './Transcription';
import { kMaxAudio_s, scrollToTheBottom, stopRecording } from './helpers';
import SettingsModal from './SettingsModal';
import { Bot, LucideSettings } from 'lucide-react';
import Notification from './Notification';
import StartNewConversation from './StartNewConversation';
import { useSettings } from './hooks';
import { useHotkeys } from 'react-hotkeys-hook';

export type Message = { role: ChatCompletionRequestMessageRoleEnum; date: Date; content: string };

const model = 'gpt-3.5-turbo';

let recordingInterval = 0;
let readableStream: ReadableStreamDefaultReader<string> | undefined;

/*
  todo:
    - history
    - markdown: textareas, messages
*/

function App() {
  const settings = useSettings();
  const [apiKey, setApiKey] = useState(localStorage.getItem('apiKey') || '');
  const [settingsModalVisible, setSettingsModalVisible] = useState(!apiKey);
  const saveApiKey = useCallback((value: string) => {
    setApiKey(value);
    localStorage.setItem('apiKey', value);
    setSettingsModalVisible(false);
  }, []);

  const [notificationMessage, setNotificationMessage] = useState('');
  const [isRetry, setIsRetry] = useState(false);
  const [isAnswering, setIsAnswering] = useState(false);
  const [rate, setRate] = useState(Number(localStorage.getItem('rate')) || 1);
  const [voice, setVoice] = useState(localStorage.getItem('voice') || 'Albert');
  const [voices, setVoices] = useState<string[]>([]);
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [speaking, setSpeaking] = useState<Message | null>();
  const [recording, setRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(kMaxAudio_s);
  const [transcribing, setTranscribing] = useState(false);

  // catch notifications
  useEffect(() => {
    if (notificationMessage.includes('model is currently overloaded')) {
      setIsRetry(true);
    }
  }, [notificationMessage]);

  // load voices
  useEffect(() => {
    function loadVoices() {
      // Fetch the available voices.
      const newVoices = speechSynthesis.getVoices();
      setVoices(newVoices.map((item) => item.name));
    }

    loadVoices();
    window.speechSynthesis.onvoiceschanged = function () {
      loadVoices();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const speak = useCallback(
    (message?: Message) => {
      if (!message) return;

      speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(message.content);
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      utterance.voice = speechSynthesis.getVoices().find((v) => v.name === voice)!;
      utterance.rate = rate;
      utterance.onend = () => {
        if (!speechSynthesis.pending) setSpeaking(null);
      };
      speechSynthesis.speak(utterance);
      setSpeaking(message);
    },
    [rate, voice],
  );

  const speakLatestMessage = useCallback(
    (bubble?: Element) => {
      const lastBubble = bubble || Array.from(document.querySelectorAll('.chat-bubble')).pop();
      const latestMessage = lastBubble?.querySelector('span')?.textContent?.trim();
      const latestMessageTime = Number(lastBubble?.getAttribute('data-date'));
      // const latestMessage = messages[messages.length - 1];
      console.log(latestMessage);

      speak({
        role: ChatCompletionRequestMessageRoleEnum.Assistant,
        content: latestMessage || '',
        date: new Date(latestMessageTime),
      });
    },
    [speak],
  );

  const sendMessages = useCallback(
    async (messages: { content: string; role: ChatCompletionRequestMessageRoleEnum }[]) => {
      setIsAnswering(true);

      try {
        const responseStream = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messages,
            model,
            // max_tokens: 100,
            stream: true,
          }),
        }).catch((error: Error) => {
          setNotificationMessage(error.message);
        });

        // handle error message for the request
        if (!responseStream?.ok) {
          const error = await responseStream?.json();
          setNotificationMessage(error?.error.message);
          setIsAnswering(false);
          return;
        }

        // @ts-ignore
        readableStream = responseStream.body?.pipeThrough(new TextDecoderStream()).getReader();
        // eslint-disable-next-line no-constant-condition
        while (true) {
          const res = await readableStream?.read();
          if (res?.done) break;
          const string = res?.value.substring(6) as string;

          if (string?.includes('[DONE]')) {
            if (settings.isAutomaticallyTextToSpeech) speakLatestMessage();
            setIsAnswering(false);
            break;
          }

          const messageParts = [...string.matchAll(/delta":\{"content":"(.*)"\},"finish_reason/g)];
          console.log(string, messageParts);

          messageParts.forEach((part) => {
            // todo: markdown parser
            const messagePart = part[1].replaceAll('\\n', '<br/>').replace('\\"', '"');
            console.log(string, messagePart);

            if (messagePart) {
              setMessages((messages) => {
                const lastMessage = messages[messages.length - 1];

                if (lastMessage.role === ChatCompletionRequestMessageRoleEnum.Assistant) {
                  const finalMessage = (lastMessage.content + messagePart).replace(/^[<br/>]{0,}/, '');

                  // scroll to the bottom
                  scrollToTheBottom();

                  return [
                    ...messages.slice(0, -1),
                    {
                      ...lastMessage,
                      content: finalMessage,
                    },
                  ];
                }

                return [
                  ...messages,
                  {
                    role: ChatCompletionRequestMessageRoleEnum.Assistant,
                    date: new Date(),
                    content: messagePart,
                  },
                ];
              });
            }
          });
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (error: any) {
        setNotificationMessage(error.message);
        console.log(error);
      }
    },
    [apiKey, settings.isAutomaticallyTextToSpeech, speakLatestMessage],
  );

  const sendMessage = useCallback(
    async ({
      message,
      role = ChatCompletionRequestMessageRoleEnum.User,
    }: {
      message: string;
      role?: ChatCompletionRequestMessageRoleEnum;
    }) => {
      if (!message) return;
      setMessage('');

      const newMessages: Message[] = [
        ...messages,
        {
          role,
          date: new Date(),
          content: message,
        },
      ];
      setMessages(newMessages);
      setTimeout(() => {
        scrollToTheBottom();
      });

      sendMessages([
        ...messages.map((message) => ({
          role: message.role,
          content: message.content,
        })),
        // todo: check if this is correct
        // .slice(-4 * 2), // keep last 4 messages from each side
        {
          content: message,
          role,
        },
      ]);
    },
    [messages, sendMessages],
  );

  useHotkeys(
    'enter',
    () => {
      sendMessage({ message });
    },
    { enableOnFormTags: ['TEXTAREA'] },
  );

  // capture transcription
  useEffect(() => {
    // @ts-ignore
    window.transcriptionCallback = function (transcription: string) {
      if (transcription.includes('openaiapi:')) {
        const newMessage = message + transcription.replace('openaiapi:', '').trim();
        setMessage(newMessage);
        setTranscribing(false);
        setRecordingTime(kMaxAudio_s);

        if (settings.isSendMessageRightAfterTranscribing) {
          sendMessage({ message: newMessage });
        }

        return;
      }

      const result = /\[0.*-->.*0\]/.exec(transcription);
      if (result) {
        setMessage(message + transcription.replace(result[0], '').trim());
      }
    };

    // @ts-ignore
    window.transcriptionEndCallback = function (message: string) {
      const endOfTranscribing = message.includes('whisper_print_timings:') && message.includes('total time = ');

      if (endOfTranscribing) {
        setTranscribing(false);
        setRecordingTime(kMaxAudio_s);
      }
    };
  }, [message, sendMessage, settings.isSendMessageRightAfterTranscribing]);

  return (
    <div className="App">
      <div className="container mx-auto px-4">
        <div className="messages">
          {messages.map((message, index) => (
            <div
              className={`chat ${
                message.role === ChatCompletionRequestMessageRoleEnum.Assistant ? 'chat-start' : 'chat-end'
              } w-full`}
              key={message.content + message.date.getTime()}
            >
              {/* <div className="chat-image avatar">
                <div className="w-10 rounded-full">
                  <img src="/images/stock/photo-1534528741775-53994a69daeb.jpg" />
                </div>
            </div> */}
              <div className="chat-header">
                {message.role === ChatCompletionRequestMessageRoleEnum.Assistant
                  ? model
                  : `You ${message.role === ChatCompletionRequestMessageRoleEnum.System ? '(System message)' : ''}`}
                {/* <time className="text-xs opacity-50">{message.date.toLocaleTimeString()}</time> */}
              </div>
              <div
                className={`chat-bubble ${
                  message.role !== ChatCompletionRequestMessageRoleEnum.Assistant ? 'chat-bubble-info' : ''
                }`}
                data-date={message.date.getTime()}
              >
                <span dangerouslySetInnerHTML={{ __html: message.content }} />
                <button
                  className={` btn btn-xs ml-2 ${
                    message.role !== ChatCompletionRequestMessageRoleEnum.Assistant ? '' : 'btn-info'
                  }`}
                  style={{ lineHeight: 0 }}
                  onClick={(e) => {
                    if (speaking?.date.getTime() === message.date.getTime()) {
                      speechSynthesis.cancel();
                      setSpeaking(null);
                      return;
                    }

                    // @ts-ignore
                    speakLatestMessage(e.target.parentElement);
                  }}
                >
                  {speaking?.date.getTime() === message.date.getTime() ? 'speaking...' : 'speak'}
                </button>
              </div>
              {index === messages.length - 1 && isAnswering && (
                <div className="chat-footer opacity-50">Responding...</div>
              )}
            </div>
          ))}
        </div>
        <div className="sm:flex gap-5 mb-5 mt-5 items-center">
          <div className="sm:w-1/3">
            <label htmlFor="voices" className="label">
              <span className="label-text">Voice</span>
            </label>
            <select
              className="select select-bordered w-full"
              onChange={(e) => {
                setVoice(e.target.value);
                localStorage.setItem('voice', e.target.value);
              }}
              value={voice}
              id="voices"
            >
              {voices.map((v) => (
                <option value={v} key={v}>
                  {v}
                </option>
              ))}
            </select>
          </div>
          <div className="sm:w-1/3">
            <label htmlFor="rate" className="label">
              <span className="label-text">Speech rate ({rate})</span>
            </label>
            <div className="flex items-start sm:h-12">
              <input
                id="rate"
                type="range"
                value={rate}
                onChange={(e) => {
                  setRate(Number(e.target.value));
                  localStorage.setItem('rate', e.target.value);
                }}
                min="0.5"
                max="2"
                step="0.1"
                className="range w-full range-xs"
              />
            </div>
          </div>
        </div>
        <div>
          <div className="flex items-center">
            <label htmlFor="message" className="label">
              <span className="label-text">Message</span>
            </label>
            <label htmlFor={modalId} className="btn btn-xs ml-2" style={{ lineHeight: 0 }}>
              prompts
            </label>
          </div>

          <textarea
            disabled={recording}
            id="message"
            className="textarea textarea-bordered w-full"
            rows={5}
            onChange={(e) => setMessage(e.target.value)}
            value={message}
          />
          <div className="sm:flex gap-2 w-full mb-2">
            <button
              disabled={recording || transcribing}
              className={`btn w-full mb-2 shrink ${isAnswering || isRetry ? 'btn-warning' : ''}`}
              onClick={() => {
                if (isRetry) {
                  sendMessages(
                    messages.map((item) => ({
                      content: item.content,
                      role: item.role,
                    })),
                  );
                  setIsRetry(false);
                  return;
                }

                if (isAnswering) {
                  readableStream?.cancel();
                  setIsAnswering(false);
                  return;
                }

                sendMessage({ message });
              }}
            >
              {(() => {
                if (isRetry) return 'Retry';
                if (isAnswering) return 'Stop responding';
                if (recording) return `Recording ${recordingTime}s`;
                return transcribing ? 'Transcribing...' : 'Send';
              })()}
            </button>
            <div className="flex gap-2">
              <Transcription
                setNotificationMessage={setNotificationMessage}
                transcribing={transcribing}
                setTranscribing={setTranscribing}
                recording={recording}
                setRecording={(recording) => {
                  if (recording) {
                    recordingInterval = setInterval(() => {
                      setRecordingTime((time) => {
                        if (time === 1) {
                          clearInterval(recordingInterval);
                          stopRecording();
                          setRecording(false);

                          return kMaxAudio_s;
                        }

                        return time - 1;
                      });
                    }, 1000);
                  } else {
                    clearInterval(recordingInterval);
                  }

                  setRecording(recording);
                }}
              />
              <StartNewConversation setMessages={setMessages} />
              <div className="tooltip" data-tip="Settings">
                <button onClick={() => setSettingsModalVisible(true)} className="btn btn-square btn-outline">
                  <LucideSettings />
                </button>
              </div>
              <div className="tooltip" data-tip="Send system message">
                <button
                  disabled={recording || transcribing || isAnswering}
                  onClick={() => {
                    sendMessage({
                      message,
                      role: ChatCompletionRequestMessageRoleEnum.System,
                    });
                  }}
                  className="btn btn-square btn-outline"
                >
                  <Bot />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      <PromptsModal setMessage={setMessage} />
      <SettingsModal
        setVisible={(visible: boolean) => setSettingsModalVisible(visible)}
        visible={settingsModalVisible}
        apiKey={apiKey}
        saveApiKey={saveApiKey}
      />
      <Notification message={notificationMessage} setNotificationMessage={setNotificationMessage} />
    </div>
  );
}

export default App;
