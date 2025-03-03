export interface UseCoinBalanceParams {
    address?: string;
    typeArg?: string;
    chainId?: string;
}
/**
 * use the account balance of one specific coin (SUI by default)
 * @param params
 */
export declare function useCoinBalance(params?: UseCoinBalanceParams): import("react-query").UseQueryResult<bigint, unknown>;
