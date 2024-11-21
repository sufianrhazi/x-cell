import Gooey, { mount, ref } from '@srhazi/gooey';
import { assert, beforeEach, suite, test } from '@srhazi/gooey-test';

import { getDynamicScope } from './DynamicScope';
import { _testReset } from './svc.reset';
import { registerXCell } from './x-cell';
import { registerXScope } from './x-scope';

registerXCell();
registerXScope();

let testRoot = document.getElementById('test-root')!;
beforeEach(() => {
    _testReset();
    testRoot = document.getElementById('test-root')!;
});

suite('x-scope', () => {
    test('it renders children normally', () => {
        const unmount = mount(
            testRoot,
            <x-scope>
                <p>Hello</p>
            </x-scope>
        );
        assert.is('<x-scope><p>Hello</p></x-scope>', testRoot.innerHTML);
        unmount();
    });

    test('cells can be added to scope by name and reference each other via this', () => {
        const divRef = ref<HTMLDivElement>();
        const unmount = mount(
            testRoot,
            <x-scope>
                <x-cell name="one" code="1" />
                <x-cell name="two" code="2" />
                <div ref={divRef}>
                    <x-cell display="this.one + this.two" />
                </div>
            </x-scope>
        );
        assert.is('3', divRef.current?.textContent);
        const scope = getDynamicScope(divRef.current);
        assert.is(1, scope.evalExpression('this.one'));
        assert.is(2, scope.evalExpression('this.two'));
        const globalScope = getDynamicScope(undefined);
        assert.is(undefined, globalScope.evalExpression('this.one'));
        assert.is(undefined, globalScope.evalExpression('this.two'));
        unmount();
    });

    test('cells cannot access local names without this', () => {
        const divRef = ref<HTMLDivElement>();
        const unmount = mount(
            testRoot,
            <>
                <x-cell name="one" code="'shadowed1'" />
                <x-cell name="two" code="'shadowed2'" />
                <x-scope>
                    <x-cell name="one" code="1" />
                    <x-cell name="two" code="2" />
                    <div ref={divRef}>
                        <x-cell display="one + two" />
                    </div>
                </x-scope>
            </>
        );
        assert.isNot('3', divRef.current?.textContent);
        unmount();
    });

    test('if given a name, values can access inner values as objects', () => {
        const divRef = ref<HTMLDivElement>();
        const unmount = mount(
            testRoot,
            <>
                <x-scope name="myObject">
                    <x-cell name="one" code="1" />
                    <x-cell name="two" code="2" />
                </x-scope>
                <div ref={divRef}>
                    <x-cell display="myObject.one + myObject.two" />
                </div>
            </>
        );
        assert.is('3', divRef.current?.textContent);
        unmount();
    });
});
