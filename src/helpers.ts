export const model = 'whisper.bin';
export const kMaxAudio_s = 120;
const kSampleRate = 16000;

// web audio context
let context: any = null;

// audio data
let audio: any = null;
let audioMp3: any = null;

let mediaRecorder: any = null;
let instance: any = null;
let stream: any = null;

// @ts-ignore
window.AudioContext = window.AudioContext || window.webkitAudioContext;
// @ts-ignore
window.OfflineAudioContext = window.OfflineAudioContext || window.webkitOfflineAudioContext;

export function stopRecording() {
  mediaRecorder.stop();
  stream.getTracks().forEach((track: any) => track.stop());
  // audio = null;
  // context = null;
}

export function startRecording({
  setTranscribing,
  model,
  setNotificaitonMessage,
}: {
  setNotificaitonMessage: (message: string) => void;
  model: string;
  setTranscribing: (transcribing: boolean) => void;
}) {
  if (!context)
    context = new AudioContext({
      sampleRate: 16000,
      // @ts-ignore
      channelCount: 1,
      echoCancellation: false,
      autoGainControl: true,
      noiseSuppression: true,
    });

  let chunks: any = [];

  navigator.mediaDevices
    .getUserMedia({ audio: true, video: false })
    .then(function (s) {
      stream = s;
      mediaRecorder = new MediaRecorder(stream);
      mediaRecorder.ondataavailable = function (e: any) {
        chunks.push(e.data);
      };

      mediaRecorder.onstop = function () {
        console.log('js: mediaRecorder stopped');

        if (model.includes('openai')) {
          audioMp3 = new File([new Blob(chunks)], 'input.wav', { type: 'audio/wav' });
          transcribe({ setTranscribing, model, setNotificaitonMessage });
          return;
        }

        const blob = new Blob(chunks, { type: 'audio/ogg; codecs=opus' });
        chunks = [];

        const reader = new FileReader();
        reader.onload = function () {
          // @ts-ignore
          const buf = new Uint8Array(reader.result);

          context.decodeAudioData(
            buf.buffer,
            function (audioBuffer: any) {
              const offlineContext = new OfflineAudioContext(
                audioBuffer.numberOfChannels,
                audioBuffer.length,
                audioBuffer.sampleRate,
              );
              const source = offlineContext.createBufferSource();
              source.buffer = audioBuffer;
              source.connect(offlineContext.destination);
              source.start(0);

              offlineContext.startRendering().then(function (renderedBuffer) {
                audio = renderedBuffer.getChannelData(0);
                console.log('js: audio recorded, size: ' + audio.length);

                if (audio.length > kMaxAudio_s * kSampleRate) {
                  audio = audio.slice(0, kMaxAudio_s * kSampleRate);
                  console.log('js: truncated audio to first ' + kMaxAudio_s + ' seconds');
                }

                transcribe({ setTranscribing, model, setNotificaitonMessage });
              });
            },
            function (e: Error) {
              console.log('js: error decoding audio: ' + e);
              audio = null;
            },
          );
        };

        reader.readAsArrayBuffer(blob);
      };

      mediaRecorder.start();
    })
    .catch(function (err) {
      setNotificaitonMessage(err.message);
      console.log('js: error getting audio stream: ' + err);
    });
}

export function transcribe({
  model,
  setTranscribing,
  setNotificaitonMessage,
}: {
  setNotificaitonMessage: (message: string) => void;
  model: string;
  setTranscribing: (transcribing: boolean) => void;
}) {
  setTranscribing(true);

  if (model.includes('openai')) {
    const formData = new FormData();
    formData.append('model', 'whisper-1');
    formData.append('file', audioMp3);
    formData.append('response_format', 'text');

    fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        // 'Content-Type': 'multipart/form-data',
        Authorization: 'Bearer ' + localStorage.getItem('apiKey'),
      },
      body: formData,
    })
      .then((response) => response.text())
      .then((data) => {
        console.log(data);
        // @ts-ignore
        window.transcriptionCallback(`openaiapi:${data}`);
      })
      .catch((error) => {
        setNotificaitonMessage(error.message);
        console.log(error);
      });

    return;
  }

  if (!audio) {
    console.log('js: no audio data');
    return;
  }

  // @ts-ignore
  if (!instance) instance = Module.init(model);

  if (instance) {
    console.log('js: whisper initialized, instance: ' + instance);
  }

  if (!instance) {
    console.log('js: failed to initialize whisper');
    return;
  }

  if (instance) {
    console.log('');
    console.log('js: processing - this might take a while ...');
    console.log('');

    // setTimeout(function () {
    // @ts-ignore
    const ret = Module.full_default(instance, audio, 'en', false);
    console.log('js: full_default returned: ' + ret);
    if (ret) {
      console.log('js: whisper returned: ' + ret);
    }
    // }, 100);
  }
}

