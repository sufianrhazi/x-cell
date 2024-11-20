import type { TimeService } from './time';

export function makeReal(): TimeService {
    return {
        now: () => Date.now(),
        performanceNow: () => performance.now(),
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
        setAnimationFrame: (fn) => {
            function tick(now: number) {
                fn(now);
                handle = requestAnimationFrame(tick);
            }
            let handle = requestAnimationFrame(tick);
            return () => {
                cancelAnimationFrame(handle);
            };
        },
        sleep: (ms) => {
            return new Promise<void>((resolve) => {
                setTimeout(() => resolve(), ms);
            });
        },
    };
}
