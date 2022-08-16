import { Deposit, EmergencyWithdraw, LogPoolAddition, Withdraw } from '../types/MasterChefV2/MasterChefV2';
import { Address, log } from '@graphprotocol/graph-ts/index';
import { MasterChefFarm, Token, UserMasterChefFarmBalance } from '../types/schema';
import { ERC20 } from '../types/templates/StandardToken/ERC20';
import { StandardToken } from '../types/templates';
import { BigInt } from '@graphprotocol/graph-ts';
import { getOrCreateUser, userAddFarm } from './user';
import { toDecimal } from '../helpers/number';

export function masterchefLogFarmAddition(event: LogPoolAddition): void {
    log.info('[MasterChefV2] Log Pool Addition {} {} {} {}', [
        event.params.pid.toString(),
        event.params.allocPoint.toString(),
        event.params.lpToken.toHex(),
        event.params.rewarder.toHex(),
    ]);

    //ensure the token exists, incase its a non pool BPT
    let token = getOrCreateToken(event.params.lpToken);
    let farm = new MasterChefFarm(event.params.pid.toString());

    farm.token = token.address.toHex();
    farm.save();
}

export function masterchefDeposit(event: Deposit): void {
    log.info('[MasterChefV2] Log Deposit {} {} {} {}', [
        event.params.user.toHex(),
        event.params.pid.toString(),
        event.params.amount.toString(),
        event.params.to.toHex(),
    ]);

    let farm = MasterChefFarm.load(event.params.pid.toString());

    if (farm != null) {
        let userFarmBalance = getUserFarmBalance(event.params.to, farm.id);
        let amount = toDecimal(event.params.amount, 18);

        userFarmBalance.balance = userFarmBalance.balance.plus(amount);
        userFarmBalance.save();
    }
}

export function masterchefWithdraw(event: Withdraw): void {
    log.info('[MasterChefV2] Log Withdraw {} {} {} {}', [
        event.params.user.toHex(),
        event.params.pid.toString(),
        event.params.amount.toString(),
        event.params.to.toHex(),
    ]);

    let farm = MasterChefFarm.load(event.params.pid.toString());

    if (farm != null) {
        let userFarmBalance = getUserFarmBalance(event.params.to, farm.id);
        let amount = toDecimal(event.params.amount, 18);

        userFarmBalance.balance = userFarmBalance.balance.minus(amount);
        userFarmBalance.save();
    }
}

export function masterchefEmergencyWithdraw(event: EmergencyWithdraw): void {
    log.info('[MasterChefV2] Log Emergency Withdraw {} {} {} {}', [
        event.params.user.toHex(),
        event.params.pid.toString(),
        event.params.amount.toString(),
        event.params.to.toHex(),
    ]);

    let farm = MasterChefFarm.load(event.params.pid.toString());

    if (farm != null) {
        let userFarmBalance = getUserFarmBalance(event.params.to, farm.id);
        let amount = toDecimal(event.params.amount, 18);

        userFarmBalance.balance = userFarmBalance.balance.minus(amount);
        userFarmBalance.save();
    }
}

function getOrCreateToken(tokenAddress: Address): Token {
    let token = Token.load(tokenAddress.toHexString());

    if (token == null) {
        let bpt = ERC20.bind(tokenAddress);

        token = new Token(tokenAddress.toHexString());
        token.address = tokenAddress;
        token.decimals = 18;
        token.name = bpt.name();
        token.symbol = bpt.symbol();

        token.save();

        StandardToken.create(tokenAddress);
    }

    return token;
}

function createUserFarmBalance(userAddress: Address, farmId: string): UserMasterChefFarmBalance {
    let user = getOrCreateUser(userAddress);
    let id = getUserFarmBalanceId(userAddress, farmId);

    let userFarmBalance = new UserMasterChefFarmBalance(id);
    userFarmBalance.user = userAddress.toHexString();
    userFarmBalance.farm = farmId.toString();
    userFarmBalance.balance = BigInt.fromI32(0).toBigDecimal();
    userFarmBalance.save();

    userAddFarm(user, farmId);

    return userFarmBalance;
}

function getUserFarmBalance(userAddress: Address, farmId: string): UserMasterChefFarmBalance {
    let id = getUserFarmBalanceId(userAddress, farmId);
    let userStakedBalance = UserMasterChefFarmBalance.load(id);

    if (userStakedBalance == null) {
        return createUserFarmBalance(userAddress, farmId);
    }

    return userStakedBalance;
}

function getUserFarmBalanceId(userAddress: Address, farmId: string): string {
    return userAddress.toHex().concat('-').concat(farmId.toString());
}
