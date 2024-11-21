import Gooey, { calc, defineCustomElement } from '@srhazi/gooey';

import { DynamicValue } from './DynamicValue';

export function registerXCell() {
    /*
     * <x-cell name="myName" code="42"></x-cell> - an invisible 'data cell'
     *
     * Attributes:
     * - name (string) - must be a valid, JavaScript name
     * - code (string) - must be a valid, JavaScript expression
     * - display (string) - must be a valid, JavaScript expression
     *
     * The cell's value is a dynamic value which represents the evaluation of the cell's code.
     *
     */
    defineCustomElement({
        tagName: 'x-cell',
        observedAttributes: ['name', 'code', 'display'],
        Component: (
            { name, code, display },
            { onDestroy, onMount, onError, host }
        ) => {
            const displayValue = new DynamicValue(undefined, display);
            const dynamicValue = new DynamicValue(name, code);

            onMount(() => {
                displayValue.onMount(host);
                dynamicValue.onMount(host);
                return () => {
                    displayValue.onUnmount();
                    dynamicValue.onUnmount();
                };
            });

            onDestroy(() => {
                displayValue.dispose();
                dynamicValue.dispose();
            });

            return (
                <>
                    {calc(() => displayValue.resultValue.get()).onError(
                        (err) => {
                            return <pre>Uh oh! {err.toString()}</pre>;
                        }
                    )}
                </>
            );
        },
    });
}
