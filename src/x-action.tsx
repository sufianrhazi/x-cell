import Gooey, {
    defineCustomElement,
    dynGet,
    dynSubscribe,
} from '@srhazi/gooey';

import { DynamicValue, evalExpression } from './DynamicValue';

export function registerXAction() {
    /*
     * <x-action event="click" name="numClicks" default="0" next="numClicks + 1">
     *     <button>Click to increment numClicks</button>
     * </x-action> - an event listener cell
     *
     * Attributes:
     * - event (string) - must be an event
     * - name (string) - the name to bind the value
     * - default (string) - the code to provide the default value
     * - next (string) - the code that produces the next value
     *
     */
    defineCustomElement({
        tagName: 'x-action',
        shadowMode: 'open',
        observedAttributes: ['event', 'name', 'default', 'next'],
        Component: (
            { event, name, default: defaultCode, next },
            { onMount, onDestroy, host, addEventListener }
        ) => {
            const dynamicValue = new DynamicValue(name, defaultCode);
            const onEvent = (e: Event) => {
                if (!e.defaultPrevented) {
                    const nextCode = dynGet(next);
                    const nextValue: any =
                        nextCode === undefined
                            ? undefined
                            : evalExpression(nextCode);
                    dynamicValue.setOverride(nextValue);
                }
            };
            const rebindEventListener = (
                prevEventName: string | undefined,
                eventName: string | undefined
            ) => {
                if (prevEventName) {
                    host.removeEventListener(prevEventName, onEvent);
                }
                if (eventName) {
                    host.addEventListener(eventName, onEvent);
                }
            };

            onMount(() => {
                let prevEventName: string | undefined = undefined;
                const unsubscribeEventName = dynSubscribe(
                    event,
                    (err, eventName) => {
                        if (!err) {
                            rebindEventListener(prevEventName, eventName);
                            prevEventName = eventName;
                        }
                    }
                );
                return () => {
                    unsubscribeEventName();
                };
            });
            onDestroy(() => {
                dynamicValue.dispose();
            });

            return <slot />;
        },
    });
}
