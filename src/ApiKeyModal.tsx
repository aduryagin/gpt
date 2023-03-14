import { useEffect, useState } from 'react';

export const modalId = 'api-key-modal';

export default function ApiKeyModal({
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
          <h3 className="font-bold text-lg">OpenAI API Key</h3>
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
