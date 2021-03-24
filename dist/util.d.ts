import { Octokit, Location, State } from './types';
export declare namespace Util {
    function getOctokit(): {
        [x: string]: any;
    } & {
        [x: string]: any;
    } & import("@octokit/core").Octokit & import("@octokit/plugin-rest-endpoint-methods/dist-types/generated/method-types").RestEndpointMethods & {
        paginate: import("@octokit/plugin-paginate-rest").PaginateInterface;
    };
    function getFileContent(octokit: Octokit, path: string): Promise<string | null>;
    function getCommitSubjects(octokit: Octokit): Promise<string[]>;
    const getMatcher: (terms: string[], locations: Location[]) => (location: Location, text: string) => {
        location: Location;
        text: string;
        match: string;
    } | null;
    function getOutput(nextStatus: State): {
        title?: string | undefined;
        summary?: string | undefined;
        text?: string | undefined;
    };
}
