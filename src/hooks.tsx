import { createContext, useCallback, useContext, useState } from 'react';

const SettingsContext = createContext({
  isAutomaticallyTextToSpeech: true,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  setAutomaticallyTextToSpeech: (value: boolean) => {
    /*empty*/
  },

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
  // automatically text to speech
  const [isAutomaticallyTextToSpeech, setAutomaticallyTextToSpeech] = useState<boolean>(
    Boolean(localStorage.getItem('isAutomaticallyTextToSpeech')) || true,
  );
  const setAutomaticallyTextToSpeechHandler = useCallback((value: boolean) => {
    setAutomaticallyTextToSpeech(value);
    localStorage.setItem('isAutomaticallyTextToSpeech', value ? 'true' : '');
  }, []);

  // send message right after transcribing
  const [isSendMessageRightAfterTranscribing, setSendMessageRightAfterTranscribing] = useState(
    Boolean(localStorage.getItem('isSendMessageRightAfterTranscribing')),
  );
  const setSendMessageRightAfterTranscribingHandler = useCallback((value: boolean) => {
    setSendMessageRightAfterTranscribing(value);
    localStorage.setItem('isSendMessageRightAfterTranscribing', value ? 'true' : '');
  }, []);

  return {
    isAutomaticallyTextToSpeech,
    setAutomaticallyTextToSpeech: setAutomaticallyTextToSpeechHandler,

    isSendMessageRightAfterTranscribing,
    setSendMessageRightAfterTranscribing: setSendMessageRightAfterTranscribingHandler,
  };
}

export function useSettings() {
  return useContext(SettingsContext);
}
