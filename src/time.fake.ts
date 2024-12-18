import type { TimeService } from './time';
import { assert } from './utils';

export function makeFake(): TimeService {
    let now = 1727459579426; // arbitrarily 2024-09-27T17:52:59.426Z
    let immediates = new Set<() => void>();
    const timeouts = new Set<{ fn: () => void; next: number }>();
    const intervals = new Set<{ fn: () => void; next: number; ms: number }>();
    const frames = new Set<{ fn: (now: number) => void }>();
    return {
        now: () => now,
        performanceNow: () => now,
        setTimeout: (fn, ms) => {
            if (ms === 0) {
                immediates.add(fn);
                return () => {
                    immediates.delete(fn);
                };
            }
            const handle = {
                fn,
                next: now + ms,
            };
            timeouts.add(handle);
            return () => {
                timeouts.delete(handle);
            };
        },
        setInterval: (fn, ms) => {
            const handle = {
                fn,
                next: now + ms,
                ms,
            };
            intervals.add(handle);
            return () => {
                intervals.delete(handle);
            };
        },
        setAnimationFrame: (fn) => {
            const handle = {
                fn,
            };
            frames.add(handle);
            return () => {
                frames.delete(handle);
            };
        },
        sleep: (ms) => {
            now += ms;
            for (const timeout of timeouts) {
                if (timeout.next <= now) {
                    timeouts.delete(timeout);
                    timeout.fn();
                }
            }
            for (const interval of intervals) {
                let numRuns = 0;
                while (interval.next <= now) {
                    interval.next += interval.ms;
                    numRuns += 1;
                }
                for (let i = 0; i < numRuns; ++i) {
                    interval.fn();
                }
            }
            for (const frame of frames) {
                frame.fn(now);
            }
            const runNow = immediates;
            immediates = new Set();
            for (const immediate of runNow) {
                immediate();
            }
        },
        _set: (newNow: number) => {
            now = newNow;
        },
        _dispose: () => {
            assert(
                timeouts.size === 0,
                `Cannot dispose of time, ${timeouts.size} pending setTimeouts`
            );
            assert(
                intervals.size === 0,
                `Cannot dispose of time, ${intervals.size} pending setIntervals`
            );
            assert(
                frames.size === 0,
                `Cannot dispose of time, ${frames.size} pending requestAnimationFrames`
            );
        },
    };
}
