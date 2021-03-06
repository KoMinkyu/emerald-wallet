import React from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { FontIcon, FlatButton, Popover } from 'material-ui';
import Immutable from 'immutable';
import { translate } from 'react-i18next';
import { gotoScreen } from 'store/screenActions';
import Account from './account';
import { watchConnection } from 'store/ledgerActions';
import { List, ListItem } from 'material-ui/List';

import styles from './list.scss';

class WalletsTokensButton extends React.Component {

    constructor(props) {
        super(props);

        this.state = {
            open: false,
        };
        this.handleTouchTap = this.handleTouchTap.bind(this);
        this.handleRequestClose = this.handleRequestClose.bind(this);
    }

    handleTouchTap(event) {
        // This prevents ghost click.
        event.preventDefault();

        this.setState({
            open: true,
            anchorEl: event.currentTarget,
        });
    }

    handleRequestClose() {
        this.setState({
            open: false,
        });
    }

    render() {
        const { generate, importJson, importLedger, importPrivateKey, t, style } = this.props;

        return (
            <div style={style}>
                <FlatButton
                    onTouchTap={ this.handleTouchTap }
                    label="WALLETS AND TOKENS"
                    labelStyle={{ paddingRight: 0 }}
                    style={{ color: '#47B04B' }}
                    hoverColor="transparent"
                    icon={<FontIcon className="fa fa-plus-circle"/>}
                />
                <Popover
                    open={this.state.open}
                    anchorEl={this.state.anchorEl}
                    anchorOrigin={{horizontal: 'left', vertical: 'bottom'}}
                    targetOrigin={{horizontal: 'left', vertical: 'top'}}
                    onRequestClose={this.handleRequestClose}
                >
                    <List>
                        <ListItem
                            primaryText="Ledger Nano S"
                            secondaryText="Use Ledger hardware key to manage signatures"
                            onClick={importLedger}
                            leftIcon={<FontIcon className="fa fa-usb"/>}
                        />
                        <ListItem
                            primaryText={t('add.generate.title')}
                            secondaryText={t('add.generate.subtitle')}
                            onClick={generate}
                            leftIcon={<FontIcon className="fa fa-random"/>}
                        />
                        <ListItem
                            primaryText={t('add.import.title')}
                            secondaryText={t('add.import.subtitle')}
                            onClick={importJson}
                            leftIcon={<FontIcon className="fa fa-code"/>}
                        />
                        <ListItem
                            primaryText={t('add.importPrivateKey.title')}
                            secondaryText={t('add.importPrivateKey.subtitle')}
                            onClick={importPrivateKey}
                            leftIcon={<FontIcon className="fa fa-key"/>}
                        />
                    </List>
                </Popover>
            </div>
        );
    }
}

const Render = translate('accounts')(({t, accounts, generate, importJson, importLedger, importPrivateKey}) => {

    const table = <div>
        {accounts.map((account) =>
            <div style={{marginBottom: '6px'}} key={account.get('id')}>
                <Account account={account}/>
            </div>)}
    </div>;

    return (
        <div>
            <div className={ styles.header }>
                <div>
                    <span className={ styles.title }>{t('list.title')}</span>
                </div>
                <WalletsTokensButton
                    generate={ generate }
                    importJson={ importJson }
                    importLedger={ importLedger }
                    importPrivateKey={ importPrivateKey }
                    t={ t }
                />
            </div>

            <div style={{}}>
                { table }
            </div>
        </div>
    );
});

Render.propTypes = {
    accounts: PropTypes.object.isRequired,
    generate: PropTypes.func.isRequired,
    importJson: PropTypes.func.isRequired,
    importLedger: PropTypes.func.isRequired,
};

const AccountsList = connect(
    (state, ownProps) => ({
        accounts: state.accounts.get('accounts', Immutable.List()),
    }),
    (dispatch, ownProps) => ({
        generate: () => {
            dispatch(gotoScreen('generate'));
        },
        importJson: () => {
            dispatch(gotoScreen('importjson'));
        },
        importPrivateKey: () => {
            dispatch(gotoScreen('import-private-key'));
        },
        importLedger: () => {
            dispatch(gotoScreen('add-from-ledger'));
        },

    })
)(Render);

export default AccountsList;
