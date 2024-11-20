import Gooey, { flush, mount, ref } from '@srhazi/gooey';
import { assert, beforeEach, suite, test } from '@srhazi/gooey-test';

import { _testReset } from './svc.reset';
import { registerXAttrs } from './x-attrs';
import { registerXCell } from './x-cell';

registerXAttrs();
registerXCell();

let testRoot = document.getElementById('test-root')!;
beforeEach(() => {
    _testReset();
    testRoot = document.getElementById('test-root')!;
});

suite('x-attrs', () => {
    test('it renders children normally', () => {
        const unmount = mount(
            testRoot,
            <>
                <x-attrs>
                    <p>Hello there</p>
                </x-attrs>
            </>
        );
        assert.is(
            '<x-attrs style="display: contents;"><p>Hello there</p></x-attrs>',
            testRoot.innerHTML
        );
        unmount();
    });

    test('it adds attributes to all children', () => {
        const unmount = mount(
            testRoot,
            <x-attrs attrs="({ foo: 'bar', baz: 'bum' })">
                <div />
                <span />
            </x-attrs>
        );
        assert.is(
            '<div foo="bar" baz="bum"></div><span foo="bar" baz="bum"></span>',
            testRoot.children[0].innerHTML
        );
        unmount();
    });

    test('it assigns props to all children', () => {
        const inputRef1 = ref<HTMLInputElement>();
        const inputRef2 = ref<HTMLInputElement>();
        const unmount = mount(
            testRoot,
            <x-attrs props="({ indeterminate: true })">
                <input ref={inputRef1} type="checkbox" />
                <input ref={inputRef2} type="radio" />
            </x-attrs>
        );
        assert.is(true, inputRef1.current?.indeterminate);
        assert.is(true, inputRef2.current?.indeterminate);
        unmount();
    });

    test('it is dynamic', () => {
        const divRef = ref<HTMLDivElement>();
        const xCellRef = ref<HTMLElement>();
        const unmount = mount(
            testRoot,
            <>
                <x-attrs attrs="({ 'class': theClass })">
                    <div ref={divRef} />
                </x-attrs>
                <x-cell ref={xCellRef} name="theClass" code="'nice'" />
            </>
        );
        assert.is('nice', divRef.current?.className);
        xCellRef.current?.setAttribute('code', '"cool"');
        flush();
        assert.is('cool', divRef.current?.className);
        unmount();
    });
});
