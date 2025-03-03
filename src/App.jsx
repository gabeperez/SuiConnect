import { WalletProvider, ConnectButton, useWallet } from '@suiet/wallet-kit';
import { SuiClient } from '@mysten/sui.js/client';
import { SuinsClient } from '@mysten/suins';
import { useEffect, useState, useRef, useMemo } from 'react';
import '@suiet/wallet-kit/style.css';
import './App.css';

// Initialize Sui Client
const suiClient = new SuiClient({ url: 'https://fullnode.mainnet.sui.io/' });

// Token image mapping for known tokens
const KNOWN_TOKEN_IMAGES = {
  'sui::SUI': 'https://suiscan.xyz/images/tokens/sui.png',
  'koto::KOTO': 'https://suiscan.xyz/mainnet/coin/0xa99166e802527eeb5439cbda12b0a02851bf2305d3c96a592b1440014fcb8975::koto::KOTO/icon'
};

// Define a mapping of token types to their image URLs
const TOKEN_IMAGES = {
  'sui::SUI': '/images/sui.png',
  'koto::KOTO': '/images/koto.png',
  // Add more tokens as needed
};

// Helper function to get token image URL - improved to extract from token data
function getTokenImageUrl(token) {
  const display = token.data?.display?.data || {};
  const content = token.data?.content;
  const type = token.data?.type || '';
  
  // Check all possible locations for the image URL
  
  // 1. Check display data
  if (display?.image_url) {
    return display.image_url;
  }
  
  // 2. Check content fields
  if (content?.fields?.url || content?.fields?.image_url) {
    return content.fields.url || content.fields.image_url;
  }
  
  // 3. Check for icon field in display
  if (display?.icon) {
    return display.icon;
  }
  
  // 4. Use our local images for known tokens
  if (type.includes('::sui::SUI')) {
    return '/images/sui.png';
  }
  
  if (type.includes('::koto::KOTO')) {
    return '/images/koto.png';
  }
  
  // No image found
  return null;
}

// Theme management
function useTheme() {
  const [theme, setTheme] = useState(() => {
    // Check local storage first
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) return savedTheme;
    
    // Otherwise use system preference
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  useEffect(() => {
    // Update document class and local storage when theme changes
    document.documentElement.classList.toggle('dark', theme === 'dark');
    localStorage.setItem('theme', theme);
  }, [theme]);

  return [theme, setTheme];
}

function ThemeToggle({ theme, onToggle }) {
  return (
    <button 
      className="theme-toggle" 
      onClick={onToggle} 
      aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
    >
      {theme === 'light' ? '🌙' : '☀️'}
    </button>
  );
}

function CollapsibleCard({ title, children, defaultExpanded = true }) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  return (
    <div className={`info-card ${isExpanded ? 'expanded' : 'collapsed'}`}>
      <div className="card-header" onClick={() => setIsExpanded(!isExpanded)}>
        <h2>{title}</h2>
        <button className="toggle-button">
          {isExpanded ? '−' : '+'}
        </button>
      </div>
      <div className="card-content">
        {children}
      </div>
    </div>
  );
}

function LoadingIndicator() {
  return <div className="loading-indicator">Loading...</div>;
}

