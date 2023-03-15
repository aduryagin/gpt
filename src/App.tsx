import { useCallback, useEffect, useState } from 'react';
import './App.css';
import { ChatCompletionRequestMessageRoleEnum } from 'openai';
import PromptsModal, { modalId } from './PromptsModal';
import Transcription from './Transcription';
import { kMaxAudio_s, scrollToTheBottom, stopRecording } from './helpers';
import ApiKeyModal from './ApiKeyModal';
import { LucideSettings } from 'lucide-react';
import Notification from './Notification';
import StartNewConversation from './StartNewConversation';
import { useSettings } from './hooks';

export type WhisperModel = { size: number; name: string; description: string };
export type Message = { role: ChatCompletionRequestMessageRoleEnum; date: Date; content: string };

const model = 'gpt-3.5-turbo';
const whisperModels: WhisperModel[] = [
  {
    name: 'openai whisper api',
    description: 'OpenAI Whisper API',
    size: 0,
  },
  // {
  //   name: './ggml-model-whisper-base.bin',
  //   size: 148,
  //   description: 'Base (offline, slower, more accurate)',
  // },
  // {
  //   name: './ggml-model-whisper-tiny.bin',
  //   description: 'Tiny (offline, faster, less accurate)',
  //   size: 78,
  // },
];
let recordingInterval = 0;
let readableStream: ReadableStreamDefaultReader<string> | undefined;

/*
  todo:
    - button to resend messages if something went wrong
    - system message setting
    - history
    - save custom prompts to local storage / indexed db
*/

function App() {
  const settings = useSettings();
  const [apiKey, setApiKey] = useState(localStorage.getItem('apiKey') || '');
  const [apiKeyModalVisible, setApiKeyModalVisible] = useState(!apiKey);
  const saveApiKey = useCallback((value: string) => {
    setApiKey(value);
    localStorage.setItem('apiKey', value);
    setApiKeyModalVisible(false);
  }, []);

  const [notificationMessage, setNotificaitonMessage] = useState('');
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
  const [whisperModel, setWhisperModel] = useState<WhisperModel>(
    whisperModels.find((model) => model.name === localStorage.getItem('whisperModel')) || whisperModels[0],
  );

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

  const speakLatestMessage = useCallback(() => {
    const lastBubble = Array.from(document.querySelectorAll('.chat-bubble')).pop();
    const latestMessage = lastBubble?.querySelector('span')?.textContent?.trim();
    const latestMessageTime = Number(lastBubble?.getAttribute('data-date'));
    // const latestMessage = messages[messages.length - 1];
    console.log(latestMessage);

    speak({
      role: ChatCompletionRequestMessageRoleEnum.Assistant,
      content: latestMessage || '',
      date: new Date(latestMessageTime),
    });
  }, [speak]);

  const sendMessage = useCallback(
    async (message: string) => {
      if (!message) return;
      setMessage('');

      const newMessages: Message[] = [
        ...messages,
        {
          role: ChatCompletionRequestMessageRoleEnum.User,
          date: new Date(),
          content: message,
        },
      ];
      setMessages(newMessages);
      setIsAnswering(true);
      setTimeout(() => {
        scrollToTheBottom();
      });

      try {
        const responseStream = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messages: [
              ...messages.map((message) => ({
                role: message.role,
                content: message.content,
              })),
              // todo: check if this is correct
              // .slice(-4 * 2), // keep last 4 messages from each side
              {
                content: message,
                role: ChatCompletionRequestMessageRoleEnum.User,
              },
            ],
            model,
            // max_tokens: 100,
            stream: true,
          }),
        }).catch((error: Error) => {
          setNotificaitonMessage(error.message);
        });

        // handle error message for the request
        if (!responseStream?.ok) {
          const error = await responseStream?.json();
          setNotificaitonMessage(error?.error.message);
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
            speakLatestMessage();
            setIsAnswering(false);
            break;
          }

          const messageParts = [...string.matchAll(/delta":\{"content":"(.*)"\},"index/g)];
          messageParts.forEach((part) => {
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
        setNotificaitonMessage(error.message);
        console.log(error);
      }
    },
    [apiKey, messages, speakLatestMessage],
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
          sendMessage(newMessage);
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
      <div className="container mx-auto">
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
                {message.role === ChatCompletionRequestMessageRoleEnum.Assistant ? model : 'You'}
                {/* <time className="text-xs opacity-50">{message.date.toLocaleTimeString()}</time> */}
              </div>
              <div className="chat-bubble" data-date={message.date.getTime()}>
                <span dangerouslySetInnerHTML={{ __html: message.content }} />
                <button
                  className={`btn-info btn btn-xs ml-2`}
                  style={{ lineHeight: 0 }}
                  onClick={() => {
                    if (speaking?.date.getTime() === message.date.getTime()) {
                      speechSynthesis.cancel();
                      setSpeaking(null);
                      return;
                    }

                    speak(message);
                  }}
                >
                  {speaking?.date.getTime() === message.date.getTime() ? 'speaking...' : 'speak'}
                </button>
              </div>
              {index === messages.length - 1 && isAnswering && (
                <div className="chat-footer opacity-50">Answering...</div>
              )}
            </div>
          ))}
        </div>
        <div className="flex gap-5 mb-5 mt-5 items-center">
          <div className="w-1/3">
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
          <div className="w-1/3">
            <label htmlFor="whisper-model" className="label">
              <span className="label-text">Transcription model</span>
            </label>
            <select
              className="select select-bordered w-full"
              value={whisperModel.name}
              onChange={(e) => {
                setWhisperModel(whisperModels.find((item) => item.name === e.target.value) || whisperModels[0]);
                localStorage.setItem('whisperModel', e.target.value);
              }}
              id="whisper-model"
            >
              {whisperModels.map((model) => (
                <option value={model.name} key={model.name}>
                  {model.description}
                </option>
              ))}
            </select>
          </div>
          <div className="w-1/3">
            <label htmlFor="rate" className="label">
              <span className="label-text">Speech rate</span>
            </label>
            <div style={{ height: 48 }} className="flex items-start">
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
          <div className="flex gap-2 w-full mb-2">
            <Transcription
              setNotificaitonMessage={setNotificaitonMessage}
              whisperModel={whisperModel}
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
            <button
              disabled={recording || transcribing}
              className={`btn w-full shrink ${isAnswering ? 'btn-warning' : ''}`}
              onClick={() => {
                if (isAnswering) {
                  readableStream?.cancel();
                  setIsAnswering(false);
                  return;
                }
                sendMessage(message);
              }}
            >
              {(() => {
                if (isAnswering) return 'Stop answering';
                if (recording) return `Recording ${recordingTime}s`;
                return transcribing ? 'Transcribing...' : 'Send';
              })()}
            </button>
            <div className="tooltip" data-tip="Settings">
              <button onClick={() => setApiKeyModalVisible(true)} className="btn btn-square btn-outline">
                <LucideSettings />
              </button>
            </div>
          </div>
        </div>
      </div>
      <PromptsModal setMessage={setMessage} />
      <ApiKeyModal
        setVisible={(visible: boolean) => setApiKeyModalVisible(visible)}
        visible={apiKeyModalVisible}
        apiKey={apiKey}
        saveApiKey={saveApiKey}
      />
      <Notification message={notificationMessage} setNotificationMessage={setNotificaitonMessage} />
    </div>
  );
}

export default App;
