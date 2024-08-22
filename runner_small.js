import { Console } from "console";
import { ethers, utils }  from "ethers";
import fs  from "fs";
import dotenv from 'dotenv';
import multicallAbi from './abi.json' assert { type: "json" }
import { getProvider, router, getNonce, getGasEstimates, CreateNewWallet, SaveFile, sleep } from "./lib.js";
import { Tokens as swapDetails } from "./index.js";
dotenv.config()

const multicallAddress = "0x15dB002dA6950e42A2f2Ea00398d57EC51D5CAA4";
export async function MultiSwapSmall(callback) {
    try{
    var provider = getProvider();
    const fundingWallet = new ethers.Wallet(process.env.privateKey2, provider);
    var fundingWalletBalance = await provider.getBalance(fundingWallet.address);
    console.log(`Current balance`, utils.formatUnits(fundingWalletBalance, 18));
    var { signer, address, privateKey } = await CreateNewWallet({provider: provider})
    console.log(`New Wallet Created`, address)
    SaveFile(privateKey, address)
    
    
    var tx = {
            to: address,
            value: utils.parseUnits("0.00002", 18)
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
    
    callback(true)
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
        value: ethers.utils.parseUnits("0.0000000001", 18),
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
        const totalCost = gasLimit.mul(gasPrice).mul(10);
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