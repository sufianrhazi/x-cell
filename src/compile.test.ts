import { afterEach, assert, beforeEach, suite, test } from '@srhazi/gooey-test';

import { svc } from './svc';
import { _testReset } from './svc.reset';

beforeEach(async () => {
    await _testReset();
});
afterEach(() => {
    svc('js').dispose();
});

suite('compile', () => {
    test('compilation oneshot happy path', async () => {
        const result = await svc('compile').compile(
            'export const Hello = () => <p on:click={() => {}}>hello world!</p>;'
        );
        assert.is(
            'export const Hello = () => /* @__PURE__ */ createElement("p", { "on:click": () => {\n} }, "hello world!");\n',
            result
        );
    });
    test('compilation happens in a queue', async () => {
        const order: string[] = [];
        const p1 = svc('compile')
            .compile(
                'export const Hello = () => <p on:click={() => {}}>hello world!</p>;'
            )
            .then((r) => {
                order.push('one');
                return r;
            });
        const p2 = svc('compile')
            .compile(
                'export const Hello = () => <p on:click={() => {}}>hello there!</p>;'
            )
            .then((r) => {
                order.push('two');
                return r;
            });

        const result2 = await p2;
        const result1 = await p1;

        assert.deepEqual(['one', 'two'], order);
        assert.is(
            'export const Hello = () => /* @__PURE__ */ createElement("p", { "on:click": () => {\n} }, "hello world!");\n',
            result1
        );
        assert.is(
            'export const Hello = () => /* @__PURE__ */ createElement("p", { "on:click": () => {\n} }, "hello there!");\n',
            result2
        );
    });

    test('waiting for compilation waits for all to be finished', async () => {
        const order: string[] = [];
        const p1 = svc('compile')
            .compile(
                'export const Hello = () => <p on:click={() => {}}>hello world!</p>;'
            )
            .then((r) => {
                order.push('one');
                return r;
            });
        const p2 = svc('compile')
            .compile(
                'export const Hello = () => <p on:click={() => {}}>hello there!</p>;'
            )
            .then((r) => {
                order.push('two');
                return r;
            });
        const waitHandle = svc('compile').waitForCompiled();
        const p3 = svc('compile')
            .compile(
                'export const Hello = () => <p on:click={() => {}}>hello three!</p>;'
            )
            .then((r) => {
                order.push('three');
                return r;
            });

        await waitHandle;

        assert.deepEqual(['one', 'two', 'three'], order);
        const r1 = await p1;
        const r2 = await p2;
        const r3 = await p3;

        assert.is(
            'export const Hello = () => /* @__PURE__ */ createElement("p", { "on:click": () => {\n} }, "hello world!");\n',
            r1
        );
        assert.is(
            'export const Hello = () => /* @__PURE__ */ createElement("p", { "on:click": () => {\n} }, "hello there!");\n',
            r2
        );
        assert.is(
            'export const Hello = () => /* @__PURE__ */ createElement("p", { "on:click": () => {\n} }, "hello three!");\n',
            r3
        );
    });
    test('compilation can be waited for in one go', async () => {
        const results: string[] = [];
        svc('compile')
            .compile(
                'export const Hello = () => <p on:click={() => {}}>hello world!</p>;'
            )
            .then((r) => {
                results.push(r);
            });
        svc('compile')
            .compile(
                'export const Hello = () => <p on:click={() => {}}>hello there!</p>;'
            )
            .then((r) => {
                results.push(r);
            });

        await svc('compile').waitForCompiled();

        assert.deepEqual(
            [
                'export const Hello = () => /* @__PURE__ */ createElement("p", { "on:click": () => {\n} }, "hello world!");\n',
                'export const Hello = () => /* @__PURE__ */ createElement("p", { "on:click": () => {\n} }, "hello there!");\n',
            ],
            results
        );
    });
});
