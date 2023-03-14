import { useState } from 'react';
import { prompts } from './prompts';

export const modalId = 'prompts-modal';

interface Props {
  setMessage: (message: string) => void;
}

enum Tab {
  English = 'English',
  Custom = 'Custom',
}

export default function PromptsModal({ setMessage }: Props) {
  const [tab, setTab] = useState<Tab>(Tab.English);

  return (
    <>
      <input type="checkbox" id={modalId} className="modal-toggle" />
      <label htmlFor={modalId} className="modal">
        {/* eslint-disable-next-line jsx-a11y/label-has-associated-control */}
        <label className="modal-box w-11/12 max-w-5xl" htmlFor="">
          <label htmlFor={modalId} className="btn btn-sm btn-circle absolute right-2 top-2">
            ✕
          </label>
          <h3 className="font-bold text-lg">Prompts</h3>
          <div className="py-4">
            <div className="tabs mb-4">
              {Object.values(Tab).map((tabName) => (
                <a
                  key={tabName}
                  className={`tab tab-lg tab-lifted ${tab === tabName ? 'tab-active' : ''}`}
                  href="/"
                  onClick={(e) => {
                    e.preventDefault();
                    setTab(tabName as Tab);
                  }}
                >
                  {tabName}
                </a>
              ))}
            </div>

            {tab === Tab.English &&
              prompts.map((group) => (
                <div
                  key={group.topic}
                  // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex
                  tabIndex={0}
                  className="collapse collapse-arrow border border-base-300 bg-base-100 rounded-box mb-3"
                >
                  <input type="checkbox" defaultChecked />
                  <div className="collapse-title text-xl font-medium">{group.topic}</div>
                  <div className="collapse-content">
                    {group.list.map((prompt) => {
                      const title = typeof prompt === 'string' ? '' : prompt.title;
                      const text = typeof prompt === 'string' ? prompt : prompt.text;
                      return (
                        // eslint-disable-next-line react/jsx-key
                        <label key={text} htmlFor={modalId}>
                          {title && <b>{title}</b>}
                          {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions */}
                          <div
                            className="textarea textarea-bordered mb-2 hover:bg-slate-100"
                            style={{ cursor: 'pointer' }}
                            onClick={() => setMessage(text)}
                          >
                            {text}
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>
              ))}

            {tab === Tab.Custom && <div className="text-center">todo</div>}
          </div>
        </label>
      </label>
    </>
  );
}
