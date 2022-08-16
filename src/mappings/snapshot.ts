import {
    User,
    UserBalanceSnapshot,
    UserGaugeBalance,
    UserMasterChefFarmBalance,
    UserWalletBalance,
} from '../types/schema';
import { ethereum } from '@graphprotocol/graph-ts/index';
import { BigDecimal, Bytes } from '@graphprotocol/graph-ts';

export function saveUserBalanceSnapshot(user: User, event: ethereum.Event): void {
    let snapshot = getOrCreateUserBalanceSnapshot(user, event);

    let walletBalances = new Array<BigDecimal>(0);
    let walletTokens = new Array<Bytes>(0);

    for (let i = 0; i < user.walletTokens.length; i++) {
        let userWalletBalance = UserWalletBalance.load(
            user.id + '-' + user.walletTokens[i].toHex(),
        ) as UserWalletBalance;

        if (userWalletBalance.balance.gt(BigDecimal.zero())) {
            walletBalances.push(userWalletBalance.balance);
            walletTokens.push(user.walletTokens[i]);
        }
    }

    let stakedBalances = new Array<BigDecimal>(0);
    let stakedGauges = new Array<Bytes>(0);

    for (let i = 0; i < user.gauges.length; i++) {
        let userStakedBalance = UserGaugeBalance.load(user.id + '-' + user.gauges[i].toHex()) as UserGaugeBalance;

        if (userStakedBalance.balance.gt(BigDecimal.zero())) {
            stakedBalances.push(userStakedBalance.balance);
            stakedGauges.push(user.gauges[i]);
        }
    }

    let farms = new Array<string>(0);
    let farmBalances = new Array<BigDecimal>(0);

    for (let i = 0; i < user.farms.length; i++) {
        let userFarmBalance = UserMasterChefFarmBalance.load(
            user.id + '-' + user.farms[i],
        ) as UserMasterChefFarmBalance;

        if (userFarmBalance.balance.gt(BigDecimal.zero())) {
            farmBalances.push(userFarmBalance.balance);
            farms.push(user.farms[i]);
        }
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
