declare class SyncmetadataModel {
    static getOne(filters: {
        [key: string]: any;
    }): Promise<import("@/utils/shared/fnOutputHandler").OutputProps>;
    static create(data: any): Promise<import("@/utils/shared/fnOutputHandler").OutputProps>;
    static update(id: any, data: any): Promise<import("@/utils/shared/fnOutputHandler").OutputProps>;
    static delete(id: any): Promise<import("@/utils/shared/fnOutputHandler").OutputProps>;
}
export default SyncmetadataModel;
