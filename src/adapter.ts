import {
    AdapterName,
    EIP1193Provider,
    TypedData
} from "@hadron/abstract-adapter-evm";

import {
    Adapter,
    WalletReadyState,
    WalletNotFoundError,
    WalletConnectionError,
    isInMobileBrowser,
    WalletDisconnectedError
} from "@hadron/abstract-adapter-evm";

import {
    getMetaMaskProvider,
    isMetaMaskMobileWebView,
    openMetaMaskWithDeeplink
} from './utils.js';

// Extend the global Window interface to include the Ethereum provider
declare global {
    interface Window {
        ethereum?: EIP1193Provider;
    }
}

// Adapter-specific configuration options
export interface MetaMaskAdapterOptions {
    useDeeplink?: boolean; // Enable deep linking for mobile
}

// Define the constant name of the adapter
export const MetaMaskAdapterName = 'Metamask' as AdapterName<'Metamask'>;

/**
 * MetaMaskAdapter: A wallet adapter to integrate MetaMask via EIP-1193 provider
 */
export class MetaMaskAdapter extends Adapter {
    // Unique adapter name
    name = MetaMaskAdapterName;

    // Icon (MetaMask logo in base64 SVG format)
    icon = 'data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0idXRmLTgiPz4KPHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHhtbDpzcGFjZT0icHJlc2VydmUiIGlkPSJMYXllcl8xIiB4PSIwIiB5PSIwIiB2ZXJzaW9uPSIxLjEiIHZpZXdCb3g9IjAgMCAzMTguNiAzMTguNiI+CiAgPHN0eWxlPgogICAgLnN0MSwuc3Q2e2ZpbGw6I2U0NzYxYjtzdHJva2U6I2U0NzYxYjtzdHJva2UtbGluZWNhcDpyb3VuZDtzdHJva2UtbGluZWpvaW46cm91bmR9LnN0NntmaWxsOiNmNjg1MWI7c3Ryb2tlOiNmNjg1MWJ9CiAgPC9zdHlsZT4KICA8cGF0aCBmaWxsPSIjZTI3NjFiIiBzdHJva2U9IiNlMjc2MWIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIgZD0ibTI3NC4xIDM1LjUtOTkuNSA3My45TDE5MyA2NS44eiIvPgogIDxwYXRoIGQ9Im00NC40IDM1LjUgOTguNyA3NC42LTE3LjUtNDQuM3ptMTkzLjkgMTcxLjMtMjYuNSA0MC42IDU2LjcgMTUuNiAxNi4zLTU1LjN6bS0yMDQuNC45TDUwLjEgMjYzbDU2LjctMTUuNi0yNi41LTQwLjZ6IiBjbGFzcz0ic3QxIi8+CiAgPHBhdGggZD0ibTEwMy42IDEzOC4yLTE1LjggMjMuOSA1Ni4zIDIuNS0yLTYwLjV6bTExMS4zIDAtMzktMzQuOC0xLjMgNjEuMiA1Ni4yLTIuNXpNMTA2LjggMjQ3LjRsMzMuOC0xNi41LTI5LjItMjIuOHptNzEuMS0xNi41IDMzLjkgMTYuNS00LjctMzkuM3oiIGNsYXNzPSJzdDEiLz4KICA8cGF0aCBmaWxsPSIjZDdjMWIzIiBzdHJva2U9IiNkN2MxYjMiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIgZD0ibTIxMS44IDI0Ny40LTMzLjktMTYuNSAyLjcgMjIuMS0uMyA5LjN6bS0xMDUgMCAzMS41IDE0LjktLjItOS4zIDIuNS0yMi4xeiIvPgogIDxwYXRoIGZpbGw9IiMyMzM0NDciIHN0cm9rZT0iIzIzMzQ0NyIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIiBkPSJtMTM4LjggMTkzLjUtMjguMi04LjMgMTkuOS05LjF6bTQwLjkgMCA4LjMtMTcuNCAyMCA5LjF6Ii8+CiAgPHBhdGggZmlsbD0iI2NkNjExNiIgc3Ryb2tlPSIjY2Q2MTE2IiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiIGQ9Im0xMDYuOCAyNDcuNCA0LjgtNDAuNi0zMS4zLjl6TTIwNyAyMDYuOGw0LjggNDAuNiAyNi41LTM5Ljd6bTIzLjgtNDQuNy01Ni4yIDIuNSA1LjIgMjguOSA4LjMtMTcuNCAyMCA5LjF6bS0xMjAuMiAyMy4xIDIwLTkuMSA4LjIgMTcuNCA1LjMtMjguOS01Ni4zLTIuNXoiLz4KICA8cGF0aCBmaWxsPSIjZTQ3NTFmIiBzdHJva2U9IiNlNDc1MWYiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIgZD0ibTg3LjggMTYyLjEgMjMuNiA0Ni0uOC0yMi45em0xMjAuMyAyMy4xLTEgMjIuOSAyMy43LTQ2em0tNjQtMjAuNi01LjMgMjguOSA2LjYgMzQuMSAxLjUtNDQuOXptMzAuNSAwLTIuNyAxOCAxLjIgNDUgNi43LTM0LjF6Ii8+CiAgPHBhdGggZD0ibTE3OS44IDE5My41LTYuNyAzNC4xIDQuOCAzLjMgMjkuMi0yMi44IDEtMjIuOXptLTY5LjItOC4zLjggMjIuOSAyOS4yIDIyLjggNC44LTMuMy02LjYtMzQuMXoiIGNsYXNzPSJzdDYiLz4KICA8cGF0aCBmaWxsPSIjYzBhZDllIiBzdHJva2U9IiNjMGFkOWUiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIgZD0ibTE4MC4zIDI2Mi4zLjMtOS4zLTIuNS0yLjJoLTM3LjdsLTIuMyAyLjIuMiA5LjMtMzEuNS0xNC45IDExIDkgMjIuMyAxNS41aDM4LjNsMjIuNC0xNS41IDExLTl6Ii8+CiAgPHBhdGggZmlsbD0iIzE2MTYxNiIgc3Ryb2tlPSIjMTYxNjE2IiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiIGQ9Im0xNzcuOSAyMzAuOS00LjgtMy4zaC0yNy43bC00LjggMy4zLTIuNSAyMi4xIDIuMy0yLjJoMzcuN2wyLjUgMi4yeiIvPgogIDxwYXRoIGZpbGw9IiM3NjNkMTYiIHN0cm9rZT0iIzc2M2QxNiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIiBkPSJtMjc4LjMgMTE0LjIgOC41LTQwLjgtMTIuNy0zNy45LTk2LjIgNzEuNCAzNyAzMS4zIDUyLjMgMTUuMyAxMS42LTEzLjUtNS0zLjYgOC03LjMtNi4yLTQuOCA4LTYuMXpNMzEuOCA3My40bDguNSA0MC44LTUuNCA0IDggNi4xLTYuMSA0LjggOCA3LjMtNSAzLjYgMTEuNSAxMy41IDUyLjMtMTUuMyAzNy0zMS4zLTk2LjItNzEuNHoiLz4KICA8cGF0aCBkPSJtMjY3LjIgMTUzLjUtNTIuMy0xNS4zIDE1LjkgMjMuOS0yMy43IDQ2IDMxLjItLjRoNDYuNXptLTE2My42LTE1LjMtNTIuMyAxNS4zLTE3LjQgNTQuMmg0Ni40bDMxLjEuNC0yMy42LTQ2em03MSAyNi40IDMuMy01Ny43IDE1LjItNDEuMWgtNjcuNWwxNSA0MS4xIDMuNSA1Ny43IDEuMiAxOC4yLjEgNDQuOGgyNy43bC4yLTQ0Ljh6IiBjbGFzcz0ic3Q2Ii8+Cjwvc3ZnPg=='; // <-- Replace with actual base64 icon

