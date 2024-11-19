import Gooey, { flush, mount, ref } from '@srhazi/gooey';
import { assert, beforeEach, suite, test } from '@srhazi/gooey-test';

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
        assert.is(
            '<x-cell style="display: contents;"></x-cell>',
            testRoot.innerHTML
        );
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
        assert.is(undefined, (window as any).cool);
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
        assert.is(42, (window as any).cool);
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
        assert.is(66, (window as any).both);
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
        assert.is(66, (window as any).both);

        coolRef.current?.setAttribute('code', '1000');
        flush();

        assert.is(1024, (window as any).both);

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

        assert.is(0, (window as any).index);
        assert.deepEqual([0, 1, 'neat'], (window as any).list);
        assert.is(0, (window as any).pointer);
        const listBefore = (window as any).list;

        indexRef.current?.setAttribute('code', '2');
        flush();

        assert.is('neat', (window as any).pointer);
        assert.is(listBefore, (window as any).list);

        unmount();
    });
});
