import { createContext, useCallback, useContext, useState } from 'react';

const SettingsContext = createContext({
  isSendMessageRightAfterTranscribing: false,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  setSendMessageRightAfterTranscribing: (value: boolean) => {
    /*empty*/
  },
});

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const settings = useSettingsContext();

  return <SettingsContext.Provider value={settings}>{children}</SettingsContext.Provider>;
}

function useSettingsContext() {
  const [isSendMessageRightAfterTranscribing, setSendMessageRightAfterTranscribing] = useState(
    Boolean(localStorage.getItem('isSendMessageRightAfterTranscribing')),
  );
  const setSendMessageRightAfterTranscribingHandler = useCallback((value: boolean) => {
    setSendMessageRightAfterTranscribing(value);
    localStorage.setItem('isSendMessageRightAfterTranscribing', value ? 'true' : '');
  }, []);

  return {
    isSendMessageRightAfterTranscribing,
    setSendMessageRightAfterTranscribing: setSendMessageRightAfterTranscribingHandler,
  };
}

export function useSettings() {
  return useContext(SettingsContext);
}
