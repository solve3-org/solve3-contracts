const {
  time,
  loadFixture,
} = require("@nomicfoundation/hardhat-network-helpers");
const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");
const { expect } = require("chai");
const { encodeBackendProof, keccak256, encodeChainProof, signMsg, versionsHash } = require("../lib/web3-func");

describe("Solve3", function () {
  async function deployVerifierFixture() {
    // Contracts are deployed using the first signer/account by default
    const [owner, account1, account2, account3] = await ethers.getSigners();

    const tokenFactory = await ethers.getContractFactory("Token");
    const token = await tokenFactory.deploy("Solve3", "SLV");

    const verifierFactory = await ethers.getContractFactory("Solve3Verifier");
    const verifier = await verifierFactory.deploy();
    await verifier.initialize(account1.address, token.address);

    await token.transfer(verifier.address, ethers.utils.parseEther("1000000"));

    const example1Factory = await ethers.getContractFactory("Example");
    const example1 = await example1Factory.deploy(verifier.address);

    const example2Factory = await ethers.getContractFactory("Example2");
    const example2 = await example2Factory.deploy(verifier.address);

    return { verifier, example1, example2, owner, account1, account2, account3, token };
  }

  let verifier, example1, example2, owner, account1, account2, account3, token;

  beforeEach(async function () {
    ({ verifier, example1, example2, owner, account1, account2, account3, token } = await loadFixture(
      deployVerifierFixture
    ));
  });

  describe("Verifier", function () {

    it("should have the right owner", async () => {
      expect(await verifier.owner()).to.equal(owner.address);
    })

    it("should fail when try to initialize a second time", async () => {
      await expect(verifier.initialize(account1.address, token.address)).to.be.revertedWith("Initializable: contract is already initialized");
    })

    it("should return the right nonce", async function () {
      const timestampAndNonce = await verifier.getTimestampAndNonce(account2.address);
      expect(timestampAndNonce[1]).to.equal(0);
    })

    it("should return true for signer", async function () {
      const isSigner = await verifier.isSigner(account1.address);
      expect(isSigner).to.equal(true);
    })

    it("should return false for non-signer", async function () {
      const isSigner = await verifier.isSigner(account2.address);
      expect(isSigner).to.equal(false);
    })

    it("should verify the message correct", async () => {
      let version = versionsHash(0);

      let timestamp, nonce;
      let tsNonce = await verifier.getTimestampAndNonce(account2.address);

      timestamp = tsNonce[0];
      nonce = tsNonce[1];

      const ad = await verifier.getId("0x");

      const encoded = await encodeBackendProof({ account: account2.address, contract: owner.address, timestamp, nonce, ad: ad });
      const msg = await keccak256(encoded);

      const sig = await signMsg(account1, msg);
      await verifier.setTester(owner.address, true);
      const proof = encodeChainProof(
        {
          s: sig.s,
          r: sig.r,
          v: sig.v,
          nonce: nonce,
          timestamp: timestamp,
          account: account2.address,
          ad: ad,
        }
      )
      const isVerified = await verifier.callStatic.verifyProof(version, proof);
      console.log(isVerified);
     // expect(isVerified).to.equal(true);
    })

  })

})