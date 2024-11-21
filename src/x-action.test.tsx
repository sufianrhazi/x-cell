import Gooey, { flush, mount, ref } from '@srhazi/gooey';
import { assert, beforeEach, suite, test } from '@srhazi/gooey-test';

import { _testReset } from './svc.reset';
import { registerXAction } from './x-action';
import { registerXCell } from './x-cell';

registerXAction();
registerXCell();

let testRoot = document.getElementById('test-root')!;
beforeEach(() => {
    _testReset();
    testRoot = document.getElementById('test-root')!;
});

suite('x-action', () => {
    test('it renders children normally', () => {
        const unmount = mount(
            testRoot,
            <>
                <x-action>
                    <p>Hello there</p>
                </x-action>
            </>
        );
        assert.is(
            '<x-action><p>Hello there</p></x-action>',
            testRoot.innerHTML
        );
        unmount();
    });

    test('it can be used as a click counter', () => {
        const buttonRef = ref<HTMLButtonElement>();
        const unmount = mount(
            testRoot,
            <>
                <x-action
                    event="click"
                    name="clickCount"
                    default="0"
                    next="clickCount + 1"
                >
                    <button ref={buttonRef}>
                        Num clicks: <x-cell display="clickCount" />
                    </button>
                </x-action>
            </>
        );
        assert.is('Num clicks: 0', testRoot.textContent);
        buttonRef.current?.dispatchEvent(
            new MouseEvent('click', { bubbles: true })
        );
        flush();
        assert.is('Num clicks: 1', testRoot.textContent);
        buttonRef.current?.dispatchEvent(
            new MouseEvent('click', { bubbles: true })
        );
        flush();
        assert.is('Num clicks: 2', testRoot.textContent);
        unmount();
    });

    test('it can be used as a toggle', () => {
        const buttonRef = ref<HTMLButtonElement>();
        const unmount = mount(
            testRoot,
            <>
                <x-action
                    event="click"
                    name="isOn"
                    default="false"
                    next="!isOn"
                >
                    <button ref={buttonRef}>
                        The light switch is:{' '}
                        <x-cell display="isOn ? 'on' : 'off'" />
                    </button>
                </x-action>
            </>
        );
        assert.is('The light switch is: off', testRoot.textContent);
        buttonRef.current?.dispatchEvent(
            new MouseEvent('click', { bubbles: true })
        );
        flush();
        assert.is('The light switch is: on', testRoot.textContent);
        buttonRef.current?.dispatchEvent(
            new MouseEvent('click', { bubbles: true })
        );
        flush();
        assert.is('The light switch is: off', testRoot.textContent);
        unmount();
    });

    test('it can be used to modify other cells', () => {
        const buttonRef = ref<HTMLButtonElement>();
        const unmount = mount(
            testRoot,
            <>
                <x-cell name="clickCount" code="0" />
                <x-action
                    event="click"
                    target="clickCount"
                    next="clickCount + 1"
                >
                    <button ref={buttonRef}>
                        Num clicks: <x-cell display="clickCount" />
                    </button>
                </x-action>
            </>
        );
        assert.is('Num clicks: 0', testRoot.textContent);
        buttonRef.current?.dispatchEvent(
            new MouseEvent('click', { bubbles: true })
        );
        flush();
        assert.is('Num clicks: 1', testRoot.textContent);
        buttonRef.current?.dispatchEvent(
            new MouseEvent('click', { bubbles: true })
        );
        flush();
        assert.is('Num clicks: 2', testRoot.textContent);
        unmount();
    });
});