function TokenList({ address }) {
  const [tokens, setTokens] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOrder, setSortOrder] = useState('name');
  const [filterType, setFilterType] = useState('all');

  useEffect(() => {
    async function fetchTokens() {
      try {
        setLoading(true);
        setError(null);
        
        // First, get all owned objects
        const response = await suiClient.getOwnedObjects({
          owner: address,
          options: {
            showType: true,
            showContent: true,
            showDisplay: true,
          },
          limit: 50,
        });
        
        console.log('Raw token data:', response.data);
        
        // For each object, fetch its full data to get complete metadata
        const tokenPromises = response.data.map(async (obj) => {
          try {
            // Get detailed object data including display
            const objectData = await suiClient.getObject({
              id: obj.data.objectId,
              options: {
                showType: true,
                showContent: true,
                showDisplay: true,
                showOwner: true,
              }
            });
            
            return {
              ...obj,
              fullData: objectData.data
            };
          } catch (err) {
            console.error(`Error fetching data for object ${obj.data.objectId}:`, err);
            return obj; // Return original object if fetch fails
          }
        });
        
        const tokensWithMetadata = await Promise.all(tokenPromises);
        console.log('Tokens with metadata:', tokensWithMetadata);

        const tokenMap = new Map();
        const nfts = [];

        for (const token of tokensWithMetadata) {
          const fullData = token.fullData || token.data;
          const type = fullData?.type;
          const display = fullData?.display?.data || {};
          const content = fullData?.content;
          
          // Check if this is a fungible token (like SUI or KOTO)
          const isFungibleToken = type?.includes('::sui::SUI') || 
                                type?.includes('::koto::KOTO') ||
                                content?.fields?.balance !== undefined;
          
          console.log('Token type:', type);
          console.log('Token display:', display);
          console.log('Token content:', content);
          
          if (isFungibleToken) {
            const balance = content?.fields?.balance || 1;
            const key = type;
            
            if (tokenMap.has(key)) {
              // Update existing token entry
              const existing = tokenMap.get(key);
              existing.balance += Number(balance);
            } else {
              // Create new token entry
              tokenMap.set(key, {
                ...token,
                balance: Number(balance),
                data: fullData
              });
            }
          } else {
            // This is an NFT or other non-fungible object, keep it separate
            nfts.push({
              ...token,
              balance: 1,
              data: fullData
            });
          }
        }

        // Combine fungible tokens and NFTs
        const allTokens = [...Array.from(tokenMap.values()), ...nfts];
        console.log('Processed tokens:', allTokens);
        setTokens(allTokens);
      } catch (error) {
        console.error('Error fetching tokens:', error);
        setError('Failed to load tokens. Please try again later.');
      } finally {
        setLoading(false);
      }
    }

    if (address) {
      fetchTokens();
    }
  }, [address]);

  // Get unique token types for filter dropdown
  const tokenTypes = useMemo(() => {
    const types = new Set();
    tokens.forEach(token => {
      const type = token.data?.type || '';
      const shortType = type.split('::')[1] || 'unknown';
      types.add(shortType);
    });
    return Array.from(types);
  }, [tokens]);

  // Filter and sort tokens
  const filteredAndSortedTokens = useMemo(() => {
    return tokens
      .filter(token => {
        const display = token.data?.display?.data || {};
        const content = token.data?.content;
        const type = token.data?.type || '';
        const name = display.name || content?.fields?.name || type.split('::').pop();
        
        // Filter by search term
        if (searchTerm && !name.toLowerCase().includes(searchTerm.toLowerCase())) {
          return false;
        }
        
        // Filter by token type
        if (filterType !== 'all') {
          return type.includes(`::${filterType}::`);
        }
        
        return true;
      })
      .sort((a, b) => {
        const getDisplayName = (token) => {
          const display = token.data?.display?.data || {};
          const content = token.data?.content;
          return display.name || content?.fields?.name || token.data?.type?.split('::').pop() || '';
        };
        
        const getType = (token) => token.data?.type || '';

        switch (sortOrder) {
          case 'name':
            return getDisplayName(a).localeCompare(getDisplayName(b));
          case 'type':
            return getType(a).localeCompare(getType(b));
          default:
            return 0;
        }
      });
  }, [tokens, searchTerm, filterType, sortOrder]);

  return (
    <CollapsibleCard title="Tokens & NFTs">
      <div className="token-controls">
        <div className="search-bar">
          <input
            type="text"
            placeholder="Search tokens..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>
        <div className="filter-controls">
          <select 
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="filter-select"
          >
            <option value="all">All Types</option>
            {tokenTypes.map(type => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
          <select 
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
            className="sort-select"
          >
            <option value="name">Sort by Name</option>
            <option value="type">Sort by Type</option>
          </select>
        </div>
      </div>
      <div className="token-list">
        {loading ? (
          <LoadingIndicator />
        ) : error ? (
          <div className="error-message">{error}</div>
        ) : filteredAndSortedTokens.length === 0 ? (
          <div className="empty-state">
            <p>No tokens found</p>
            <small>Connect your wallet to view your tokens</small>
          </div>
        ) : (
          filteredAndSortedTokens.map((token) => {
            const display = token.data?.display?.data || {};
            const content = token.data?.content;
            const type = token.data?.type || 'Unknown Type';
            const shortType = type.split('::').pop().replace(/[<>]/g, '');
            const name = display.name || content?.fields?.name || shortType;
            const balance = token.balance || 1;
            
            return (
              <div key={token.data.objectId || type} className="token-item">
                <div className="token-header">
                  {display.image_url ? (
                    <img 
                      src={display.image_url} 
                      alt={name} 
                      className="token-image"
                      loading="lazy"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.style.display = 'none';
                        const placeholder = document.createElement('div');
                        placeholder.className = 'token-image-placeholder';
                        placeholder.textContent = name.charAt(0).toUpperCase();
                        e.target.parentNode.insertBefore(placeholder, e.target);
                      }}
                    />
                  ) : (
                    <div className="token-image-placeholder">
                      {name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="token-info">
                    <span className="token-name">
                      {name}
                      {balance > 1 && (
                        <span className="token-balance">
                          × {balance.toLocaleString()}
                        </span>
                      )}
                    </span>
                    <span className="token-type">
                      {shortType}
                    </span>
                  </div>
                </div>
                <div className="token-description">
                  {display.description && (
                    <p>{display.description}</p>
                  )}
                </div>
                <a 
                  href={`https://suiexplorer.com/object/${token.data.objectId}?network=mainnet`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="token-link"
                >
                  <span>View in Explorer</span>
                  <span className="link-icon">↗</span>
                </a>
              </div>
            );
          })
        )}
      </div>
    </CollapsibleCard>
  );
}

function TransactionHistory({ address }) {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchTransactions() {
      try {
        setLoading(true);
        setError(null);
        const response = await suiClient.queryTransactionBlocks({
          filter: {
            FromAddress: address
          },
          options: {
            showInput: true,
            showEffects: true,
            showEvents: true,
          },
          limit: 20,
        });

        setTransactions(response.data);
      } catch (error) {
        console.error('Error fetching transactions:', error);
        setError('Failed to load transaction history. Please try again later.');
      } finally {
        setLoading(false);
      }
    }

    if (address) {
      fetchTransactions();
    }
  }, [address]);

  // Format date helper function
  const formatDate = (timestamp) => {
    if (!timestamp) return 'Unknown Date';
    
    try {
      const date = new Date(Number(timestamp));
      if (isNaN(date.getTime())) throw new Error('Invalid date');
      
      return date.toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Unknown Date';
    }
  };

  // Format time helper function
  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    
    try {
      const date = new Date(Number(timestamp));
      if (isNaN(date.getTime())) throw new Error('Invalid date');
      
      return date.toLocaleTimeString(undefined, {
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      console.error('Error formatting time:', error);
      return '';
    }
  };

  // Group transactions by date
  const groupedTransactions = useMemo(() => {
    const groups = {};
    transactions.forEach(tx => {
      const dateKey = formatDate(tx.timestampMs);
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(tx);
    });
    return groups;
  }, [transactions]);

  const getStatusIcon = (status) => {
    switch (status?.toLowerCase()) {
      case 'success':
        return '✓';
      case 'failure':
        return '✕';
      case 'pending':
        return '⋯';
      default:
        return '?';
    }
  };

  const getStatusClass = (status) => {
    switch (status?.toLowerCase()) {
      case 'success':
        return 'status-success';
      case 'failure':
        return 'status-failure';
      case 'pending':
        return 'status-pending';
      default:
        return 'status-unknown';
    }
  };

  if (loading) {
    return <CollapsibleCard title="Transaction History"><LoadingIndicator /></CollapsibleCard>;
  }

  if (error) {
    return (
      <CollapsibleCard title="Transaction History">
        <div className="error-message">{error}</div>
      </CollapsibleCard>
    );
  }

  return (
    <CollapsibleCard title="Transaction History">
      <div className="transaction-list">
        {transactions.length === 0 ? (
          <div className="empty-state">
            <p>No transactions found</p>
            <small>Your transaction history will appear here</small>
          </div>
        ) : (
          Object.entries(groupedTransactions).map(([date, txs]) => (
            <div key={date} className="transaction-group">
              <div className="transaction-date">{date}</div>
              {txs.map((tx) => {
                const status = tx.effects?.status?.status || 'Unknown';
                const statusClass = getStatusClass(status);
                const time = formatTime(tx.timestampMs);
                
                return (
                  <div key={tx.digest} className="transaction-item">
                    <div className="transaction-header">
                      <div className="transaction-info">
                        <span className="transaction-hash">
                          {tx.digest.slice(0, 8)}...{tx.digest.slice(-6)}
                        </span>
                        <span className={`transaction-status ${statusClass}`}>
                          <span className="status-icon">{getStatusIcon(status)}</span>
                          {status}
                        </span>
                      </div>
                      {time && <span className="transaction-time">{time}</span>}
                    </div>
                    <div className="transaction-details">
                      <div className="transaction-meta">
                        <span className="transaction-type">
                          {tx.kind || 'Transaction'}
                        </span>
                      </div>
                      <a 
                        href={`https://suiexplorer.com/txblock/${tx.digest}?network=mainnet`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="transaction-link"
                      >
                        <span>View in Explorer</span>
                        <span className="link-icon">↗</span>
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          ))
        )}
      </div>
    </CollapsibleCard>
  );
}

function useSuiName(address) {
  const [suiName, setSuiName] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function fetchSuiName() {
      if (!address) {
        return;
      }

      try {
        setLoading(true);
        // Use native RPC method to get default name for the address
        const response = await suiClient.resolveNameServiceNames({
          address: address
        });
        
        console.log('Resolved names for address:', response);
        
        // Check if we have data and it's not empty
        if (response?.data && response.data.length > 0) {
          // Extract the name from the data array
          setSuiName(response.data[0]);
        }
      } catch (error) {
        console.error('Error fetching SuiNS name:', error);
        // Don't set suiName - keep it as null to show wallet address instead
      } finally {
        setLoading(false);
      }
    }

    // Only fetch if we have an address (meaning wallet is connected)
    if (address) {
      fetchSuiName();
    } else {
      setSuiName(null); // Reset when disconnected
      setLoading(false);
    }
  }, [address]);

  return { suiName, loading };
}

// Custom connect button with SuiNS support
function CustomConnectButton() {
  const { account, connected, disconnect, select } = useWallet();
  const { suiName, loading } = useSuiName(account?.address);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!connected) {
    return <ConnectButton />;
  }

  // Only show loading state if we're actually fetching
  const displayName = loading 
    ? 'Loading...' 
    : (suiName 
      ? `${suiName}` 
      : `${account.address.slice(0, 6)}...${account.address.slice(-4)}`);

  return (
    <div className="custom-connect-button" ref={dropdownRef}>
      <button 
        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
        className="connect-button"
      >
        <div className="button-content">
          <span className={suiName ? "suins-name-button" : "wallet-address-button"}>
            {displayName}
          </span>
          <span className={`disconnect-icon ${isDropdownOpen ? 'open' : ''}`}>▼</span>
        </div>
      </button>
      {isDropdownOpen && (
        <div className="wallet-dropdown">
          <div className="dropdown-address">
            {suiName && <span className="dropdown-suins-name">{suiName}</span>}
            <span className="dropdown-wallet-address">{account.address}</span>
          </div>
          <button className="dropdown-disconnect" onClick={disconnect}>
            <span>Disconnect</span>
          </button>
        </div>
      )}
    </div>
  );
}

function WalletInfo() {
  const { account, connected, chain } = useWallet();
  const { suiName, loading: nameLoading } = useSuiName(account?.address);

  if (!connected) return null;

  return (
    <section className="wallet-info">
      <CollapsibleCard title="Wallet Information">
        <div className="wallet-details">
          <p>
            <span>Address:</span>
            <span>
              {nameLoading ? (
                'Loading...'
              ) : (
                <>
                  {suiName && <span className="suins-name">{suiName}</span>}
                  <span className="wallet-address">{account?.address}</span>
                </>
              )}
            </span>
          </p>
          <p>Network: <span>{chain?.name}</span></p>
        </div>
      </CollapsibleCard>
      <TokenList address={account?.address} />
      <TransactionHistory address={account?.address} />
    </section>
  );
}

function App() {
  const [theme, setTheme] = useTheme();

  const toggleTheme = () => {
    setTheme(prevTheme => prevTheme === 'light' ? 'dark' : 'light');
  };

  return (
    <WalletProvider>
      <div className="container">
        <header>
          <h1>SuiConnect Demo</h1>
          <div className="header-actions">
            <ThemeToggle theme={theme} onToggle={toggleTheme} />
            <CustomConnectButton />
          </div>
        </header>
        <main>
          <WalletInfo />
        </main>
      </div>
    </WalletProvider>
  );
}

export default App; 