    // MetaMask official website
    url = 'https://metamask.io';

    // Current readiness state of MetaMask wallet
    readyState = WalletReadyState.Loading;

    // The currently connected Ethereum address
    address: string | null = null;

    // Flag to prevent multiple simultaneous connections
    connecting: boolean = false;

    // Adapter options provided by the user
    options: MetaMaskAdapterOptions;

    // Internal memoized promise to get the provider once
    private getProviderPromise: Promise<EIP1193Provider | null> | null = null;

    constructor(options: MetaMaskAdapterOptions = { useDeeplink: true }) {
        super();
        this.options = options;

        // Attempt to get MetaMask provider immediately
        const provider = getMetaMaskProvider();

        console.log(provider)

        if (provider) {
            this.readyState = WalletReadyState.Found;
            this.listenEvents(provider);
            // this.autoConnect(provider);
        } else {
            // If not found, wait for provider to initialize
            this.getProvider().then((res) => {
                if (res) {
                    this.readyState = WalletReadyState.Found;
                    this.listenEvents(res);
                    // this.autoConnect(res);
                } else {
                    this.readyState = WalletReadyState.NotFound;
                }
                this.emit('readyStateChanged', this.readyState);
            });
        }
    }

    /**
     * Connect to MetaMask wallet and request user accounts
     */
    async connect(): Promise<string> {
        // On mobile, if not inside MetaMask WebView, redirect via deep link
        if (this.options.useDeeplink !== false) {
            if (isInMobileBrowser() && !isMetaMaskMobileWebView()) {
                openMetaMaskWithDeeplink();
                return '';
            }
        }

        this.connecting = true;

        const provider = await this.getProvider();

        console.log("getProvider ----------------->",provider)
        if (!provider) throw new WalletNotFoundError();

        // Prompt user to connect their wallet
        const accounts = await provider.request<undefined, string[]>({
            method: 'eth_requestAccounts'
        });

        console.log("accounts ----------------->",accounts)

        if (!accounts.length) {
            throw new WalletConnectionError("No accounts are available.");
        }

        this.address = accounts[0];
        this.connecting = false;
        return this.address;
    }

