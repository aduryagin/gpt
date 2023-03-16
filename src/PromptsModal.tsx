import { useState } from 'react';
import { prompts } from './prompts';

export const modalId = 'prompts-modal';

interface Props {
  setMessage: (message: string) => void;
}

export default function PromptsModal({ setMessage }: Props) {
  const [tab, setTab] = useState<string>(prompts[0].topic);

  return (
    <>
      <input type="checkbox" id={modalId} className="modal-toggle" />
      <label htmlFor={modalId} className="modal">
        {/* eslint-disable-next-line jsx-a11y/label-has-associated-control */}
        <label className="modal-box w-11/12 max-w-5xl" htmlFor="">
          <label htmlFor={modalId} className="btn btn-sm btn-circle absolute right-2 top-2">
            ✕
          </label>
          <div>
            <div className="grid grid-cols-8 gap-4">
              <div className="col-span-2">
                <ul className="menu bg-base-100 sticky top-0">
                  <li className="menu-title">
                    <span>English</span>
                  </li>
                  {prompts.map((group) => (
                    <li key={group.topic}>
                      <button
                        className={`text-left ${tab === group.topic ? 'active' : ''}`}
                        onClick={() => setTab(group.topic)}
                      >
                        {group.topic}
                      </button>
                    </li>
                  ))}

                  {/* <li className="menu-title">
                    <span>Other</span>
                  </li>
                  <li>
                    <a>Other</a>
                  </li> */}
                </ul>
              </div>
              <div className="col-span-6">
                {prompts
                  .find((item) => item.topic === tab)
                  ?.list.map((prompt: any) => {
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
          </div>
        </label>
      </label>
    </>
  );
}
