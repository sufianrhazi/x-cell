import type { Field } from '@srhazi/gooey';
import { field } from '@srhazi/gooey';

import { svc } from './svc';
import { assert } from './utils';

type DynamicScopeAccessor = {
    get: () => unknown;
    set: (val: unknown) => void;
};
type DynamicScopeBinding = { name: string; value: DynamicScopeAccessor };

const DynamicScopeSymbol = Symbol('DynamicScope');

export class DynamicScope {
    private parentScope: DynamicScope | undefined;
    private bindings: Field<Map<string, DynamicScopeAccessor>>;
    private scopeObject: Record<string, unknown>;

    constructor(
        parentScope: DynamicScope | undefined,
        scopeObject: Record<string, unknown>
    ) {
        this.parentScope = parentScope;
        this.bindings = field(new Map());
        this.scopeObject = scopeObject;
    }

    evalExpression(expressionCode: string): unknown {
        const funcBody = new Function(`return (() => ${expressionCode})();`);
        return funcBody.call(this.scopeObject);
    }

    private getBindings(): DynamicScopeBinding[] {
        const bindings: Record<string, DynamicScopeAccessor> = {};
        if (this.parentScope) {
            for (const binding of this.parentScope.getBindings()) {
                bindings[binding.name] = binding.value;
            }
        }
        for (const [name, value] of this.bindings.get()) {
            bindings[name] = value;
        }
        return Object.entries(bindings).map(([name, value]) => ({
            name,
            value,
        }));
    }

    addBinding(name: string, accessor: DynamicScopeAccessor) {
        let removed = false;
        const bindings = this.bindings.get();
        assert(
            !bindings.has(name),
            `Binding ${JSON.stringify(name)} already exists`
        );
        this.bindings.set(new Map([...bindings.entries(), [name, accessor]]));
        Object.defineProperty(this.scopeObject, name, {
            get: () => accessor.get(),
            set: (value: unknown) => accessor.set(value),
            enumerable: true,
            configurable: true,
        });
        return () => {
            assert(!removed, `Binding ${JSON.stringify(name)} already deleted`);
            removed = true;
            const newBindings = new Map(this.bindings.get());
            newBindings.delete(name);
            this.bindings.set(newBindings);
            delete this.scopeObject[name];
        };
    }
}

export function getDynamicScope(element: Element | undefined): DynamicScope {
    let el: unknown = element;
    while (el instanceof Node) {
        if (
            el &&
            typeof el === 'object' &&
            DynamicScopeSymbol in el &&
            el[DynamicScopeSymbol] instanceof DynamicScope
        ) {
            return el[DynamicScopeSymbol];
        }
        el = el.parentNode;
    }
    return svc('state').globalScope;
}
