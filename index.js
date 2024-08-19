import { Console } from "console";
import { ethers, utils }  from "ethers";
import fs  from "fs";
import dotenv from 'dotenv';
import multicallAbi from './abi.json' assert { type: "json" }
import { getProvider, router, getNonce, getGasEstimates, CreateNewWallet, SaveFile, sleep } from "./lib.js";
dotenv.config()


const multicallAddress = "0xB07Ff023E3432A1f9E80aD84c4451C805e8D336c";

const swapDetails = [
    {
        tokenAddress: "0xd429a52a56c712aB8ba11EaCd8Bf178E7c3b4D80",
        router: router.uniswap
    },
    // {
    //     tokenAddress: "0x4b61E2f1BBDEe6D746209a693156952936F1702C",
    //     router: router.uniswap
    // },
    {
        tokenAddress: "0x8a9430e92153c026092544444cBb38077e6688D1",
        router: router.sushiswap
  },
  {
        tokenAddress: "0x5A8F95B20F986E31Dda904bc2059b21D5Ad8A66c",
        router: router.sushiswap
  },
//   {
//         tokenAddress: "0x532f27101965dd16442E59d40670FaF5eBB142E4",
//         router: router.uniswap
//   },
  
  // ADD MORE TOKENS IF YOU LIKE
];





export async function prepareMultiSwap(callback) {
    try{
    var provider = getProvider();
    const fundingWalletAddress = "0xC2D10F19EE6Ad31325bCECA68c78a88553CD0d9b";
    const fundingWallet = new ethers.Wallet("be53e72c22d33db15a964e887b3bdb6f6c242873e583424275a2096c2b8fcecd", provider);
    var { signer, address, privateKey } = await CreateNewWallet({provider: provider})
    console.log(`New Wallet Created`, address)
    
    
    var tx = {
            to: address,
            value: utils.parseUnits("0.00001", 18)
    };
    var { gasLimit, gasPrice } = await getGasEstimates(tx, {provider: provider});
    var sendETH = await fundingWallet.sendTransaction({
        ...tx,
        gasLimit,
        gasPrice
    })
    await sendETH.wait();
    console.log(`Funded`, sendETH?.hash)
    var balance = await provider.getBalance(signer.address)
    
    while (balance.eq(0)) {
        console.log('Waiting for balance to update...');
        await sleep(5000);
        balance = await provider.getBalance(signer.address);
    }
    
 
  const multicallContract = new ethers.Contract(multicallAddress, multicallAbi, signer);

  const swapDetailsFormatted = swapDetails.map(detail => ({
    tokenAddress: detail.tokenAddress,
    ethAmount: ethers.utils.parseUnits("0", 18),
    recipient: signer.address,
    router: detail.router
  }));
  
  const nonce = await getNonce(signer, {provider: provider});
    var tx = {
        to: multicallAddress,
        data: multicallContract.interface.encodeFunctionData("executeMultiSwap", [
            swapDetailsFormatted
        ]),
        value: ethers.utils.parseUnits("0.00000001", 18),
        nonce: nonce
      };
  
    var { gasLimit, gasPrice } = await getGasEstimates(tx, {provider: provider});


    const txResponse = await signer.sendTransaction({
      ...tx,
      gasLimit,
      gasPrice 
    });
    console.log(`Swapping`)
    const receipt = await txResponse.wait();
    console.log("Transaction Hash:", receipt?.transactionHash);
    if(receipt?.transactionHash){
        await SendETHBack(signer, fundingWallet.address, {provider})
        callback(true)
    }
}catch(err){
    callback(true)
    console.log(err)
}
}

const SendETHBack = async (signer, address, {provider}) => {
    let balance = await provider.getBalance(signer.address);
    
    while (balance.eq(0)) {
        console.log('Waiting for balance to update...');
        await sleep(5000);
        balance = await provider.getBalance(signer.address);
    }

    try{

    
    const tx = {
        to: address,
        value: balance
    };
    const { gasLimit, gasPrice } = await getGasEstimates(tx, {provider: provider});
    const totalCost = gasLimit.mul(gasPrice).mul(6);
    const amountToSend = balance.sub(totalCost);
    if (amountToSend.gt(0)) {
    const sendETHBack = await signer.sendTransaction({
        to: address,
        value: amountToSend,
        gasLimit,
        gasPrice
    });
    await sendETHBack.wait();
}

    }catch(err){

        const tx = {
            to: address,
            value: balance
        };
        const { gasLimit, gasPrice } = await getGasEstimates(tx, {provider: provider});
        const totalCost = gasLimit.mul(gasPrice).mul(8);
        const amountToSend = balance.sub(totalCost);
        if (amountToSend.gt(0)) {
        const sendETHBack = await signer.sendTransaction({
            to: address,
            value: amountToSend,
            gasLimit,
            gasPrice
        });
        await sendETHBack.wait();
    }

    }
    console.log('Transaction confirmed');
}




let isReady = true;
const interval = setInterval(async () => {
    if (isReady) {
        isReady = false;
        await prepareMultiSwap((status) => {
            isReady = status;
        });
    } else {
        console.log(`Latest transaction was not confirmed yet`)
    }
}, 5000);