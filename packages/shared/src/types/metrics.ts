export type Metric =
  | { type: 'lcp'; value: number; timestamp: number }
  | { type: 'cls'; value: number; timestamp: number }
  | { type: 'longtask'; duration: number; timestamp: number }
  | { type: 'resource'; name: string; duration: number; timestamp: number };

export const OBS_METRIC_MESSAGE_TYPE = 'OBS_METRIC' as const;

export type ObsMetricMessage = {
  type: typeof OBS_METRIC_MESSAGE_TYPE;
  payload: Metric;
};

export function isObsMetricMessage(data: unknown): data is ObsMetricMessage {
  if (!data || typeof data !== 'object') return false;
  const o = data as Record<string, unknown>;
  return o.type === OBS_METRIC_MESSAGE_TYPE && o.payload != null && typeof o.payload === 'object';
}
