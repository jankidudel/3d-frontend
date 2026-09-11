/// <reference lib="webworker" />

import { GcodeParseError, parseGcode } from './gcode-parser';

addEventListener(
  'message',
  ({ data }: MessageEvent<{ readonly text: string }>) => {
    try {
      postMessage({ report: parseGcode(data.text) });
    } catch (error) {
      postMessage({
        error:
          error instanceof GcodeParseError
            ? error.message
            : 'Could not parse this G-code safely.',
      });
    }
  },
);
