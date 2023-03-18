import { useLiveQuery } from 'dexie-react-hooks';
import { useCallback, useState } from 'react';
import { db } from './db';
import { prompts } from './prompts';

export const modalId = 'prompts-modal';

interface Props {
  setMessage: (message: string) => void;
}

export default function PromptsModal({ setMessage }: Props) {
  const [tab, setTab] = useState<string | number>(prompts[0].topic);
  const [title, setTitle] = useState<string>('');
  const [text, setText] = useState<string>('');
  const promptsDB = useLiveQuery(() => db.prompts.toArray());

  const addPrompt = useCallback(async () => {
    if (!title || !text) {
      return;
    }
    const result = await db.prompts.add({
      title,
      text,
    });
    setTitle('');
    setText('');
    setTab(result as number);
  }, [text, title]);

  return (
    <>
      <input type="checkbox" id={modalId} className="modal-toggle" />
      <label htmlFor={modalId} className="modal">
        {/* eslint-disable-next-line jsx-a11y/label-has-associated-control */}
        <label className="modal-box w-11/12 max-w-5xl" htmlFor="">
          <label htmlFor={modalId} style={{ left: '100%' }} className="btn btn-sm btn-circle right-0 top-0 sticky">
            ✕
          </label>
          <div>
            <select
              value={tab}
              onChange={(e) => {
                setTitle('');
                setText('');
                setTab(e.target.value);
              }}
              className="sm:hidden select select-bordered w-full mb-3"
            >
              <option value={'new-prompt'}>Add new prompt</option>
              {promptsDB?.map((prompt) => (
                <option key={prompt.id} value={prompt.id}>
                  {prompt.title}
                </option>
              ))}
              {prompts.map((group) => (
                <option key={group.topic} value={group.topic}>
                  {group.topic}
                </option>
              ))}
            </select>
            <div className="grid grid-cols-8 gap-4">
              <div className="col-span-2 hidden sm:block">
                <ul className="menu bg-base-100 sticky top-0">
                  <li className="menu-title">
                    <span>Custom</span>
                  </li>
                  <li>
                    <button
                      className={`text-left ${tab === 'new-prompt' ? 'active' : ''}`}
                      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                      onClick={() => setTab('new-prompt')}
                    >
                      Add new prompt
                    </button>
                  </li>
                  {promptsDB?.map((prompt) => (
                    <li key={prompt.id}>
                      <button
                        className={`text-left ${tab === prompt.id ? 'active' : ''}`}
                        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                        onClick={() => setTab(prompt.id!)}
                      >
                        {prompt.title}
                      </button>
                    </li>
                  ))}
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
                </ul>
              </div>
              <div className="col-span-8 sm:col-span-6">
                {(() => {
                  const promptDB = promptsDB?.find((item) => item.id === Number(tab));

                  if (tab === 'new-prompt' || promptDB) {
                    return (
                      <>
                        <input
                          onChange={(e) => {
                            setTitle(e.target.value);

                            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                            if (promptDB) db.prompts.update(promptDB.id!, { title: e.target.value });
                          }}
                          value={promptDB?.title || title}
                          className="input input-bordered w-full mb-2"
                          placeholder="Title..."
                        />
                        <textarea
                          onChange={(e) => {
                            setText(e.target.value);

                            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                            if (promptDB) db.prompts.update(promptDB.id!, { text: e.target.value });
                          }}
                          value={promptDB?.text || text}
                          className="textarea textarea-bordered w-full"
                          placeholder="Prompt..."
                        />
                        <button
                          className={`btn w-full ${promptDB ? 'mb-2' : ''}`}
                          onClick={() => {
                            if (promptDB) {
                              // @ts-ignore
                              // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                              document.querySelector(`#${modalId}`)!.checked = false;
                              setMessage(promptDB.text);
                              return;
                            }

                            addPrompt();
                          }}
                        >
                          {promptDB ? 'Use' : 'Add'}
                        </button>
                        {promptDB && (
                          <button
                            className="btn btn-error w-full"
                            onClick={() => {
                              setTab('new-prompt');
                              // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                              db.prompts.delete(promptDB.id!);
                            }}
                          >
                            Delete
                          </button>
                        )}
                      </>
                    );
                  }

                  return (
                    prompts
                      .find((item) => item.topic === tab)
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
                      })
                  );
                })()}
              </div>
            </div>
          </div>
        </label>
      </label>
    </>
  );
}
