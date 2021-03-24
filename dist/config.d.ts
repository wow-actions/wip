import { Octokit, Section } from './types';
export declare namespace Config {
    const defaultConfig: Section;
    function get(octokit: Octokit): Promise<{
        configs: Section[];
        manual: boolean;
    } | {
        configs: Section[];
        manual?: undefined;
    }>;
}
