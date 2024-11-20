import Gooey, { calc, defineCustomElement } from '@srhazi/gooey';

import { DynamicValue } from './DynamicValue';

export function registerXIf() {
    /*
     * <x-if condition="42"></x-if> - a conditional 'display cell'
     *
     * Attributes:
     * - condition (string) - must be a valid, JavaScript expression
     *
     * If the cell's expression evaluates to true, then the children are displayed.
     *
     * Otherwise, the children are not displayed.
     *
     */
    defineCustomElement({
        tagName: 'x-if',
        shadowMode: 'open',
        observedAttributes: ['condition'],
        Component: ({ condition }, { onMount, host, onDestroy }) => {
            const dynamicValue = new DynamicValue(undefined, condition);
            onMount(() => {
                dynamicValue.onMount(host);
                return () => {
                    dynamicValue.onUnmount();
                };
            });
            onDestroy(() => {
                dynamicValue.dispose();
            });

            return (
                <>
                    {calc(() => {
                        const value = dynamicValue.resultValue.get();
                        if (value) {
                            return <slot />;
                        }
                        return null;
                    })}
                </>
            );
        },
    });
}
