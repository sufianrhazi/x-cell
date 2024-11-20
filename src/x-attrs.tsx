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
        Component: ({ attrs, props }, { onDestroy, onMount, host }) => {
            const dynamicAttrs = new DynamicValue(undefined, attrs);
            const dynamicProps = new DynamicValue(undefined, props);
            onMount(() => {
                dynamicAttrs.onMount(host);
                dynamicProps.onMount(host);

                const updateNodeAttrs = (child: Element) => {
                    const attrs = dynamicAttrs.resultValue.get();
                    if (attrs && typeof attrs === 'object') {
                        for (const [key, value] of Object.entries(attrs)) {
                            switch (typeof value) {
                                case 'string':
                                case 'number':
                                    child.setAttribute(key, value.toString());
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
                };
                const updateNodeProps = (child: Element) => {
                    const props = dynamicProps.resultValue.get();
                    if (props && typeof props === 'object') {
                        for (const [key, value] of Object.entries(props)) {
                            (child as any)[key] = value;
                        }
                    }
                };

                const mutationObserver = new MutationObserver((entries) => {
                    for (const entry of entries) {
                        entry.addedNodes.forEach((node) => {
                            if (node instanceof Element) {
                                updateNodeAttrs(node);
                                updateNodeProps(node);
                            }
                        });
                    }
                });
                mutationObserver.observe(host, {
                    childList: true,
                });
                const unsubscribeAttrs = dynamicAttrs.resultValue.subscribe(
                    (err, val) => {
                        if (!err) {
                            for (const child of Array.from(host.children)) {
                                updateNodeAttrs(child);
                            }
                        }
                    }
                );
                const unsubscribeProps = dynamicProps.resultValue.subscribe(
                    (err, val) => {
                        if (!err) {
                            for (const child of Array.from(host.children)) {
                                updateNodeProps(child);
                            }
                        }
                    }
                );
                return () => {
                    dynamicAttrs.onUnmount();
                    dynamicProps.onUnmount();
                    unsubscribeAttrs();
                    unsubscribeProps();
                    mutationObserver.disconnect();
                };
            });
            onDestroy(() => {
                dynamicAttrs.dispose();
                dynamicProps.dispose();
            });

            return <slot />;
        },
    });
}
