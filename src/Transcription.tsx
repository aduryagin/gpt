import { Mic } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { WhisperModel } from './App';
import { model, loadRemote, startRecording, stopRecording } from './helpers';

// @ts-ignore
const Module = window.Module;

export default function Transcription({
  recording,
  setRecording,
  transcribing,
  setTranscribing,
  whisperModel,
  setNotificaitonMessage,
}: {
  setNotificaitonMessage: (value: string) => void;
  whisperModel: WhisperModel;
  transcribing: boolean;
  setTranscribing: (transcribing: boolean) => void;
  recording: boolean;
  setRecording: (recording: boolean) => void;
}) {
  const [progress, setProgress] = useState(0);
  const [ready, setReady] = useState(false);

  const loadWhisperModel = useCallback(() => {
    setReady(false);

    if (whisperModel.name.includes('openai')) {
      setReady(true);
      return;
    }

    loadRemote({
      url: whisperModel.name,
      dst: model,
      size_mb: whisperModel.size,
      cbProgress: setProgress,
      cbCancel() {
        console.log('cancelled');
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      cbReady(dst: string, buf: any) {
        try {
          Module.FS_unlink(dst);
        } catch {
          /* empty */
        }

        Module.FS_createDataFile('/', dst, buf, true, true);
        console.log('storeFS: stored model: ' + dst + ' size: ' + buf.length);

        setReady(true);
      },
    });
  }, [whisperModel]);

  useEffect(() => {
    loadWhisperModel();
  }, [loadWhisperModel]);

  const transcribe = useCallback(() => {
    if (!ready) {
      loadWhisperModel();
      return;
    }

    if (recording) {
      stopRecording();
      setRecording(false);
      return;
    }

    setRecording(true);

    startRecording({ setTranscribing, model: whisperModel.name, setNotificaitonMessage });
  }, [loadWhisperModel, ready, recording, setNotificaitonMessage, setRecording, setTranscribing, whisperModel.name]);
  const isInProgress = progress > 0 && progress < 1 && !ready;

  return (
    <div className="tooltip" data-tip={recording ? 'Stop recording' : 'Start recording'}>
      <button
        disabled={isInProgress || transcribing}
        onClick={() => transcribe()}
        className="btn btn-square btn-outline"
      >
        {isInProgress ? <span>{Math.round(progress * 100)}%</span> : <Mic color={recording ? 'red' : undefined} />}
      </button>
    </div>
  );
}
