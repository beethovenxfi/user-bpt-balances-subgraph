import { Address } from '@graphprotocol/graph-ts';
import { PoolCreated } from '../types/WeightedPoolFactory/WeightedPoolFactory';
import { StandardToken } from '../types/templates';
import { Token } from '../types/schema';
import { ERC20 } from '../types/templates/StandardToken/ERC20';

export function handleNewPool(event: PoolCreated): void {
    let poolAddress: Address = event.params.pool;
    let token = Token.load(poolAddress.toHexString());

    if (token == null) {
        let bpt = ERC20.bind(poolAddress);

        token = new Token(poolAddress.toHexString());
        token.address = poolAddress;
        token.decimals = 18;
        token.name = bpt.name();
        token.symbol = bpt.symbol();

        token.save();

        StandardToken.create(event.params.pool);
    }
}
