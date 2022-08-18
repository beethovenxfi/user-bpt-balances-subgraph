import { Transfer } from '../types/StablePoolFactory/ERC20';
import { Token } from '../types/schema';
import { handleTransfer } from './token';

export function handleFbeetsTransfer(event: Transfer): void {
    let fbeets = Token.load(event.address.toHexString());

    //create fbeets if it hasn't been already
    if (fbeets == null) {
        fbeets = new Token(event.address.toHexString());
        fbeets.address = event.address;
        fbeets.decimals = 18;
        fbeets.name = 'FreshBeets';
        fbeets.symbol = 'fBEETS';

        fbeets.save();
    }

    handleTransfer(event);
}
