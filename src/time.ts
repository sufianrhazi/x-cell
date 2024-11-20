export interface TimeService {
    now: () => number;
    performanceNow: () => number;
    setTimeout: (fn: () => void, ms: number) => () => void;
    setInterval: (fn: () => void, ms: number) => () => void;
    setAnimationFrame: (fn: (now: number) => void) => () => void;
    sleep: (ms: number) => void;
    _set?: (now: number) => void;
    _dispose?: () => void;
}
