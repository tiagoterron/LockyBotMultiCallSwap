import { Console } from "console";
import { ethers, utils }  from "ethers";
import fs  from "fs";
import dotenv from 'dotenv';
import multicallAbi from './abi.json' assert { type: "json" }
import { getProvider, router, getNonce, getGasEstimates, CreateNewWallet, SaveFile, sleep, approveRouterIfNeeded } from "./lib.js";
import { Tokens as swapDetails } from "./index.js";

dotenv.config()



const multicallAddress = "0x15dB002dA6950e42A2f2Ea00398d57EC51D5CAA4";

export async function MultiSwapLarge(callback) {
    try{
    var provider = getProvider();
    const signer = new ethers.Wallet(process.env.privateKey, provider);
    // console.log(signer.address);return;
    var fundingWalletBalance = await provider.getBalance(signer.address);
    console.log(`Current balance`, utils.formatUnits(fundingWalletBalance, 18));
   
  const multicallContract = new ethers.Contract(multicallAddress, multicallAbi, signer);
  
  const approvals = swapDetails.map(async (item) => {
    return await approveRouterIfNeeded({
        router: item?.router,
        amount: ethers.utils.parseUnits("100000", 18),
        owner: signer?.address,
        spender: multicallAddress,
        signer: signer,
        provider: provider,
        token: item?.tokenAddress
    });
});


const approvalResults = await Promise.all(approvals);
if (approvalResults.every(res => res === true)) {
  const swapDetailsFormatted = swapDetails.map(detail => ({
    tokenAddress: detail.tokenAddress,
    ethAmount: ethers.utils.parseUnits("0", 18),
    recipient: signer.address,
    router: detail.router
  }));
  
    const nonce = await getNonce(signer, {provider: provider});
    var tx = {
        to: multicallAddress,
        data: multicallContract.interface.encodeFunctionData("executeSingleSwap", [
            swapDetailsFormatted
        ]),
        value: fundingWalletBalance.mul(95).div(100),
        nonce: nonce
      };
    var { gasLimit, gasPrice, gasWei, gasEther } = await getGasEstimates(tx, {provider: provider});
    if(gasEther > 0.000005) throw Error(`Network is too busy`)

    const txResponse = await signer.sendTransaction({
      ...tx,
      gasLimit,
      gasPrice 
    });
    
    console.log(`Swapping`)
    const receipt = await txResponse.wait();
    callback(true)
    console.log("Transaction Hash:", receipt?.transactionHash);
}
}catch(err){
    callback(true)
    console.log(err)
}
}