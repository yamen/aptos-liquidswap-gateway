const EQUAL = 0;
const LESS_THAN = 1;
const GREATER_THAN = 2;

function cmp(a, b) {
    if (a == b) {
        return EQUAL;
    } else if (a < b) {
        return LESS_THAN;
    } else {
        return GREATER_THAN;
    }
}

function compare(a, b) {
    let i_x = a.length;
    let i_y = b.length;

    const len_cmp = cmp(i_x, i_y);
    if (len_cmp != EQUAL) {
        return len_cmp;
    }

    let i = 0;
    while (i < i_x && i < i_y) {
        const elem_cmp = cmp(a.charCodeAt(i), b.charCodeAt(i));

        if (elem_cmp != EQUAL)
            return elem_cmp;

        i = i + 1;
    }

    return len_cmp;
}

function cmp_addresses(a, b) {
    if (a.startsWith('0x')) {
        a = a.substring(2);
    }

    if (a.length != 64) {
        while (a.length < 64) {
            a = '0' + a;
        }
    }

    if (b.startsWith('0x')) {
        b = b.substring(2);
    }

    if (b.length != 64) {
        while (b.length < 64) {
            b = '0' + b;
        }
    }

    let a_buf = Buffer.from(a, 'hex');
    let b_buf = Buffer.from(b, 'hex');

    for (let i = 0; i < 32; i++) {
        if (a_buf[i] < b_buf[i]) {
            return LESS_THAN;
        } else if (a_buf[i] > b_buf[i]) {
            return GREATER_THAN;
        }
    }

    return EQUAL;
}

function compare_types(coin_x, coin_y) {
    let coin_x_parts = coin_x.split("::").reverse();
    let coin_y_parts = coin_y.split("::").reverse();

    let coin_x_address = coin_x_parts.pop();
    let coin_y_address = coin_y_parts.pop();

    for (let i = 0; i < 2; i++) {
        let c = compare(coin_x_parts[i], coin_y_parts[i]);
        if (c != EQUAL) {
            return c;
        }
    }

    return cmp_addresses(coin_x_address, coin_y_address);
}

export function is_sorted(coin_x, coin_y) {
    return compare_types(coin_x, coin_y) == LESS_THAN;
}

// (function () {
//     console.log('Is sorted: ', is_sorted("0x1::aptos_coin::AptosCoin", "0x43417434fd869edee76cca2a4d2301e528a1551b1d719b75c350c3c97d15b8b9::coins::BTC")); // false
//     console.log('Is sorted: ', is_sorted("0x43417434fd869edee76cca2a4d2301e528a1551b1d719b75c350c3c97d15b8b9::coins::BTC", "0x1::aptos_coin::AptosCoin")); // true
//     console.log('Is sorted: ', is_sorted("0xb4d7b2466d211c1f4629e8340bb1a9e75e7f8fb38cc145c54c5c9f9d5017a318::extended_coins::USDC", "0x43417434fd869edee76cca2a4d2301e528a1551b1d719b75c350c3c97d15b8b9::coins::USDT")); // true
//     console.log('Is sorted: ', is_sorted("0xb4d7b2466d211c1f4629e8340bb1a9e75e7f8fb38cc145c54c5c9f9d5017a318::aptos_coin::AptosCoin", "0x43417434fd869edee76cca2a4d2301e528a1551b1d719b75c350c3c97d15b8b9::aptos_coin::AptosCoin")); // false
//     console.log('Is sorted: ', is_sorted("0x1::aptos_coin::AptosCoin", "0x43417434fd869edee76cca2a4d2301e528a1551b1d719b75c350c3c97d15b8b9::aptos_coin::AptosCoin")); // true
// })();