async function fetchRemote(url: string, cbProgress: (percent: number) => void, cbPrint = console.log) {
  cbPrint('fetchRemote: downloading with fetch()...');

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/octet-stream',
    },
  });

  if (!response.ok) {
    cbPrint('fetchRemote: failed to fetch ' + url);
    return;
  }

  const contentLength = response.headers.get('content-length');
  const total = parseInt(contentLength as string, 10);
  const reader = response.body?.getReader();

  const chunks = [];
  let receivedLength = 0;
  let progressLast = -1;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    if (!reader) return;

    const { done, value } = await reader.read();

    if (done) {
      break;
    }

    chunks.push(value);
    receivedLength += value.length;

    if (contentLength) {
      cbProgress(receivedLength / total);

      const progressCur = Math.round((receivedLength / total) * 10);
      if (progressCur != progressLast) {
        cbPrint('fetchRemote: fetching ' + 10 * progressCur + '% ...');
        progressLast = progressCur;
      }
    }
  }

  let position = 0;
  const chunksAll = new Uint8Array(receivedLength);

  for (const chunk of chunks) {
    chunksAll.set(chunk, position);
    position += chunk.length;
  }

  return chunksAll;
}

// load remote data
// - check if the data is already in the IndexedDB
// - if not, fetch it from the remote URL and store it in the IndexedDB
export function loadRemote({
  url,
  dbName = 'db',
  dbVersion = 1,
  dst,
  size_mb,
  cbProgress,
  cbReady,
  cbCancel,
  cbPrint = console.log,
}: {
  url: string;
  dbName?: string;
  dbVersion?: number;
  dst: any;
  size_mb: number;
  cbProgress: any;
  cbReady: any;
  cbCancel: any;
  cbPrint?: any;
}) {
  if (!navigator.storage || !navigator.storage.estimate) {
    cbPrint('loadRemote: navigator.storage.estimate() is not supported');
  } else {
    // query the storage quota and print it
    navigator.storage.estimate().then(function (estimate) {
      cbPrint('loadRemote: storage quota: ' + estimate.quota + ' bytes');
      cbPrint('loadRemote: storage usage: ' + estimate.usage + ' bytes');
    });
  }

  // check if the data is already in the IndexedDB
  const rq = indexedDB.open(dbName, dbVersion);

  rq.onupgradeneeded = function (event) {
    console.log(event);
    const target: EventTarget & { result: IDBDatabase } = event.target as any;
    const db = target.result;
    let os: IDBObjectStore;

    if (db.version == 1) {
      os = db.createObjectStore('models', { autoIncrement: false });
      cbPrint('loadRemote: created IndexedDB ' + db.name + ' version ' + db.version);
    } else {
      // clear the database
      // @ts-ignore
      os = event.currentTarget?.transaction?.objectStore('models');
      os.clear();
      cbPrint('loadRemote: cleared IndexedDB ' + db.name + ' version ' + db.version);
    }
  };

  rq.onsuccess = function (event) {
    // @ts-ignore
    const db = event.target.result;
    const tx = db.transaction(['models'], 'readonly');
    const os = tx.objectStore('models');
    const rq = os.get(url);

    rq.onsuccess = function () {
      if (rq.result) {
        cbPrint('loadRemote: "' + url + '" is already in the IndexedDB');
        cbReady(dst, rq.result);
      } else {
        // data is not in the IndexedDB
        cbPrint('loadRemote: "' + url + '" is not in the IndexedDB');

        // alert and ask the user to confirm
        if (
          !confirm(
            'You are about to download ' +
              size_mb +
              ' MB of data.\n' +
              'The model data will be cached in the browser for future use.\n\n' +
              'Press OK to continue.',
          )
        ) {
          cbCancel();
          return;
        }

        fetchRemote(url, cbProgress, cbPrint).then(function (data) {
          if (data) {
            // store the data in the IndexedDB
            const rq = indexedDB.open(dbName, dbVersion);
            rq.onsuccess = function (event) {
              // @ts-ignore
              const db = event.target.result;
              const tx = db.transaction(['models'], 'readwrite');
              const os = tx.objectStore('models');
              const rq = os.put(data, url);

              rq.onsuccess = function () {
                cbPrint('loadRemote: "' + url + '" stored in the IndexedDB');
                cbReady(dst, data);
              };

              rq.onerror = function () {
                cbPrint('loadRemote: failed to store "' + url + '" in the IndexedDB');
                cbCancel();
              };
            };
          }
        });
      }
    };

    rq.onerror = function () {
      cbPrint('loadRemote: failed to get data from the IndexedDB');
      cbCancel();
    };
  };

  rq.onerror = function () {
    cbPrint('loadRemote: failed to open IndexedDB');
    cbCancel();
  };

  rq.onblocked = function () {
    cbPrint('loadRemote: failed to open IndexedDB: blocked');
    cbCancel();
  };

  // @ts-ignore
  rq.onabort = function () {
    cbPrint('loadRemote: failed to open IndexedDB: abort');
  };
}

export function scrollToTheBottom() {
  window.scrollTo({ left: 0, top: document.body.scrollHeight, behavior: 'smooth' });
}
