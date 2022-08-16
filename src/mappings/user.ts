import { Address, BigDecimal, BigInt, Bytes } from '@graphprotocol/graph-ts';
import { ZERO } from '../helpers/number';
import { Token, User, UserWalletBalance } from '../types/schema';

export function getOrCreateUser(userAddress: Bytes): User {
    let accountId = userAddress.toHex();
    let existingUser = User.load(accountId);

    if (existingUser != null) {
        return existingUser as User;
    }

    let newUser = new User(accountId);
    newUser.address = userAddress;
    newUser.walletTokens = new Array<Bytes>(0);
    newUser.gauges = new Array<Bytes>(0);
    newUser.save();

    return User.load(accountId) as User;
}

function getOrCreateUserWalletBalance(user: User, token: Token): UserWalletBalance {
    let balanceId = user.id + '-' + token.id;
    let previousBalance = UserWalletBalance.load(balanceId);

    if (previousBalance != null) {
        return previousBalance as UserWalletBalance;
    }

    let newBalance = new UserWalletBalance(balanceId);
    newBalance.user = user.id;
    newBalance.token = token.id;
    newBalance.balance = ZERO.toBigDecimal();

    userAddWalletToken(user, Address.fromString(token.address.toHex()));

    return newBalance;
}

export function increaseUserBalance(account: User, token: Token, amount: BigDecimal): UserWalletBalance {
    let balance = getOrCreateUserWalletBalance(account, token);
    balance.balance = balance.balance.plus(amount);

    return balance;
}

export function decreaseUserBalance(account: User, token: Token, amount: BigDecimal): UserWalletBalance {
    let balance = getOrCreateUserWalletBalance(account, token);
    balance.balance = balance.balance.minus(amount);

    return balance;
}

export function userAddWalletToken(user: User, tokenAddress: Address): void {
    let newWalletTokens = new Array<Bytes>(user.walletTokens.length + 1);

    for (let i = 0; i < user.walletTokens.length; i++) {
        newWalletTokens[i] = user.walletTokens[i];
    }

    newWalletTokens[user.walletTokens.length] = tokenAddress;

    user.walletTokens = newWalletTokens;
    user.save();
}

export function userAddStakedGauge(user: User, gaugeAddress: Address): void {
    let newStakedGauges = new Array<Bytes>(user.gauges.length + 1);

    for (let i = 0; i < user.gauges.length; i++) {
        newStakedGauges[i] = user.gauges[i];
    }

    newStakedGauges[user.gauges.length] = gaugeAddress;

    user.gauges = newStakedGauges;

    user.save();
}

export function userAddFarm(user: User, farmAddress: string): void {
    let newFarms = new Array<string>(user.farms.length + 1);

    for (let i = 0; i < user.farms.length; i++) {
        newFarms[i] = user.farms[i];
    }

    newFarms[user.farms.length] = farmAddress.toString();

    user.farms = newFarms;

    user.save();
}
