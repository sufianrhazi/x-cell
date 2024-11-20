import Gooey, { calc, defineCustomElement, dynSubscribe } from '@srhazi/gooey';

import { DynamicValue } from './DynamicValue';
import { svc } from './svc';

export function registerXTimer() {
    /*
     * <x-timer name="myTimer" interval="frame"></x-timer> - a 'timer cell'
     *
     * Attributes:
     * - name (string) - must be a valid, JavaScript name
     * - interval (number | 'frame') - must be a number greater than zero or the string 'frame'
     * - display (string) - an optional value to show as content
     *
     * Binds the elapsed time to the provided name, every interval ms.
     * If "frame" is used, then requestAnimationFrame is used instead of a clock interval.
     *
     */
    defineCustomElement({
        tagName: 'x-timer',
        observedAttributes: ['name', 'interval', 'display'],
        Component: (
            { name, interval, display },
            { onDestroy, onMount, host }
        ) => {
            const dynamicValue = new DynamicValue(name, '0');
            const displayValue = new DynamicValue(undefined, display);
            onDestroy(() => {
                dynamicValue.dispose();
            });
            onMount(() => {
                const mounted = svc('time').performanceNow();
                const tick = () => {
                    dynamicValue.setOverride(
                        svc('time').performanceNow() - mounted
                    );
                };
                let cancelInterval: (() => void) | null = null;
                const unsubscribeInterval = dynSubscribe(
                    interval,
                    (err, interval) => {
                        if (!err) {
                            cancelInterval?.();
                            if (interval === 'frame') {
                                cancelInterval =
                                    svc('time').setAnimationFrame(tick);
                            } else if (interval) {
                                const intervalNum = parseFloat(interval);
                                if (isFinite(intervalNum)) {
                                    cancelInterval = svc('time').setInterval(
                                        tick,
                                        intervalNum
                                    );
                                }
                            }
                        }
                    }
                );
                return () => {
                    unsubscribeInterval();
                    cancelInterval?.();
                };
            });

            return <>{calc(() => displayValue.resultValue.get())}</>;
        },
    });
}
