import Gooey, { flush, mount, ref } from '@srhazi/gooey';
import { assert, beforeEach, suite, test } from '@srhazi/gooey-test';

import { svc } from './svc';
import { _testReset } from './svc.reset';
import { registerXCell } from './x-cell';

registerXCell();

let testRoot = document.getElementById('test-root')!;
beforeEach(async () => {
    await _testReset();
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

    test('it does nothing when mounted without a name / code', async () => {
        const unmount = mount(
            testRoot,
            <>
                <x-cell name="cool" />
                <x-cell code="42" />
            </>
        );
        await svc('compile').waitForCompiled();
        using cool = svc('js').ctx.getProp(svc('js').ctx.global, 'cool');
        assert.is(undefined, svc('js').ctx.dump(cool));
        unmount();
    });

    test('it evaluates code at name/code pair', async () => {
        const unmount = mount(
            testRoot,
            <>
                <x-cell name="cool" code="42" debug="debug" />
            </>
        );
        await svc('compile').waitForCompiled();
        flush();
        using cool = svc('js').ctx.getProp(svc('js').ctx.global, 'cool');
        assert.is(42, svc('js').ctx.dump(cool));
        unmount();
    });

    test('it evaluates arbitrary code', async () => {
        const unmount = mount(
            testRoot,
            <>
                <x-cell name="cool" code="42" />
                <x-cell name="fun" code="24" />
                <x-cell name="both" code="cool + fun" />
            </>
        );
        await svc('compile').waitForCompiled();
        using both = svc('js').ctx.getProp(svc('js').ctx.global, 'both');
        assert.is(66, svc('js').ctx.dump(both));
        unmount();
    });

    test('it updates dependencies', async () => {
        const coolRef = ref<HTMLElement>();
        const unmount = mount(
            testRoot,
            <>
                <x-cell ref={coolRef} name="cool" code="42" debug="debug" />
                <x-cell name="fun" code="24" debug="debug" />
                <x-cell name="both" code="cool + fun" debug="debug" />
            </>
        );

        await svc('compile').waitForCompiled();
        flush();
        using both = svc('js').ctx.getProp(svc('js').ctx.global, 'both');
        assert.is(66, svc('js').ctx.dump(both));

        coolRef.current?.setAttribute('code', '1000');
        flush();
        await svc('compile').waitForCompiled();
        flush();
        using both2 = svc('js').ctx.getProp(svc('js').ctx.global, 'both');
        assert.is(1024, svc('js').ctx.dump(both2));

        unmount();
    });

    test('it memoizes results', async () => {
        const indexRef = ref<HTMLElement>();
        const unmount = mount(
            testRoot,
            <>
                <x-cell ref={indexRef} name="index" code="0" />
                <x-cell name="list" code="[0,1,'neat']" />
                <x-cell name="pointer" code="list[index]" />
            </>
        );

        await svc('compile').waitForCompiled();
        using index = svc('js').ctx.getProp(svc('js').ctx.global, 'index');
        assert.is(0, svc('js').ctx.dump(index));
        using list = svc('js').ctx.getProp(svc('js').ctx.global, 'list');
        assert.deepEqual([0, 1, 'neat'], svc('js').ctx.dump(list));
        using pointer = svc('js').ctx.getProp(svc('js').ctx.global, 'pointer');
        assert.is(0, svc('js').ctx.dump(pointer));

        indexRef.current?.setAttribute('code', '2');
        flush();
        await svc('compile').waitForCompiled();
        flush();
        using pointer2 = svc('js').ctx.getProp(svc('js').ctx.global, 'pointer');
        assert.is('neat', svc('js').ctx.dump(pointer2));
        using list2 = svc('js').ctx.getProp(svc('js').ctx.global, 'list');
        assert.is(true, svc('js').eq(list, list2));

        unmount();
    });
});
