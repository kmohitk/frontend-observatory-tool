import { isObsMetricMessage } from '@observatory/shared';

window.addEventListener(
  'message',
  (event: MessageEvent) => {
    if (event.source !== window) return;
    const data = event.data;
    if (!isObsMetricMessage(data)) return;
    void chrome.runtime.sendMessage({ kind: 'OBS_METRIC', payload: data.payload });
  },
  false,
);
