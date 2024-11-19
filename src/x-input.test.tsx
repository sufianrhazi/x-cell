import Gooey, { flush, mount, ref } from '@srhazi/gooey';
import { assert, beforeEach, suite, test } from '@srhazi/gooey-test';

import { _testReset } from './svc.reset';
import { registerXCell } from './x-cell';
import { registerXInput } from './x-input';

registerXCell();
registerXInput();

let testRoot = document.getElementById('test-root')!;
beforeEach(() => {
    _testReset();
    testRoot = document.getElementById('test-root')!;
});

suite('x-input', () => {
    test('it reflects value when present', () => {
        const xInputRef = ref<HTMLElement>();
        const inputRef = ref<HTMLInputElement>();
        const unmount = mount(
            testRoot,
            <>
                <x-input ref={xInputRef} value="'hello'">
                    <input ref={inputRef} type="text" />
                </x-input>
            </>
        );

        assert.is('hello', inputRef.current?.value);

        xInputRef.current?.setAttribute('value', "'world'");
        flush();

        assert.is('world', inputRef.current?.value);

        unmount();
    });

    test('it reflects value for numeric elements', () => {
        const xInputRef = ref<HTMLElement>();
        const inputRef = ref<HTMLInputElement>();
        const unmount = mount(
            testRoot,
            <>
                <x-input ref={xInputRef} value="5">
                    <input ref={inputRef} type="number" />
                </x-input>
            </>
        );

        flush();

        assert.is(5, inputRef.current?.valueAsNumber);

        xInputRef.current?.setAttribute('value', '10');
        flush();

        assert.is(10, inputRef.current?.valueAsNumber);

        unmount();
    });

    test('it reflects value for date elements', () => {
        const xInputRef = ref<HTMLElement>();
        const inputRef = ref<HTMLInputElement>();
        const unmount = mount(
            testRoot,
            <>
                <x-input ref={xInputRef} value="new Date(1234567890000)">
                    <input ref={inputRef} type="date" />
                </x-input>
            </>
        );

        flush();

        // Note: rounded to date!
        assert.is(1234483200000, inputRef.current?.valueAsDate?.valueOf());

        xInputRef.current?.setAttribute('value', 'new Date(2234567890000)');
        flush();

        // Note: rounded to date!
        assert.is(2234563200000, inputRef.current?.valueAsDate?.valueOf());

        unmount();
    });

    test('value is set when changed', () => {
        const xInputRef = ref<HTMLElement>();
        const inputRef = ref<HTMLInputElement>();
        const unmount = mount(
            testRoot,
            <>
                <x-input ref={xInputRef} name="cool">
                    <input ref={inputRef} type="number" value="10" />
                </x-input>
            </>
        );

        assert.is(10, (window as any).cool);

        inputRef.current!.valueAsNumber = 20;
        inputRef.current?.dispatchEvent(
            new InputEvent('input', { bubbles: true })
        );
        flush();

        assert.is(20, (window as any).cool);

        unmount();
    });
});
