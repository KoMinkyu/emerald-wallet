import thunkMiddleware from 'redux-thunk';
import createLogger from 'redux-logger';
import { createStore, applyMiddleware, combineReducers } from 'redux';
import { reducer as formReducer } from 'redux-form';
import { ipcRenderer } from 'electron';
import log from 'electron-log';
import { loadAccountsList, refreshTrackedTransactions, loadPendingTransactions,
    getGasPrice, getExchangeRates } from './accountActions';
// import { loadAddressBook } from './addressActions';
// import { loadTokenList } from './tokenActions';
// import { loadContractList } from './contractActions';
import { loadSyncing, loadHeight, loadPeerCount, loadNetworkVersion } from './networkActions'
import { gotoScreen } from './screenActions';
import { readConfig, listenElectron, connecting, loadClientVersion } from './launcherActions';
import { watchConnection as waitLedger, setWatch, setBaseHD } from './ledgerActions';

import accountsReducers from './accountReducers';
import addressReducers from './addressReducers';
import tokenReducers from './tokenReducers';
import contractReducers from './contractReducers';
import networkReducers from './networkReducers';
import screenReducers from './screenReducers';
import launcherReducers from './launcherReducers';
import ledgerReducers from './ledgerReducers';

const second = 1000;
const minute = 60 * second;
export const intervalRates = {
    second, // (whilei) this must be the newfangled object-shorthand...?
    minute,
    // (whilei: development: loading so often slows things a lot for me and clutters logs; that's why I have
    // stand-in times here for development)
    // Continue is repeating timeouts.
    continueLoadSyncRate: minute, // prod: second
    continueLoadHeightRate: 5 * minute, // prod: 5 * second
    continueRefreshAllTxRate: 30 * second, // prod: 2 * second
    continueRefreshLongRate: 900 * second, // 5 o'clock somewhere.
};

const stateTransformer = (state) => ({
    accounts: state.accounts.toJS(),
    addressBook: state.addressBook.toJS(),
    tokens: state.tokens.toJS(),
    contracts: state.contracts.toJS(),
    screen: state.screen.toJS(),
    network: state.network.toJS(),
    launcher: state.launcher.toJS(),
    ledger: state.ledger.toJS(),
    form: state.form,
});

const loggerMiddleware = createLogger({
    stateTransformer,
});

const reducers = {
    accounts: accountsReducers,
    addressBook: addressReducers,
    tokens: tokenReducers,
    contracts: contractReducers,
    screen: screenReducers,
    network: networkReducers,
    launcher: launcherReducers,
    ledger: ledgerReducers,
    form: formReducer,
};

export const store = createStore(
    combineReducers(reducers),
    applyMiddleware(
        thunkMiddleware,
        loggerMiddleware
    )
);

function refreshAll() {
    //store.dispatch(loadNetworkVersion());
    store.dispatch(refreshTrackedTransactions());
    store.dispatch(loadHeight());
    store.dispatch(loadAccountsList());

    const state = store.getState();
    if (state.launcher.getIn(['geth', 'type']) === 'local') {
        store.dispatch(loadPeerCount());
    }
    setTimeout(refreshAll, intervalRates.continueRefreshAllTxRate);
}

function refreshLong() {
    store.dispatch(getExchangeRates());
    setTimeout(refreshLong, intervalRates.continueRefreshLongRate);
}

export function startSync() {
    store.dispatch(getGasPrice());
    store.dispatch(loadClientVersion());
    // store.dispatch(loadAddressBook());
    // store.dispatch(loadTokenList());
    // store.dispatch(loadContractList());

    const state = store.getState();

    const chain = state.launcher.getIn(['chain', 'name']);
    if (chain === 'mainnet') {
        store.dispatch(setBaseHD("44'/61'/0'/0"));
    } else if (chain === 'morden') {
        // FIXME ledger throws "Invalid status 6804" for 44'/62'/0'/0
        store.dispatch(setBaseHD("44'/61'/1'/0"));
    }

    if (state.launcher.getIn(['geth', 'type']) !== 'remote') {
        // check for syncing
        setTimeout(() => store.dispatch(loadSyncing()), intervalRates.second); // prod: intervalRates.second
        // double check for syncing
        setTimeout(() => store.dispatch(loadSyncing()), 2 * intervalRates.minute); // prod: 30 * this.second
    }
    setTimeout(() => store.dispatch(loadPendingTransactions()), intervalRates.refreshAllTxRate);
    refreshAll();
    setTimeout(refreshLong, 3 * intervalRates.second);
    store.dispatch(connecting(false));
}

export function stopSync() {
    // TODO
}

export function start() {
    try {
        store.dispatch(readConfig());
    } catch (e) {
        log.error(e);
    }
    store.dispatch(listenElectron());
    store.dispatch(gotoScreen('welcome'));
}

export function waitForServices() {
    const unsubscribe = store.subscribe(() => {
        const state = store.getState();
        if (state.launcher.get('terms') === 'v1'
            && state.launcher.getIn(['geth', 'status']) === 'ready'
            && state.launcher.getIn(['connector', 'status']) === 'ready') {
            unsubscribe();
            log.info('All services are ready to use by Wallet');
            startSync();
            // If not first run, go right to home when ready.
            if (state.screen.get('screen') === 'welcome') { //  && !state.launcher.get('firstRun'))
                store.dispatch(gotoScreen('home'));
            }
        }
    });

    function checkServiceStatus() {
        ipcRenderer.send('get-status');
    }
    setTimeout(checkServiceStatus, 2000);
}

export function waitForServicesRestart() {
    store.dispatch(connecting(true));
    const unsubscribe = store.subscribe(() => {
        const state = store.getState();
        if (state.launcher.getIn(['geth', 'status']) !== 'ready'
            || state.launcher.getIn(['connector', 'status']) !== 'ready') {
            unsubscribe();
            waitForServices();
        }
    });
}

export function screenHandlers() {
    let prevScreen = null;
    const unsubscribe = store.subscribe(() => {
        const state = store.getState();
        const screen = state.screen.get('screen');
        const justOpened = prevScreen !== screen;
        prevScreen = screen;
        if (justOpened) {
            if (screen === 'create-tx' || screen === 'add-from-ledger') {
                store.dispatch(setWatch(true));
                store.dispatch(waitLedger());
            } else {
                store.dispatch(setWatch(false));
            }
        }
    });
}

waitForServices();
screenHandlers();
