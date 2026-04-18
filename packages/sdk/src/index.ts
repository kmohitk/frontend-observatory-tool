import { createObservatoryOverlay, startPerformanceCollection } from '@observatory/collector';
import { OBS_METRIC_MESSAGE_TYPE } from '@observatory/shared';

/**
 * Optional script-tag bundle: posts OBS_METRIC to the page for legacy tooling.
 * Primary capture path is the Chrome extension (content script uses the same collector without postMessage).
 */
function init(): void {
  startPerformanceCollection({
    onMetric: (metric) => {
      window.postMessage({ type: OBS_METRIC_MESSAGE_TYPE, payload: metric }, '*');
    },
    overlay: createObservatoryOverlay(),
  });
}

init();
