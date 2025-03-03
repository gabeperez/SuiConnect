import { useWallet } from '@suiet/wallet-kit';
import { SuiClient } from '@mysten/sui.js/client';
import { useEffect, useState } from 'react';

const suiClient = new SuiClient({ url: 'https://fullnode.mainnet.sui.io/' });

export function useWalletIntegration() {
  const { account, connected, chain } = useWallet();
  const [tokens, setTokens] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchWalletData() {
      if (!account?.address) return;

      try {
        // Fetch tokens
        const tokenResponse = await suiClient.getOwnedObjects({
          owner: account.address,
          options: {
            showType: true,
            showContent: true,
            showDisplay: true,
          },
          limit: 50
        });

        // Fetch transactions
        const txResponse = await suiClient.queryTransactionBlocks({
          filter: {
            FromAddress: account.address
          },
          options: {
            showInput: true,
            showEffects: true,
            showEvents: true,
          },
          limit: 20,
        });

        setTokens(tokenResponse.data);
        setTransactions(txResponse.data);
      } catch (error) {
        console.error('Error fetching wallet data:', error);
      } finally {
        setLoading(false);
      }
    }

    if (connected) {
      fetchWalletData();
    }
  }, [account?.address, connected]);

  // Helper functions for suisports.club
  const checkTokenOwnership = (tokenType) => {
    return tokens.some(token => token.data?.type === tokenType);
  };

  const getTokensByType = (tokenType) => {
    return tokens.filter(token => token.data?.type === tokenType);
  };

  const getRecentTransactions = (limit = 5) => {
    return transactions.slice(0, limit);
  };

  return {
    walletAddress: account?.address,
    isConnected: connected,
    network: chain?.name,
    loading,
    checkTokenOwnership,
    getTokensByType,
    getRecentTransactions,
    tokens,
    transactions
  };
} 