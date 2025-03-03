export interface UseAccountBalanceParams {
    typeArg?: string;
    chainId?: string;
}
export declare function useAccountBalance(params?: UseAccountBalanceParams): import("react-query").UseQueryResult<bigint, unknown> & {
    balance: bigint | undefined;
    loading: boolean;
};
