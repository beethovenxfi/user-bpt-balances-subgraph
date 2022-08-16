import { Gauge, UserGaugeBalance } from '../types/schema';
import { scaleDownBPT } from '../helpers/number';
import { LiquidityGauge as LiquidityGaugeTemplate, Transfer } from '../types/templates/LiquidityGauge/LiquidityGauge';
import { RewardsOnlyGaugeCreated } from '../types/ChildChainLiquidityGaugeFactory/ChildChainLiquidityGaugeFactory';
import { RewardsOnlyGauge } from '../types/templates';
import { ZERO_ADDRESS } from '../helpers/constants';
import { Address, BigInt } from '@graphprotocol/graph-ts/index';
import { getOrCreateUser, userAddStakedGauge } from './user';
import { saveUserBalanceSnapshot } from './snapshot';

export function handleRewardsOnlyGaugeCreated(event: RewardsOnlyGaugeCreated): void {
    let address = event.params.gauge;
    let gauge = Gauge.load(address.toHexString());

    if (gauge == null) {
        gauge = new Gauge(address.toHexString());

        let gaugeToken = LiquidityGaugeTemplate.bind(address);
        let symbolCall = gaugeToken.try_symbol();
        if (!symbolCall.reverted) {
            gauge.symbol = symbolCall.value;
        }

        gauge.token = event.params.pool.toHexString();
        RewardsOnlyGauge.create(event.params.gauge);

        gauge.save();
    }
}

export function handleTransfer(event: Transfer): void {
    let gaugeAddress = event.address;

    /* eslint-disable no-underscore-dangle */
    let fromAddress = event.params._from;
    let toAddress = event.params._to;
    let value = event.params._value;
    /* eslint-enable no-underscore-dangle */

    if (toAddress.toHexString() != ZERO_ADDRESS) {
        let userShareTo = getUserStakedBalance(toAddress, gaugeAddress);
        userShareTo.balance = userShareTo.balance.plus(scaleDownBPT(value));
        userShareTo.save();

        let toUser = getOrCreateUser(toAddress);
        saveUserBalanceSnapshot(toUser, event);
    }

    if (fromAddress.toHexString() != ZERO_ADDRESS) {
        let userShareFrom = getUserStakedBalance(fromAddress, gaugeAddress);
        userShareFrom.balance = userShareFrom.balance.minus(scaleDownBPT(value));
        userShareFrom.save();

        let fromUser = getOrCreateUser(fromAddress);
        saveUserBalanceSnapshot(fromUser, event);
    }
}

function createUserStakedBalance(userAddress: Address, gaugeAddress: Address): UserGaugeBalance {
    let user = getOrCreateUser(userAddress);
    let id = getUserStakedBalanceId(userAddress, gaugeAddress);

    let userStakedBalance = new UserGaugeBalance(id);
    userStakedBalance.user = userAddress.toHexString();
    userStakedBalance.gauge = gaugeAddress.toHexString();
    userStakedBalance.balance = BigInt.fromI32(0).toBigDecimal();
    userStakedBalance.save();

    userAddStakedGauge(user, gaugeAddress);

    return userStakedBalance;
}

function getUserStakedBalance(userAddress: Address, gaugeAddress: Address): UserGaugeBalance {
    let id = getUserStakedBalanceId(userAddress, gaugeAddress);
    let userStakedBalance = UserGaugeBalance.load(id);

    if (userStakedBalance == null) {
        return createUserStakedBalance(userAddress, gaugeAddress);
    }

    return userStakedBalance;
}

function getUserStakedBalanceId(userAddress: Address, gaugeAddress: Address): string {
    return userAddress.toHex().concat('-').concat(gaugeAddress.toHex());
}
