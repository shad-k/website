import { EmptyWalletSubprovider, RPCSubprovider, Web3ProviderEngine } from '@0x/subproviders';
import { providerUtils } from '@0x/utils';
import { ZeroExProvider } from 'ethereum-types';
import _ from 'lodash';

import { Maybe, Network } from 'ts/types';
import { configs } from 'ts/utils/configs';

const { PUBLIC_NODE_URLS_BY_NETWORK_ID } = configs;

// TODO(kimpers): Copied from instant, migrate to a package that can be shared
export const providerFactory = {
    getInjectedProviderIfExists: (): Maybe<ZeroExProvider> => {
        const injectedProviderIfExists = (window as any).ethereum;
        if (injectedProviderIfExists !== undefined) {
            return injectedProviderIfExists;
            // const provider = providerUtils.standardizeOrThrow(injectedProviderIfExists);
            // return provider;
        }
        const injectedWeb3IfExists = (window as any).web3;
        if (injectedWeb3IfExists !== undefined && injectedWeb3IfExists.currentProvider !== undefined) {
            const currentProvider = injectedWeb3IfExists.currentProvider;
            const provider = providerUtils.standardizeOrThrow(currentProvider);
            return provider;
        }
        return undefined;
    },

    getWalletLinkProvider: (walletLinkProvider: any): ZeroExProvider => {
        // NOTE: chainId will not update depending on the user's setting in the Coinbase Wallet app like with MetaMask

        if (!walletLinkProvider || !walletLinkProvider.enable) {
            throw new Error('Failed to connect to WalletLink');
        }

        // HACK(kimpers): TEMPORARY HACK until we revamp wallet handling
        // Currently can't use standardizeOrThrow because it's checking this.accounts.length to
        // determine if we are already connected which does not exist in WalletLink
        const standardizedProvider: ZeroExProvider = {
            isMetaMask: false,
            isParity: false,
            stop: _.noop.bind(_),
            enable: (walletLinkProvider.enable).bind(walletLinkProvider),
            sendAsync: (walletLinkProvider.sendAsync).bind(walletLinkProvider),
        };

        return standardizedProvider;
    },

    getWalletConnectProvider: (walletConnectProvider: any): ZeroExProvider => {
        if (!walletConnectProvider || !walletConnectProvider.enable) {
            throw new Error('Failed to connect to WalletConnect');
        }

        const standardizedProvider: ZeroExProvider = {
            isMetaMask: false,
            isParity: false,
            stop: _.noop.bind(_),
            enable: (walletConnectProvider.enable).bind(walletConnectProvider),
            sendAsync: (walletConnectProvider.send).bind(walletConnectProvider),
        };
        return standardizedProvider;
    },

    getFallbackNoSigningProvider: (network: Network): Web3ProviderEngine => {
        const providerEngine = new Web3ProviderEngine();
        // Intercept calls to `eth_accounts` and always return empty
        providerEngine.addProvider(new EmptyWalletSubprovider());
        // Construct an RPC subprovider, all data based requests will be sent via the RPCSubprovider
        // TODO(bmillman): make this more resilient to infura failures
        const rpcUrl = PUBLIC_NODE_URLS_BY_NETWORK_ID[network][0];
        providerEngine.addProvider(new RPCSubprovider(rpcUrl));
        // Start the Provider Engine
        providerUtils.startProviderEngine(providerEngine);
        return providerEngine;
    },
};
