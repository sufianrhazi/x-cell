import * as esbuild from 'esbuild-wasm';

import type { CompileService } from './compile';
import type { Promised } from './promised';
import { makePromised } from './promised';

type CompilationQueueItem = {
    code: string;
    promised: Promised<string>;
};

class RealCompileService implements CompileService {
    #queue: CompilationQueueItem[];
    #waitPromised: Promised<void>;
    #running: boolean;

    constructor() {
        this.#running = false;
        this.#queue = [];
        this.#waitPromised = {
            promise: Promise.resolve(),
            resolve: () => {},
            reject: () => {},
        };
    }

    private pump() {
        if (this.#running) {
            return;
        }
        const entry = this.#queue.shift();
        if (!entry) {
            this.#waitPromised.resolve();
            return;
        }
        this.#running = true;
        esbuild
            .transform(entry.code, {
                sourcemap: true,
                legalComments: 'none',
                target: 'es2015',
                platform: 'browser',
                minify: false,
                jsxFactory: 'JSX.createElement',
                jsxFragment: 'JSX.Fragment',
                loader: 'jsx',
            })
            .then(
                (result) => {
                    this.#running = false;
                    entry.promised.resolve(result.code);
                    this.pump();
                },
                (err) => {
                    this.#running = false;
                    entry.promised.reject(err);
                    this.pump();
                }
            );
    }

    compile(code: string) {
        if (this.#queue.length === 0) {
            this.#waitPromised = makePromised();
        }
        const promised = makePromised<string>();
        this.#queue.push({ code, promised });
        this.pump();
        return promised.promise;
    }

    waitForCompiled() {
        return this.#waitPromised.promise;
    }
}

export function makeReal() {
    return new RealCompileService();
}