    /**
     * Sign EIP-712 typed data using MetaMask
     */
    async signTypedData({
        typedData,
        address = this.address as string
    }: {
        typedData: TypedData;
        address?: string;
    }): Promise<string> {
        const provider = await this.prepareProvider();
        if (!this.connected) throw new WalletDisconnectedError();

        return provider.request<[string, string], string>({
            method: 'eth_signTypedData_v4',
            params: [
                address,
                typeof typedData === 'string'
                    ? typedData
                    : JSON.stringify(typedData)
            ]
        });
    }

    /**
     * Get MetaMask provider instance (with support for event-based detection)
     */
    async getProvider(): Promise<EIP1193Provider | null> {
        // Deep link support skips provider resolution in some mobile cases
        if (isInMobileBrowser() && !isMetaMaskMobileWebView()) {
            return null;
        }

        // Return existing promise to avoid duplicate listeners
        if (this.getProviderPromise) {
            return this.getProviderPromise;
        }

        this.getProviderPromise = new Promise((resolve) => {
            const provider = getMetaMaskProvider();
            if (provider) return resolve(provider);

            let handled = false;

            const handleEthereum = () => {
                if (handled) return;
                handled = true;

                window.removeEventListener('ethereum#initialized', handleEthereum);
                const provider = getMetaMaskProvider();

                if (provider) {
                    resolve(provider);
                } else {
                    console.error('MetaMaskAdapter: Unable to detect window.ethereum.');
                    resolve(null);
                }
            };

            // Wait for the ethereum provider to be injected by MetaMask
            window.addEventListener('ethereum#initialized', handleEthereum, { once: true });

            // Fallback after timeout if MetaMask fails to emit event
            setTimeout(() => {
                handleEthereum();
            }, 3000);
        });

        return this.getProviderPromise;
    }

    /**
     * Listen to wallet events such as account and chain changes
     */
    private listenEvents(provider: EIP1193Provider) {
        provider.on('connect', (info) => {
            this.emit('connect', info);
        });

        provider.on('disconnect', (error) => {
            this.emit('disconnect', error);
        });

        provider.on('accountsChanged', this.onAccountsChanged);

        provider.on('chainChanged', (chainId) => {
            this.emit('chainChanged', chainId);
        });
    }

    /**
     * Handle changes in connected accounts
     */
    private onAccountsChanged = (accounts: string[]) => {
        this.address = accounts.length > 0 ? accounts[0] : null;
        this.emit('accountsChanged', accounts);
    };

    /**
     * Automatically connect to wallet if previously authorized
     */
    private async autoConnect(provider: EIP1193Provider) {
        const accounts = await provider.request<undefined, string[]>({
            method: 'eth_accounts'
        });

        console.log("autoConnect - accounts",accounts)
        this.address = accounts?.[0] || null;

        if (this.address) {
            this.emit('accountsChanged', accounts);
        }
    }
}
