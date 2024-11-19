/**
 * This service manages asynchronous, queued compilation via esbuild.
 *
 * It's used so that tests can wait for pending compilations to complete, and
 * so that pending compilations can be cancelled.
 */
export interface CompileService {
    compile: (code: string) => Promise<string>;

    waitForCompiled: () => Promise<void>;
}
