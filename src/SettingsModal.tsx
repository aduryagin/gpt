import { useEffect, useState } from 'react';
import { useSettings, WhisperModel } from './hooks';

export const modalId = 'api-key-modal';
export const whisperModels: WhisperModel[] = [
  {
    name: 'openai whisper api',
    description: 'OpenAI Whisper API',
    size: 0,
  },
  // {
  //   name: 'https://whisper.ggerganov.com/ggml-model-whisper-base.bin',
  //   size: 148,
  //   description: 'Base (offline, slower, more accurate)',
  // },
  // {
  //   name: 'https://whisper.ggerganov.com/ggml-model-whisper-tiny.bin',
  //   description: 'Tiny (offline, faster, less accurate)',
  //   size: 78,
  // },
];

export default function SettingsModal({
  visible,
  saveApiKey,
  apiKey,
  setVisible,
}: {
  setVisible: (visible: boolean) => void;
  saveApiKey: (value: string) => void;
  visible: boolean;
  apiKey: string;
}) {
  const settings = useSettings();

  const [key, setKey] = useState(apiKey);
  useEffect(() => {
    setKey(apiKey);
  }, [apiKey]);

  return (
    <>
      <input
        type="checkbox"
        id={modalId}
        checked={visible}
        onChange={() => {
          /*empty*/
        }}
        className="modal-toggle"
      />
      {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions */}
      <div
        onClick={(e) => {
          // @ts-ignore
          if (e.target.classList.contains('modal') && apiKey && key) {
            setKey(apiKey);
            setVisible(false);
          }
        }}
        className="modal"
      >
        {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions */}
        <div className="modal-box">
          <h3 className="font-bold text-lg">Settings</h3>
          <div className="py-4">
            <div className="form-control w-full ">
              <input
                value={key}
                type="text"
                onChange={(e) => setKey(e.target.value)}
                placeholder="sk-..."
                className="input input-bordered w-full"
              />
              {/* eslint-disable-next-line jsx-a11y/label-has-associated-control */}
              <label className="label">
                <span className="label-text-alt">
                  <a href="https://platform.openai.com/account/api-keys" target="_blank" rel="noreferrer">
                    https://platform.openai.com/account/api-keys
                  </a>
                </span>
              </label>
            </div>
            <div className="form-control">
              <label htmlFor="whisper-model" className="label">
                <span className="label-text">Transcription model</span>
              </label>
              <select
                className="select select-bordered w-full"
                value={settings.whisperModel.name}
                onChange={(e) => {
                  settings.setWhisperModel(
                    whisperModels.find((item) => item.name === e.target.value) || whisperModels[0],
                  );
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
            <div className="form-control">
              <label className="label cursor-pointer">
                <span className="label-text">Send message right after transcribing is done</span>
                <input
                  type="checkbox"
                  checked={settings.isSendMessageRightAfterTranscribing}
                  onChange={(e) => settings.setSendMessageRightAfterTranscribing(Boolean(e.target.checked))}
                  className="toggle toggle-md"
                />
              </label>
            </div>
            <div className="form-control">
              <label className="label cursor-pointer">
                <span className="label-text">Speak bot messages automatically</span>
                <input
                  type="checkbox"
                  checked={settings.isAutomaticallyTextToSpeech}
                  onChange={(e) => settings.setAutomaticallyTextToSpeech(Boolean(e.target.checked))}
                  className="toggle toggle-md"
                />
              </label>
            </div>
            <button
              className="btn w-full mt-3"
              disabled={!key}
              onClick={() => {
                document.querySelector(`#${modalId}`)?.toggleAttribute('checked');
                saveApiKey(key);
              }}
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
