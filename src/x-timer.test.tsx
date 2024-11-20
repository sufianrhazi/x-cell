import Gooey, { flush, mount } from '@srhazi/gooey';
import { afterEach, assert, beforeEach, suite, test } from '@srhazi/gooey-test';

import { svc } from './svc';
import { _testReset } from './svc.reset';
import { registerXTimer } from './x-timer';

registerXTimer();

let testRoot = document.getElementById('test-root')!;
afterEach(() => {
    svc('time')._dispose?.();
});
beforeEach(() => {
    _testReset();
    testRoot = document.getElementById('test-root')!;
});

suite('x-timer', () => {
    test('renders to nothing', () => {
        const unmount = mount(
            testRoot,
            <>
                <x-timer />
            </>
        );

        assert.is('<x-timer></x-timer>', testRoot.innerHTML);

        unmount();
    });

    test('starts a normal timer', () => {
        const unmount = mount(
            testRoot,
            <>
                <x-timer name="oneSec" interval="1000" display="oneSec" />
            </>
        );

        assert.is(
            '<x-timer name="oneSec" interval="1000" display="oneSec">0</x-timer>',
            testRoot.innerHTML
        );

        svc('time').sleep(500); // time now at 500
        flush();

        assert.is(
            '<x-timer name="oneSec" interval="1000" display="oneSec">0</x-timer>',
            testRoot.innerHTML
        );

        svc('time').sleep(500); // time now at 1000
        flush();

        assert.is(
            '<x-timer name="oneSec" interval="1000" display="oneSec">1000</x-timer>',
            testRoot.innerHTML
        );

        unmount();
    });

    test('starts a frame-based timer', () => {
        // Note: fake time requestAnimationFrame fires exactly once per sleep
        const unmount = mount(
            testRoot,
            <>
                <x-timer name="oneFrame" interval="frame" display="oneFrame" />
            </>
        );

        assert.is(
            '<x-timer name="oneFrame" interval="frame" display="oneFrame">0</x-timer>',
            testRoot.innerHTML
        );

        svc('time').sleep(500); // time now at 500
        flush();

        assert.is(
            '<x-timer name="oneFrame" interval="frame" display="oneFrame">500</x-timer>',
            testRoot.innerHTML
        );

        svc('time').sleep(2); // time now at 502
        flush();

        assert.is(
            '<x-timer name="oneFrame" interval="frame" display="oneFrame">502</x-timer>',
            testRoot.innerHTML
        );

        unmount();
    });
});
