import { ethers, utils }  from "ethers";
import fs  from "fs";
import WebSocket from 'ws'
import dotenv from 'dotenv';

dotenv.config();

const endpoints = [
    `wss://base-rpc.publicnode.com`,
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
    const gasLimit = await provider.estimateGas(tx);
    const gasPrice = await provider.getGasPrice();
    return { gasLimit: gasLimit.mul(2), gasPrice: gasPrice.mul(2) };
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
    

