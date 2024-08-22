import { ethers, utils }  from "ethers";
import fs  from "fs";
import WebSocket from 'ws'
import dotenv from 'dotenv';
import ERC20 from './ERC20.json'  assert { type: "json" }

dotenv.config();

const endpoints = [
    // `wss://base-rpc.publicnode.com`,
    `wss://base-mainnet.g.alchemy.com/v2/${process.env.apikey_1}`,
    `wss://base-rpc.publicnode.com`,
    `wss://base-mainnet.g.alchemy.com/v2/${process.env.apikey_2}`,
    `wss://base-rpc.publicnode.com`,
    `wss://base-mainnet.g.alchemy.com/v2/${process.env.apikey_3}`,
    `wss://base-rpc.publicnode.com`,
    `wss://base-mainnet.g.alchemy.com/v2/${process.env.apikey_4}`,
    `wss://base-rpc.publicnode.com`,
    `wss://base-mainnet.g.alchemy.com/v2/${process.env.apikey_5}`,
    `wss://base-rpc.publicnode.com`,
    `wss://base-mainnet.g.alchemy.com/v2/${process.env.apikey_6}`,
    `wss://base-rpc.publicnode.com`,
    `wss://base-mainnet.g.alchemy.com/v2/${process.env.apikey_7}`,

];

export const router = { 
    uniswap: "0x4752ba5dbc23f44d87826276bf6fd6b1c372ad24",
    sushiswap: "0x6bded42c6da8fbf0d2ba55b2fa120c5e0c8d7891"
}

let currentIndex = 0;



export const getProvider = () => {
    let provider;
  
    function createWebSocket() {
        const endpoint = endpoints[currentIndex];
        currentIndex = (currentIndex + 1) % endpoints.length; // Rotate to the next endpoint
        console.log(`Attempting connection to ${endpoint}`);
        const ws = new WebSocket(endpoint);
  
        ws.on('close', () => { // Use ws.on('close') in Node.js
            console.log("Disconnected. Reconnecting...");
            setTimeout(() => {
                provider = new ethers.providers.WebSocketProvider(createWebSocket());
            }, 5000);
        });
  
        ws.on('error', (error) => { // Use ws.on('error') in Node.js
            console.log("WebSocket error: ", error);
        });
  
        return ws;
    }
  
    try {
        provider = new ethers.providers.WebSocketProvider(createWebSocket());
    } catch (err) {
        console.log(err);
    }
  
    return provider;
  };
export const provider = getProvider();

export async function CreateNewWallet({provider: provider}){
    let randomWallet = ethers.Wallet.createRandom();
    const wallet = new ethers.Wallet(randomWallet?.privateKey, provider);
    return { signer: wallet, address: randomWallet?.address, privateKey: randomWallet?.privateKey }
}

export async function getGasEstimates(tx, {provider: provider}) {
    try{

        const gasLimit = await provider.estimateGas(tx);
        const gasPrice = await provider.getGasPrice();
        const gasWei = gasPrice.mul(gasLimit);
        const gasEther = ethers.utils.formatEther(gasWei);
        return { gasLimit: gasLimit.mul(2), gasPrice: gasPrice.mul(2), gasWei, gasEther };
    }catch(err){
        console.log(err)
    }
}

export async function getNonce(wallet, {provider: provider}) {
    return await wallet.getTransactionCount("pending");
  }


  export function sleep(duration){
    return new Promise(resolve => {
        setTimeout(resolve, duration);
    })
}
  
export const SaveFile = (privateKey, publicKey) => {
    const initialContent = '';
    const fileName = 'privatekeys.txt';
    
    function writeInitialContent(callback) {
        fs.readFile(fileName, 'utf8', (err, data) => {
            if (err && err.code === 'ENOENT') {
                fs.writeFile(fileName, initialContent, callback);
            } else if (err) {
                console.error('Error reading the file', err);
                return;
            } else {
                fs.writeFile(fileName, data + '\n' + initialContent, callback);
            }
        });
    }
    
    const appendPrivateKey = () => {
        fs.appendFile(fileName, `\n${privateKey} - ${publicKey}`, (err) => {
            if (err) {
                console.error('Error appending private key', err);
                return;
            }
            console.log('Private key has been appended successfully.');
        });
    }
    
    writeInitialContent((err) => {
        if (err) {
            console.error('Error writing initial content', err);
            return;
        }
        console.log('Initial content written to file.');
        appendPrivateKey();
    });
    }
    


    async function checkAllowance({owner, spender, signer, token}) {
        const TOKEN = new ethers.Contract(token, ERC20, signer);
        const allowance = await TOKEN.allowance(owner, spender);
        console.log(allowance.toString())
        return allowance;
      }
    
      export async function approveRouterIfNeeded({ router, amount, owner, spender, signer, token, provider }) {
        try {
            // Check current allowance
            const allowance = await checkAllowance({ owner, spender, signer, token });
            await sleep(1000);
            
            const allowed = allowance.toString()
        
            const TOKEN = new ethers.Contract(token, ERC20, signer);
            if (owner === ethers.constants.AddressZero) {
                throw new Error("Signer is the zero address, please check the wallet connection.");
            }
            if (Number(allowed) < Number(amount)) {
                const tx = {
                    to: token,
                    data: TOKEN.interface.encodeFunctionData("approve", [
                        spender,
                        ethers.utils.parseUnits('10000000000000', 18)
                    ])
                };
                const nonce = await getNonce(signer, {provider});
                const { gasLimit, gasPrice } = await getGasEstimates(tx, {provider: signer})
                const txResponse = await signer.sendTransaction({
                    ...tx,
                    gasLimit,
                    gasPrice,
                    nonce
                });
    
                await txResponse.wait();
                await sleep(1000);
    
                console.log("Router approved to spend tokens");
                return true;
            } else {
                console.log('Allowance not needed');
                return true;
            }
        } catch (err) {
            console.log(err)
            return false;
        }
    }