import { BigDecimal, Bytes, ethereum } from '@graphprotocol/graph-ts';
import { toDecimal } from '../helpers/number';
import { decreaseUserBalance, getOrCreateUser, increaseUserBalance } from './user';
import { Token, TokenTransferEvent } from '../types/schema';
import { Transfer } from '../types/StablePoolFactory/ERC20';
import { saveUserBalanceSnapshot } from './snapshot';
import { ZERO_ADDRESS } from '../helpers/constants';

export function handleTransfer(event: Transfer): void {
    let token = Token.load(event.address.toHex()) as Token;
    let amount = toDecimal(event.params.value, token.decimals);

    // Update token event logs
    handleTransferEvent(token, amount, event.params.from, event.params.to, event);

    if (event.params.from.toHex() != ZERO_ADDRESS) {
        // Updates balances of accounts
        let sourceAccount = getOrCreateUser(event.params.from);

        let sourceAccountBalance = decreaseUserBalance(sourceAccount, token as Token, amount);
        sourceAccountBalance.block = event.block.number;
        sourceAccountBalance.modified = event.block.timestamp;
        sourceAccountBalance.transaction = event.transaction.hash;
        sourceAccountBalance.save();

        // To provide information about evolution of account balances
        saveUserBalanceSnapshot(sourceAccount, event);
    }

    if (event.params.to.toHex() != ZERO_ADDRESS) {
        let destinationAccount = getOrCreateUser(event.params.to);

        let destinationAccountBalance = increaseUserBalance(destinationAccount, token as Token, amount);
        destinationAccountBalance.block = event.block.number;
        destinationAccountBalance.modified = event.block.timestamp;
        destinationAccountBalance.transaction = event.transaction.hash;
        destinationAccountBalance.save();

        // To provide information about evolution of account balances
        saveUserBalanceSnapshot(destinationAccount, event);
    }
}

function handleTransferEvent(
    token: Token | null,
    amount: BigDecimal,
    source: Bytes,
    destination: Bytes,
    event: ethereum.Event,
): TokenTransferEvent {
    let transferEvent = new TokenTransferEvent(event.transaction.hash.toHex() + '-' + event.logIndex.toString());
    transferEvent.token = event.address.toHex();
    transferEvent.amount = amount;
    transferEvent.sender = source;
    transferEvent.source = source;
    transferEvent.destination = destination;

    transferEvent.block = event.block.number;
    transferEvent.timestamp = event.block.timestamp;
    transferEvent.transaction = event.transaction.hash;

    transferEvent.save();

    return transferEvent;
}
