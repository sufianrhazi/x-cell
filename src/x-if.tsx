import Gooey, {
    calc,
    defineCustomElement,
    dynGet,
    dynSubscribe,
    field,
} from '@srhazi/gooey';
import type { QuickJSHandle } from 'quickjs-emscripten';

import { DynamicValue } from './DynamicValue';
import { svc } from './svc';

type CompiledState =
    | { type: 'compiling'; source: string }
    | { type: 'compiled'; source: string; compiled: string }
    | { type: 'error'; source: string; error: string };

let maxId = 0;

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
        Component: ({ condition }, { onDestroy, host }) => {
            host.style.display = 'contents';
            const dynamicValue = new DynamicValue(undefined, condition);
            onDestroy(() => {
                dynamicValue.dispose();
            });

            return (
                <>
                    {calc(() => {
                        const value = dynamicValue.resultValue.get();
                        if (svc('js').isTruthy(value)) {
                            return <slot />;
                        }
                        return null;
                    })}
                </>
            );
        },
    });
}
