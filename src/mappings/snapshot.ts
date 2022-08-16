import {
    User,
    UserBalanceSnapshot,
    UserGaugeBalance,
    UserMasterChefFarmBalance,
    UserWalletBalance,
} from '../types/schema';
import { ethereum } from '@graphprotocol/graph-ts/index';
import { BigDecimal, Bytes, store } from '@graphprotocol/graph-ts';

export function saveUserBalanceSnapshot(user: User, event: ethereum.Event): void {
    let snapshot = getOrCreateUserBalanceSnapshot(user, event);

    let walletBalances = new Array<BigDecimal>(user.walletTokens.length);
    let walletTokens = new Array<Bytes>(user.walletTokens.length);

    for (let i = 0; i < user.walletTokens.length; i++) {
        let userWalletBalance = UserWalletBalance.load(
            user.id + '-' + user.walletTokens[i].toHex(),
        ) as UserWalletBalance;

        walletBalances[i] = userWalletBalance.balance;
        walletTokens[i] = user.walletTokens[i];
    }

    let stakedBalances = new Array<BigDecimal>(user.gauges.length);
    let stakedGauges = new Array<Bytes>(user.gauges.length);

    for (let i = 0; i < user.gauges.length; i++) {
        let userStakedBalance = UserGaugeBalance.load(user.id + '-' + user.gauges[i].toHex()) as UserGaugeBalance;

        stakedBalances[i] = userStakedBalance.balance;
        stakedGauges[i] = user.gauges[i];
    }

    let farms = new Array<string>(user.farms.length);
    let farmBalances = new Array<BigDecimal>(user.farms.length);

    for (let i = 0; i < user.farms.length; i++) {
        let userFarmBalance = UserMasterChefFarmBalance.load(
            user.id + '-' + user.farms[i],
        ) as UserMasterChefFarmBalance;

        farmBalances[i] = userFarmBalance.balance;
        farms[i] = user.farms[i];
    }

    snapshot.walletTokens = walletTokens;
    snapshot.walletBalances = walletBalances;

    snapshot.gaugeBalances = stakedBalances;
    snapshot.gauges = stakedGauges;

    snapshot.farms = farms;
    snapshot.farmBalances = farmBalances;

    snapshot.save();
}

function getOrCreateUserBalanceSnapshot(user: User, event: ethereum.Event): UserBalanceSnapshot {
    let timestamp = event.block.timestamp.toI32();
    let dayTimestamp = timestamp - (timestamp % 86400);
    let snapshotId = user.id + '-' + dayTimestamp.toString();

    let snapshot = UserBalanceSnapshot.load(snapshotId);

    if (snapshot != null) {
        return snapshot as UserBalanceSnapshot;
    }

    let newSnapshot = new UserBalanceSnapshot(snapshotId);

    newSnapshot.user = user.id;
    newSnapshot.timestamp = dayTimestamp;

    newSnapshot.gaugeBalances = new Array<BigDecimal>(0);
    newSnapshot.gauges = new Array<Bytes>(0);

    newSnapshot.walletBalances = new Array<BigDecimal>(0);
    newSnapshot.walletTokens = new Array<Bytes>(0);

    return newSnapshot;
}
