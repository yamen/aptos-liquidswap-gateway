import {is_sorted} from './coin_sort.js';
import {AptosClient} from "aptos";
import {SDK} from '@pontem/liquidswap-sdk';
import express from 'express';


var aptosClient;
var pontem_sdk;
var server;
const coins = {
    APTOS: {
        address: '0x1::aptos_coin::AptosCoin',
        decimals: 8,
    },
    whUSDC: {
        address: '0x5e156f1207d0ebfa19a9eeff00d62a282278fb8719f4fab3a586a0a2c0fffbea::coin::T',
        decimals: 6,
    },
    whUSDT: {
        address: '0xa2eda21a58856fda86451436513b867c97eecb4ba099da5775520e0f7492e852::coin::T',
        decimals: 6,
    },
    USDC_lz : {
        address: '0xf22bede237a07e121b56d91a491eb7bcdfd1f5907926a9e58338f964a01b17fa::asset::USDC',
        decimals: 6,

    },
    USDT_lz : {
        address: '0xf22bede237a07e121b56d91a491eb7bcdfd1f5907926a9e58338f964a01b17fa::asset::USDT',
        decimals: 6,
    }
};


async function init(){
    aptosClient = new AptosClient("https://fullnode.mainnet.aptoslabs.com/v1");

    pontem_sdk = new SDK({
        nodeUrl: 'https://fullnode.mainnet.aptoslabs.com/v1', // Node URL
        networkOptions: {
            nativeToken: coins.APTOS.address, // Type of Native network token
            modules: {
                Scripts:
                    '0x190d44266241744264b964a37b8f09863167a12d3e70cda39376cfb4e3561e12::scripts_v2', // This module is used for Swap
                CoinInfo: '0x1::coin::CoinInfo', // Type of base CoinInfo module
                CoinStore: '0x1::coin::CoinStore', // Type of base CoinStore module
            },
        }
    });

}

async function getAllResources(){
    console.log(await aptosClient.getAccountResources("0x385068db10693e06512ed54b1e6e8f1fb9945bb7a78c28a45585939ce953f99e"));
}
async function map_to(token_ticker){
    if (token_ticker === "whUSDC"){
        return coins.whUSDC;
    }
    if (token_ticker === "whUSDT"){
        return coins.whUSDT;
    }
    if (token_ticker === "APT"){
        return coins.APTOS;
    }
    if (token_ticker === "USDC_lz"){
        return coins.USDC_lz;
    }
    if (token_ticker === "USDT_lz"){
        return coins.USDT_lz;
    }
}
async function get_rate(from_token, to_token, from_token_amount) {
    const amount = await pontem_sdk.Swap.calculateRates({
        fromToken: from_token,
        toToken: to_token,
        amount: from_token_amount,
        interactiveToken: 'from',
        pool: {
            address: '0x05a97986a9d031c4567e15b797be516910cfcb4156312482efc6a19c0a30c948',
            moduleAddress: '0x190d44266241744264b964a37b8f09863167a12d3e70cda39376cfb4e3561e12',
            lpToken: '0x190d44266241744264b964a37b8f09863167a12d3e70cda39376cfb4e3561e12::curves::Uncorrelated',
        }
    });
    return amount;
}

async function loadPoolList() {
    const poolList = [];
    const ownerAddress = '0x05a97986a9d031c4567e15b797be516910cfcb4156312482efc6a19c0a30c948';
    const resources = await aptosClient.getAccountResources(ownerAddress);
    for (const resource of resources) {
        const type = resource['type'];
        if (type.includes('liquidity_pool::LiquidityPool')) {
            const coins = type.split('LiquidityPool<')[1];
            const x = coins.split(',')[0];
            const y = coins.split(',')[1].substring(1);
            const poolType = coins.split(',')[2].includes("Uncorrelated") ? "Uncorrelated" : "Stable";
            const pool = {
                coin_x: x,
                coin_y: y,
                coin_x_reserve: resource['data']['coin_x_reserve']['value'],
                coin_y_reserve: resource['data']['coin_y_reserve']['value'],
                pool_type: poolType,
                lp_token: type,
            }
            poolList.push(pool);
        }
}
return poolList;
}

async function getReserves(token_x,token_y){
    const poolList = await loadPoolList();
    for (const pool of poolList) {
        if (pool.coin_x === token_x && pool.coin_y === token_y) {
            return [pool.coin_x_reserve , pool.coin_y_reserve];
        } else if (pool.coin_x === token_y && pool.coin_y === token_x) {
            return [pool.coin_y_reserve , pool.coin_x_reserve];
        }
    }
}


async function getPrice(token_x,token_y){
    const poolList = await loadPoolList();
    for (const pool of poolList) {
        if(!is_sorted(token_x,token_y)) {
            [token_x,token_y] = [token_y,token_x];
        }
        if (pool.coin_x === token_x && pool.coin_y === token_y) {
            return pool.coin_y_reserve / pool.coin_x_reserve;
        } else if(pool.coin_x === token_y && pool.coin_y === token_x){
            return pool.coin_x_reserve / pool.coin_y_reserve;
        }
    }
}

async function swap(token_x,token_y,x_amount){
    const to_amount = await get_rate(token_x,token_y,x_amount);
    const txPayload = pontem_sdk.Swap.createSwapTransactionPayload({
        fromToken: token_x,
        toToken: token_y,
        fromAmount: x_amount,
        toAmount: to_amount,
        interactiveToken: 'from',
        slippage: 0.005, // 1%
        pool: {
            address: '0x05a97986a9d031c4567e15b797be516910cfcb4156312482efc6a19c0a30c948',
            moduleAddress: '0x190d44266241744264b964a37b8f09863167a12d3e70cda39376cfb4e3561e12',
            lpToken: '0x190d44266241744264b964a37b8f09863167a12d3e70cda39376cfb4e3561e12::curves::Uncorrelated',
        }
    })
    // double check this part
    txPayload['type'] = 'entry_function_payload';
    console.log(to_amount);
    const with_slippage = Math.round(to_amount - parseInt(to_amount)*0.005);
    txPayload['arguments'] = [txPayload['arguments'][1], with_slippage.toString()];
    return txPayload;

}

async function main() {
    await init();
}

server = express();

server.listen(3000, () => {
    console.log('The application is listening on port 3000!');
});

// Using express.urlencoded middleware
server.use(express.urlencoded({
    extended: true
}))

server.get('/get_rate', async (req, res) => {
    const from_token = await map_to(req.query['token_x']);
    const to_token = await map_to(req.query['token_y']);
    const amount = parseInt(req.query['amount']) * 10**from_token.decimals;
    const out_tokens = (await get_rate(from_token.address,to_token.address,amount))/10**to_token.decimals;
    res.send(out_tokens.toString());
});

server.get('/reserves', async (req, res) => {
    const from_token = await map_to(req.query['token_x']);
    const to_token = await map_to(req.query['token_y']);
    const reserves = await getReserves(from_token.address,to_token.address);
    res.send(reserves[0].toString()+','+reserves[1].toString());
})


server.post('/swap', async (req, res) => {
    const from_token = await map_to(req.body['from_token']);
    const to_token = await map_to(req.body['to_token']);
    const amount = parseInt(req.body['amount']) * 10**from_token.decimals;
    const payload = await swap(from_token.address,to_token.address,amount);
    console.log(payload);
    res.send(payload);
});

main();