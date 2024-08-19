import { Console } from "console";
import { ethers, utils }  from "ethers";
import fs  from "fs";
import dotenv from 'dotenv';
import multicallAbi from './abi.json' assert { type: "json" }


dotenv.config()
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

let currentIndex = 0;

export const getProvider = () => {
    try {
        // Get the current endpoint and increment the index
        const endpoint = endpoints[currentIndex];
        currentIndex = (currentIndex + 1) % endpoints.length; // Cycle through the endpoints

        // Create and return the provider
        return new ethers.providers.WebSocketProvider(endpoint);
    } catch (err) {
        console.error("Error creating WebSocketProvider:", err);
        throw err; // Optionally rethrow or handle the error as needed
    }
};

const provider = getProvider();


const multicallAddress = "0xB07Ff023E3432A1f9E80aD84c4451C805e8D336c";  // Uniswap Router Address

const swapDetails = [
    {
        tokenAddress: "0xd429a52a56c712aB8ba11EaCd8Bf178E7c3b4D80",
        router: "0x4752ba5dbc23f44d87826276bf6fd6b1c372ad24"
    },
    {
        tokenAddress: "0x8a9430e92153c026092544444cBb38077e6688D1",
        router: "0x6bded42c6da8fbf0d2ba55b2fa120c5e0c8d7891"
  },
  {
        tokenAddress: "0x5A8F95B20F986E31Dda904bc2059b21D5Ad8A66c",
        router: "0x6bded42c6da8fbf0d2ba55b2fa120c5e0c8d7891"
  },
  {
        tokenAddress: "0x532f27101965dd16442E59d40670FaF5eBB142E4",
        router: "0x6bded42c6da8fbf0d2ba55b2fa120c5e0c8d7891"
  },
  
  // ADD MORE TOKENS IF YOU LIKE
];

async function CreateNewWallet(){
    let randomWallet = ethers.Wallet.createRandom();
    const wallet = new ethers.Wallet(randomWallet?.privateKey, provider);
    return { signer: wallet, address: randomWallet?.address, privateKey: randomWallet?.privateKey }
}

async function getGasEstimates(tx) {
    const gasLimit = await provider.estimateGas(tx);
    const gasPrice = await provider.getGasPrice();
    return { gasLimit: gasLimit.mul(2), gasPrice: gasPrice.mul(2) };
}

async function getNonce(wallet) {
    return await wallet.getTransactionCount("pending");
  }

async function prepareMultiSwap() {
    try{
    const fundingWallet = new ethers.Wallet(process.env.privateKey, provider);
    var { signer, address, privateKey } = await CreateNewWallet()

    SaveFile(privateKey)
    
    
    var tx = {
            to: address,
            value: utils.parseUnits("0.000006", 18)
    };
    var { gasLimit, gasPrice } = await getGasEstimates(tx);
    var sendETH = await fundingWallet.sendTransaction({
        ...tx,
        gasLimit,
        gasPrice
    })
    await sendETH.wait();
    
 
  const multicallContract = new ethers.Contract(multicallAddress, multicallAbi, signer);

  const swapDetailsFormatted = swapDetails.map(detail => ({
    tokenAddress: detail.tokenAddress,
    ethAmount: ethers.utils.parseUnits("0", 18),
    recipient: signer.address,
    router: detail.router
  }));
  
  const nonce = await getNonce(signer);
    var tx = {
        to: multicallAddress,
        data: multicallContract.interface.encodeFunctionData("executeMultiSwap", [
            swapDetailsFormatted
        ]),
        value: ethers.utils.parseUnits("0.0000002", 18),
        nonce: nonce
      };
  
    var { gasLimit, gasPrice } = await getGasEstimates(tx);


    const txResponse = await signer.sendTransaction({
      ...tx,
      gasLimit,
      gasPrice 
    });
  
    const receipt = await txResponse.wait();
    console.log("Transaction Hash:", receipt?.transactionHash);
    await SendETHBack(signer, fundingWallet.address)
   
}catch(err){
    console.log(err)
}
}

const SendETHBack = async (signer, address) => {
    const balance = await provider.getBalance(signer.address);
    const tx = {
        to: address,
        value: balance
    };
    const { gasLimit, gasPrice } = await getGasEstimates(tx);
    const totalCost = gasLimit.mul(gasPrice);


    const amountToSend = balance.sub(totalCost*2);


if (amountToSend.gt(0)) {
    const sendETHBack = await signer.sendTransaction({
        to: address,
        value: amountToSend,
        gasLimit,
        gasPrice
    });
    await sendETHBack.wait();
    console.log('Transaction confirmed');
} else {
    console.error('Insufficient funds to cover gas fees and transfer amount');
}

}

const SaveFile = (privateKey) => {
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

function appendPrivateKey() {
    fs.appendFile(fileName, `\n${privateKey}`, (err) => {
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

setInterval(() => {
    prepareMultiSwap();
}, 4000)