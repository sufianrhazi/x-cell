import Gooey, { flush, mount, ref } from '@srhazi/gooey';
import { assert, beforeEach, suite, test } from '@srhazi/gooey-test';

import { _testReset } from './svc.reset';
import { registerXCell } from './x-cell';
import { registerXIf } from './x-if';

registerXCell();
registerXIf();

let testRoot = document.getElementById('test-root')!;
beforeEach(() => {
    _testReset();
    testRoot = document.getElementById('test-root')!;
});

suite('x-if', () => {
    test('it renders to nothing when no props present', () => {
        const unmount = mount(
            testRoot,
            <>
                <x-if>yes</x-if>
            </>
        );
        const node = testRoot.childNodes[0] as HTMLElement;
        assert.is(0, node.shadowRoot?.childNodes.length);
        unmount();
    });

    test('it renders to nothing when condition is falsy', () => {
        const unmount = mount(
            testRoot,
            <>
                <x-if condition="false">yes</x-if>
            </>
        );
        flush();
        const node = testRoot.childNodes[0] as HTMLElement;
        assert.is(0, node.shadowRoot?.childNodes.length);
        unmount();
    });

    test('it renders to contents when condition is truthy', () => {
        const unmount = mount(
            testRoot,
            <>
                <x-if condition="true">yes</x-if>
            </>
        );
        flush();
        const node = testRoot.childNodes[0] as HTMLElement;
        assert.is(1, node.shadowRoot?.childNodes.length);
        unmount();
    });

    test('it can dynamically render contents', () => {
        const cellRef = ref<HTMLElement>();
        const ifRef = ref<HTMLElement>();
        const unmount = mount(
            testRoot,
            <>
                <x-cell ref={cellRef} name="cool" code="0" />
                <x-if ref={ifRef} condition="cool > 10">
                    yes
                </x-if>
            </>
        );
        flush();
        assert.is(0, ifRef.current?.shadowRoot?.childNodes.length);

        cellRef.current?.setAttribute('code', '5');

        flush();
        assert.is(0, ifRef.current?.shadowRoot?.childNodes.length);

        cellRef.current?.setAttribute('code', '11');

        flush();
        assert.is(1, ifRef.current?.shadowRoot?.childNodes.length);

        unmount();
    });
});
