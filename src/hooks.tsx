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

function useBooleanSetting(name: string) {
  const [isBoolean, setBoolean] = useState<boolean>(Boolean(localStorage.getItem(name)) || true);
  const setBooleanHandler = useCallback(
    (value: boolean) => {
      setBoolean(value);
      localStorage.setItem(name, value ? 'true' : '');
    },
    [name],
  );

  return { isBoolean, setBoolean: setBooleanHandler };
}

function useSettingsContext() {
  // automatically text to speech
  const { isBoolean: isAutomaticallyTextToSpeech, setBoolean: setAutomaticallyTextToSpeechHandler } =
    useBooleanSetting('isAutomaticallyTextToSpeech');

  // send message right after transcribing
  const { isBoolean: isSendMessageRightAfterTranscribing, setBoolean: setSendMessageRightAfterTranscribingHandler } =
    useBooleanSetting('isSendMessageRightAfterTranscribing');

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
