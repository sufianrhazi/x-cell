import Gooey, { flush, mount, ref } from '@srhazi/gooey';
import { assert, beforeEach, suite, test } from '@srhazi/gooey-test';

import { svc } from './svc';
import { _testReset } from './svc.reset';
import { registerXCell } from './x-cell';

registerXCell();

let testRoot = document.getElementById('test-root')!;
beforeEach(() => {
    _testReset();
    testRoot = document.getElementById('test-root')!;
});

suite('x-cell', () => {
    test('it renders nothing and does nothing', () => {
        const unmount = mount(
            testRoot,
            <>
                <x-cell />
            </>
        );
        assert.is('<x-cell></x-cell>', testRoot.innerHTML);
        unmount();
    });

    test('it does nothing when mounted without a name / code', () => {
        const unmount = mount(
            testRoot,
            <>
                <x-cell name="cool" />
                <x-cell code="42" />
            </>
        );

        assert.is(undefined, svc('state').globalScope.evalExpression('cool'));
        unmount();
    });

    test('it evaluates code at name/code pair', () => {
        const unmount = mount(
            testRoot,
            <>
                <x-cell name="cool" code="42" debug="debug" />
            </>
        );
        flush();
        assert.is(42, svc('state').globalScope.evalExpression('cool'));
        unmount();
    });

    test('it evaluates arbitrary code', () => {
        const unmount = mount(
            testRoot,
            <>
                <x-cell name="cool" code="42" />
                <x-cell name="fun" code="24" />
                <x-cell name="both" code="cool + fun" />
            </>
        );
        assert.is(66, svc('state').globalScope.evalExpression('both'));
        unmount();
    });

    test('it updates dependencies', () => {
        const coolRef = ref<HTMLElement>();
        const unmount = mount(
            testRoot,
            <>
                <x-cell ref={coolRef} name="cool" code="42" debug="debug" />
                <x-cell name="fun" code="24" debug="debug" />
                <x-cell name="both" code="cool + fun" debug="debug" />
            </>
        );

        flush();
        assert.is(66, svc('state').globalScope.evalExpression('both'));

        coolRef.current?.setAttribute('code', '1000');
        flush();

        assert.is(1024, svc('state').globalScope.evalExpression('both'));

        unmount();
    });

    test('it memoizes results', () => {
        const indexRef = ref<HTMLElement>();
        const unmount = mount(
            testRoot,
            <>
                <x-cell ref={indexRef} name="index" code="0" />
                <x-cell name="list" code="[0,1,'neat']" />
                <x-cell name="pointer" code="list[index]" />
            </>
        );

        assert.is(0, svc('state').globalScope.evalExpression('index'));
        assert.deepEqual(
            [0, 1, 'neat'],
            svc('state').globalScope.evalExpression('list')
        );
        assert.is(0, svc('state').globalScope.evalExpression('pointer'));
        const listBefore = svc('state').globalScope.evalExpression('list');

        indexRef.current?.setAttribute('code', '2');
        flush();

        assert.is('neat', svc('state').globalScope.evalExpression('pointer'));
        assert.is(listBefore, svc('state').globalScope.evalExpression('list'));

        unmount();
    });

    test('it can be used to update another cell', () => {
        const xCellRef = ref<HTMLElement>();
        const unmount = mount(
            testRoot,
            <>
                <x-cell display="value" name="value" code="'initial'" />
                <x-cell ref={xCellRef} name="enabled" code="false" />
                <x-cell code="{ if (enabled) { value = 'updated' } }" />
            </>
        );
        assert.is('initial', testRoot.textContent);
        xCellRef.current?.setAttribute('code', 'true');
        flush();
        assert.is('updated', testRoot.textContent);
        unmount();
    });
});
