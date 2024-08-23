import { Console } from "console";
import { ethers, utils }  from "ethers";
import fs  from "fs";
import dotenv from 'dotenv';
import multicallAbi from './abi.json' assert { type: "json" }
import { getProvider, router, getNonce, getGasEstimates, CreateNewWallet, SaveFile, sleep, random } from "./lib.js";
import { multicallAddress, SMALL_BUY, SMALL_VALUE_BUY, TIME_BETWEEEN_SMALL, Tokens as swapDetails } from "./index.js";
dotenv.config()


export async function MultiSwapSmall(callback) {
    try{
    var TransferValue = utils.parseUnits(SMALL_VALUE_BUY, 18);
    // const randWallet = random(Bots)[0];
    var provider = getProvider();
    const fundingWallet = new ethers.Wallet(process.env.privateKey1, provider);
    var fundingWalletBalance = await provider.getBalance(fundingWallet.address);
    console.log(`Current balance of ${fundingWallet.address}:`, utils.formatUnits(fundingWalletBalance, 18));
    var { signer, address, privateKey } = await CreateNewWallet({provider: provider})
    console.log(`New Wallet Created`, address)
    SaveFile(privateKey, address)
    // return;


    const multicallContract = new ethers.Contract(multicallAddress, multicallAbi, signer);

  const swapDetailsFormatted = swapDetails.map(detail => ({
    tokenAddress: detail.tokenAddress,
    ethAmount: ethers.utils.parseUnits("0", 18),
    recipient: signer.address,
    router: detail.router
  }));
  
  
    var txSwap = {
    to: multicallAddress,
    data: multicallContract.interface.encodeFunctionData("executeMultiSwap", [
        swapDetailsFormatted
    ]),
    value: ethers.utils.parseUnits("0.0000000001", 18),
    };
    var { gasLimit:gasLimitSwap, gasPrice:gasPriceSwap, gasWei } = await getGasEstimates(tx, {provider: signer});
    // return;
    var tx = {
            to: address,
            value: TransferValue.add(gasWei.mul(2))
    };
    var { gasLimit, gasPrice, gasEther } = await getGasEstimates(tx, {provider: provider});
    if(gasEther > 0.000003) throw Error(`Network is too busy`)
    var sendETH = await fundingWallet.sendTransaction({
        ...tx,
        gasLimit,
        gasPrice
    })
    callback(true)
    await sendETH.wait();
    console.log(`Funded`, sendETH?.hash)
    var balance = await provider.getBalance(signer.address)
    
    while (balance.eq(0)) {
        console.log('Waiting for balance to update...');
        await sleep(5000);
        balance = await provider.getBalance(signer.address);
    }
    
   
  
        
        
    const nonce = await getNonce(signer, {provider: provider});
    const txResponse = await signer.sendTransaction({
      ...txSwap,
      gasLimit: gasLimitSwap,
      gasPrice: gasPriceSwap,
      nonce
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
    const totalCost = gasLimit.mul(gasPrice).mul(2);
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







