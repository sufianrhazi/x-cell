import Gooey, { defineCustomElement } from '@srhazi/gooey';

import { DynamicValue } from './DynamicValue';
import { svc } from './svc';

export function registerXAttrs() {
    /*
     * <x-attrs attrs="{ style: 'color: ' + color }"><span>I will be colored based on the value of "color"</span></x-if> - a conditional 'display cell'
     *
     * Attributes:
     * - attrs (string) - must be a valid, JavaScript expression evaluating to an object
     *
     * All children will have attributes bound to the value of evaluating attrs
     *
     */
    defineCustomElement({
        tagName: 'x-attrs',
        shadowMode: 'open',
        observedAttributes: ['attrs'],
        Component: ({ attrs }, { onMount, onDestroy, host }) => {
            host.style.display = 'contents';
            const dynamicValue = new DynamicValue(undefined, attrs);
            onDestroy(() => {
                dynamicValue.dispose();
            });

            onMount(() => {
                return dynamicValue.resultValue.subscribe((err, val) => {
                    if (err) {
                        return;
                    }
                    const obj: unknown = svc('js').vmToHost(val, () => {});
                    console.log('NEAT', obj);
                    if (obj && typeof obj === 'object') {
                        for (const child of Array.from(host.children)) {
                            for (const [key, value] of Object.entries(obj)) {
                                if (typeof value === 'string') {
                                    child.setAttribute(key, value);
                                }
                            }
                        }
                    }
                });
            });

            return <slot />;
        },
    });
}
