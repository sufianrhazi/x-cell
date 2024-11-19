import { field, flush, mount } from '@srhazi/gooey';
import { afterEach, assert, beforeEach, suite, test } from '@srhazi/gooey-test';
import type { QuickJSHandle } from 'quickjs-emscripten';

import { GarbageDisposal } from './GarbageDisposal';
import type { JavaScriptService } from './js';
import { makeTest } from './js.real';

let testRoot = document.getElementById('test-root')!;

suite('JavaScript VM', () => {
    let real: JavaScriptService = null as unknown as JavaScriptService;
    let garbage = new GarbageDisposal();

    beforeEach(async () => {
        real = await makeTest();
        garbage = new GarbageDisposal();
        testRoot = document.getElementById('test-root')!;
    });

    afterEach(async () => {
        garbage.dispose();
        real.dispose();
    });

    test('it can evaluate basic code', () => {
        assert.is(2, real.vmToHost(real.eval('1 + 1'), garbage.manage));
    });

    test('it can pass resulting objects back', () => {
        const result = real.eval('(() => ({ value: 1 + 1 }))()');
        assert.deepEqual({ value: 2 }, real.vmToHost(result, garbage.manage));
        result.dispose();
    });

    test('a function returned can be called', () => {
        const result = real.eval(
            `(
() => {
    let calls = 0;
    return () => { calls += 1; return calls; };
}
        )()`
        );
        assert.is(
            1,
            real.vmToHost(
                real.ctx.callFunction(result, real.ctx.undefined).unwrap(),
                garbage.manage
            )
        );
        assert.is(
            2,
            real.vmToHost(
                real.ctx.callFunction(result, real.ctx.undefined).unwrap(),
                garbage.manage
            )
        );
        result.dispose();
    });

    test('exact equality can be checked via .eq()', () => {
        const result = real.eval(
            `(
() => {
    let obj = {};
    return () => { return obj; };
}
        )()`
        );
        const a = real.ctx.callFunction(result, real.ctx.undefined).unwrap();
        const b = real.ctx.callFunction(result, real.ctx.undefined).unwrap();
        assert.isFalsy(a === b);
        assert.is(true, real.eq(a, b));
        a.dispose();
        b.dispose();
        result.dispose();
    });

    test('it can access globals defined at eval-time', () => {
        const sets: any = [];
        real.defineProperty(real.ctx.global, 'myValue', {
            get() {
                return real.ctx.newString('hello');
            },
            set(value: QuickJSHandle) {
                sets.push(real.vmToHost(value, garbage.manage));
                return false;
            },
        });
        assert.deepEqual(
            'expected',
            real.vmToHost(
                real.eval(
                    `
(() => {
    const result = myValue;
    myValue = 'written once';
    myValue = 'written again';
    if (result === 'hello') {
        return 'expected';
    }
    return 'unexpected';
})();
                `
                ),
                garbage.manage
            )
        );
        assert.deepEqual(['written once', 'written again'], sets);
    });

    test('defined properties can be removed', () => {
        const revoke = real.defineProperty(real.ctx.global, 'foo', {
            get: () => real.ctx.newString('bar'),
            set: () => true,
        });
        assert.is(
            'string',
            real.vmToHost(real.eval('typeof foo'), garbage.manage)
        );
        assert.is('bar', real.vmToHost(real.eval('foo'), garbage.manage));
        assert.is(
            true,
            real.vmToHost(real.eval('"foo" in this'), garbage.manage)
        );
        revoke();
        assert.is(
            'undefined',
            real.vmToHost(real.eval('typeof foo'), garbage.manage)
        );
        assert.is(
            undefined,
            real.vmToHost(real.eval('this.foo'), garbage.manage)
        );
        assert.is(
            false,
            real.vmToHost(real.eval('"foo" in this'), garbage.manage)
        );
    });

    test('defined properties can have crazy names', () => {
        const revoke = real.defineProperty(real.ctx.global, 'multiple words', {
            get: () => real.ctx.newString('bar'),
            set: () => true,
        });
        assert.is(
            'string',
            real.vmToHost(
                real.eval('typeof this["multiple words"]'),
                garbage.manage
            )
        );
        assert.is(
            'bar',
            real.vmToHost(real.eval('this["multiple words"]'), garbage.manage)
        );
        assert.is(
            true,
            real.vmToHost(real.eval('"multiple words" in this'), garbage.manage)
        );
        revoke();
        assert.is(
            'undefined',
            real.vmToHost(
                real.eval('typeof this["multiple words"]'),
                garbage.manage
            )
        );
        assert.is(
            undefined,
            real.vmToHost(real.eval('this["multiple words"]'), garbage.manage)
        );
        assert.is(
            false,
            real.vmToHost(real.eval('"multiple words" in this'), garbage.manage)
        );
    });

    test('it evaluates in a shared environment', () => {
        real.eval('x = "yes"');
        assert.is('yes', real.vmToHost(real.eval('x'), garbage.manage));
    });

    test('simple proxy can get keys', () => {
        const getKeys = real.eval('((val) => Object.keys(val))');
        const proxy = real.makeSimpleProxy({
            keys: () => {
                return ['foo', 'bar'];
            },
            get: () => {
                throw new Error('Not Implemented');
            },
            has: () => {
                throw new Error('Not Implemented');
            },
            set: () => {
                throw new Error('Not Implemented');
            },
        });

        const result = real.ctx
            .callFunction(getKeys, real.ctx.undefined, [proxy.handle])
            .unwrap();
        assert.deepEqual(['foo', 'bar'], real.vmToHost(result, garbage.manage));
        result.dispose();

        proxy.revoke();
        proxy.dispose();
        getKeys.dispose();
    });

    test('simple proxy can handle reads', () => {
        const proxy = real.makeSimpleProxy({
            keys: () => {
                return ['foo', 'bar'];
            },
            get: (prop) => {
                if (prop === 'foo') {
                    return real.ctx.newString('one');
                }
                if (prop === 'bar') {
                    return real.ctx.newString('two');
                }
                return real.ctx.undefined;
            },
            has: () => {
                throw new Error('Not Implemented');
            },
            set: () => {
                throw new Error('Not Implemented');
            },
        });

        assert.is(
            'one',
            real.vmToHost(real.ctx.getProp(proxy.handle, 'foo'), garbage.manage)
        );
        assert.is(
            'two',
            real.vmToHost(real.ctx.getProp(proxy.handle, 'bar'), garbage.manage)
        );
        assert.is(
            undefined,
            real.vmToHost(real.ctx.getProp(proxy.handle, 'baz'), garbage.manage)
        );

        proxy.revoke();
        proxy.dispose();
    });

    test('simple proxy can handle writes', () => {
        const sets: { key: string; value: QuickJSHandle }[] = [];
        const proxy = real.makeSimpleProxy({
            keys: () => {
                return ['foo', 'bar'];
            },
            get: (key) => {
                if (key === 'foo') {
                    return real.ctx.newString('magic:one');
                }
                if (key === 'bar') {
                    return real.ctx.newString('magic:two');
                }
                if (key === 'baz') {
                    return real.ctx.newString('magic:three');
                }
                return real.ctx.undefined;
            },
            has: () => {
                throw new Error('Not Implemented');
            },
            set: (key, val) => {
                sets.push({ key: key, value: val.dup() });
                return key === 'foo' || key === 'bar';
            },
        });
        real.ctx.setProp(real.ctx.global, 'p', proxy.handle);

        assert.is(
            'magic:one',
            real.vmToHost(real.eval('p.foo'), garbage.manage)
        );
        assert.is(
            'magic:two',
            real.vmToHost(real.eval('p.bar'), garbage.manage)
        );
        assert.is(
            'magic:three',
            real.vmToHost(real.eval('p.baz'), garbage.manage)
        );

        real.eval('p.foo = { val: "one" };').dispose();
        real.eval('p.bar = { val: "two" };').dispose();
        real.eval('p.baz = { val: "three" };').dispose();

        assert.is(
            'magic:one',
            real.vmToHost(real.eval('p.foo'), garbage.manage)
        );
        assert.is(
            'magic:two',
            real.vmToHost(real.eval('p.bar'), garbage.manage)
        );
        assert.is(
            'magic:three',
            real.vmToHost(real.eval('p.baz'), garbage.manage)
        );

        assert.deepEqual('foo', sets[0].key);
        assert.deepEqual(
            { val: 'one' },
            real.vmToHost(sets[0].value, garbage.manage)
        );
        assert.deepEqual('bar', sets[1].key);
        assert.deepEqual(
            { val: 'two' },
            real.vmToHost(sets[1].value, garbage.manage)
        );
        assert.deepEqual('baz', sets[2].key);
        assert.deepEqual(
            { val: 'three' },
            real.vmToHost(sets[2].value, garbage.manage)
        );

        sets[0].value.dispose();
        sets[1].value.dispose();
        sets[2].value.dispose();

        proxy.revoke();
        proxy.dispose();
    });

    test('simple proxy can handle has checks', () => {
        const proxy = real.makeSimpleProxy({
            keys: () => {
                return ['foo', 'bar'];
            },
            get: (key) => {
                return real.ctx.newString('whatever');
            },
            has: (key) => {
                return key === 'foo' || key === 'bar' || key === 'baz';
            },
            set: (key, val) => {
                return key === 'foo' || key === 'bar';
            },
        });
        real.ctx.setProp(real.ctx.global, 'p', proxy.handle);

        assert.is(true, real.vmToHost(real.eval('"foo" in p'), garbage.manage));
        assert.is(true, real.vmToHost(real.eval('"bar" in p'), garbage.manage));
        assert.is(true, real.vmToHost(real.eval('"baz" in p'), garbage.manage));
        assert.is(
            false,
            real.vmToHost(real.eval('"bum" in p'), garbage.manage)
        );

        proxy.revoke();
        proxy.dispose();
    });

    test('functions can be passed from host to vm, calling the function from within the vm calls the host function', () => {
        const log: string[] = [];
        const hostFunction = () => {
            log.push('call');
        };
        using handle = real.hostToVm(hostFunction, garbage.manage);
        real.ctx.setProp(real.ctx.global, 'hostFunctionWrapper', handle);

        using v1 = real.eval('typeof hostFunctionWrapper');
        assert.is('function', real.vmToHost(v1, garbage.manage));

        assert.deepEqual([], log);
        real.eval('hostFunctionWrapper()').dispose();
        assert.deepEqual(['call'], log);
    });

    test('function parameters can be passed from host to vm', () => {
        const log: { val: string }[] = [];
        const hostFunction = (param: { val: string }) => {
            log.push(param);
        };
        using handle = real.hostToVm(hostFunction, garbage.manage);
        real.ctx.setProp(real.ctx.global, 'hostFunctionWrapper', handle);

        using v1 = real.eval('typeof hostFunctionWrapper');
        assert.is('function', real.vmToHost(v1, garbage.manage));

        assert.deepEqual([], log);
        real.eval('hostFunctionWrapper({ val: "yes" })').dispose();
        assert.deepEqual([{ val: 'yes' }], log);
    });

    test('function values can be returned from host to vm', () => {
        const hostFunction = () => {
            return {
                hello: 'there',
            };
        };
        using handle = real.hostToVm(hostFunction, garbage.manage);
        real.ctx.setProp(real.ctx.global, 'hostFunctionWrapper', handle);

        using v1 = real.eval('typeof hostFunctionWrapper');
        assert.is('function', real.vmToHost(v1, garbage.manage));

        using v2 = real.eval('hostFunctionWrapper()');
        assert.deepEqual({ hello: 'there' }, real.vmToHost(v2, garbage.manage));
    });

    test('functions can be passed from vm to host, calling the function from the host calls the vm function', () => {
        real.eval('calls = 0').dispose();
        real.eval('myFunc = () => { calls += 1; }').dispose();
        using vmFunc = real.eval('myFunc');
        const hostFunc = real.vmToHost(vmFunc, garbage.manage);

        using calls1 = real.eval('calls');
        assert.is(0, real.vmToHost(calls1, garbage.manage));

        hostFunc();

        using calls2 = real.eval('calls');
        assert.is(1, real.vmToHost(calls2, garbage.manage));
    });

    test('function parameters can be passed from vm to host', () => {
        real.eval('items = []').dispose();
        real.eval('myFunc = (param) => { items.push(param); }').dispose();
        using vmFunc = real.eval('myFunc');
        const hostFunc = real.vmToHost(vmFunc, garbage.manage);

        using items1 = real.eval('items');
        assert.deepEqual([], real.vmToHost(items1, garbage.manage));

        hostFunc({ val: 'hello' });

        using items2 = real.eval('items');
        assert.deepEqual(
            [{ val: 'hello' }],
            real.vmToHost(items2, garbage.manage)
        );
    });

    test('function values can be returned from vm to host', () => {
        real.eval(
            'myFunc = (param) => { return { cool: "it works" }; }'
        ).dispose();
        using vmFunc = real.eval('myFunc');
        const hostFunc = real.vmToHost(vmFunc, garbage.manage);

        assert.deepEqual({ cool: 'it works' }, hostFunc());
    });

    test('jsx can be rendered', () => {
        using val = real.eval(
            'JSX.createElement("p", {}, [JSX.createElement("span", {}, ["hello"]), "world"])'
        );
        const result = real.vmToHost(val, garbage.manage);
        const unmount = mount(testRoot, result);
        assert.is('<p><span>hello</span>world</p>', testRoot.innerHTML);
        unmount();
    });

    test('jsx with calc can be rendered and is bound to the DOM', () => {
        const greeting = field('hello');
        real.defineProperty(real.ctx.global, 'greeting', {
            get() {
                return real.ctx.newString(greeting.get());
            },
            set() {
                throw new Error('Setting not allowed');
            },
        });
        using val = real.eval(
            'JSX.createElement("p", {}, [JSX.createElement("span", {}, [calc(() => greeting)]), "world"])'
        );
        const result = real.vmToHost(val, garbage.manage);
        const unmount = mount(testRoot, result);
        assert.is('<p><span>hello</span>world</p>', testRoot.innerHTML);
        greeting.set('Howdy');
        flush();
        assert.is('<p><span>Howdy</span>world</p>', testRoot.innerHTML);
        greeting.set('Goodbye');
        flush();
        assert.is('<p><span>Goodbye</span>world</p>', testRoot.innerHTML);
        unmount();
    });

    test('jsx with fragment can be rendered and is bound to the DOM', () => {
        const greeting = field('hello');
        real.defineProperty(real.ctx.global, 'greeting', {
            get() {
                return real.ctx.newString(greeting.get());
            },
            set() {
                throw new Error('Setting not allowed');
            },
        });
        using val = real.eval(
            'JSX.createElement("p", {}, [JSX.Fragment({ children: [calc(() => greeting), " world"] })])'
        );
        const result = real.vmToHost(val, garbage.manage);
        const unmount = mount(testRoot, result);
        assert.is('<p>hello world</p>', testRoot.innerHTML);
        greeting.set('Howdy');
        flush();
        assert.is('<p>Howdy world</p>', testRoot.innerHTML);
        greeting.set('Goodbye');
        flush();
        assert.is('<p>Goodbye world</p>', testRoot.innerHTML);
        unmount();
    });
});
