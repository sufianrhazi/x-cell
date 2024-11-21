import Gooey, {
    defineCustomElement,
    dynGet,
    dynSubscribe,
} from '@srhazi/gooey';

import {
    DynamicScope,
    DynamicScopeSymbol,
    getDynamicScope,
} from './DynamicScope';
import { assert } from './utils';

export function registerXScope() {
    /*
     * <x-scope name="group"></x-scope> - a 'namespace cell'
     *
     * Attributes:
     * - name (optional, string) - a valid, JavaScript identifier
     *
     * If name is provided, an object is created that lives at the `name`.
     *
     * If name is not provided, an anonymous object is created for the scope.
     *
     * All child cells defined live as names on this object.
     */
    defineCustomElement({
        tagName: 'x-scope',
        observedAttributes: ['name'],
        Component: ({ name, children }, { onMount, host, onDestroy }) => {
            onMount(() => {
                const parentScope = getDynamicScope(host);

                const scopeObj: Record<string, unknown> = {};
                const childScope = new DynamicScope(undefined, scopeObj);

                (host as any)[DynamicScopeSymbol] = childScope;

                let unbindName = () => {};
                const unsubscribeName = dynSubscribe(name, (err, name) => {
                    unbindName();
                    if (name) {
                        unbindName = parentScope.addBinding(name, {
                            get: () => scopeObj,
                            set: () =>
                                assert(false, 'Cannot overwrite x-scope value'),
                        });
                    }
                });
                return () => {
                    unsubscribeName();
                };
            });

            return <>{children}</>;
        },
    });
}
