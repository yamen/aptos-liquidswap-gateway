import aptos, {AptosClient} from "aptos";

async function signTrx(address,privateKeyHex,pubKeyHex,payload){
    const aptos = require("aptos");
    const NODE_URL = "https://fullnode.testnet.aptoslabs.com/v1"; // change to mainnnet
    const client = new AptosClient(NODE_URL);
    const account = aptos.AptosAccount.fromAptosAccountObject({privateKeyHex: privateKeyHex, publicKeyHex: pubKeyHex, address: address});
    const txnRequest = await client.generateTransaction(account.address(), payload);
    const signedTxn = await client.signTransaction(account, txnRequest);
    const transactionRes = await client.submitTransaction(signedTxn);
    console.log(await client.waitForTransactionWithResult(transactionRes.hash));
}