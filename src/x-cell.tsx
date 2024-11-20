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
            { onMount, onError, onDestroy }
        ) => {
            const displayValue = new DynamicValue(undefined, display);
            const dynamicValue = new DynamicValue(name, code);
            onDestroy(() => {
                displayValue.dispose();
                dynamicValue.dispose();
            });

            return <>{calc(() => displayValue.resultValue.get())}</>;
        },
    });
}
