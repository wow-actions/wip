export declare namespace Util {
    function getOctokit(): {
        [x: string]: any;
    } & {
        [x: string]: any;
    } & import("@octokit/core").Octokit & import("@octokit/plugin-rest-endpoint-methods/dist-types/generated/method-types").RestEndpointMethods & {
        paginate: import("@octokit/plugin-paginate-rest").PaginateInterface;
    };
    function getBlockingLabels(): string[];
    function getBlockingKeywords(): string[];
    function getWIPDescription(): string;
    function getReadyDescription(): string;
    function getContect(): string;
    function getTargetUrl(): string | undefined;
}
