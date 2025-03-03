export declare class Storage {
    constructor();
    get length(): number;
    setItem(key: string, value: any): void;
    getItem(key: string): any;
    removeItem(key: string): void;
    clear(): void;
}
