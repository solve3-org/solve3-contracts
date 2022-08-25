const { ethers, Wallet } = require("ethers");

const keccak256 = async (string) => {
  const hash = ethers.utils.keccak256(string);
  return hash;
}

const signMsg = async (signer, msg) => {
  //const signature = await signer.signMessage(msg); // wrong
    const signature = await signer.signMessage(ethers.utils.arrayify(msg));
    return ethers.utils.splitSignature(signature);
  }

// signed by backend - not send to contract
const encodeBackendProof = async (obj) => {

  let result = (new ethers.utils.AbiCoder).encode(
    ['uint256', 'uint256', 'address', 'address','bytes32'],
    [obj.nonce, obj.timestamp, obj.contract, obj.account, obj.ad]);
    
  return result.toLowerCase();
}

// used for on chain verification
// s,r,v,nonce,timestamp,account,ad
// bytes32,bytes32,uint8,uint256,uint256,address,bytes32
const encodeChainProof = async (obj) => {

  let result = (new ethers.utils.AbiCoder).encode(
    // 
    ['bytes32','bytes32','uint8','uint256','uint256','address','bytes32'],
    [ obj.s, obj.r, obj.v, obj.nonce, obj.timestamp, obj.account, obj.ad]);
    
  return result.toLowerCase();
}

const versionsHash = (v) => {
  const versionHash = ethers.utils.id(`SOLVE3.V${v}`);
  return versionHash;
}

module.exports = {
  keccak256,
  signMsg,
  encodeBackendProof,
  encodeChainProof,
  versionsHash,
}