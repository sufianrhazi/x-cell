import { field } from '@srhazi/gooey';

import type { TimeService } from './time';

export function makeReal(): TimeService {
    const nowFrameMs = field(performance.now());
    const nowSec = field(Date.now());
    setInterval(() => nowSec.set(Date.now() / 1000), 1000);
    const tick = () => {
        nowFrameMs.set(performance.now());
        requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);

    Object.defineProperty(window, 'nowSec', {
        get: () => nowSec.get(),
        enumerable: true,
        configurable: false,
    });
    Object.defineProperty(window, 'nowFrameMs', {
        get: () => nowFrameMs.get(),
        enumerable: true,
        configurable: false,
    });

    return {
        now: () => Date.now(),
        setTimeout: (fn, ms) => {
            const handle = setTimeout(fn, ms);
            return () => {
                clearTimeout(handle);
            };
        },
        setInterval: (fn, ms) => {
            const handle = setInterval(fn, ms);
            return () => {
                clearInterval(handle);
            };
        },
        sleep: (ms) => {
            return new Promise<void>((resolve) => {
                setTimeout(() => resolve(), ms);
            });
        },
    };
}
