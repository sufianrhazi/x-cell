import Gooey, { defineCustomElement } from '@srhazi/gooey';

import { DynamicValue } from './DynamicValue';

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
        observedAttributes: ['attrs', 'props'],
        Component: ({ attrs, props }, { onMount, onDestroy, host }) => {
            host.style.display = 'contents';

            onMount(() => {
                const dynamicAttrs = new DynamicValue(undefined, attrs);
                const dynamicProps = new DynamicValue(undefined, props);
                const unsubscribeAttrs = dynamicAttrs.resultValue.subscribe(
                    (err, val) => {
                        if (err) {
                            return;
                        }
                        if (val && typeof val === 'object') {
                            for (const child of Array.from(host.children)) {
                                for (const [key, value] of Object.entries(
                                    val
                                )) {
                                    switch (typeof value) {
                                        case 'string':
                                        case 'number':
                                            child.setAttribute(
                                                key,
                                                value.toString()
                                            );
                                            break;
                                        case 'boolean':
                                            if (value) {
                                                child.setAttribute(key, '');
                                            } else {
                                                child.removeAttribute(key);
                                            }
                                            break;
                                    }
                                }
                            }
                        }
                    }
                );
                const unsubscribeProps = dynamicProps.resultValue.subscribe(
                    (err, val) => {
                        if (err) {
                            return;
                        }
                        if (val && typeof val === 'object') {
                            for (const child of Array.from(host.children)) {
                                for (const [key, value] of Object.entries(
                                    val
                                )) {
                                    (child as any)[key] = value;
                                }
                            }
                        }
                    }
                );
                return () => {
                    dynamicAttrs.dispose();
                    dynamicProps.dispose();
                    unsubscribeAttrs();
                    unsubscribeProps();
                };
            });

            return <slot />;
        },
    });
}
