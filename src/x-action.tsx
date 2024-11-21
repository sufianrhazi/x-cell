import Gooey, {
    defineCustomElement,
    dynGet,
    dynSubscribe,
} from '@srhazi/gooey';

import { getDynamicScope } from './DynamicScope';
import { DynamicValue } from './DynamicValue';

export function registerXAction() {
    /*
     * <x-action event="click" name="numClicks" default="0" next="numClicks + 1">
     *     <button>Click to increment numClicks</button>
     * </x-action> - an event listener cell
     *
     * Attributes:
     * - event (string) - must be an event
     * - action (string) - the JavaScript code to run on event
     * - name (string) - the JavaScript identifier to hold the default/next value
     * - target (string) - the JavaScript cell to _modify_ the next value
     * - default (string) - the code to provide the default value
     * - next (string) - the code that produces the next value
     */
    defineCustomElement({
        tagName: 'x-action',
        shadowMode: 'open',
        observedAttributes: [
            'event',
            'name',
            'action',
            'target',
            'default',
            'next',
        ],
        Component: (
            { event, name, action, target, default: defaultCode, next },
            { onMount, host, addEventListener, onDestroy }
        ) => {
            const dynamicValue = new DynamicValue(name, defaultCode);
            onMount(() => {
                dynamicValue.onMount(host);

                const onEvent = (e: Event) => {
                    if (!e.defaultPrevented) {
                        const dynamicScope = getDynamicScope(host);
                        const nextCode = dynGet(next);
                        const nextValue: any =
                            nextCode === undefined
                                ? undefined
                                : dynamicScope.evalExpression(nextCode);
                        dynamicValue.setOverride(nextValue);
                        const targetName = dynGet(target);
                        if (targetName) {
                            const targetValue =
                                dynamicScope.getBinding(targetName);
                            targetValue?.set(nextValue);
                        }
                        const actionCode = dynGet(action);
                        if (actionCode) {
                            dynamicScope.evalExpression(actionCode);
                        }
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
                    dynamicValue.onUnmount();
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
