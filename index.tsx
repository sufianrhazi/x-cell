import Gooey, { mount } from '@srhazi/gooey';

import examples from './examples-manifest.json';
import testManifest from './test-manifest.json';

mount(
    document.body,
    <>
        <h1>Index</h1>
        <ul id="index">
            <li>
                <a
                    href={`/node_modules/@srhazi/gooey-test/dist/testrunner/testrunner.html#${testManifest
                        .map((item) => item.src)
                        .join(':')}`}
                >
                    Run Tests
                </a>
            </li>
            <li>
                <a href="/app.html">Run Demo</a>
            </li>
            <li>
                <a href="/game.html">Run Tic Tac Toe</a>
            </li>
        </ul>
    </>
);
